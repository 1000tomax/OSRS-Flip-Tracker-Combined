// src/components/ItemLeaderboard.jsx - Mobile Optimized (Fixed)
import React, { useState } from 'react';
import { useCsvData } from '../hooks/useCsvData';
import LoadingSpinner, { ErrorMessage } from './LoadingSpinner';

export default function ItemLeaderboard() {
  const { data: items, loading, error } = useCsvData('/data/item-stats.csv');
  const [mode, setMode] = useState('profit');       // default = profit
  const [filter, setFilter] = useState('positive'); // default = positive

  if (loading) {
    return (
      <div className="flex flex-col justify-start w-full xl:pt-[10px] pt-4 px-2 sm:px-0">
        <LoadingSpinner size="medium" text="Loading item stats..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-start w-full xl:pt-[10px] pt-4 px-2 sm:px-0">
        <ErrorMessage 
          title="Failed to load item stats"
          error={error}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

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
    <div className="flex flex-col justify-start w-full xl:pt-[10px] pt-4 px-2 sm:px-0">
      {/* Copilot Credit Block */}
      <div className="bg-gray-900 border border-yellow-600 rounded-lg p-3 sm:p-4 mb-4 shadow-sm text-yellow-300">
        <div className="flex gap-3 items-start">
          <img
            src="https://flippingcopilot.com/static/logo.png"
            alt="Flipping Copilot"
            className="w-6 h-6 sm:w-7 sm:h-7 mt-0.5 rounded-sm bg-white flex-shrink-0"
          />
          <div className="text-xs sm:text-sm leading-snug">
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

      {/* Leaderboard Header + Controls */}
      <div className="flex flex-col gap-3 mb-4">
        <h2 className="text-lg sm:text-xl font-bold">🥉 Item Leaderboard</h2>

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

        {/* Mobile-optimized controls */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          {/* Mode Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="text-xs text-gray-400 font-medium">Sort by:</span>
            <div className="bg-gray-700 rounded-full p-1 flex gap-1">
              {['roi', 'profit'].map(option => (
                <button
                  key={option}
                  onClick={() => setMode(option)}
                  className={`px-3 py-2 text-xs rounded-full transition min-h-[44px] flex-1 sm:flex-none ${
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
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="text-xs text-gray-400 font-medium">Direction:</span>
            <div className="bg-gray-700 rounded-full p-1 flex gap-1">
              {['positive', 'negative'].map(option => (
                <button
                  key={option}
                  onClick={() => setFilter(option)}
                  className={`px-3 py-2 text-xs rounded-full transition min-h-[44px] flex-1 sm:flex-none ${
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
      <div className="flex flex-col gap-3">
        {sorted.map(item => (
          <div
            key={item.item_name}
            className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl shadow p-3 sm:p-4 hover:ring-2 hover:ring-yellow-500 transition duration-150"
          >
            {/* Mobile: Stack vertically, Desktop: Grid */}
            <div className="space-y-2 sm:space-y-0 sm:grid sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-center text-sm gap-x-4">
              <div className="font-semibold text-base sm:text-sm truncate" title={item.item_name}>
                {item.item_name}
              </div>
              
              <div className="flex justify-between sm:block">
                <span className="text-gray-600 sm:hidden">ROI:</span>
                <span className={`font-mono ${Number(item.roi_percent) >= 0 ? 'text-green-500' : 'text-red-400'}`}>
                  {formatPercent(Number(item.roi_percent))}
                </span>
              </div>
              
              <div className="flex justify-between sm:block">
                <span className="text-gray-600 sm:hidden">Profit:</span>
                <span className={`font-mono ${Number(item.total_profit) >= 0 ? 'text-yellow-400' : 'text-yellow-600'}`}>
                  {formatGP(Number(item.total_profit))} GP
                </span>
              </div>
              
              <div className="flex justify-between sm:block sm:text-right">
                <span className="text-gray-600 sm:hidden">Flips:</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 leading-none">
                  {item.flips} flips
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}