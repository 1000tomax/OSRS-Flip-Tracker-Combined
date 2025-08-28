import { useState } from 'react';

export default function ItemSearch({
  onSearch,
  placeholder = "Search items... (e.g., 'Dragon bones' or 'Rune sword, Magic logs, Whip')",
}) {
  const [searchValue, setSearchValue] = useState('');

  const handleSearch = value => {
    setSearchValue(value);

    if (!value.trim()) {
      onSearch([]);
      return;
    }

    // Split by comma and clean up each item
    const searchTerms = value
      .split(',')
      .map(term => term.trim().toLowerCase())
      .filter(term => term.length > 0);

    onSearch(searchTerms);
  };

  const clearSearch = () => {
    setSearchValue('');
    onSearch([]);
  };

  return (
    <div className="mb-4">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <span className="text-gray-400">🔍</span>
        </div>
        <input
          type="text"
          value={searchValue}
          onChange={e => handleSearch(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {searchValue && (
          <button
            onClick={clearSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
          >
            ✕
          </button>
        )}
      </div>

      {searchValue && (
        <div className="mt-2 text-xs text-gray-400">
          {searchValue.includes(',') ? (
            <>Searching for multiple items: {searchValue.split(',').length} items</>
          ) : (
            <>Searching for: "{searchValue}"</>
          )}
        </div>
      )}
    </div>
  );
}
