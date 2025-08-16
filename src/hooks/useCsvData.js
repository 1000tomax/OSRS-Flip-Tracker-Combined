// src/hooks/useCsvData.js - Simple CSV data fetching without React Query
import { useCsvData as useSimpleCsvData } from './useSimpleData';

// Simple wrapper around useSimpleData for CSV files
export function useCsvData(filePath) {
  return useSimpleCsvData(filePath);
}

export default useCsvData;
