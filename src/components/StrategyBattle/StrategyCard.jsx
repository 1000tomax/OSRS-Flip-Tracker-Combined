// src/components/StrategyBattle/StrategyCard.jsx - Individual strategy performance card
import React from 'react';
import { formatGP, formatDuration } from '@/utils';

/**
 * StrategyCard Component - Displays performance metrics for a single strategy
 */
export default function StrategyCard({ strategy, isWinner, color = 'blue', className = '' }) {
  if (!strategy) {
    return (
      <div className={`bg-gray-800 border border-gray-600 rounded-lg p-4 ${className}`}>
        <div className="text-center text-gray-500">No strategy data</div>
      </div>
    );
  }

  const colorClasses = {
    green: {
      border: 'border-green-400',
      bg: 'bg-green-900/20',
      text: 'text-green-400',
      accent: 'text-green-300',
    },
    blue: {
      border: 'border-blue-400',
      bg: 'bg-blue-900/20',
      text: 'text-blue-400',
      accent: 'text-blue-300',
    },
    gray: {
      border: 'border-gray-600',
      bg: 'bg-gray-800',
      text: 'text-gray-400',
      accent: 'text-gray-300',
    },
  };

  const styles = isWinner ? colorClasses.green : colorClasses[color] || colorClasses.gray;

  return (
    <div className={`${styles.bg} ${styles.border} border-2 rounded-lg p-4 ${className}`}>
      {/* Strategy Header */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className={`font-bold text-lg ${styles.text}`}>{strategy.name}</h3>
          <p className="text-gray-400 text-sm">{strategy.description}</p>
        </div>
        {isWinner && <div className="text-2xl animate-pulse">👑</div>}
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <div className={`text-2xl font-bold ${styles.text}`}>
            {formatGP(strategy.totalProfit)}
          </div>
          <div className="text-gray-500 text-sm">Total Profit</div>
        </div>

        <div className="text-center">
          <div className={`text-2xl font-bold ${styles.text}`}>{formatGP(strategy.gpPerHour)}</div>
          <div className="text-gray-500 text-sm">GP/Hour</div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <div className={`font-mono ${styles.accent}`}>{strategy.flipCount}</div>
          <div className="text-gray-500 text-xs">Flips</div>
        </div>

        <div>
          <div className={`font-mono ${styles.accent}`}>{formatGP(strategy.avgProfit)}</div>
          <div className="text-gray-500 text-xs">Avg Profit</div>
        </div>

        <div>
          <div className={`font-mono ${styles.accent}`}>{strategy.winRate.toFixed(1)}%</div>
          <div className="text-gray-500 text-xs">Win Rate</div>
        </div>
      </div>

      {/* Time Metrics */}
      <div className="mt-3 pt-3 border-t border-gray-700">
        <div className="grid grid-cols-2 gap-3 text-center">
          <div>
            <div className={`font-mono text-sm ${styles.accent}`}>
              {formatDuration(strategy.totalTime)}
            </div>
            <div className="text-gray-500 text-xs">Total Time</div>
          </div>

          <div>
            <div className={`font-mono text-sm ${styles.accent}`}>
              {(strategy.roi * 100).toFixed(1)}%
            </div>
            <div className="text-gray-500 text-xs">ROI</div>
          </div>
        </div>
      </div>

      {/* Winner Badge */}
      {isWinner && (
        <div className="mt-3 text-center">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-900/50 text-green-300 border border-green-500/30">
            🏆 Winner
          </span>
        </div>
      )}
    </div>
  );
}
