import React, { useState } from "react";
import useDailySummaries from "../hooks/useDailySummaries";

function formatGP(value) {
  if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(2) + "B";
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(2) + "M";
  if (value >= 1_000) return (value / 1_000).toFixed(0) + "K";
  return value.toString();
}

function formatETA(days) {
  if (!isFinite(days)) return "∞ Days";
  const y = Math.floor(days / 365);
  const m = Math.floor((days % 365) / 30.4375);
  const d = Math.floor((days % 365) % 30.4375);
  let parts = [];
  if (y) parts.push(`${y}Y`);
  if (m) parts.push(`${m}M`);
  if (d || (!y && !m)) parts.push(`${d}D`);
  return parts.join("  ");
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

export default function DailySummaryLog() {
  const { summaries, loading } = useDailySummaries();
  const [showDayNumber, setShowDayNumber] = useState(true);

  if (loading) {
    return (
      <div className="text-center mt-10 text-gray-900 dark:text-white">
        Loading summaries...
      </div>
    );
  }

  return (
    <div className="dark:bg-black dark:text-white min-h-screen p-10">
      <div className="mb-8 max-w-3xl leading-relaxed">
        <h1 className="text-3xl font-bold mb-2">💰 1,000 GP to Max Cash Challenge</h1>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          This dashboard tracks my flipping progress, starting from <span className="font-semibold">1,000 GP</span> with the goal of reaching <span className="font-semibold">2.147B</span> — max cash stack.
          Flips are manually exported using Flipping Copilot and auto-summarized below. Obviously a very much work in progress project.
        </p>
      </div>

      <h2 className="text-2xl font-bold mb-6">📅 Daily Summary Log</h2>

      <div className="mb-4">
        <button
          onClick={() => setShowDayNumber(!showDayNumber)}
          className="px-3 py-1 text-sm rounded bg-yellow-600 text-black hover:bg-yellow-500 transition"
        >
          Toggle: {showDayNumber ? "Date" : "Day Number"}
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        {summaries.map((s, i) => {
		  const goal = 2147483647;
		  const days = i || 1;
		  const avgDailyProfit = s.net_worth / days;

		  return (
			<div
			  key={s.date}
			  className="bg-gray-100 border border-gray-300 dark:border-gray-700 rounded-xl shadow p-3 hover:ring-2 hover:ring-yellow-500 transition duration-150"
			>
			  <div className="font-bold mb-1 text-base">
				{showDayNumber ? `Day ${i}` : s.date}
			  </div>

			  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-x-6 gap-y-0.5 text-sm min-w-0">
				<div className="whitespace-nowrap truncate">📦 Flips: {s.flips}</div>
				<div className="whitespace-nowrap truncate">🧾 Items: {s.items_flipped}</div>
				<div className="whitespace-nowrap truncate">💰 Profit: {formatGP(s.profit)}</div>
				<div className="whitespace-nowrap truncate">🏆 Net Worth: {formatGP(s.net_worth)}</div>
				<div className="whitespace-nowrap truncate">📈 ROI: {formatPercent(s.roi_percent)}</div>
				<div className="whitespace-nowrap truncate">📈 Growth: {formatPercent(s.percent_change)}</div>
				<div className="whitespace-nowrap truncate">🎯 Progress: {formatProgress(s.percent_to_goal)}</div>
			  </div>
			</div>
		  );
		})}


      </div>
    </div>
  );
}
