// src/hooks/useCsvData.js - Optimized with React Query
import { useQuery } from '@tanstack/react-query'
import Papa from 'papaparse'

async function fetchCsvData(filePath) {
  const res = await fetch(filePath)
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: Failed to fetch ${filePath}`)
  }
  const text = await res.text()
  
  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      transformHeader: header => header.trim(),
      complete: (results) => {
        if (results.errors.length > 0) {
          console.warn('CSV parsing warnings:', results.errors)
        }
        resolve(results.data)
      },
      error: (error) => {
        reject(new Error(`CSV parsing failed: ${error.message}`))
      }
    })
  })
}

export function useCsvData(filePath) {
  const {
    data = [],
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['csv', filePath],
    queryFn: () => fetchCsvData(filePath),
    enabled: !!filePath, // Only run if filePath is provided
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  return { 
    data, 
    loading, 
    error: error?.message, 
    refetch 
  }
}