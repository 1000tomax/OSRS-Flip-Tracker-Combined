import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { getItemTimePatterns } from '../utils/dataProcessing';
import { formatGP } from '../../utils/formatUtils';

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getIntensityColor(value, maxValue) {
  if (!maxValue || !isFinite(maxValue) || maxValue === 0) return 'bg-gray-700';
  const normalized = Math.abs(value) / maxValue;
  if (value < 0) {
    if (normalized >= 0.8) return 'bg-red-400';
    if (normalized >= 0.6) return 'bg-red-500';
    if (normalized >= 0.4) return 'bg-red-600';
    if (normalized >= 0.2) return 'bg-red-700';
    return 'bg-red-900';
  }
  if (normalized >= 0.8) return 'bg-green-400';
  if (normalized >= 0.6) return 'bg-green-500';
  if (normalized >= 0.4) return 'bg-green-600';
  if (normalized >= 0.2) return 'bg-green-700';
  if (normalized > 0) return 'bg-green-900';
  return 'bg-gray-700';
}

function formatHour(hour) {
  if (hour === 0) return '12am';
  if (hour === 12) return '12pm';
  if (hour < 12) return `${hour}am`;
  return `${hour - 12}pm`;
}

export default function GuestItemHeatMap({
  itemName,
  guestData,
  metric = 'profit',
  minFlipsThreshold = 2,
  onCellClick,
}) {
  const cells = useMemo(
    () => getItemTimePatterns(itemName, guestData?.flipsByDate),
    [itemName, guestData]
  );

  const [selectedMetric, setSelectedMetric] = useState(metric);

  const maxValues = useMemo(() => {
    let maxProfit = 0,
      maxFlips = 0,
      maxAvg = 0;
    cells.forEach(c => {
      maxProfit = Math.max(maxProfit, Math.abs(c.profit));
      maxFlips = Math.max(maxFlips, c.flips);
      if (c.flips >= minFlipsThreshold) maxAvg = Math.max(maxAvg, Math.abs(c.avgProfit));
    });
    return { maxProfit, maxFlips, maxAvg };
  }, [cells, minFlipsThreshold]);

  const grouped = useMemo(() => {
    const g = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => null));
    cells.forEach(c => {
      g[c.day][c.hour] = c;
    });
    return g;
  }, [cells]);

  // Top performing time slots for quick insights
  const topSlots = useMemo(() => {
    const working = [...cells];
    if (selectedMetric === 'flips') working.sort((a, b) => b.flips - a.flips);
    else if (selectedMetric === 'avg') working.sort((a, b) => b.avgProfit - a.avgProfit);
    else working.sort((a, b) => b.profit - a.profit);
    return working.slice(0, 5);
  }, [cells, selectedMetric]);

  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
        <div>
          <h3 className="text-xl font-bold text-white">Item Trading Heat Map</h3>
          <p className="text-xs text-gray-400 mt-1">
            {itemName} • Hours in {userTimezone}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedMetric('profit')}
            className={`px-3 py-1 text-sm rounded ${selectedMetric === 'profit' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          >
            Profit
          </button>
          <button
            onClick={() => setSelectedMetric('flips')}
            className={`px-3 py-1 text-sm rounded ${selectedMetric === 'flips' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          >
            Flips
          </button>
          <button
            onClick={() => setSelectedMetric('avg')}
            className={`px-3 py-1 text-sm rounded ${selectedMetric === 'avg' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          >
            GP/Flip
          </button>
        </div>
      </div>

      <div className="overflow-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="px-2 py-1 text-left text-gray-300 sticky left-0 bg-gray-800">
                Day/Hour
              </th>
              {Array.from({ length: 24 }, (_, h) => (
                <th key={h} className="px-2 py-1 text-center text-gray-300">
                  {formatHour(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grouped.map((row, dayIdx) => (
              <tr key={dayIdx}>
                <td className="px-2 py-1 text-gray-300 sticky left-0 bg-gray-800">
                  {dayNames[dayIdx]}
                </td>
                {row.map((cell, hourIdx) => {
                  const value = !cell
                    ? 0
                    : selectedMetric === 'flips'
                      ? cell.flips
                      : selectedMetric === 'avg'
                        ? cell.flips >= minFlipsThreshold
                          ? cell.avgProfit
                          : 0
                        : cell.profit;
                  const maxRef =
                    selectedMetric === 'flips'
                      ? maxValues.maxFlips
                      : selectedMetric === 'avg'
                        ? maxValues.maxAvg
                        : maxValues.maxProfit;
                  const color = getIntensityColor(value, maxRef);
                  const tooltip = !cell
                    ? 'No data'
                    : `${dayNames[dayIdx]} ${formatHour(hourIdx)}\nFlips: ${cell.flips}\nProfit: ${formatGP(cell.profit)}\nAvg: ${formatGP(cell.avgProfit)}`;
                  return (
                    <td key={hourIdx} className="p-0.5">
                      <button
                        title={tooltip}
                        onClick={
                          onCellClick
                            ? () => onCellClick({ day: dayIdx, hour: hourIdx, ...cell })
                            : undefined
                        }
                        className={`w-8 h-6 sm:w-10 sm:h-7 md:w-12 md:h-8 rounded ${color} hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4">
        <h4 className="text-sm font-semibold text-white mb-2">Top Time Slots</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {topSlots.map((c, idx) => (
            <div
              key={`${c.day}-${c.hour}-${idx}`}
              className="bg-gray-700/60 rounded p-2 text-gray-200"
            >
              <div className="text-xs text-gray-300">
                {dayNames[c.day]} • {formatHour(c.hour)}
              </div>
              <div className="text-xs">
                Flips: <span className="text-gray-100">{c.flips}</span>
              </div>
              <div className="text-xs">
                Profit:{' '}
                <span className={c.profit >= 0 ? 'text-green-300' : 'text-red-300'}>
                  {formatGP(c.profit)}
                </span>
              </div>
              <div className="text-xs">
                Avg/Flip: <span className="text-gray-100">{formatGP(c.avgProfit)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

GuestItemHeatMap.propTypes = {
  itemName: PropTypes.string.isRequired,
  guestData: PropTypes.object,
  metric: PropTypes.oneOf(['profit', 'flips', 'avg']),
  minFlipsThreshold: PropTypes.number,
  onCellClick: PropTypes.func,
};
