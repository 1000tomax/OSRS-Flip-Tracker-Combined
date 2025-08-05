import React, { useState } from "react";
import useDailySummaries from "../hooks/useDailySummaries";


// Format helpers
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


export default function DailySummaryLog() {
  const { summaries, loading } = useDailySummaries();
  const [showDayNumber, setShowDayNumber] = useState(true);
	

  if (loading) return <div className="text-center mt-10 text-[white]">Loading summaries...</div>;

  return (
    <div className="bg-black min-h-screen p-10">
	<div className="mb-8 text-[white] max-w-3xl leading-relaxed">
	  <h1 className="text-3xl font-bold mb-2">💰 1,000 GP to Max Cash Challenge</h1>
	  <p className="text-sm text-[white]/80">
		This dashboard tracks my flipping progress, starting from <span className="font-semibold">1,000 GP</span> with the goal of reaching <span className="font-semibold">2.147B</span> — max cash stack.
		Flips are manually exported using Flipping Copilot and auto-summarized below. Obviously a very much work in progress project.
	  </p>
	</div>

      <h2 className="text-2xl font-bold mb-6 text-[white]">📅 Daily Summary Log</h2>
	  <div className="mb-4">
		  <button
			onClick={() => setShowDayNumber(!showDayNumber)}
			className="px-3 py-1 text-sm rounded bg-yellow-600 text-black hover:bg-yellow-500 transition"
		  >
			Toggle: {showDayNumber ? "Date" : "Day Number"}
		  </button>
		</div>


      <div className="flex flex-col gap-4">
        {summaries.map((s, i) => (
          <div
			  key={s.date}
			  className="bg-gray-900 rounded-xl shadow p-4 hover:ring-2 hover:ring-[white] transition duration-150"
			>

            <div className="grid grid-cols-8 gap-x-2 items-center text-sm">
			  <div className="font-bold w-24 text-[white]">
				{showDayNumber ? `Day ${i}` : s.date}
			  </div>
			  <div className="w-28 text-[white]">📦 Total Flips: {s.flips}</div>
			  <div className="w-28 text-[white]">🧾 Unique Items: {s.items_flipped}</div>
			  <div className="w-28 text-[white]">📈 ROI: {formatPercent(s.roi_percent)}</div>
			  <div className="w-32 text-[white]">💰 Profit: {formatGP(s.profit)}</div>
			  <div className="w-32 text-[white]">🏆 Net Worth: {formatGP(s.net_worth)}</div>
			  <div className="w-32 text-[white]">📊 Net Worth Change: {formatPercent(s.percent_change)}</div>
			  <div className="w-32 text-[white]">🎯 % to Goal: {formatPercent(s.percent_to_goal)}</div>
			</div>

          </div>
        ))}
      </div>
    </div>
  );
}
