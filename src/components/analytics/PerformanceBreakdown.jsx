import React from 'react';
import { formatGP } from '../../utils/formatGP';

export default function PerformanceBreakdown({ categories }) {
  if (!categories || categories.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold mb-4 text-white">Category Performance</h3>
        <p className="text-gray-400 text-center">No category data available</p>
      </div>
    );
  }

  const maxProfit = Math.max(...categories.map(c => c.totalProfit));

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h3 className="text-lg font-semibold mb-4 text-white">Category Performance Breakdown</h3>

      <div className="space-y-4">
        {categories.slice(0, 5).map((category, index) => (
          <div key={category.name} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-300">#{index + 1}</span>
                <span className="text-white font-medium">{category.name}</span>
              </div>
              <div className="flex items-center space-x-4 text-sm">
                <span className="text-gray-400">{category.flipCount} flips</span>
                <span className="text-gray-400">{category.uniqueItems} items</span>
                <span className="text-green-400 font-medium">
                  {formatGP(Math.round(category.totalProfit))}
                </span>
              </div>
            </div>

            <div className="relative">
              <div className="h-6 bg-gray-700 rounded overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 transition-all duration-500"
                  style={{ width: `${(category.totalProfit / maxProfit) * 100}%` }}
                >
                  <div className="h-full flex items-center px-2">
                    <span className="text-xs text-gray-900 font-medium">
                      {category.avgRoi.toFixed(1)}% ROI
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {categories.length > 5 && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <p className="text-sm text-gray-400">And {categories.length - 5} more categories...</p>
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="bg-gray-900/50 rounded p-3">
          <p className="text-xs text-gray-400 mb-1">Best ROI Category</p>
          <p className="text-sm font-semibold text-white">
            {categories.sort((a, b) => b.avgRoi - a.avgRoi)[0]?.name || 'N/A'}
          </p>
          <p className="text-xs text-green-400">
            {categories.sort((a, b) => b.avgRoi - a.avgRoi)[0]?.avgRoi.toFixed(1)}% ROI
          </p>
        </div>
        <div className="bg-gray-900/50 rounded p-3">
          <p className="text-xs text-gray-400 mb-1">Most Active Category</p>
          <p className="text-sm font-semibold text-white">
            {categories.sort((a, b) => b.flipCount - a.flipCount)[0]?.name || 'N/A'}
          </p>
          <p className="text-xs text-blue-400">
            {categories.sort((a, b) => b.flipCount - a.flipCount)[0]?.flipCount || 0} flips
          </p>
        </div>
      </div>
    </div>
  );
}
