// src/components/DailySummaryLog.jsx - Compact Cards
import React, { useState } from "react";
import useDailySummaries from "../hooks/useDailySummaries";
import { useJsonData } from "../hooks/useJsonData";
import { Link } from "react-router-dom";
import LoadingSpinner, { ErrorMessage } from "./LoadingSpinner";

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

  // Show loading if either is loading
  const isLoading = summariesLoading || metaLoading;
  const hasError = summariesError || metaError;

  const handleRetry = () => {
    refetchSummaries();
    refetchMeta();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-1">
        <LoadingSpinner size="large" text="Loading flip summaries..." />
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="min-h-screen p-1">
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
    <div className="p-1">
      <div className="mb-4 max-w-3xl leading-relaxed">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">💰 1,000 GP to Max Cash Challenge</h1>
        <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 mb-4">
          This dashboard tracks my flipping progress, starting from <span className="font-semibold">1,000 GP</span> with the goal of reaching <span className="font-semibold">2.147B</span>&nbsp;— max&nbsp;cash&nbsp;stack.
        </p>
      </div>

      <h2 className="text-xl sm:text-2xl font-bold mb-3">📅 Daily Summary Log</h2>

      {meta?.last_updated && (
        <div className="border-b border-gray-400 dark:border-gray-700 pb-3 mb-4 text-sm text-white space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="text-sm sm:text-base">
              🕒 Last Data Upload:{" "}
              <span className="font-medium text-white block sm:inline">
                {formatLastUpdated(meta.last_updated)}{" "}
                <span className="text-gray-400 dark:text-gray-500">{timeAgo(meta.last_updated)}</span>
              </span>
            </p>
            <button
              onClick={handleRetry}
              className="px-3 py-2 text-sm bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors min-h-[44px] self-start sm:self-auto"
              title="Refresh data"
            >
              🔄 Refresh
            </button>
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <p className="text-sm text-white">📊 Challenge Progress:</p>
              <p className="text-sm sm:text-base text-white font-medium">{percentToGoal.toFixed(3)}%</p>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-5 overflow-hidden">
              <div
                className="h-5 transition-all rounded-full bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-300"
                style={{ width: `${percentToGoal}%` }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <button
          onClick={() => setShowDayNumber(!showDayNumber)}
          className="px-3 py-2 text-sm rounded bg-yellow-600 text-black hover:bg-yellow-500 transition min-h-[44px]"
        >
          Toggle: {showDayNumber ? "Date" : "Day Number"}
        </button>
        <button
          onClick={() => setPage((prev) => Math.max(0, prev - 1))}
          disabled={page === 0}
          className={`px-3 py-2 text-sm rounded min-h-[44px] transition ${page === 0 ? "bg-gray-500 cursor-not-allowed" : "bg-yellow-600 hover:bg-yellow-500"} text-black`}
        >
          Previous
        </button>
        <span className="text-sm text-white px-2 py-2">
          Page {page + 1} of {Math.ceil(summaries.length / PAGE_SIZE)}
        </span>
        <button
          onClick={() =>
            setPage((prev) =>
              (prev + 1) * PAGE_SIZE < summaries.length ? prev + 1 : prev
            )
          }
          disabled={(page + 1) * PAGE_SIZE >= summaries.length}
          className={`px-3 py-2 text-sm rounded min-h-[44px] transition ${
            (page + 1) * PAGE_SIZE >= summaries.length
              ? "bg-gray-500 cursor-not-allowed"
              : "bg-yellow-600 hover:bg-yellow-500"
          } text-black`}
        >
          Next
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {pagedSummaries.map((s, i) => {
          const trueIndex = reversedSummaries.indexOf(s);
          return (
            <div
              key={s.date}
              className="bg-gray-100 border border-gray-300 dark:border-gray-700 rounded-xl shadow p-3 hover:ring-2 hover:ring-yellow-500 transition duration-150"
            >
              {/* Header: Day/Date + View Flips Button */}
              <div className="flex items-center justify-between mb-2">
                <div className="font-bold text-base">
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
                <div className="whitespace-nowrap truncate">📦 Flips: {s.flips}</div>
                <div className="whitespace-nowrap truncate">🧾 Items: {s.items_flipped}</div>
                <div className="whitespace-nowrap truncate">💰 Profit: {formatGP(s.profit)}</div>
                <div className="whitespace-nowrap truncate">🏆 Net Worth: {formatGP(s.net_worth)}</div>
                <div className="whitespace-nowrap truncate">📈 ROI: {formatPercent(s.roi_percent)}</div>
                <div className="whitespace-nowrap truncate">📈 Growth: {formatPercent(s.percent_change)}</div>
                <div className="whitespace-nowrap truncate">🎯 Progress: {formatProgress(s.percent_to_goal)}</div>
              </div>

              {/* Mobile: Compact grid */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:hidden text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Flips:</span>
                  <span>📦 {s.flips}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Items:</span>
                  <span>🧾 {s.items_flipped}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Profit:</span>
                  <span>💰 {formatGP(s.profit)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Worth:</span>
                  <span>🏆 {formatGP(s.net_worth)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">ROI:</span>
                  <span>📈 {formatPercent(s.roi_percent)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Growth:</span>
                  <span>📈 {formatPercent(s.percent_change)}</span>
                </div>
                <div className="flex justify-between col-span-2">
                  <span className="text-gray-600">Progress:</span>
                  <span>🎯 {formatProgress(s.percent_to_goal)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}