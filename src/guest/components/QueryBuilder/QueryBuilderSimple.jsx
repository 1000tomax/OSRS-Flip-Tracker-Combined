import { useState, useMemo } from 'react';
import { formatGP } from '../../../utils/formatUtils';

export function QueryBuilderSimple({ data }) {
  // Simple state for filters
  const [filters, setFilters] = useState({
    minProfit: '',
    itemSearch: '',
    minROI: '',
    fromDate: '',
    toDate: '',
    minQuantity: '',
    maxQuantity: '',
    minHoursHeld: '',
    maxHoursHeld: '',
    minBuyPrice: '',
    maxBuyPrice: '',
    minSellPrice: '',
    maxSellPrice: '',
    sortBy: 'profit',
    limit: '100',
  });

  // Results state - starts null (no results shown)
  const [results, setResults] = useState(null);
  const [totalFiltered, setTotalFiltered] = useState(0);
  const [allFilteredResults, setAllFilteredResults] = useState(null); // Store all filtered results for export

  // Calculate min and max dates from data
  const { minDate, maxDate } = useMemo(() => {
    if (!data?.allFlips || data.allFlips.length === 0) {
      return { minDate: '', maxDate: '' };
    }

    // Find earliest and latest dates
    const dates = data.allFlips
      .map(flip => flip.date)
      .filter(date => date && date !== 'Unknown')
      .sort((a, b) => {
        // Sort dates properly considering year (MM-DD-YYYY format)
        const [aMonth, aDay, aYear] = a.split('-');
        const [bMonth, bDay, bYear] = b.split('-');
        const dateA = new Date(aYear, aMonth - 1, aDay);
        const dateB = new Date(bYear, bMonth - 1, bDay);
        return dateA - dateB;
      });

    const min = dates[0] || '';
    const max = dates[dates.length - 1] || '';

    console.log('Date range in data:', min, 'to', max);
    return { minDate: min, maxDate: max };
  }, [data]);

  // Log data structure on mount for debugging
  console.log('QueryBuilderSimple received data:', {
    hasData: !!data,
    hasAllFlips: !!data?.allFlips,
    flipCount: data?.allFlips?.length || 0,
    sampleFlip: data?.allFlips?.[0],
  });

  // Simple filter function
  const applyFilters = () => {
    console.log('Applying filters:', filters);

    // Check if we have data
    if (!data?.allFlips) {
      console.error('No flip data available');
      setResults([]);
      return;
    }

    // Start with all flips
    let filtered = [...data.allFlips];
    console.log(`Starting with ${filtered.length} flips`);

    // Filter by minimum profit
    if (filters.minProfit && !isNaN(filters.minProfit)) {
      const minProfit = parseFloat(filters.minProfit);
      filtered = filtered.filter(flip => flip.profit >= minProfit);
      console.log(`After profit filter (>= ${minProfit}): ${filtered.length} flips`);
    }

    // Filter by item name (case-insensitive contains)
    if (filters.itemSearch && filters.itemSearch.trim()) {
      const search = filters.itemSearch.toLowerCase().trim();
      filtered = filtered.filter(flip => flip.item && flip.item.toLowerCase().includes(search));
      console.log(`After item search ("${search}"): ${filtered.length} flips`);
    }

    // Filter by minimum ROI
    if (filters.minROI && !isNaN(filters.minROI)) {
      const minROI = parseFloat(filters.minROI);
      filtered = filtered.filter(flip => flip.roi >= minROI);
      console.log(`After ROI filter (>= ${minROI}%): ${filtered.length} flips`);
    }

    // Filter by date range
    if (filters.fromDate || filters.toDate) {
      console.log('Date range:', filters.fromDate, 'to', filters.toDate);

      if (filters.fromDate) {
        filtered = filtered.filter(flip => flip.date && flip.date >= filters.fromDate);
        console.log(`After from date filter (>= ${filters.fromDate}): ${filtered.length} flips`);
      }

      if (filters.toDate) {
        filtered = filtered.filter(flip => flip.date && flip.date <= filters.toDate);
        console.log(`After to date filter (<= ${filters.toDate}): ${filtered.length} flips`);
      }
    }

    // Filter by quantity range
    if (filters.minQuantity || filters.maxQuantity) {
      console.log('Quantity range:', filters.minQuantity, 'to', filters.maxQuantity);

      if (filters.minQuantity && !isNaN(filters.minQuantity)) {
        const minQty = parseInt(filters.minQuantity);
        filtered = filtered.filter(flip => flip.quantity >= minQty);
        console.log(`After min quantity filter (>= ${minQty}): ${filtered.length} flips`);
      }

      if (filters.maxQuantity && !isNaN(filters.maxQuantity)) {
        const maxQty = parseInt(filters.maxQuantity);
        filtered = filtered.filter(flip => flip.quantity <= maxQty);
        console.log(`After max quantity filter (<= ${maxQty}): ${filtered.length} flips`);
      }
    }

    // Filter by hours held range
    if (filters.minHoursHeld || filters.maxHoursHeld) {
      console.log('Hours held range:', filters.minHoursHeld, 'to', filters.maxHoursHeld);

      if (filters.minHoursHeld && !isNaN(filters.minHoursHeld)) {
        const minHours = parseFloat(filters.minHoursHeld);
        filtered = filtered.filter(flip => flip.hoursHeld >= minHours);
        console.log(`After min hours held filter (>= ${minHours} hours): ${filtered.length} flips`);
      }

      if (filters.maxHoursHeld && !isNaN(filters.maxHoursHeld)) {
        const maxHours = parseFloat(filters.maxHoursHeld);
        filtered = filtered.filter(flip => flip.hoursHeld <= maxHours);
        console.log(`After max hours held filter (<= ${maxHours} hours): ${filtered.length} flips`);
      }
    }

    // Filter by buy price range
    if (filters.minBuyPrice || filters.maxBuyPrice) {
      console.log('Buy price range:', filters.minBuyPrice, 'to', filters.maxBuyPrice);

      if (filters.minBuyPrice && !isNaN(filters.minBuyPrice)) {
        const minBuy = parseInt(filters.minBuyPrice);
        filtered = filtered.filter(flip => flip.avgBuyPrice >= minBuy);
        console.log(`After min buy price filter (>= ${minBuy}): ${filtered.length} flips`);
      }

      if (filters.maxBuyPrice && !isNaN(filters.maxBuyPrice)) {
        const maxBuy = parseInt(filters.maxBuyPrice);
        filtered = filtered.filter(flip => flip.avgBuyPrice <= maxBuy);
        console.log(`After max buy price filter (<= ${maxBuy}): ${filtered.length} flips`);
      }
    }

    // Filter by sell price range
    if (filters.minSellPrice || filters.maxSellPrice) {
      console.log('Sell price range:', filters.minSellPrice, 'to', filters.maxSellPrice);

      if (filters.minSellPrice && !isNaN(filters.minSellPrice)) {
        const minSell = parseInt(filters.minSellPrice);
        filtered = filtered.filter(flip => flip.avgSellPrice >= minSell);
        console.log(`After min sell price filter (>= ${minSell}): ${filtered.length} flips`);
      }

      if (filters.maxSellPrice && !isNaN(filters.maxSellPrice)) {
        const maxSell = parseInt(filters.maxSellPrice);
        filtered = filtered.filter(flip => flip.avgSellPrice <= maxSell);
        console.log(`After max sell price filter (<= ${maxSell}): ${filtered.length} flips`);
      }
    }

    // Sort results
    if (filters.sortBy) {
      filtered.sort((a, b) => {
        const aVal = a[filters.sortBy] || 0;
        const bVal = b[filters.sortBy] || 0;

        // Sort descending for numbers
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return bVal - aVal;
        }

        // Sort ascending for strings (dates)
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return aVal.localeCompare(bVal);
        }

        return 0;
      });
      console.log(`Sorted by ${filters.sortBy}`);
    }

    // Save total filtered count and all results before applying limit
    const totalFilteredCount = filtered.length;
    setTotalFiltered(totalFilteredCount);
    setAllFilteredResults([...filtered]); // Save all filtered results for export
    console.log(`Total filtered (before limit): ${totalFilteredCount} flips`);

    // Apply limit for display
    const limit = parseInt(filters.limit) || 100;
    let displayResults = filtered;
    if (filtered.length > limit) {
      displayResults = filtered.slice(0, limit);
      console.log(`Limited to ${limit} results for display`);
    }

    console.log(`Final result: ${displayResults.length} flips shown`);
    setResults(displayResults);
  };

  // Clear all filters and results
  const clearFilters = () => {
    setFilters({
      minProfit: '',
      itemSearch: '',
      minROI: '',
      fromDate: '',
      toDate: '',
      minQuantity: '',
      maxQuantity: '',
      minHoursHeld: '',
      maxHoursHeld: '',
      minBuyPrice: '',
      maxBuyPrice: '',
      minSellPrice: '',
      maxSellPrice: '',
      sortBy: 'profit',
      limit: '100',
    });
    setResults(null);
    setTotalFiltered(0);
    setAllFilteredResults(null);
    console.log('Filters cleared');
  };

  // Update a single filter value
  const updateFilter = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // Export to CSV
  const exportToCSV = () => {
    if (!allFilteredResults || allFilteredResults.length === 0) {
      console.log('No results to export');
      return;
    }

    console.log(`Exporting ${allFilteredResults.length} flips to CSV`);

    // Create CSV header
    const headers = [
      'Item',
      'Profit',
      'ROI (%)',
      'Quantity',
      'Date',
      'Buy Price',
      'Sell Price',
      'Spent',
      'Revenue',
      'Hours Held',
    ];

    // Create CSV rows
    const rows = allFilteredResults.map(flip => [
      flip.item || 'Unknown',
      flip.profit || 0,
      flip.roi ? flip.roi.toFixed(2) : '0',
      flip.quantity || 0,
      flip.date || 'Unknown',
      flip.avgBuyPrice || 0,
      flip.avgSellPrice || 0,
      flip.spent || 0,
      flip.revenue || 0,
      flip.hoursHeld || 0,
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row =>
        row
          .map(cell =>
            // Escape commas and quotes in cell values
            typeof cell === 'string' && (cell.includes(',') || cell.includes('"'))
              ? `"${cell.replace(/"/g, '""')}"`
              : cell
          )
          .join(',')
      ),
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `flips-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    console.log('CSV export completed');
  };

  // Export to JSON
  const exportToJSON = () => {
    if (!allFilteredResults || allFilteredResults.length === 0) {
      console.log('No results to export');
      return;
    }

    console.log(`Exporting ${allFilteredResults.length} flips to JSON`);

    // Create export object with metadata
    const exportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        filters: {
          minProfit: filters.minProfit || null,
          itemSearch: filters.itemSearch || null,
          minROI: filters.minROI || null,
          fromDate: filters.fromDate || null,
          toDate: filters.toDate || null,
          minQuantity: filters.minQuantity || null,
          maxQuantity: filters.maxQuantity || null,
          sortBy: filters.sortBy,
        },
        totalFlips: allFilteredResults.length,
        dateRange: {
          earliest: minDate,
          latest: maxDate,
        },
      },
      flips: allFilteredResults,
    };

    // Create blob and download
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `flips-export-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);

    console.log('JSON export completed');
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Simple Query Builder</h2>
        <p className="text-gray-400">Total flips available: {data?.allFlips?.length || 0}</p>
      </div>

      {/* Filter Inputs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Min Profit (GP)</label>
          <input
            type="number"
            value={filters.minProfit}
            onChange={e => updateFilter('minProfit', e.target.value)}
            placeholder="e.g. 10000"
            className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Item Name Contains</label>
          <input
            type="text"
            value={filters.itemSearch}
            onChange={e => updateFilter('itemSearch', e.target.value)}
            placeholder="e.g. dragon"
            className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Min ROI (%)</label>
          <input
            type="number"
            value={filters.minROI}
            onChange={e => updateFilter('minROI', e.target.value)}
            placeholder="e.g. 15"
            className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Sort By</label>
          <select
            value={filters.sortBy}
            onChange={e => updateFilter('sortBy', e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            <option value="profit">Profit</option>
            <option value="roi">ROI</option>
            <option value="date">Date</option>
            <option value="quantity">Quantity</option>
            <option value="hoursHeld">Hours Held</option>
            <option value="item">Item Name</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">From Date</label>
          <input
            type="date"
            value={filters.fromDate}
            onChange={e => {
              updateFilter('fromDate', e.target.value);
              // Update toDate min if needed
              if (filters.toDate && e.target.value > filters.toDate) {
                updateFilter('toDate', e.target.value);
              }
            }}
            min={minDate}
            max={maxDate}
            className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">To Date</label>
          <input
            type="date"
            value={filters.toDate}
            onChange={e => {
              updateFilter('toDate', e.target.value);
              // Update fromDate max if needed
              if (filters.fromDate && e.target.value < filters.fromDate) {
                updateFilter('fromDate', e.target.value);
              }
            }}
            min={filters.fromDate || minDate}
            max={maxDate}
            className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Min Quantity</label>
          <input
            type="number"
            value={filters.minQuantity}
            onChange={e => {
              const newMin = e.target.value;
              updateFilter('minQuantity', newMin);
              // Clear max if it's less than new min
              if (
                filters.maxQuantity &&
                newMin &&
                parseInt(newMin) > parseInt(filters.maxQuantity)
              ) {
                updateFilter('maxQuantity', '');
              }
            }}
            min="0"
            step="1"
            placeholder="e.g. 100"
            className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Max Quantity</label>
          <input
            type="number"
            value={filters.maxQuantity}
            onChange={e => {
              const newMax = e.target.value;
              updateFilter('maxQuantity', newMax);
              // Clear min if it's greater than new max
              if (
                filters.minQuantity &&
                newMax &&
                parseInt(filters.minQuantity) > parseInt(newMax)
              ) {
                updateFilter('minQuantity', '');
              }
            }}
            min="0"
            step="1"
            placeholder="e.g. 1000"
            className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Min Hours Held</label>
          <input
            type="number"
            value={filters.minHoursHeld}
            onChange={e => {
              const newMin = e.target.value;
              updateFilter('minHoursHeld', newMin);
              // Clear max if it's less than new min
              if (
                filters.maxHoursHeld &&
                newMin &&
                parseFloat(newMin) > parseFloat(filters.maxHoursHeld)
              ) {
                updateFilter('maxHoursHeld', '');
              }
            }}
            min="0"
            step="0.5"
            placeholder="e.g. 12"
            className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Max Hours Held</label>
          <input
            type="number"
            value={filters.maxHoursHeld}
            onChange={e => {
              const newMax = e.target.value;
              updateFilter('maxHoursHeld', newMax);
              // Clear min if it's greater than new max
              if (
                filters.minHoursHeld &&
                newMax &&
                parseFloat(filters.minHoursHeld) > parseFloat(newMax)
              ) {
                updateFilter('minHoursHeld', '');
              }
            }}
            min="0"
            step="0.5"
            placeholder="e.g. 24"
            className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Price Range Filters - Second Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Min Buy Price (GP)</label>
          <input
            type="number"
            value={filters.minBuyPrice}
            onChange={e => {
              const newMin = e.target.value;
              updateFilter('minBuyPrice', newMin);
              // Clear max if it's less than new min
              if (
                filters.maxBuyPrice &&
                newMin &&
                parseInt(newMin) > parseInt(filters.maxBuyPrice)
              ) {
                updateFilter('maxBuyPrice', '');
              }
            }}
            min="0"
            step="1000"
            placeholder="e.g. 10000"
            className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Max Buy Price (GP)</label>
          <input
            type="number"
            value={filters.maxBuyPrice}
            onChange={e => {
              const newMax = e.target.value;
              updateFilter('maxBuyPrice', newMax);
              // Clear min if it's greater than new max
              if (
                filters.minBuyPrice &&
                newMax &&
                parseInt(filters.minBuyPrice) > parseInt(newMax)
              ) {
                updateFilter('minBuyPrice', '');
              }
            }}
            min="0"
            step="1000"
            placeholder="e.g. 100000"
            className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Min Sell Price (GP)</label>
          <input
            type="number"
            value={filters.minSellPrice}
            onChange={e => {
              const newMin = e.target.value;
              updateFilter('minSellPrice', newMin);
              // Clear max if it's less than new min
              if (
                filters.maxSellPrice &&
                newMin &&
                parseInt(newMin) > parseInt(filters.maxSellPrice)
              ) {
                updateFilter('maxSellPrice', '');
              }
            }}
            min="0"
            step="1000"
            placeholder="e.g. 20000"
            className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Max Sell Price (GP)</label>
          <input
            type="number"
            value={filters.maxSellPrice}
            onChange={e => {
              const newMax = e.target.value;
              updateFilter('maxSellPrice', newMax);
              // Clear min if it's greater than new max
              if (
                filters.minSellPrice &&
                newMax &&
                parseInt(filters.minSellPrice) > parseInt(newMax)
              ) {
                updateFilter('minSellPrice', '');
              }
            }}
            min="0"
            step="1000"
            placeholder="e.g. 200000"
            className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Limit and Buttons */}
      <div className="flex gap-4 items-end mb-6">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Max Results</label>
          <input
            type="number"
            value={filters.limit}
            onChange={e => updateFilter('limit', e.target.value)}
            className="w-20 px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <button
          onClick={applyFilters}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold"
        >
          Apply Filters
        </button>

        <button
          onClick={clearFilters}
          className="px-6 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
        >
          Clear
        </button>
      </div>

      {/* Results Section */}
      {results !== null && (
        <div>
          <div className="mb-3 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white">
              Results: Showing {results.length}{' '}
              {totalFiltered > results.length ? `out of ${totalFiltered}` : ''} flips
            </h3>
            <div className="flex gap-2">
              <button
                onClick={exportToCSV}
                className="px-4 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 font-medium"
                title={`Export ${totalFiltered} filtered flips to CSV`}
              >
                Export CSV ({totalFiltered})
              </button>
              <button
                onClick={exportToJSON}
                className="px-4 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 font-medium"
                title={`Export ${totalFiltered} filtered flips to JSON`}
              >
                Export JSON ({totalFiltered})
              </button>
            </div>
          </div>

          {results.length === 0 ? (
            <div className="bg-gray-700 rounded p-4 text-center text-gray-400">
              No flips match your filters
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="px-4 py-2 text-gray-400">Item</th>
                    <th className="px-4 py-2 text-gray-400">Profit</th>
                    <th className="px-4 py-2 text-gray-400">ROI</th>
                    <th className="px-4 py-2 text-gray-400">Quantity</th>
                    <th className="px-4 py-2 text-gray-400">Date</th>
                    <th className="px-4 py-2 text-gray-400">Buy Price</th>
                    <th className="px-4 py-2 text-gray-400">Sell Price</th>
                    <th className="px-4 py-2 text-gray-400">Hours Held</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((flip, index) => (
                    <tr key={index} className="border-b border-gray-700 hover:bg-gray-700">
                      <td className="px-4 py-2 text-white">{flip.item || 'Unknown'}</td>
                      <td
                        className={`px-4 py-2 font-semibold ${
                          flip.profit >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {formatGP(flip.profit || 0)}
                      </td>
                      <td className="px-4 py-2 text-white">
                        {flip.roi ? `${flip.roi.toFixed(1)}%` : '0%'}
                      </td>
                      <td className="px-4 py-2 text-white">
                        {(flip.quantity || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-gray-300">{flip.date || 'Unknown'}</td>
                      <td className="px-4 py-2 text-white">{formatGP(flip.avgBuyPrice || 0)}</td>
                      <td className="px-4 py-2 text-white">{formatGP(flip.avgSellPrice || 0)}</td>
                      <td className="px-4 py-2 text-white">
                        {flip.hoursHeld ? `${flip.hoursHeld.toFixed(1)}h` : '0h'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
