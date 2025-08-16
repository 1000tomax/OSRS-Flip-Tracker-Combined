// src/components/StrategyBattle/ItemBreakdown.jsx - Extracted component for item breakdown display
import React, { useState } from 'react';
import { formatGP, formatDuration } from '@/utils';

/**
 * ItemBreakdown Component - Shows detailed breakdown of items contributing to strategy performance
 */
export default function ItemBreakdown({ items, color, strategyName }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const colorClasses = {
    green: {
      text: 'text-green-400',
      bg: 'bg-green-900/20',
      border: 'border-green-400/30',
      hover: 'hover:bg-green-800/30',
    },
    blue: {
      text: 'text-blue-400',
      bg: 'bg-blue-900/20',
      border: 'border-blue-400/30',
      hover: 'hover:bg-blue-800/30',
    },
  };

  const styles = colorClasses[color] || colorClasses.blue;

  if (!items || items.length === 0) {
    return (
      <div className={`${styles.bg} ${styles.border} border rounded-lg p-3`}>
        <div className="text-center text-gray-500">No items for {strategyName} strategy</div>
      </div>
    );
  }

  const displayItems = isExpanded ? items : items.slice(0, 5);
  const totalProfit = items.reduce((sum, item) => sum + item.profit, 0);

  return (
    <div className={`${styles.bg} ${styles.border} border rounded-lg`}>
      <div className={`${styles.hover} cursor-pointer transition-colors`}>
        <div
          className="flex justify-between items-center p-3"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <h4 className={`font-semibold ${styles.text}`}>
            {strategyName} Strategy Items ({items.length})
          </h4>
          <div className="flex items-center gap-2">
            <span className={`text-sm ${styles.text}`}>{formatGP(totalProfit)} total</span>
            <span className={`text-sm ${styles.text}`}>{isExpanded ? '▼' : '▶'}</span>
          </div>
        </div>
      </div>

      <div className="space-y-2 p-3 pt-0">
        {displayItems.map((item, idx) => {
          const timeHours = item.timeMinutes / 60;
          const profitSharePercent = totalProfit > 0 ? (item.profit / totalProfit) * 100 : 0;

          return (
            <div key={`${item.itemName}-${idx}`} className="bg-gray-800/50 rounded-md p-2">
              <div className="flex justify-between items-start mb-1">
                <div className="font-medium text-white text-sm truncate flex-1 mr-2">
                  {item.itemName}
                </div>
                <div
                  className={`font-mono text-sm ${item.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}
                >
                  {formatGP(item.profit)}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 text-xs">
                <div className="text-center">
                  <div className="text-white font-mono">
                    {item.quantity?.toLocaleString() || 'N/A'}
                  </div>
                  <div className="text-gray-500">qty</div>
                </div>
                <div className="text-center">
                  <div className="text-white font-mono">
                    {timeHours >= 0.1
                      ? `${timeHours.toFixed(1)}h`
                      : item.timeMinutes >= 1
                        ? `${Math.round(item.timeMinutes)}m`
                        : item.timeMinutes > 0
                          ? '<1m'
                          : 'instant'}
                  </div>
                  <div className="text-gray-500">time</div>
                </div>
                <div className="text-center">
                  <div className="text-white font-mono">{profitSharePercent.toFixed(1)}%</div>
                  <div className="text-gray-500">profit share</div>
                </div>
                <div className="text-center">
                  <div className="text-white font-mono">
                    {item.flips > 1 ? `${item.flips} flips` : '1 flip'}
                  </div>
                  <div className="text-gray-500">count</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!isExpanded && items.length > 5 && (
        <div className="px-3 pb-3">
          <button
            onClick={() => setIsExpanded(true)}
            className={`text-xs ${styles.text} hover:underline`}
          >
            Show {items.length - 5} more items...
          </button>
        </div>
      )}

      {isExpanded && items.length > 5 && (
        <div className="px-3 pb-3 text-center">
          <span className="text-xs text-gray-500">
            Showing all {items.length} items contributing to {strategyName} strategy
          </span>
        </div>
      )}
    </div>
  );
}
