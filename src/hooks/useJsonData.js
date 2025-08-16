// src/hooks/useJsonData.js - Simple data fetching without React Query
import { useSimpleData } from './useSimpleData';

// Simple wrapper around useSimpleData for JSON files
export function useJsonData(path) {
  return useSimpleData(path);
}

export default useJsonData;
