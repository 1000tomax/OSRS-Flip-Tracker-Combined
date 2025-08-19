import React from 'react';
import { formatGP } from '../../utils/formatGP';
import { dayNames, formatHour } from '../../utils/analyticsCalculations';

export default function HeatMapCell({ day, hour, value, metric, color, onClick }) {
  const [showTooltip, setShowTooltip] = React.useState(false);

  const formatValue = () => {
    if (value === 0) return '—';

    switch (metric) {
      case 'profit':
      case 'volume':
      case 'gpPerHour':
        return formatGP(Math.round(value));
      case 'avgRoi':
        return `${value.toFixed(1)}%`;
      case 'flips':
        return value.toString();
      default:
        return value.toString();
    }
  };

  const getMetricLabel = () => {
    switch (metric) {
      case 'profit':
        return 'Profit';
      case 'volume':
        return 'Volume';
      case 'flips':
        return 'Flips';
      case 'avgRoi':
        return 'Avg ROI';
      case 'gpPerHour':
        return 'GP/Hour';
      default:
        return metric;
    }
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div
        className={`
          w-full h-8 ${color} border border-gray-800 
          cursor-pointer transition-all duration-200
          hover:border-yellow-500 hover:z-10 hover:scale-110
          flex items-center justify-center
        `}
        onClick={() => onClick && onClick(day, hour)}
      >
        <span className="text-xs text-gray-300 font-medium">{value > 0 ? formatValue() : ''}</span>
      </div>

      {showTooltip && value > 0 && (
        <div
          className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 
                        bg-gray-800 text-white p-2 rounded shadow-lg whitespace-nowrap
                        border border-gray-600"
        >
          <div className="text-xs">
            <div className="font-semibold text-yellow-400">
              {dayNames[day]}, {formatHour(hour)}
            </div>
            <div className="mt-1">
              <span className="text-gray-400">{getMetricLabel()}:</span>{' '}
              <span className="font-medium">{formatValue()}</span>
            </div>
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
            <div className="border-4 border-transparent border-t-gray-800"></div>
          </div>
        </div>
      )}
    </div>
  );
}
