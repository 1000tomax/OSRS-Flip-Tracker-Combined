import React, { useMemo, useState } from 'react';
import { formatGP } from '../../utils/formatUtils';

const formatTime = minutes => {
  if (minutes >= 60) return `${(minutes / 60).toFixed(1)}h`;
  return `${minutes.toFixed(0)}m`;
};

// Methodology Modal Component
function MethodologyModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 border border-gray-600 rounded-xl p-6 max-w-2xl max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-bold text-white">GP/Hour Calculation Methodology</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">
            ×
          </button>
        </div>

        <div className="space-y-4 text-gray-300">
          <div>
            <h3 className="text-lg font-semibold text-red-400 mb-2">
              The Parallel Trading Problem
            </h3>
            <p className="mb-2 text-sm">
              When you flip, you run multiple items simultaneously across your 8 GE slots. This
              creates a calculation challenge:
            </p>
            <div className="bg-gray-900/50 rounded p-3 text-sm">
              <p className="text-yellow-300 font-semibold mb-2">Real Example:</p>
              <p>You flip 8 items, each taking 1 hour, all at the same time.</p>
              <ul className="mt-2 space-y-1 text-gray-400">
                <li>
                  • <strong className="text-white">Real time elapsed:</strong> 1 hour
                </li>
                <li>
                  • <strong className="text-white">Total flip duration:</strong> 8 hours (8 items ×
                  1 hour)
                </li>
                <li>
                  • <strong className="text-white">Without adjustment:</strong> Would show
                  impossibly low GP/hour
                </li>
              </ul>
            </div>
            <p className="mt-2 text-sm text-orange-300">
              <strong>The Problem:</strong> Simply adding up all flip durations can give you 100+
              hours in a single day!
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-yellow-400 mb-2">
              Our Solution: Estimate Active Trading Time
            </h3>
            <p className="mb-2">
              We divide total flip duration by 8 (GE slots) to estimate your{' '}
              <strong className="text-white">actual active trading time</strong>:
            </p>
            <div className="bg-gray-900/50 rounded p-3 text-sm font-mono">
              GP/Hour = Total Profit / (Total Flip Duration ÷ 8)
            </div>
            <p className="mt-2 text-sm">
              This assumes you're efficiently using your GE slots for parallel trading, which is
              standard for active flippers.
            </p>
            <div className="bg-blue-900/30 border border-blue-600/50 rounded p-3 mt-3">
              <p className="text-sm text-blue-200">
                <strong>Why 8?</strong> OSRS gives you 8 GE slots. Active flippers typically use
                most/all slots simultaneously. If you made 22M profit with 120 hours of combined
                flip time, we estimate ~15 hours of active trading (120÷8), giving you ~1.5M
                GP/hour.
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-blue-400 mb-2">
              Different Calculation Methods
            </h3>
            <p className="mb-2">
              Flipping Copilot calculates GP/Hour using{' '}
              <strong className="text-white">session duration</strong>:
            </p>
            <div className="bg-gray-900/50 rounded p-3 text-sm font-mono">
              GP/Hour = Session Profit / Session Duration
            </div>
            <p className="mt-2 text-sm">
              This includes all time during the session, whether actively flipping or doing other
              activities.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-green-400 mb-2">Understanding the Numbers</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start">
                <span className="text-green-400 mr-2">•</span>
                <span>
                  <strong>Our calculation:</strong> Total Profit ÷ (Total Flip Duration ÷ 8)
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-400 mr-2">•</span>
                <span>
                  <strong>Copilot's calculation:</strong> Session Profit ÷ Session Duration
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-yellow-400 mr-2">•</span>
                <span>
                  <strong>Key difference:</strong> We estimate active flipping time; Copilot uses
                  total session time
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-purple-400 mr-2">•</span>
                <span>
                  <strong>Result:</strong> Different numbers that measure different aspects of
                  flipping performance
                </span>
              </li>
            </ul>

            <div className="bg-gray-900/50 rounded p-3 mt-3">
              <p className="text-xs text-gray-400 mb-2">IMPORTANT ASSUMPTIONS:</p>
              <ul className="space-y-1 text-xs text-gray-400">
                <li>• Works best if you typically use 6-8 GE slots actively</li>
                <li>• Less accurate if you only flip with 1-2 slots</li>
                <li>• Assumes reasonably efficient slot management</li>
                <li>
                  • The "perfect" calculation would require tracking exact overlapping times
                  (computationally expensive)
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-orange-900/30 border border-orange-600/50 rounded p-3">
            <p className="text-sm text-orange-200">
              <strong>Note:</strong> If your CSV doesn't include timestamps (older exports), we
              can't calculate GP/Hour and will show daily averages instead.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GuestPerformanceAnalysis({ guestData }) {
  const [showMethodology, setShowMethodology] = useState(false);

  // Calculate performance metrics from guest data
  const performanceMetrics = useMemo(() => {
    if (!guestData?.flipsByDate) return null;

    // Process all flips to calculate metrics
    const allFlipsArray = [];
    const dailyMetrics = {};

    Object.entries(guestData.flipsByDate).forEach(([date, dayData]) => {
      const flips = Array.isArray(dayData) ? dayData : dayData.flips || [];

      if (!Array.isArray(flips)) return;

      // Initialize daily metrics
      dailyMetrics[date] = {
        date,
        totalProfit: 0,
        flipCount: 0,
        profitableFlips: 0,
        totalDuration: 0,
        flipsWithDuration: 0,
      };

      flips.forEach(flip => {
        const profit = flip.profit || 0;

        // Add to daily metrics
        dailyMetrics[date].totalProfit += profit;
        dailyMetrics[date].flipCount += 1;

        if (profit > 0) {
          dailyMetrics[date].profitableFlips += 1;
        }

        // Calculate duration if timestamps are available
        const firstBuy = flip.firstBuyTime || flip.first_buy_time;
        const lastSell = flip.lastSellTime || flip.last_sell_time;

        if (firstBuy && lastSell) {
          const buyTime = new Date(firstBuy);
          const sellTime = new Date(lastSell);

          if (!isNaN(buyTime.getTime()) && !isNaN(sellTime.getTime())) {
            const durationMinutes = (sellTime - buyTime) / (1000 * 60);

            if (durationMinutes > 0 && durationMinutes < 10080) {
              // Cap at 1 week
              dailyMetrics[date].totalDuration += durationMinutes;
              dailyMetrics[date].flipsWithDuration += 1;

              allFlipsArray.push({
                ...flip,
                date,
                profit,
                durationMinutes,
              });
            }
          }
        }
      });
    });

    // Calculate aggregate metrics
    const validDays = Object.values(dailyMetrics).filter(day => day.flipCount > 0);

    if (validDays.length === 0) return null;

    // Calculate GP/Hour for days with duration data
    const daysWithDuration = validDays.filter(day => day.flipsWithDuration > 0);
    let avgGpPerHour = 0;
    let maxGpPerHour = 0;

    if (daysWithDuration.length > 0) {
      const gpPerHourValues = daysWithDuration
        .map(day => {
          // Divide by 8 to account for parallel trading across GE slots
          const estimatedActiveMinutes = day.totalDuration / 8;
          return estimatedActiveMinutes > 0 ? (day.totalProfit / estimatedActiveMinutes) * 60 : 0;
        })
        .filter(v => v > 0);

      if (gpPerHourValues.length > 0) {
        avgGpPerHour = gpPerHourValues.reduce((a, b) => a + b, 0) / gpPerHourValues.length;
        maxGpPerHour = Math.max(...gpPerHourValues);
      }
    }

    // Calculate win rate
    const totalFlips = validDays.reduce((acc, day) => acc + day.flipCount, 0);
    const totalProfitableFlips = validDays.reduce((acc, day) => acc + day.profitableFlips, 0);
    const avgWinRate = totalFlips > 0 ? (totalProfitableFlips / totalFlips) * 100 : 0;

    // Calculate average flip duration
    const flipsWithDuration = allFlipsArray.filter(f => f.durationMinutes > 0);
    const avgFlipDuration =
      flipsWithDuration.length > 0
        ? flipsWithDuration.reduce((acc, f) => acc + f.durationMinutes, 0) /
          flipsWithDuration.length
        : 0;

    // Find best day
    const bestProfitDay = validDays.reduce(
      (best, day) => (day.totalProfit > (best?.totalProfit || 0) ? day : best),
      null
    );

    return {
      avgGpPerHour,
      maxGpPerHour,
      avgWinRate,
      avgFlipDuration,
      totalDays: validDays.length,
      totalFlips,
      bestProfitDay,
      hasDurationData: daysWithDuration.length > 0,
      dailyMetrics: validDays.sort((a, b) => {
        // Sort dates properly considering year (MM-DD-YYYY format)
        const [aMonth, aDay, aYear] = a.date.split('-');
        const [bMonth, bDay, bYear] = b.date.split('-');
        const dateA = new Date(aYear, aMonth - 1, aDay);
        const dateB = new Date(bYear, bMonth - 1, bDay);
        return dateA - dateB;
      }),
    };
  }, [guestData]);

  if (!performanceMetrics) {
    return (
      <div className="bg-gray-800 border border-gray-600 rounded-xl p-6">
        <p className="text-gray-400">No performance data available</p>
      </div>
    );
  }

  return (
    <>
      {/* Methodology Modal */}
      <MethodologyModal isOpen={showMethodology} onClose={() => setShowMethodology(false)} />

      {/* Performance Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm text-gray-400">
              {performanceMetrics.hasDurationData ? 'Avg GP/Hour' : 'Avg Daily Profit'}
            </h3>
            {performanceMetrics.hasDurationData && (
              <button
                onClick={() => setShowMethodology(true)}
                className="text-gray-500 hover:text-blue-400 transition-colors"
                title="How is GP/Hour calculated?"
                data-methodology-button="true"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </button>
            )}
          </div>
          <p className="text-2xl font-bold text-green-400">
            {performanceMetrics.hasDurationData
              ? formatGP(Math.round(performanceMetrics.avgGpPerHour))
              : formatGP(Math.round(guestData.totalProfit / performanceMetrics.totalDays))}
          </p>
          {performanceMetrics.hasDurationData ? (
            <button
              onClick={() => setShowMethodology(true)}
              className="text-xs text-gray-500 hover:text-blue-400 mt-1 transition-colors underline"
            >
              See calculation method
            </button>
          ) : (
            <p className="text-xs text-gray-500 mt-1">No timing data available</p>
          )}
        </div>

        <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm text-gray-400">
              {performanceMetrics.hasDurationData ? 'Peak GP/Hour' : 'Best Day Profit'}
            </h3>
            {performanceMetrics.hasDurationData && (
              <button
                onClick={() => setShowMethodology(true)}
                className="text-gray-500 hover:text-blue-400 transition-colors"
                title="How is GP/Hour calculated?"
                data-methodology-button="true"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </button>
            )}
          </div>
          <p className="text-2xl font-bold text-blue-400">
            {performanceMetrics.hasDurationData
              ? formatGP(Math.round(performanceMetrics.maxGpPerHour))
              : formatGP(performanceMetrics.bestProfitDay?.totalProfit || 0)}
          </p>
          {performanceMetrics.bestProfitDay && !performanceMetrics.hasDurationData && (
            <p className="text-xs text-gray-500 mt-1">{performanceMetrics.bestProfitDay.date}</p>
          )}
        </div>

        <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
          <h3 className="text-sm text-gray-400 mb-1">Profitable Trades</h3>
          <p className="text-2xl font-bold text-yellow-400">
            {performanceMetrics.avgWinRate.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-500 mt-1">Success rate</p>
        </div>

        <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
          <h3 className="text-sm text-gray-400 mb-1">
            {performanceMetrics.avgFlipDuration > 0 ? 'Avg Flip Time' : 'Total Flips'}
          </h3>
          <p className="text-2xl font-bold text-purple-400">
            {performanceMetrics.avgFlipDuration > 0
              ? formatTime(performanceMetrics.avgFlipDuration)
              : performanceMetrics.totalFlips.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {performanceMetrics.avgFlipDuration > 0
              ? 'Per flip'
              : `Across ${performanceMetrics.totalDays} days`}
          </p>
        </div>
      </div>

      {/* Data quality notice if no duration data */}
      {!performanceMetrics.hasDurationData && (
        <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-3 mb-6">
          <p className="text-yellow-200 text-sm">
            💡 <strong>Tip:</strong> Your CSV data doesn't include flip timing information. GP/Hour
            calculations require timestamp data from recent exports.
          </p>
        </div>
      )}
    </>
  );
}
