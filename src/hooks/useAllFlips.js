// src/hooks/useAllFlips.js - Load all historical flip data efficiently
import { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';

async function fetchAllFlips(dates) {
  if (!dates?.length) return [];

  const fetchPromises = dates.map(async date => {
    const [month, day, year] = date.split('-');
    const filePath = `/data/processed-flips/${year}/${month}/${day}/flips.csv`;

    try {
      const res = await fetch(filePath);
      if (!res.ok) {
        console.warn(`File not found: ${filePath} (${res.status})`);
        return [];
      }

      const text = await res.text();

      // Check if response is HTML (error page) instead of CSV
      if (text.trim().startsWith('<!')) {
        console.warn(`Received HTML instead of CSV for ${filePath}`);
        return [];
      }

      // Parse the CSV text directly
      return new Promise(resolve => {
        Papa.parse(text, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          transformHeader: header => header.trim(),
          complete: results => {
            if (results.errors.length > 0) {
              console.warn(`CSV parsing warnings for ${filePath}:`, results.errors);
            }
            resolve(results.data || []);
          },
          error: error => {
            console.warn(`CSV parsing failed for ${filePath}:`, error.message);
            resolve([]);
          },
        });
      });
    } catch (error) {
      console.warn(`Failed to load data for ${date}:`, error.message);
      return [];
    }
  });

  const results = await Promise.all(fetchPromises);
  return results.flat();
}

export function useAllFlips() {
  const [summaryIndex, setSummaryIndex] = useState(null);
  const [indexLoading, setIndexLoading] = useState(true);
  const [indexError, setIndexError] = useState(null);
  const [allFlips, setAllFlips] = useState([]);
  const [flipsLoading, setFlipsLoading] = useState(false);
  const [flipsError, setFlipsError] = useState(null);

  // Load summary index
  useEffect(() => {
    const loadIndex = async () => {
      try {
        setIndexLoading(true);
        const res = await fetch('/data/summary-index.json');
        if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch summary index`);
        const data = await res.json();
        setSummaryIndex(data);
        setIndexError(null);
      } catch (error) {
        setIndexError(error.message);
      } finally {
        setIndexLoading(false);
      }
    };

    loadIndex();
  }, []);

  // Extract dates from the summary-index.json format
  const dateStrings = useMemo(() => {
    if (!summaryIndex?.days?.length) return [];
    return summaryIndex.days
      .map(day => {
        // Convert from YYYY-MM-DD to MM-DD-YYYY format
        const isoDate = day.date; // "2025-07-27"
        if (isoDate && isoDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [year, month, dayNum] = isoDate.split('-');
          return `${month}-${dayNum}-${year}`; // "07-27-2025"
        }
        return day.date; // fallback to original
      })
      .filter(Boolean); // Remove any invalid conversions
  }, [summaryIndex]);

  // Load flip data when dates are available
  useEffect(() => {
    if (!dateStrings?.length) return;

    const loadFlips = async () => {
      try {
        setFlipsLoading(true);
        const data = await fetchAllFlips(dateStrings);
        setAllFlips(data);
        setFlipsError(null);
      } catch (error) {
        setFlipsError(error.message);
      } finally {
        setFlipsLoading(false);
      }
    };

    loadFlips();
  }, [dateStrings]);

  const refetch = async () => {
    if (dateStrings?.length) {
      setFlipsLoading(true);
      try {
        const data = await fetchAllFlips(dateStrings);
        setAllFlips(data);
        setFlipsError(null);
      } catch (error) {
        setFlipsError(error.message);
      } finally {
        setFlipsLoading(false);
      }
    }
  };

  return {
    data: allFlips,
    loading: indexLoading || flipsLoading,
    error: indexError || flipsError,
    refetch,
    totalDays: dateStrings?.length || 0,
  };
}
