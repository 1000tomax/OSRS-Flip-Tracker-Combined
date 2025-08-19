import React from 'react';

export default function InsightCard({ type = 'blue', title, description, priority, icon }) {
  const getColorClasses = () => {
    switch (type) {
      case 'green':
        return 'bg-green-900/20 border-green-700 text-green-400';
      case 'yellow':
        return 'bg-yellow-900/20 border-yellow-700 text-yellow-400';
      case 'red':
        return 'bg-red-900/20 border-red-700 text-red-400';
      case 'blue':
      default:
        return 'bg-blue-900/20 border-blue-700 text-blue-400';
    }
  };

  const getPriorityBadge = () => {
    if (!priority) return null;

    const priorityColors = {
      high: 'bg-red-500/20 text-red-400 border-red-600',
      medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-600',
      low: 'bg-green-500/20 text-green-400 border-green-600',
    };

    return (
      <span
        className={`
        px-2 py-1 text-xs rounded border
        ${priorityColors[priority] || priorityColors.low}
      `}
      >
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </span>
    );
  };

  return (
    <div
      className={`
      p-4 rounded-lg border
      ${getColorClasses()}
      transition-all duration-200 hover:scale-[1.02]
    `}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2">
          {icon && <span className="text-xl">{icon}</span>}
          <h3 className="font-semibold">{title}</h3>
        </div>
        {getPriorityBadge()}
      </div>
      <p className="text-sm text-gray-300">{description}</p>
    </div>
  );
}
