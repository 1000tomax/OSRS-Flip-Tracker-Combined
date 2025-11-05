// src/hooks/useFlipsByDate.js - Fetch flips for a specific date from Supabase
import { useState, useEffect } from 'react';
import { getFlipsByDate } from '../utils/supabaseClient';

export default function useFlipsByDate(date) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!!date); // Only set loading true if we have a date
  const [error, setError] = useState(null);

  useEffect(() => {
    // Skip effect entirely if no date
    if (!date) {
      return;
    }

    let cancelled = false;

    async function fetchData() {
      try {
        // Convert MM-DD-YYYY to YYYY-MM-DD for Supabase
        const [month, day, year] = date.split('-');
        const isoDate = `${year}-${month}-${day}`;

        const flips = await getFlipsByDate(isoDate);

        if (!cancelled) {
          // Transform to match expected format (keep original fields + add calculated ones)
          const transformed = flips.map(flip => ({
            // Original Supabase fields (needed by FlipLogs component)
            item_name: flip.item_name,
            account_id: flip.account_id,
            status: flip.status,
            spent: flip.spent,
            received_post_tax: flip.received_post_tax,
            closed_quantity: flip.closed_quantity,
            opened_quantity: flip.opened_quantity,
            opened_time: flip.opened_time,
            closed_time: flip.closed_time,
            profit: flip.profit,
            // Calculated fields for compatibility
            buy_price: Math.floor((flip.spent || 0) / (flip.opened_quantity || 1)),
            sell_price: flip.closed_quantity
              ? Math.floor((flip.received_post_tax || 0) / flip.closed_quantity)
              : null,
            roi: flip.spent ? ((flip.profit || 0) / flip.spent) * 100 : 0,
            quantity: flip.opened_quantity,
            buy_time: flip.opened_time,
            sell_time: flip.closed_time,
            flip_duration_minutes:
              flip.opened_time && flip.closed_time
                ? Math.floor((new Date(flip.closed_time) - new Date(flip.opened_time)) / 1000 / 60)
                : null,
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
