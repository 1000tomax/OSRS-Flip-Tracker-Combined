// src/hooks/useDailySummaries.js - Fetch daily summaries from Supabase
import { useState, useEffect } from 'react';
import { getDailySummaries } from '../utils/supabaseClient';

export default function useDailySummaries() {
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDailySummaries();
      // Data already comes in the correct format from the RPC function
      // Ensure we always set an array, never undefined/null
      if (Array.isArray(data)) {
        setSummaries(data);
      } else {
        console.error('getDailySummaries returned non-array:', data);
        setSummaries([]);
        setError('Invalid data format received from server');
      }
    } catch (err) {
      console.error('getDailySummaries error:', err);
      setError(err.message);
      setSummaries([]); // Ensure summaries is always an array even on error
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
