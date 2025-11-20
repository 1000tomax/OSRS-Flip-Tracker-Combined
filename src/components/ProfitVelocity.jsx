import React, { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatGP } from '../utils/formatUtils';
import ChartFullscreenModal from './ChartFullscreenModal';

export default function ProfitVelocity({ guestData, showMethodologyHint = false }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Process data for the velocity chart
  const velocityData = useMemo(() => {
    if (!guestData?.flipsByDate) return [];

    const dailyData = {};

    // Process flips by date
    Object.entries(guestData.flipsByDate).forEach(([date, dayData]) => {
      const flips = Array.isArray(dayData) ? dayData : dayData.flips || [];

      if (!Array.isArray(flips)) return;

      let totalProfit = 0;
      let flipCount = 0;
      let profitableFlips = 0;
      let totalDurationMinutes = 0;
      let flipsWithDuration = 0;

      flips.forEach(flip => {
        const profit = flip.profit || 0;
        totalProfit += profit;
        flipCount += 1;

        if (profit > 0) {
          profitableFlips += 1;
        }

        // Try to calculate duration if timestamps exist
        const firstBuy = flip.firstBuyTime || flip.first_buy_time;
        const lastSell = flip.lastSellTime || flip.last_sell_time;

        if (firstBuy && lastSell) {
          const buyTime = new Date(firstBuy);
          const sellTime = new Date(lastSell);

          if (!isNaN(buyTime.getTime()) && !isNaN(sellTime.getTime())) {
            const durationMinutes = (sellTime - buyTime) / (1000 * 60);

            if (durationMinutes > 0 && durationMinutes < TIME.MINUTES_PER_WEEK) {
              // Cap at 1 week
              totalDurationMinutes += durationMinutes;
              flipsWithDuration += 1;
            }
          }
        }
      });

      if (flipCount > 0) {
        dailyData[date] = {
          date,
          totalProfit,
          flipCount,
          profitableFlips,
          totalDurationMinutes,
          flipsWithDuration,
        };
      }
    });

    // Sort by date and calculate GP/Hour
    const sortedDays = Object.values(dailyData)
      .sort((a, b) => {
        // Sort dates properly considering year (MM-DD-YYYY format)
        const [aMonth, aDay, aYear] = a.date.split('-');
        const [bMonth, bDay, bYear] = b.date.split('-');
        const dateA = new Date(aYear, aMonth - 1, aDay);
        const dateB = new Date(bYear, bMonth - 1, bDay);
        return dateA - dateB;
      })
      .map((day, index) => {
        const dayNumber = index + 1;

        // Calculate GP/Hour if we have duration data
        let gpPerHour = 0;
        if (day.flipsWithDuration > 0 && day.totalDurationMinutes > 0) {
          // Divide by 8 to estimate active trading time (accounting for parallel GE slots)
          const estimatedActiveMinutes = day.totalDurationMinutes / TRADING.PARALLEL_SLOTS;
          gpPerHour = (day.totalProfit / estimatedActiveMinutes) * 60;
        }

        // Format date for display
        const dateObj = new Date(day.date);
        const displayDate = `${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getDate().toString().padStart(2, '0')}/${dateObj.getFullYear()}`;

        return {
          ...day,
          dayNumber,
          displayLabel: `Day ${dayNumber}`, // Back to day numbers for cleaner display
          displayDate, // Keep the actual date for tooltips
          gpPerHour,
          // Fallback to daily profit if no timing data
          displayValue: gpPerHour > 0 ? gpPerHour : day.totalProfit,
          hasTimingData: day.flipsWithDuration > 0,
        };
      });

    return sortedDays;
  }, [guestData]);

  // Check if we have any timing data
  const hasAnyTimingData = velocityData.some(day => day.hasTimingData);

  if (velocityData.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-600 rounded-xl p-6">
        <h2 className="text-xl font-bold mb-4">Daily Profit Velocity</h2>
        <p className="text-gray-400">No data available for velocity analysis</p>
      </div>
    );
  }

  const chartContent = (
    <>
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={velocityData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="displayLabel"
              stroke="#9CA3AF"
              tick={false} // Hide individual tick labels
              label={{
                value:
                  velocityData.length > 0
                    ? `${velocityData[0].displayDate} - ${velocityData[velocityData.length - 1].displayDate}`
                    : '',
                position: 'insideBottom',
                offset: -5,
                style: { textAnchor: 'middle', fill: '#9CA3AF', fontSize: 14, fontWeight: 500 },
              }}
            />
            <YAxis
              stroke="#9CA3AF"
              tickFormatter={formatGP}
              label={{
                value: hasAnyTimingData ? 'GP/Hour' : 'Daily Profit',
                angle: -90,
                position: 'insideLeft',
                style: { textAnchor: 'middle', fill: '#9CA3AF', fontSize: 12 },
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '8px',
              }}
              content={props => {
                const { active, payload, label } = props;
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-gray-900 border border-gray-600 rounded-lg p-3 shadow-lg">
                      <p className="text-white font-medium">{data.displayDate}</p>
                      <p className="text-gray-400 text-xs">{label}</p>
                      <p className="text-green-400">
                        {hasAnyTimingData ? 'GP/Hour' : 'Profit'}:{' '}
                        {formatGP(Math.round(data.displayValue))}
                      </p>
                      <p className="text-gray-300 text-sm">Flips: {data.flipCount}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Line
              type="monotone"
              dataKey="displayValue"
              stroke="#10B981"
              strokeWidth={2}
              dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {hasAnyTimingData && showMethodologyHint && (
        <div className="mt-4 bg-blue-900/20 border border-blue-600/30 rounded-lg p-3">
          <p className="text-sm text-blue-300">
            <span className="font-semibold">📊 Note:</span> Our GP/Hour calculation may differ from
            Flipping Copilot's numbers.
            <button
              onClick={() => {
                // Find and click the methodology button in the performance analysis component
                const methodButton = document.querySelector('[data-methodology-button]');
                if (methodButton) {
                  methodButton.click();
                } else {
                  // Scroll to the stats cards where the button is
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className="ml-2 text-blue-400 hover:text-blue-300 underline font-medium"
            >
              See why the numbers differ →
            </button>
          </p>
        </div>
      )}

      {!hasAnyTimingData && (
        <p className="text-xs text-gray-500 mt-3 text-center">
          💡 GP/Hour calculation requires timestamp data. Showing daily profit instead.
        </p>
      )}
    </>
  );

  return (
    <>
      <div className="bg-gray-800 border border-gray-600 rounded-xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">
              {hasAnyTimingData ? 'Daily Profit Velocity' : 'Daily Profit Trend'}
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              {hasAnyTimingData
                ? 'GP per hour efficiency across trading days'
                : 'Daily profit performance across trading days'}
            </p>
          </div>
          <button
            onClick={() => setIsFullscreen(true)}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors group"
            title="Maximize chart"
          >
            <svg
              className="w-5 h-5 text-gray-400 group-hover:text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
              />
            </svg>
          </button>
        </div>

        {chartContent}
      </div>

      <ChartFullscreenModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        title={hasAnyTimingData ? 'Daily Profit Velocity' : 'Daily Profit Trend'}
      >
        {chartContent}
      </ChartFullscreenModal>
    </>
  );
}
import { TIME, TRADING } from '@/config/constants';
