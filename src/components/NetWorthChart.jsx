/**
 * NET WORTH CHART COMPONENT
 *
 * This component creates a line chart showing your net worth progression over time.
 * It's one of the most important visual indicators of your flipping journey progress.
 *
 * What it shows:
 * - X-axis: Trading days (Day 1, Day 2, etc.)
 * - Y-axis: Total net worth in GP (formatted as K, M, B)
 * - Line: Your progression from starting capital (1K) toward max cash
 *
 * Key features:
 * - Only shows complete days (excludes today if still trading)
 * - Interactive tooltip shows exact net worth and date
 * - Responsive design that works on mobile and desktop
 * - Smooth line animation with hover effects
 *
 * How it works:
 * 1. Fetches daily summary data using the useDailySummaries hook
 * 2. Filters out incomplete days using isIncompleteDay utility
 * 3. Transforms data into format needed by Recharts library
 * 4. Renders as a LineChart with custom styling and tooltip
 *
 * Educational notes:
 * - This uses the Recharts library for data visualization
 * - ResponsiveContainer makes the chart resize automatically
 * - Custom tooltip provides detailed information on hover
 * - Date parsing converts MM-DD-YYYY format to readable dates
 */
// src/components/NetWorthChart.jsx
import React, { useRef, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import useDailySummaries from '../hooks/useDailySummaries';
import LoadingSpinner, { ErrorMessage } from './LoadingSpinner';
import { isIncompleteDay } from '../lib/utils';
import { formatGP } from '../utils/formatUtils';
import { exportToImage, generateImageFilename } from '../lib/imageExport';
import { toast } from 'sonner';

export default function NetWorthChart() {
  const { summaries, loading, error } = useDailySummaries();
  const chartRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);

  if (loading) {
    return (
      <div className="bg-gray-800 border border-gray-600 rounded-xl p-4 sm:p-6">
        <LoadingSpinner size="medium" text="Loading net worth data..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 border border-gray-600 rounded-xl p-4 sm:p-6">
        <ErrorMessage title="Failed to load net worth data" error={error} />
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
      netWorth: day.net_worth,
      day: day.day || 0,
      fullDate,
    };
  });

  // Handle image export
  const handleExport = async () => {
    if (!chartRef.current) return;

    setIsExporting(true);
    try {
      const filename = generateImageFilename('osrs-networth-chart');
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
          <p className="text-white font-medium">{data.dayLabel}</p>
          <p className="text-gray-300 text-xs">{data.fullDate}</p>
          <p className="text-yellow-400">
            Net Worth: <span className="font-mono">{formatGP(data.netWorth)} GP</span>
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
          <h2 className="text-xl font-bold text-white mb-1">📈 Net Worth Progress</h2>
          <p className="text-sm text-gray-400">
            Your journey from 1K to Max Cash ({completeSummaries.length} complete days)
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
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="dayLabel" stroke="#9CA3AF" fontSize={12} tickLine={false} />
            <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} tickFormatter={formatGP} />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="netWorth"
              stroke="#F59E0B"
              strokeWidth={3}
              dot={{ fill: '#F59E0B', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: '#FCD34D' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
