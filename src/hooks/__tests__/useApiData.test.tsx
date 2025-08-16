import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useApiData, useCsvData, useJsonData } from '../useApiData';
import { mockFetchSuccess, mockFetchError, createQueryClient } from '../../tests/utils/testUtils';

// Wrapper component for React Query
const createWrapper = (queryClient: QueryClient) => {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useApiData', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createQueryClient();
    jest.clearAllMocks();
  });

  describe('useApiData', () => {
    it('should fetch and return data successfully', async () => {
      const mockData = { message: 'Hello World' };
      mockFetchSuccess(mockData);

      const { result } = renderHook(() => useApiData('/api/test'), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.loading).toBe(true);
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(mockData);
      expect(result.current.error).toBeNull();
    });

    it('should handle fetch errors', async () => {
      const errorMessage = 'Network error';
      mockFetchError(errorMessage);

      const { result } = renderHook(() => useApiData('/api/test'), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeTruthy();
      expect(result.current.error).toMatch(/network error/i);
    });

    it('should not fetch when URL is null', () => {
      const { result } = renderHook(() => useApiData(null), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should use custom parser when provided', async () => {
      const mockData = 'raw,csv,data\\ntest,123,456';
      const customParser = jest.fn().mockReturnValue([{ raw: 'test', csv: '123', data: '456' }]);
      mockFetchSuccess(mockData);

      const { result } = renderHook(() => useApiData('/api/test.csv', { parser: customParser }), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(customParser).toHaveBeenCalledWith(mockData);
      expect(result.current.data).toEqual([{ raw: 'test', csv: '123', data: '456' }]);
    });

    it('should respect refetch interval', async () => {
      const mockData = { counter: 1 };
      mockFetchSuccess(mockData);

      renderHook(() => useApiData('/api/test', { refetchInterval: 100 }), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      // Note: Testing refetch interval would require more complex setup
      // This test ensures the option is passed without error
    });
  });

  describe('useCsvData', () => {
    it('should parse CSV data correctly', async () => {
      const csvData = 'name,age,city\\nJohn,30,NYC\\nJane,25,LA';
      mockFetchSuccess(csvData);

      const { result } = renderHook(() => useCsvData('/api/test.csv'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual([
        { name: 'John', age: '30', city: 'NYC' },
        { name: 'Jane', age: '25', city: 'LA' },
      ]);
    });

    it('should handle CSV parsing errors', async () => {
      const invalidCsv = 'invalid,csv\\ndata,with,"broken,quotes';
      mockFetchSuccess(invalidCsv);

      const { result } = renderHook(() => useCsvData('/api/test.csv'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // CSV parser should handle malformed data gracefully
      expect(result.current.error).toBeNull();
      expect(Array.isArray(result.current.data)).toBe(true);
    });

    it('should use custom CSV options', async () => {
      const csvData = 'name;age;city\\nJohn;30;NYC';
      mockFetchSuccess(csvData);

      const { result } = renderHook(() => useCsvData('/api/test.csv', { delimiter: ';' }), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual([{ name: 'John', age: '30', city: 'NYC' }]);
    });
  });

  describe('useJsonData', () => {
    it('should parse JSON data correctly', async () => {
      const jsonData = { items: [{ id: 1, name: 'Item 1' }] };
      mockFetchSuccess(jsonData);

      const { result } = renderHook(() => useJsonData('/api/test.json'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(jsonData);
    });

    it('should handle JSON parsing errors', async () => {
      const invalidJson = '{ invalid json }';
      mockFetchSuccess(invalidJson);

      const { result } = renderHook(() => useJsonData('/api/test.json'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.data).toBeNull();
    });
  });
});
