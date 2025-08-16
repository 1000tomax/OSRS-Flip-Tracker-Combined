/**
 * CACHE WARMING STRATEGIES
 *
 * Intelligent cache warming to preload critical data and improve user experience.
 * Runs in the background to populate caches with frequently accessed data.
 */

import { flipDataCache, summaryCache, itemStatsCache, CacheUtils } from './cacheManager';
import { DateUtils } from './dateUtils';
import logger from './logger';

interface WarmingStrategy {
  priority: 'high' | 'medium' | 'low';
  schedule: 'immediate' | 'idle' | 'background';
  retryAttempts: number;
}

interface WarmingTask {
  url: string;
  cacheKey: string;
  strategy: WarmingStrategy;
  estimatedSize: number;
  dependencies?: string[];
}

/**
 * Cache Warming Manager
 */
class CacheWarmingManager {
  private isWarming = false;
  private warmingQueue: WarmingTask[] = [];
  private completedTasks = new Set<string>();
  private warmingStats = {
    tasksCompleted: 0,
    tasksFailed: 0,
    totalDataWarmed: 0,
    timeSpent: 0,
  };

  constructor() {
    this.setupIdleCallbacks();
    this.setupPeriodicWarming();
  }

  /**
   * Start warming critical application data
   */
  async warmCriticalData(): Promise<void> {
    if (this.isWarming) return;

    logger.info('Starting cache warming for critical data');
    this.isWarming = true;

    const startTime = Date.now();

    try {
      // Prioritize based on user behavior patterns
      await this.warmApplicationEssentials();
      await this.warmRecentTradingData();
      await this.warmStaticAssets();

      const duration = Date.now() - startTime;
      this.warmingStats.timeSpent += duration;
      
      logger.info(`Cache warming completed in ${duration}ms`, this.warmingStats);
    } catch (error) {
      logger.error('Cache warming failed:', error);
    } finally {
      this.isWarming = false;
    }
  }

  /**
   * Warm essential application data (highest priority)
   */
  private async warmApplicationEssentials(): Promise<void> {
    const tasks: WarmingTask[] = [
      {
        url: '/data/summary-index.json',
        cacheKey: 'summary-index',
        strategy: { priority: 'high', schedule: 'immediate', retryAttempts: 3 },
        estimatedSize: 5000, // ~5KB
      },
      {
        url: '/data/item-stats.csv',
        cacheKey: 'item-stats',
        strategy: { priority: 'high', schedule: 'immediate', retryAttempts: 3 },
        estimatedSize: 50000, // ~50KB
      },
    ];

    await this.processTasks(tasks);
  }

  /**
   * Warm recent trading data (medium priority)
   */
  private async warmRecentTradingData(): Promise<void> {
    const today = DateUtils.formatDate(new Date());
    const yesterday = DateUtils.formatDate(DateUtils.addDays(new Date(), -1));
    const dayBeforeYesterday = DateUtils.formatDate(DateUtils.addDays(new Date(), -2));

    const recentDates = [today, yesterday, dayBeforeYesterday];
    const tasks: WarmingTask[] = [];

    for (const date of recentDates) {
      const { month, day, year } = DateUtils.parseDateParts(date);
      const flipDataUrl = `/data/processed-flips/${year}/${month}/${day}/flips.csv`;
      
      tasks.push({
        url: flipDataUrl,
        cacheKey: CacheUtils.getDayKey(date),
        strategy: { 
          priority: date === today ? 'high' : 'medium', 
          schedule: 'idle', 
          retryAttempts: 2 
        },
        estimatedSize: 100000, // ~100KB per day
        dependencies: ['summary-index'], // Ensure index is loaded first
      });
    }

    await this.processTasks(tasks);
  }

  /**
   * Warm static assets and metadata (low priority)
   */
  private async warmStaticAssets(): Promise<void> {
    const tasks: WarmingTask[] = [
      // Additional metadata that might be useful
      {
        url: '/manifest.json',
        cacheKey: 'app-manifest',
        strategy: { priority: 'low', schedule: 'background', retryAttempts: 1 },
        estimatedSize: 2000,
      },
    ];

    await this.processTasks(tasks);
  }

  /**
   * Process a batch of warming tasks
   */
  private async processTasks(tasks: WarmingTask[]): Promise<void> {
    // Sort by priority and dependencies
    const sortedTasks = this.sortTasksByPriority(tasks);

    for (const task of sortedTasks) {
      if (this.completedTasks.has(task.cacheKey)) {
        continue; // Skip already completed tasks
      }

      // Wait for dependencies
      if (task.dependencies) {
        const dependenciesReady = task.dependencies.every(dep => 
          this.completedTasks.has(dep)
        );
        
        if (!dependenciesReady) {
          logger.debug(`Skipping ${task.cacheKey} - dependencies not ready`);
          continue;
        }
      }

      await this.executeWarmingTask(task);
    }
  }

  /**
   * Execute a single warming task
   */
  private async executeWarmingTask(task: WarmingTask): Promise<void> {
    const { url, cacheKey, strategy } = task;
    let attempts = 0;

    while (attempts < strategy.retryAttempts) {
      try {
        // Check if we should respect network conditions
        if (this.shouldRespectNetworkConditions() && strategy.priority === 'low') {
          logger.debug(`Skipping low priority task ${cacheKey} due to network conditions`);
          return;
        }

        logger.debug(`Warming cache for ${cacheKey} (attempt ${attempts + 1})`);

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        let data;
        if (url.endsWith('.json')) {
          data = await response.json();
        } else if (url.endsWith('.csv')) {
          data = await response.text();
        } else {
          data = await response.text();
        }

        // Cache the data using appropriate cache instance
        const cache = this.getCacheForUrl(url);
        await cache.set(cacheKey, data);

        this.completedTasks.add(cacheKey);
        this.warmingStats.tasksCompleted++;
        this.warmingStats.totalDataWarmed += task.estimatedSize;

        logger.debug(`Successfully warmed ${cacheKey}`);
        return;

      } catch (error) {
        attempts++;
        logger.warn(`Failed to warm ${cacheKey} (attempt ${attempts}):`, error);

        if (attempts < strategy.retryAttempts) {
          // Exponential backoff for retries
          const delay = Math.min(1000 * Math.pow(2, attempts), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    this.warmingStats.tasksFailed++;
    logger.error(`Failed to warm ${cacheKey} after ${strategy.retryAttempts} attempts`);
  }

  /**
   * Get appropriate cache instance for URL
   */
  private getCacheForUrl(url: string) {
    if (url.includes('processed-flips') || url.includes('flips.csv')) {
      return flipDataCache;
    }
    if (url.includes('summary-index') || url.includes('daily-summary')) {
      return summaryCache;
    }
    if (url.includes('item-stats')) {
      return itemStatsCache;
    }
    return summaryCache; // Default
  }

  /**
   * Sort tasks by priority and dependencies
   */
  private sortTasksByPriority(tasks: WarmingTask[]): WarmingTask[] {
    const priorityWeight = { high: 3, medium: 2, low: 1 };
    
    return tasks.sort((a, b) => {
      // First sort by priority
      const priorityDiff = priorityWeight[b.strategy.priority] - priorityWeight[a.strategy.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Then by dependencies (tasks with no dependencies first)
      const aDeps = a.dependencies?.length || 0;
      const bDeps = b.dependencies?.length || 0;
      return aDeps - bDeps;
    });
  }

  /**
   * Check if we should respect network conditions (save bandwidth on slow connections)
   */
  private shouldRespectNetworkConditions(): boolean {
    // Check connection type if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        // Skip warming on slow connections
        if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
          return true;
        }
        // Skip warming when data saver is enabled
        if (connection.saveData) {
          return true;
        }
      }
    }

    // Check if device has limited memory
    if ('deviceMemory' in navigator) {
      const deviceMemory = (navigator as any).deviceMemory;
      if (deviceMemory && deviceMemory < 4) { // Less than 4GB RAM
        return true;
      }
    }

    return false;
  }

  /**
   * Set up idle time callbacks for background warming
   */
  private setupIdleCallbacks(): void {
    if ('requestIdleCallback' in window) {
      const scheduleIdleWarming = () => {
        (window as any).requestIdleCallback((deadline: any) => {
          if (deadline.timeRemaining() > 50 && !this.isWarming) {
            // Use idle time for background cache warming
            this.warmCriticalData();
          }
          
          // Schedule next idle check
          setTimeout(scheduleIdleWarming, 30000); // Every 30 seconds
        });
      };

      scheduleIdleWarming();
    }
  }

  /**
   * Set up periodic warming for fresh data
   */
  private setupPeriodicWarming(): void {
    // Warm critical data every 15 minutes
    setInterval(() => {
      if (!this.isWarming) {
        this.warmApplicationEssentials();
      }
    }, 15 * 60 * 1000);

    // Full warming every hour
    setInterval(() => {
      if (!this.isWarming) {
        this.warmCriticalData();
      }
    }, 60 * 60 * 1000);
  }

  /**
   * Smart cache warming based on user navigation patterns
   */
  async warmForRoute(route: string): Promise<void> {
    const routeWarmingMap: Record<string, string[]> = {
      '/': ['summary-index', 'item-stats'],
      '/items': ['item-stats'],
      '/flip-logs': ['summary-index'],
      '/charts': ['summary-index', 'recent-flips'],
      '/performance': ['all-flips-summary'],
      '/volume': ['strategy-battle-data'],
    };

    const urlsToWarm = routeWarmingMap[route] || [];
    
    if (urlsToWarm.length > 0) {
      logger.debug(`Pre-warming cache for route: ${route}`);
      // Implementation would depend on specific URL mapping
    }
  }

  /**
   * Get warming statistics
   */
  getStats() {
    return {
      ...this.warmingStats,
      isActive: this.isWarming,
      queueLength: this.warmingQueue.length,
      completedTasksCount: this.completedTasks.size,
    };
  }

  /**
   * Manual trigger for testing
   */
  async triggerWarming(): Promise<void> {
    await this.warmCriticalData();
  }
}

// Export singleton instance
export const cacheWarmer = new CacheWarmingManager();

// Auto-start warming when module loads
if (typeof window !== 'undefined') {
  // Start warming after a short delay to not block initial app load
  setTimeout(() => {
    cacheWarmer.warmCriticalData();
  }, 2000);
}

export default cacheWarmer;