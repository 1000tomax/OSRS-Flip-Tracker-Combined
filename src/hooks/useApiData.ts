// src/hooks/useApiData.ts - Enhanced unified data fetching hook with advanced caching
import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import Papa from 'papaparse';
import logger from '@/utils/logger';
import type { DataHookResult } from '@/types';
import { flipDataCache, summaryCache, itemStatsCache, CacheUtils } from '../utils/cacheManager';

/**
 * Configuration options for data fetching
 */
interface ApiDataOptions {
  parser?: 'json' | 'csv' | 'text';
  transform?: (data: any) => any;
  csvOptions?: Papa.ParseConfig;
  enabled?: boolean;
  staleTime?: number;
  cacheTime?: number;
  retry?: boolean | number;
  refetchOnWindowFocus?: boolean;
  cacheStrategy?: 'aggressive' | 'moderate' | 'minimal' | 'none';
  customCacheTtl?: number;
}

/**
 * Get appropriate cache instance based on URL pattern
 */
function getCacheInstance(url: string) {
  if (url.includes('processed-flips') || url.includes('flips.csv')) {
    return flipDataCache;
  }
  if (url.includes('summary-index') || url.includes('daily-summary')) {
    return summaryCache;
  }
  if (url.includes('item-stats')) {
    return itemStatsCache;
  }
  return summaryCache; // Default fallback
}

/**
 * Enhanced data fetching function with multi-layer caching
 */
async function fetchApiData(url: string, options: ApiDataOptions = {}): Promise<any> {
  const { 
    parser = 'json', 
    transform, 
    csvOptions = {},
    cacheStrategy = 'moderate',
    customCacheTtl
  } = options;

  // Generate cache key based on URL and options
  const cacheKey = CacheUtils.getDayKey(url) + (transform ? ':transformed' : '');
  
  // Try cache first (unless strategy is 'none')
  if (cacheStrategy !== 'none') {
    const cache = getCacheInstance(url);
    const cachedData = await cache.get(cacheKey);
    
    if (cachedData) {
      logger.debug(`Cache HIT for ${url}`);
      return cachedData;
    }
  }

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to fetch ${url}`);
    }

    let data: any;

    switch (parser) {
      case 'csv': {
        const text = await response.text();

        // Check if response is HTML (error page) instead of CSV
        if (text.trim().startsWith('<!')) {
          logger.warn(`Received HTML instead of CSV for ${url}`);
          return [];
        }

        return new Promise((resolve, reject) => {
          Papa.parse(text, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            transformHeader: header => header.trim(),
            ...csvOptions,
            complete: results => {
              if (results.errors.length > 0) {
                logger.warn(`CSV parsing warnings for ${url}:`, results.errors);
              }

              const processedData = transform ? transform(results.data) : results.data;
              resolve(processedData || []);
            },
            error: error => {
              logger.error(`CSV parsing failed for ${url}:`, error.message);
              reject(new Error(`CSV parsing failed: ${error.message}`));
            },
          });
        });
      }

      case 'text': {
        data = await response.text();
        break;
      }

      case 'json':
      default: {
        data = await response.json();
        break;
      }
    }

    const finalData = transform ? transform(data) : data;
    
    // Cache the result based on strategy
    if (cacheStrategy !== 'none') {
      const cache = getCacheInstance(url);
      
      // Determine TTL based on strategy and content
      let ttl = customCacheTtl;
      if (!ttl) {
        switch (cacheStrategy) {
          case 'aggressive':
            ttl = url.includes('item-stats') ? 4 * 60 * 60 * 1000 : 2 * 60 * 60 * 1000; // 4h for stats, 2h for others
            break;
          case 'moderate':
            ttl = url.includes('summary-index') ? 30 * 60 * 1000 : 60 * 60 * 1000; // 30m for index, 1h for others
            break;
          case 'minimal':
            ttl = 10 * 60 * 1000; // 10 minutes
            break;
        }
      }
      
      if (ttl) {
        await cache.set(cacheKey, finalData, ttl);
        logger.debug(`Cached data for ${url} (TTL: ${ttl}ms)`);
      }
    }
    
    return finalData;
  } catch (error) {
    logger.error(`Failed to fetch data from ${url}:`, error);
    throw error;
  }
}

/**
 * Unified data fetching hook that replaces useCsvData and useJsonData
 */
export function useApiData<T = any>(url: string, options: ApiDataOptions = {}): DataHookResult<T> {
  const {
    parser = 'json',
    enabled = true,
    staleTime = 5 * 60 * 1000, // 5 minutes default
    cacheTime = 10 * 60 * 1000, // 10 minutes default
    retry = 3,
    refetchOnWindowFocus = false,
    ...fetchOptions
  } = options;

  const {
    data = parser === 'csv' ? [] : null,
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['api-data', url, parser, fetchOptions],
    queryFn: () => fetchApiData(url, { parser, ...fetchOptions }),
    enabled: !!url && enabled,
    staleTime,
    gcTime: cacheTime, // Updated from cacheTime for React Query v5
    retry,
    refetchOnWindowFocus,
  } as UseQueryOptions);

  return {
    data: data as T,
    loading,
    error: error?.message || null,
    refetch,
  };
}

/**
 * Specialized hook for CSV data
 */
export function useCsvData<T = any[]>(
  filePath: string,
  options: Omit<ApiDataOptions, 'parser'> = {}
): DataHookResult<T> {
  return useApiData<T>(filePath, { ...options, parser: 'csv' });
}

/**
 * Specialized hook for JSON data
 */
export function useJsonData<T = any>(
  filePath: string,
  options: Omit<ApiDataOptions, 'parser'> = {}
): DataHookResult<T> {
  return useApiData<T>(filePath, { ...options, parser: 'json' });
}

/**
 * Specialized hook for text data
 */
export function useTextData(
  filePath: string,
  options: Omit<ApiDataOptions, 'parser'> = {}
): DataHookResult<string> {
  return useApiData<string>(filePath, { ...options, parser: 'text' });
}

/**
 * Batch data fetching hook for multiple URLs
 */
export function useBatchApiData<T = any>(
  urls: string[],
  options: ApiDataOptions = {}
): {
  data: (T | null)[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  progress: number;
} {
  const queries = urls.map(url => useApiData<T>(url, options));

  const data = queries.map(query => query.data);
  const loading = queries.some(query => query.loading);
  const errors = queries.map(query => query.error).filter(Boolean);
  const error = errors.length > 0 ? errors[0] : null;

  const completedQueries = queries.filter(query => !query.loading).length;
  const progress = urls.length > 0 ? completedQueries / urls.length : 0;

  const refetch = () => {
    queries.forEach(query => query.refetch());
  };

  return {
    data,
    loading,
    error,
    refetch,
    progress,
  };
}

/**
 * Hook for fetching data with automatic retries and exponential backoff
 */
export function useRobustApiData<T = any>(
  url: string,
  options: ApiDataOptions & {
    maxRetries?: number;
    retryDelay?: number;
    exponentialBackoff?: boolean;
  } = {}
): DataHookResult<T> & {
  retryCount: number;
  isRetrying: boolean;
} {
  const { maxRetries = 3, retryDelay = 1000, exponentialBackoff = true, ...apiOptions } = options;

  const result = useApiData<T>(url, {
    ...apiOptions,
    retry: (failureCount, error) => {
      if (failureCount >= maxRetries) return false;

      const delay = exponentialBackoff ? retryDelay * Math.pow(2, failureCount) : retryDelay;

      logger.debug(`Retrying ${url} in ${delay}ms (attempt ${failureCount + 1}/${maxRetries})`);

      return new Promise(resolve => {
        setTimeout(() => resolve(true), delay);
      });
    },
  });

  // Note: React Query v5 doesn't expose retry count directly
  // This would need to be tracked separately if needed
  return {
    ...result,
    retryCount: 0, // Would need custom implementation
    isRetrying: false, // Would need custom implementation
  };
}

/**
 * Hook for infinite/paginated data fetching
 */
export function useInfiniteApiData<T = any>(
  baseUrl: string,
  options: ApiDataOptions & {
    pageParam?: string;
    getNextPageParam?: (lastPage: any, allPages: any[]) => any;
  } = {}
) {
  // This would use useInfiniteQuery from React Query
  // Implementation would depend on the specific pagination strategy
  // For now, returning a placeholder
  return useApiData<T[]>(baseUrl, options);
}

// Export the original hooks for backward compatibility
export { useCsvData as useCsvDataLegacy, useJsonData as useJsonDataLegacy };

export default useApiData;
