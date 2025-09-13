import React, { useState } from 'react';

/**
 * Component to ask clarifying questions when query intent is ambiguous
 */
export function QueryClarification({ question, options = [], context, onAnswer, onCancel }) {
  const [selectedOption, setSelectedOption] = useState('');
  const [customAnswer, setCustomAnswer] = useState('');
  const [answerMode, setAnswerMode] = useState(options.length > 0 ? 'options' : 'custom');

  const handleSubmit = () => {
    const answer = answerMode === 'options' ? selectedOption : customAnswer;
    if (answer.trim()) {
      onAnswer(answer, context);
    }
  };

  const canSubmit = answerMode === 'options' ? selectedOption : customAnswer.trim();

  return (
    <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3 mb-4">
        <span className="text-amber-400 text-lg">🤔</span>
        <div className="flex-1">
          <h3 className="text-amber-300 font-semibold mb-1">Need clarification</h3>
          <p className="text-amber-200">{question}</p>
        </div>
      </div>

      {/* Show detected context if available */}
      {context && context.parseResult && (
        <div className="mb-4 p-3 bg-gray-800 rounded border-l-4 border-amber-500">
          <p className="text-xs text-gray-400 mb-1">What I detected:</p>
          <div className="text-sm text-gray-300 space-y-1">
            {context.parseResult.components.items?.length > 0 && (
              <div>
                <span className="text-amber-300">Items:</span>{' '}
                {context.parseResult.components.items.join(', ')}
              </div>
            )}
            {context.parseResult.components.metrics?.length > 0 && (
              <div>
                <span className="text-amber-300">Metrics:</span>{' '}
                {context.parseResult.components.metrics.join(', ')}
              </div>
            )}
            {context.parseResult.components.timeRange && (
              <div>
                <span className="text-amber-300">Time:</span>{' '}
                {JSON.stringify(context.parseResult.components.timeRange)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Answer options */}
      <div className="mb-4">
        {options.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-4 mb-3">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="answerMode"
                  value="options"
                  checked={answerMode === 'options'}
                  onChange={e => setAnswerMode(e.target.value)}
                  className="text-amber-500"
                />
                <span className="text-amber-200 text-sm">Choose from options</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="answerMode"
                  value="custom"
                  checked={answerMode === 'custom'}
                  onChange={e => setAnswerMode(e.target.value)}
                  className="text-amber-500"
                />
                <span className="text-amber-200 text-sm">Custom answer</span>
              </label>
            </div>

            {answerMode === 'options' && (
              <div className="space-y-2">
                {options.map((option, index) => (
                  <label
                    key={index}
                    className="flex items-center gap-3 p-2 hover:bg-gray-700 rounded cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="clarificationOption"
                      value={option}
                      checked={selectedOption === option}
                      onChange={e => setSelectedOption(e.target.value)}
                      className="text-amber-500"
                    />
                    <span className="text-gray-200">{option}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {answerMode === 'custom' && (
          <div>
            <label className="block text-sm text-amber-200 mb-2">Your answer:</label>
            <textarea
              value={customAnswer}
              onChange={e => setCustomAnswer(e.target.value)}
              placeholder="Please provide more details about what you're looking for..."
              className="w-full p-3 bg-gray-700 text-white rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-amber-500"
              rows={3}
            />
          </div>
        )}
      </div>

      {/* Common clarification examples */}
      <div className="mb-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded">
        <p className="text-xs text-blue-300 mb-2">💡 Common clarifications:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs">
          <button
            onClick={() => {
              setAnswerMode('custom');
              setCustomAnswer('Last 7 days');
            }}
            className="text-left text-blue-200 hover:text-blue-100 transition-colors"
          >
            • "Last 7 days"
          </button>
          <button
            onClick={() => {
              setAnswerMode('custom');
              setCustomAnswer('Only profitable flips');
            }}
            className="text-left text-blue-200 hover:text-blue-100 transition-colors"
          >
            • "Only profitable flips"
          </button>
          <button
            onClick={() => {
              setAnswerMode('custom');
              setCustomAnswer('Dragon items only');
            }}
            className="text-left text-blue-200 hover:text-blue-100 transition-colors"
          >
            • "Dragon items only"
          </button>
          <button
            onClick={() => {
              setAnswerMode('custom');
              setCustomAnswer('Top 10 results');
            }}
            className="text-left text-blue-200 hover:text-blue-100 transition-colors"
          >
            • "Top 10 results"
          </button>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          <span>✓</span>
          <span>Submit answer</span>
        </button>

        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 transition-colors"
        >
          Cancel
        </button>
      </div>

      {/* Help text */}
      <div className="mt-3 pt-3 border-t border-amber-500/20">
        <p className="text-xs text-gray-400">
          🎯 The more specific you are, the better I can understand your query. This helps me
          generate more accurate results without multiple API calls.
        </p>
      </div>
    </div>
  );
}

export default QueryClarification;
