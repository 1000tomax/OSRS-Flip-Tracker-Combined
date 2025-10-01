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
      setSummaries(data || []);
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
