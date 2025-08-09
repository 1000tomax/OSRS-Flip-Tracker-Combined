import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import useDailySummaries from '../hooks/useDailySummaries';
import { useJsonData } from '../hooks/useJsonData';
import { useETACalculator } from './ETACalculator';
import LoadingSpinner, { ErrorMessage } from './LoadingSpinner';

// Simple helper function to check if a day looks incomplete
function isIncompleteDay(day) {
  if (!day || !day.date || typeof day.flips !== 'number') {
    return true;
  }

  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD format

    // Convert MM-DD-YYYY to YYYY-MM-DD for comparison
    const dateParts = day.date.split('-');
    if (dateParts.length !== 3) return true;

    const [mm, dd, yyyy] = dateParts;
    if (!mm || !dd || !yyyy) return true;

    const dayDateString = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;

    // If it's today and has very few flips, probably incomplete
    if (dayDateString === today && day.flips < 50) {
      return true;
    }

    // If it's a very recent day with suspiciously low flips
    const dayDate = new Date(dayDateString);
    if (isNaN(dayDate.getTime())) return true;

    const hoursSinceDay = (now - dayDate) / (1000 * 60 * 60);
    if (hoursSinceDay < 12 && day.flips < 30) {
      return true;
    }

    return false;
  } catch (e) {
    // If any error in date processing, assume incomplete
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
  const completeSummaries = summaries ? summaries.filter(day => !isIncompleteDay(day)) : [];
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
                <span className="text-white font-medium">
                  {etaData.eta ? `${etaData.eta} days` : 'Calculating...'}
                </span>
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
          const incomplete = isIncompleteDay(s);

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
                  onClick={() => window.open(`/flips/${s.date}`, '_blank')}
                  className="px-3 py-1 text-xs font-medium rounded-md bg-blue-600 hover:bg-blue-500 text-white transition"
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
                  <span className="text-gray-400">📊 ROI</span>
                  <span className={`${(s?.roi_percent || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    +{((s?.roi_percent || 0) * 100).toFixed(2)}%
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
              <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #4b5563' }}>Starting GP</th>
              <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #4b5563' }}>Ending GP</th>
              <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #4b5563' }}>Daily Profit</th>
              <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #4b5563' }}>ROI %</th>
              <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #4b5563' }}>Flips</th>
            </tr>
          </thead>
          <tbody>
            {completeSummaries.map((s, i) => (
              <tr key={s.date} style={{ backgroundColor: i % 2 === 0 ? '#1f2937' : '#374151' }}>
                <td style={{ padding: '6px 8px', borderBottom: '1px solid #4b5563' }}>{s.day}</td>
                <td style={{ padding: '6px 8px', borderBottom: '1px solid #4b5563' }}>{formatGP((s.net_worth || 0) - (s.profit || 0))}</td>
                <td style={{ padding: '6px 8px', borderBottom: '1px solid #4b5563' }}>{formatGP(s.net_worth || 0)}</td>
                <td style={{
                  padding: '6px 8px',
                  borderBottom: '1px solid #4b5563',
                  color: (s.profit || 0) >= 0 ? '#10b981' : '#ef4444'
                }}>
                  {(s.profit || 0) >= 0 ? '+' : ''}{formatGP(s.profit || 0)}
                </td>
                <td style={{
                  padding: '6px 8px',
                  borderBottom: '1px solid #4b5563',
                  color: (s.roi_percent || 0) >= 0 ? '#10b981' : '#ef4444'
                }}>
                  {((s.roi_percent || 0) * 100).toFixed(2)}%
                </td>
                <td style={{ padding: '6px 8px', borderBottom: '1px solid #4b5563' }}>{s.flips || 0}</td>
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
            Average Daily ROI: {completeSummaries.length > 0 ? ((completeSummaries.reduce((sum, day) => sum + day.roi_percent, 0) / completeSummaries.length) * 100).toFixed(2) : 0}%
          </p>
        </div>
      </div>
    </div>
  );
}