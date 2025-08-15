// src/components/NetWorthChart.jsx
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import useDailySummaries from '../hooks/useDailySummaries';
import LoadingSpinner, { ErrorMessage } from './LoadingSpinner';

// Same filtering logic as DailySummaryLog
function isIncompleteDay(day, allDays) {
  if (!day || !day.date || typeof day.flips !== 'number') {
    return true;
  }

  try {
    // Find the highest day number in the dataset
    const maxDay = allDays && allDays.length > 0
      ? Math.max(...allDays.map(d => d.day || 0))
      : day.day || 0;

    // Only mark the LATEST day as incomplete
    // Once a newer day exists, all previous days are locked and complete
    if (day.day === maxDay) {
      return true; // Latest day is always considered in progress
    }

    return false; // All previous days are complete
  } catch (e) {
    return true;
  }
}

function formatGP(value) {
  if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(2) + "B";
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(2) + "M";
  if (value >= 1_000) return (value / 1_000).toFixed(0) + "K";
  return value.toString();
}

export default function NetWorthChart() {
  const { summaries, loading, error } = useDailySummaries();

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
        <ErrorMessage
          title="Failed to load net worth data"
          error={error}
        />
      </div>
    );
  }

  // Filter out incomplete days (same logic as ETA and screenshots)
  const completeSummaries = summaries ? summaries.filter(day => !isIncompleteDay(day, summaries)) : [];

  // Prepare data for chart
  const chartData = completeSummaries.map(day => {
    // Parse MM-DD-YYYY format correctly
    const [mm, dd, yyyy] = day.date.split('-');
    const fullDate = new Date(yyyy, mm - 1, dd).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });

    return {
      dayLabel: `Day ${day.day}`,
      netWorth: day.net_worth,
      day: day.day || 0,
      fullDate
    };
  });

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
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
    <div className="bg-gray-800 border border-gray-600 rounded-xl p-4 sm:p-6">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-white mb-1">📈 Net Worth Progress</h2>
        <p className="text-sm text-gray-400">
          Your journey from 1K to Max Cash ({completeSummaries.length} complete days)
        </p>
      </div>

      <div className="h-64 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="dayLabel"
              stroke="#9CA3AF"
              fontSize={12}
              tickLine={false}
            />
            <YAxis
              stroke="#9CA3AF"
              fontSize={12}
              tickLine={false}
              tickFormatter={formatGP}
            />
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