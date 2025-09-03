import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

export default function GuestFlipVolumeChart({ guestData }) {
  // Process data for flip volume chart
  const volumeData = useMemo(() => {
    if (!guestData?.flipsByDate) return [];

    const dailyData = [];

    // Process flips by date
    Object.entries(guestData.flipsByDate).forEach(([date, dayData]) => {
      const flips = Array.isArray(dayData) ? dayData : dayData.flips || [];

      if (!Array.isArray(flips)) return;

      const flipCount = flips.length;
      const totalProfit = flips.reduce((sum, flip) => sum + (flip.profit || 0), 0);
      const uniqueItems = new Set(flips.map(flip => flip.item)).size;

      if (flipCount > 0) {
        dailyData.push({
          date,
          flipCount,
          totalProfit,
          uniqueItems,
        });
      }
    });

    // Sort by date and add day numbers
    return dailyData
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map((day, index) => {
        // Format date for display (MM/DD/YYYY)
        const dateObj = new Date(day.date);
        const displayDate = `${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getDate().toString().padStart(2, '0')}/${dateObj.getFullYear()}`;

        return {
          ...day,
          dayNumber: index + 1,
          displayLabel: `Day ${index + 1}`, // Use day numbers for cleaner axis
          displayDate, // Keep actual date for tooltip
          // Color based on profit
          barColor: day.totalProfit >= 0 ? '#22c55e' : '#ef4444',
        };
      });
  }, [guestData]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (volumeData.length === 0) return null;

    const flipCounts = volumeData.map(d => d.flipCount);
    const avgFlips = flipCounts.reduce((a, b) => a + b, 0) / flipCounts.length;
    const maxFlips = Math.max(...flipCounts);
    const minFlips = Math.min(...flipCounts);
    const totalFlips = flipCounts.reduce((a, b) => a + b, 0);

    return {
      avgFlips: Math.round(avgFlips),
      maxFlips,
      minFlips,
      totalFlips,
      bestDay: volumeData.find(d => d.flipCount === maxFlips),
    };
  }, [volumeData]);

  if (volumeData.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-600 rounded-xl p-6">
        <h2 className="text-xl font-bold mb-4">Daily Flip Volume</h2>
        <p className="text-gray-400">No data available</p>
      </div>
    );
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-900 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium">{data.displayDate}</p>
          <p className="text-gray-400 text-xs">{data.displayLabel}</p>
          <p className="text-purple-400">
            Flips: <span className="font-bold">{data.flipCount}</span>
          </p>
          <p className="text-gray-300 text-sm">Items: {data.uniqueItems}</p>
          <p className={data.totalProfit >= 0 ? 'text-green-400 text-sm' : 'text-red-400 text-sm'}>
            Profit: {data.totalProfit.toLocaleString()} GP
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-xl p-6">
      <div className="mb-4">
        <h2 className="text-xl font-bold">Daily Flip Volume</h2>
        <p className="text-sm text-gray-400 mt-1">Number of flips completed per day</p>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={volumeData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="displayLabel"
              stroke="#9CA3AF"
              tick={false} // Hide individual tick labels
              label={{
                value:
                  volumeData.length > 0
                    ? `${volumeData[0].displayDate} - ${volumeData[volumeData.length - 1].displayDate}`
                    : '',
                position: 'insideBottom',
                offset: -5,
                style: { textAnchor: 'middle', fill: '#9CA3AF', fontSize: 14, fontWeight: 500 },
              }}
            />
            <YAxis
              stroke="#9CA3AF"
              label={{
                value: 'Number of Flips',
                angle: -90,
                position: 'insideLeft',
                style: { textAnchor: 'middle', fill: '#9CA3AF', fontSize: 12 },
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="flipCount" radius={[4, 4, 0, 0]}>
              {volumeData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.barColor} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {stats && (
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div className="bg-gray-900/50 rounded p-2">
            <p className="text-xs text-gray-400">Most Active</p>
            <p className="text-sm font-bold text-purple-400">{stats.maxFlips} flips</p>
            <p className="text-xs text-gray-500">{stats.bestDay?.displayLabel}</p>
          </div>
          <div className="bg-gray-900/50 rounded p-2">
            <p className="text-xs text-gray-400">Average</p>
            <p className="text-sm font-bold text-blue-400">{stats.avgFlips} flips/day</p>
          </div>
          <div className="bg-gray-900/50 rounded p-2">
            <p className="text-xs text-gray-400">Total Volume</p>
            <p className="text-sm font-bold text-green-400">
              {stats.totalFlips.toLocaleString()} flips
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
