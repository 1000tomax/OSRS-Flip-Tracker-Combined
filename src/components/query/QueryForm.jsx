import { useState } from 'react';
import QueryTypeSelector from './QueryTypeSelector';
import QueryFilters from './QueryFilters';
import { parseShorthandNumber } from '../../utils/parseShorthandNumber';

export default function QueryForm({
  queryType,
  onQueryTypeChange,
  formData,
  onFormDataChange,
  onExecuteQuery,
  onClearQuery,
  loading,
}) {
  const [validationError, setValidationError] = useState('');

  const handleFieldChange = (field, value) => {
    // Clear validation error when user makes changes
    setValidationError('');
    onFormDataChange({
      ...formData,
      [field]: value,
    });
  };

  const validateForm = () => {
    // Item name validation for ITEM_FLIPS
    if (queryType === 'ITEM_FLIPS') {
      if (!formData.itemSearch || formData.itemSearch.trim() === '') {
        setValidationError('Please select an item to search for');
        return false;
      }
    }

    // Date range validation for relevant query types
    if (
      queryType === 'ITEM_FLIPS' ||
      queryType === 'FLIPS_BY_PROFIT' ||
      queryType === 'ITEMS_BY_ROI'
    ) {
      if (formData.dateFrom && formData.dateTo) {
        const fromDate = new Date(formData.dateFrom);
        const toDate = new Date(formData.dateTo);
        if (fromDate > toDate) {
          setValidationError('End date must be after or equal to start date');
          return false;
        }
      }
    }

    // Profit range validation
    if (queryType === 'FLIPS_BY_PROFIT') {
      if (formData.minProfit && formData.maxProfit) {
        const minProfit = parseShorthandNumber(formData.minProfit);
        const maxProfit = parseShorthandNumber(formData.maxProfit);
        if (minProfit === null) {
          setValidationError(
            'Invalid minimum profit format. Use numbers or shorthand (e.g., 1m, 500k)'
          );
          return false;
        }
        if (maxProfit === null) {
          setValidationError(
            'Invalid maximum profit format. Use numbers or shorthand (e.g., 10m, 5.5m)'
          );
          return false;
        }
        if (minProfit > maxProfit) {
          setValidationError('Maximum profit must be greater than minimum profit');
          return false;
        }
      } else if (formData.minProfit) {
        const minProfit = parseShorthandNumber(formData.minProfit);
        if (minProfit === null) {
          setValidationError(
            'Invalid minimum profit format. Use numbers or shorthand (e.g., 1m, 500k)'
          );
          return false;
        }
      } else if (formData.maxProfit) {
        const maxProfit = parseShorthandNumber(formData.maxProfit);
        if (maxProfit === null) {
          setValidationError(
            'Invalid maximum profit format. Use numbers or shorthand (e.g., 10m, 5.5m)'
          );
          return false;
        }
      }
    }

    return true;
  };

  const handleSubmit = e => {
    e.preventDefault();
    if (validateForm()) {
      onExecuteQuery();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <QueryTypeSelector value={queryType} onChange={onQueryTypeChange} />

      <div className="bg-gray-800 rounded-lg p-6">
        <QueryFilters queryType={queryType} formData={formData} onFieldChange={handleFieldChange} />

        {validationError && (
          <div className="mt-4 p-3 bg-red-900/20 border border-red-500 rounded-lg text-red-400 text-sm">
            {validationError}
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button
            type="submit"
            disabled={loading}
            className="bg-yellow-500 hover:bg-yellow-400 disabled:bg-yellow-600 disabled:cursor-not-allowed text-black font-semibold py-2 px-6 rounded-lg transition"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>

          <button
            type="button"
            onClick={onClearQuery}
            disabled={loading}
            className="bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium py-2 px-6 rounded-lg transition"
          >
            Clear
          </button>
        </div>
      </div>
    </form>
  );
}
