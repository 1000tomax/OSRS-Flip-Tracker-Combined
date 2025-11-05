/**
 * Evaluate filter rules against items to determine tradeable/blocked lists
 * @param {Object} filterConfig - Filter configuration from Claude
 * @param {Array} itemsData - Full item mapping from OSRS Wiki
 * @param {Object} priceData - Latest price data (already extracted .data from API)
 * @param {Object} volumeData - Optional 5m volume data (already extracted .data)
 * @returns {Object} { tradeable: Array, blocked: Array, stats: Object, interpretation: string }
 */
export function evaluateFilterRules(filterConfig, itemsData, priceData, volumeData = null) {
  const { rules, defaultAction, interpretation } = filterConfig;

  // Filter items to determine which are tradeable
  const tradeable = itemsData.filter(item => {
    // Get item data
    const itemPriceData = priceData[String(item.id)];
    if (!itemPriceData) return false; // Skip items without price data

    const price = itemPriceData.high;
    if (price === null || price === undefined || price <= 0) {
      return false; // Skip items without valid price
    }

    // Calculate volume if available
    let volume = 0;
    if (volumeData) {
      const itemVolume = volumeData[String(item.id)];
      if (itemVolume) {
        volume = (itemVolume.highPriceVolume || 0) + (itemVolume.lowPriceVolume || 0);
      }
    }

    // Evaluate each rule
    for (const rule of rules) {
      const conditionsMet = evaluateConditions(rule.conditions, item, price, volume);

      // If conditions met, apply rule type
      if (conditionsMet) {
        return rule.type === 'include';
      }
    }

    // No rules matched, use default action
    return defaultAction === 'include';
  });

  // Create blocklist of everything NOT tradeable
  const blocked = itemsData
    .filter(item => !tradeable.find(t => t.id === item.id))
    .map(item => item.id);

  // Calculate statistics
  const stats = {
    tradeableCount: tradeable.length,
    blockedCount: blocked.length,
    totalItems: itemsData.length,
    itemsWithoutPriceData: itemsData.filter(i => !priceData[String(i.id)]?.high).length,
  };

  return { tradeable, blocked, stats, interpretation };
}

/**
 * Evaluate a set of conditions for an item
 * @param {Array} conditions - Array of condition objects
 * @param {Object} item - Item from mapping
 * @param {number} price - Item price
 * @param {number} volume - Item volume
 * @returns {boolean} True if all conditions met (AND logic within rule)
 */
function evaluateConditions(conditions, item, price, volume) {
  return conditions.every(condition => {
    const { field, operator, value } = condition;

    // Get field value
    let fieldValue;
    switch (field) {
      case 'price':
        fieldValue = price;
        break;
      case 'volume':
        fieldValue = volume;
        break;
      case 'f2p':
        fieldValue = !item.members; // F2P = not members
        break;
      case 'members':
        fieldValue = item.members;
        break;
      default:
        return false;
    }

    // Evaluate operator
    switch (operator) {
      case 'gt':
        return fieldValue > value;
      case 'lt':
        return fieldValue < value;
      case 'gte':
        return fieldValue >= value;
      case 'lte':
        return fieldValue <= value;
      case 'eq':
        return fieldValue === value;
      case 'between':
        return fieldValue >= value[0] && fieldValue <= value[1];
      default:
        return false;
    }
  });
}

/**
 * Generate a smart profile name from the filter configuration
 * @param {Object} filterConfig - Filter configuration
 * @returns {string} Suggested profile name
 */
export function generateProfileNameFromRules(filterConfig) {
  const { interpretation } = filterConfig;

  // Try to extract key terms from interpretation
  const terms = [];

  // Look for price ranges
  const priceMatch = interpretation.match(/(\d+k|\d+m)/gi);
  if (priceMatch && priceMatch.length >= 2) {
    terms.push(`${priceMatch[0]}-${priceMatch[1]}`);
  } else if (priceMatch) {
    terms.push(priceMatch[0]);
  }

  // Look for F2P/Members
  if (/\bf2p\b/i.test(interpretation)) {
    terms.push('F2P');
  } else if (/\bmembers?\b/i.test(interpretation)) {
    terms.push('Members');
  }

  // Look for volume mentions
  if (/volume/i.test(interpretation)) {
    terms.push('High Vol');
  }

  // If we have terms, combine them
  if (terms.length > 0) {
    return terms.join(' ');
  }

  // Fallback: use first 8 words of interpretation, truncate to 30 chars if needed
  // This ensures profile names are descriptive but not overly long
  const words = interpretation.split(' ').slice(0, 8).join(' ');
  return words.length > 30 ? `${words.substring(0, 27)}...` : words;
}
