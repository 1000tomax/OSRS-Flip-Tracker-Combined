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
    render: value => {
      const numValue = Number(value);
      // Handle invalid numeric values
      if (isNaN(numValue)) {
        return <span className="font-medium font-mono text-gray-400">0 GP</span>;
      }
      // Color code profit: green for positive, red for negative
      return (
        <span
          className={`font-medium font-mono ${numValue >= 0 ? 'text-green-400' : 'text-red-400'}`}
        >
          {formatGP(numValue)} GP
        </span>
      );
    },
  },
  {
    key: 'roi_percent',
    label: 'ROI',
    cellClass: 'font-medium font-mono',
    render: value => {
      const numValue = Number(value);
      // Handle invalid numeric values
      if (isNaN(numValue)) {
        return <span className="font-medium font-mono text-gray-400">0.00%</span>;
      }
      // Color code ROI: green for positive, red for negative
      return (
        <span
          className={`font-medium font-mono ${numValue >= 0 ? 'text-green-400' : 'text-red-400'}`}
        >
          {formatPercent(numValue)}
        </span>
      );
    },
  },
  {
    key: 'avg_profit_per_flip',
    label: 'Avg/Flip',
    render: value => {
      const numValue = Number(value);
      // Handle invalid numeric values
      if (!Number.isFinite(numValue)) {
        return <span className="text-gray-400 font-medium font-mono">0 GP</span>;
      }
      // Color code avg profit: green for positive, red for negative
      return (
        <span
          className={`font-medium font-mono ${numValue >= 0 ? 'text-green-400' : 'text-red-400'}`}
        >
          {formatGP(numValue)} GP
        </span>
      );
    },
  },
];
