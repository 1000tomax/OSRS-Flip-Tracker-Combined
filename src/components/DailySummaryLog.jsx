// src/components/DailySummaryLog.jsx - Complete with Container Background
import React, { useState } from "react";
import useDailySummaries from "../hooks/useDailySummaries";
import { useJsonData } from "../hooks/useJsonData";
import { Link } from "react-router-dom";
import LoadingSpinner, { ErrorMessage } from "./LoadingSpinner";
import { useETACalculator, formatETA } from "./ETACalculator";

function formatGP(value) {
  if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(2) + "B";
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(2) + "M";
  if (value >= 1_000) return (value / 1_000).toFixed(0) + "K";
  return value.toString();
}

function formatPercent(value) {
  const prefix = value > 0 ? "+" : "";
  if (Math.abs(value) < 1) return prefix + value.toFixed(3) + "%";
  if (Math.abs(value) < 100) return prefix + value.toFixed(2) + "%";
  return prefix + value.toFixed(1) + "%";
}

function formatProgress(value) {
  if (Math.abs(value) < 1) return value.toFixed(3) + "%";
  if (Math.abs(value) < 100) return value.toFixed(2) + "%";
  return value.toFixed(1) + "%";
}

function formatLastUpdated(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function timeAgo(timestamp) {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now - then;

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours >= 1) return `(${hours} hour${hours !== 1 ? "s" : ""} ago)`;
  if (minutes >= 1) return `(${minutes} min${minutes !== 1 ? "s" : ""} ago)`;
  return `(${seconds} sec${seconds !== 1 ? "s" : ""} ago)`;
}

export default function DailySummaryLog() {
  const { summaries, loading: summariesLoading, error: summariesError, refetch: refetchSummaries } = useDailySummaries();
  const { data: meta, loading: metaLoading, error: metaError, refetch: refetchMeta } = useJsonData("/data/meta.json");
  const [showDayNumber, setShowDayNumber] = useState(true);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 7;

  // Calculate ETA to max cash (must be called before any early returns)
  const etaData = useETACalculator(summaries, meta?.net_worth || 0);

  // Show loading if either is loading
  const isLoading = summariesLoading || metaLoading;
  const hasError = summariesError || metaError;

  const handleRetry = () => {
    // Keep for error states only
    refetchSummaries();
    refetchMeta();
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

  const reversedSummaries = [...summaries].reverse();
  const pagedSummaries = reversedSummaries.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const percentToGoal = meta?.net_worth ? (meta.net_worth / 2147483647) * 100 : 0;

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
              {formatLastUpdated(meta.last_updated)}{" "}
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
                  {etaData.eta ? formatETA(etaData.eta, etaData.confidence) : 'Calculating...'}
                </span>
              </div>
              {etaData.confidence === 'low' && (
                <div className="space-y-1 mt-1">
                  <p className="text-xs text-gray-400">
                    💡 ETA will become more accurate as you add more flipping days
                  </p>
                  <p className="text-xs text-gray-300">
                    ℹ️ 🤔 = Low confidence (few data points), 📊 = Medium, 🎯 = High
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Controls - Polished */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
        {/* Date/Day Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="text-xs text-gray-400 font-medium">Display:</span>
          <div className="bg-gray-700 rounded-lg p-0.5 flex gap-0.5">
            <button
              onClick={() => setShowDayNumber(false)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition min-h-[32px] flex-1 sm:flex-none ${
                !showDayNumber
                  ? 'bg-yellow-500 text-black'
                  : 'text-white hover:bg-gray-600'
              }`}
            >
              Date
            </button>
            <button
              onClick={() => setShowDayNumber(true)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition min-h-[32px] flex-1 sm:flex-none ${
                showDayNumber
                  ? 'bg-yellow-500 text-black'
                  : 'text-white hover:bg-gray-600'
              }`}
            >
              Day #
            </button>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="text-xs text-gray-400 font-medium">Page:</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((prev) => Math.max(0, prev - 1))}
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
                  {showDayNumber ? `Day ${summaries.length - 1 - trueIndex}` : s.date}
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
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:hidden text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Flips:</span>
                  <span className="text-gray-900 dark:text-white">📦 {s.flips}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Items:</span>
                  <span className="text-gray-900 dark:text-white">🧾 {s.items_flipped}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Profit:</span>
                  <span className="text-gray-900 dark:text-white">💰 {formatGP(s.profit)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Worth:</span>
                  <span className="text-gray-900 dark:text-white">🏆 {formatGP(s.net_worth)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">ROI:</span>
                  <span className="text-gray-900 dark:text-white">📈 {formatPercent(s.roi_percent)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Growth:</span>
                  <span className="text-gray-900 dark:text-white">📈 {formatPercent(s.percent_change)}</span>
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
    </div>
  );
}