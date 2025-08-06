// src/pages/FlipLogs.jsx
import React from 'react';
import { useLocation } from 'react-router-dom';
import { useCsvData } from '../hooks/useCsvData';

function parseDateParts(dateStr) {
  const [month, day, year] = dateStr.split('-');
  return { month, day, year };
}

// Utility to format duration into "1h 15m" or "45m"
function formatDuration(ms) {
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return `${hours}h ${remaining}m`;
}

export default function FlipLogs() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const date = queryParams.get('date');

  if (!date) {
    return <div className="p-4 text-red-500">No date provided in query (?date=MM-DD-YYYY)</div>;
  }

  const { month, day, year } = parseDateParts(date);
  const csvPath = `/data/processed-flips/${year}/${month}/${day}/flips.csv`;
  const flips = useCsvData(csvPath);

  const validFlips = flips.filter(f => f.closed_quantity > 0 && f.received_post_tax > 0);

  return (
    <div className="dark:bg-black dark:text-white p-4 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">📋 Flip Log for {date}</h1>

      {validFlips.length === 0 ? (
        <p className="text-gray-400">No valid flips found for this day.</p>
      ) : (
        <div className="space-y-2">
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
                  <div>Profit: {flip.profit?.toLocaleString()}</div>
                  <div>GP Each: {(flip.received_post_tax / flip.closed_quantity).toFixed(1)}</div>
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
