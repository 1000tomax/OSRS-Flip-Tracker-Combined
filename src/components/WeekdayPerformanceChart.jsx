/**
 * WEEKDAY PERFORMANCE CHART COMPONENT
 *
 * This component analyzes your trading performance by day of the week to identify patterns.
 * It helps answer questions like "Do I trade better on weekends?" or "Are Mondays my worst days?"
 *
 * What it shows:
 * - X-axis: Days of the week (Mon, Tue, Wed, etc.)
 * - Y-axis: Average ROI percentage for that day of the week
 * - Bars: Height represents average ROI performance
 *
 * Key features:
 * - Excludes first week (days 1-7) to avoid early learning curve skewing data
 * - Shows best and worst performing days in summary cards
 * - Calculates averages across all instances of each weekday
 * - Interactive tooltip shows detailed statistics
 *
 * How it works:
 * 1. Fetches daily summary data and filters out first week
 * 2. Groups data by weekday using JavaScript Date methods
 * 3. Calculates average ROI, profit, and flips for each weekday
 * 4. Identifies best and worst performing days
 * 5. Renders as bar chart with summary statistics
 *
 * Educational notes:
 * - Date parsing: MM-DD-YYYY string -> Date object -> weekday name
 * - JavaScript months are 0-indexed (0=January, 11=December)
 * - Statistical analysis: grouping and averaging data
 * - Array.reduce() used for aggregating statistics by weekday
 * - Filter by sample size ensures reliable averages
 */
// src/components/WeekdayPerformanceChart.jsx - Fixed with Percentage Returns
import React, { useRef, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import useDailySummaries from '../hooks/useDailySummaries';
import LoadingSpinner, { ErrorMessage } from './LoadingSpinner';
import { formatGP } from '../utils/formatUtils';
import { exportToImage, generateImageFilename } from '../lib/imageExport';
import { toast } from 'sonner';

export default function WeekdayPerformanceChart() {
  const { summaries, loading, error } = useDailySummaries();
  const chartRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);

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
        <ErrorMessage title="Failed to load weekday analysis" error={error} />
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
        date: day.date,
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
          sampleSize: 0,
        };
      }

      return {
        day: dayName.slice(0, 3),
        avgROI: stats.totalROI / stats.totalDays,
        avgProfit: stats.totalProfit / stats.totalDays,
        avgFlips: stats.totalFlips / stats.totalDays,
        sampleSize: stats.totalDays,
        fullDay: dayName,
      };
    })
    .filter(day => day.sampleSize > 0); // Only show days with data

  // Find best/worst days
  const bestDay = chartData.reduce(
    (best, current) => (current.avgROI > best.avgROI ? current : best),
    chartData[0] || {}
  );
  const worstDay = chartData.reduce(
    (worst, current) => (current.avgROI < worst.avgROI ? current : worst),
    chartData[0] || {}
  );

  // Handle image export
  const handleExport = async () => {
    if (!chartRef.current) return;

    setIsExporting(true);
    try {
      const filename = generateImageFilename('osrs-weekday-performance-chart');
      await exportToImage(chartRef.current, filename);
    } catch (error) {
      console.error('Failed to export chart:', error);
      toast.error('Failed to export chart. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-900 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium">{data.fullDay}</p>
          <p className="text-yellow-400">
            Avg ROI: <span className="font-mono">{data.avgROI.toFixed(2)}%</span>
          </p>
          <p className="text-green-400">
            Avg Profit: <span className="font-mono">{formatGP(data.avgProfit)}</span>
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
    <div className="bg-gray-800 border border-gray-600 rounded-xl p-4 sm:p-6" ref={chartRef}>
      <div className="mb-4 flex items-start justify-between">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-white mb-1">📅 Weekday Performance Analysis</h2>
          <p className="text-sm text-gray-400">
            Average daily ROI by day of the week (excludes first week of challenge)
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="ml-4 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-700 disabled:opacity-50 text-white rounded-lg transition flex items-center gap-2 text-sm font-medium"
          title="Export chart as image"
          data-html2canvas-ignore="true"
        >
          <span>📸</span>
          <span className="hidden sm:inline">{isExporting ? 'Exporting...' : 'Export'}</span>
        </button>
      </div>

      {/* Stats Summary */}
      {chartData.length > 0 && (
        <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="bg-gray-700 rounded-lg p-2">
            <div className="text-green-400 font-medium">🏆 Best Day</div>
            <div className="text-white">
              {bestDay.fullDay}: {bestDay.avgROI.toFixed(2)}% avg ROI
            </div>
          </div>
          <div className="bg-gray-700 rounded-lg p-2">
            <div className="text-red-400 font-medium">📉 Worst Day</div>
            <div className="text-white">
              {worstDay.fullDay}: {worstDay.avgROI.toFixed(2)}% avg ROI
            </div>
          </div>
        </div>
      )}

      <div className="h-64 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="day" stroke="#9CA3AF" fontSize={12} tickLine={false} />
            <YAxis
              stroke="#9CA3AF"
              fontSize={12}
              tickLine={false}
              tickFormatter={value => `${value.toFixed(1)}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="avgROI" fill="#F59E0B" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="text-sm text-gray-500">
        💡 Shows average daily ROI percentage. Higher bars = more efficient flipping days!
      </div>
    </div>
  );
}
