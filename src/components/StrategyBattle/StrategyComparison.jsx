// src/components/StrategyBattle/StrategyComparison.jsx - Head-to-head strategy comparison
import React from 'react';
import StrategyCard from './StrategyCard';
import ItemBreakdown from './ItemBreakdown';

/**
 * StrategyComparison Component - Shows head-to-head comparison between two strategies
 */
export default function StrategyComparison({
  highVolumeStrategy,
  highValueStrategy,
  winner,
  date,
}) {
  if (!highVolumeStrategy || !highValueStrategy) {
    return (
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 text-center">
        <div className="text-gray-400">Insufficient data for strategy comparison on {date}</div>
      </div>
    );
  }

  const profitDifference = highVolumeStrategy.totalProfit - highValueStrategy.totalProfit;
  const profitDifferencePercent =
    highValueStrategy.totalProfit > 0
      ? (profitDifference / highValueStrategy.totalProfit) * 100
      : 0;

  return (
    <div className="space-y-6">
      {/* Battle Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Strategy Battle - {date}</h2>
        <div className="text-gray-400">High Volume vs High Value Trading Strategies</div>

        {/* Winner Announcement */}
        <div className="mt-4 p-4 bg-gray-800 border border-gray-600 rounded-lg">
          <div className="text-lg font-semibold text-yellow-400">🏆 {winner} Strategy Wins!</div>
          {profitDifference !== 0 && (
            <div className="text-sm text-gray-300 mt-1">
              By {Math.abs(profitDifferencePercent).toFixed(1)}% (
              {Math.abs(profitDifference).toLocaleString()} GP difference)
            </div>
          )}
        </div>
      </div>

      {/* Strategy Cards Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StrategyCard
          strategy={highVolumeStrategy}
          isWinner={winner === 'High Volume'}
          color="blue"
        />

        <StrategyCard
          strategy={highValueStrategy}
          isWinner={winner === 'High Value'}
          color="blue"
        />
      </div>

      {/* Performance Summary */}
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
        <h3 className="font-semibold text-white mb-3">Battle Summary</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-yellow-400">
              {((highVolumeStrategy.gpPerHour / highValueStrategy.gpPerHour) * 100).toFixed(0)}%
            </div>
            <div className="text-gray-400 text-sm">High Volume efficiency vs High Value</div>
          </div>

          <div>
            <div className="text-2xl font-bold text-blue-400">
              {highVolumeStrategy.flipCount + highValueStrategy.flipCount}
            </div>
            <div className="text-gray-400 text-sm">Total flips analyzed</div>
          </div>

          <div>
            <div className="text-2xl font-bold text-green-400">
              {(highVolumeStrategy.totalProfit + highValueStrategy.totalProfit).toLocaleString()}
            </div>
            <div className="text-gray-400 text-sm">Combined GP earned</div>
          </div>
        </div>
      </div>

      {/* Item Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ItemBreakdown items={highVolumeStrategy.flips} color="blue" strategyName="High Volume" />

        <ItemBreakdown items={highValueStrategy.flips} color="green" strategyName="High Value" />
      </div>

      {/* Strategy Insights */}
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
        <h3 className="font-semibold text-white mb-3">Strategy Insights</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-blue-400 font-medium mb-2">High Volume Strategy</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• Focuses on high-turnover items (1000+ quantity)</li>
              <li>• Lower profit per flip, higher frequency</li>
              <li>• Better for market liquidity and consistent returns</li>
              <li>
                • Avg time per flip:{' '}
                {(highVolumeStrategy.totalTime / highVolumeStrategy.flipCount).toFixed(1)} minutes
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-green-400 font-medium mb-2">High Value Strategy</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• Focuses on high-margin items (&lt;100 quantity)</li>
              <li>• Higher profit per flip, lower frequency</li>
              <li>• Better for maximizing profit per transaction</li>
              <li>
                • Avg time per flip:{' '}
                {(highValueStrategy.totalTime / highValueStrategy.flipCount).toFixed(1)} minutes
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
