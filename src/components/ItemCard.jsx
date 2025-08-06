// src/components/ItemCard.jsx
import React from 'react';

export default function ItemCard({ item }) {
  const roi = Number(item.roi_percent);
  const profit = Number(item.total_profit);

  return (
    <div className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-2xl shadow-md p-4 flex flex-col gap-2 hover:shadow-lg transition-shadow duration-150">
      <h3 className="text-base font-semibold text-white truncate">{item.item_name}</h3>

      <p className="text-sm">
        ROI: <span className="font-semibold text-green-600">
          {isFinite(roi) ? roi.toFixed(2) + '%' : '—'}
        </span>
      </p>

      <p className="text-sm">
        Profit: <span className="font-semibold text-yellow-500">
          {isFinite(profit) ? profit.toLocaleString() + ' GP' : '—'}
        </span>
      </p>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        {item.flips} flips
      </p>
    </div>
  );
}
