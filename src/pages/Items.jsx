import React, { useState } from "react";
import { useCsvData } from "../hooks/useCsvData";

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
  const items = useCsvData("/data/item-stats.csv");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("total_profit");
  const [sortAsc, setSortAsc] = useState(false);

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
    <div className="dark:bg-black dark:text-white min-h-screen p-10">
      <h1 className="text-3xl font-bold mb-4">📊 Full Item Stats</h1>

      {/* Search bar */}
      <input
        type="text"
        placeholder="Search item..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-4 p-2 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring focus:ring-yellow-500"
      />

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-600 text-sm">
          <thead>
            <tr className="bg-gray-800 text-yellow-300">
              <th className="p-2 text-left">Item</th>
              <th className="p-2 text-left cursor-pointer" onClick={() => toggleSort("flips")}>
                Flips {sortKey === "flips" && (sortAsc ? "▲" : "▼")}
              </th>
              <th className="p-2 text-left cursor-pointer" onClick={() => toggleSort("total_profit")}>
                Profit {sortKey === "total_profit" && (sortAsc ? "▲" : "▼")}
              </th>
              <th className="p-2 text-left cursor-pointer" onClick={() => toggleSort("total_spent")}>
                Spent {sortKey === "total_spent" && (sortAsc ? "▲" : "▼")}
              </th>
              <th className="p-2 text-left cursor-pointer" onClick={() => toggleSort("roi_percent")}>
                ROI % {sortKey === "roi_percent" && (sortAsc ? "▲" : "▼")}
              </th>
              <th className="p-2 text-left cursor-pointer" onClick={() => toggleSort("avg_profit_per_flip")}>
                Avg / Flip {sortKey === "avg_profit_per_flip" && (sortAsc ? "▲" : "▼")}
              </th>
              <th className="p-2 text-left cursor-pointer" onClick={() => toggleSort("last_flipped")}>
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
                <td className="p-2">{item.item_name}</td>
                <td className="p-2">{item.flips}</td>
                <td className="p-2 text-yellow-300">
                  {formatGP(Number(item.total_profit))} GP
                </td>
                <td className="p-2">{formatGP(Number(item.total_spent))}</td>
                <td className={`p-2 ${Number(item.roi_percent) >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {formatPercent(Number(item.roi_percent))}
                </td>
                <td className="p-2">{formatGP(Number(item.avg_profit_per_flip))} GP</td>
                <td className="p-2 text-gray-400">{item.last_flipped}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
