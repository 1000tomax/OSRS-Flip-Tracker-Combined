import React from 'react';
import PropTypes from 'prop-types';

/**
 * Colored badge that displays success percentage.
 */
export default function ItemSuccessRateBadge({ value }) {
  const pct = Number.isFinite(value) ? value : 0;
  let color = 'bg-gray-700 text-gray-200';
  if (pct >= 65) color = 'bg-green-900/50 text-green-300 border border-green-700/50';
  else if (pct >= 45) color = 'bg-yellow-900/40 text-yellow-300 border border-yellow-700/50';
  else color = 'bg-red-900/50 text-red-300 border border-red-700/50';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {pct.toFixed(0)}%
    </span>
  );
}

ItemSuccessRateBadge.propTypes = {
  value: PropTypes.number,
};
