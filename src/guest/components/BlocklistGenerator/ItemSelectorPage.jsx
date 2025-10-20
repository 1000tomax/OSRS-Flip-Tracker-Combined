import { useState, useMemo } from 'react';

// Time constants for timestamp formatting
const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_DAY = 86400;

export default function ItemSelectorPage({
  items,
  priceData,
  volumeData,
  userItemStats = {},
  onDownload,
  onBack,
}) {
  const [mode, setMode] = useState('trade'); // 'trade' or 'block'
  const [checkedItems, setCheckedItems] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [showMembersOnly, setShowMembersOnly] = useState(false);
  const [showF2POnly, setShowF2POnly] = useState(false);
  const [showTradedOnly, setShowTradedOnly] = useState(false);
  const [sortBy, setSortBy] = useState('name'); // 'name', 'price', 'volume', 'userGpPerHour', 'userFlipCount'
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' or 'desc'
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minVolume, setMinVolume] = useState('');
  const [maxVolume, setMaxVolume] = useState('');
  const [minUserGpPerHour, setMinUserGpPerHour] = useState('');
  const [maxUserGpPerHour, setMaxUserGpPerHour] = useState('');
  const [minUserFlipCount, setMinUserFlipCount] = useState('');
  const [maxUserFlipCount, setMaxUserFlipCount] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  // Check if user has any flip data
  const hasUserData = Object.keys(userItemStats).length > 0;

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

      // Traded only filter
      if (showTradedOnly && !userItemStats[item.name]) return false;

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

      // User GP/hour range filter
      const userStats = userItemStats[item.name];
      if (minUserGpPerHour || maxUserGpPerHour) {
        const gpPerHour = userStats?.gpPerHour || 0;
        if (minUserGpPerHour && gpPerHour < parseFloat(minUserGpPerHour)) return false;
        if (maxUserGpPerHour && gpPerHour > parseFloat(maxUserGpPerHour)) return false;
      }

      // User flip count range filter
      if (minUserFlipCount || maxUserFlipCount) {
        const flipCount = userStats?.flipCount || 0;
        if (minUserFlipCount && flipCount < parseFloat(minUserFlipCount)) return false;
        if (maxUserFlipCount && flipCount > parseFloat(maxUserFlipCount)) return false;
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
    } else if (sortBy === 'userGpPerHour') {
      filtered.sort((a, b) => {
        const gpPerHourA = userItemStats[a.name]?.gpPerHour || 0;
        const gpPerHourB = userItemStats[b.name]?.gpPerHour || 0;
        const result = gpPerHourA - gpPerHourB;
        return sortDirection === 'asc' ? result : -result;
      });
    } else if (sortBy === 'userFlipCount') {
      filtered.sort((a, b) => {
        const flipCountA = userItemStats[a.name]?.flipCount || 0;
        const flipCountB = userItemStats[b.name]?.flipCount || 0;
        const result = flipCountA - flipCountB;
        return sortDirection === 'asc' ? result : -result;
      });
    }

    return filtered;
  }, [
    items,
    searchQuery,
    showMembersOnly,
    showF2POnly,
    showTradedOnly,
    minPrice,
    maxPrice,
    minVolume,
    maxVolume,
    minUserGpPerHour,
    maxUserGpPerHour,
    minUserFlipCount,
    maxUserFlipCount,
    sortBy,
    sortDirection,
    priceData,
    volumeData,
    userItemStats,
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

    // Show installation instructions after download
    setTimeout(() => {
      // eslint-disable-next-line no-alert
      alert(
        '✅ Profile downloaded!\n\n' +
          '📁 Installation Instructions:\n\n' +
          '1. Locate the downloaded .profile.json file\n' +
          '2. Move it to: %USERPROFILE%\\.runelite\\flipping-copilot\n' +
          '   (Windows: C:\\Users\\YourName\\.runelite\\flipping-copilot)\n\n' +
          '3. Restart RuneLite or reload the Flipping Copilot plugin\n' +
          '4. Your custom blocklist will appear in the plugin settings!'
      );
    }, 100);
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
          {hasUserData && (
            <span className="ml-2 text-green-400">
              • ✅ Your flip data: {Object.keys(userItemStats).length} items traded
            </span>
          )}
        </p>
      </div>

      {/* Installation Instructions Banner */}
      <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <span className="text-2xl">📁</span>
          <div>
            <p className="text-blue-200 font-semibold mb-2">Installation Instructions</p>
            <p className="text-blue-300 text-sm mb-2">
              After downloading your profile, save it to:{' '}
              <code className="bg-blue-950/50 px-2 py-1 rounded text-blue-100 font-mono text-xs">
                %USERPROFILE%\.runelite\flipping-copilot
              </code>
            </p>
            <p className="text-blue-400 text-xs">
              Windows:{' '}
              <code className="bg-blue-950/50 px-1 py-0.5 rounded font-mono">
                C:\Users\YourName\.runelite\flipping-copilot
              </code>
            </p>
          </div>
        </div>
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
        <div className="flex gap-4 flex-wrap">
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
          {hasUserData && (
            <label className="flex items-center gap-2 text-sm text-green-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showTradedOnly}
                onChange={e => {
                  setShowTradedOnly(e.target.checked);
                  setCurrentPage(1);
                }}
                className="h-4 w-4"
              />
              Items I've Traded Only
            </label>
          )}
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

        {/* User Performance Filters - Only show if user has data */}
        {hasUserData && (
          <>
            <div className="pt-4 border-t border-green-900/30">
              <h4 className="text-sm font-semibold text-green-400 mb-3">
                Your Performance Filters
              </h4>

              {/* GP/Hour Range Filters */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm text-green-300 mb-2">Min GP/Hour</label>
                  <input
                    type="number"
                    placeholder="e.g., 100000"
                    value={minUserGpPerHour}
                    onChange={e => {
                      setMinUserGpPerHour(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-4 py-2 bg-gray-900 border border-green-700/50 rounded text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-green-300 mb-2">Max GP/Hour</label>
                  <input
                    type="number"
                    placeholder="e.g., 1000000"
                    value={maxUserGpPerHour}
                    onChange={e => {
                      setMaxUserGpPerHour(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-4 py-2 bg-gray-900 border border-green-700/50 rounded text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              {/* Flip Count Range Filters */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-green-300 mb-2">Min Flip Count</label>
                  <input
                    type="number"
                    placeholder="e.g., 5"
                    value={minUserFlipCount}
                    onChange={e => {
                      setMinUserFlipCount(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-4 py-2 bg-gray-900 border border-green-700/50 rounded text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-green-300 mb-2">Max Flip Count</label>
                  <input
                    type="number"
                    placeholder="e.g., 100"
                    value={maxUserFlipCount}
                    onChange={e => {
                      setMaxUserFlipCount(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-4 py-2 bg-gray-900 border border-green-700/50 rounded text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
            </div>
          </>
        )}

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
                {hasUserData && (
                  <th className="px-4 py-3 text-right text-xs font-medium text-green-400 uppercase tracking-wider w-48">
                    <div className="flex flex-col items-end gap-1">
                      <div
                        role="button"
                        tabIndex={0}
                        className="cursor-pointer hover:text-green-300 select-none flex items-center gap-1"
                        onClick={() => handleSort('userGpPerHour')}
                        onKeyDown={e => e.key === 'Enter' && handleSort('userGpPerHour')}
                      >
                        Your GP/Hour
                        {sortBy === 'userGpPerHour' && (
                          <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                      <div
                        role="button"
                        tabIndex={0}
                        className="cursor-pointer hover:text-green-300 select-none flex items-center gap-1"
                        onClick={() => handleSort('userFlipCount')}
                        onKeyDown={e => e.key === 'Enter' && handleSort('userFlipCount')}
                      >
                        Your Flips
                        {sortBy === 'userFlipCount' && (
                          <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </div>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {paginatedItems.map(item => {
                const price = priceData[item.id];
                const volume = volumeData[item.id];
                const userStats = userItemStats[item.name];
                const isChecked = checkedItems.has(item.id);

                // Format timestamp
                let timeAgo = 'N/A';
                if (price?.highTime) {
                  const secondsAgo = Math.floor(Date.now() / 1000) - price.highTime;
                  if (secondsAgo < SECONDS_PER_MINUTE) timeAgo = `${secondsAgo}s ago`;
                  else if (secondsAgo < SECONDS_PER_HOUR)
                    timeAgo = `${Math.floor(secondsAgo / SECONDS_PER_MINUTE)}m ago`;
                  else if (secondsAgo < SECONDS_PER_DAY)
                    timeAgo = `${Math.floor(secondsAgo / SECONDS_PER_HOUR)}h ago`;
                  else timeAgo = `${Math.floor(secondsAgo / SECONDS_PER_DAY)}d ago`;
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
                    {hasUserData && (
                      <td className="px-4 py-3 text-right">
                        {userStats ? (
                          <div>
                            <div className="text-sm text-green-300 font-mono font-semibold">
                              {userStats.gpPerHour.toLocaleString()} gp/h
                            </div>
                            <div className="text-xs text-gray-400">
                              {userStats.flipCount} flip{userStats.flipCount !== 1 ? 's' : ''}
                              {userStats.flipCount < 5 && (
                                <span
                                  className="ml-1 text-yellow-400"
                                  title="Small sample size - results may not be reliable"
                                >
                                  ⚠️
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500 italic">Not traded</div>
                        )}
                      </td>
                    )}
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
