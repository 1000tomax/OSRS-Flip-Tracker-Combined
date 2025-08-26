import { flipDataCache, summaryCache, itemStatsCache } from '../utils/cacheManager';

/**
 * Helper function to get cached data with a fallback loader
 * Mimics the pattern used in other parts of the codebase
 */
async function getCachedData(cacheInstance, key, loader) {
  // Try to get from cache first
  const cached = await cacheInstance.get(key);
  if (cached !== null) {
    return cached;
  }

  // Load fresh data
  const freshData = await loader();

  // Store in cache for next time
  await cacheInstance.set(key, freshData);

  return freshData;
}

// Export helper functions for each cache type
export const queryCache = {
  async getCachedFlipData(key, loader) {
    return getCachedData(flipDataCache, key, loader);
  },

  async getCachedSummaryData(key, loader) {
    return getCachedData(summaryCache, key, loader);
  },

  async getCachedItemStats(key, loader) {
    return getCachedData(itemStatsCache, key, loader);
  },
};
