import React from 'react';

export default function MetricCard({ title, value, subtitle, icon, change, color = 'blue' }) {
  const getColorClasses = () => {
    const colors = {
      green: 'text-green-400 bg-green-900/20 border-green-700',
      red: 'text-red-400 bg-red-900/20 border-red-700',
      yellow: 'text-yellow-400 bg-yellow-900/20 border-yellow-700',
      blue: 'text-blue-400 bg-blue-900/20 border-blue-700',
    };
    return colors[color] || colors.blue;
  };

  const getChangeIcon = () => {
    if (!change) return null;

    if (change > 0) {
      return (
        <span className="text-green-400 flex items-center text-sm">
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 10l7-7m0 0l7 7m-7-7v18"
            />
          </svg>
          +{change.toFixed(1)}%
        </span>
      );
    } else if (change < 0) {
      return (
        <span className="text-red-400 flex items-center text-sm">
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
          {change.toFixed(1)}%
        </span>
      );
    }

    return <span className="text-gray-400 text-sm">No change</span>;
  };

  return (
    <div
      className={`
      p-6 rounded-lg border
      ${getColorClasses()}
      transition-all duration-200 hover:scale-[1.02]
    `}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm text-gray-400 mb-1">{title}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
        </div>
        {icon && <div className="text-3xl opacity-50">{icon}</div>}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-300">{subtitle}</p>
        {getChangeIcon()}
      </div>
    </div>
  );
}
