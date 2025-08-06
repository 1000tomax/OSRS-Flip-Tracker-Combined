// src/hooks/useCsvData.js
import { useEffect, useState } from 'react';
import Papa from 'papaparse';

export function useCsvData(filePath) {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch(filePath)
      .then(res => res.text())
      .then(text => {
        Papa.parse(text, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          transformHeader: header => header.trim(), // ✅ Trim column names
          complete: (results) => {
            setData(results.data);
          },
        });
      });
  }, [filePath]);

  return data;
}
