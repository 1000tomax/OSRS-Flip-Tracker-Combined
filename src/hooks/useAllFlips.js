// src/hooks/useAllFlips.js - Load all historical flip data efficiently
import { useQuery } from '@tanstack/react-query'
import { useJsonData } from './useJsonData'
import Papa from 'papaparse'


async function fetchAllFlips(dates) {
  if (!dates?.length) return []
  
  const fetchPromises = dates.map(async (date) => {
    const [month, day, year] = date.split('-')
    const filePath = `/data/processed-flips/${year}/${month}/${day}/flips.csv`
    
    try {
      const res = await fetch(filePath)
      if (!res.ok) {
        console.warn(`File not found: ${filePath} (${res.status})`)
        return []
      }
      
      const text = await res.text()
      
      // Check if response is HTML (error page) instead of CSV
      if (text.trim().startsWith('<!')) {
        console.warn(`Received HTML instead of CSV for ${filePath}`)
        return []
      }
      
      // Parse the CSV text directly
      return new Promise((resolve) => {
        Papa.parse(text, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          transformHeader: header => header.trim(),
          complete: (results) => {
            if (results.errors.length > 0) {
              console.warn(`CSV parsing warnings for ${filePath}:`, results.errors)
            }
            resolve(results.data || [])
          },
          error: (error) => {
            console.warn(`CSV parsing failed for ${filePath}:`, error.message)
            resolve([])
          }
        })
      })
    } catch (error) {
      console.warn(`Failed to load data for ${date}:`, error.message)
      return []
    }
  })

  const results = await Promise.all(fetchPromises)
  return results.flat()
}

export function useAllFlips() {
  // First, get the list of available dates
  const { data: summaryIndex, loading: indexLoading, error: indexError } = useJsonData('/data/summary-index.json')
  
  // Then fetch all the flip data
  const {
    data: allFlips = [],
    isLoading: flipsLoading,
    error: flipsError,
    refetch
  } = useQuery({
    queryKey: ['all-flips', summaryIndex],
    queryFn: () => fetchAllFlips(summaryIndex),
    enabled: !!summaryIndex?.length,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })

  return {
    data: allFlips,
    loading: indexLoading || flipsLoading,
    error: indexError || flipsError?.message,
    refetch,
    totalDays: summaryIndex?.length || 0
  }
}