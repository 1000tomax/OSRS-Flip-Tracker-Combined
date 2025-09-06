import { useState } from 'react';
import { executeQuery, validateQueryConfig } from '../../utils/queryExecutor';
import { FilterRow } from './FilterRow';
import { QueryResults } from './QueryResults';

export function QueryBuilder({ data }) {
  const [queryConfig, setQueryConfig] = useState({
    filters: [],
    sortBy: null,
    sortOrder: 'desc',
    limit: null
  });
  
  const [displayConfig, setDisplayConfig] = useState({
    type: 'table'
  });
  
  const [naturalInput, setNaturalInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [errors, setErrors] = useState([]);
  
  // AI Translation
  const handleAITranslate = async () => {
    if (!naturalInput.trim()) return;
    
    setLoading(true);
    setErrors([]);
    
    try {
      const response = await fetch('/api/translate-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userInput: naturalInput })
      });
      
      if (!response.ok) {
        throw new Error('Failed to translate query');
      }
      
      const aiResponse = await response.json();
      
      setQueryConfig(aiResponse.query || {
        filters: [],
        sortBy: null,
        sortOrder: 'desc',
        limit: null
      });
      
      setDisplayConfig(aiResponse.display || { type: 'table' });
      setExplanation(aiResponse.explanation);
      
      // Auto-execute
      const filtered = executeQuery(aiResponse.query, data);
      setResults(filtered);
      
    } catch (error) {
      console.error('AI translation failed:', error);
      setErrors(['Could not understand query. Try using manual filters or different wording.']);
    } finally {
      setLoading(false);
    }
  };
  
  // Manual execution
  const handleExecute = () => {
    setErrors([]);
    
    // Validate query config
    const validationErrors = validateQueryConfig(queryConfig);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    try {
      const filtered = executeQuery(queryConfig, data);
      setResults(filtered);
      setExplanation(null); // Clear AI explanation when manually executing
    } catch (error) {
      console.error('Query execution failed:', error);
      setErrors([`Query execution failed: ${error.message}`]);
    }
  };
  
  // Filter management
  const addFilter = () => {
    setQueryConfig({
      ...queryConfig,
      filters: [
        ...queryConfig.filters,
        { field: '', operator: '', value: '' }
      ]
    });
  };
  
  const updateFilter = (index, updatedFilter) => {
    const newFilters = [...queryConfig.filters];
    newFilters[index] = updatedFilter;
    setQueryConfig({
      ...queryConfig,
      filters: newFilters
    });
  };
  
  const removeFilter = (index) => {
    setQueryConfig({
      ...queryConfig,
      filters: queryConfig.filters.filter((_, i) => i !== index)
    });
  };
  
  // Example queries
  const exampleQueries = [
    { text: "Top 10 most profitable items", query: "Show my top 10 most profitable items" },
    { text: "High ROI items", query: "Items with ROI over 15%" },
    { text: "Recent flips", query: "What did I flip in the last 7 days" },
    { text: "Expensive items", query: "Items where I spent over 1 million GP" },
    { text: "Quick flips", query: "Items held for less than 4 hours" }
  ];
  
  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-4 text-white">🔍 Query Builder</h2>
      
      {/* AI Assistant Bar */}
      <div className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={naturalInput}
            onChange={(e) => setNaturalInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAITranslate()}
            placeholder="Ask in plain English: 'Show my most profitable items from last week'"
            className="flex-1 px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
          <button
            onClick={handleAITranslate}
            disabled={loading || !naturalInput}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? '🤔 Thinking...' : '🤖 Build Query'}
          </button>
        </div>
        
        {/* Quick examples */}
        <div className="flex gap-2 mt-2 flex-wrap">
          {exampleQueries.map((example, idx) => (
            <button
              key={idx}
              onClick={() => setNaturalInput(example.query)}
              className="text-xs text-blue-400 hover:underline"
            >
              {example.text}
            </button>
          ))}
        </div>
      </div>
      
      {/* AI Explanation */}
      {explanation && (
        <div className="mb-4 p-4 bg-blue-900/20 border border-blue-500 rounded">
          <div className="flex gap-2">
            <span className="text-2xl">🤖</span>
            <div className="flex-1">
              <p className="text-blue-200 font-medium">{explanation.summary}</p>
              {explanation.filters && explanation.filters.length > 0 && (
                <ul className="text-sm text-gray-300 mt-2">
                  {explanation.filters.map((f, i) => (
                    <li key={i}>✓ {f}</li>
                  ))}
                </ul>
              )}
              {explanation.insight && (
                <p className="text-sm text-yellow-300 mt-2">💡 {explanation.insight}</p>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Error Display */}
      {errors.length > 0 && (
        <div className="mb-4 p-4 bg-red-900/20 border border-red-500 rounded">
          <div className="text-red-200">
            {errors.map((error, i) => (
              <p key={i}>⚠️ {error}</p>
            ))}
          </div>
        </div>
      )}
      
      {/* Manual Filter Builder */}
      <div className="space-y-4 mb-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">Filters</h3>
        </div>
        
        {queryConfig.filters.map((filter, i) => (
          <FilterRow
            key={i}
            filter={filter}
            onChange={(f) => updateFilter(i, f)}
            onRemove={() => removeFilter(i)}
          />
        ))}
        
        {queryConfig.filters.length === 0 && (
          <p className="text-gray-500 text-sm">No filters applied - showing all data</p>
        )}
        
        <button
          onClick={addFilter}
          className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
        >
          + Add Filter
        </button>
      </div>
      
      {/* Sort & Display Options */}
      <div className="flex gap-4 mb-6 flex-wrap">
        <div>
          <label className="block text-sm mb-1 text-gray-400">Sort By</label>
          <select
            value={queryConfig.sortBy || ''}
            onChange={(e) => setQueryConfig({...queryConfig, sortBy: e.target.value || null})}
            className="px-3 py-1 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            <option value="">None</option>
            <option value="profit">Profit</option>
            <option value="roi">ROI</option>
            <option value="date">Date</option>
            <option value="quantity">Quantity</option>
            <option value="item">Item Name</option>
            <option value="avgBuyPrice">Buy Price</option>
            <option value="avgSellPrice">Sell Price</option>
            <option value="spent">Total Spent</option>
            <option value="revenue">Total Revenue</option>
            <option value="hoursHeld">Hours Held</option>
            <option value="daysSinceFlip">Days Ago</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm mb-1 text-gray-400">Order</label>
          <select
            value={queryConfig.sortOrder}
            onChange={(e) => setQueryConfig({...queryConfig, sortOrder: e.target.value})}
            className="px-3 py-1 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            disabled={!queryConfig.sortBy}
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm mb-1 text-gray-400">Display As</label>
          <select
            value={displayConfig.type}
            onChange={(e) => setDisplayConfig({...displayConfig, type: e.target.value})}
            className="px-3 py-1 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            <option value="table">Table</option>
            <option value="bar_chart">Bar Chart</option>
            <option value="pie_chart">Pie Chart</option>
            <option value="line_chart">Line Chart</option>
            <option value="single_value">Single Value</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm mb-1 text-gray-400">Limit</label>
          <input
            type="number"
            value={queryConfig.limit || ''}
            onChange={(e) => setQueryConfig({...queryConfig, limit: e.target.value ? parseInt(e.target.value) : null})}
            placeholder="All"
            className="w-20 px-3 py-1 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            min="1"
          />
        </div>
      </div>
      
      {/* Execute Button */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={handleExecute}
          className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-semibold transition-colors"
        >
          Run Query ({queryConfig.filters.length} filter{queryConfig.filters.length !== 1 ? 's' : ''})
        </button>
        
        {results && (
          <button
            onClick={() => {
              setResults(null);
              setQueryConfig({
                filters: [],
                sortBy: null,
                sortOrder: 'desc',
                limit: null
              });
              setExplanation(null);
            }}
            className="px-6 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
          >
            Clear Results
          </button>
        )}
      </div>
      
      
      {/* Results Display */}
      {results && (
        <div className="mt-6">
          <QueryResults 
            data={results} 
            displayConfig={displayConfig}
          />
        </div>
      )}
    </div>
  );
}
