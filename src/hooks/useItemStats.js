// src/hooks/useItemStats.js - Fetch item statistics from Supabase
import { useState, useEffect } from 'react';
import { getItemStats } from '../utils/supabaseClient';

export default function useItemStats() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        const stats = await getItemStats();

        if (!cancelled) {
          // Transform to match old CSV format
          const transformed = stats.map(item => ({
            item_name: item.item_name,
            flips: Number(item.total_flips) || 0,
            total_profit: Number(item.total_profit) || 0,
            total_spent: Number(item.total_spent) || 0,
            roi_percent: Number(item.roi_percent) || 0,
            avg_profit_per_flip: Number(item.avg_profit) || 0,
            last_flipped: item.last_flipped,
          }));

          setData(transformed);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, []);

  return { items: data, loading, error };
}
