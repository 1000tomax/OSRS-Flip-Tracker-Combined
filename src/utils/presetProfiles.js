/**
 * Predefined filter configurations for common use cases
 */
export const PRESET_PROFILES = {
  'F2P under 1m': {
    query: 'F2P items under 1 million gp',
    description: 'Free-to-play items only, budget flips',
  },
  'Budget flips': {
    query: 'Items between 100k and 5m',
    description: 'Mid-range items for flipping',
  },
  'High-value items': {
    query: 'Items between 5m and 50m',
    description: 'Expensive items with higher profit margins',
  },
  'Members 1m-10m': {
    query: 'Members-only items between 1m and 10m',
    description: 'Mid to high-value members items',
  },
  'Wide range': {
    query: 'Items between 100k and 20m',
    description: 'Broad selection of tradeable items',
  },
  'Low risk flips': {
    query: 'F2P items between 50k and 500k',
    description: 'Safe, consistent flips for beginners',
  },
};

/**
 * Get preset configuration by name
 * @param {string} presetName - Name of preset
 * @returns {Object} Preset configuration
 */
export function getPreset(presetName) {
  return PRESET_PROFILES[presetName];
}

/**
 * Get all preset names
 * @returns {Array<string>} Array of preset names
 */
export function getAllPresets() {
  return Object.keys(PRESET_PROFILES);
}
