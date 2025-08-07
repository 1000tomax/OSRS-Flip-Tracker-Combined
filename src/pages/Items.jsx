// src/pages/Items.jsx - Updated with Modern Container Styling
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
      <div className="min-h-screen bg-gradient-to-br from-gray-800 via-gray-900 to-black text-white font-sans p-4">
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 sm:p-6 shadow-lg">
          <LoadingSpinner size="large" text="Loading item statistics..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-800 via-gray-900 to-black text-white font-sans p-4">
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 sm:p-6 shadow-lg">
          <ErrorMessage 
            title="Failed to load item statistics"
            error={error}
            onRetry={() => window.location.reload()}
          />
        </div>
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
    <div className="min-h-screen bg-gradient-to-br from-gray-800 via-gray-900 to-black text-white font-sans p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 sm:p-6 shadow-lg">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-white">📊 Full Item Stats</h1>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Search bar */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search items..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition placeholder-gray-400"
            />
          </div>
          
          {/* View Mode Toggle - Mobile only */}
          <div className="flex sm:hidden">
            <div className="bg-gray-700 rounded-lg p-0.5 flex gap-0.5">
              <button
                onClick={() => setViewMode("cards")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition min-h-[32px] flex-1 ${
                  viewMode === "cards"
                    ? "bg-yellow-500 text-black"
                    : "text-white hover:bg-gray-600"
                }`}
              >
                Cards
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition min-h-[32px] flex-1 ${
                  viewMode === "table"
                    ? "bg-yellow-500 text-black"
                    : "text-white hover:bg-gray-600"
                }`}
              >
                Table
              </button>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4 text-sm text-gray-400">
          Showing {filtered.length} item{filtered.length !== 1 ? 's' : ''}
        </div>

        {/* Mobile Card View */}
        {viewMode === "cards" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:hidden">
            {filtered.map((item) => (
              <div
                key={item.item_name}
                className="bg-gray-800 border border-gray-600 rounded-xl p-4 hover:ring-2 hover:ring-yellow-500 transition duration-150"
              >
                <h3 className="font-bold text-lg text-yellow-400 truncate mb-3" title={item.item_name}>
                  {item.item_name}
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-400 block">Flips:</span>
                    <span className="text-white font-medium">{item.flips}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Profit:</span>
                    <span className={`font-medium font-mono ${Number(item.total_profit) >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {formatGP(Number(item.total_profit))} GP
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">ROI:</span>
                    <span className={`font-medium font-mono ${Number(item.roi_percent) >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {formatPercent(Number(item.roi_percent))}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Avg/Flip:</span>
                    <span className="text-white font-medium font-mono">{formatGP(Number(item.avg_profit_per_flip))} GP</span>
                  </div>
                </div>
                <div className="text-xs text-gray-500 pt-3 mt-3 border-t border-gray-700">
                  Last flipped: {item.last_flipped}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Table View */}
        <div className={`${viewMode === "cards" ? "hidden sm:block" : "block"}`}>
          <div className="overflow-x-auto rounded-lg border border-gray-700">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full bg-gray-800 text-white">
                <thead className="bg-gray-700">
                  <tr>
                    <th 
                      className="p-3 text-left cursor-pointer hover:bg-gray-600 transition font-medium"
                      onClick={() => toggleSort("item_name")}
                    >
                      Item Name {sortKey === "item_name" && (sortAsc ? "▲" : "▼")}
                    </th>
                    <th 
                      className="p-3 text-left cursor-pointer hover:bg-gray-600 transition font-medium"
                      onClick={() => toggleSort("flips")}
                    >
                      Flips {sortKey === "flips" && (sortAsc ? "▲" : "▼")}
                    </th>
                    <th 
                      className="p-3 text-left cursor-pointer hover:bg-gray-600 transition font-medium"
                      onClick={() => toggleSort("total_profit")}
                    >
                      Total Profit {sortKey === "total_profit" && (sortAsc ? "▲" : "▼")}
                    </th>
                    <th 
                      className="p-3 text-left cursor-pointer hover:bg-gray-600 transition font-medium"
                      onClick={() => toggleSort("total_spent")}
                    >
                      Total Spent {sortKey === "total_spent" && (sortAsc ? "▲" : "▼")}
                    </th>
                    <th 
                      className="p-3 text-left cursor-pointer hover:bg-gray-600 transition font-medium"
                      onClick={() => toggleSort("roi_percent")}
                    >
                      ROI % {sortKey === "roi_percent" && (sortAsc ? "▲" : "▼")}
                    </th>
                    <th 
                      className="p-3 text-left cursor-pointer hover:bg-gray-600 transition font-medium"
                      onClick={() => toggleSort("avg_profit_per_flip")}
                    >
                      Avg/Flip {sortKey === "avg_profit_per_flip" && (sortAsc ? "▲" : "▼")}
                    </th>
                    <th 
                      className="p-3 text-left cursor-pointer hover:bg-gray-600 transition font-medium"
                      onClick={() => toggleSort("last_flipped")}
                    >
                      Last Flipped {sortKey === "last_flipped" && (sortAsc ? "▲" : "▼")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item, index) => (
                    <tr
                      key={item.item_name}
                      className={`border-t border-gray-700 hover:bg-gray-750 transition ${index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-850'}`}
                    >
                      <td className="p-3 font-medium max-w-[200px] truncate" title={item.item_name}>
                        {item.item_name}
                      </td>
                      <td className="p-3 text-gray-300">{item.flips}</td>
                      <td className={`p-3 font-mono font-medium ${Number(item.total_profit) >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {formatGP(Number(item.total_profit))} GP
                      </td>
                      <td className="p-3 text-gray-300 font-mono">{formatGP(Number(item.total_spent))}</td>
                      <td className={`p-3 font-mono font-medium ${Number(item.roi_percent) >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {formatPercent(Number(item.roi_percent))}
                      </td>
                      <td className="p-3 text-gray-300 font-mono">{formatGP(Number(item.avg_profit_per_flip))} GP</td>
                      <td className="p-3 text-gray-400 text-sm">{item.last_flipped}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Mobile scroll hint */}
          <p className="text-xs text-gray-500 mt-3 sm:hidden">
            💡 Swipe horizontally to see all columns
          </p>
        </div>
      </div>
    </div>
  );
}