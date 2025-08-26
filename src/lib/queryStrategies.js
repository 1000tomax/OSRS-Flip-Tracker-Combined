import { queryCache } from './queryCache';
import Papa from 'papaparse';

// Configurable pool size
const QUERY_POOL_SIZE = Number(import.meta.env.VITE_QUERY_POOL || 8);

// Helper for retrying on transient errors
const fetchWithRetry = async (url, retries = 2) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;

      // Retry on 5xx errors
      if (response.status >= 500 && i + 1 < retries) {
        await new Promise(resolve => setTimeout(resolve, 200 + 200 * i));
        continue;
      }

      // Don't retry on 4xx errors
      return response;
    } catch (error) {
      // Network errors - retry if we have attempts left
      if (i + 1 < retries) {
        await new Promise(resolve => setTimeout(resolve, 200 + 200 * i));
        continue;
      }
      throw error;
    }
  }
};

// Helper to safely handle numeric values
const safe = n => (Number.isFinite(n) ? n : 0);

// Helper for bounded concurrency
const runPool = async (tasks, limit = QUERY_POOL_SIZE) => {
  const results = [];
  let currentIndex = 0;

  const executeNext = async () => {
    const localResults = [];
    while (currentIndex < tasks.length) {
      const taskIndex = currentIndex++;
      const result = await tasks[taskIndex]();
      if (Array.isArray(result)) {
        localResults.push(...result);
      }
    }
    return localResults;
  };

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => executeNext());
  const workerResults = await Promise.all(workers);

  for (const workerResult of workerResults) {
    results.push(...workerResult);
  }

  return results;
};

// Helper to load flip data from CSV files
const loadFlipData = async (dateFrom, dateTo) => {
  const summaryIndex = await queryCache.getCachedSummaryData('summary-index', async () => {
    const response = await fetch('/data/summary-index.json');
    if (!response.ok) {
      console.error('Failed to fetch summary-index.json:', response.status, response.statusText);
      throw new Error(`Failed to fetch summary-index.json: ${response.status}`);
    }
    const data = await response.json();
    const DEBUG_QUERY = false;
    if (DEBUG_QUERY) {
      console.log(
        'Raw summary-index data:',
        typeof data,
        'isArray:',
        Array.isArray(data),
        'length:',
        data?.length,
        'sample:',
        data?.slice?.(0, 3),
        'keys:',
        typeof data === 'object' ? Object.keys(data).slice(0, 5) : 'N/A'
      );
    }

    // Handle different data formats
    let dates = [];

    // If it's already an array, use it
    if (Array.isArray(data)) {
      dates = data;
    }
    // If it's an object with a dates property, use that
    else if (data && typeof data === 'object' && Array.isArray(data.dates)) {
      if (DEBUG_QUERY) console.log('Found dates in data.dates property');
      dates = data.dates;
    }
    // If it's an object with a days property, use that (production format)
    else if (data && typeof data === 'object' && Array.isArray(data.days)) {
      if (DEBUG_QUERY) console.log('Found dates in data.days property');
      // Extract date strings from objects if needed
      if (data.days.length > 0 && typeof data.days[0] === 'object' && data.days[0].date) {
        dates = data.days.map(day => day.date);
        if (DEBUG_QUERY) console.log('Extracted dates from day objects:', dates.slice(0, 3));
      } else {
        dates = data.days;
      }
    }
    // If it's an object with numeric keys (like converted array), extract values
    else if (data && typeof data === 'object') {
      const keys = Object.keys(data);
      if (keys.every(k => !isNaN(parseInt(k)))) {
        if (DEBUG_QUERY) console.log('Converting object with numeric keys to array');
        dates = keys.map(k => data[k]);
      }
    }

    // Validate we got valid dates
    if (!Array.isArray(dates) || dates.length === 0) {
      console.error('Summary-index data is empty or invalid. Data:', data);
      // Try to invalidate cache and fetch directly
      const directResponse = await fetch(`/data/summary-index.json?t=${Date.now()}`);
      const directData = await directResponse.json();
      console.log('Direct fetch attempt:', directData);

      // Try same conversion logic on direct fetch
      if (Array.isArray(directData)) {
        dates = directData;
      } else if (directData?.dates) {
        dates = directData.dates;
      } else if (directData?.days) {
        // Extract date strings from objects if needed
        if (
          directData.days.length > 0 &&
          typeof directData.days[0] === 'object' &&
          directData.days[0].date
        ) {
          dates = directData.days.map(day => day.date);
        } else {
          dates = directData.days;
        }
      } else if (directData && typeof directData === 'object') {
        const keys = Object.keys(directData);
        if (keys.every(k => !isNaN(parseInt(k)))) {
          dates = keys.map(k => directData[k]);
        }
      }

      if (!Array.isArray(dates) || dates.length === 0) {
        throw new Error('Summary-index.json is in unexpected format');
      }
    }

    return dates;
  });

  // Extract dates - the summary-index.json is just an array of date strings in MM-DD-YYYY format
  const availableDates = Array.isArray(summaryIndex) ? summaryIndex : [];

  const DEBUG_QUERY = false;
  if (DEBUG_QUERY) {
    console.log('Available dates from summary-index:', availableDates.length, 'dates');
    if (availableDates.length > 0) {
      console.log(
        'First date:',
        availableDates[0],
        'Last date:',
        availableDates[availableDates.length - 1]
      );
    }
  }

  // Convert date format for proper date comparison and file paths
  const formattedDates = availableDates.map(dateStr => {
    // Check if date is already in YYYY-MM-DD format
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateStr;
    }
    // Otherwise convert MM-DD-YYYY to YYYY-MM-DD
    const parts = dateStr.split('-');
    if (parts.length === 3 && parts[0].length <= 2) {
      const [month, day, year] = parts;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    // Return as-is if format is unexpected
    console.warn('Unexpected date format:', dateStr);
    return dateStr;
  });

  // Filter dates within range using lexicographic comparison
  const warnings = [];

  // Helper for lexicographic date range check
  const inRange = (d, from, to) => (!from || d >= from) && (!to || d <= to);

  // Normalize to YYYY-MM-DD format (expect already in this format or handle edge cases)
  const norm = s => (s ? s.slice(0, 10) : s);
  const reqFrom = norm(dateFrom);
  const reqTo = norm(dateTo);

  let datesToLoad = formattedDates;

  if (reqFrom || reqTo) {
    const DEBUG_QUERY = false;
    if (DEBUG_QUERY) console.log('Filtering dates - From:', reqFrom, 'To:', reqTo);

    datesToLoad = formattedDates.filter(d => inRange(d, reqFrom, reqTo));

    // Get available date range
    const minAvail = formattedDates[0];
    const maxAvail = formattedDates[formattedDates.length - 1];

    // Check for no overlap
    const noOverlap = (reqTo && reqTo < minAvail) || (reqFrom && reqFrom > maxAvail);

    if (datesToLoad.length === 0 && formattedDates.length > 0 && noOverlap) {
      // Convert YYYY-MM-DD to MM-DD-YYYY for display
      const fmt = ymd => ymd.replace(/(\d{4})-(\d{2})-(\d{2})/, '$2-$3-$1');
      warnings.push(
        `No data available for the selected range. Available data: ${fmt(minAvail)} to ${fmt(maxAvail)}`
      );
    }
    // Check if we clipped the range
    else if (
      datesToLoad.length > 0 &&
      ((reqFrom && reqFrom < minAvail) || (reqTo && reqTo > maxAvail))
    ) {
      const fmt = ymd => ymd.replace(/(\d{4})-(\d{2})-(\d{2})/, '$2-$3-$1');
      warnings.push(
        `Date range clipped to available data: ${fmt(datesToLoad[0])} to ${fmt(datesToLoad[datesToLoad.length - 1])}`
      );
    }

    if (DEBUG_QUERY) console.log('Dates after filtering:', datesToLoad.length, 'dates');
  } else {
    const DEBUG_QUERY = false;
    if (DEBUG_QUERY)
      console.log('No date filter applied, loading all', datesToLoad.length, 'dates');
  }

  if (datesToLoad.length === 0) {
    return {
      flips: [],
      warnings:
        warnings.length > 0 ? warnings : ['No data files found for the specified date range'],
      meta: { daysScanned: 0, ms: 0 },
    };
  }

  // Create tasks for parallel loading
  const loadWarnings = [];
  const tasks = datesToLoad.map(date => async () => {
    const [year, month, day] = date.split('-');
    const url = `/data/processed-flips/${year}/${month}/${day}/flips.csv`;

    try {
      const csvData = await queryCache.getCachedFlipData(`flips-${date}`, async () => {
        const DEBUG_QUERY = false;
        if (DEBUG_QUERY) console.log('Fetching flip data from:', url);

        const response = await fetchWithRetry(url);
        if (!response.ok) {
          if (DEBUG_QUERY) console.log(`Missing data for ${date}, status:`, response.status);
          // Cache the miss to avoid repeated 404s
          return { __MISS__: true, date, status: response.status };
        }

        const text = await response.text();
        const parsed = parseCSV(text);
        if (DEBUG_QUERY) console.log(`Loaded ${parsed.length} flips for ${date}`);
        return parsed;
      });

      // Check if this is a cached miss
      if (csvData?.__MISS__) {
        loadWarnings.push(`Missing data for ${date}`);
        return [];
      }

      return csvData;
    } catch (error) {
      console.error(`Error loading flips for ${date}:`, error.message);
      loadWarnings.push(`Error loading data for ${date}`);
      return [];
    }
  });

  // Load all flip data in parallel with bounded concurrency
  const startTime = performance.now();
  const allFlips = await runPool(tasks, QUERY_POOL_SIZE);
  const endTime = performance.now();

  const meta = {
    daysScanned: datesToLoad.length,
    ms: endTime - startTime,
  };

  // Combine all warnings
  const allWarnings = [...warnings, ...loadWarnings];

  // Return empty result with warnings instead of throwing error
  if (allWarnings.length > 0 && allFlips.length === 0) {
    return { flips: [], warnings: allWarnings, meta };
  }

  return { flips: allFlips, warnings: allWarnings, meta };
};

// Helper to parse CSV text using PapaParse
const parseCSV = text => {
  const { data, errors } = Papa.parse(text, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
  });

  const DEBUG_QUERY = false;
  if (errors?.length && DEBUG_QUERY) {
    console.warn('CSV parse warnings:', errors.slice(0, 3));
  }

  // PapaParse's dynamicTyping already handles numeric conversion
  // Just filter out any null rows
  return (Array.isArray(data) ? data : []).filter(row => row !== null);
};

// Helper to load item stats
const loadItemStats = async () => {
  return queryCache.getCachedItemStats('item-stats', async () => {
    const response = await fetch('/data/item-stats.csv');
    const text = await response.text();
    return parseCSV(text);
  });
};

// Strategy: Individual flips for specific items
export const itemFlipStrategy = async queryObj => {
  const { flips, warnings, meta } = await loadFlipData(queryObj.dateFrom, queryObj.dateTo);

  // Filter by item name if specified (case-insensitive)
  const filteredFlips = queryObj.itemName
    ? flips.filter(flip => {
        // Ensure item_name exists before calling toLowerCase
        if (!flip.item_name) return false;
        return flip.item_name.toLowerCase() === queryObj.itemName.toLowerCase();
      })
    : flips;

  return {
    type: 'FLIP_LIST',
    data: filteredFlips,
    warnings,
    meta,
    summary: {
      totalFlips: filteredFlips.length,
      totalProfit: filteredFlips.reduce((sum, flip) => sum + safe(flip.profit), 0),
      averageProfit: filteredFlips.length
        ? filteredFlips.reduce((sum, flip) => sum + safe(flip.profit), 0) / filteredFlips.length
        : 0,
      totalSpent: filteredFlips.reduce((sum, flip) => sum + safe(flip.spent), 0),
    },
  };
};

// Strategy: Flips filtered by profit thresholds
export const flipsByProfitStrategy = async queryObj => {
  const { flips, warnings, meta } = await loadFlipData(queryObj.dateFrom, queryObj.dateTo);

  // Filter by profit thresholds
  const filteredFlips = flips.filter(flip => {
    return (
      flip.profit >= queryObj.minProfit &&
      (queryObj.maxProfit === null || flip.profit <= queryObj.maxProfit)
    );
  });

  // Group by item for summary
  const itemGroups = {};
  filteredFlips.forEach(flip => {
    if (!flip.item_name) return;
    if (!itemGroups[flip.item_name]) {
      itemGroups[flip.item_name] = {
        count: 0,
        totalProfit: 0,
      };
    }
    itemGroups[flip.item_name].count++;
    itemGroups[flip.item_name].totalProfit += safe(flip.profit);
  });

  return {
    type: 'FLIP_LIST',
    data: filteredFlips,
    warnings,
    meta,
    summary: {
      totalFlips: filteredFlips.length,
      totalProfit: filteredFlips.reduce((sum, flip) => sum + safe(flip.profit), 0),
      averageProfit: filteredFlips.length
        ? filteredFlips.reduce((sum, flip) => sum + safe(flip.profit), 0) / filteredFlips.length
        : 0,
      uniqueItems: Object.keys(itemGroups).length,
      topItem:
        Object.entries(itemGroups).sort((a, b) => b[1].totalProfit - a[1].totalProfit)[0]?.[0] ||
        null,
    },
  };
};

// Strategy: Items filtered by ROI
export const itemsByROIStrategy = async queryObj => {
  const itemStats = await loadItemStats();
  let meta = { daysScanned: 0, ms: 0 };
  let warnings = [];

  // Filter by ROI and flip count
  let filteredItems = itemStats.filter(item => {
    return item.roi_percent >= queryObj.minROI && item.flips >= queryObj.minFlipCount;
  });

  // If date range specified, we need to calculate ROI for that specific period
  if (queryObj.dateFrom || queryObj.dateTo) {
    const result = await loadFlipData(queryObj.dateFrom, queryObj.dateTo);
    const { flips } = result;
    meta = result.meta || meta;
    warnings = result.warnings || [];

    // Group flips by item
    const itemFlipsMap = {};
    flips.forEach(flip => {
      if (!flip.item_name) return; // Skip if no item name
      const itemName = flip.item_name.toLowerCase();
      if (!itemFlipsMap[itemName]) {
        itemFlipsMap[itemName] = [];
      }
      itemFlipsMap[itemName].push(flip);
    });

    // Recalculate ROI for the date range
    filteredItems = filteredItems.filter(item => {
      if (!item.item_name) return false; // Skip if no item name
      const itemFlips = itemFlipsMap[item.item_name.toLowerCase()];
      if (!itemFlips) return false;

      const totalProfit = itemFlips.reduce((sum, flip) => sum + safe(flip.profit), 0);
      const totalSpent = itemFlips.reduce((sum, flip) => sum + safe(flip.spent), 0);
      const roi = totalSpent > 0 ? (totalProfit / totalSpent) * 100 : 0;

      item.period_roi = roi;
      item.period_flips = itemFlips.length;
      item.period_profit = totalProfit;

      return roi >= queryObj.minROI && itemFlips.length >= queryObj.minFlipCount;
    });
  }

  return {
    type: 'ITEM_LIST',
    data: filteredItems,
    warnings,
    meta,
    summary: {
      totalItems: filteredItems.length,
      averageROI: filteredItems.length
        ? filteredItems.reduce((sum, item) => sum + safe(parseFloat(item.roi_percent)), 0) /
          filteredItems.length
        : 0,
    },
  };
};
