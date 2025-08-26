import { queryCache } from './queryCache';

// Helper to load flip data from CSV files
const loadFlipData = async (dateFrom, dateTo) => {
  const summaryIndex = await queryCache.getCachedSummaryData('summary-index', async () => {
    const response = await fetch('/data/summary-index.json');
    if (!response.ok) {
      console.error('Failed to fetch summary-index.json:', response.status, response.statusText);
      throw new Error(`Failed to fetch summary-index.json: ${response.status}`);
    }
    const data = await response.json();
    console.log(
      'Raw summary-index data:',
      typeof data,
      'isArray:',
      Array.isArray(data),
      'length:',
      data?.length,
      'sample:',
      data?.slice?.(0, 3)
    );

    // Don't cache empty data
    if (!Array.isArray(data) || data.length === 0) {
      console.error('Summary-index data is empty or invalid:', data);
      // Try to invalidate cache and fetch directly
      const directResponse = await fetch(`/data/summary-index.json?t=${Date.now()}`);
      const directData = await directResponse.json();
      console.log('Direct fetch attempt:', directData);
      if (!Array.isArray(directData) || directData.length === 0) {
        throw new Error('Summary-index.json is empty or invalid');
      }
      return directData;
    }

    return data;
  });

  // Extract dates - the summary-index.json is just an array of date strings in MM-DD-YYYY format
  const availableDates = Array.isArray(summaryIndex) ? summaryIndex : [];

  console.log('Available dates from summary-index:', availableDates.length, 'dates');
  if (availableDates.length > 0) {
    console.log(
      'First date:',
      availableDates[0],
      'Last date:',
      availableDates[availableDates.length - 1]
    );
  }

  // Convert MM-DD-YYYY to YYYY-MM-DD for proper date comparison and file paths
  const formattedDates = availableDates.map(dateStr => {
    const [month, day, year] = dateStr.split('-');
    return `${year}-${month}-${day}`;
  });

  // Filter dates within range
  let datesToLoad = formattedDates;
  if (dateFrom || dateTo) {
    console.log('Filtering dates - From:', dateFrom, 'To:', dateTo);

    // Handle year mismatch - if user searches for 2024 dates but data is in 2025
    let adjustedFrom = dateFrom;
    let adjustedTo = dateTo;

    // Check if the user is searching for 2024 dates but our data is in 2025
    if (
      dateFrom &&
      dateFrom.includes('2024') &&
      formattedDates.length > 0 &&
      formattedDates[0].includes('2025')
    ) {
      adjustedFrom = dateFrom.replace('2024', '2025');
      console.log('Adjusted dateFrom from 2024 to 2025:', adjustedFrom);
    }
    if (
      dateTo &&
      dateTo.includes('2024') &&
      formattedDates.length > 0 &&
      formattedDates[0].includes('2025')
    ) {
      adjustedTo = dateTo.replace('2024', '2025');
      console.log('Adjusted dateTo from 2024 to 2025:', adjustedTo);
    }

    datesToLoad = formattedDates.filter(date => {
      const d = new Date(date);
      const from = adjustedFrom ? new Date(adjustedFrom) : new Date('1900-01-01');
      const to = adjustedTo ? new Date(adjustedTo) : new Date('2100-01-01');
      return d >= from && d <= to;
    });
    console.log('Dates after filtering:', datesToLoad.length, 'dates');
  } else {
    console.log('No date filter applied, loading all', datesToLoad.length, 'dates');
  }

  if (datesToLoad.length === 0) {
    return { flips: [], warnings: ['No data files found for the specified date range'] };
  }

  // Load all flip data for selected dates
  const allFlips = [];
  const warnings = [];

  for (const date of datesToLoad) {
    const [year, month, day] = date.split('-');
    const url = `/data/processed-flips/${year}/${month}/${day}/flips.csv`;

    try {
      const csvData = await queryCache.getCachedFlipData(`flips-${date}`, async () => {
        console.log('Fetching flip data from:', url);
        const response = await fetch(url);
        if (!response.ok) {
          console.error(`Failed to load data for ${date}, status:`, response.status, 'URL:', url);
          throw new Error(`Failed to load data for ${date}`);
        }
        const text = await response.text();
        const parsed = parseCSV(text);
        console.log(`Loaded ${parsed.length} flips for ${date}`);
        return parsed;
      });

      allFlips.push(...csvData);
    } catch (error) {
      console.error(`Error loading flips for ${date}:`, error.message);
      warnings.push(`Missing data for ${date}`);
    }
  }

  if (warnings.length > 0 && allFlips.length === 0) {
    throw new Error('No data available for the selected date range');
  }

  return { flips: allFlips, warnings };
};

// Helper to parse CSV text
const parseCSV = text => {
  try {
    const lines = text.trim().split('\n');
    if (lines.length === 0) {
      return [];
    }

    const headers = lines[0].split(',');
    if (headers.length === 0) {
      throw new Error('Invalid CSV format: No headers found');
    }

    return lines
      .slice(1)
      .map(line => {
        const values = line.split(',');
        if (values.length !== headers.length) {
          // Skip malformed lines but don't throw error
          return null;
        }

        const obj = {};
        headers.forEach((header, index) => {
          const value = values[index];
          // Parse numbers for specific fields
          if (
            [
              'opened_quantity',
              'spent',
              'closed_quantity',
              'received_post_tax',
              'tax_paid',
              'profit',
            ].includes(header)
          ) {
            obj[header] = parseFloat(value) || 0;
          } else {
            obj[header] = value || '';
          }
        });
        return obj;
      })
      .filter(obj => obj !== null); // Remove any malformed lines
  } catch (error) {
    throw new Error(`Failed to parse CSV: ${error.message}`);
  }
};

// Helper to load item stats
const loadItemStats = async () => {
  return queryCache.getCachedItemStats('item-stats', async () => {
    const response = await fetch('/data/item-stats.csv');
    const text = await response.text();
    return parseCSV(text);
  });
};

// Helper to sort data
const sortData = (data, sortBy, direction = 'desc') => {
  return [...data].sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];

    // Handle date strings
    if (sortBy.includes('time') || sortBy.includes('date')) {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    }

    // Handle numeric values
    if (typeof aVal === 'string' && !isNaN(aVal)) {
      aVal = parseFloat(aVal);
      bVal = parseFloat(bVal);
    }

    if (direction === 'desc') {
      return bVal > aVal ? 1 : -1;
    } else {
      return aVal > bVal ? 1 : -1;
    }
  });
};

// Strategy: Individual flips for specific items
export const itemFlipStrategy = async queryObj => {
  const { flips, warnings } = await loadFlipData(queryObj.dateFrom, queryObj.dateTo);

  // Filter by item name if specified (case-insensitive)
  let filteredFlips = queryObj.itemName
    ? flips.filter(flip => {
        // Ensure item_name exists before calling toLowerCase
        if (!flip.item_name) return false;
        return flip.item_name.toLowerCase() === queryObj.itemName.toLowerCase();
      })
    : flips;

  // Sort results
  filteredFlips = sortData(filteredFlips, queryObj.sortBy, queryObj.sortDirection);

  return {
    type: 'FLIP_LIST',
    data: filteredFlips,
    warnings,
    summary: {
      totalFlips: filteredFlips.length,
      totalProfit: filteredFlips.reduce((sum, flip) => sum + flip.profit, 0),
      averageProfit: filteredFlips.length
        ? filteredFlips.reduce((sum, flip) => sum + flip.profit, 0) / filteredFlips.length
        : 0,
      totalSpent: filteredFlips.reduce((sum, flip) => sum + flip.spent, 0),
    },
  };
};

// Strategy: Flips filtered by profit thresholds
export const flipsByProfitStrategy = async queryObj => {
  const { flips, warnings } = await loadFlipData(queryObj.dateFrom, queryObj.dateTo);

  // Filter by profit thresholds
  let filteredFlips = flips.filter(flip => {
    return (
      flip.profit >= queryObj.minProfit &&
      (queryObj.maxProfit === null || flip.profit <= queryObj.maxProfit)
    );
  });

  // Sort results
  filteredFlips = sortData(filteredFlips, queryObj.sortBy, queryObj.sortDirection);

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
    itemGroups[flip.item_name].totalProfit += flip.profit;
  });

  return {
    type: 'FLIP_LIST',
    data: filteredFlips,
    warnings,
    summary: {
      totalFlips: filteredFlips.length,
      totalProfit: filteredFlips.reduce((sum, flip) => sum + flip.profit, 0),
      averageProfit: filteredFlips.length
        ? filteredFlips.reduce((sum, flip) => sum + flip.profit, 0) / filteredFlips.length
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

  // Filter by ROI and flip count
  let filteredItems = itemStats.filter(item => {
    return item.roi_percent >= queryObj.minROI && item.flips >= queryObj.minFlipCount;
  });

  // If date range specified, we need to calculate ROI for that specific period
  if (queryObj.dateFrom || queryObj.dateTo) {
    const { flips } = await loadFlipData(queryObj.dateFrom, queryObj.dateTo);

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

      const totalProfit = itemFlips.reduce((sum, flip) => sum + flip.profit, 0);
      const totalSpent = itemFlips.reduce((sum, flip) => sum + flip.spent, 0);
      const roi = totalSpent > 0 ? (totalProfit / totalSpent) * 100 : 0;

      item.period_roi = roi;
      item.period_flips = itemFlips.length;
      item.period_profit = totalProfit;

      return roi >= queryObj.minROI && itemFlips.length >= queryObj.minFlipCount;
    });
  }

  // Sort results
  filteredItems = sortData(filteredItems, queryObj.sortBy, queryObj.sortDirection);

  return {
    type: 'ITEM_LIST',
    data: filteredItems,
    summary: {
      totalItems: filteredItems.length,
      averageROI: filteredItems.length
        ? filteredItems.reduce((sum, item) => sum + parseFloat(item.roi_percent), 0) /
          filteredItems.length
        : 0,
    },
  };
};
