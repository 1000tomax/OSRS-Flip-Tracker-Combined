/**
 * Parse shorthand number notation (e.g., 1m, 1.5k, 100k) to actual numbers
 * @param {string|number} value - The value to parse (e.g., "1.5m", "500k", "1000", 1000)
 * @returns {number|null} - The parsed number or null if invalid
 */
export function parseShorthandNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  // If already a number, return it
  if (typeof value === 'number') {
    return value;
  }

  // Convert to string and trim
  const str = String(value).trim().toLowerCase();

  // If empty string after trim, return null
  if (!str) {
    return null;
  }

  // Regular expression to match number with optional decimal and suffix
  const match = str.match(/^(-?\d+(?:\.\d+)?)\s*([kmb])?$/i);

  if (!match) {
    // Try parsing as regular number if no suffix
    const parsed = parseFloat(str);
    return isNaN(parsed) ? null : parsed;
  }

  const [, numberPart, suffix] = match;
  const baseNumber = parseFloat(numberPart);

  if (isNaN(baseNumber)) {
    return null;
  }

  // Apply multiplier based on suffix
  switch (suffix?.toLowerCase()) {
    case 'k':
      return baseNumber * 1000;
    case 'm':
      return baseNumber * 1000000;
    case 'b':
      return baseNumber * 1000000000;
    default:
      return baseNumber;
  }
}

/**
 * Format a number back to shorthand notation for display
 * @param {number} value - The number to format
 * @param {number} decimals - Number of decimal places (default 1)
 * @returns {string} - Formatted string (e.g., "1.5m", "500k")
 */
export function formatToShorthand(value, decimals = 1) {
  if (value === null || value === undefined) {
    return '';
  }

  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue >= 1000000000) {
    return `${sign + (absValue / 1000000000).toFixed(decimals).replace(/\.0+$/, '')}b`;
  } else if (absValue >= 1000000) {
    return `${sign + (absValue / 1000000).toFixed(decimals).replace(/\.0+$/, '')}m`;
  } else if (absValue >= 1000) {
    return `${sign + (absValue / 1000).toFixed(decimals).replace(/\.0+$/, '')}k`;
  } else {
    return sign + absValue.toString();
  }
}
