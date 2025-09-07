import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import ItemPriceRangeChart from './ItemPriceRangeChart';

function formatGPnum(n) {
  return `${Math.round(n).toLocaleString()} gp`;
}

export default function GuestItemPriceMargin({ flips = [] }) {
  // Prepare time series for dual-axis chart
  const series = useMemo(() => {
    return flips
      .filter(f => Number.isFinite(f.avgBuyPrice) && Number.isFinite(f.avgSellPrice) && f.tsMs)
      .map(f => ({
        tsMs: f.tsMs,
        ts: f.ts,
        avgBuyPrice: f.avgBuyPrice,
        avgSellPrice: f.avgSellPrice,
        marginPct: Number.isFinite(f.marginPct) ? f.marginPct : (f.avgBuyPrice > 0 ? ((f.avgSellPrice - f.avgBuyPrice) / f.avgBuyPrice) * 100 : null),
      }))
      .sort((a,b) => a.tsMs - b.tsMs);
  }, [flips]);

  const marginHist = useMemo(() => {
    const values = series.map(s => s.marginPct).filter(v => Number.isFinite(v));
    if (values.length === 0) return [];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const bins = 16;
    const step = (max - min) / bins || 1;
    const arr = Array.from({ length: bins }, (_, i) => ({
      binStart: min + i * step,
      binEnd: min + (i + 1) * step,
      count: 0,
    }));
    values.forEach(v => {
      let idx = Math.floor((v - min) / step);
      if (idx >= bins) idx = bins - 1;
      if (idx < 0) idx = 0;
      arr[idx].count += 1;
    });
    return arr.map(b => ({ label: `${b.binStart.toFixed(1)}%`, count: b.count }));
  }, [series]);

  const buyPrices = useMemo(() => flips.map(f => Number(f.avgBuyPrice)).filter(Number.isFinite), [flips]);
  const sellPrices = useMemo(() => flips.map(f => Number(f.avgSellPrice)).filter(Number.isFinite), [flips]);

  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <h3 className="text-xl font-bold text-white mb-3">Price & Margin Analysis</h3>

      {/* Dual-axis prices + margin % */}
      <div className="h-72 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={series} margin={{ top: 8, right: 24, left: 12, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="tsMs"
              type="number"
              domain={[ 'auto', 'auto' ]}
              tickFormatter={(v) => new Date(v).toLocaleDateString()}
              stroke="#9CA3AF"
              fontSize={12}
            />
            <YAxis yAxisId="left" stroke="#9CA3AF" fontSize={12} tickFormatter={(v)=>formatGPnum(v)} />
            <YAxis yAxisId="right" orientation="right" stroke="#9CA3AF" fontSize={12} tickFormatter={(v)=>`${v.toFixed(0)}%`} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: 8, color: 'white' }}
              formatter={(val, name) => {
                if (name === 'marginPct') return [`${Number(val).toFixed(2)}%`, 'Margin %'];
                if (name === 'avgBuyPrice') return [formatGPnum(val), 'Avg Buy'];
                if (name === 'avgSellPrice') return [formatGPnum(val), 'Avg Sell'];
                return [val, name];
              }}
              labelFormatter={(v) => new Date(v).toLocaleString()}
            />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="avgBuyPrice" name="Avg Buy" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line yAxisId="left" type="monotone" dataKey="avgSellPrice" name="Avg Sell" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line yAxisId="right" type="monotone" dataKey="marginPct" name="Margin %" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Distribution + Box plot */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-64">
          <div className="text-sm text-gray-200 mb-2">Margin % Distribution</div>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={marginHist} margin={{ top: 8, right: 12, left: 12, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="label" stroke="#9CA3AF" fontSize={12} interval={0} angle={-45} textAnchor="end" height={60} />
              <YAxis stroke="#9CA3AF" fontSize={12} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: 8, color: 'white' }} />
              <Bar dataKey="count" name="Flips" fill="#8b5cf6" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <ItemPriceRangeChart buyPrices={buyPrices} sellPrices={sellPrices} />
      </div>
    </div>
  );
}

GuestItemPriceMargin.propTypes = {
  flips: PropTypes.array,
};

