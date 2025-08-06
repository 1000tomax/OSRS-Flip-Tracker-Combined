// src/pages/FlipLogs.jsx
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCsvData } from '../hooks/useCsvData';
import { useJsonData } from '../hooks/useJsonData';

function parseDateParts(dateStr) {
  const [month, day, year] = dateStr.split('-');
  return { month, day, year };
}

function formatDuration(ms) {
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return `${hours}h ${remaining}m`;
}

function dateToInputValue(date) {
  if (!date) return "";
  const [mm, dd, yyyy] = date.split("-");
  return `${yyyy}-${mm}-${dd}`;
}

export default function FlipLogs() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const date = queryParams.get('date');

  const summaryDates = useJsonData("/data/summary-index.json");

  const { month, day, year } = date ? parseDateParts(date) : {};
  const csvPath = date ? `/data/processed-flips/${year}/${month}/${day}/flips.csv` : null;
  const flips = useCsvData(csvPath);

  const validFlips = flips
    .filter(f => f.closed_quantity > 0 && f.received_post_tax > 0)
    .sort((a, b) => new Date(a.closed_time) - new Date(b.closed_time));

  return (
    <div className="dark:bg-black dark:text-white p-4 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">📋 Flip Log Viewer</h1>

      {/* 📅 Calendar-style Date Picker */}
      {summaryDates && (
        <div className="mb-6">
          <label htmlFor="date-picker" className="mr-2 font-medium">
            Select a date:
          </label>
          <input
            type="date"
            id="date-picker"
            className="bg-gray-800 text-white border border-gray-500 rounded px-2 py-1"
            value={dateToInputValue(date)}
            onChange={(e) => {
              const [yyyy, mm, dd] = e.target.value.split("-");
              const formatted = `${mm}-${dd}-${yyyy}`;
              navigate(`/flip-logs?date=${formatted}`);
            }}
          />
        </div>
      )}

      {!date && (
        <p className="text-gray-400">Please select a date to view flip logs.</p>
      )}

      {date && validFlips.length === 0 && (
        <p className="text-gray-400">No valid flips found for {date}.</p>
      )}

      {date && validFlips.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xl font-semibold mb-2">Flips for {date}</h2>
          {validFlips.map((flip, i) => {
            const open = flip.opened_time ? new Date(flip.opened_time) : null;
            const close = flip.closed_time ? new Date(flip.closed_time) : null;

            const openTime = open
              ? open.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
              : "—";
            const closeTime = close
              ? close.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
              : "—";

            let duration = "—";
            if (open && close) {
              duration = formatDuration(close - open);
            }

            return (
              <div
                key={i}
                className="border border-gray-300 dark:border-gray-700 p-3 rounded-md shadow bg-white dark:bg-gray-900"
              >
                <div className="font-bold text-yellow-500 text-sm mb-1">{flip.item_name}</div>
                <div className="text-sm grid grid-cols-2 sm:grid-cols-4 gap-2 text-white">
                  <div>Sold: {flip.closed_quantity}</div>
                  <div>Profit: {formatGP(flip.profit)}</div>
                  <div>
                    Profit Per Item: {Math.floor(flip.profit / flip.closed_quantity).toLocaleString()}
                  </div>
                  <div>Time: {openTime} → {closeTime} ({duration})</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// GP formatter reused from Daily Summary
function formatGP(value) {
  if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(2) + "B";
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(2) + "M";
  if (value >= 1_000) return (value / 1_000).toFixed(0) + "K";
  return value?.toLocaleString?.() ?? value;
}
