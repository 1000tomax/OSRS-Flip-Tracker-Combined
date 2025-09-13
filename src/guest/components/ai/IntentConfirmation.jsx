import React from 'react';

/**
 * Component to show parsed intent and get user confirmation before executing
 */
export function IntentConfirmation({ spec, preview, confidence, onConfirm, onCancel, onEdit }) {
  const confidenceColor =
    confidence >= 0.8
      ? 'text-green-400'
      : confidence >= 0.6
        ? 'text-yellow-400'
        : 'text-orange-400';

  const confidenceLabel = confidence >= 0.8 ? 'High' : confidence >= 0.6 ? 'Medium' : 'Low';

  return (
    <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-blue-300 text-lg">🤖</span>
          <h3 className="text-blue-300 font-semibold">Query Understanding</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Confidence:</span>
          <span className={`text-xs font-medium ${confidenceColor}`}>
            {confidenceLabel} ({Math.round(confidence * 100)}%)
          </span>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-blue-200 text-sm mb-2">I understand you want to:</p>
        <div className="bg-gray-800 rounded p-3 border-l-4 border-blue-500">
          <p className="text-white">{preview}</p>
        </div>
      </div>

      {/* Show detected components */}
      <div className="mb-4 space-y-2">
        {spec.timeRange && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">📅 Time:</span>
            <span className="text-blue-200">{formatTimeRange(spec.timeRange)}</span>
          </div>
        )}

        {spec.metrics && spec.metrics.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">📊 Metrics:</span>
            <span className="text-blue-200">
              {spec.metrics.map(m => `${m.op} ${m.metric}`).join(', ')}
            </span>
          </div>
        )}

        {spec.filters && spec.filters.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">🔍 Filters:</span>
            <span className="text-blue-200">
              {spec.filters.map(f => `${f.field} ${f.op} ${f.value}`).join(', ')}
            </span>
          </div>
        )}

        {spec.limit && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">📝 Limit:</span>
            <span className="text-blue-200">Top {spec.limit} results</span>
          </div>
        )}
      </div>

      {/* Confidence warning for low scores */}
      {confidence < 0.7 && (
        <div className="mb-4 p-3 bg-yellow-900/30 border border-yellow-500/50 rounded text-sm">
          <div className="flex items-center gap-2 text-yellow-300">
            <span>⚠️</span>
            <span className="font-medium">
              {confidence < 0.5
                ? 'Low confidence - please verify'
                : 'Medium confidence - please confirm'}
            </span>
          </div>
          <p className="text-yellow-200 mt-1">
            I'm not completely sure I understood correctly. Please review the interpretation above.
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={onConfirm}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 transition-colors flex items-center gap-2"
        >
          <span>✓</span>
          <span>Yes, run this query</span>
        </button>

        <button
          onClick={onEdit}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors flex items-center gap-2"
        >
          <span>✏️</span>
          <span>Modify query</span>
        </button>

        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 transition-colors"
        >
          Cancel
        </button>
      </div>

      {/* Help text */}
      <div className="mt-3 pt-3 border-t border-blue-500/20">
        <p className="text-xs text-gray-400">
          💡 Tip: This local analysis helps reduce API costs and gives you instant feedback. Only
          confirmed queries are sent to Claude for SQL generation.
        </p>
      </div>
    </div>
  );
}

function formatTimeRange(timeRange) {
  if (timeRange.preset) {
    const presetNames = {
      last_7d: 'Last 7 days',
      last_30d: 'Last 30 days',
      this_week: 'This week',
      this_month: 'This month',
      last_month: 'Last month',
      all_time: 'All time',
    };
    return presetNames[timeRange.preset] || timeRange.preset;
  }

  if (timeRange.from && timeRange.to) {
    return `${timeRange.from} to ${timeRange.to}`;
  }

  if (timeRange.dayOfWeek) {
    if (timeRange.specific) {
      return `Last ${timeRange.dayOfWeek}`;
    } else if (timeRange.all) {
      return `All ${timeRange.dayOfWeek}s`;
    }
    return timeRange.dayOfWeek;
  }

  if (timeRange.comparison) {
    return timeRange.comparison.replace('_', ' vs ');
  }

  return 'Custom time range';
}

export default IntentConfirmation;
