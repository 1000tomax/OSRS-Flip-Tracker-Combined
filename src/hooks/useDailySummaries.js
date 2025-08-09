// src/hooks/useDailySummaries.js - Fixed to handle new data format
import { useQuery } from '@tanstack/react-query'

// Helper function to add delay between batches
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

async function fetchDailySummaries() {
  // First, get the index of all available dates
  const indexRes = await fetch("/data/summary-index.json")
  if (!indexRes.ok) {
    throw new Error(`HTTP ${indexRes.status}: Failed to fetch summary index`)
  }
  const indexData = await indexRes.json()

  // ✅ FIXED: Handle both old format (array) and new format (object with days)
  let dates = []
  if (Array.isArray(indexData)) {
    // Old format: ["07-27-2025", "07-28-2025", ...]
    dates = indexData
  } else if (indexData.days && Array.isArray(indexData.days)) {
    // New format: { days: [{ date: "2025-07-27", ... }, ...] }
    // Convert ISO format back to MM-DD-YYYY for file names
    dates = indexData.days.map(d => {
      const isoDate = d.date; // "2025-07-27"
      if (isoDate && isoDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = isoDate.split('-');
        return `${month}-${day}-${year}`; // "07-27-2025"
      }
      return d.date; // fallback to original
    })
  } else {
    throw new Error("Invalid summary index format")
  }

  // Process in smaller batches to avoid overwhelming the server
  const summaries = []
  const BATCH_SIZE = 3 // Smaller batches for better performance

  for (let i = 0; i < dates.length; i += BATCH_SIZE) {
    const batch = dates.slice(i, i + BATCH_SIZE)

    const batchPromises = batch.map(async (date) => {
      const res = await fetch(`/data/daily-summary/${date}.json`)
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to fetch ${date}`)
      }
      const data = await res.json()
      return { date, ...data }
    })

    const batchResults = await Promise.all(batchPromises)
    summaries.push(...batchResults)

    // Small delay between batches (except for the last batch)
    if (i + BATCH_SIZE < dates.length) {
      await delay(150) // Slightly longer delay for better server performance
    }
  }

  // Sort by date ascending
  summaries.sort((a, b) => new Date(a.date) - new Date(b.date))
  return summaries
}

export default function useDailySummaries() {
  const {
    data: summaries = [],
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['dailySummaries'],
    queryFn: fetchDailySummaries,
    staleTime: 10 * 60 * 1000, // 10 minutes - summaries don't change often
  })

  return {
    summaries,
    loading,
    error: error?.message,
    refetch
  }
}