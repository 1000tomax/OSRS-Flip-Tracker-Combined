import React, { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import ChartFullscreenModal from './ChartFullscreenModal';

export default function GuestWinRateChart({ guestData }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Process data for win rate chart
  const winRateData = useMemo(() => {
    if (!guestData?.flipsByDate) return [];

    const dailyData = [];

    // Process flips by date
    Object.entries(guestData.flipsByDate).forEach(([date, dayData]) => {
      const flips = Array.isArray(dayData) ? dayData : dayData.flips || [];

      if (!Array.isArray(flips) || flips.length === 0) return;

      let totalFlips = 0;
      let profitableFlips = 0;
      let totalProfit = 0;

      flips.forEach(flip => {
        const profit = flip.profit || 0;
        totalFlips += 1;
        totalProfit += profit;

        if (profit > 0) {
          profitableFlips += 1;
        }
      });

      if (totalFlips > 0) {
        dailyData.push({
          date,
          winRate: (profitableFlips / totalFlips) * 100,
          totalFlips,
          profitableFlips,
          totalProfit,
        });
      }
    });

    // Sort by date and add day numbers
    return dailyData
      .sort((a, b) => {
        // Sort dates properly considering year (MM-DD-YYYY format)
        const [aMonth, aDay, aYear] = a.date.split('-');
        const [bMonth, bDay, bYear] = b.date.split('-');
        const dateA = new Date(aYear, aMonth - 1, aDay);
        const dateB = new Date(bYear, bMonth - 1, bDay);
        return dateA - dateB;
      })
      .map((day, index) => {
        // Format date for display (MM/DD/YYYY)
        const dateObj = new Date(day.date);
        const displayDate = `${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getDate().toString().padStart(2, '0')}/${dateObj.getFullYear()}`;

        return {
          ...day,
          dayNumber: index + 1,
          displayLabel: `Day ${index + 1}`, // Use day numbers for cleaner axis
          displayDate, // Keep actual date for tooltip
        };
      });
  }, [guestData]);

  // Calculate average win rate
  const avgWinRate = useMemo(() => {
    if (winRateData.length === 0) return 0;
    const totalFlips = winRateData.reduce((acc, day) => acc + day.totalFlips, 0);
    const totalProfitable = winRateData.reduce((acc, day) => acc + day.profitableFlips, 0);
    return totalFlips > 0 ? (totalProfitable / totalFlips) * 100 : 0;
  }, [winRateData]);

  if (winRateData.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-600 rounded-xl p-6">
        <h2 className="text-xl font-bold mb-4">% of Profitable Trades</h2>
        <p className="text-gray-400">No data available</p>
      </div>
    );
  }

  const chartContent = (
    <>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={winRateData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="displayLabel"
              stroke="#9CA3AF"
              tick={false} // Hide individual tick labels
              label={{
                value:
                  winRateData.length > 0
                    ? `${winRateData[0].displayDate} - ${winRateData[winRateData.length - 1].displayDate}`
                    : '',
                position: 'insideBottom',
                offset: -5,
                style: { textAnchor: 'middle', fill: '#9CA3AF', fontSize: 14, fontWeight: 500 },
              }}
            />
            <YAxis
              stroke="#9CA3AF"
              domain={[
                dataMin => Math.max(0, Math.floor(dataMin * 0.9)), // 10% below min, but not below 0
                dataMax => Math.min(100, Math.ceil(dataMax * 1.1)), // 10% above max, but not above 100
              ]}
              tickFormatter={value => `${value}%`}
              label={{
                value: 'Win Rate (%)',
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
              formatter={(value, name) => {
                if (name === 'winRate') {
                  return [`${value.toFixed(1)}%`, 'Win Rate'];
                }
                return [value, name];
              }}
              labelFormatter={label => label}
              content={props => {
                const { active, payload, label } = props;
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-gray-900 border border-gray-600 rounded-lg p-3 shadow-lg">
                      <p className="text-white font-medium">{data.displayDate}</p>
                      <p className="text-gray-400 text-xs">{label}</p>
                      <p className="text-yellow-400">Win Rate: {data.winRate.toFixed(1)}%</p>
                      <p className="text-gray-300 text-sm">
                        {data.profitableFlips} / {data.totalFlips} profitable
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            {/* Average win rate reference line */}
            <ReferenceLine
              y={avgWinRate}
              stroke="#6B7280"
              strokeDasharray="5 5"
              label={{
                value: `Avg: ${avgWinRate.toFixed(0)}%`,
                position: 'right',
                style: { fill: '#9CA3AF', fontSize: 11 },
              }}
            />
            {/* 50% reference line */}
            <ReferenceLine y={50} stroke="#374151" strokeDasharray="3 3" />
            <Line
              type="monotone"
              dataKey="winRate"
              stroke="#F59E0B"
              strokeWidth={2}
              dot={{ fill: '#F59E0B', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        <div className="bg-gray-900/50 rounded p-2">
          <p className="text-xs text-gray-400">Best Day</p>
          <p className="text-sm font-bold text-green-400">
            {Math.max(...winRateData.map(d => d.winRate)).toFixed(1)}%
          </p>
        </div>
        <div className="bg-gray-900/50 rounded p-2">
          <p className="text-xs text-gray-400">Average</p>
          <p className="text-sm font-bold text-yellow-400">{avgWinRate.toFixed(1)}%</p>
        </div>
        <div className="bg-gray-900/50 rounded p-2">
          <p className="text-xs text-gray-400">Worst Day</p>
          <p className="text-sm font-bold text-red-400">
            {Math.min(...winRateData.map(d => d.winRate)).toFixed(1)}%
          </p>
        </div>
      </div>
    </>
  );

  return (
    <>
      <div className="bg-gray-800 border border-gray-600 rounded-xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">% of Profitable Trades</h2>
            <p className="text-sm text-gray-400 mt-1">
              Daily win rate trend (Average: {avgWinRate.toFixed(1)}%)
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
        title="% of Profitable Trades"
      >
        {chartContent}
      </ChartFullscreenModal>
    </>
  );
}
