import React, { useState } from "react";
import useDailySummaries from "../hooks/useDailySummaries";
import { useJsonData } from "../hooks/useJsonData";
import { Link } from "react-router-dom";

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
  const { summaries, loading } = useDailySummaries();
  const meta = useJsonData("/data/meta.json");
  const [showDayNumber, setShowDayNumber] = useState(true);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 7;

  const reversedSummaries = [...summaries].reverse();
  const pagedSummaries = reversedSummaries.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const percentToGoal = meta?.net_worth ? (meta.net_worth / 2147483647) * 100 : 0;

  if (loading) {
    return (
      <div className="text-center mt-10 text-gray-900 dark:text-white">
        Loading summaries...
      </div>
    );
  }

  return (
    <div className="dark:bg-black dark:text-white min-h-screen p-1">
      <div className="mb-8 max-w-3xl leading-relaxed">
        <h1 className="text-3xl font-bold mb-2">💰 1,000 GP to Max Cash Challenge</h1>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          This dashboard tracks my flipping progress, starting from <span className="font-semibold">1,000 GP</span> with the goal of reaching <span className="font-semibold">2.147B</span> — max cash stack.
        </p>
      </div>

      <h2 className="text-2xl font-bold mb-3">📅 Daily Summary Log</h2>

      {meta?.last_updated && (
        <div className="border-b border-gray-400 dark:border-gray-700 pb-4 mb-6 text-sm text-white space-y-2">
          <p>
            🕒 Last Data Upload:{" "}
            <span className="font-medium text-white">
              {formatLastUpdated(meta.last_updated)}{" "}
              <span className="text-gray-400 dark:text-gray-500">{timeAgo(meta.last_updated)}</span>
            </span>
          </p>
          <div>
            <div className="flex justify-between items-center mb-1">
              <p className="text-sm text-white">📊 Challenge Progress:</p>
              <p className="text-sm text-white font-medium">{percentToGoal.toFixed(3)}%</p>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
              <div
                className="bg-green-600 h-4 transition-all rounded-full"
                style={{ width: `${percentToGoal}%` }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <button
          onClick={() => setShowDayNumber(!showDayNumber)}
          className="px-3 py-1 text-sm rounded bg-yellow-600 text-black hover:bg-yellow-500 transition"
        >
          Toggle: {showDayNumber ? "Date" : "Day Number"}
        </button>
        <button
          onClick={() => setPage((prev) => Math.max(0, prev - 1))}
          disabled={page === 0}
          className={`px-3 py-1 text-sm rounded ${page === 0 ? "bg-gray-500" : "bg-yellow-600 hover:bg-yellow-500"} text-black transition`}
        >
          Previous
        </button>
        <span className="text-sm text-white">
          Page {page + 1} of {Math.ceil(summaries.length / PAGE_SIZE)}
        </span>
        <button
          onClick={() =>
            setPage((prev) =>
              (prev + 1) * PAGE_SIZE < summaries.length ? prev + 1 : prev
            )
          }
          disabled={(page + 1) * PAGE_SIZE >= summaries.length}
          className={`px-3 py-1 text-sm rounded ${
            (page + 1) * PAGE_SIZE >= summaries.length
              ? "bg-gray-500"
              : "bg-yellow-600 hover:bg-yellow-500"
          } text-black transition`}
        >
          Next
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        {pagedSummaries.map((s, i) => {
          const trueIndex = reversedSummaries.indexOf(s);
          return (
            <div
              key={s.date}
              className="bg-gray-100 border border-gray-300 dark:border-gray-700 rounded-xl shadow p-3 hover:ring-2 hover:ring-yellow-500 transition duration-150"
            >
              <div className="font-bold mb-1 text-base">
                {showDayNumber ? `Day ${summaries.length - 1 - trueIndex}` : s.date}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-x-6 gap-y-0.5 text-sm min-w-0">
                <div className="whitespace-nowrap truncate">📦 Flips: {s.flips}</div>
                <div className="whitespace-nowrap truncate">🧾 Items: {s.items_flipped}</div>
                <div className="whitespace-nowrap truncate">💰 Profit: {formatGP(s.profit)}</div>
                <div className="whitespace-nowrap truncate">🏆 Net Worth: {formatGP(s.net_worth)}</div>
                <div className="whitespace-nowrap truncate">📈 ROI: {formatPercent(s.roi_percent)}</div>
                <div className="whitespace-nowrap truncate">📈 Growth: {formatPercent(s.percent_change)}</div>
                <div className="whitespace-nowrap truncate">🎯 Progress: {formatProgress(s.percent_to_goal)}</div>
                <div className="whitespace-nowrap truncate">
                  <Link to={`/flip-logs?date=${s.date}`} className="text-blue-500 hover:underline">
                    View Flips →
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
