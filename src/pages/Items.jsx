// src/pages/Items.jsx - Mobile Optimized
import React, { useState } from "react";
import { useCsvData } from "../hooks/useCsvData";
import LoadingSpinner, { ErrorMessage } from "../components/LoadingSpinner";

function formatGP(value) {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return (value / 1_000_000_000).toFixed(2) + "B";
  if (abs >= 1_000_000) return (value / 1_000_000).toFixed(2) + "M";
  if (abs >= 1_000) return (value / 1_000).toFixed(0) + "K";
  return value.toLocaleString();
}

function formatPercent(value) {
  const prefix = value > 0 ? "+" : "";
  return prefix + value.toFixed(2) + "%";
}

export default function Items() {
  const { data: items, loading, error } = useCsvData("/data/item-stats.csv");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("total_profit");
  const [sortAsc, setSortAsc] = useState(false);
  const [viewMode, setViewMode] = useState("table"); // "table" or "cards"

  if (loading) {
    return (
      <div className="text-gray-900 dark:text-white min-h-screen p-4 sm:p-10">
        <LoadingSpinner size="large" text="Loading item statistics..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-gray-900 dark:text-white min-h-screen p-4 sm:p-10">
        <ErrorMessage 
          title="Failed to load item statistics"
          error={error}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  const filtered = items
    .filter(item =>
      item.item_name.toLowerCase().includes(query.toLowerCase())
    )
    .sort((a, b) => {
      let aVal = a[sortKey];
      let bVal = b[sortKey];

      // Date sort for last_flipped
      if (sortKey === "last_flipped") {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      } else {
        aVal = Number(aVal);
        bVal = Number(bVal);
      }

      return sortAsc ? aVal - bVal : bVal - aVal;
    });

  const toggleSort = (key) => {
    if (key === sortKey) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  return (
    <div className="text-gray-900 dark:text-white min-h-screen p-4 sm:p-10">
      <h1 className="text-2xl sm:text-3xl font-bold mb-4">📊 Full Item Stats</h1>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Search bar */}
        <input
          type="text"
          placeholder="Search item..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 p-3 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring focus:ring-yellow-500 min-h-[44px]"
        />
        
        {/* View Mode Toggle - Mobile only */}
        <div className="flex sm:hidden">
          <button
            onClick={() => setViewMode("cards")}
            className={`px-4 py-2 text-sm rounded-l min-h-[44px] transition ${
              viewMode === "cards" ? "bg-yellow-600 text-black" : "bg-gray-600 text-white"
            }`}
          >
            📱 Cards
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`px-4 py-2 text-sm rounded-r min-h-[44px] transition ${
              viewMode === "table" ? "bg-yellow-600 text-black" : "bg-gray-600 text-white"
            }`}
          >
            📋 Table
          </button>
        </div>
      </div>

      {/* Mobile Card View */}
      {viewMode === "cards" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:hidden">
          {filtered.map((item) => (
            <div
              key={item.item_name}
              className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-4 space-y-3"
            >
              <h3 className="font-bold text-lg text-yellow-500 truncate" title={item.item_name}>
                {item.item_name}
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Flips:</span>
                  <span className="ml-1 font-medium">{item.flips}</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Profit:</span>
                  <span className={`ml-1 font-medium ${Number(item.total_profit) >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {formatGP(Number(item.total_profit))} GP
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">ROI:</span>
                  <span className={`ml-1 font-medium ${Number(item.roi_percent) >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {formatPercent(Number(item.roi_percent))}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Avg/Flip:</span>
                  <span className="ml-1 font-medium">{formatGP(Number(item.avg_profit_per_flip))} GP</span>
                </div>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-300 dark:border-gray-600">
                Last flipped: {item.last_flipped}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table View - Hidden on mobile when cards are selected */}
      <div className={`${viewMode === "cards" ? "hidden sm:block" : "block"}`}>
        {/* Horizontal scroll container for mobile */}
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="min-w-full inline-block align-middle">
            <div className="overflow-hidden border border-gray-600 rounded-lg">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-800 text-yellow-300">
                    <th className="p-3 text-left whitespace-nowrap">Item</th>
                    <th 
                      className="p-3 text-left cursor-pointer hover:bg-gray-700 transition whitespace-nowrap min-h-[44px]" 
                      onClick={() => toggleSort("flips")}
                    >
                      Flips {sortKey === "flips" && (sortAsc ? "▲" : "▼")}
                    </th>
                    <th 
                      className="p-3 text-left cursor-pointer hover:bg-gray-700 transition whitespace-nowrap min-h-[44px]" 
                      onClick={() => toggleSort("total_profit")}
                    >
                      Profit {sortKey === "total_profit" && (sortAsc ? "▲" : "▼")}
                    </th>
                    <th 
                      className="p-3 text-left cursor-pointer hover:bg-gray-700 transition whitespace-nowrap min-h-[44px]" 
                      onClick={() => toggleSort("total_spent")}
                    >
                      Spent {sortKey === "total_spent" && (sortAsc ? "▲" : "▼")}
                    </th>
                    <th 
                      className="p-3 text-left cursor-pointer hover:bg-gray-700 transition whitespace-nowrap min-h-[44px]" 
                      onClick={() => toggleSort("roi_percent")}
                    >
                      ROI % {sortKey === "roi_percent" && (sortAsc ? "▲" : "▼")}
                    </th>
                    <th 
                      className="p-3 text-left cursor-pointer hover:bg-gray-700 transition whitespace-nowrap min-h-[44px]" 
                      onClick={() => toggleSort("avg_profit_per_flip")}
                    >
                      Avg / Flip {sortKey === "avg_profit_per_flip" && (sortAsc ? "▲" : "▼")}
                    </th>
                    <th 
                      className="p-3 text-left cursor-pointer hover:bg-gray-700 transition whitespace-nowrap min-h-[44px]" 
                      onClick={() => toggleSort("last_flipped")}
                    >
                      Last Flipped {sortKey === "last_flipped" && (sortAsc ? "▲" : "▼")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr
                      key={item.item_name}
                      className="border-t border-gray-700 hover:bg-gray-800 transition"
                    >
                      <td className="p-3 font-medium max-w-[200px] truncate" title={item.item_name}>
                        {item.item_name}
                      </td>
                      <td className="p-3 whitespace-nowrap">{item.flips}</td>
                      <td className="p-3 text-yellow-300 whitespace-nowrap font-mono">
                        {formatGP(Number(item.total_profit))} GP
                      </td>
                      <td className="p-3 whitespace-nowrap font-mono">{formatGP(Number(item.total_spent))}</td>
                      <td className={`p-3 whitespace-nowrap font-mono ${Number(item.roi_percent) >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {formatPercent(Number(item.roi_percent))}
                      </td>
                      <td className="p-3 whitespace-nowrap font-mono">{formatGP(Number(item.avg_profit_per_flip))} GP</td>
                      <td className="p-3 text-gray-400 whitespace-nowrap">{item.last_flipped}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        {/* Scroll hint for mobile */}
        <p className="text-xs text-gray-500 mt-2 sm:hidden">
          💡 Swipe horizontally to see all columns
        </p>
      </div>
    </div>
  );
}