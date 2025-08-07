// src/components/WeekdayPerformanceChart.jsx - Fixed with Percentage Returns
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import useDailySummaries from '../hooks/useDailySummaries';
import LoadingSpinner, { ErrorMessage } from './LoadingSpinner';

export default function WeekdayPerformanceChart() {
  const { summaries, loading, error } = useDailySummaries();

  if (loading) {
    return (
      <div className="bg-gray-800 border border-gray-600 rounded-xl p-4 sm:p-6">
        <LoadingSpinner size="medium" text="Loading weekday analysis..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 border border-gray-600 rounded-xl p-4 sm:p-6">
        <ErrorMessage 
          title="Failed to load weekday analysis"
          error={error}
        />
      </div>
    );
  }

  // Calculate ROI per weekday using existing roi_percent data
  const weekdayData = {};
  const weekdayStats = {};

  summaries
    .filter(day => day.day >= 8) // Exclude first week (days 1-7) to avoid early outliers
    .forEach(day => {
      // Parse date and get day of week
      const [mm, dd, yyyy] = day.date.split('-');
      const date = new Date(yyyy, mm - 1, dd); // Month is 0-indexed
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      
      // Use the existing ROI calculation from daily summaries
      const dailyROI = day.roi_percent;
      
      if (!weekdayData[dayName]) {
        weekdayData[dayName] = [];
        weekdayStats[dayName] = { totalDays: 0, totalROI: 0, totalFlips: 0, totalProfit: 0 };
      }
      
      weekdayData[dayName].push({
        roi: dailyROI,
        profit: day.profit,
        flips: day.flips,
        date: day.date
      });
      
      weekdayStats[dayName].totalDays++;
      weekdayStats[dayName].totalROI += dailyROI;
      weekdayStats[dayName].totalFlips += day.flips;
      weekdayStats[dayName].totalProfit += day.profit;
    });

  // Calculate averages and prepare chart data
  const chartData = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    .map(dayName => {
      const stats = weekdayStats[dayName];
      if (!stats || stats.totalDays === 0) {
        return {
          day: dayName.slice(0, 3), // Abbreviated for mobile
          avgReturn: 0,
          avgProfit: 0,
          avgFlips: 0,
          sampleSize: 0
        };
      }
      
      return {
        day: dayName.slice(0, 3),
        avgROI: stats.totalROI / stats.totalDays,
        avgProfit: stats.totalProfit / stats.totalDays,
        avgFlips: stats.totalFlips / stats.totalDays,
        sampleSize: stats.totalDays,
        fullDay: dayName
      };
    })
    .filter(day => day.sampleSize > 0); // Only show days with data

  // Find best/worst days
  const bestDay = chartData.reduce((best, current) => 
    current.avgROI > best.avgROI ? current : best, chartData[0] || {});
  const worstDay = chartData.reduce((worst, current) => 
    current.avgROI < worst.avgROI ? current : worst, chartData[0] || {});

  // Format GP values
  const formatGP = (value) => {
    if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + "M";
    if (value >= 1_000) return (value / 1_000).toFixed(0) + "K";
    return value.toFixed(0);
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-900 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium">{data.fullDay}</p>
          <p className="text-yellow-400">
            Avg ROI: <span className="font-mono">{data.avgROI.toFixed(2)}%</span>
          </p>
          <p className="text-green-400">
            Avg Profit: <span className="font-mono">{formatGP(data.avgProfit)} GP</span>
          </p>
          <p className="text-gray-300">
            Avg Flips: <span className="font-mono">{data.avgFlips.toFixed(0)}</span>
          </p>
          <p className="text-gray-400 text-xs">
            Sample: {data.sampleSize} day{data.sampleSize !== 1 ? 's' : ''}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-xl p-4 sm:p-6">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-white mb-1">📅 Weekday Performance Analysis</h2>
        <p className="text-sm text-gray-400">Average daily ROI by day of the week (excludes first week of challenge)</p>
      </div>
      
      {/* Stats Summary */}
      {chartData.length > 0 && (
        <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="bg-gray-700 rounded-lg p-2">
            <div className="text-green-400 font-medium">🏆 Best Day</div>
            <div className="text-white">{bestDay.fullDay}: {bestDay.avgROI.toFixed(2)}% avg ROI</div>
          </div>
          <div className="bg-gray-700 rounded-lg p-2">
            <div className="text-red-400 font-medium">📉 Worst Day</div>
            <div className="text-white">{worstDay.fullDay}: {worstDay.avgROI.toFixed(2)}% avg ROI</div>
          </div>
        </div>
      )}
      
      <div className="h-64 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="day" 
              stroke="#9CA3AF"
              fontSize={12}
              tickLine={false}
            />
            <YAxis 
              stroke="#9CA3AF"
              fontSize={12}
              tickLine={false}
              tickFormatter={(value) => `${value.toFixed(1)}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="avgROI" 
              fill="#F59E0B"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
        <div className="text-sm text-gray-500">
        💡 Shows average daily ROI percentage. Higher bars = more efficient flipping days!
      </div>
    </div>
  );
}