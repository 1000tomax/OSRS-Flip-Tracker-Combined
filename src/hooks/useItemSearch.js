import { useState, useCallback, useRef } from 'react';
import { queryCache } from '../lib/queryCache';

export const useItemSearch = () => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceTimer = useRef(null);

  // Load all unique item names from item-stats
  const getAllItemNames = async () => {
    return queryCache.getCachedItemStats('item-names-list', async () => {
      const response = await fetch('/data/item-stats.csv');
      const text = await response.text();
      const lines = text.trim().split('\n');
      const itemNames = [];

      // Skip header, extract item names
      for (let i = 1; i < lines.length; i++) {
        const itemName = lines[i].split(',')[0];
        if (itemName) {
          itemNames.push(itemName);
        }
      }

      return itemNames;
    });
  };

  const searchItems = useCallback(async query => {
    // Clear previous debounce timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Debounce the search
    debounceTimer.current = setTimeout(async () => {
      setLoading(true);
      setHasSearched(true);

      try {
        const allItems = await getAllItemNames();
        const queryLower = query.toLowerCase();

        // Filter items that contain the query (case-insensitive)
        const matches = allItems.filter(item => item.toLowerCase().includes(queryLower));

        // Sort by relevance (items starting with query first)
        matches.sort((a, b) => {
          const aStarts = a.toLowerCase().startsWith(queryLower);
          const bStarts = b.toLowerCase().startsWith(queryLower);

          if (aStarts && !bStarts) return -1;
          if (!aStarts && bStarts) return 1;

          // Secondary sort by length (shorter items first)
          return a.length - b.length;
        });

        // Limit to 8 suggestions
        const MAX_SUGGESTIONS = 8;
        setSuggestions(matches.slice(0, MAX_SUGGESTIONS));
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300); // eslint-disable-line no-magic-numbers
  }, []);

  const clearSearch = useCallback(() => {
    setSuggestions([]);
    setHasSearched(false);
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
  }, []);

  return {
    suggestions,
    loading,
    hasSearched,
    searchItems,
    clearSearch,
  };
};
