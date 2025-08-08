// src/hooks/useDailySummariesCompact.js - Fast loading with compact summary
import { useQuery } from '@tanstack/react-query';

async function fetchCompactSummaries() {
  try {
    const response = await fetch('/data/summaries-compact.json');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch compact summaries:', error);
    throw error;
  }
}

export function useDailySummariesCompact() {
  const query = useQuery({
    queryKey: ['dailySummariesCompact'],
    queryFn: fetchCompactSummaries,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error?.message || null
  };
}