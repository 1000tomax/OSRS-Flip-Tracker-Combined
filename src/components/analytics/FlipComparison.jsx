import React from 'react';
import { formatGP } from '../../utils/formatUtils';

export default function FlipComparison({ fastFlips, slowFlips }) {
  const ComparisonCard = ({ title, data, color }) => {
    if (!data) {
      return (
        <div className={`p-6 rounded-lg border ${color} opacity-50`}>
          <h3 className="text-lg font-semibold mb-4 text-white">{title}</h3>
          <p className="text-gray-400 text-center">No data available</p>
        </div>
      );
    }

    return (
      <div
        className={`p-6 rounded-lg border ${color} transition-all duration-200 hover:scale-[1.02]`}
      >
        <h3 className="text-lg font-semibold mb-4 text-white">{title}</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-400 mb-1">Avg ROI</p>
            <p className="text-2xl font-bold text-white">{data.avgRoi}%</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">GP/Hour</p>
            <p className="text-2xl font-bold text-white">{formatGP(data.avgGpPerHour)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Success Rate</p>
            <p className="text-2xl font-bold text-white">{data.successRate}%</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Avg Capital</p>
            <p className="text-2xl font-bold text-white">{formatGP(data.avgCapital)}</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-700">
          <p className="text-sm text-gray-300">
            <span className="font-medium text-white">{data.count}</span> flips analyzed
          </p>
        </div>
      </div>
    );
  };

  const getWinner = () => {
    if (!fastFlips || !slowFlips) return null;

    const fastScore = parseFloat(fastFlips.avgRoi) + fastFlips.avgGpPerHour / 10000;
    const slowScore = parseFloat(slowFlips.avgRoi) + slowFlips.avgGpPerHour / 10000;

    if (fastScore > slowScore) {
      return {
        type: 'fast',
        reason: 'Higher overall efficiency',
      };
    } else if (slowScore > fastScore) {
      return {
        type: 'slow',
        reason: 'Better profit margins',
      };
    }
    return {
      type: 'balanced',
      reason: 'Both strategies are equally effective',
    };
  };

  const winner = getWinner();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ComparisonCard
          title="⚡ Fast Flips (< 2 hours)"
          data={fastFlips}
          color="bg-green-900/20 border-green-700"
        />
        <ComparisonCard
          title="🐌 Slow Flips (> 6 hours)"
          data={slowFlips}
          color="bg-blue-900/20 border-blue-700"
        />
      </div>

      {winner && (fastFlips || slowFlips) && (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Recommendation</p>
              <p className="text-lg font-semibold text-white">
                {winner.type === 'fast' && '⚡ Focus on Fast Flips'}
                {winner.type === 'slow' && '🐌 Prioritize Slow Flips'}
                {winner.type === 'balanced' && '⚖️ Maintain Balanced Approach'}
              </p>
            </div>
            <p className="text-sm text-gray-300">{winner.reason}</p>
          </div>
        </div>
      )}
    </div>
  );
}
