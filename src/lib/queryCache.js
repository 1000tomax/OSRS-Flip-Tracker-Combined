import { flipDataCache, summaryCache, itemStatsCache } from '../utils/cacheManager';

/**
 * Helper function to get cached data with a fallback loader
 * Mimics the pattern used in other parts of the codebase
 */
async function getCachedData(cacheInstance, key, loader) {
  // Try to get from cache first
  const cached = await cacheInstance.get(key);
  if (cached !== null) {
    // Don't return empty cached arrays
    if (Array.isArray(cached) && cached.length === 0) {
      // Debug: Skipping empty cached array for key: ${key}
      await cacheInstance.invalidate(key);
    } else {
      return cached;
    }
  }

  // Load fresh data
  const freshData = await loader();

  // Only cache non-empty data
  if (freshData !== null && freshData !== undefined) {
    if (!Array.isArray(freshData) || freshData.length > 0) {
      await cacheInstance.set(key, freshData);
    }
  }

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

  async clearSummaryCache() {
    await summaryCache.invalidate('summary-index');
  },

  async clearAllCaches() {
    await summaryCache.invalidatePattern('*');
    await flipDataCache.invalidatePattern('*');
    await itemStatsCache.invalidatePattern('*');
  },
};
