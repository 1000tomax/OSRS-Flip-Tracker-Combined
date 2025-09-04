import React, { useMemo, useState } from 'react';
import { formatGP } from '../../utils/formatUtils';
import SortableTable from '../../components/SortableTable';

// Helper function to format duration
const formatDuration = milliseconds => {
  if (!milliseconds || milliseconds <= 0) return '—';

  const minutes = Math.floor(milliseconds / (60 * 1000));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
};

// Helper function to format time
const formatTime = dateString => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

export default function GuestFlipLogViewer({
  guestData,
  selectedDate = null,
  selectedDayHour = null, // Format: { day: 0-6, hour: 0-23 } for heatmap filtering
  onClose = null,
}) {
  const [sortField] = useState('lastSellTime');
  const [sortDirection] = useState('desc');

  // Get flips for the selected date or day/hour filter
  const flipsToDisplay = useMemo(() => {
    if (!guestData?.flipsByDate) return [];

    let allFlips = [];

    if (selectedDate) {
      // Show flips for a specific date
      const dayData = guestData.flipsByDate[selectedDate];
      const flips = Array.isArray(dayData) ? dayData : dayData?.flips || [];
      allFlips = flips.map((flip, index) => ({
        ...flip,
        date: selectedDate,
        id: `${selectedDate}_${flip.item}_${flip.lastSellTime || flip.last_sell_time}_${flip.profit}_${index}`,
      }));
    } else if (selectedDayHour) {
      // Show flips for a specific day of week and hour (from heatmap)

      let flipIndex = 0; // Global counter for unique IDs
      Object.entries(guestData.flipsByDate).forEach(([date, dayData]) => {
        // Handle both old format (array) and new format (object with flips array)
        const flips = Array.isArray(dayData) ? dayData : dayData.flips || [];
        flips.forEach(flip => {
          const lastSellTime = flip.lastSellTime || flip.last_sell_time;
          if (lastSellTime) {
            const sellDate = new Date(lastSellTime);
            const dayOfWeek = sellDate.getDay();
            const hour = sellDate.getHours();

            if (dayOfWeek === selectedDayHour.day && hour === selectedDayHour.hour) {
              allFlips.push({
                ...flip,
                date,
                id: `${date}_${flip.item}_${lastSellTime}_${flip.profit}_${flipIndex}`,
              });
              flipIndex++;
            }
          }
        });
      });
    } else {
      // Show all flips from all dates
      let flipIndex = 0; // Global counter for unique IDs
      Object.entries(guestData.flipsByDate).forEach(([date, dayData]) => {
        // Handle both old format (array) and new format (object with flips array)
        const flips = Array.isArray(dayData) ? dayData : dayData.flips || [];
        flips.forEach(flip => {
          allFlips.push({
            ...flip,
            date,
            id: `${date}_${flip.item}_${flip.lastSellTime || flip.last_sell_time}_${flip.profit}_${flipIndex}`,
          });
          flipIndex++;
        });
      });
    }

    return allFlips;
  }, [guestData, selectedDate, selectedDayHour]);

  // Calculate summary stats
  const summary = useMemo(() => {
    if (flipsToDisplay.length === 0) return null;

    const totalProfit = flipsToDisplay.reduce((sum, flip) => sum + (flip.profit || 0), 0);
    const totalFlips = flipsToDisplay.length;
    const uniqueItems = new Set(flipsToDisplay.map(flip => flip.item)).size;

    return { totalProfit, totalFlips, uniqueItems };
  }, [flipsToDisplay]);

  // Table column definitions
  const flipColumns = [
    {
      key: 'item',
      label: 'Item',
      headerClass: 'text-left',
      cellClass: 'text-left',
      render: value => <span className="text-white font-medium">{value || 'Unknown Item'}</span>,
    },
    {
      key: 'account',
      label: 'Account',
      headerClass: 'text-left',
      cellClass: 'text-left',
      sortValue: row => row.account || row.accountId || 'Unknown',
      render: (value, row) => {
        const accountName = row.account || row.accountId || 'Unknown';
        return <span className="text-blue-400 font-medium text-sm">{accountName}</span>;
      },
    },
    {
      key: 'quantity',
      label: 'Qty',
      headerClass: 'text-right hidden sm:table-cell',
      cellClass: 'text-right text-gray-300 hidden sm:table-cell',
      sortValue: row => row.quantity || row.bought || row.sold || 0,
      render: (value, row) => row.quantity || row.bought || row.sold || 0,
    },
    {
      key: 'profit',
      label: 'Profit',
      headerClass: 'text-right',
      cellClass: 'text-right font-mono',
      sortValue: row => row.profit || 0,
      render: value => {
        const profit = value || 0;
        const isProfit = profit >= 0;
        return (
          <span className={`font-semibold ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
            {isProfit ? '+' : ''}
            {formatGP(profit)}
          </span>
        );
      },
    },
    {
      key: 'avgBuyPrice',
      label: 'Buy Price',
      headerClass: 'text-right hidden md:table-cell',
      cellClass: 'text-right text-gray-300 font-mono hidden md:table-cell',
      sortValue: row => row.avgBuyPrice || row.avg_buy_price || 0,
      render: (value, row) => formatGP(value || row.avg_buy_price || 0),
    },
    {
      key: 'avgSellPrice',
      label: 'Sell Price',
      headerClass: 'text-right hidden md:table-cell',
      cellClass: 'text-right text-gray-300 font-mono hidden md:table-cell',
      sortValue: row => row.avgSellPrice || row.avg_sell_price || 0,
      render: (value, row) => formatGP(value || row.avg_sell_price || 0),
    },
    {
      key: 'sellerTax',
      label: 'Tax',
      headerClass: 'text-right hidden lg:table-cell',
      cellClass: 'text-right text-gray-300 font-mono hidden lg:table-cell',
      sortValue: row => row.sellerTax || row.tax || 0,
      render: (value, row) => formatGP(value || row.tax || 0),
    },
    {
      key: 'duration',
      label: 'Duration',
      headerClass: 'text-right hidden lg:table-cell',
      cellClass: 'text-right text-gray-300 hidden lg:table-cell',
      sortValue: row => {
        const firstBuyTime = row.firstBuyTime || row.first_buy_time;
        const lastSellTime = row.lastSellTime || row.last_sell_time;
        if (!firstBuyTime || !lastSellTime) return 0;
        return new Date(lastSellTime).getTime() - new Date(firstBuyTime).getTime();
      },
      render: (_, row) => {
        const firstBuyTime = row.firstBuyTime || row.first_buy_time;
        const lastSellTime = row.lastSellTime || row.last_sell_time;
        const buy = firstBuyTime ? new Date(firstBuyTime) : null;
        const sell = lastSellTime ? new Date(lastSellTime) : null;
        const duration = buy && sell ? sell.getTime() - buy.getTime() : null;
        return duration ? formatDuration(duration) : '—';
      },
    },
    {
      key: 'lastSellTime',
      label: 'Time',
      headerClass: 'text-right hidden lg:table-cell',
      cellClass: 'text-right text-gray-300 hidden lg:table-cell',
      sortValue: row => {
        const lastSellTime = row.lastSellTime || row.last_sell_time;
        return lastSellTime ? new Date(lastSellTime).getTime() : 0;
      },
      render: (value, row) => formatTime(value || row.last_sell_time),
    },
    {
      key: 'date',
      label: 'Date',
      headerClass: 'text-right hidden xl:table-cell',
      cellClass: 'text-right text-gray-300 text-xs hidden xl:table-cell',
      sortValue: row => row.date || '',
    },
  ];

  // Get header text based on filter type
  const getHeaderText = () => {
    if (selectedDate) {
      return `Flip Logs - ${selectedDate}`;
    } else if (selectedDayHour) {
      const dayNames = [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ];
      const formatHour = hour => {
        if (hour === 0) return '12am';
        if (hour === 12) return '12pm';
        if (hour < 12) return `${hour}am`;
        return `${hour - 12}pm`;
      };
      return `Flip Logs - ${dayNames[selectedDayHour.day]} ${formatHour(selectedDayHour.hour)}`;
    }
    return 'All Flip Logs';
  };

  const getSubtitleText = () => {
    if (selectedDate) {
      return `All transactions completed on ${selectedDate}`;
    } else if (selectedDayHour) {
      const dayNames = [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ];
      const formatHour = hour => {
        if (hour === 0) return '12am';
        if (hour === 12) return '12pm';
        if (hour < 12) return `${hour}am`;
        return `${hour - 12}pm`;
      };
      return `All transactions completed on ${dayNames[selectedDayHour.day]} at ${formatHour(selectedDayHour.hour)}`;
    }
    return `All transactions from ${Object.keys(guestData?.flipsByDate || {}).length} trading days`;
  };

  if (!guestData?.flipsByDate || Object.keys(guestData.flipsByDate).length === 0) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">📋 Flip Logs</h3>
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1 bg-gray-700 text-white text-sm rounded hover:bg-gray-600"
            >
              ← Back
            </button>
          )}
        </div>
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📭</div>
          <p className="text-gray-400 text-lg">No transaction data available</p>
          <p className="text-gray-500 text-sm mt-2">
            Individual flip data is only available when uploading CSV files that contain transaction
            details.
          </p>
        </div>
      </div>
    );
  }

  if (flipsToDisplay.length === 0) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-xl font-bold text-white">📋 {getHeaderText()}</h3>
            <p className="text-gray-400 text-sm">{getSubtitleText()}</p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1 bg-gray-700 text-white text-sm rounded hover:bg-gray-600"
            >
              ← Back
            </button>
          )}
        </div>
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📭</div>
          <p className="text-gray-400 text-lg">No flips found for this filter</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-white">📋 {getHeaderText()}</h3>
          <p className="text-gray-400 text-sm">{getSubtitleText()}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="px-3 py-1 bg-gray-700 text-white text-sm rounded hover:bg-gray-600"
          >
            ← Back
          </button>
        )}
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-700 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-400">{summary.totalFlips}</div>
            <div className="text-sm text-gray-400">flips</div>
          </div>
          <div className="bg-gray-700 p-4 rounded-lg text-center">
            <div
              className={`text-2xl font-bold ${summary.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}
            >
              {formatGP(summary.totalProfit)}
            </div>
            <div className="text-sm text-gray-400">total profit</div>
          </div>
          <div className="bg-gray-700 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-white">{summary.uniqueItems}</div>
            <div className="text-sm text-gray-400">items</div>
          </div>
        </div>
      )}

      {/* Flips Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-gray-700 pb-3">
          <h4 className="text-lg font-semibold text-white">
            Individual Transactions ({flipsToDisplay.length})
          </h4>
        </div>

        <SortableTable
          data={flipsToDisplay}
          columns={flipColumns}
          initialSortField={sortField}
          initialSortDirection={sortDirection}
          className="text-sm"
        />
      </div>

      <p className="text-xs text-gray-500 mt-4">
        💡 Click column headers to sort. Some columns are hidden on smaller screens to improve
        readability.
      </p>
    </div>
  );
}
