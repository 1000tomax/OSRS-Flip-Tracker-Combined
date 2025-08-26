import { useState, useEffect, useRef } from 'react';
import { useItemSearch } from '../../hooks/useItemSearch';

export default function ItemSearchInput({ value, onChange, placeholder }) {
  const [inputValue, setInputValue] = useState(value || '');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const { suggestions, loading, hasSearched, searchItems, clearSearch } = useItemSearch();
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);

  // Handle clicks outside to close dropdown
  useEffect(() => {
    const handleClickOutside = event => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update input when value prop changes
  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  const handleInputChange = e => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);

    if (newValue.trim()) {
      searchItems(newValue);
      setShowSuggestions(true);
      setSelectedIndex(-1);
    } else {
      setShowSuggestions(false);
      clearSearch();
    }
  };

  const handleSelectItem = itemName => {
    setInputValue(itemName);
    onChange(itemName);
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const handleClear = () => {
    setInputValue('');
    onChange('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = e => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
        break;

      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;

      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelectItem(suggestions[selectedIndex]);
        }
        break;

      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (inputValue.trim() && suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          placeholder={placeholder}
          className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition"
        />

        {inputValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition"
          >
            ×
          </button>
        )}
      </div>

      {showSuggestions && inputValue.trim() && (
        <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg max-h-64 overflow-auto">
          {loading ? (
            <div className="px-3 py-2 text-gray-400">Searching...</div>
          ) : suggestions.length > 0 ? (
            suggestions.map((item, index) => (
              <button
                key={item}
                type="button"
                onClick={() => handleSelectItem(item)}
                className={`w-full text-left px-3 py-2 hover:bg-gray-700 transition ${
                  index === selectedIndex ? 'bg-gray-700' : ''
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-white">{item}</span>
                </div>
              </button>
            ))
          ) : hasSearched ? (
            <div className="px-3 py-2 text-gray-400">No items found</div>
          ) : null}
        </div>
      )}
    </div>
  );
}
