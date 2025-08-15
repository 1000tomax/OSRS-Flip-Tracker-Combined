// src/components/DailyProfitChart.jsx
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
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

function formatDate(dateStr) {
  const [mm, dd, yyyy] = dateStr.split('-');
  return `${mm}/${dd}`;
}

export default function DailyProfitChart() {
  const { summaries, loading, error } = useDailySummaries();

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
        <ErrorMessage
          title="Failed to load profit data"
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
      profit: day.profit,
      day: day.day || 0,
      flips: day.flips,
      isProfit: day.profit >= 0,
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
    <div className="bg-gray-800 border border-gray-600 rounded-xl p-4 sm:p-6">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-white mb-1">📊 Daily Profit Breakdown</h2>
        <p className="text-sm text-gray-400">
          Track your best and worst performing days ({completeSummaries.length} complete days)
        </p>
      </div>

      <div className="h-64 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
            <Bar dataKey="profit">
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.isProfit ? '#22c55e' : '#ef4444'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}