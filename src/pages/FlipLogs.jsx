// src/pages/FlipLogs.jsx - Updated with Sortable Table and Heat Map
import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCsvData } from '../hooks/useCsvData';
import { useJsonData } from '../hooks/useJsonData';
import LoadingSpinner, { ErrorMessage } from '../components/LoadingSpinner';

function parseDateParts(dateStr) {
  const [month, day, year] = dateStr.split('-');
  return { month, day, year };
}

function formatDuration(ms) {
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return `${hours}h ${remaining}m`;
}

function dateToInputValue(date) {
  if (!date) return "";
  const [mm, dd, yyyy] = date.split("-");
  return `${yyyy}-${mm}-${dd}`;
}

function formatGP(value) {
  if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(2) + "B";
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(2) + "M";
  if (value >= 1_000) return (value / 1_000).toFixed(0) + "K";
  return value?.toLocaleString?.() ?? value;
}

export default function FlipLogs() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const date = queryParams.get('date');

  const [sortField, setSortField] = useState('closed_time');
  const [sortDirection, setSortDirection] = useState('desc');

  const { data: summaryDates, loading: summaryLoading, error: summaryError } = useJsonData("/data/summary-index.json");

  const { month, day, year } = date ? parseDateParts(date) : {};
  const csvPath = date ? `/data/processed-flips/${year}/${month}/${day}/flips.csv` : null;
  const { data: flips, loading: flipsLoading, error: flipsError } = useCsvData(csvPath);

  const isLoading = summaryLoading || flipsLoading;
  const hasError = summaryError || flipsError;

  // Calculate summary stats
  const summary = useMemo(() => {
    if (!flips || flips.length === 0) return null;

    const validFlips = flips.filter(f => f.closed_quantity > 0 && f.received_post_tax > 0);
    const totalFlips = validFlips.length;
    const totalProfit = validFlips.reduce((sum, flip) => sum + (flip.received_post_tax - flip.spent), 0);

    return { totalFlips, totalProfit };
  }, [flips]);

  // Calculate heat map data
  const heatMapData = useMemo(() => {
    if (!flips || flips.length === 0) return [];

    const validFlips = flips.filter(f => f.closed_quantity > 0 && f.received_post_tax > 0 && f.closed_time);

    // Create 24 hourly buckets
    const hourlyBuckets = Array(24).fill(0).map((_, hour) => ({
      hour,
      flips: 0,
      profit: 0,
      intensity: 0
    }));

    validFlips.forEach(flip => {
      const closeTime = new Date(flip.closed_time);
      const hour = closeTime.getHours();
      const profit = flip.received_post_tax - flip.spent;

      hourlyBuckets[hour].flips += 1;
      hourlyBuckets[hour].profit += profit;
    });

    // Calculate max values for normalization
    const maxFlips = Math.max(...hourlyBuckets.map(b => b.flips));
    const maxProfit = Math.max(...hourlyBuckets.map(b => Math.abs(b.profit)));

    // Normalize intensity (0-1 scale)
    hourlyBuckets.forEach(bucket => {
      const flipIntensity = maxFlips > 0 ? bucket.flips / maxFlips : 0;
      const profitIntensity = maxProfit > 0 ? Math.abs(bucket.profit) / maxProfit : 0;
      bucket.intensity = Math.max(flipIntensity, profitIntensity * 0.7); // Weight flips slightly higher
    });

    return hourlyBuckets;
  }, [flips]);

  // Handle sorting
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Get sorted and filtered flips
  const sortedFlips = useMemo(() => {
    if (!flips) return [];

    const validFlips = flips.filter(f => f.closed_quantity > 0 && f.received_post_tax > 0);

    return validFlips.sort((a, b) => {
      let aVal, bVal;

      switch (sortField) {
        case 'item_name':
          aVal = a.item_name?.toLowerCase() || '';
          bVal = b.item_name?.toLowerCase() || '';
          break;
        case 'profit':
          aVal = (a.received_post_tax - a.spent);
          bVal = (b.received_post_tax - b.spent);
          break;
        case 'spent':
          aVal = a.spent || 0;
          bVal = b.spent || 0;
          break;
        case 'received_post_tax':
          aVal = a.received_post_tax || 0;
          bVal = b.received_post_tax || 0;
          break;
        case 'closed_quantity':
          aVal = a.closed_quantity || 0;
          bVal = b.closed_quantity || 0;
          break;
        case 'duration':
          const aDuration = (a.opened_time && a.closed_time) ?
            new Date(a.closed_time).getTime() - new Date(a.opened_time).getTime() : 0;
          const bDuration = (b.opened_time && b.closed_time) ?
            new Date(b.closed_time).getTime() - new Date(b.opened_time).getTime() : 0;
          aVal = aDuration;
          bVal = bDuration;
          break;
        case 'closed_time':
        default:
          aVal = a.closed_time ? new Date(a.closed_time).getTime() : 0;
          bVal = b.closed_time ? new Date(b.closed_time).getTime() : 0;
          break;
      }

      if (typeof aVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [flips, sortField, sortDirection]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-800 via-gray-900 to-black text-white font-sans p-4">
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 sm:p-6 shadow-lg">
          <LoadingSpinner size="large" text="Loading flip logs..." />
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-800 via-gray-900 to-black text-white font-sans p-4">
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 sm:p-6 shadow-lg">
          <ErrorMessage
            title="Failed to load flip logs"
            error={flipsError || summaryError}
            onRetry={() => window.location.reload()}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-800 via-gray-900 to-black text-white font-sans p-2 sm:p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-3 sm:p-6 shadow-lg max-w-full overflow-hidden">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-white">📋 Flip Log Viewer</h1>

        {/* Date Picker Controls */}
        {summaryDates && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
            <span className="text-sm text-gray-300 font-medium">Select date:</span>
            <div className="flex-1 sm:flex-none">
              <input
                type="date"
                className="w-full sm:w-auto bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition"
                value={dateToInputValue(date)}
                onChange={(e) => {
                  const [yyyy, mm, dd] = e.target.value.split("-");
                  const formatted = `${mm}-${dd}-${yyyy}`;
                  navigate(`/flip-logs?date=${formatted}`);
                }}
              />
            </div>
          </div>
        )}

        {/* Content States */}
        {!date && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📅</div>
            <p className="text-gray-400 text-lg">Please select a date to view flip logs</p>
          </div>
        )}

        {date && sortedFlips.length === 0 && !isLoading && !hasError && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📭</div>
            <p className="text-gray-400 text-lg">No flips found for {date}</p>
          </div>
        )}

        {/* Trading Summary - Removed Sessions */}
        {date && summary && (
          <div className="mb-6">
            <div className="text-xl font-bold text-white mb-4">Trading Timeline for {date}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-blue-400">{summary.totalFlips}</div>
                <div className="text-sm text-gray-400">flips</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl sm:text-3xl font-bold ${summary.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatGP(summary.totalProfit)} GP
                </div>
                <div className="text-sm text-gray-400">total</div>
              </div>
            </div>

            {/* Transaction Heat Map */}
            {heatMapData.length > 0 && (
              <div className="mb-6">
                {/* Time markers */}
                <div className="flex justify-between items-center mb-2 px-1">
                  {['12a', '3a', '6a', '9a', '12p', '3p', '6p', '9p'].map((time, i) => (
                    <div key={time} className="text-xs text-gray-400 font-medium">
                      {time}
                    </div>
                  ))}
                </div>

                {/* Heat map bars container */}
                <div className="flex gap-1 h-8 items-end">
                  {heatMapData.map((bucket, i) => {
                    const intensity = bucket.intensity;
                    const height = Math.max(4, intensity * 100); // Min height for visibility
                    const isGreen = bucket.profit >= 0;

                    return (
                      <div
                        key={i}
                        className={`flex-1 rounded-sm transition-all duration-200 ${
                          intensity > 0
                            ? isGreen
                              ? 'bg-green-500 hover:bg-green-400'
                              : 'bg-red-500 hover:bg-red-400'
                            : 'bg-gray-700'
                        }`}
                        style={{
                          height: `${height}%`,
                          opacity: intensity > 0 ? Math.max(0.3, intensity) : 0.2
                        }}
                        title={`${bucket.hour}:00 - ${bucket.flips} flips, ${formatGP(bucket.profit)} GP`}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Flips Table */}
        {date && sortedFlips.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-700 pb-3">
              <h2 className="text-xl font-bold text-white">Individual Flips ({sortedFlips.length})</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full bg-gray-800 rounded-lg overflow-hidden">
                <thead className="bg-gray-700">
                  <tr>
                    <th
                      className="px-4 py-3 text-left cursor-pointer hover:bg-gray-600 transition text-sm font-medium"
                      onClick={() => handleSort('item_name')}
                    >
                      Item {sortField === 'item_name' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                    <th
                      className="px-4 py-3 text-center cursor-pointer hover:bg-gray-600 transition text-sm font-medium hidden sm:table-cell"
                      onClick={() => handleSort('closed_quantity')}
                    >
                      Qty {sortField === 'closed_quantity' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                    <th
                      className="px-4 py-3 text-right cursor-pointer hover:bg-gray-600 transition text-sm font-medium"
                      onClick={() => handleSort('profit')}
                    >
                      Profit {sortField === 'profit' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                    <th
                      className="px-4 py-3 text-right cursor-pointer hover:bg-gray-600 transition text-sm font-medium hidden md:table-cell"
                      onClick={() => handleSort('spent')}
                    >
                      Spent {sortField === 'spent' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                    <th
                      className="px-4 py-3 text-right cursor-pointer hover:bg-gray-600 transition text-sm font-medium hidden md:table-cell"
                      onClick={() => handleSort('received_post_tax')}
                    >
                      Received {sortField === 'received_post_tax' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                    <th
                      className="px-4 py-3 text-center cursor-pointer hover:bg-gray-600 transition text-sm font-medium hidden lg:table-cell"
                      onClick={() => handleSort('duration')}
                    >
                      Duration {sortField === 'duration' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                    <th
                      className="px-4 py-3 text-center cursor-pointer hover:bg-gray-600 transition text-sm font-medium hidden lg:table-cell"
                      onClick={() => handleSort('closed_time')}
                    >
                      Time {sortField === 'closed_time' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedFlips.map((flip, index) => {
                    const profit = flip.received_post_tax - flip.spent;
                    const isProfit = profit >= 0;

                    const open = flip.opened_time ? new Date(flip.opened_time) : null;
                    const close = flip.closed_time ? new Date(flip.closed_time) : null;
                    const duration = open && close ? close.getTime() - open.getTime() : null;

                    const closeTime = close
                      ? close.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
                      : "—";

                    return (
                      <tr
                        key={index}
                        className={`border-t border-gray-700 hover:bg-gray-750 transition ${
                          index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-850'
                        }`}
                      >
                        <td className="px-4 py-3 text-sm text-white font-medium">
                          {flip.item_name || 'Unknown Item'}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-300 hidden sm:table-cell">
                          {flip.closed_quantity}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-mono">
                          <span className={`font-semibold ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
                            {isProfit ? '+' : ''}{formatGP(profit)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-300 font-mono hidden md:table-cell">
                          {formatGP(flip.spent)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-300 font-mono hidden md:table-cell">
                          {formatGP(flip.received_post_tax)}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-300 hidden lg:table-cell">
                          {duration ? formatDuration(duration) : '—'}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-300 hidden lg:table-cell">
                          {closeTime}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}