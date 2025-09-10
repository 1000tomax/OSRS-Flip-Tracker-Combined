import { useState, useRef } from 'react';
import { useSQLDatabase } from '../../hooks/useSQLDatabase';
import { toast } from 'sonner';
import { formatToShorthand } from '../../utils/parseShorthandNumber';

const EXAMPLE_QUERIES = [
  'Show me my top 10 most profitable flips',
  'All flips over 1 million profit',
  'My worst losses this month',
  'Average profit per flip by account',
  'Flips that took longer than 24 hours',
  'Show me items with ROI over 50%',
  'What did I flip yesterday?',
  'Total profit this week by item',
  "Items I've flipped more than 5 times",
  'Highest profit margin flips',
  'Show me flips from this week',
  'Compare profits between accounts',
];

export function AIQueryInterface({ flips }) {
  const [query, setQuery] = useState('');
  const [conversation, setConversation] = useState([]);
  const [sqlQuery, setSqlQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showSQL, setShowSQL] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState('');

  const { executeQuery, loading: dbLoading, error: dbError } = useSQLDatabase(flips);
  const queryHistoryRef = useRef([]);

  const handleQuery = async () => {
    if (!query.trim()) {
      toast.error('Please enter a query');
      return;
    }

    // Check for spam/silly input
    if (query.length > 500) {
      toast.error('Query too long! Please keep it under 500 characters.');
      return;
    }

    setLoading(true);
    try {
      // Build context for follow-up queries
      const isFollowUp = conversation.length > 0;
      const context = {
        query,
        previousQuery: isFollowUp ? conversation[conversation.length - 1].query : null,
        previousSQL: isFollowUp ? conversation[conversation.length - 1].sql : null,
      };

      const response = await fetch('/api/generate-sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate SQL');
      }

      const { sql } = await response.json();
      setSqlQuery(sql);

      // Execute the SQL locally
      const queryResults = executeQuery(sql);
      setResults(queryResults);

      // Add to conversation history
      setConversation([
        ...conversation,
        {
          query,
          sql,
          resultCount: queryResults.values?.length || 0,
        },
      ]);

      // Save to history
      queryHistoryRef.current = [...queryHistoryRef.current, { query, sql }].slice(-20);

      toast.success(`Found ${queryResults.values?.length || 0} results!`);
    } catch (error) {
      console.error('Query error:', error);
      toast.error(error.message || 'Failed to process query');
    } finally {
      setLoading(false);
    }
  };

  const handleNewQuery = () => {
    setConversation([]);
    setQuery('');
    setResults(null);
    setSqlQuery('');
    setShowFeedback(false);
    setFeedback('');
  };

  const handleFeedbackSubmit = async () => {
    if (!feedback.trim()) return;

    try {
      const feedbackData = {
        type: 'ai_query_feedback',
        user_query: conversation[conversation.length - 1]?.userQuery || '',
        generated_sql: sqlQuery,
        feedback_text: feedback.trim(),
        results_count: results?.values?.length || 0,
        timestamp: new Date().toISOString(),
      };

      await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 50,
          messages: [
            {
              role: 'user',
              content: `Log AI Query Feedback: ${JSON.stringify(feedbackData)}`,
            },
          ],
        }),
      });

      setShowFeedback(false);
      setFeedback('');
      console.log('Feedback submitted successfully');
    } catch (error) {
      console.error('Error submitting feedback:', error);
      console.error('Failed to submit feedback');
    }
  };

  if (dbLoading) {
    return (
      <div className="bg-gray-800 p-8 rounded-lg text-center">
        <div className="text-gray-400">Initializing database...</div>
      </div>
    );
  }

  if (dbError) {
    return (
      <div className="bg-gray-800 p-8 rounded-lg">
        <div className="text-red-500">Database error: {dbError.message}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Query Interface */}
      <div className="bg-gray-800 p-6 rounded-lg">
        <div className="mb-4">
          <h3 className="text-xl font-bold text-white mb-2">
            🤖 AI-Powered Natural Language Search
          </h3>
          <p className="text-gray-400 text-sm">Ask questions about your flips in plain English</p>

          {/* Feature Explanation */}
          <div className="mt-3 p-3 bg-blue-900/20 border border-blue-500/30 rounded text-sm text-blue-200">
            <div className="mb-2">
              <span className="font-semibold text-blue-300">✨ NEW:</span> This experimental feature
              uses AI to convert your natural language queries into SQL.
            </div>
            <div className="space-y-1 text-xs text-blue-100/80">
              <div>
                • <span className="font-medium">How it works:</span> Type any question about your
                flips and the AI will search your data
              </div>
              <div>
                • <span className="font-medium">Refine queries:</span> After getting results, ask
                follow-up questions to drill deeper
              </div>
              <div>
                • <span className="font-medium">Context aware:</span> The AI remembers your
                conversation to provide better refinements
              </div>
              <div>
                • <span className="font-medium">Privacy first:</span> Your flip data never leaves
                your browser - only the query text is sent to generate SQL
              </div>
              <div>
                • <span className="font-medium">Report issues:</span> Use the feedback button to
                help improve accuracy
              </div>
            </div>
          </div>

          <div className="mt-2 p-2 bg-yellow-900/30 border border-yellow-500/30 rounded text-xs text-yellow-300">
            <span className="font-medium">Note:</span> Item categorization is not yet implemented.
            For now, queries work best with specific item names, profit amounts, dates, and
            accounts.
          </div>
        </div>

        {/* Conversation History */}
        {conversation.length > 0 && (
          <div className="mb-4 p-3 bg-gray-900 rounded max-h-32 overflow-y-auto">
            {conversation.map((msg, i) => (
              <div key={i} className="text-sm mb-1">
                <span className="text-blue-400">Q:</span> {msg.query}
                <span className="text-gray-500 ml-2">({msg.resultCount} results)</span>
              </div>
            ))}
          </div>
        )}

        {/* Input Area */}
        <div className="space-y-3">
          <textarea
            value={query}
            onChange={e => setQuery(e.target.value.substring(0, 500))}
            placeholder={
              conversation.length > 0
                ? 'Refine your search or ask a new question...'
                : "Try: 'Show me my most profitable dragon items' or 'What did I flip last week?'"
            }
            className="w-full p-3 bg-gray-700 text-white rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleQuery();
              }
            }}
          />

          {query.length > 400 && (
            <div className="text-xs text-yellow-400">{500 - query.length} characters remaining</div>
          )}

          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <button
                onClick={handleQuery}
                disabled={loading || !query.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Thinking...' : conversation.length > 0 ? '🔄 Refine' : '🔮 Search'}
              </button>

              {conversation.length > 0 && (
                <button
                  onClick={handleNewQuery}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500"
                >
                  New Query
                </button>
              )}
            </div>

            <div className="text-xs text-gray-500">Press Ctrl+Enter to search</div>
          </div>
        </div>

        {/* Example Queries */}
        <div className="mt-4">
          <p className="text-sm text-gray-400 mb-2">Try these examples:</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_QUERIES.slice(0, 6).map((example, i) => (
              <button
                key={i}
                onClick={() => setQuery(example)}
                className="px-3 py-1 bg-gray-700 text-gray-300 rounded text-sm hover:bg-gray-600 transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        {/* SQL Display (Optional) */}
        {sqlQuery && (
          <div className="mt-4">
            <button
              onClick={() => setShowSQL(!showSQL)}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              {showSQL ? 'Hide' : 'Show'} Generated SQL
            </button>

            {showSQL && (
              <pre className="mt-2 p-3 bg-gray-900 rounded text-green-400 text-xs overflow-x-auto">
                {sqlQuery}
              </pre>
            )}
          </div>
        )}
      </div>

      {/* Results Display */}
      {results && (
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          {/* Feedback Button - Moved to Top */}
          <div className="border-b border-gray-700 px-4 py-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">
                Found {results.values?.length || 0} results
              </span>
              <button
                onClick={() => setShowFeedback(!showFeedback)}
                className="px-3 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
              >
                {showFeedback ? 'Cancel' : '⚠️ Report Issue'}
              </button>
            </div>

            {showFeedback && (
              <div className="mt-3 space-y-3">
                <textarea
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  placeholder="Please describe what's not working as expected. For example: 'Results don't match my query', 'Missing expected data', 'Wrong calculations', etc."
                  className="w-full p-3 bg-gray-700 text-white rounded text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  maxLength={500}
                />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">{feedback.length}/500 characters</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowFeedback(false);
                        setFeedback('');
                      }}
                      className="px-3 py-1 text-xs bg-gray-600 text-gray-300 rounded hover:bg-gray-500"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleFeedbackSubmit}
                      disabled={!feedback.trim()}
                      className="px-3 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Submit Feedback
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <QueryResults results={results} />
        </div>
      )}

      {/* Generic Query Examples */}
      {!results && (
        <div className="bg-gray-800 p-4 rounded-lg">
          <p className="text-sm text-gray-400 mb-2">Popular queries:</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_QUERIES.slice(6, 12).map((example, i) => (
              <button
                key={i}
                onClick={() => setQuery(example)}
                className="px-3 py-1 bg-gray-700 text-gray-300 rounded text-sm hover:bg-gray-600 transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function QueryResults({ results }) {
  if (!results.values || results.values.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="text-gray-400">No results found</div>
        <p className="text-sm text-gray-500 mt-2">Try rephrasing your query or removing filters</p>
      </div>
    );
  }

  // Format and color values for display
  const formatValue = (value, columnName) => {
    if (value === null || value === undefined) return { text: '—', className: 'text-gray-500' };

    const col = columnName.toLowerCase();

    // Format GP values with color coding
    if (col.includes('profit') || col.includes('revenue')) {
      const formatted = typeof value === 'number' ? `${formatToShorthand(value)} GP` : value;
      if (typeof value === 'number') {
        const colorClass =
          value > 0 ? 'text-green-400' : value < 0 ? 'text-red-400' : 'text-gray-300';
        return { text: formatted, className: colorClass };
      }
      return { text: formatted, className: 'text-gray-300' };
    }

    // Format buy/sell prices
    if (col.includes('price') || col.includes('spent')) {
      const formatted = typeof value === 'number' ? `${formatToShorthand(value)} GP` : value;
      return { text: formatted, className: 'text-blue-400' };
    }

    // Format ROI with color coding
    if (col.includes('roi') || col.includes('percent')) {
      const formatted = typeof value === 'number' ? `${value.toFixed(1)}%` : value;
      if (typeof value === 'number') {
        const colorClass =
          value > 10 ? 'text-green-400' : value > 0 ? 'text-yellow-400' : 'text-red-400';
        return { text: formatted, className: colorClass };
      }
      return { text: formatted, className: 'text-gray-300' };
    }

    // Format quantities
    if (col.includes('quantity') || col.includes('count') || col.includes('flips')) {
      const formatted =
        typeof value === 'number' && value >= 1000
          ? formatToShorthand(value, 0)
          : typeof value === 'number'
            ? value.toLocaleString()
            : value;
      return { text: formatted, className: 'text-purple-400' };
    }

    // Item names - highlight them
    if (col.includes('item') || col.includes('name')) {
      return { text: value, className: 'text-white font-medium' };
    }

    // Account names
    if (col.includes('account')) {
      return { text: value, className: 'text-cyan-400' };
    }

    // Duration formatting
    if (col.includes('duration') && col.includes('minutes')) {
      if (typeof value === 'number') {
        const hours = Math.floor(value / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) {
          const remainingHours = hours % 24;
          const formatted = remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
          return { text: formatted, className: 'text-orange-400' };
        } else if (hours > 0) {
          const remainingMinutes = value % 60;
          const formatted = remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
          return { text: formatted, className: 'text-orange-400' };
        } else {
          return { text: `${value}m`, className: 'text-orange-400' };
        }
      }
      return { text: value, className: 'text-gray-300' };
    }

    // Default formatting
    const formatted = typeof value === 'number' ? value.toLocaleString() : value;
    return { text: formatted, className: 'text-gray-300' };
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left text-gray-300">
        <thead className="text-xs uppercase bg-gray-700">
          <tr>
            {results.columns.map((col, i) => {
              // Format column headers to be more readable
              let displayName = col.replace(/_/g, ' ');
              if (displayName === 'flip duration minutes') {
                displayName = 'time held';
              }
              return (
                <th key={i} className="px-6 py-3">
                  {displayName}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {results.values.map((row, i) => (
            <tr key={i} className="border-b border-gray-700 hover:bg-gray-700/50">
              {row.map((cell, j) => {
                const formatted = formatValue(cell, results.columns[j]);
                return (
                  <td key={j} className={`px-6 py-4 ${formatted.className}`}>
                    {formatted.text}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AIQueryInterface;
