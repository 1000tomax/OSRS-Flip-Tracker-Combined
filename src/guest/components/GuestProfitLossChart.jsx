import React, { useMemo } from 'react';
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

  // Calculate max value for Y-axis scaling
  const maxValue = useMemo(() => {
    if (chartData.length === 0) return 0;
    const maxProfit = Math.max(...chartData.map(d => d.profit));
    const maxLoss = Math.max(...chartData.map(d => Math.abs(d.loss)));
    return Math.max(maxProfit, maxLoss);
  }, [chartData]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-900 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium">{data.displayDate}</p>
          <p className="text-gray-400 text-xs">{data.displayLabel}</p>
          <div className="space-y-1 text-sm mt-2">
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-400">Profits:</span>
              <span className="text-green-400 font-medium">{formatGP(data.displayProfit)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-400">Losses:</span>
              <span className="text-red-400 font-medium">{formatGP(-data.displayLoss)}</span>
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
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-600 rounded-xl p-6">
        <p className="text-gray-400">No profit/loss data available</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-xl p-6">
      <div className="mb-4">
        <h3 className="text-xl font-bold text-white">Daily Profit & Loss Distribution</h3>
        <p className="text-sm text-gray-400 mt-1">
          Green bars show daily profits, red bars show daily losses
        </p>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={chartData}
            margin={{ top: 20, right: 30, left: 60, bottom: 40 }}
            stackOffset="sign"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            
            <XAxis
              dataKey="displayLabel"
              stroke="#9CA3AF"
              tick={false} // Hide individual tick labels like flip volume chart
              label={{
                value:
                  chartData.length > 0
                    ? `${chartData[0].displayDate} - ${chartData[chartData.length - 1].displayDate}`
                    : '',
                position: 'insideBottom',
                offset: -5,
                style: { textAnchor: 'middle', fill: '#9CA3AF', fontSize: 14, fontWeight: 500 },
              }}
            />
            
            <YAxis
              stroke="#9CA3AF"
              tickFormatter={value => formatGP(value)}
              domain={[
                dataMin => Math.min(dataMin * 1.1, -maxValue * 0.1),
                dataMax => Math.max(dataMax * 1.1, maxValue * 0.1)
              ]}
              label={{
                value: 'Daily P&L',
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
            />
            
            <Bar 
              dataKey="loss" 
              stackId="stack"
              fill="rgba(239, 68, 68, 0.8)"
              radius={[0, 0, 4, 4]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-gray-700">
        <div className="text-center">
          <p className="text-xs text-gray-400 mb-1">Total Profits</p>
          <p className="text-lg font-bold text-green-400">
            {formatGP(chartData.reduce((sum, d) => sum + d.displayProfit, 0))}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400 mb-1">Total Losses</p>
          <p className="text-lg font-bold text-red-400">
            {formatGP(-chartData.reduce((sum, d) => sum + d.displayLoss, 0))}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400 mb-1">Net Profit</p>
          <p className="text-lg font-bold text-blue-400">
            {formatGP(chartData.reduce((sum, d) => sum + d.net, 0))}
          </p>
        </div>
      </div>
    </div>
  );
}