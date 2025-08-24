// Simple data fetching hook to replace React Query
import { useState, useEffect } from 'react';

export function useSimpleData(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!url) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    async function fetchData() {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        let result;
        if (url.endsWith('.csv')) {
          const text = await response.text();
          // Enhanced CSV parsing
          const lines = text.split('\n').filter(line => line.trim());
          if (lines.length === 0) {
            result = [];
          } else {
            const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

            // Normalize number-like strings WITHOUT stripping minus signs.
            // Handles standard minus '-' and Unicode minus '\u2212', and removes commas.
            const toNumber = v => {
              if (typeof v === 'number') return v;
              if (v == null) return 0;
              let s = String(v).trim();

              // Strip leading apostrophe used for CSV formula-injection protection
              if (s.startsWith("'")) s = s.slice(1);

              // Handle parentheses accounting notation, e.g. "(123)" → -123
              const parenMatch = s.match(/^\(([\d,]+(\.\d+)?)\)$/);
              if (parenMatch) s = `-${parenMatch[1]}`;

              // Normalize minus variants and remove formatting
              s = s
                .replace(/[\u2212\u2012\u2013\u2014]/g, '-') // normalize dash variants (minus/figure/en/em dash)
                .replace(/,/g, '') // remove thousands separators
                .replace(/\s+/g, '') // remove whitespace
                .replace(/(?!^)-/g, ''); // collapse any extra '-' beyond the leading one

              const n = Number(s);
              return Number.isFinite(n) ? n : 0;
            };

            // List of numeric columns in /data/item-stats.csv
            // (Expand if you add new numeric fields later)
            const ITEM_STATS_NUMERIC_KEYS = new Set([
              'flips',
              'total_profit',
              'total_spent',
              'roi_percent',
              'avg_profit_per_flip',
              'total_items', // if present now or in future
              'net_items', // if present now or in future
              'bought_qty', // if present now or in future
              'sold_qty', // if present now or in future
            ]);

            result = lines
              .slice(1)
              .map(line => {
                const values = [];
                let current = '';
                let inQuotes = false;

                for (let i = 0; i < line.length; i++) {
                  const char = line[i];
                  if (char === '"') {
                    inQuotes = !inQuotes;
                  } else if (char === ',' && !inQuotes) {
                    values.push(current.trim());
                    current = '';
                  } else {
                    current += char;
                  }
                }
                values.push(current.trim());

                const obj = {};
                headers.forEach((header, index) => {
                  const raw = values[index] || '';
                  // Use toNumber() for numeric columns, preserve raw value otherwise
                  obj[header] = ITEM_STATS_NUMERIC_KEYS.has(header) ? toNumber(raw) : raw;
                });
                return obj;
              })
              .filter(obj => Object.values(obj).some(val => val !== '' && val !== null));
          }
        } else {
          result = await response.json();
        }

        if (!cancelled) {
          setData(result);
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
  }, [url]);

  return { data, loading, error };
}

export function useJsonData(filePath) {
  return useSimpleData(filePath);
}

export function useCsvData(filePath) {
  return useSimpleData(filePath);
}
