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
      // Transform Supabase data to match expected format
      const transformed = data.map(item => ({
        date: item.date,
        total_profit: Number(item.total_profit) || 0,
        total_flips: Number(item.total_flips) || 0,
        avg_profit: Number(item.avg_profit) || 0,
        avg_roi: Number(item.avg_roi) || 0,
        total_spent: Number(item.total_spent) || 0,
      }));
      setSummaries(transformed);
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
