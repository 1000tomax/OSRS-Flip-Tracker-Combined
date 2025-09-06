/**
 * CACHE MONITOR COMPONENT
 *
 * A development tool for monitoring cache performance and effectiveness.
 * Shows real-time statistics about cache hits, misses, and storage usage.
 * Only appears in development mode for debugging purposes.
 */

import React, { useState, useEffect } from 'react';
import { CacheUtils } from '../utils/cacheManager';
import UI from '@/config/constants';

const CacheMonitor = () => {
  const [stats, setStats] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  // Interval handle kept locally; no need to store in state

  // Only show in development
  const isDev = import.meta.env.DEV;

  useEffect(() => {
    if (!isDev) return;

    const updateStats = () => {
      const allStats = CacheUtils.getAllStats();
      setStats(allStats);
    };

    // Initial load
    updateStats();

    // Set up auto-refresh
    const interval = setInterval(updateStats, UI.REFRESH_INTERVAL_MS);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isDev]);

  // Handle keyboard shortcut to toggle visibility
  useEffect(() => {
    if (!isDev) return;

    const handleKeyPress = (event) => {
      // Ctrl+Shift+C to toggle cache monitor
      if (event.ctrlKey && event.shiftKey && event.key === 'C') {
        setIsVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isDev]);

  const handleClearCache = async () => {
    await CacheUtils.clearAll();
    setStats(CacheUtils.getAllStats());
  };

  if (!isDev || !isVisible) {
    return null;
  }

  if (!stats) {
    return (
      <div className="fixed bottom-4 right-4 bg-gray-900 border border-gray-600 rounded-lg p-3 text-white text-sm">
        Loading cache stats...
      </div>
    );
  }

  const totalHits = Object.values(stats).reduce((sum, cache) => sum + cache.hits, 0);
  const totalMisses = Object.values(stats).reduce((sum, cache) => sum + cache.misses, 0);
  const totalRequests = totalHits + totalMisses;
  const overallHitRate = totalRequests > 0 ? (totalHits / totalRequests * 100).toFixed(1) : 0;

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 border border-gray-600 rounded-lg p-4 text-white text-xs max-w-md shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm">Cache Monitor</h3>
        <div className="flex items-center space-x-2">
          <span className="text-green-400 font-mono">{overallHitRate}% hit rate</span>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-white"
          >
            ×
          </button>
        </div>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-3 gap-2 mb-3 text-center">
        <div className="bg-gray-800 rounded p-2">
          <div className="text-green-400 font-bold">{totalHits}</div>
          <div className="text-gray-400">Hits</div>
        </div>
        <div className="bg-gray-800 rounded p-2">
          <div className="text-red-400 font-bold">{totalMisses}</div>
          <div className="text-gray-400">Misses</div>
        </div>
        <div className="bg-gray-800 rounded p-2">
          <div className="text-blue-400 font-bold">
            {Object.values(stats).reduce((sum, cache) => sum + cache.entryCount, 0)}
          </div>
          <div className="text-gray-400">Entries</div>
        </div>
      </div>

      {/* Individual Cache Stats */}
      <div className="space-y-2">
        {Object.entries(stats).map(([cacheName, cacheStats]) => {
          const hitRate = cacheStats.hits + cacheStats.misses > 0 
            ? ((cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100).toFixed(1)
            : 0;

          return (
            <div key={cacheName} className="bg-gray-800 rounded p-2">
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium capitalize">{cacheName.replace(/([A-Z])/g, ' $1')}</span>
                <span className="text-green-400 font-mono">{hitRate}%</span>
              </div>
              <div className="grid grid-cols-4 gap-1 text-xs text-gray-400">
                <div>H: {cacheStats.hits}</div>
                <div>M: {cacheStats.misses}</div>
                <div>E: {cacheStats.entryCount}</div>
                <div>{cacheStats.memoryUsage}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-700">
        <div className="text-gray-400 text-xs">
          Press Ctrl+Shift+C to toggle
        </div>
        <button
          onClick={handleClearCache}
          className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-xs"
        >
          Clear All
        </button>
      </div>
    </div>
  );
};

export default CacheMonitor;
