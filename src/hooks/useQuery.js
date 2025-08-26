import { useState, useEffect, useCallback } from 'react';
import { parseQueryInputs } from '../lib/queryParser';
import { queryExecutor } from '../lib/queryExecutor';

export const useQuery = (searchParams, setSearchParams) => {
  const [queryType, setQueryType] = useState('ITEM_FLIPS');
  const [formData, setFormData] = useState({});
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Sync with URL on mount
  useEffect(() => {
    const urlQueryType = searchParams.get('type');
    if (urlQueryType) {
      setQueryType(urlQueryType);
    }

    // Parse URL params into form data
    const urlFormData = {};
    searchParams.forEach((value, key) => {
      if (key !== 'type') {
        urlFormData[key] = value;
      }
    });

    if (Object.keys(urlFormData).length > 0) {
      setFormData(urlFormData);
      // Auto-execute if we have URL params
      executeQueryFromParams(urlQueryType || 'ITEM_FLIPS', urlFormData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update URL when query changes
  const updateURL = useCallback(
    (type, data) => {
      const params = new URLSearchParams();
      params.set('type', type);

      Object.entries(data).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          params.set(key, value);
        }
      });

      setSearchParams(params);
    },
    [setSearchParams]
  );

  const executeQueryFromParams = async (type, data) => {
    setLoading(true);
    setError(null);

    try {
      const queryObj = parseQueryInputs(type, data);
      const queryResults = await queryExecutor.execute(queryObj);
      setResults(queryResults);
    } catch (err) {
      setError(err.message);
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  const executeQuery = async () => {
    setLoading(true);
    setError(null);

    try {
      const queryObj = parseQueryInputs(queryType, formData);
      const queryResults = await queryExecutor.execute(queryObj);
      setResults(queryResults);

      // Update URL with query params
      updateURL(queryType, formData);
    } catch (err) {
      setError(err.message);
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  const clearQuery = () => {
    setFormData({});
    setResults(null);
    setError(null);
    setSearchParams(new URLSearchParams());
  };

  const handleSetQueryType = newType => {
    setQueryType(newType);
    // Clear form data when switching query types
    setFormData({});
    setResults(null);
    setError(null);
  };

  return {
    queryType,
    setQueryType: handleSetQueryType,
    formData,
    setFormData,
    results,
    loading,
    error,
    executeQuery,
    clearQuery,
  };
};
