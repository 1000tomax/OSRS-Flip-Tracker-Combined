export default function BlocklistPreview({
  preview,
  profileName,
  onProfileNameChange,
  onDownload,
  loading,
}) {
  if (!preview) return null;

  const { interpretation, stats, tradeable } = preview;

  // Format numbers with commas
  const formatNumber = num => num.toLocaleString();

  // Get top 10 items sorted by price
  const topItems = tradeable
    .slice()
    .sort((a, b) => b.price - a.price)
    .slice(0, 10);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-200 mb-2">📊 Preview Results</h3>

        {/* Claude's interpretation */}
        <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4 mb-4">
          <p className="text-sm text-gray-400 mb-1">🧠 Understanding your request:</p>
          <p className="text-gray-200 italic">&quot;{interpretation}&quot;</p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-900/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-400">
              {formatNumber(stats.tradeableCount)}
            </div>
            <div className="text-sm text-gray-400">Items to trade</div>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-red-400">
              {formatNumber(stats.blockedCount)}
            </div>
            <div className="text-sm text-gray-400">Items blocked</div>
          </div>
        </div>

        {/* Warnings */}
        {stats.tradeableCount === 0 && (
          <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4 mb-4">
            <p className="text-yellow-400 text-sm">
              ⚠️ No items match your criteria. Try broader terms or different filters.
            </p>
          </div>
        )}
        {stats.tradeableCount === stats.totalItems && (
          <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4 mb-4">
            <p className="text-blue-400 text-sm">
              ℹ️ All items match your criteria. You may want to be more specific.
            </p>
          </div>
        )}

        {/* Sample items */}
        {topItems.length > 0 && (
          <div className="mb-4">
            <p className="text-sm text-gray-400 mb-2">Top 10 items by price:</p>
            <div className="bg-gray-900/50 rounded-lg p-3 max-h-64 overflow-y-auto">
              <ul className="space-y-1 text-sm">
                {topItems.map((item, idx) => (
                  <li key={item.id} className="text-gray-300 flex justify-between">
                    <span>
                      {idx + 1}. {item.name}
                      {!item.members && <span className="ml-2 text-xs text-blue-400">(F2P)</span>}
                    </span>
                    <span className="text-gray-500">{(item.price / 1000).toFixed(0)}k gp</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Profile name input */}
        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-2">Profile name (optional):</label>
          <input
            type="text"
            value={profileName}
            onChange={e => onProfileNameChange(e.target.value)}
            placeholder="e.g., 100k-10m F2P"
            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            Will be saved as:{' '}
            <span className="text-gray-400">
              {profileName || 'Custom Blocklist'} Mreedon.profile.json
            </span>
          </p>
        </div>

        {/* Download button */}
        <button
          onClick={onDownload}
          disabled={loading || stats.tradeableCount === 0}
          className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
        >
          <span>💾</span>
          <span>Download Profile</span>
        </button>
        <p className="text-xs text-gray-500 text-center mt-2">
          Place this file in your RuneLite Flipping Copilot plugin directory
        </p>
      </div>
    </div>
  );
}
