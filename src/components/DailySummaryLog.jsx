import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import useDailySummaries from '../hooks/useDailySummaries';
import { useJsonData } from '../hooks/useJsonData';
import { useETACalculator } from './ETACalculator';
import LoadingSpinner, { ErrorMessage } from './LoadingSpinner';

// Simple helper function to check if a day looks incomplete
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

function formatGP(amount) {
  if (!amount || typeof amount !== 'number' || isNaN(amount)) return '0';
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(2)}M`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K`;
  return amount.toString();
}

function timeAgo(isoString) {
  const now = new Date();
  const then = new Date(isoString);
  const diffMs = now - then;
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
  if (hours >= 1) return `(${hours} hr${hours !== 1 ? "s" : ""} ago)`;
  if (minutes >= 1) return `(${minutes} min${minutes !== 1 ? "s" : ""} ago)`;
  return `(${seconds} sec${seconds !== 1 ? "s" : ""} ago)`;
}

// Helper function to convert date format for flip link
function formatDateForFlipLink(dateStr) {
  if (!dateStr) return '';

  // Handle different date formats
  // If it's already in MM-DD-YYYY format, use it directly
  if (dateStr.match(/^\d{2}-\d{2}-\d{4}$/)) {
    return dateStr;
  }

  // If it's in YYYY-MM-DD format, convert to MM-DD-YYYY
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateStr.split('-');
    return `${month}-${day}-${year}`;
  }

  // If it's in MM/DD/YYYY format, convert to MM-DD-YYYY
  if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
    const [month, day, year] = dateStr.split('/');
    return `${month.padStart(2, '0')}-${day.padStart(2, '0')}-${year}`;
  }

  return dateStr;
}

export default function DailySummaryLog() {
  const { summaries, loading: summariesLoading, error: summariesError, refetch: refetchSummaries } = useDailySummaries();
  const { data: meta, loading: metaLoading, error: metaError, refetch: refetchMeta } = useJsonData("/data/meta.json");
  const [showDayNumber, setShowDayNumber] = useState(true);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 7;
  const screenshotRef = useRef(null);

  // Show loading if either is loading
  const isLoading = summariesLoading || metaLoading;
  const hasError = summariesError || metaError;

  // Only process data if it exists
  const completeSummaries = summaries ? summaries.filter(day => !isIncompleteDay(day, summaries)) : [];
  const etaData = useETACalculator(completeSummaries, meta?.net_worth || 0);

  // Keep for error states only
  const handleRetry = () => {
    refetchSummaries();
    refetchMeta();
  };

  // Screenshot generator
  const generateScreenshot = async () => {
    if (screenshotRef.current && completeSummaries.length > 0) {
      try {
        const canvas = await html2canvas(screenshotRef.current, {
          backgroundColor: '#1f2937',
          scale: 2,
          width: 800,
          height: completeSummaries.length * 35 + 200
        });

        const link = document.createElement('a');
        link.download = `1K-to-Max-Challenge-Day-${completeSummaries.length}.png`;
        link.href = canvas.toDataURL();
        link.click();
      } catch (error) {
        console.error('Screenshot generation failed:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 sm:p-6 shadow-lg">
        <LoadingSpinner size="large" text="Loading flip summaries..." />
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 sm:p-6 shadow-lg">
        <ErrorMessage
          title="Failed to load flip data"
          error={summariesError || metaError}
          onRetry={handleRetry}
        />
      </div>
    );
  }

  // Safe array operations only after loading is complete
  const reversedSummaries = summaries ? [...summaries].reverse() : [];
  const pagedSummaries = reversedSummaries.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const percentToGoal = meta?.net_worth ? (meta.net_worth / 2147483647) * 100 : 0;
  const totalPages = Math.ceil((summaries?.length || 0) / PAGE_SIZE);

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 sm:p-6 shadow-lg">
      {/* Header Section */}
      <div className="mb-6 max-w-3xl leading-relaxed">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-white">💰 1,000 GP to Max Cash Challenge</h1>
        <p className="text-sm sm:text-base text-gray-300 mb-4">
          This dashboard tracks my flipping progress, starting from <span className="font-semibold text-white">1,000 GP</span> with the goal of reaching <span className="font-semibold text-white">2.147B</span>&nbsp;— max&nbsp;cash&nbsp;stack.
        </p>
      </div>

      <h2 className="text-xl sm:text-2xl font-bold mb-4 text-white">📅 Daily Summary Log</h2>

      {/* Last Updated Section */}
      {meta?.last_updated && (
        <div className="border-b border-gray-700 pb-4 mb-6 text-sm space-y-3">
          <div className="text-sm sm:text-base text-gray-300">
            🕒 Last Data Upload:{" "}
            <span className="font-medium text-white">
              {new Date(meta.last_updated).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })}{" "}
              <span className="text-gray-400">{timeAgo(meta.last_updated)}</span>
            </span>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm text-gray-300">📊 Challenge Progress:</p>
              <p className="text-sm sm:text-base text-white font-medium">{percentToGoal.toFixed(3)}%</p>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-5 overflow-hidden">
              <div
                className="h-5 transition-all rounded-full bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-300"
                style={{ width: `${percentToGoal}%` }}
              />
            </div>

            {/* ETA Calculator */}
            <div className="mt-3 pt-3 border-t border-gray-700">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-300">⏱️ ETA to Max Cash:</span>
                <div className="relative group">
                  <span className="text-white font-medium cursor-help">
                    {etaData.eta ? `${etaData.eta} days` : 'Calculating...'}
                  </span>

                  {/* Hover Tooltip */}
                  {etaData.estimates && (
                    <div className="absolute right-0 bottom-full mb-2 w-80 bg-gray-800 border border-gray-600 rounded-lg p-4 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                      <div className="text-xs text-white space-y-3">
                        <div className="border-b border-gray-600 pb-2">
                          <h4 className="font-semibold text-yellow-400">📊 ETA Analysis Breakdown</h4>
                          <p className="text-gray-300 mt-1">Using 3 mathematical models:</p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-300">📈 Linear Trend:</span>
                            <span className="text-white font-medium">
                              {etaData.estimates.linear ? `${etaData.estimates.linear} days` : 'N/A'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 ml-4">
                            Tracks profit acceleration as cash stack grows
                          </p>

                          <div className="flex justify-between items-center">
                            <span className="text-gray-300">📊 Exponential Growth:</span>
                            <span className="text-white font-medium">
                              {etaData.estimates.exponential ? `${etaData.estimates.exponential} days` : 'N/A'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 ml-4">
                            Models compound net worth progression
                          </p>

                          <div className="flex justify-between items-center">
                            <span className="text-gray-300">⚖️ Weighted Average:</span>
                            <span className="text-white font-medium">
                              {etaData.estimates.weighted ? `${etaData.estimates.weighted} days` : 'N/A'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 ml-4">
                            Recent performance weighted more heavily
                          </p>
                        </div>

                        <div className="border-t border-gray-600 pt-2">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-300">🎯 Final Estimate:</span>
                            <span className="text-yellow-400 font-bold">
                              {etaData.eta} days (median)
                            </span>
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-gray-300">Confidence:</span>
                            <span className="text-white">
                              {etaData.confidence === 'high' ? '🎯 High' :
                               etaData.confidence === 'medium' ? '📊 Medium' : '🤔 Low'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Tooltip Arrow */}
                      <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-800"></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        {/* View Toggle and Pagination */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-medium">View:</span>
            <button
              onClick={() => setShowDayNumber(!showDayNumber)}
              className="px-2 py-1 text-xs font-medium rounded-md transition bg-gray-700 hover:bg-gray-600 text-gray-300"
            >
              {showDayNumber ? "📅 Dates" : "📊 Days"}
            </button>
          </div>

          {/* Pagination */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(prev => Math.max(0, prev - 1))}
              disabled={page === 0}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition min-h-[32px] ${
                page === 0
                  ? "bg-gray-600 cursor-not-allowed text-gray-400"
                  : "bg-yellow-600 hover:bg-yellow-500 text-black"
              }`}
            >
              ← Prev
            </button>
            <span className="text-xs text-gray-300 px-2 font-mono">
              {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage(prev => Math.min(totalPages - 1, prev + 1))}
              disabled={page >= totalPages - 1}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition min-h-[32px] ${
                page >= totalPages - 1
                  ? "bg-gray-600 cursor-not-allowed text-gray-400"
                  : "bg-yellow-600 hover:bg-yellow-500 text-black"
              }`}
            >
              Next →
            </button>
          </div>
        </div>

        {/* Screenshot Button */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <button
            onClick={generateScreenshot}
            className="px-3 py-1.5 text-xs font-medium rounded-md transition min-h-[32px] bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1"
          >
            📸 <span className="hidden sm:inline">Full History Screenshot</span><span className="sm:hidden">Screenshot</span>
          </button>
          {summaries && completeSummaries.length < summaries.length && (
            <span className="text-xs text-gray-400 italic">
              (Excludes incomplete recent day)
            </span>
          )}
        </div>
      </div>

      {/* Daily Summary Cards */}
      <div className="flex flex-col gap-3">
        {pagedSummaries.map((s) => {
          const incomplete = isIncompleteDay(s, summaries);
          const formattedDate = formatDateForFlipLink(s?.date);

          return (
            <div
              key={s?.date || `day-${s?.day}`}
              className={`bg-gray-800 border border-gray-600 rounded-xl shadow p-4 hover:ring-2 hover:ring-yellow-500 transition duration-150 ${
                incomplete ? 'opacity-75 border-yellow-500/50' : ''
              }`}
            >
              {/* Header: Day/Date + View Flips Button */}
              <div className="flex items-center justify-between mb-2">
                <div className="font-bold text-base text-white flex items-center gap-2">
                  {showDayNumber ? `Day ${s?.day || '?'}` : (s?.date || 'Unknown')}
                  {incomplete && (
                    <span className="text-xs bg-yellow-600 text-black px-2 py-0.5 rounded-full">
                      In Progress
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    if (formattedDate) {
                      window.open(`/flip-logs?date=${formattedDate}`, '_blank');
                    }
                  }}
                  className="px-3 py-1 text-xs font-medium rounded-md bg-blue-600 hover:bg-blue-500 text-white transition"
                  disabled={!formattedDate}
                >
                  View Flips
                </button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
                <div className="flex flex-col">
                  <span className="text-gray-400">📦 Flips</span>
                  <span className="text-white">{s?.flips || 0}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-400">📋 Items</span>
                  <span className="text-white">{s?.items_flipped || 0}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-400">💰 Profit</span>
                  <span className={`${(s?.profit || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatGP(s?.profit || 0)}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-400">🏆 Net Worth</span>
                  <span className="text-white">{formatGP(s?.net_worth || 0)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-400">📈 Growth</span>
                  <span className={`${(s?.percent_change || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    +{((s?.percent_change || 0)).toFixed(2)}%
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-400">🎯 Progress</span>
                  <span className="text-white">{((s?.percent_to_goal || 0)).toFixed(2)}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Hidden Screenshot Content */}
      <div
        ref={screenshotRef}
        style={{
          position: 'fixed',
          left: '-9999px',
          width: '800px',
          backgroundColor: '#1f2937',
          color: '#ffffff',
          padding: '24px',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}
      >
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '16px',
          borderBottom: '1px solid #4b5563',
          paddingBottom: '16px'
        }}>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#fbbf24',
            margin: '0 0 8px 0'
          }}>
            💰 1,000 GP to Max Cash Challenge
          </h1>
          <p style={{
            color: '#d1d5db',
            margin: '0',
            fontSize: '14px'
          }}>
            Day {completeSummaries.length} • Current: {formatGP(completeSummaries[completeSummaries.length - 1]?.net_worth || 0)} GP •
            Goal: 2,147M GP ({((completeSummaries[completeSummaries.length - 1]?.net_worth || 0) / 2147483647 * 100).toFixed(2)}%)
          </p>
        </div>

        {/* Compact Table */}
        <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#374151' }}>
              <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #4b5563' }}>Day</th>
              <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #4b5563' }}>Flips</th>
              <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #4b5563' }}>Items</th>
              <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #4b5563' }}>Profit</th>
              <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #4b5563' }}>Net Worth</th>
              <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #4b5563' }}>Growth</th>
              <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #4b5563' }}>Progress</th>
            </tr>
          </thead>
          <tbody>
            {completeSummaries.map((s, i) => (
              <tr key={s.date} style={{ backgroundColor: i % 2 === 0 ? '#1f2937' : '#374151' }}>
                <td style={{ padding: '6px 8px', borderBottom: '1px solid #4b5563' }}>{s.day}</td>
                <td style={{ padding: '6px 8px', borderBottom: '1px solid #4b5563' }}>{s.flips || 0}</td>
                <td style={{ padding: '6px 8px', borderBottom: '1px solid #4b5563' }}>{s.items_flipped || 0}</td>
                <td style={{
                  padding: '6px 8px',
                  borderBottom: '1px solid #4b5563',
                  color: (s.profit || 0) >= 0 ? '#10b981' : '#ef4444'
                }}>
                  {formatGP(s.profit || 0)}
                </td>
                <td style={{ padding: '6px 8px', borderBottom: '1px solid #4b5563' }}>{formatGP(s.net_worth || 0)}</td>
                <td style={{
                  padding: '6px 8px',
                  borderBottom: '1px solid #4b5563',
                  color: (s.percent_change || 0) >= 0 ? '#10b981' : '#ef4444'
                }}>
                  +{((s.percent_change || 0)).toFixed(2)}%
                </td>
                <td style={{ padding: '6px 8px', borderBottom: '1px solid #4b5563' }}>{((s.percent_to_goal || 0)).toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer */}
        <div style={{
          marginTop: '16px',
          paddingTop: '16px',
          borderTop: '1px solid #4b5563',
          textAlign: 'center',
          fontSize: '12px',
          color: '#9ca3af'
        }}>
          <p style={{ margin: '0' }}>
            Total Profit: {formatGP((completeSummaries[completeSummaries.length - 1]?.net_worth || 1000) - 1000)} GP •
            Average Daily Growth: {completeSummaries.length > 0 ? ((completeSummaries.reduce((sum, day) => sum + (day.percent_change || 0), 0) / completeSummaries.length)).toFixed(2) : 0}%
          </p>
        </div>
      </div>
    </div>
  );
}