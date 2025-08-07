// src/hooks/useJsonData.js - Optimized with React Query
import { useQuery } from '@tanstack/react-query'

async function fetchJsonData(path) {
  const res = await fetch(path)
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: Failed to fetch ${path}`)
  }
  return res.json()
}

export function useJsonData(path) {
  const {
    data,
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['json', path],
    queryFn: () => fetchJsonData(path),
    enabled: !!path, // Only run if path is provided
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  return { 
    data, 
    loading, 
    error: error?.message, 
    refetch 
  }
}