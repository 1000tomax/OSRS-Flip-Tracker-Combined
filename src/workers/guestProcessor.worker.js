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
  'profit',
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

self.onmessage = async e => {
  try {
    if (e.data.type !== 'START') return;

    const { file, timezone = Intl.DateTimeFormat().resolvedOptions().timeZone } = e.data;

    // EARLY EXIT: File size check to prevent crashes
    if (file.size > 3 * 1024 * 1024) {
      // 3MB limit
      self.postMessage({
        type: 'ERROR',
        message: `File too large: ${(file.size / (1024 * 1024)).toFixed(1)}MB. Maximum: 3MB. Try exporting a shorter date range.`,
      });
      return;
    }

    let headers = null;
    const headerMap = {};
    let parser = null;
    let rowsProcessed = 0;
    let lastProgressUpdate = 0;
    const accounts = new Set();

    // MEMORY MANAGEMENT: Process in batches and clean up
    const flipsByDate = {};
    const itemStatsMap = {};
    const allFlips = []; // Keep flips but manage memory better
    const seen = new Set();
    let hasShowBuyingError = false;

    // BATCH PROCESSING: Prevent memory spikes
    const BATCH_SIZE = 2000;
    let currentBatch = [];

    const processBatch = batch => {
      for (const flipData of batch) {
        // Deduplication
        const flipHash = `${flipData.account}-${flipData.item}-${flipData.first_buy_time}-${flipData.last_sell_time}`;
        if (seen.has(flipHash)) continue;
        seen.add(flipHash);

        // Add to final results
        allFlips.push(flipData);
        accounts.add(flipData.account);

        // Update aggregates
        const dateKey = toDateKey(flipData.last_sell_time, timezone);

        // Update date aggregates
        if (!flipsByDate[dateKey]) {
          flipsByDate[dateKey] = {
            date: dateKey,
            flips: [],
            totalProfit: 0,
            totalFlips: 0,
          };
        }
        flipsByDate[dateKey].flips.push(flipData);
        flipsByDate[dateKey].totalProfit += flipData.profit;
        flipsByDate[dateKey].totalFlips++;

        // Update item stats
        if (!itemStatsMap[flipData.item]) {
          itemStatsMap[flipData.item] = {
            item: flipData.item,
            totalProfit: 0,
            flipCount: 0,
            totalQuantity: 0,
          };
        }
        itemStatsMap[flipData.item].totalProfit += flipData.profit;
        itemStatsMap[flipData.item].flipCount++;
        itemStatsMap[flipData.item].totalQuantity += flipData.bought;
      }

      // MEMORY CLEANUP: Clear batch and force GC opportunity
      batch.length = 0;
      // Hint for garbage collection if available
      // eslint-disable-next-line no-undef
      if (typeof gc !== 'undefined') gc();
    };

    await new Promise((resolve, reject) => {
      parser = Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,

        // MEMORY OPTIMIZATION: Much smaller chunks
        chunkSize: 32 * 1024, // 32KB chunks (very small)

        chunk: results => {
          try {
            // MEMORY MONITORING
            if (performance.memory) {
              const used = performance.memory.usedJSHeapSize;
              const limit = performance.memory.jsHeapSizeLimit;
              if (used / limit > 0.85) {
                // Stop at 85% memory usage
                if (parser) parser.abort();
                reject(
                  new Error(
                    `Memory usage too high (${Math.round((used / limit) * 100)}%). File too large for processing.`
                  )
                );
                return;
              }
            }

            // Build headers on first chunk
            if (!headers) {
              headers = results.meta.fields;
              headers.forEach(header => {
                const normalized = header.trim().toLowerCase();
                headerMap[normalized] = header;
              });

              const normalizedHeaders = Object.keys(headerMap);
              const missingColumns = EXPECTED_COLUMNS.filter(
                col => !normalizedHeaders.includes(col)
              );

              if (missingColumns.length > 0) {
                if (parser) parser.abort();
                reject(
                  new Error(
                    `Not a valid Flipping Copilot CSV. Missing columns: ${missingColumns.join(', ')}`
                  )
                );
                return;
              }
            }

            // Process rows in smaller batches
            for (const row of results.data) {
              try {
                const firstBuyTime = row[headerMap['first buy time']];
                const lastSellTime = row[headerMap['last sell time']];

                if (!firstBuyTime || !lastSellTime) continue;

                const flipData = {
                  account: row[headerMap.account] || 'Unknown',
                  item: row[headerMap.item] || 'Unknown',
                  first_buy_time: firstBuyTime,
                  last_sell_time: lastSellTime,
                  bought: cleanNumeric(row[headerMap.bought]),
                  sold: cleanNumeric(row[headerMap.sold]),
                  avg_buy_price: cleanNumeric(row[headerMap['avg. buy price']]),
                  avg_sell_price: cleanNumeric(row[headerMap['avg. sell price']]),
                  tax: cleanNumeric(row[headerMap.tax]),
                  profit:
                    'profit' in headerMap
                      ? cleanNumeric(row[headerMap.profit])
                      : cleanNumeric(row[headerMap.sold]) *
                          cleanNumeric(row[headerMap['avg. sell price']]) -
                        cleanNumeric(row[headerMap.bought]) *
                          cleanNumeric(row[headerMap['avg. buy price']]) -
                        cleanNumeric(row[headerMap.tax]),
                };

                if (flipData.bought === 0 && flipData.sold === 0) {
                  hasShowBuyingError = true;
                  continue;
                }

                // Add to batch
                currentBatch.push(flipData);

                // BATCH PROCESSING: Process when batch is full
                if (currentBatch.length >= BATCH_SIZE) {
                  processBatch(currentBatch);
                  currentBatch = []; // Create new array instead of clearing
                }

                rowsProcessed++;

                // Progress updates
                if (Date.now() - lastProgressUpdate > 500) {
                  self.postMessage({
                    type: 'PROGRESS',
                    progress: {
                      current: rowsProcessed,
                      message: `Processing row ${rowsProcessed.toLocaleString()}...`,
                    },
                  });
                  lastProgressUpdate = Date.now();
                }
              } catch (rowError) {
                console.warn('Error processing row:', rowError);
                continue;
              }
            }
          } catch (chunkError) {
            console.error('Chunk processing error:', chunkError);
            if (parser) parser.abort();
            reject(chunkError);
          }
        },

        complete: () => {
          // Process final batch
          if (currentBatch.length > 0) {
            processBatch(currentBatch);
          }
          resolve();
        },

        error: error => {
          console.error('Papa Parse error:', error);
          reject(new Error(`CSV parsing failed: ${error.message}`));
        },
      });
    });

    // MEMORY CHECK: Final validation before sending
    if (performance.memory) {
      const used = performance.memory.usedJSHeapSize;
      const limit = performance.memory.jsHeapSizeLimit;
      console.log(
        `Final memory usage: ${Math.round(used / (1024 * 1024))}MB (${Math.round((used / limit) * 100)}%)`
      );
    }

    // Send results with all flips (but processed efficiently)
    self.postMessage({
      type: 'SUCCESS',
      data: {
        flipsByDate,
        itemStats: Object.values(itemStatsMap),
        accounts: Array.from(accounts),
        totalRows: rowsProcessed,
        hasShowBuyingError,
        allFlips, // Keep this for dashboard display
        metadata: {
          originalFileSize: file.size,
          processedFlips: allFlips.length,
          accounts: Array.from(accounts),
          accountCount: accounts.size,
        },
      },
    });
  } catch (error) {
    console.error('Worker processing error:', error);
    self.postMessage({
      type: 'ERROR',
      message: error.message || 'Unknown processing error',
      stack: error.stack,
    });
  } finally {
    // Final cleanup
    // eslint-disable-next-line no-undef
    if (typeof gc !== 'undefined') gc();
  }
};
