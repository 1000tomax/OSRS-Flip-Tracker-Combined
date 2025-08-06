// src/components/ItemLeaderboard.jsx
import React, { useState } from 'react';
import { useCsvData } from '../hooks/useCsvData';

export default function ItemLeaderboard() {
  const items = useCsvData('/data/item-stats.csv');
  const [mode, setMode] = useState('profit');       // default = profit
  const [filter, setFilter] = useState('positive'); // default = positive

  const sorted = items
    .filter(item => {
      const value = mode === 'roi' ? Number(item.roi_percent) : Number(item.total_profit);
      const flips = Number(item.flips);
      return isFinite(value) && (
        filter === 'positive'
          ? flips >= 5 && value > 0
          : value < 0
      );
    })
    .sort((a, b) => {
      const aVal = mode === 'roi' ? Number(a.roi_percent) : Number(a.total_profit);
      const bVal = mode === 'roi' ? Number(b.roi_percent) : Number(b.total_profit);
      return filter === 'negative' ? aVal - bVal : bVal - aVal;
    })
    .slice(0, 10);

  const formatGP = (value) => {
    const abs = Math.abs(value);
    if (abs >= 1_000_000_000) return (value / 1_000_000_000).toFixed(2) + 'B';
    if (abs >= 1_000_000) return (value / 1_000_000).toFixed(2) + 'M';
    if (abs >= 1_000) return (value / 1_000).toFixed(0) + 'K';
    return value.toLocaleString();
  };

  const formatPercent = (value) => {
    const prefix = value > 0 ? '+' : '';
    return prefix + value.toFixed(2) + '%';
  };

  return (
    <div className="flex flex-col justify-start w-full xl:pt-[10px] pt-4">
      {/* Copilot Credit Block */}
      <div className="bg-gray-900 border border-yellow-600 rounded-lg p-3 mb-4 shadow-sm text-yellow-300">
        <div className="flex gap-3 items-start">
          <img
            src="https://flippingcopilot.com/static/logo.png"
            alt="Flipping Copilot"
            className="w-7 h-7 mt-0.5 rounded-sm bg-white"
          />
          <div className="text-sm leading-snug">
            All flips in this challenge are fully powered by 🔗{' '}
            <a
              href="https://flippingcopilot.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline hover:text-yellow-200"
            >
              Flipping Copilot
            </a>, using the <span className="font-bold">5-minute offer setting</span>. Join the 🔗{' '}
            <a
              href="https://discord.gg/UyQxA4QJAq"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline hover:text-yellow-200"
            >
              Discord
            </a>{' '}
            for support, strategy, and a great community.
          </div>
        </div>
      </div>

      {/* Leaderboard Header + Pseudo Sliders */}
      <div className="flex flex-col gap-3 mb-4">
        <h2 className="text-xl font-bold">🥉 Item Leaderboard</h2>

		<div className="text-left text-sm mt-1">
		  <a
			href="https://mreedon.com/items"
			target="_blank"
			rel="noopener noreferrer"
			className="text-yellow-300 hover:text-yellow-200 hover:underline transition"
		  >
			→ View full item stats
		  </a>
		</div>


        <div className="flex flex-wrap gap-4">
          {/* Mode Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Sort by:</span>
            <div className="bg-gray-700 rounded-full p-1 flex gap-1">
              {['roi', 'profit'].map(option => (
                <button
                  key={option}
                  onClick={() => setMode(option)}
                  className={`px-3 py-1 text-xs rounded-full transition ${
                    mode === option
                      ? 'bg-yellow-500 text-black font-semibold'
                      : 'text-white hover:bg-gray-600'
                  }`}
                >
                  {option.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Direction Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Direction:</span>
            <div className="bg-gray-700 rounded-full p-1 flex gap-1">
              {['positive', 'negative'].map(option => (
                <button
                  key={option}
                  onClick={() => setFilter(option)}
                  className={`px-3 py-1 text-xs rounded-full transition ${
                    filter === option
                      ? (option === 'positive'
                        ? 'bg-green-500 text-black font-semibold'
                        : 'bg-red-500 text-white font-semibold')
                      : 'text-white hover:bg-gray-600'
                  }`}
                >
                  {option === 'positive' ? '▲ Top' : '▼ Worst'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard Rows */}
      <div className="flex flex-col gap-2">
        {sorted.map(item => (
          <div
            key={item.item_name}
            className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl shadow p-3 hover:ring-2 hover:ring-yellow-500 transition duration-150"
          >
            <div className="grid grid-cols-[1fr_1fr_1fr_auto] items-center text-sm gap-x-4">
              <div className="font-semibold truncate" title={item.item_name}>{item.item_name}</div>
              <div className={`font-mono ${Number(item.roi_percent) >= 0 ? 'text-green-500' : 'text-red-400'}`}>
                ROI: {formatPercent(Number(item.roi_percent))}
              </div>
              <div className={`font-mono ${Number(item.total_profit) >= 0 ? 'text-yellow-400' : 'text-yellow-600'}`}>
                Profit: {formatGP(Number(item.total_profit))} GP
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 text-right leading-none">
                {item.flips} flips
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
