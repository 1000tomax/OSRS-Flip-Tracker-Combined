import { useState } from 'react';

export default function SimpleModeForm({ onGenerate, loading }) {
  const [minPrice, setMinPrice] = useState('100000');
  const [maxPrice, setMaxPrice] = useState('10000000');
  const [f2pOnly, setF2pOnly] = useState(false);

  const handleGenerate = () => {
    // Create a simple filter config manually
    const filterConfig = {
      interpretation: `Include ${f2pOnly ? 'F2P ' : ''}items between ${parseInt(minPrice).toLocaleString()} and ${parseInt(maxPrice).toLocaleString()} gp`,
      rules: [
        {
          type: 'include',
          conditions: [
            {
              field: 'price',
              operator: 'between',
              value: [parseInt(minPrice), parseInt(maxPrice)],
            },
            ...(f2pOnly ? [{ field: 'f2p', operator: 'eq', value: true }] : []),
          ],
          combineWith: 'AND',
        },
      ],
      defaultAction: 'exclude',
    };

    onGenerate(filterConfig);
  };

  const isValid = minPrice && maxPrice && parseInt(minPrice) < parseInt(maxPrice);

  return (
    <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-6 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-yellow-400">⚠️</span>
        <h3 className="text-lg font-semibold text-yellow-400">Simple Mode</h3>
      </div>
      <p className="text-sm text-gray-400 mb-4">
        Claude API is unavailable. Use manual filters below:
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-2">Min Price (gp):</label>
          <input
            type="number"
            value={minPrice}
            onChange={e => setMinPrice(e.target.value)}
            min="1"
            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-2">Max Price (gp):</label>
          <input
            type="number"
            value={maxPrice}
            onChange={e => setMaxPrice(e.target.value)}
            min="1"
            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="f2p-only"
          checked={f2pOnly}
          onChange={e => setF2pOnly(e.target.checked)}
          className="w-4 h-4 bg-gray-900 border-gray-700 rounded focus:ring-2 focus:ring-blue-500"
        />
        <label htmlFor="f2p-only" className="text-sm text-gray-300">
          F2P Only
        </label>
      </div>

      <button
        onClick={handleGenerate}
        disabled={loading || !isValid}
        className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors duration-200"
      >
        {loading ? 'Generating...' : 'Generate Profile'}
      </button>

      {!isValid && (
        <p className="text-xs text-red-400">Please ensure min price is less than max price</p>
      )}
    </div>
  );
}
