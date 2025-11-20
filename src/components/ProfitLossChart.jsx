import React, { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { formatGP } from '../utils/formatUtils';
import ChartFullscreenModal from './ChartFullscreenModal';

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

export default function ProfitLossChart({ guestData }) {
  const [selectedDay, setSelectedDay] = useState(null);
  const [intervalMinutes, setIntervalMinutes] = useState(30); // Default to 30 minutes
  const [selectedInterval, setSelectedInterval] = useState(null);
  const [showTransactions, setShowTransactions] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'time', direction: 'desc' });
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Get sorted list of dates for navigation
  const sortedDates = useMemo(() => {
    if (!guestData?.flipsByDate) return [];
    return Object.keys(guestData.flipsByDate).sort((a, b) => {
      const [aMonth, aDay, aYear] = a.split('-');
      const [bMonth, bDay, bYear] = b.split('-');
      const dateA = new Date(aYear, aMonth - 1, aDay);
      const dateB = new Date(bYear, bMonth - 1, bDay);
      return dateA - dateB;
    });
  }, [guestData]);
  // Process data to calculate daily profits and losses
  const chartData = useMemo(() => {
    if (!guestData?.flipsByDate) return [];

    const dailyData = [];
    const dates = Object.keys(guestData.flipsByDate).sort((a, b) => {
      // Sort dates properly considering year (MM-DD-YYYY format)
      const [aMonth, aDay, aYear] = a.split('-');
      const [bMonth, bDay, bYear] = b.split('-');
      const dateA = new Date(aYear, aMonth - 1, aDay);
      const dateB = new Date(bYear, bMonth - 1, bDay);
      return dateA - dateB;
    });

    dates.forEach((date, index) => {
      const dayData = guestData.flipsByDate[date];
      const flips = Array.isArray(dayData) ? dayData : dayData.flips || [];

      if (!Array.isArray(flips)) return;

      // Calculate profit and loss sums for the day
      let dailyProfit = 0;
      let dailyLoss = 0;

      flips.forEach(flip => {
        const profit = flip.profit || 0;
        if (profit > 0) {
          dailyProfit += profit;
        } else {
          dailyLoss += Math.abs(profit); // Store as positive for display
        }
      });

      // Format date for display
      const dateObj = new Date(date);
      const displayDate = `${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getDate().toString().padStart(2, '0')}/${dateObj.getFullYear()}`;

      const net = dailyProfit - dailyLoss;

      dailyData.push({
        date,
        displayDate,
        displayLabel: `Day ${index + 1}`,
        profit: dailyProfit, // Positive value going up
        loss: -dailyLoss, // Negative value going down
        displayProfit: dailyProfit,
        displayLoss: dailyLoss,
        net,
      });
    });

    return dailyData;
  }, [guestData]);

  // Process interval data for selected day
  const intervalData = useMemo(() => {
    if (!selectedDay || !guestData?.flipsByDate?.[selectedDay]) return [];

    const dayData = guestData.flipsByDate[selectedDay];
    const flips = Array.isArray(dayData) ? dayData : dayData.flips || [];

    // Calculate number of intervals based on selected interval minutes
    const totalMinutesInDay = 24 * 60;
    const numberOfIntervals = Math.floor(totalMinutesInDay / intervalMinutes);

    const intervals = [];
    for (let i = 0; i < numberOfIntervals; i++) {
      const startMinutes = i * intervalMinutes;
      const endMinutes = startMinutes + intervalMinutes;

      // Format the time label
      const startHour = Math.floor(startMinutes / 60);
      const startMin = startMinutes % 60;
      const endHour = Math.floor(endMinutes / 60);
      const _endMin = endMinutes % 60;

      let timeLabel;
      if (intervalMinutes < 60) {
        timeLabel = `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`;
      } else if (intervalMinutes === 60) {
        timeLabel = `${startHour.toString().padStart(2, '0')}:00`;
      } else {
        timeLabel = `${startHour.toString().padStart(2, '0')}:00-${endHour.toString().padStart(2, '0')}:00`;
      }

      intervals.push({
        startMinutes,
        endMinutes,
        label: timeLabel,
        displayLabel: timeLabel,
        profit: 0,
        loss: 0,
        displayProfit: 0,
        displayLoss: 0,
        net: 0,
        flipCount: 0,
        flips: [], // Store actual flip objects
      });
    }

    // Aggregate flips into intervals
    flips.forEach(flip => {
      // Try to get timestamp from either sell time or buy time
      const timestamp =
        flip.lastSellTime || flip.last_sell_time || flip.firstBuyTime || flip.first_buy_time;

      if (!timestamp) return;

      const flipDate = new Date(timestamp);
      const minuteOfDay = flipDate.getHours() * 60 + flipDate.getMinutes();

      // Find the appropriate interval
      const intervalIndex = Math.floor(minuteOfDay / intervalMinutes);
      if (intervalIndex >= 0 && intervalIndex < intervals.length) {
        const profit = flip.profit || 0;
        if (profit > 0) {
          intervals[intervalIndex].profit += profit;
          intervals[intervalIndex].displayProfit += profit;
        } else {
          intervals[intervalIndex].loss += profit; // Negative value
          intervals[intervalIndex].displayLoss += Math.abs(profit);
        }
        intervals[intervalIndex].net += profit;
        intervals[intervalIndex].flipCount += 1;
        intervals[intervalIndex].flips.push(flip); // Store the flip
      }
    });

    // Return all intervals to show gaps in trading activity
    return intervals;
  }, [selectedDay, guestData, intervalMinutes]);

  // Calculate max value for Y-axis scaling
  const maxValue = useMemo(() => {
    const data = selectedDay ? intervalData : chartData;
    if (data.length === 0) return 0;
    const maxProfit = Math.max(...data.map(d => d.profit || d.displayProfit || 0));
    const maxLoss = Math.max(...data.map(d => Math.abs(d.loss || d.displayLoss || 0)));
    return Math.max(maxProfit, maxLoss);
  }, [chartData, intervalData, selectedDay]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-900 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium">
            {selectedDay ? `${selectedDay} @ ${data.displayLabel}` : data.displayDate}
          </p>
          {!selectedDay && <p className="text-gray-400 text-xs">{data.displayLabel}</p>}
          {selectedDay && data.flipCount !== undefined && (
            <p className="text-gray-400 text-xs">
              {data.flipCount} flip{data.flipCount !== 1 ? 's' : ''}
            </p>
          )}
          <div className="space-y-1 text-sm mt-2">
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-400">Profits:</span>
              <span className="text-green-400 font-medium">
                {formatGP(data.displayProfit || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-400">Losses:</span>
              <span className="text-red-400 font-medium">{formatGP(-(data.displayLoss || 0))}</span>
            </div>
            <div className="border-t border-gray-700 pt-1 mt-1">
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-300 font-medium">Net:</span>
                <span
                  className={data.net >= 0 ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}
                >
                  {formatGP(data.net)}
                </span>
              </div>
            </div>
          </div>
          {!selectedDay && !showTransactions && (
            <p className="text-xs text-blue-300 mt-2 italic">Click to view hourly breakdown</p>
          )}
          {selectedDay && !showTransactions && (
            <p className="text-xs text-blue-300 mt-2 italic">Click to view transactions</p>
          )}
        </div>
      );
    }
    return null;
  };

  // Handle bar click
  const handleBarClick = data => {
    if (!selectedDay && data && data.date) {
      // First level: clicking daily view to see intervals
      setSelectedDay(data.date);
    } else if (selectedDay && !showTransactions && data) {
      // Second level: clicking interval to see transactions
      setSelectedInterval(data);
      setShowTransactions(true);
    }
  };

  // Handle back navigation
  const handleBack = () => {
    if (showTransactions) {
      // Go back from transactions to intervals
      setShowTransactions(false);
      setSelectedInterval(null);
      setSortConfig({ key: 'time', direction: 'desc' }); // Reset sort
    } else if (selectedDay) {
      // Go back from intervals to daily view
      setSelectedDay(null);
      setIntervalMinutes(30); // Reset to default
    }
  };

  // Navigate to previous/next day
  const navigateDay = direction => {
    if (!selectedDay || sortedDates.length === 0) return;

    const currentIndex = sortedDates.indexOf(selectedDay);
    if (currentIndex === -1) return;

    let newIndex;
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : sortedDates.length - 1; // Wrap to last
    } else {
      newIndex = currentIndex < sortedDates.length - 1 ? currentIndex + 1 : 0; // Wrap to first
    }

    setSelectedDay(sortedDates[newIndex]);
    setSelectedInterval(null);
    setShowTransactions(false);
  };

  // Handle sorting
  const handleSort = key => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Sort transactions
  const sortedTransactions = useMemo(() => {
    if (!selectedInterval?.flips) return [];

    const sorted = [...selectedInterval.flips].sort((a, b) => {
      let aValue, bValue;

      switch (sortConfig.key) {
        case 'item':
          aValue = a.item.toLowerCase();
          bValue = b.item.toLowerCase();
          break;
        case 'quantity':
          aValue = a.quantity || a.bought || a.sold || 0;
          bValue = b.quantity || b.bought || b.sold || 0;
          break;
        case 'buyPrice':
          aValue = a.avgBuyPrice || a.avg_buy_price || 0;
          bValue = b.avgBuyPrice || b.avg_buy_price || 0;
          break;
        case 'sellPrice':
          aValue = a.avgSellPrice || a.avg_sell_price || 0;
          bValue = b.avgSellPrice || b.avg_sell_price || 0;
          break;
        case 'profit':
          aValue = a.profit || 0;
          bValue = b.profit || 0;
          break;
        case 'time':
        default:
          aValue = new Date(a.lastSellTime || a.last_sell_time || 0).getTime();
          bValue = new Date(b.lastSellTime || b.last_sell_time || 0).getTime();
          break;
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [selectedInterval, sortConfig]);

  if (chartData.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-600 rounded-xl p-6">
        <p className="text-gray-400">No profit/loss data available</p>
      </div>
    );
  }

  // Determine which data to use
  const displayData = selectedDay ? intervalData : chartData;

  // Chart content render function (used in both normal and fullscreen)
  const renderChartContent = (isInFullscreen = false) => (
    <div className={isInFullscreen ? '' : 'bg-gray-800 border border-gray-600 rounded-xl p-6'}>
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white">
              {selectedDay ? `Profit & Loss - ${selectedDay}` : 'Daily Profit & Loss Distribution'}
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              {selectedDay
                ? `${intervalMinutes}-minute intervals showing trading activity throughout the day`
                : 'Green bars show daily profits, red bars show daily losses (click a bar to drill down)'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Day navigation buttons - only show when viewing a specific day */}
            {selectedDay && !showTransactions && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => navigateDay('prev')}
                  className="p-1 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                  title="Previous day"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => navigateDay('next')}
                  className="p-1 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                  title="Next day"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
            )}

            {/* Interval selector and back button - only show when needed */}
            {(selectedDay || showTransactions) && (
              <>
                {/* Interval selector - only show when viewing intervals, not transactions */}
                {selectedDay && !showTransactions && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Interval:</span>
                    <select
                      value={intervalMinutes}
                      onChange={e => setIntervalMinutes(Number(e.target.value))}
                      className="px-2 py-1 bg-gray-700 text-white text-sm rounded border border-gray-600 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={15}>15 min</option>
                      <option value={30}>30 min</option>
                      <option value={60}>1 hour</option>
                      <option value={120}>2 hours</option>
                      <option value={240}>4 hours</option>
                      <option value={360}>6 hours</option>
                    </select>
                  </div>
                )}
                {/* Back button with dynamic label */}
                <button
                  onClick={handleBack}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-sm transition-colors"
                >
                  ← {showTransactions ? 'Back to Intervals' : 'Back to Daily View'}
                </button>
              </>
            )}

            {/* Maximize button - always show when not in fullscreen modal */}
            {!isInFullscreen && (
              <button
                onClick={() => setIsFullscreen(true)}
                className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
                title="Maximize chart"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Only show chart when not viewing transactions */}
      {!showTransactions && (
        <div className={isInFullscreen ? 'h-[60vh]' : 'h-80'}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={displayData}
              margin={{ top: 20, right: 30, left: 60, bottom: 40 }}
              stackOffset="sign"
              onClick={e => {
                if (e && e.activePayload && e.activePayload[0]) {
                  handleBarClick(e.activePayload[0].payload);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />

              <XAxis
                dataKey="displayLabel"
                stroke="#9CA3AF"
                tick={selectedDay ? { fontSize: 10, angle: -45, textAnchor: 'end' } : false}
                height={selectedDay ? 60 : undefined}
                interval={selectedDay ? Math.floor(displayData.length / 12) : undefined}
                label={
                  !selectedDay
                    ? {
                        value:
                          chartData.length > 0
                            ? `${chartData[0].displayDate} - ${chartData[chartData.length - 1].displayDate}`
                            : '',
                        position: 'insideBottom',
                        offset: -5,
                        style: {
                          textAnchor: 'middle',
                          fill: '#9CA3AF',
                          fontSize: 14,
                          fontWeight: 500,
                        },
                      }
                    : undefined
                }
              />

              <YAxis
                stroke="#9CA3AF"
                tickFormatter={value => formatGP(value)}
                domain={[
                  dataMin =>
                    Math.min(dataMin * CHART.Y_PAD_TOP_MULT, -maxValue * CHART.Y_PAD_BOTTOM_MULT),
                  dataMax =>
                    Math.max(dataMax * CHART.Y_PAD_TOP_MULT, maxValue * CHART.Y_PAD_BOTTOM_MULT),
                ]}
                label={{
                  value: selectedDay
                    ? `${intervalMinutes < 60 ? `${intervalMinutes} min` : `${intervalMinutes / 60} hr`} P&L`
                    : 'Daily P&L',
                  angle: -90,
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fill: '#9CA3AF', fontSize: 12 },
                }}
              />

              <Tooltip content={<CustomTooltip />} />

              {/* Zero reference line */}
              <ReferenceLine y={0} stroke="#6B7280" strokeWidth={2} />

              {/* Stack the bars with sign offset to create mirror effect */}
              <Bar
                dataKey="profit"
                stackId="stack"
                fill="rgba(34, 197, 94, 0.8)"
                radius={[4, 4, 0, 0]}
                cursor="pointer"
              />

              <Bar
                dataKey="loss"
                stackId="stack"
                fill="rgba(239, 68, 68, 0.8)"
                radius={[0, 0, 4, 4]}
                cursor="pointer"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Transaction Table - shown when an interval is selected */}
      {showTransactions && selectedInterval && selectedInterval.flips && (
        <div className="mt-6 border-t border-gray-700 pt-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-white">
              Transactions for {selectedInterval.displayLabel} ({selectedInterval.flips.length}{' '}
              flips)
            </h4>
            <button
              onClick={() => {
                setShowTransactions(false);
                setSelectedInterval(null);
              }}
              className="text-gray-400 hover:text-white text-sm"
            >
              ✕ Close
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-gray-300">
              <thead className="text-xs uppercase bg-gray-900/50 text-gray-400">
                <tr>
                  <th
                    className="px-3 py-2 text-left cursor-pointer hover:bg-gray-800/50 transition-colors"
                    onClick={() => handleSort('item')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Item</span>
                      {sortConfig.key === 'item' && (
                        <span className="text-blue-400">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    className="px-3 py-2 text-right cursor-pointer hover:bg-gray-800/50 transition-colors"
                    onClick={() => handleSort('quantity')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Quantity</span>
                      {sortConfig.key === 'quantity' && (
                        <span className="text-blue-400">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    className="px-3 py-2 text-right cursor-pointer hover:bg-gray-800/50 transition-colors"
                    onClick={() => handleSort('buyPrice')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Buy Price</span>
                      {sortConfig.key === 'buyPrice' && (
                        <span className="text-blue-400">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    className="px-3 py-2 text-right cursor-pointer hover:bg-gray-800/50 transition-colors"
                    onClick={() => handleSort('sellPrice')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Sell Price</span>
                      {sortConfig.key === 'sellPrice' && (
                        <span className="text-blue-400">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    className="px-3 py-2 text-right cursor-pointer hover:bg-gray-800/50 transition-colors"
                    onClick={() => handleSort('profit')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Profit</span>
                      {sortConfig.key === 'profit' && (
                        <span className="text-blue-400">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    className="px-3 py-2 text-right cursor-pointer hover:bg-gray-800/50 transition-colors"
                    onClick={() => handleSort('time')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Time</span>
                      {sortConfig.key === 'time' && (
                        <span className="text-blue-400">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {sortedTransactions.map((flip, index) => (
                  <tr key={index} className="hover:bg-gray-800/50">
                    <td className="px-3 py-2 text-left font-medium">{flip.item}</td>
                    <td className="px-3 py-2 text-right">
                      {(flip.quantity || flip.bought || flip.sold || 0).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatGP(flip.avgBuyPrice || flip.avg_buy_price || 0)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatGP(flip.avgSellPrice || flip.avg_sell_price || 0)}
                    </td>
                    <td
                      className={`px-3 py-2 text-right font-medium ${
                        flip.profit >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {formatGP(flip.profit || 0)}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-400">
                      {formatTime(flip.lastSellTime || flip.last_sell_time)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-900/50 font-semibold">
                <tr>
                  <td colSpan="4" className="px-3 py-2 text-right text-gray-400">
                    Interval Total:
                  </td>
                  <td
                    className={`px-3 py-2 text-right ${
                      selectedInterval.net >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {formatGP(selectedInterval.net)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-gray-700">
        <div className="text-center">
          <p className="text-xs text-gray-400 mb-1">
            {selectedDay ? 'Day Profits' : 'Total Profits'}
          </p>
          <p className="text-lg font-bold text-green-400">
            {formatGP(displayData.reduce((sum, d) => sum + (d.displayProfit || 0), 0))}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400 mb-1">
            {selectedDay ? 'Day Losses' : 'Total Losses'}
          </p>
          <p className="text-lg font-bold text-red-400">
            {formatGP(-displayData.reduce((sum, d) => sum + (d.displayLoss || 0), 0))}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400 mb-1">{selectedDay ? 'Day Net' : 'Net Profit'}</p>
          <p className="text-lg font-bold text-blue-400">
            {formatGP(displayData.reduce((sum, d) => sum + d.net, 0))}
          </p>
        </div>
      </div>
    </div>
  );

  // Main return with fullscreen modal
  return (
    <>
      {renderChartContent(false)}

      <ChartFullscreenModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        title={
          selectedDay
            ? `Profit & Loss - ${selectedDay}${showTransactions ? ` - ${selectedInterval?.displayLabel || ''}` : ''}`
            : 'Daily Profit & Loss Distribution'
        }
      >
        <div style={{ height: '80vh' }}>{renderChartContent(true)}</div>
      </ChartFullscreenModal>
    </>
  );
}
import { CHART } from '@/config/constants';
