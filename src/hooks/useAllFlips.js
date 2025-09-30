// src/hooks/useAllFlips.js - Load all historical flip data from Supabase
import { useState, useEffect } from 'react';
import { getFlips } from '../utils/supabaseClient';

export function useAllFlips() {
  const [allFlips, setAllFlips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadFlips = async () => {
      try {
        setLoading(true);
        // Fetch all flips from Supabase (no date filtering)
        // Using a high limit to get all flips - you may want to paginate this if you have >10k flips
        const data = await getFlips({ limit: 10000 });
        setAllFlips(data);
        setError(null);
      } catch (err) {
        setError(err.message);
        console.error('Failed to load flips:', err);
      } finally {
        setLoading(false);
      }
    };

    loadFlips();
  }, []);

  const refetch = async () => {
    try {
      setLoading(true);
      const data = await getFlips({ limit: 10000 });
      setAllFlips(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Failed to refetch flips:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate totalDays from unique dates in flips
  const totalDays = new Set(allFlips.map(flip => flip.opened_time?.split('T')[0])).size;

  return {
    data: allFlips,
    loading,
    error,
    refetch,
    totalDays,
  };
}
