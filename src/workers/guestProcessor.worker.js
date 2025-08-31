import Papa from 'papaparse';

// Global error handler for worker crashes
self.onerror = function (error) {
  // Send error details back to main thread
  self.postMessage({
    type: 'ERROR',
    message: `Worker crashed: ${error.message}`,
    stack: error.stack,
    line: error.lineno,
    column: error.colno,
  });
};

// Expected Flipping Copilot column names (lowercase for comparison)
const EXPECTED_COLUMNS = [
  'first buy time',
  'last sell time',
  'account',
  'item',
  'bought',
  'sold',
  'avg. buy price',
  'avg. sell price',
  'tax',
];

// Utility to clean numeric values (removes commas that Flipping Copilot might include)
// e.g., "1,234" → 1234, "1,234.56" → 1234.56
const cleanNumeric = val => {
  if (!val && val !== 0) return 0;
  const cleaned = String(val).replace(/,/g, '');
  return Number(cleaned) || 0; // Using Number instead of parseInt to preserve decimals
};

// Format date key using browser's timezone (not Chicago)
function toDateKey(iso, timezone) {
  const d = new Date(iso);
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(d);
  const mm = parts.find(p => p.type === 'month').value;
  const dd = parts.find(p => p.type === 'day').value;
  const yyyy = parts.find(p => p.type === 'year').value;
  return `${mm}-${dd}-${yyyy}`; // MM-DD-YYYY in user's timezone
}

// Format date in YYYY-MM-DD format for sorting
function toSortableDate(iso, timezone) {
  const d = new Date(iso);
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(d);
  const mm = parts.find(p => p.type === 'month').value;
  const dd = parts.find(p => p.type === 'day').value;
  const yyyy = parts.find(p => p.type === 'year').value;
  return `${yyyy}-${mm}-${dd}`; // YYYY-MM-DD for proper sorting
}

self.onmessage = async e => {
  try {
    if (e.data.type !== 'START') return;

    const { file, timezone = Intl.DateTimeFormat().resolvedOptions().timeZone } = e.data;

    // Stream processing - maintain state as we parse
    let headers = null;
    const headerMap = {}; // Maps normalized names to actual column names
    let parser = null; // Store parser reference so we can abort if needed
    let rowsProcessed = 0;
    let lastProgressUpdate = 0;
    const accounts = new Set();
    const seen = new Set(); // For deduplication
    const flipsByDate = {}; // Plain object, not Map (for serialization)
    const itemStatsMap = {}; // Accumulate item stats on the fly
    const allFlips = []; // Keep all flips for potential re-bucketing
    let hasShowBuyingError = false;
    await new Promise((resolve, reject) => {
      parser = Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false, // We'll handle type conversion ourselves
        chunk: results => {
          // Build header lookup map on first chunk (case-insensitive)
          if (!headers) {
            headers = results.meta.fields;

            // Build normalized → original header map
            headers.forEach(header => {
              const normalized = header.trim().toLowerCase();
              headerMap[normalized] = header;
            });

            // Validate required columns exist (case-insensitive)
            const normalizedHeaders = Object.keys(headerMap);
            const missingColumns = EXPECTED_COLUMNS.filter(col => !normalizedHeaders.includes(col));

            if (missingColumns.length > 0) {
              if (parser) parser.abort(); // Stop parsing immediately
              reject(
                new Error(
                  `Not a valid Flipping Copilot CSV. Missing columns: ${missingColumns.join(', ')}`
                )
              );
              return;
            }

            // Check for "Show Buying" columns that shouldn't be there
            if (
              normalizedHeaders.includes('buy_state') ||
              normalizedHeaders.includes('actively_buying') ||
              normalizedHeaders.includes('buy_abort_time')
            ) {
              hasShowBuyingError = true;
            }
          }

          // Helper to get value by normalized column name
          const getValue = (row, normalizedColName) => {
            const actualColName = headerMap[normalizedColName];
            return row[actualColName];
          };

          // Process each row immediately (streaming)
          for (const row of results.data) {
            // Skip rows without last sell time (incomplete flips)
            const lastSellTime = getValue(row, 'last sell time');
            if (!lastSellTime) {
              hasShowBuyingError = true;
              continue;
            }

            // Track accounts
            const accountId = getValue(row, 'account');
            if (accountId) accounts.add(accountId);

            // Parse and clean the flip data using case-insensitive access
            const flip = {
              item: getValue(row, 'item'),
              quantity: cleanNumeric(getValue(row, 'sold')), // "Sold" is the quantity
              avgBuyPrice: cleanNumeric(getValue(row, 'avg. buy price')),
              avgSellPrice: cleanNumeric(getValue(row, 'avg. sell price')),
              sellerTax: cleanNumeric(getValue(row, 'tax')),
              firstBuyTime: getValue(row, 'first buy time'),
              lastSellTime,
              accountId: accountId || 'Unknown',
            };

            // Calculate profit - use CSV value if present, otherwise compute
            const profitCsv = cleanNumeric(getValue(row, 'profit'));
            const computedProfit =
              flip.avgSellPrice * flip.quantity - flip.avgBuyPrice * flip.quantity - flip.sellerTax;
            flip.profit = profitCsv || computedProfit;

            // Calculate ROI
            const spent = flip.avgBuyPrice * flip.quantity;
            flip.roi = spent > 0 ? (flip.profit / spent) * 100 : 0;

            // Add formatted date (YYYY-MM-DD format from lastSellTime)
            flip.date = toSortableDate(flip.lastSellTime, timezone);

            // Calculate additional useful fields
            flip.spent = spent;
            flip.revenue = flip.avgSellPrice * flip.quantity;

            // Calculate hours held between first buy and last sell
            if (flip.firstBuyTime && flip.lastSellTime) {
              const buyTime = new Date(flip.firstBuyTime);
              const sellTime = new Date(flip.lastSellTime);
              const timeDiff = sellTime - buyTime; // milliseconds
              flip.hoursHeld = timeDiff / (1000 * 60 * 60); // convert to hours
              flip.hoursHeld = Math.round(flip.hoursHeld * 10) / 10; // round to 1 decimal place
            } else {
              flip.hoursHeld = 0;
            }

            // Validate the flip has required data
            if (
              !flip.item ||
              flip.quantity <= 0 ||
              flip.avgBuyPrice <= 0 ||
              flip.avgSellPrice <= 0
            ) {
              continue;
            }

            // Create comprehensive hash for deduplication (with normalized ISO times)
            const isoFirst = new Date(flip.firstBuyTime).toISOString();
            const isoLast = new Date(flip.lastSellTime).toISOString();
            const hash = [
              flip.item,
              flip.quantity,
              flip.avgBuyPrice,
              flip.avgSellPrice,
              isoFirst,
              isoLast,
              flip.accountId,
            ].join('|');

            // Skip if duplicate
            if (seen.has(hash)) continue;
            seen.add(hash);

            // Keep the flip for potential re-bucketing
            allFlips.push(flip);

            // Add to date bucket (stream processing - no accumulation phase)
            const dateKey = toDateKey(flip.lastSellTime, timezone);
            if (!flipsByDate[dateKey]) {
              flipsByDate[dateKey] = [];
            }
            flipsByDate[dateKey].push(flip);

            // Update item stats on the fly (streaming aggregation)
            if (!itemStatsMap[flip.item]) {
              itemStatsMap[flip.item] = {
                item: flip.item,
                totalProfit: 0,
                flipCount: 0,
                totalQuantity: 0,
              };
            }
            itemStatsMap[flip.item].totalProfit += flip.profit;
            itemStatsMap[flip.item].flipCount += 1;
            itemStatsMap[flip.item].totalQuantity += flip.quantity;

            rowsProcessed++;
          }

          // Send progress update every 5000 rows
          if (rowsProcessed - lastProgressUpdate >= 5000) {
            self.postMessage({
              type: 'PROGRESS',
              rowsProcessed,
              totalRows: rowsProcessed, // We don't know total until complete
            });
            lastProgressUpdate = rowsProcessed;
          }
        },
        complete: () => {
          // Check if we should throw "Show Buying" error
          if (hasShowBuyingError) {
            reject(
              new Error(
                'Invalid export settings detected!\n\n' +
                  'Please disable "Show Buying" in Flipping Copilot:\n' +
                  '1. Open Flipping Copilot settings in RuneLite\n' +
                  '2. Uncheck "Show Buying"\n' +
                  '3. Export your flips.csv again\n\n' +
                  'Only completed flips should be included in the export.'
              )
            );
            return;
          }

          // Check if we have any valid flips
          if (rowsProcessed === 0) {
            reject(new Error('No valid flips found in the CSV file.'));
            return;
          }

          resolve();
        },
        error: error => {
          if (parser) parser.abort(); // Ensure parsing stops
          reject(error);
        },
      });
    });

    // Process the accumulated data into final format
    const dailySummaries = Object.entries(flipsByDate)
      .map(([date, flips]) => ({
        date,
        totalProfit: flips.reduce((sum, f) => sum + f.profit, 0),
        flipCount: flips.length,
        uniqueItems: new Set(flips.map(f => f.item)).size,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Convert item stats map to sorted array
    const itemStats = Object.values(itemStatsMap).sort((a, b) => b.totalProfit - a.totalProfit);

    // Calculate totals
    const totalProfit = itemStats.reduce((sum, item) => sum + item.totalProfit, 0);
    const totalFlips = itemStats.reduce((sum, item) => sum + item.flipCount, 0);
    const uniqueItems = itemStats.length;

    // Get date range
    const dateRange =
      dailySummaries.length > 0
        ? {
            from: dailySummaries[0].date,
            to: dailySummaries[dailySummaries.length - 1].date,
          }
        : null;

    // Send completion message with plain objects (not Maps)
    self.postMessage({
      type: 'COMPLETE',
      result: {
        dailySummaries,
        itemStats,
        flipsByDate, // Plain object, will serialize fine
        allFlips, // Keep for potential timezone changes
        totalProfit,
        totalFlips,
        uniqueItems,
        timezone,
        metadata: {
          accounts: Array.from(accounts).sort(),
          accountCount: accounts.size,
          dateRange,
          rowsProcessed,
          timezone,
          message:
            accounts.size > 1
              ? `Data includes ${accounts.size} accounts: ${Array.from(accounts).join(', ')}`
              : `Data from account: ${Array.from(accounts)[0] || 'Unknown'}`,
        },
      },
    });
  } catch (error) {
    // Send detailed error back to main thread
    self.postMessage({
      type: 'ERROR',
      message: error.message,
      stack: error.stack,
      context: 'processing_failed',
    });
  }
};
