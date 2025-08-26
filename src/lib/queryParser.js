import { parseShorthandNumber } from '../utils/parseShorthandNumber';

export const parseQueryInputs = (queryType, formData) => {
  const baseQuery = {
    type: queryType,
    timestamp: Date.now(),
  };

  switch (queryType) {
    case 'ITEM_FLIPS':
      return {
        ...baseQuery,
        itemName: formData.itemSearch?.trim() || null,
        dateFrom: formData.dateFrom || null,
        dateTo: formData.dateTo || null,
        sortBy: formData.sortBy || 'closed_time',
        sortDirection: formData.sortDirection || 'desc',
      };

    case 'FLIPS_BY_PROFIT':
      return {
        ...baseQuery,
        minProfit: parseShorthandNumber(formData.minProfit) || 0,
        maxProfit: parseShorthandNumber(formData.maxProfit),
        dateFrom: formData.dateFrom || null,
        dateTo: formData.dateTo || null,
        sortBy: formData.sortBy || 'profit',
        sortDirection: formData.sortDirection || 'desc',
      };

    case 'ITEMS_BY_ROI':
      return {
        ...baseQuery,
        minROI: parseFloat(formData.minROI) || 0,
        minFlipCount: parseInt(formData.minFlipCount) || 5,
        dateFrom: formData.dateFrom || null,
        dateTo: formData.dateTo || null,
        sortBy: formData.sortBy || 'roi_percent',
        sortDirection: formData.sortDirection || 'desc',
      };

    default:
      throw new Error(`Unknown query type: ${queryType}`);
  }
};
