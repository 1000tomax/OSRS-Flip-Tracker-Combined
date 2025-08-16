/**
 * Column Configurations for Item Statistics
 *
 * These are pre-made column definitions for common data displays.
 * They define how to show item statistics in a consistent way across the app.
 */

import React from 'react';
import { formatGP, formatPercent } from './utils';

// Column configuration for item statistics (used on Items page)
export const itemStatsColumns = [
  {
    key: 'flips', // Data field name
    label: 'Flips', // Display label
    render: value => <span className="text-white font-medium">{value}</span>,
  },
  {
    key: 'total_profit',
    label: 'Profit',
    cellClass: 'font-medium font-mono',
    render: value => (
      // Color code profit: green for positive, red for negative
      <span
        className={`font-medium font-mono ${Number(value) >= 0 ? 'text-green-400' : 'text-red-400'}`}
      >
        {formatGP(Number(value))} GP
      </span>
    ),
  },
  {
    key: 'roi_percent',
    label: 'ROI',
    cellClass: 'font-medium font-mono',
    render: value => (
      // Color code ROI: green for positive, red for negative
      <span
        className={`font-medium font-mono ${Number(value) >= 0 ? 'text-green-400' : 'text-red-400'}`}
      >
        {formatPercent(Number(value))}
      </span>
    ),
  },
  {
    key: 'avg_profit_per_flip',
    label: 'Avg/Flip',
    render: value => (
      <span className="text-white font-medium font-mono">{formatGP(Number(value))} GP</span>
    ),
  },
];
