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
import { formatGP } from '../../utils/formatUtils';

export default function GuestProfitLossChart({ guestData }) {
  const [selectedDay, setSelectedDay] = useState(null);
  const [intervalMinutes, setIntervalMinutes] = useState(30); // Default to 30 minutes
  // Process data to calculate daily profits and losses
  const chartData = useMemo(() => {
    if (!guestData?.flipsByDate) return [];

    const dailyData = [];
    const dates = Object.keys(guestData.flipsByDate).sort();

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
        profit: dailyProfit,  // Positive value going up
        loss: -dailyLoss,     // Negative value going down
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
      const endMin = endMinutes % 60;
      
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
        flipCount: 0
      });
    }

    // Aggregate flips into intervals
    flips.forEach(flip => {
      // Try to get timestamp from either sell time or buy time
      const timestamp = flip.lastSellTime || flip.last_sell_time || 
                       flip.firstBuyTime || flip.first_buy_time;
      
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
      }
    });

    // Filter out empty intervals for cleaner visualization
    return intervals.filter(interval => interval.flipCount > 0);
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
            <p className="text-gray-400 text-xs">{data.flipCount} flip{data.flipCount !== 1 ? 's' : ''}</p>
          )}
          <div className="space-y-1 text-sm mt-2">
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-400">Profits:</span>
              <span className="text-green-400 font-medium">{formatGP(data.displayProfit || 0)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-400">Losses:</span>
              <span className="text-red-400 font-medium">{formatGP(-(data.displayLoss || 0))}</span>
            </div>
            <div className="border-t border-gray-700 pt-1 mt-1">
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-300 font-medium">Net:</span>
                <span className={data.net >= 0 ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                  {formatGP(data.net)}
                </span>
              </div>
            </div>
          </div>
          {!selectedDay && (
            <p className="text-xs text-blue-300 mt-2 italic">Click to view hourly breakdown</p>
          )}
        </div>
      );
    }
    return null;
  };

  // Handle bar click
  const handleBarClick = (data) => {
    if (!selectedDay && data && data.date) {
      setSelectedDay(data.date);
    }
  };

  if (chartData.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-600 rounded-xl p-6">
        <p className="text-gray-400">No profit/loss data available</p>
      </div>
    );
  }

  // Determine which data to use
  const displayData = selectedDay ? intervalData : chartData;

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-xl p-6">
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white">
              {selectedDay 
                ? `Profit & Loss - ${selectedDay}` 
                : 'Daily Profit & Loss Distribution'}
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              {selectedDay
                ? `${intervalMinutes}-minute intervals showing trading activity throughout the day`
                : 'Green bars show daily profits, red bars show daily losses (click a bar to drill down)'}
            </p>
          </div>
          {selectedDay && (
            <div className="flex items-center gap-3">
              {/* Interval selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Interval:</span>
                <select
                  value={intervalMinutes}
                  onChange={(e) => setIntervalMinutes(Number(e.target.value))}
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
              {/* Back button */}
              <button
                onClick={() => setSelectedDay(null)}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-sm transition-colors"
              >
                ← Back to Daily View
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={displayData}
            margin={{ top: 20, right: 30, left: 60, bottom: 40 }}
            stackOffset="sign"
            onClick={(e) => {
              if (!selectedDay && e && e.activePayload && e.activePayload[0]) {
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
              label={!selectedDay ? {
                value:
                  chartData.length > 0
                    ? `${chartData[0].displayDate} - ${chartData[chartData.length - 1].displayDate}`
                    : '',
                position: 'insideBottom',
                offset: -5,
                style: { textAnchor: 'middle', fill: '#9CA3AF', fontSize: 14, fontWeight: 500 },
              } : undefined}
            />
            
            <YAxis
              stroke="#9CA3AF"
              tickFormatter={value => formatGP(value)}
              domain={[
                dataMin => Math.min(dataMin * 1.1, -maxValue * 0.1),
                dataMax => Math.max(dataMax * 1.1, maxValue * 0.1)
              ]}
              label={{
                value: selectedDay 
                  ? `${intervalMinutes < 60 ? intervalMinutes + ' min' : intervalMinutes/60 + ' hr'} P&L` 
                  : 'Daily P&L',
                angle: -90,
                position: 'insideLeft',
                style: { textAnchor: 'middle', fill: '#9CA3AF', fontSize: 12 },
              }}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            {/* Zero reference line */}
            <ReferenceLine 
              y={0} 
              stroke="#6B7280" 
              strokeWidth={2}
            />
            
            {/* Stack the bars with sign offset to create mirror effect */}
            <Bar 
              dataKey="profit" 
              stackId="stack"
              fill="rgba(34, 197, 94, 0.8)"
              radius={[4, 4, 0, 0]}
              cursor={!selectedDay ? "pointer" : "default"}
            />
            
            <Bar 
              dataKey="loss" 
              stackId="stack"
              fill="rgba(239, 68, 68, 0.8)"
              radius={[0, 0, 4, 4]}
              cursor={!selectedDay ? "pointer" : "default"}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

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
          <p className="text-xs text-gray-400 mb-1">
            {selectedDay ? 'Day Net' : 'Net Profit'}
          </p>
          <p className="text-lg font-bold text-blue-400">
            {formatGP(displayData.reduce((sum, d) => sum + d.net, 0))}
          </p>
        </div>
      </div>
    </div>
  );
}