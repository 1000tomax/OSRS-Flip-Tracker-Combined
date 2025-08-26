import ItemSearchInput from './ItemSearchInput';

export default function QueryFilters({ queryType, formData, onFieldChange }) {
  const renderItemFlipsFilters = () => (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Item Name <span className="text-red-400">*</span>
        </label>
        <ItemSearchInput
          value={formData.itemSearch || ''}
          onChange={value => onFieldChange('itemSearch', value)}
          placeholder="Type to search items... (required)"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Date From <span className="text-gray-500 text-xs">(optional)</span>
          </label>
          <input
            type="date"
            value={formData.dateFrom || ''}
            onChange={e => onFieldChange('dateFrom', e.target.value)}
            className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Date To <span className="text-gray-500 text-xs">(optional)</span>
          </label>
          <input
            type="date"
            value={formData.dateTo || ''}
            onChange={e => onFieldChange('dateTo', e.target.value)}
            className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition"
          />
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-2">
        Leave date fields empty to search all available data
      </p>
    </>
  );

  const renderFlipsByProfitFilters = () => (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Minimum Profit</label>
          <input
            type="text"
            value={formData.minProfit || ''}
            onChange={e => onFieldChange('minProfit', e.target.value)}
            placeholder="e.g. 1m, 500k, 100000"
            className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition"
          />
          <p className="text-xs text-gray-400 mt-1">Use k/m/b for thousands/millions/billions</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Maximum Profit <span className="text-gray-500">(optional)</span>
          </label>
          <input
            type="text"
            value={formData.maxProfit || ''}
            onChange={e => onFieldChange('maxProfit', e.target.value)}
            placeholder="e.g. 10m, 5.5m"
            className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition"
          />
          <p className="text-xs text-gray-400 mt-1">Leave empty for no limit</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Date From <span className="text-gray-500 text-xs">(optional)</span>
          </label>
          <input
            type="date"
            value={formData.dateFrom || ''}
            onChange={e => onFieldChange('dateFrom', e.target.value)}
            className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Date To <span className="text-gray-500 text-xs">(optional)</span>
          </label>
          <input
            type="date"
            value={formData.dateTo || ''}
            onChange={e => onFieldChange('dateTo', e.target.value)}
            className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition"
          />
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-2">
        Leave date fields empty to search all available data
      </p>
    </>
  );

  const renderItemsByROIFilters = () => (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Minimum ROI (%)</label>
          <input
            type="number"
            step="0.1"
            value={formData.minROI || ''}
            onChange={e => onFieldChange('minROI', e.target.value)}
            placeholder="e.g. 5.0"
            className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Minimum Flip Count <span className="text-gray-500">(optional)</span>
          </label>
          <input
            type="number"
            value={formData.minFlipCount || ''}
            onChange={e => onFieldChange('minFlipCount', e.target.value)}
            placeholder="Default: 5"
            className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Date From <span className="text-gray-500">(optional)</span>
          </label>
          <input
            type="date"
            value={formData.dateFrom || ''}
            onChange={e => onFieldChange('dateFrom', e.target.value)}
            className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Date To <span className="text-gray-500">(optional)</span>
          </label>
          <input
            type="date"
            value={formData.dateTo || ''}
            onChange={e => onFieldChange('dateTo', e.target.value)}
            className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition"
          />
        </div>
      </div>
    </>
  );

  const renderFilters = () => {
    switch (queryType) {
      case 'ITEM_FLIPS':
        return renderItemFlipsFilters();
      case 'FLIPS_BY_PROFIT':
        return renderFlipsByProfitFilters();
      case 'ITEMS_BY_ROI':
        return renderItemsByROIFilters();
      default:
        return null;
    }
  };

  return <div className="space-y-4">{renderFilters()}</div>;
}
