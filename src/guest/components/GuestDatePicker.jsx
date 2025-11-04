import React, { useMemo } from 'react';
import { formatGP } from '../../utils/formatUtils';

export default function GuestDatePicker({ guestData, selectedDate, onDateSelect }) {
  // Get available dates and their stats
  const availableDates = useMemo(() => {
    if (!guestData?.flipsByDate) return [];

    return Object.entries(guestData.flipsByDate)
      .map(([date, dayData]) => {
        // Handle both old format (array) and new format (object with flips array)
        const flips = Array.isArray(dayData) ? dayData : dayData.flips || [];
        const totalProfit = flips.reduce((sum, flip) => sum + (flip.profit || 0), 0);
        const totalFlips = flips.length;
        const uniqueItems = new Set(flips.map(flip => flip.item)).size;

        return {
          date,
          totalProfit,
          totalFlips,
          uniqueItems,
        };
      })
      .sort((a, b) => {
        // Sort dates properly considering year (MM-DD-YYYY format)
        const [aMonth, aDay, aYear] = a.date.split('-');
        const [bMonth, bDay, bYear] = b.date.split('-');
        const dateA = new Date(aYear, aMonth - 1, aDay);
        const dateB = new Date(bYear, bMonth - 1, bDay);
        return dateB - dateA; // Most recent first (descending)
      });
  }, [guestData]);

  if (availableDates.length === 0) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg">
        <h3 className="text-xl font-bold text-white mb-4">📅 Select Trading Day</h3>
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📭</div>
          <p className="text-gray-400 text-lg">No daily data available</p>
          <p className="text-gray-500 text-sm mt-2">
            Daily flip logs are only available when uploading CSV files with transaction details.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <h3 className="text-xl font-bold text-white mb-4">📅 Select Trading Day</h3>
      <p className="text-gray-400 text-sm mb-6">
        Click on any day to view detailed transaction logs for that date
      </p>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {availableDates.map(({ date, totalProfit, totalFlips, uniqueItems }) => (
          <button
            key={date}
            onClick={() => onDateSelect(date)}
            className={`w-full p-4 rounded-lg border transition-all duration-200 text-left ${
              selectedDate === date
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-gray-700 border-gray-600 hover:bg-gray-650 hover:border-gray-500 text-gray-100'
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="font-semibold text-lg">{date}</div>
                <div className="text-sm opacity-80">
                  {totalFlips} flips • {uniqueItems} items
                </div>
              </div>
              <div className="text-right">
                <div
                  className={`font-mono font-bold ${
                    totalProfit >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {totalProfit >= 0 ? '+' : ''}
                  {formatGP(totalProfit)}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-700">
        <p className="text-xs text-gray-500">
          💡 Dates are shown in descending order (most recent first)
        </p>
      </div>
    </div>
  );
}
