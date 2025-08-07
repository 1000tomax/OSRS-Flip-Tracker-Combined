// src/components/RoiProfitScatterChart.jsx
import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useCsvData } from '../hooks/useCsvData';
import LoadingSpinner, { ErrorMessage } from './LoadingSpinner';

function formatGP(value) {
  if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(2) + "B";
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(2) + "M";
  if (value >= 1_000) return (value / 1_000).toFixed(0) + "K";
  return value.toString();
}

export default function RoiProfitScatterChart() {
  const { data: items, loading, error } = useCsvData('/data/item-stats.csv');

  if (loading) {
    return (
      <div className="bg-gray-800 border border-gray-600 rounded-xl p-4 sm:p-6">
        <LoadingSpinner size="medium" text="Loading ROI analysis..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 border border-gray-600 rounded-xl p-4 sm:p-6">
        <ErrorMessage 
          title="Failed to load ROI analysis"
          error={error}
        />
      </div>
    );
  }

  // Filter and prepare data for scatter plot
  const scatterData = items
    .filter(item => {
      const profit = Number(item.total_profit);
      const roi = Number(item.roi_percent);
      const flips = Number(item.flips);
      return flips >= 5 && profit > 0 && roi > 0 && roi < 500; // Filter outliers
    })
    .map(item => ({
      name: item.item_name,
      x: Number(item.total_profit), // X-axis: Total Profit
      y: Number(item.roi_percent),  // Y-axis: ROI %
      flips: Number(item.flips),
      size: Math.min(Math.max(Number(item.flips) * 2, 20), 100) // Size based on flip count
    }));

  // Calculate medians for reference lines
  const medianProfit = scatterData.length > 0 
    ? scatterData.sort((a, b) => a.x - b.x)[Math.floor(scatterData.length / 2)]?.x || 0
    : 0;
  
  const medianROI = scatterData.length > 0
    ? scatterData.sort((a, b) => a.y - b.y)[Math.floor(scatterData.length / 2)]?.y || 0
    : 0;

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-900 border border-gray-600 rounded-lg p-3 shadow-lg max-w-xs">
          <p className="text-white font-medium truncate">{data.name}</p>
          <p className="text-yellow-400">
            Profit: <span className="font-mono">{formatGP(data.x)} GP</span>
          </p>
          <p className="text-green-400">
            ROI: <span className="font-mono">{data.y.toFixed(1)}%</span>
          </p>
          <p className="text-gray-300">
            Flips: <span className="font-mono">{data.flips}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-xl p-4 sm:p-6">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-white mb-1">💎 ROI vs Profit Analysis</h2>
        <p className="text-sm text-gray-400">Find your strategic sweet spots (bubble size = flip count)</p>
      </div>
      
      {/* Legend */}
      <div className="mb-4 grid grid-cols-2 gap-3 text-xs">
        <div className="bg-gray-700 rounded-lg p-2">
          <div className="text-green-400 font-medium">🎯 Top Right Quadrant</div>
          <div className="text-gray-300">High profit + High ROI = Sweet spot!</div>
        </div>
        <div className="bg-gray-700 rounded-lg p-2">
          <div className="text-yellow-400 font-medium">📊 Reference Lines</div>
          <div className="text-gray-300">Median profit & ROI for comparison</div>
        </div>
      </div>
      
      <div className="h-80 sm:h-96">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              type="number" 
              dataKey="x"
              stroke="#9CA3AF"
              fontSize={12}
              tickLine={false}
              tickFormatter={formatGP}
              name="Total Profit"
            />
            <YAxis 
              type="number" 
              dataKey="y"
              stroke="#9CA3AF"
              fontSize={12}
              tickLine={false}
              tickFormatter={(value) => `${value}%`}
              name="ROI %"
            />
            
            {/* Reference lines for median values */}
            <ReferenceLine 
              x={medianProfit} 
              stroke="#6B7280" 
              strokeDasharray="5 5" 
              strokeOpacity={0.7}
            />
            <ReferenceLine 
              y={medianROI} 
              stroke="#6B7280" 
              strokeDasharray="5 5" 
              strokeOpacity={0.7}
            />
            
            <Tooltip content={<CustomTooltip />} />
            <Scatter 
              data={scatterData} 
              fill="#F59E0B"
              fillOpacity={0.8}
              stroke="#FCD34D"
              strokeWidth={1}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}