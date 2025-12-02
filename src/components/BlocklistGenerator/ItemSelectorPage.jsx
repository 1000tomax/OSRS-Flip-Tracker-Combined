import { useState, useMemo } from 'react';

// Time constants for timestamp formatting
const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_DAY = 86400;

/**
 * Parse shorthand notation for numbers (e.g., 1m, 1.5m, 10k, 1b)
 * @param {string} value - The input value (e.g., "1m", "10k", "100000")
 * @returns {number | null} - The parsed number or null if invalid
 */
function parseShorthandNumber(value) {
  if (!value || typeof value !== 'string') return null;

  const trimmed = value.trim().toLowerCase();
  if (trimmed === '') return null;

  // Check for shorthand notation
  const match = trimmed.match(/^(\d+\.?\d*)\s*([kmb]?)$/i);
  if (!match) return null;

  const num = parseFloat(match[1]);
  const suffix = match[2];

  if (isNaN(num)) return null;

  switch (suffix) {
    case 'k':
      return num * 1000;
    case 'm':
      return num * 1000000;
    case 'b':
      return num * 1000000000;
    default:
      return num;
  }
}

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

  // Text import state
  const [showTextImport, setShowTextImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importResults, setImportResults] = useState(null);

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
        const minPriceParsed = parseShorthandNumber(minPrice);
        const maxPriceParsed = parseShorthandNumber(maxPrice);
        if (minPriceParsed !== null && price < minPriceParsed) return false;
        if (maxPriceParsed !== null && price > maxPriceParsed) return false;
      } else {
        // If no price data and user set price filters, exclude item
        if (minPrice || maxPrice) return false;
      }

      // Volume range filter (24h volume is stored as a simple number)
      const volume = volumeData[item.id];
      if (volume !== undefined && volume !== null) {
        const minVolumeParsed = parseShorthandNumber(minVolume);
        const maxVolumeParsed = parseShorthandNumber(maxVolume);
        if (minVolumeParsed !== null && volume < minVolumeParsed) return false;
        if (maxVolumeParsed !== null && volume > maxVolumeParsed) return false;
      } else {
        // If no volume data and user set volume filters, exclude item
        if (minVolume || maxVolume) return false;
      }

      // User GP/hour range filter
      const userStats = userItemStats[item.name];
      if (minUserGpPerHour || maxUserGpPerHour) {
        const gpPerHour = userStats?.gpPerHour || 0;
        const minGpPerHourParsed = parseShorthandNumber(minUserGpPerHour);
        const maxGpPerHourParsed = parseShorthandNumber(maxUserGpPerHour);
        if (minGpPerHourParsed !== null && gpPerHour < minGpPerHourParsed) return false;
        if (maxGpPerHourParsed !== null && gpPerHour > maxGpPerHourParsed) return false;
      }

      // User flip count range filter
      if (minUserFlipCount || maxUserFlipCount) {
        const flipCount = userStats?.flipCount || 0;
        const minFlipCountParsed = parseShorthandNumber(minUserFlipCount);
        const maxFlipCountParsed = parseShorthandNumber(maxUserFlipCount);
        if (minFlipCountParsed !== null && flipCount < minFlipCountParsed) return false;
        if (maxFlipCountParsed !== null && flipCount > maxFlipCountParsed) return false;
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
        const volumeA = volumeData[a.id] || 0;
        const volumeB = volumeData[b.id] || 0;
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

  // Calculate current time once on mount to avoid impure function calls
  const [currentTime] = useState(() => Date.now());

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

  const handleTextImport = () => {
    if (!importText.trim()) {
      setImportResults({ matched: [], unmatched: [] });
      return;
    }

    // Search the entire text for any known item names
    // This handles duplicates, split lines, and any formatting
    const textLower = importText.toLowerCase();
    const matchedSet = new Set(); // Use Set to avoid duplicate matches

    items.forEach(item => {
      // Check if the item name appears anywhere in the text (case-insensitive)
      if (textLower.includes(item.name.toLowerCase())) {
        matchedSet.add(item.id);
      }
    });

    // Convert matched IDs back to item objects
    const matched = items.filter(item => matchedSet.has(item.id));

    setImportResults({ matched, unmatched: [] });
  };

  const handleApplyImport = addToExisting => {
    if (!importResults || importResults.matched.length === 0) return;

    const matchedIds = new Set(importResults.matched.map(item => item.id));

    if (addToExisting) {
      // Add to existing selection
      setCheckedItems(new Set([...checkedItems, ...matchedIds]));
    } else {
      // Replace selection
      setCheckedItems(matchedIds);
    }

    // Clear import
    setImportText('');
    setImportResults(null);
  };

  const handleDownload = () => {
    // Calculate the counts for confirmation
    const blockedItemIds =
      mode === 'trade'
        ? items.filter(item => !checkedItems.has(item.id)).map(item => item.id)
        : Array.from(checkedItems);

    const blockedCount = blockedItemIds.length;
    const totalCount = items.length;

    // Show confirmation dialog with counts
    // eslint-disable-next-line no-alert
    const confirmed = confirm(
      `⚠️ Blocklist Confirmation\n\n` +
        `This will block ${blockedCount}/${totalCount} items.\n\n` +
        `Is that what you intend to do?`
    );

    if (!confirmed) {
      return;
    }

    // Prompt user for profile name
    // eslint-disable-next-line no-alert
    const profileName = prompt('Enter a name for your blocklist profile:', 'Custom Blocklist');

    // If user cancels or enters empty string, don't download
    if (!profileName || !profileName.trim()) {
      return;
    }

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
          '3. Open the Manage panel in Flipping Copilot\n' +
          '4. Your custom blocklist will appear in the profile list!'
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
          ← Back to Dashboard
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

      {/* Text Import Section (Collapsible) */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        <button
          onClick={() => setShowTextImport(!showTextImport)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-750 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">📋</span>
            <span className="text-white font-medium">Import from Text</span>
            <span className="text-xs text-gray-400">(Paste item list from another tool)</span>
          </div>
          <span className="text-gray-400">{showTextImport ? '▼' : '▶'}</span>
        </button>

        {showTextImport && (
          <div className="p-4 border-t border-gray-700 space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Paste your text below (any format works - we'll find item names automatically)
              </label>
              <textarea
                value={importText}
                onChange={e => setImportText(e.target.value)}
                placeholder="Twisted bow&#10;Abyssal whip&#10;Dragon claws&#10;...or paste from spreadsheet"
                className="w-full h-32 px-3 py-2 bg-gray-900 border border-gray-600 rounded text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-sm"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleTextImport}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
              >
                Parse Items
              </button>
              {importResults && (
                <>
                  <button
                    onClick={() => handleApplyImport(false)}
                    disabled={importResults.matched.length === 0}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:opacity-50 text-white rounded transition-colors"
                  >
                    Replace Selection ({importResults.matched.length})
                  </button>
                  <button
                    onClick={() => handleApplyImport(true)}
                    disabled={importResults.matched.length === 0}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:opacity-50 text-white rounded transition-colors"
                  >
                    Add to Selection (+{importResults.matched.length})
                  </button>
                </>
              )}
            </div>

            {importResults && (
              <div className="bg-gray-900 border border-gray-600 rounded p-3">
                <div className="text-sm">
                  <span className="text-green-400 font-semibold">
                    ✓ Found {importResults.matched.length} items in your text
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
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
              type="text"
              placeholder="e.g., 1m, 100k, 500000"
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
              type="text"
              placeholder="e.g., 5m, 1.5b, 10000000"
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
            <label className="block text-sm text-gray-400 mb-2">Min Volume (24h)</label>
            <input
              type="text"
              placeholder="e.g., 1k, 2.4k, 2400"
              value={minVolume}
              onChange={e => {
                setMinVolume(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Max Volume (24h)</label>
            <input
              type="text"
              placeholder="e.g., 240k, 1m, 240000"
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
                    type="text"
                    placeholder="e.g., 100k, 1m, 500000"
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
                    type="text"
                    placeholder="e.g., 1m, 10m, 1000000"
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
                    Volume (24h)
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
                const volume24h = volumeData[item.id]; // This is now just a number (24h total)
                const userStats = userItemStats[item.name];
                const isChecked = checkedItems.has(item.id);

                // Format timestamp
                let timeAgo = 'N/A';
                if (price?.highTime) {
                  const secondsAgo = Math.floor(currentTime / 1000) - price.highTime;
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
                        {volume24h ? volume24h.toLocaleString() : 'N/A'}
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
