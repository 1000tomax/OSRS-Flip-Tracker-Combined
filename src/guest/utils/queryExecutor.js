// Query executor - executes filter queries on flip data
export function executeQuery(queryConfig, data) {
  // Support both data.flips and data.allFlips for compatibility
  const flipsArray = data?.allFlips || data?.flips;
  
  if (!data || !flipsArray) {
    return [];
  }
  
  let results = [...flipsArray];
  
  // Apply filters
  if (queryConfig.filters && queryConfig.filters.length > 0) {
    queryConfig.filters.forEach(filter => {
      results = applyFilter(results, filter);
    });
  }
  
  // Apply grouping
  if (queryConfig.groupBy) {
    results = groupBy(results, queryConfig.groupBy);
  }
  
  // Apply sorting
  if (queryConfig.sortBy) {
    results.sort((a, b) => {
      const aVal = getFieldValue(a, queryConfig.sortBy);
      const bVal = getFieldValue(b, queryConfig.sortBy);
      
      // Handle null/undefined values
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      
      // Handle different types
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return queryConfig.sortOrder === 'desc' 
          ? bVal.localeCompare(aVal)
          : aVal.localeCompare(bVal);
      }
      
      // Numeric comparison
      return queryConfig.sortOrder === 'desc' 
        ? bVal - aVal 
        : aVal - bVal;
    });
  }
  
  // Apply limit
  if (queryConfig.limit && queryConfig.limit > 0) {
    results = results.slice(0, queryConfig.limit);
  }
  
  return results;
}

function applyFilter(data, filter) {
  return data.filter(item => {
    const value = getFieldValue(item, filter.field);
    
    // Handle null/undefined values
    if (value == null && filter.operator !== '=' && filter.operator !== '!=') {
      return false;
    }
    
    switch(filter.operator) {
      case '>': 
        return value > filter.value;
      case '<': 
        return value < filter.value;
      case '>=':
        return value >= filter.value;
      case '<=':
        return value <= filter.value;
      case '=': 
      case '==':
        // Case-insensitive comparison for strings
        if (typeof value === 'string' && typeof filter.value === 'string') {
          return value.toLowerCase() === filter.value.toLowerCase();
        }
        return value == filter.value;
      case '!=': 
        // Case-insensitive comparison for strings
        if (typeof value === 'string' && typeof filter.value === 'string') {
          return value.toLowerCase() !== filter.value.toLowerCase();
        }
        return value != filter.value;
      case 'contains':
        if (typeof value === 'string' && typeof filter.value === 'string') {
          return value.toLowerCase().includes(filter.value.toLowerCase());
        }
        return false;
      case 'startsWith':
        if (typeof value === 'string' && typeof filter.value === 'string') {
          return value.toLowerCase().startsWith(filter.value.toLowerCase());
        }
        return false;
      case 'endsWith':
        if (typeof value === 'string' && typeof filter.value === 'string') {
          return value.toLowerCase().endsWith(filter.value.toLowerCase());
        }
        return false;
      case 'between':
        return value >= filter.value && value <= filter.value2;
      case 'in':
        if (Array.isArray(filter.value)) {
          return filter.value.includes(value);
        }
        return false;
      default: 
        return true;
    }
  });
}

function getFieldValue(item, field) {
  // Handle computed fields
  switch(field) {
    case 'profitVelocity': {
      // Profit per hour held
      const hoursHeld = item.hoursHeld || 1;
      return (item.profit || 0) / hoursHeld;
    }
    case 'marginPercent': {
      // Profit margin percentage
      const spent = item.spent || item.avgBuyPrice * item.quantity || 1;
      return ((item.profit || 0) / spent) * 100;
    }
    case 'daysSinceFlip': {
      // Days since this flip occurred
      if (!item.date) {
        return null;
      }
      const flipDate = new Date(item.date);
      const now = new Date();
      const days = Math.floor((now - flipDate) / (1000 * 60 * 60 * 24));
      return days;
    }
    case 'weekOfYear': {
      // Week number of the year
      if (!item.date) return null;
      const date = new Date(item.date);
      const startOfYear = new Date(date.getFullYear(), 0, 1);
      const weekNumber = Math.ceil((((date - startOfYear) / 86400000) + startOfYear.getDay() + 1) / 7);
      return weekNumber;
    }
    case 'profitPerItem': {
      // Average profit per item
      const quantity = item.quantity || 1;
      return (item.profit || 0) / quantity;
    }
    case 'totalValue':
      // Total value of the transaction
      return (item.avgSellPrice || 0) * (item.quantity || 0);
      
    default:
      // Direct field access
      return item[field];
  }
}

function groupBy(data, field) {
  const groups = {};
  
  data.forEach(item => {
    const key = getFieldValue(item, field);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
  });
  
  // Convert groups to array with aggregated data
  return Object.entries(groups).map(([key, items]) => ({
    group: key,
    count: items.length,
    totalProfit: items.reduce((sum, item) => sum + (item.profit || 0), 0),
    totalQuantity: items.reduce((sum, item) => sum + (item.quantity || 0), 0),
    avgProfit: items.reduce((sum, item) => sum + (item.profit || 0), 0) / items.length,
    avgROI: items.reduce((sum, item) => sum + (item.roi || 0), 0) / items.length,
    items
  }));
}

// Additional helper to validate query config
export function validateQueryConfig(config) {
  const errors = [];
  
  if (!config) {
    return ['Query configuration is required'];
  }
  
  // Validate filters
  if (config.filters && Array.isArray(config.filters)) {
    config.filters.forEach((filter, index) => {
      if (!filter.field) {
        errors.push(`Filter ${index + 1}: field is required`);
      }
      if (!filter.operator) {
        errors.push(`Filter ${index + 1}: operator is required`);
      }
      if (filter.value === undefined && filter.operator !== 'is_null' && filter.operator !== 'is_not_null') {
        errors.push(`Filter ${index + 1}: value is required`);
      }
      if (filter.operator === 'between' && filter.value2 === undefined) {
        errors.push(`Filter ${index + 1}: value2 is required for 'between' operator`);
      }
    });
  }
  
  // Validate sort
  if (config.sortBy && !['asc', 'desc', undefined].includes(config.sortOrder)) {
    errors.push('sortOrder must be "asc" or "desc"');
  }
  
  // Validate limit
  if (config.limit !== undefined && (typeof config.limit !== 'number' || config.limit < 0)) {
    errors.push('limit must be a positive number');
  }
  
  return errors;
}

// Get available fields - all fields are always available
export function getAvailableFields(_data) {
  return [
    // Core fields
    { name: 'item', type: 'string', label: 'Item Name' },
    { name: 'profit', type: 'number', label: 'Profit' },
    { name: 'roi', type: 'number', label: 'ROI %' },
    { name: 'quantity', type: 'number', label: 'Quantity' },
    { name: 'date', type: 'date', label: 'Date' },
    
    // Price fields
    { name: 'avgBuyPrice', type: 'number', label: 'Avg Buy Price' },
    { name: 'avgSellPrice', type: 'number', label: 'Avg Sell Price' },
    { name: 'spent', type: 'number', label: 'Total Spent' },
    { name: 'revenue', type: 'number', label: 'Total Revenue' },
    
    // Time fields
    { name: 'hoursHeld', type: 'number', label: 'Hours Held' },
    { name: 'daysSinceFlip', type: 'number', label: 'Days Ago', computed: true },
    
    // Computed fields
    { name: 'profitVelocity', type: 'number', label: 'Profit/Hour', computed: true },
    { name: 'marginPercent', type: 'number', label: 'Margin %', computed: true },
    { name: 'profitPerItem', type: 'number', label: 'Profit/Item', computed: true },
    { name: 'totalValue', type: 'number', label: 'Total Value', computed: true },
  ];
}

// Get operators for a field type
export function getOperatorsForField(fieldType) {
  switch(fieldType) {
    case 'number':
      return [
        { value: '>', label: 'Greater than' },
        { value: '<', label: 'Less than' },
        { value: '>=', label: 'Greater or equal' },
        { value: '<=', label: 'Less or equal' },
        { value: '=', label: 'Equals' },
        { value: '!=', label: 'Not equals' },
        { value: 'between', label: 'Between' },
      ];
    case 'string':
      return [
        { value: '=', label: 'Equals' },
        { value: '!=', label: 'Not equals' },
        { value: 'contains', label: 'Contains' },
        { value: 'startsWith', label: 'Starts with' },
        { value: 'endsWith', label: 'Ends with' },
      ];
    case 'date':
      return [
        { value: '>', label: 'After' },
        { value: '<', label: 'Before' },
        { value: '=', label: 'On' },
        { value: 'between', label: 'Between' },
      ];
    default:
      return [
        { value: '=', label: 'Equals' },
        { value: '!=', label: 'Not equals' },
      ];
  }
}
