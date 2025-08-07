// src/pages/FlipLogs.jsx - Updated with Modern Container Styling
import React from 'react';
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

  const { data: summaryDates, loading: summaryLoading, error: summaryError } = useJsonData("/data/summary-index.json");

  const { month, day, year } = date ? parseDateParts(date) : {};
  const csvPath = date ? `/data/processed-flips/${year}/${month}/${day}/flips.csv` : null;
  const { data: flips, loading: flipsLoading, error: flipsError } = useCsvData(csvPath);

  const isLoading = summaryLoading || flipsLoading;
  const hasError = summaryError || flipsError;

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

  const validFlips = flips
    .filter(f => f.closed_quantity > 0 && f.received_post_tax > 0)
    .sort((a, b) => new Date(a.closed_time) - new Date(b.closed_time));

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

        {date && validFlips.length === 0 && !isLoading && !hasError && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📭</div>
            <p className="text-gray-400 text-lg">No flips found for {date}</p>
          </div>
        )}

        {/* Flips List */}
        {date && validFlips.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-700 pb-3">
              <h2 className="text-xl font-bold text-white">Flips for {date}</h2>
              <span className="text-sm text-gray-400">{validFlips.length} flips</span>
            </div>
            
            <div className="grid gap-3">
              {validFlips.map((flip, i) => {
                const open = flip.opened_time ? new Date(flip.opened_time) : null;
                const close = flip.closed_time ? new Date(flip.closed_time) : null;

                const openTime = open
                  ? open.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
                  : "—";
                const closeTime = close
                  ? close.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
                  : "—";
                
                const duration = open && close ? formatDuration(close - open) : "—";
                const profit = Number(flip.profit);
                const isProfit = profit > 0;

                return (
                  <div
                    key={i}
                    className="bg-gray-800 border border-gray-600 rounded-xl p-3 sm:p-4 hover:ring-2 hover:ring-yellow-500 transition duration-150 min-w-0"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3 min-w-0">
                      <h3 className="font-bold text-base sm:text-lg text-white truncate flex-1 mr-2 min-w-0">
                        {flip.item_name}
                      </h3>
                      <div className={`px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-medium flex-shrink-0 ${
                        isProfit ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                      }`}>
                        {isProfit ? '+' : ''}{formatGP(profit)} GP
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                      <div className="min-w-0">
                        <span className="text-gray-400 block">Quantity:</span>
                        <span className="text-white font-medium">{flip.closed_quantity}</span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-gray-400 block">Duration:</span>
                        <span className="text-white font-medium">{duration}</span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-gray-400 block">Opened:</span>
                        <span className="text-white font-medium">{openTime}</span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-gray-400 block">Closed:</span>
                        <span className="text-white font-medium">{closeTime}</span>
                      </div>
                    </div>

                    {/* Financial Details */}
                    <div className="mt-3 pt-3 border-t border-gray-700 grid grid-cols-1 gap-2 sm:gap-3 text-xs sm:text-sm">
                      <div className="flex justify-between min-w-0">
                        <span className="text-gray-400">Spent:</span>
                        <span className="text-white font-medium font-mono">{formatGP(flip.spent)} GP</span>
                      </div>
                      <div className="flex justify-between min-w-0">
                        <span className="text-gray-400">Post-Tax Received:</span>
                        <span className="text-white font-medium font-mono">{formatGP(flip.received_post_tax)} GP</span>
                      </div>
                      <div className="flex justify-between min-w-0">
                        <span className="text-gray-400">Tax Paid:</span>
                        <span className="text-white font-medium font-mono">{formatGP(flip.tax_paid)} GP</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}