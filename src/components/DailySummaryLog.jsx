// src/components/DailySummaryLog.jsx - Complete with improved header
import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { useJsonData } from '../hooks/useJsonData';
import LoadingSpinner, { ErrorMessage } from './LoadingSpinner';

const PAGE_SIZE = 10;

export default function DailySummaryLog() {
  // Using compact summary for fast loading
  const { data: summaries, loading: summariesLoading, error: summariesError } = useJsonData('/data/summaries-compact.json');
  const { data: meta, loading: metaLoading, error: metaError } = useJsonData('/data/meta.json');
  
  const [page, setPage] = useState(0);
  const [showDayNumber, setShowDayNumber] = useState(true);
  const screenshotRef = useRef(null);

  const isLoading = summariesLoading || metaLoading;
  const error = summariesError || metaError;

  if (isLoading) {
    return (
      <div className="flex flex-col justify-start w-full pt-4 px-2 sm:px-0">
        <LoadingSpinner size="large" text="Loading daily summaries..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-start w-full pt-4 px-2 sm:px-0">
        <ErrorMessage 
          title="Failed to load daily summaries"
          error={error}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  if (!summaries || summaries.length === 0) {
    return (
      <div className="flex flex-col justify-start w-full pt-4 px-2 sm:px-0">
        <div className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center">
          <div className="text-4xl mb-2">📊</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Data Yet</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Daily summaries will appear here once you process your first flips.csv file.
          </p>
        </div>
      </div>
    );
  }

  // Reverse for newest-first display
  const reversedSummaries = [...summaries].reverse();
  const pagedSummaries = reversedSummaries.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const formatGP = (value) => {
    const abs = Math.abs(value);
    if (abs >= 1_000_000_000) return (value / 1_000_000_000).toFixed(2) + 'B';
    if (abs >= 1_000_000) return (value / 1_000_000).toFixed(2) + 'M';
    if (abs >= 1_000) return (value / 1_000).toFixed(0) + 'K';
    return value?.toLocaleString?.() ?? value;
  };

  const formatPercent = (value) => {
    const prefix = value > 0 ? '+' : '';
    return `${prefix}${value.toFixed(2)}%`;
  };

  const formatProgress = (value) => {
    return `${value.toFixed(4)}%`;
  };

  const generateScreenshot = async () => {
    try {
      const element = screenshotRef.current;
      if (!element) return;

      console.log('Generating screenshot...');
      const canvas = await html2canvas(element, {
        backgroundColor: '#1f2937',
        scale: 1,
        logging: false,
        useCORS: true
      });

      // Download the image
      const link = document.createElement('a');
      link.download = `osrs-flipping-history-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL();
      link.click();
      
      console.log('Screenshot saved!');
    } catch (err) {
      console.error('Screenshot failed:', err);
      alert('Screenshot failed. Try using your browser\'s built-in screenshot tool instead.');
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3">
              💰 1,000 GP to Max Cash Challenge
            </h1>
            
            {/* Progress Stats - Clean Layout */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm">
              {/* Day Counter */}
              <div className="flex items-center gap-2">
                <span style={{ color: '#60a5fa' }} className="font-semibold">📅</span>
                <span className="text-gray-300">Day</span>
                <span className="font-bold text-white text-lg">{summaries.length}</span>
              </div>
              
              {/* Current Net Worth */}
              <div className="flex items-center gap-2">
                <span style={{ color: '#34d399' }} className="font-semibold">💰</span>
                <span className="text-gray-300">Current:</span>
                <span className="font-bold text-white text-lg">{formatGP(meta?.net_worth || 0)} GP</span>
              </div>
              
              {/* Goal Progress */}
              <div className="flex items-center gap-2">
                <span style={{ color: '#fbbf24' }} className="font-semibold">🎯</span>
                <span className="text-gray-300">Progress:</span>
                <span className="font-bold text-white text-lg">
                  {((meta?.net_worth || 0) / 2147483647 * 100).toFixed(2)}%
                </span>
                <span className="text-gray-400 text-xs">to 2.147B GP</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Display Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Display:</span>
            <button
              onClick={() => setShowDayNumber(!showDayNumber)}
              className="px-3 py-1.5 text-xs font-medium rounded-md transition min-h-[32px] bg-gray-600 hover:bg-gray-500 text-white"
            >
              {showDayNumber ? '📅 Show Dates' : '📊 Show Days'}
            </button>
          </div>

          {/* Pagination */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((prev) => (prev > 0 ? prev - 1 : prev))}
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
              {page + 1} of {Math.ceil(summaries.length / PAGE_SIZE)}
            </span>
            <button
              onClick={() =>
                setPage((prev) =>
                  (prev + 1) * PAGE_SIZE < summaries.length ? prev + 1 : prev
                )
              }
              disabled={(page + 1) * PAGE_SIZE >= summaries.length}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition min-h-[32px] ${
                (page + 1) * PAGE_SIZE >= summaries.length
                  ? "bg-gray-600 cursor-not-allowed text-gray-400"
                  : "bg-yellow-600 hover:bg-yellow-500 text-black"
              }`}
            >
              Next →
            </button>
          </div>

          {/* Screenshot Button */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="text-xs text-gray-400 font-medium sm:hidden">Share:</span>
            <button
              onClick={generateScreenshot}
              className="px-3 py-1.5 text-xs font-medium rounded-md transition min-h-[32px] bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1"
            >
              📸 <span className="hidden sm:inline">Full History Screenshot</span><span className="sm:hidden">Screenshot</span>
            </button>
          </div>
        </div>
      </div>

      {/* Daily Summary Cards */}
      <div className="flex flex-col gap-3">
        {pagedSummaries.map((s, i) => {
          const trueIndex = reversedSummaries.indexOf(s);
          return (
            <div
              key={s.date}
              className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl shadow p-4 hover:ring-2 hover:ring-yellow-500 transition duration-150"
            >
              {/* Header: Day/Date + View Flips Button */}
              <div className="flex items-center justify-between mb-2">
                <div className="font-bold text-base text-gray-900 dark:text-white">
                  {showDayNumber ? `Day ${summaries.length - trueIndex}` : s.date}
                </div>
                <Link
                  to={`/flip-logs?date=${s.date}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
                >
                  View Flips →
                </Link>
              </div>
              
              {/* Stats: Compact layout with labels */}
              <div className="hidden sm:grid sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-x-4 gap-y-1 text-xs">
                <div className="whitespace-nowrap truncate text-gray-900 dark:text-gray-300">📦 Flips: {s.flips}</div>
                <div className="whitespace-nowrap truncate text-gray-900 dark:text-gray-300">🧾 Items: {s.items_flipped}</div>
                <div className="whitespace-nowrap truncate text-gray-900 dark:text-gray-300">💰 Profit: {formatGP(s.profit)}</div>
                <div className="whitespace-nowrap truncate text-gray-900 dark:text-gray-300">🏆 Net Worth: {formatGP(s.net_worth)}</div>
                <div className="whitespace-nowrap truncate text-gray-900 dark:text-gray-300">📈 ROI: {formatPercent(s.roi_percent)}</div>
                <div className="whitespace-nowrap truncate text-gray-900 dark:text-gray-300">📈 Growth: {formatPercent(s.percent_change)}</div>
                <div className="whitespace-nowrap truncate text-gray-900 dark:text-gray-300">🎯 Progress: {formatProgress(s.percent_to_goal)}</div>
              </div>

              {/* Mobile: Compact grid */}
              <div className="sm:hidden grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <div className="flex justify-between col-span-2">
                  <span className="text-gray-600 dark:text-gray-400">Flips:</span>
                  <span className="text-gray-900 dark:text-white">📦 {s.flips}</span>
                </div>
                <div className="flex justify-between col-span-2">
                  <span className="text-gray-600 dark:text-gray-400">Items:</span>
                  <span className="text-gray-900 dark:text-white">🧾 {s.items_flipped}</span>
                </div>
                <div className="flex justify-between col-span-2">
                  <span className="text-gray-600 dark:text-gray-400">Profit:</span>
                  <span className="text-gray-900 dark:text-white">💰 {formatGP(s.profit)}</span>
                </div>
                <div className="flex justify-between col-span-2">
                  <span className="text-gray-600 dark:text-gray-400">Net Worth:</span>
                  <span className="text-gray-900 dark:text-white">🏆 {formatGP(s.net_worth)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">ROI:</span>
                  <span className="text-gray-900 dark:text-white">{formatPercent(s.roi_percent)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Growth:</span>
                  <span className="text-gray-900 dark:text-white">{formatPercent(s.percent_change)}</span>
                </div>
                <div className="flex justify-between col-span-2">
                  <span className="text-gray-600 dark:text-gray-400">Progress:</span>
                  <span className="text-gray-900 dark:text-white">🎯 {formatProgress(s.percent_to_goal)}</span>
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
            Day {summaries.length} • Current: {formatGP(meta?.net_worth || 0)} GP • 
            Goal: 2,147M GP ({((meta?.net_worth || 0) / 2147483647 * 100).toFixed(2)}%)
          </p>
        </div>

        {/* Compact Table */}
        <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#374151' }}>
              <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #4b5563' }}>Day</th>
              <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #4b5563' }}>Flips</th>
              <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #4b5563' }}>Profit</th>
              <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #4b5563' }}>Net Worth</th>
              <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #4b5563' }}>ROI</th>
              <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #4b5563' }}>Progress</th>
            </tr>
          </thead>
          <tbody>
            {summaries.slice(-20).map((s, i) => (
              <tr key={s.date} style={{ backgroundColor: i % 2 === 0 ? '#1f2937' : '#111827' }}>
                <td style={{ padding: '6px 8px', borderBottom: '1px solid #374151' }}>
                  Day {s.day}
                </td>
                <td style={{ padding: '6px 8px', textAlign: 'right', borderBottom: '1px solid #374151' }}>
                  {s.flips}
                </td>
                <td style={{ padding: '6px 8px', textAlign: 'right', borderBottom: '1px solid #374151' }}>
                  {formatGP(s.profit)}
                </td>
                <td style={{ padding: '6px 8px', textAlign: 'right', borderBottom: '1px solid #374151' }}>
                  {formatGP(s.net_worth)}
                </td>
                <td style={{ padding: '6px 8px', textAlign: 'right', borderBottom: '1px solid #374151' }}>
                  {formatPercent(s.roi_percent)}
                </td>
                <td style={{ padding: '6px 8px', textAlign: 'right', borderBottom: '1px solid #374151' }}>
                  {formatProgress(s.percent_to_goal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer */}
        <div style={{ 
          textAlign: 'center', 
          marginTop: '16px', 
          paddingTop: '16px',
          borderTop: '1px solid #4b5563',
          fontSize: '12px',
          color: '#9ca3af'
        }}>
          Generated on {new Date().toLocaleDateString()} • OSRS Flipping Tracker v4
        </div>
      </div>
    </div>
  );
}