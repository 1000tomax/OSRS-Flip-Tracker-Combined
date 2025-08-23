/**
 * DAILY PROFIT CHART COMPONENT
 *
 * This component creates a bar chart showing your daily profit/loss for each trading day.
 * It helps you identify your best and worst performing days and spot patterns.
 *
 * What it shows:
 * - X-axis: Trading days (Day 1, Day 2, etc.)
 * - Y-axis: Daily profit in GP (can be positive or negative)
 * - Bars: Green for profitable days, red for loss days
 *
 * Key features:
 * - Color-coded bars (green = profit, red = loss)
 * - Only shows complete days (excludes today if still trading)
 * - Interactive tooltip shows exact profit and number of flips
 * - Responsive design that adapts to screen size
 *
 * How it works:
 * 1. Fetches daily summary data using the useDailySummaries hook
 * 2. Filters out incomplete days to ensure accurate representation
 * 3. Transforms data and marks each day as profit/loss
 * 4. Uses Cell component to color each bar individually
 * 5. Custom tooltip shows detailed day information
 *
 * Educational notes:
 * - BarChart is better than LineChart for showing discrete daily values
 * - Cell component allows individual bar coloring
 * - isProfit boolean determines bar color (green vs red)
 * - formatDate utility converts MM-DD-YYYY to MM/DD for tooltip
 */
// src/components/DailyProfitChart.jsx
import React, { useRef, useState } from 'react';
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
import useDailySummaries from '../hooks/useDailySummaries';
import LoadingSpinner, { ErrorMessage } from './LoadingSpinner';
import { formatGP, isIncompleteDay } from '../lib/utils';
import { exportToImage, generateImageFilename } from '../lib/imageExport';

export default function DailyProfitChart() {
  const { summaries, loading, error } = useDailySummaries();
  const chartRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);

  if (loading) {
    return (
      <div className="bg-gray-800 border border-gray-600 rounded-xl p-4 sm:p-6">
        <LoadingSpinner size="medium" text="Loading profit data..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 border border-gray-600 rounded-xl p-4 sm:p-6">
        <ErrorMessage title="Failed to load profit data" error={error} />
      </div>
    );
  }

  // Filter out incomplete days (same logic as ETA and screenshots)
  const completeSummaries = summaries
    ? summaries.filter(day => !isIncompleteDay(day, summaries))
    : [];

  // Prepare data for chart
  const chartData = completeSummaries.map(day => {
    // Parse MM-DD-YYYY format correctly
    const [mm, dd, yyyy] = day.date.split('-');
    const fullDate = new Date(yyyy, mm - 1, dd).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    return {
      dayLabel: `Day ${day.day}`,
      profit: day.profit,
      day: day.day || 0,
      flips: day.flips,
      isProfit: day.profit >= 0,
      fullDate,
    };
  });

  // Handle image export
  const handleExport = async () => {
    if (!chartRef.current) return;
    
    setIsExporting(true);
    try {
      const filename = generateImageFilename('osrs-daily-profit-chart');
      await exportToImage(chartRef.current, filename);
    } catch (error) {
      console.error('Failed to export chart:', error);
      alert('Failed to export chart. Please try again.');
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
          <p className="text-white font-medium">{data.dayLabel}</p>
          <p className="text-gray-300 text-xs">{data.fullDate}</p>
          <p className={data.isProfit ? 'text-green-400' : 'text-red-400'}>
            Profit: <span className="font-mono">{formatGP(data.profit)} GP</span>
          </p>
          <p className="text-gray-300 text-sm">{data.flips} flips</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-xl p-4 sm:p-6" ref={chartRef}>
      <div className="mb-4 flex items-start justify-between">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-white mb-1">📊 Daily Profit Breakdown</h2>
          <p className="text-sm text-gray-400">
            Track your best and worst performing days ({completeSummaries.length} complete days)
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

      <div className="h-64 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="dayLabel" stroke="#9CA3AF" fontSize={12} tickLine={false} />
            <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} tickFormatter={formatGP} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="profit">
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.isProfit ? '#22c55e' : '#ef4444'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
