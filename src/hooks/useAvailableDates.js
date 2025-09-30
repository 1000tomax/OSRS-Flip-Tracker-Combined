// src/hooks/useAvailableDates.js - Get list of dates with flip data from Supabase
import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';

export default function useAvailableDates() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchDates() {
      try {
        // Get unique dates from flips table
        const { data: dates, error: err } = await supabase
          .from('flips')
          .select('opened_time')
          .order('opened_time', { ascending: false });

        if (err) throw err;

        if (!cancelled) {
          // Extract unique dates and format as MM-DD-YYYY
          const uniqueDates = [
            ...new Set(
              dates.map(item => {
                const date = new Date(item.opened_time);
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const year = date.getFullYear();
                return `${month}-${day}-${year}`;
              })
            ),
          ];

          // Return in format matching old summary-index.json
          setData({ days: uniqueDates.map(d => ({ date: d })) });
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      }
    }

    fetchDates();

    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
}
