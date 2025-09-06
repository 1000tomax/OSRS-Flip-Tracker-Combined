// src/hooks/useDailySummaries.js - Simple data fetching without React Query
import { useState, useEffect } from 'react';

// (removed) delay helper not used after concurrency pool change

async function fetchDailySummaries() {
  // First, get the index of all available dates
  const indexRes = await fetch('/data/summary-index.json');
  if (!indexRes.ok) {
    throw new Error(`HTTP ${indexRes.status}: Failed to fetch summary index`);
  }
  const indexData = await indexRes.json();

  // ✅ FIXED: Handle both old format (array) and new format (object with days)
  let dates = [];
  if (Array.isArray(indexData)) {
    // Old format: ["07-27-2025", "07-28-2025", ...]
    dates = indexData;
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
    });
  } else {
    throw new Error('Invalid summary index format');
  }

  // Process using a bounded concurrency pool (faster, polite to server)
  const summaries = [];
  const CONCURRENCY = 6;
  let index = 0;

  const worker = async () => {
    while (index < dates.length) {
      const current = dates[index++];
      try {
        const res = await fetch(`/data/daily-summary/${current}.json`);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: Failed to fetch ${current}`);
        }
        const data = await res.json();
        summaries.push({ date: current, ...data });
      } catch (_e) {
        // Skip on error; optionally log if needed
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, dates.length) }, worker));

  // Sort by date ascending
  summaries.sort((a, b) => new Date(a.date) - new Date(b.date));
  return summaries;
}

export default function useDailySummaries() {
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDailySummaries();
      setSummaries(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, []);

  return {
    summaries,
    loading,
    error,
    refetch,
  };
}
