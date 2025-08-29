import React, { useMemo, useState } from 'react';
import { formatGP } from '../../utils/formatUtils';

// Color intensity function for green/red gradient
const getIntensityColor = (value, maxValue) => {
  if (value === 0 || maxValue === 0) return 'bg-gray-700';

  const normalized = Math.abs(value) / maxValue;

  // Negative values get red shades
  if (value < 0) {
    if (normalized >= 0.8) return 'bg-red-400';
    if (normalized >= 0.6) return 'bg-red-500';
    if (normalized >= 0.4) return 'bg-red-600';
    if (normalized >= 0.2) return 'bg-red-700';
    return 'bg-red-900';
  }

  // Positive values get green shades
  if (normalized >= 0.8) return 'bg-green-400';
  if (normalized >= 0.6) return 'bg-green-500';
  if (normalized >= 0.4) return 'bg-green-600';
  if (normalized >= 0.2) return 'bg-green-700';
  if (normalized > 0) return 'bg-green-900';
  return 'bg-gray-700';
};

// Format hour for display
const formatHour = hour => {
  if (hour === 0) return '12am';
  if (hour === 12) return '12pm';
  if (hour < 12) return `${hour}am`;
  return `${hour - 12}pm`;
};

export default function GuestHeatMap({ guestData, onCellClick = null }) {
  // Metric toggle state: 'profit', 'transactions', 'profitPerFlip'
  const [selectedMetric, setSelectedMetric] = useState('profit');

  // Minimum flips required to show GP/Flip data (configurable by user)
  const [minFlipsThreshold, setMinFlipsThreshold] = useState(3);

  const heatMapData = useMemo(() => {
    if (!guestData?.flipsByDate) return { grid: {}, totalProfit: 0, totalTransactions: 0 };

    // Initialize 7x24 grid (day of week x hour of day)
    const grid = {};
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Initialize empty grid
    for (let day = 0; day < 7; day++) {
      grid[day] = {};
      for (let hour = 0; hour < 24; hour++) {
        grid[day][hour] = {
          profit: 0,
          transactions: 0,
          percentage: 0,
          profitPerFlip: 0,
        };
      }
    }

    let totalProfit = 0;
    let totalTransactions = 0;

    // Process all flips
    Object.entries(guestData.flipsByDate).forEach(([, flips]) => {
      flips.forEach(flip => {
        // Parse the sell time to get day of week and hour
        if (flip.lastSellTime) {
          const sellDate = new Date(flip.lastSellTime);
          const dayOfWeek = sellDate.getDay(); // 0 = Sunday, 6 = Saturday
          const hour = sellDate.getHours(); // 0-23

          // Add to the grid
          if (grid[dayOfWeek] && grid[dayOfWeek][hour]) {
            grid[dayOfWeek][hour].profit += flip.profit || 0;
            grid[dayOfWeek][hour].transactions += 1;
            totalProfit += flip.profit || 0;
            totalTransactions += 1;
          }
        }
      });
    });

    // Calculate percentages and profit per flip
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        // Calculate percentage of total profit
        grid[day][hour].percentage =
          totalProfit > 0 ? (grid[day][hour].profit / totalProfit) * 100 : 0;

        // Calculate profit per flip only if we have enough flips for meaningful data
        grid[day][hour].profitPerFlip =
          grid[day][hour].transactions >= minFlipsThreshold
            ? grid[day][hour].profit / grid[day][hour].transactions
            : 0;
      }
    }

    return {
      grid,
      totalProfit,
      totalTransactions,
      dayNames,
    };
  }, [guestData, minFlipsThreshold]);

  // Calculate max values for each metric, considering the minimum flip threshold
  const maxValues = useMemo(() => {
    let maxProfit = 0;
    let maxTransactions = 0;
    let maxPercentage = 0;
    let maxProfitPerFlip = 0;

    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const cell = heatMapData.grid[day]?.[hour];
        if (cell) {
          // Always include profit and transactions in the scale
          maxProfit = Math.max(maxProfit, Math.abs(cell.profit));
          maxTransactions = Math.max(maxTransactions, cell.transactions);
          maxPercentage = Math.max(maxPercentage, Math.abs(cell.percentage));

          // Only include profitPerFlip in the scale if it meets the threshold
          // This makes the color scale adjust to only the visible GP/Flip data
          if (selectedMetric === 'profitPerFlip' && cell.transactions >= minFlipsThreshold) {
            maxProfitPerFlip = Math.max(maxProfitPerFlip, Math.abs(cell.profitPerFlip));
          } else if (selectedMetric !== 'profitPerFlip') {
            // For other metrics, always include all profitPerFlip data in potential scale
            maxProfitPerFlip = Math.max(maxProfitPerFlip, Math.abs(cell.profitPerFlip));
          }
        }
      }
    }

    return { maxProfit, maxTransactions, maxPercentage, maxProfitPerFlip };
  }, [heatMapData, minFlipsThreshold, selectedMetric]);

  // Get value and color for a cell based on selected metric
  const getCellData = (day, hour) => {
    const cell = heatMapData.grid[day]?.[hour];
    if (!cell) return { value: 0, display: '', color: 'bg-gray-700' };

    let value, maxValue;

    switch (selectedMetric) {
      case 'profit':
        value = cell.profit;
        maxValue = maxValues.maxProfit;
        break;
      case 'transactions':
        value = cell.transactions;
        maxValue = maxValues.maxTransactions;
        break;
      case 'profitPerFlip':
        // For GP/Flip, only show color if cell meets minimum threshold
        if (cell.transactions >= minFlipsThreshold) {
          value = cell.profitPerFlip;
          maxValue = maxValues.maxProfitPerFlip;
        } else {
          // Below threshold - show as gray (no color)
          return { value: 0, color: 'bg-gray-700', cell };
        }
        break;
      default:
        value = cell.profit;
        maxValue = maxValues.maxProfit;
    }

    const color = getIntensityColor(value, maxValue);
    return { value, color, cell };
  };

  if (!heatMapData.grid || Object.keys(heatMapData.grid).length === 0) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg">
        <p className="text-gray-400">No data available for heatmap</p>
      </div>
    );
  }

  // Get user's timezone for display
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h3 className="text-xl font-bold text-white">📊 Trading Heat Map</h3>
          <p className="text-xs text-gray-400 mt-1">Hours shown in your timezone: {userTimezone}</p>
        </div>

        {/* Metric toggle buttons and min flips input */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedMetric('profit')}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                selectedMetric === 'profit'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Total Profit
            </button>
            <button
              onClick={() => setSelectedMetric('transactions')}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                selectedMetric === 'transactions'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              # Flips
            </button>
            <button
              onClick={() => setSelectedMetric('profitPerFlip')}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                selectedMetric === 'profitPerFlip'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              GP/Flip
            </button>
          </div>

          {/* Min flips threshold input */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400">Min flips:</label>
            <input
              type="number"
              min="1"
              max="20"
              value={minFlipsThreshold}
              onChange={e => {
                const maxThreshold = 20;
                setMinFlipsThreshold(
                  Math.max(1, Math.min(maxThreshold, parseInt(e.target.value, 10) || 1))
                );
              }}
              className="w-12 px-2 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Heatmap grid - Days as rows, Hours as columns */}
      <div>
        <div className="w-full">
          {/* Hour headers */}
          <div className="grid grid-cols-[50px_repeat(24,_minmax(0,_1fr))] gap-[2px] mb-1">
            <div></div>
            {Array.from({ length: 24 }, (_, hour) => (
              <div key={hour} className="text-[10px] text-gray-400 text-center">
                {hour % 2 === 0 ? formatHour(hour) : ''}
              </div>
            ))}
          </div>

          {/* Day rows */}
          {heatMapData.dayNames.map((dayName, day) => (
            <div
              key={day}
              className="grid grid-cols-[50px_repeat(24,_minmax(0,_1fr))] gap-[2px] mb-[2px]"
            >
              <div className="text-[11px] text-gray-300 pr-1 flex items-center justify-end">
                {dayName.slice(0, 3)}
              </div>
              {Array.from({ length: 24 }, (_, hour) => {
                const cellData = getCellData(day, hour);
                return (
                  <div
                    key={`${day}-${hour}`}
                    className={`h-7 ${cellData.color} rounded-sm relative group cursor-pointer transition-all duration-200 hover:ring-1 hover:ring-green-400 hover:z-10 ${
                      onCellClick && cellData.cell?.transactions > 0
                        ? 'hover:ring-2 hover:ring-blue-400'
                        : ''
                    }`}
                    title={`${dayName} ${formatHour(hour)}${onCellClick && cellData.cell?.transactions > 0 ? ' - Click to view transactions' : ''}`}
                    onClick={() => {
                      if (onCellClick && cellData.cell?.transactions > 0) {
                        onCellClick({ day, hour, dayName, formattedHour: formatHour(hour) });
                      }
                    }}
                    onKeyDown={e => {
                      if (
                        (e.key === 'Enter' || e.key === ' ') &&
                        onCellClick &&
                        cellData.cell?.transactions > 0
                      ) {
                        e.preventDefault();
                        onCellClick({ day, hour, dayName, formattedHour: formatHour(hour) });
                      }
                    }}
                    role={onCellClick && cellData.cell?.transactions > 0 ? 'button' : undefined}
                    tabIndex={onCellClick && cellData.cell?.transactions > 0 ? 0 : undefined}
                  >
                    {/* Detailed tooltip */}
                    {cellData.cell && cellData.value !== 0 && (
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 border border-gray-600 text-white text-xs rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                        <div className="font-bold">
                          {dayName} {formatHour(hour)}
                        </div>
                        <div
                          className={cellData.cell.profit >= 0 ? 'text-green-400' : 'text-red-400'}
                        >
                          Total: {formatGP(cellData.cell.profit)}
                        </div>
                        <div>Flips: {cellData.cell.transactions}</div>
                        <div className="text-blue-400">
                          GP/Flip:{' '}
                          {cellData.cell.transactions >= minFlipsThreshold
                            ? formatGP(cellData.cell.profitPerFlip)
                            : cellData.cell.transactions > 0
                              ? `${formatGP(cellData.cell.profit / cellData.cell.transactions)} (< ${minFlipsThreshold} flips)`
                              : '0'}
                        </div>
                        <div className="text-gray-400">
                          % of Total: {cellData.cell.percentage.toFixed(2)}%
                        </div>
                        {onCellClick && cellData.cell?.transactions > 0 && (
                          <div className="text-blue-300 text-xs mt-1 border-t border-gray-600 pt-1">
                            Click to view transactions
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend and info */}
      <div className="mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          {/* Negative values legend */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-400">Loss</span>
            <div className="flex gap-1">
              <div className="w-3 h-3 bg-red-400 rounded-sm"></div>
              <div className="w-3 h-3 bg-red-600 rounded-sm"></div>
              <div className="w-3 h-3 bg-red-800 rounded-sm"></div>
            </div>
          </div>

          {/* Zero/no data */}
          <div className="w-3 h-3 bg-gray-700 rounded-sm"></div>

          {/* Positive values legend */}
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <div className="w-3 h-3 bg-green-900 rounded-sm"></div>
              <div className="w-3 h-3 bg-green-600 rounded-sm"></div>
              <div className="w-3 h-3 bg-green-400 rounded-sm"></div>
            </div>
            <span className="text-xs text-green-400">Profit</span>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-500 mt-2">
        💡 Hover over cells for details. Green = profit, Red = loss, Gray = no data. Adjust "Min
        flips" to control GP/Flip sensitivity.
      </p>
    </div>
  );
}
