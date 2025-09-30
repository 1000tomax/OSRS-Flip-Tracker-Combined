// src/hooks/useFlipsByDate.js - Fetch flips for a specific date from Supabase
import { useState, useEffect } from 'react';
import { getFlipsByDate } from '../utils/supabaseClient';

export default function useFlipsByDate(date) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!date) {
      setData(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    async function fetchData() {
      try {
        // Convert MM-DD-YYYY to YYYY-MM-DD for Supabase
        const [month, day, year] = date.split('-');
        const isoDate = `${year}-${month}-${day}`;

        const flips = await getFlipsByDate(isoDate);

        if (!cancelled) {
          // Transform to match old CSV format
          const transformed = flips.map(flip => ({
            item_name: flip.item_name,
            account_id: flip.account_id,
            buy_price: Math.floor((flip.spent || 0) / (flip.opened_quantity || 1)),
            sell_price: flip.closed_quantity
              ? Math.floor((flip.received_post_tax || 0) / flip.closed_quantity)
              : null,
            profit: flip.profit,
            roi: flip.spent ? ((flip.profit || 0) / flip.spent) * 100 : 0,
            quantity: flip.opened_quantity,
            buy_time: flip.opened_time,
            sell_time: flip.closed_time,
            flip_duration_minutes:
              flip.opened_time && flip.closed_time
                ? Math.floor((new Date(flip.closed_time) - new Date(flip.opened_time)) / 1000 / 60)
                : null,
            status: flip.status,
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
  }, [date]);

  return { data, loading, error };
}
