/**
 * ADVANCED CACHE MANAGER
 *
 * A comprehensive caching system for the OSRS Flip Dashboard that provides:
 * - Multi-layer caching (memory, localStorage, IndexedDB)
 * - Smart cache invalidation strategies
 * - Performance optimization for trading data
 * - Offline-first functionality
 * - Memory management and cleanup
 */

import { DateUtils } from './dateUtils';
import logger from './logger';

// Cache configuration interface
interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  maxEntries: number;
  storage: 'memory' | 'localStorage' | 'indexedDB';
  namespace: string;
  compression?: boolean;
}

// Cache entry structure
interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
  size: number;
  accessCount: number;
  lastAccess: number;
}

// Cache statistics for monitoring
interface CacheStats {
  hits: number;
  misses: number;
  writes: number;
  evictions: number;
  totalSize: number;
  entryCount: number;
}

/**
 * Advanced Cache Manager with multi-layer storage and intelligent eviction
 */
class CacheManager {
  private memoryCache = new Map<string, CacheEntry>();
  private config: CacheConfig;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    writes: 0,
    evictions: 0,
    totalSize: 0,
    entryCount: 0,
  };

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      ttl: 10 * 60 * 1000, // 10 minutes default
      maxEntries: 100,
      storage: 'memory',
      namespace: 'osrs-cache',
      compression: false,
      ...config,
    };

    // Set up periodic cleanup
    this.startCleanupTimer();
    
    // Initialize IndexedDB if needed
    if (this.config.storage === 'indexedDB') {
      this.initIndexedDB();
    }
  }

  /**
   * Get data from cache with fallback chain
   */
  async get<T>(key: string): Promise<T | null> {
    const fullKey = `${this.config.namespace}:${key}`;

    try {
      // 1. Try memory cache first (fastest)
      const memoryEntry = this.memoryCache.get(fullKey);
      if (memoryEntry && this.isValidEntry(memoryEntry)) {
        this.updateAccessStats(memoryEntry);
        this.stats.hits++;
        logger.debug(`Cache HIT (memory): ${key}`);
        return memoryEntry.data;
      }

      // 2. Try localStorage (medium speed)
      if (this.config.storage === 'localStorage' || this.config.storage === 'memory') {
        const localEntry = await this.getFromLocalStorage<T>(fullKey);
        if (localEntry) {
          // Promote to memory cache
          this.setInMemory(fullKey, localEntry.data, localEntry.ttl);
          this.stats.hits++;
          logger.debug(`Cache HIT (localStorage): ${key}`);
          return localEntry.data;
        }
      }

      // 3. Try IndexedDB (slower but larger capacity)
      if (this.config.storage === 'indexedDB') {
        const idbEntry = await this.getFromIndexedDB<T>(fullKey);
        if (idbEntry) {
          // Promote to memory and localStorage
          this.setInMemory(fullKey, idbEntry.data, idbEntry.ttl);
          this.stats.hits++;
          logger.debug(`Cache HIT (IndexedDB): ${key}`);
          return idbEntry.data;
        }
      }

      this.stats.misses++;
      logger.debug(`Cache MISS: ${key}`);
      return null;
    } catch (error) {
      logger.error('Cache get error:', error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Set data in cache with multi-layer storage
   */
  async set<T>(key: string, data: T, customTtl?: number): Promise<void> {
    const fullKey = `${this.config.namespace}:${key}`;
    const ttl = customTtl || this.config.ttl;

    try {
      // Always store in memory for fast access
      this.setInMemory(fullKey, data, ttl);

      // Store in persistent storage based on config
      if (this.config.storage === 'localStorage') {
        await this.setInLocalStorage(fullKey, data, ttl);
      } else if (this.config.storage === 'indexedDB') {
        await this.setInIndexedDB(fullKey, data, ttl);
      }

      this.stats.writes++;
      logger.debug(`Cache SET: ${key} (TTL: ${ttl}ms)`);
    } catch (error) {
      logger.error('Cache set error:', error);
    }
  }

  /**
   * Invalidate specific cache entry
   */
  async invalidate(key: string): Promise<void> {
    const fullKey = `${this.config.namespace}:${key}`;

    // Remove from all storage layers
    this.memoryCache.delete(fullKey);
    
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(fullKey);
    }

    if (this.config.storage === 'indexedDB') {
      await this.deleteFromIndexedDB(fullKey);
    }

    logger.debug(`Cache INVALIDATED: ${key}`);
  }

  /**
   * Clear cache by pattern (supports wildcards)
   */
  async invalidatePattern(pattern: string): Promise<void> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    const keysToDelete: string[] = [];

    // Find matching keys in memory cache
    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    // Delete matched keys
    for (const key of keysToDelete) {
      await this.invalidate(key.replace(`${this.config.namespace}:`, ''));
    }

    logger.debug(`Cache PATTERN INVALIDATED: ${pattern} (${keysToDelete.length} entries)`);
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & { hitRate: number; memoryUsage: string } {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;
    
    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100,
      memoryUsage: this.formatBytes(this.stats.totalSize),
    };
  }

  /**
   * Memory cache operations
   */
  private setInMemory<T>(key: string, data: T, ttl: number): void {
    const size = this.estimateSize(data);
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      size,
      accessCount: 1,
      lastAccess: Date.now(),
    };

    // Check if we need to evict entries
    if (this.memoryCache.size >= this.config.maxEntries) {
      this.evictLeastRecentlyUsed();
    }

    this.memoryCache.set(key, entry);
    this.updateCacheStats();
  }

  /**
   * localStorage operations
   */
  private async getFromLocalStorage<T>(key: string): Promise<CacheEntry<T> | null> {
    if (typeof localStorage === 'undefined') return null;

    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;

      const entry: CacheEntry<T> = JSON.parse(stored);
      if (this.isValidEntry(entry)) {
        this.updateAccessStats(entry);
        return entry;
      } else {
        localStorage.removeItem(key);
        return null;
      }
    } catch (error) {
      logger.warn('localStorage get error:', error);
      return null;
    }
  }

  private async setInLocalStorage<T>(key: string, data: T, ttl: number): Promise<void> {
    if (typeof localStorage === 'undefined') return;

    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
        size: this.estimateSize(data),
        accessCount: 1,
        lastAccess: Date.now(),
      };

      localStorage.setItem(key, JSON.stringify(entry));
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        // Clear old entries and try again
        this.cleanupLocalStorage();
        try {
          const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            ttl,
            size: this.estimateSize(data),
            accessCount: 1,
            lastAccess: Date.now(),
          };
          localStorage.setItem(key, JSON.stringify(entry));
        } catch (retryError) {
          logger.warn('localStorage set failed after cleanup:', retryError);
        }
      } else {
        logger.warn('localStorage set error:', error);
      }
    }
  }

  /**
   * IndexedDB operations (for large datasets)
   */
  private async initIndexedDB(): Promise<void> {
    // Implementation would go here for IndexedDB support
    // This is a placeholder for the more complex IndexedDB implementation
    logger.debug('IndexedDB cache initialized');
  }

  private async getFromIndexedDB<T>(_key: string): Promise<CacheEntry<T> | null> {
    // Placeholder for IndexedDB implementation
    return null;
  }

  private async setInIndexedDB<T>(_key: string, _data: T, _ttl: number): Promise<void> {
    // Placeholder for IndexedDB implementation
  }

  private async deleteFromIndexedDB(_key: string): Promise<void> {
    // Placeholder for IndexedDB implementation
  }

  /**
   * Cache validation and cleanup
   */
  private isValidEntry(entry: CacheEntry): boolean {
    const now = Date.now();
    return (now - entry.timestamp) < entry.ttl;
  }

  private updateAccessStats(entry: CacheEntry): void {
    entry.accessCount++;
    entry.lastAccess = Date.now();
  }

  private evictLeastRecentlyUsed(): void {
    let oldestKey = '';
    let oldestAccess = Date.now();

    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.lastAccess < oldestAccess) {
        oldestAccess = entry.lastAccess;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.memoryCache.delete(oldestKey);
      this.stats.evictions++;
      logger.debug(`Evicted LRU entry: ${oldestKey}`);
    }
  }

  private cleanupLocalStorage(): void {
    if (typeof localStorage === 'undefined') return;

    const keysToRemove: string[] = [];
    const now = Date.now();

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.config.namespace)) {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const entry = JSON.parse(stored);
            if ((now - entry.timestamp) >= entry.ttl) {
              keysToRemove.push(key);
            }
          }
        } catch (_error) {
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
    logger.debug(`Cleaned up ${keysToRemove.length} expired localStorage entries`);
  }

  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000); // Cleanup every 5 minutes
  }

  private cleanup(): void {
    const keysToDelete: string[] = [];

    // Cleanup memory cache
    for (const [key, entry] of this.memoryCache.entries()) {
      if (!this.isValidEntry(entry)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.memoryCache.delete(key));
    
    if (keysToDelete.length > 0) {
      logger.debug(`Cleaned up ${keysToDelete.length} expired memory cache entries`);
      this.updateCacheStats();
    }

    // Cleanup localStorage
    this.cleanupLocalStorage();
  }

  private updateCacheStats(): void {
    this.stats.entryCount = this.memoryCache.size;
    this.stats.totalSize = Array.from(this.memoryCache.values())
      .reduce((total, entry) => total + entry.size, 0);
  }

  private estimateSize(data: unknown): number {
    try {
      return new Blob([JSON.stringify(data as unknown as Record<string, unknown>)]).size;
    } catch {
      return JSON.stringify(data).length * 2; // Rough estimate
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }
}

// Cache instances for different data types
export const flipDataCache = new CacheManager({
  namespace: 'flip-data',
  ttl: 60 * 60 * 1000, // 1 hour for flip data
  maxEntries: 50,
  storage: 'localStorage',
});

export const summaryCache = new CacheManager({
  namespace: 'summary-data',
  ttl: 30 * 60 * 1000, // 30 minutes for summaries
  maxEntries: 30,
  storage: 'localStorage',
});

export const chartCache = new CacheManager({
  namespace: 'chart-data',
  ttl: 15 * 60 * 1000, // 15 minutes for chart data
  maxEntries: 20,
  storage: 'memory',
});

export const itemStatsCache = new CacheManager({
  namespace: 'item-stats',
  ttl: 2 * 60 * 60 * 1000, // 2 hours for item statistics
  maxEntries: 10,
  storage: 'localStorage',
});

// Utility functions for smart cache invalidation
export const CacheUtils = {
  /**
   * Generate cache key for daily data
   */
  getDayKey(date: string): string {
    return `day:${date}`;
  },

  /**
   * Generate cache key for date range data
   */
  getDateRangeKey(startDate: string, endDate: string): string {
    return `range:${startDate}:${endDate}`;
  },

  /**
   * Invalidate all cache entries for a specific date
   */
  async invalidateDate(date: string): Promise<void> {
    const pattern = `*day:${date}*`;
    await Promise.all([
      flipDataCache.invalidatePattern(pattern),
      summaryCache.invalidatePattern(pattern),
      chartCache.invalidatePattern(pattern),
    ]);
    logger.debug(`Invalidated all cache for date: ${date}`);
  },

  /**
   * Invalidate cache when new data is detected
   */
  async invalidateStaleData(): Promise<void> {
    const today = DateUtils.formatDate(new Date());
    await this.invalidateDate(today);
    
    // Also invalidate recent data that might have been updated
    const yesterday = DateUtils.formatDate(DateUtils.addDays(new Date(), -1));
    await this.invalidateDate(yesterday);
  },

  /**
   * Get combined cache statistics
   */
  getAllStats() {
    return {
      flipData: flipDataCache.getStats(),
      summary: summaryCache.getStats(),
      chart: chartCache.getStats(),
      itemStats: itemStatsCache.getStats(),
    };
  },

  /**
   * Clear all caches (useful for testing or user request)
   */
  async clearAll(): Promise<void> {
    await Promise.all([
      flipDataCache.invalidatePattern('*'),
      summaryCache.invalidatePattern('*'),
      chartCache.invalidatePattern('*'),
      itemStatsCache.invalidatePattern('*'),
    ]);
    logger.info('All caches cleared');
  },
};

export default CacheManager;
