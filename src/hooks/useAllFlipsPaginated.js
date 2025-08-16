// src/hooks/useAllFlipsPaginated.js - Paginated data loading to prevent memory issues
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useJsonData } from './useJsonData';
import Papa from 'papaparse';
import { DateUtils } from '../utils/dateUtils';
import logger from '../utils/logger';

const FLIPS_PER_PAGE = 50; // Load 50 days worth of data at a time
const MAX_CONCURRENT_REQUESTS = 10; // Limit concurrent requests

async function fetchFlipsBatch(dates, startIndex = 0, limit = FLIPS_PER_PAGE) {
  if (!dates?.length) return { data: [], hasMore: false, nextIndex: 0 };

  const endIndex = Math.min(startIndex + limit, dates.length);
  const batch = dates.slice(startIndex, endIndex);

  // Process in smaller chunks to prevent browser overload
  const chunks = [];
  for (let i = 0; i < batch.length; i += MAX_CONCURRENT_REQUESTS) {
    chunks.push(batch.slice(i, i + MAX_CONCURRENT_REQUESTS));
  }

  const allResults = [];

  for (const chunk of chunks) {
    const fetchPromises = chunk.map(async date => {
      const [month, day, year] = date.split('-');
      const filePath = `/data/processed-flips/${year}/${month}/${day}/flips.csv`;

      try {
        const res = await fetch(filePath);
        if (!res.ok) {
          logger.debug(`File not found: ${filePath} (${res.status})`);
          return [];
        }

        const text = await res.text();

        // Check if response is HTML (error page) instead of CSV
        if (text.trim().startsWith('<!')) {
          logger.debug(`Received HTML instead of CSV for ${filePath}`);
          return [];
        }

        // Parse the CSV text directly
        return new Promise(resolve => {
          Papa.parse(text, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            transformHeader: header => header.trim(),
            complete: results => {
              if (results.errors.length > 0) {
                logger.debug(`CSV parsing warnings for ${filePath}:`, results.errors);
              }
              // Add metadata for tracking
              const dataWithMeta = (results.data || []).map(flip => ({
                ...flip,
                _sourceDate: date,
                _sourceFile: filePath,
              }));
              resolve(dataWithMeta);
            },
            error: error => {
              logger.warn(`CSV parsing failed for ${filePath}:`, error.message);
              resolve([]);
            },
          });
        });
      } catch (error) {
        logger.warn(`Failed to load data for ${date}:`, error.message);
        return [];
      }
    });

    const chunkResults = await Promise.all(fetchPromises);
    allResults.push(...chunkResults);
  }

  const flatData = allResults.flat();
  const hasMore = endIndex < dates.length;

  logger.debug(
    `Loaded batch: ${startIndex}-${endIndex} of ${dates.length} (${flatData.length} flips)`
  );

  return {
    data: flatData,
    hasMore,
    nextIndex: endIndex,
    totalDates: dates.length,
    loadedDates: endIndex,
  };
}

export function useAllFlipsPaginated(options = {}) {
  const {
    initialLimit = FLIPS_PER_PAGE,
    autoLoadMore = false, // Set to true for infinite scroll
  } = options;

  // First, get the list of available dates
  const {
    data: summaryIndex,
    loading: indexLoading,
    error: indexError,
  } = useJsonData('/data/summary-index.json');

  // Extract dates from the summary-index.json format
  const dateStrings = React.useMemo(() => {
    if (!summaryIndex?.days?.length) return [];
    return summaryIndex.days
      .map(day => {
        // Convert from YYYY-MM-DD to MM-DD-YYYY format using centralized utility
        return DateUtils.isoToApi(day.date);
      })
      .filter(Boolean) // Remove any invalid conversions
      .reverse(); // Most recent first
  }, [summaryIndex]);

  // State for pagination
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [allLoadedData, setAllLoadedData] = React.useState([]);

  // Fetch current batch
  const {
    data: batchData,
    isLoading: batchLoading,
    error: batchError,
    refetch,
  } = useQuery({
    queryKey: ['flips-batch', dateStrings, currentIndex, initialLimit],
    queryFn: () => fetchFlipsBatch(dateStrings, currentIndex, initialLimit),
    enabled: !!dateStrings?.length,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Update accumulated data when new batch loads
  React.useEffect(() => {
    if (batchData?.data?.length) {
      setAllLoadedData(prev => {
        // If this is the first batch (currentIndex = 0), replace all data
        if (currentIndex === 0) {
          return batchData.data;
        }
        // Otherwise append to existing data
        return [...prev, ...batchData.data];
      });
    }
  }, [batchData, currentIndex]);

  // Auto-load more data if enabled and we're near the end
  React.useEffect(() => {
    if (autoLoadMore && batchData?.hasMore && !batchLoading) {
      // Auto-load when we have less than 200 flips remaining
      if (allLoadedData.length > 0 && allLoadedData.length < 200) {
        loadMore();
      }
    }
  }, [autoLoadMore, batchData, batchLoading, allLoadedData.length]);

  const loadMore = React.useCallback(() => {
    if (batchData?.hasMore && !batchLoading) {
      setCurrentIndex(batchData.nextIndex);
    }
  }, [batchData, batchLoading]);

  const loadAll = React.useCallback(async () => {
    if (!dateStrings?.length) return;

    logger.info(`Loading all ${dateStrings.length} days of data...`);

    // Load all data in larger batches
    const allData = [];
    let index = 0;

    while (index < dateStrings.length) {
      const batch = await fetchFlipsBatch(dateStrings, index, 100); // Bigger batches
      allData.push(...batch.data);
      index = batch.nextIndex;

      // Update progress
      logger.debug(`Progress: ${index}/${dateStrings.length} days loaded`);
    }

    setAllLoadedData(allData);
    setCurrentIndex(dateStrings.length); // Mark as fully loaded

    logger.info(`Completed loading all data: ${allData.length} flips`);
  }, [dateStrings]);

  const reset = React.useCallback(() => {
    setCurrentIndex(0);
    setAllLoadedData([]);
  }, []);

  return {
    data: allLoadedData,
    loading: indexLoading || (batchLoading && currentIndex === 0), // Only show loading for initial load
    error: indexError || batchError?.message,
    refetch,

    // Pagination controls
    hasMore: batchData?.hasMore || false,
    loadMore,
    loadAll,
    reset,
    isLoadingMore: batchLoading && currentIndex > 0,

    // Stats
    totalDays: dateStrings?.length || 0,
    loadedDays: batchData?.loadedDates || currentIndex,
    loadedFlips: allLoadedData.length,
    progress: dateStrings?.length ? (batchData?.loadedDates || 0) / dateStrings.length : 0,
  };
}
