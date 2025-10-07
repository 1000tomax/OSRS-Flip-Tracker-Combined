import { useState, useMemo } from 'react';

export default function ItemSelectorPage({ items, priceData, volumeData, onDownload, onBack }) {
  const [mode, setMode] = useState('trade'); // 'trade' or 'block'
  const [checkedItems, setCheckedItems] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [showMembersOnly, setShowMembersOnly] = useState(false);
  const [showF2POnly, setShowF2POnly] = useState(false);
  const [sortBy, setSortBy] = useState('name'); // 'name', 'price', 'volume'
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' or 'desc'
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minVolume, setMinVolume] = useState('');
  const [maxVolume, setMaxVolume] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  // Filter and sort items
  const filteredItems = useMemo(() => {
    const filtered = items.filter(item => {
      // Search filter
      if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Members filter
      if (showMembersOnly && !item.members) return false;
      if (showF2POnly && item.members) return false;

      // Price range filter
      const price = priceData[item.id]?.high;
      if (price !== undefined) {
        if (minPrice && price < parseFloat(minPrice)) return false;
        if (maxPrice && price > parseFloat(maxPrice)) return false;
      } else {
        // If no price data and user set price filters, exclude item
        if (minPrice || maxPrice) return false;
      }

      // Volume range filter
      const volume = volumeData[item.id]?.highPriceVolume;
      if (volume !== undefined) {
        if (minVolume && volume < parseFloat(minVolume)) return false;
        if (maxVolume && volume > parseFloat(maxVolume)) return false;
      } else {
        // If no volume data and user set volume filters, exclude item
        if (minVolume || maxVolume) return false;
      }

      return true;
    });

    // Sort items
    if (sortBy === 'name') {
      filtered.sort((a, b) => {
        const result = a.name.localeCompare(b.name);
        return sortDirection === 'asc' ? result : -result;
      });
    } else if (sortBy === 'price') {
      filtered.sort((a, b) => {
        const priceA = priceData[a.id]?.high || 0;
        const priceB = priceData[b.id]?.high || 0;
        const result = priceA - priceB;
        return sortDirection === 'asc' ? result : -result;
      });
    } else if (sortBy === 'volume') {
      filtered.sort((a, b) => {
        const volumeA = volumeData[a.id]?.highPriceVolume || 0;
        const volumeB = volumeData[b.id]?.highPriceVolume || 0;
        const result = volumeA - volumeB;
        return sortDirection === 'asc' ? result : -result;
      });
    }

    return filtered;
  }, [
    items,
    searchQuery,
    showMembersOnly,
    showF2POnly,
    minPrice,
    maxPrice,
    minVolume,
    maxVolume,
    sortBy,
    sortDirection,
    priceData,
    volumeData,
  ]);

  // Paginate filtered items
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredItems, currentPage]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  const handleToggleItem = itemId => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(itemId)) {
      newChecked.delete(itemId);
    } else {
      newChecked.add(itemId);
    }
    setCheckedItems(newChecked);
  };

  const handleSelectAll = () => {
    const newChecked = new Set(items.map(item => item.id));
    setCheckedItems(newChecked);
  };

  const handleSelectAllFiltered = () => {
    // Add all filtered items to the current selection (don't replace)
    const newChecked = new Set(checkedItems);
    filteredItems.forEach(item => {
      newChecked.add(item.id);
    });
    setCheckedItems(newChecked);
  };

  const handleDeselectAll = () => {
    setCheckedItems(new Set());
  };

  const handleInvertSelection = () => {
    const newChecked = new Set();
    items.forEach(item => {
      if (!checkedItems.has(item.id)) {
        newChecked.add(item.id);
      }
    });
    setCheckedItems(newChecked);
  };

  const handleSort = column => {
    if (sortBy === column) {
      // Toggle direction if clicking same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to ascending
      setSortBy(column);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const handleDownload = () => {
    // Prompt user for profile name
    // eslint-disable-next-line no-alert
    const profileName = prompt('Enter a name for your blocklist profile:', 'Custom Blocklist');

    // If user cancels or enters empty string, don't download
    if (!profileName || !profileName.trim()) {
      return;
    }

    // If mode is 'trade', blocked items are the unchecked ones
    // If mode is 'block', blocked items are the checked ones
    const blockedItemIds =
      mode === 'trade'
        ? items.filter(item => !checkedItems.has(item.id)).map(item => item.id)
        : Array.from(checkedItems);

    onDownload(blockedItemIds, profileName.trim());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={onBack}
          className="text-blue-400 hover:text-blue-300 mb-4 flex items-center gap-2"
        >
          ← Back to Guest Mode
        </button>
        <h1 className="text-3xl font-bold text-gray-100 mb-2">🔧 Blocklist Generator</h1>
        <p className="text-gray-400">
          Filter and select items to create your custom blocklist profile
        </p>
        <p className="text-xs text-gray-500 mt-2">
          📊 Loaded {items.length} items • {Object.keys(priceData).length} with prices
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border-2 border-purple-500/50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">⚠️ What do checked items mean?</h3>
        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="radio"
              name="mode"
              value="trade"
              checked={mode === 'trade'}
              onChange={e => setMode(e.target.value)}
              className="mt-1 h-4 w-4 text-blue-600"
            />
            <div>
              <div className="text-white font-medium group-hover:text-blue-300">
                ✅ Trade these items (block everything else)
              </div>
              <div className="text-sm text-gray-400">
                Checked items will be available to trade. All unchecked items will be blocked.
              </div>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="radio"
              name="mode"
              value="block"
              checked={mode === 'block'}
              onChange={e => setMode(e.target.value)}
              className="mt-1 h-4 w-4 text-blue-600"
            />
            <div>
              <div className="text-white font-medium group-hover:text-blue-300">
                🚫 Block these items (trade everything else)
              </div>
              <div className="text-sm text-gray-400">
                Checked items will be blocked. All unchecked items will be available to trade.
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Selection Summary */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="text-gray-300">
            <span className="font-semibold text-white">{checkedItems.size}</span> items checked
            {mode === 'trade' ? (
              <span className="text-sm text-gray-400 ml-2">
                ({items.length - checkedItems.size} will be blocked)
              </span>
            ) : (
              <span className="text-sm text-gray-400 ml-2">
                ({items.length - checkedItems.size} will be tradeable)
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSelectAllFiltered}
              className="px-3 py-1 bg-blue-700 hover:bg-blue-600 text-sm text-white rounded transition-colors"
              title="Add all filtered items to selection"
            >
              Select Filtered ({filteredItems.length})
            </button>
            <button
              onClick={handleSelectAll}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-sm text-gray-300 rounded transition-colors"
            >
              Select All
            </button>
            <button
              onClick={handleDeselectAll}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-sm text-gray-300 rounded transition-colors"
            >
              Deselect All
            </button>
            <button
              onClick={handleInvertSelection}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-sm text-gray-300 rounded transition-colors"
            >
              Invert
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-4">
        {/* Search */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">Search by name</label>
          <input
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Type Filters */}
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={showMembersOnly}
              onChange={e => {
                setShowMembersOnly(e.target.checked);
                if (e.target.checked) setShowF2POnly(false);
                setCurrentPage(1);
              }}
              className="h-4 w-4"
            />
            Members Only
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={showF2POnly}
              onChange={e => {
                setShowF2POnly(e.target.checked);
                if (e.target.checked) setShowMembersOnly(false);
                setCurrentPage(1);
              }}
              className="h-4 w-4"
            />
            F2P Only
          </label>
        </div>

        {/* Price Range Filters */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Min Price (gp)</label>
            <input
              type="number"
              placeholder="e.g., 100000"
              value={minPrice}
              onChange={e => {
                setMinPrice(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Max Price (gp)</label>
            <input
              type="number"
              placeholder="e.g., 5000000"
              value={maxPrice}
              onChange={e => {
                setMaxPrice(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Volume Range Filters */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Min Volume (1h)</label>
            <input
              type="number"
              placeholder="e.g., 100"
              value={minVolume}
              onChange={e => {
                setMinVolume(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Max Volume (1h)</label>
            <input
              type="number"
              placeholder="e.g., 10000"
              value={maxVolume}
              onChange={e => {
                setMaxVolume(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Results count */}
        <div className="text-sm text-gray-400 pt-2 border-t border-gray-700">
          Showing {filteredItems.length} of {items.length} items
        </div>
      </div>

      {/* Items List */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        <div className="max-h-[600px] overflow-y-auto">
          <table className="w-full">
            <thead className="bg-gray-900 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider w-12">
                  Select
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-200 select-none"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    Item Name
                    {sortBy === 'name' && <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider w-24">
                  Type
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider w-40 cursor-pointer hover:text-gray-200 select-none"
                  onClick={() => handleSort('price')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Price (as of)
                    {sortBy === 'price' && <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider w-32 cursor-pointer hover:text-gray-200 select-none"
                  onClick={() => handleSort('volume')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Volume (1h)
                    {sortBy === 'volume' && <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {paginatedItems.map(item => {
                const price = priceData[item.id];
                const volume = volumeData[item.id];
                const isChecked = checkedItems.has(item.id);

                // Format timestamp
                let timeAgo = 'N/A';
                if (price?.highTime) {
                  const secondsAgo = Math.floor(Date.now() / 1000) - price.highTime;
                  if (secondsAgo < 60) timeAgo = `${secondsAgo}s ago`;
                  else if (secondsAgo < 3600) timeAgo = `${Math.floor(secondsAgo / 60)}m ago`;
                  else if (secondsAgo < 86400) timeAgo = `${Math.floor(secondsAgo / 3600)}h ago`;
                  else timeAgo = `${Math.floor(secondsAgo / 86400)}d ago`;
                }

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-700/50 cursor-pointer"
                    onClick={() => handleToggleItem(item.id)}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleItem(item.id)}
                        className="h-4 w-4"
                        onClick={e => e.stopPropagation()}
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-200">{item.name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          item.members
                            ? 'bg-yellow-900/30 text-yellow-300 border border-yellow-700/50'
                            : 'bg-green-900/30 text-green-300 border border-green-700/50'
                        }`}
                      >
                        {item.members ? 'P2P' : 'F2P'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="text-sm text-gray-300 font-mono">
                        {price?.high ? `${price.high.toLocaleString()} gp` : 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500">{timeAgo}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="text-sm text-gray-300 font-mono">
                        {volume?.highPriceVolume ? volume.highPriceVolume.toLocaleString() : 'N/A'}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-gray-300 rounded transition-colors"
          >
            Previous
          </button>
          <span className="text-gray-400 text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-gray-300 rounded transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {/* Download Button */}
      <div className="sticky bottom-0 bg-gray-900/95 border-t border-gray-700 p-4 -mx-6 -mb-6">
        <button
          onClick={handleDownload}
          className="w-full px-6 py-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
        >
          <span>📥</span>
          <span>Download Blocklist Profile</span>
        </button>
      </div>
    </div>
  );
}
