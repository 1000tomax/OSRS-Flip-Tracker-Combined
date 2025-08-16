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
                  let value = values[index] || '';
                  // Convert numeric strings to numbers
                  if (value && !isNaN(value) && value !== '') {
                    value = parseFloat(value);
                  }
                  obj[header] = value;
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
