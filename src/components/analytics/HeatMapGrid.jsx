import React, { useMemo } from 'react';
import HeatMapCell from './HeatMapCell';
import { getIntensityColor, formatHour } from '../../utils/analyticsCalculations';

export default function HeatMapGrid({ data, metric, colorScheme = 'green-wide' }) {
  const { maxValue, minValue } = useMemo(() => {
    let max = 0;
    let min = Infinity;

    Object.values(data).forEach(dayData => {
      Object.values(dayData).forEach(hourData => {
        const value = hourData[metric] || 0;
        if (value > max) max = value;
        if (value < min && value > 0) min = value;
      });
    });

    return { maxValue: max, minValue: min === Infinity ? 0 : min };
  }, [data, metric]);

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const hourLabels = useMemo(() => {
    const labels = [];
    for (let i = 0; i < 24; i++) {
      if (i % 3 === 0) {
        labels.push(formatHour(i));
      } else {
        labels.push('');
      }
    }
    return labels;
  }, []);

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-[auto_repeat(24,_1fr)] gap-0">
            <div className="w-12"></div>
            {hourLabels.map((label, hour) => (
              <div key={hour} className="text-xs text-gray-400 text-center pb-2">
                {label}
              </div>
            ))}

            {dayLabels.map((dayLabel, day) => (
              <React.Fragment key={day}>
                <div className="text-xs text-gray-400 pr-2 flex items-center justify-end">
                  {dayLabel}
                </div>
                {Array.from({ length: 24 }, (_, hour) => {
                  const value = data[day]?.[hour]?.[metric] || 0;
                  const color = getIntensityColor(value, maxValue, minValue, colorScheme);

                  return (
                    <HeatMapCell
                      key={`${day}-${hour}`}
                      day={day}
                      hour={hour}
                      value={value}
                      metric={metric}
                      color={color}
                    />
                  );
                })}
              </React.Fragment>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-400">Low</span>
              <div className="flex space-x-1">
                <div className="w-4 h-4 bg-gray-700 border border-gray-600"></div>
                {(() => {
                  const legendColors = {
                    'green-wide': [
                      'bg-green-950',
                      'bg-green-800',
                      'bg-green-600',
                      'bg-green-400',
                      'bg-green-300',
                    ],
                    fire: [
                      'bg-yellow-900',
                      'bg-orange-700',
                      'bg-orange-600',
                      'bg-red-600',
                      'bg-red-500',
                    ],
                    ocean: [
                      'bg-blue-950',
                      'bg-blue-800',
                      'bg-blue-600',
                      'bg-cyan-500',
                      'bg-cyan-400',
                    ],
                    purple: [
                      'bg-purple-950',
                      'bg-purple-800',
                      'bg-purple-600',
                      'bg-purple-500',
                      'bg-pink-400',
                    ],
                    gold: [
                      'bg-yellow-950',
                      'bg-yellow-800',
                      'bg-amber-600',
                      'bg-yellow-500',
                      'bg-yellow-400',
                    ],
                  };
                  const colors = legendColors[colorScheme] || legendColors['green-wide'];
                  return colors.map((color, i) => (
                    <div key={i} className={`w-4 h-4 ${color} border border-gray-600`}></div>
                  ));
                })()}
              </div>
              <span className="text-xs text-gray-400">High</span>
            </div>
          </div>
        </div>
      </div>

      <div className="md:hidden mt-4 border-t border-gray-700 pt-4">
        <p className="text-xs text-gray-400 text-center">Scroll horizontally to view all hours →</p>
      </div>
    </div>
  );
}
