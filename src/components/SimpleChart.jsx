// Simple chart replacement to eliminate Recharts dependency issues
import React from 'react';

export function SimpleBarChart({
  data = [],
  title = 'Chart',
  dataKey = 'value',
  color = '#10b981',
}) {
  if (!data.length) return <div className="text-gray-400 text-center py-8">No data available</div>;

  const maxValue = Math.max(...data.map(d => d[dataKey] || 0));

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h3 className="text-white font-medium mb-4">{title}</h3>
      <div className="space-y-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-3">
            <div
              className="w-20 text-sm text-gray-300 truncate"
              title={item.name || item.day || `Item ${index}`}
            >
              {item.name || item.day || `Item ${index}`}
            </div>
            <div className="flex-1 bg-gray-700 rounded-full h-6 relative">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.max(2, (item[dataKey] / maxValue) * 100)}%`,
                  backgroundColor: color,
                }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-xs text-white font-medium">
                {typeof item[dataKey] === 'number' ? item[dataKey].toLocaleString() : item[dataKey]}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SimpleLineChart({
  data = [],
  title = 'Chart',
  dataKey = 'value',
  color = '#10b981',
}) {
  return <SimpleBarChart data={data} title={title} dataKey={dataKey} color={color} />;
}

// Recharts compatibility exports
export const BarChart = SimpleBarChart;
export const LineChart = SimpleLineChart;
export const Bar = () => null;
export const Line = () => null;
export const XAxis = () => null;
export const YAxis = () => null;
export const CartesianGrid = () => null;
export const Tooltip = () => null;
export const ResponsiveContainer = ({ children }) => children;
export const ReferenceLine = () => null;
