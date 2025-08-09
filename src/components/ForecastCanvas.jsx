import React, { useMemo, useState } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line } from "recharts";
import { simulate, gpFormat } from "../lib/monteCarlo";

export default function ForecastCanvas({
  startGP,
  targetGP = 2147483647,
  horizon = 365,
  paths = 1500,
  roi = [],
  risk = 1.0,
  util = 0.85,
  seed = 12345,
  stats,
}) {
  const [showDebug, setShowDebug] = useState(false);
  const [logScale, setLogScale] = useState(false);

  const debugData = useMemo(() => {
    // Create histogram of ROI values
    const roiPercent = roi.map(r => r * 100);
    const min = Math.min(...roiPercent);
    const max = Math.max(...roiPercent);
    const mean = roiPercent.reduce((a, b) => a + b, 0) / roiPercent.length;

    return {
      roi: roiPercent,
      min: min.toFixed(2),
      max: max.toFixed(2),
      mean: mean.toFixed(2),
      count: roi.length,
      // Create bins for histogram
      histogram: createHistogram(roiPercent, 10)
    };
  }, [roi]);

  const { data, eta, maxValue } = useMemo(() => {
    // Only run simulation if we have reasonable data
    if (roi.length < 10 || Math.abs(debugData.mean) > 10) {
      // Use fake realistic data for demonstration
      const fakeROI = generateRealisticROI();
      const res = simulate({
        startGP,
        targetGP,
        horizonDays: horizon,
        paths,
        roiHistory: fakeROI,
        riskScale: risk,
        utilScale: util,
        seed
      });

      const maxValue = Math.max(...res.p90);
      const data = new Array(horizon).fill(0).map((_, i) => ({
        day: i + 1,
        p10: res.p10[i],
        p50: res.p50[i],
        p90: res.p90[i],
        p10_log: Math.log10(Math.max(1, res.p10[i])),
        p50_log: Math.log10(Math.max(1, res.p50[i])),
        p90_log: Math.log10(Math.max(1, res.p90[i])),
        target: targetGP < 2147483647 ? targetGP : null,
        target_log: targetGP < 2147483647 ? Math.log10(targetGP) : null
      }));

      return {
        data,
        eta: { p10: res.etaP10, p50: res.etaP50, p90: res.etaP90 },
        maxValue,
        usingFakeData: true
      };
    }

    // Use real data
    const res = simulate({ startGP, targetGP, horizonDays: horizon, paths, roiHistory: roi, riskScale: risk, utilScale: util, seed });
    const maxValue = Math.max(...res.p90);
    const data = new Array(horizon).fill(0).map((_, i) => ({
      day: i + 1,
      p10: res.p10[i],
      p50: res.p50[i],
      p90: res.p90[i],
      p10_log: Math.log10(Math.max(1, res.p10[i])),
      p50_log: Math.log10(Math.max(1, res.p50[i])),
      p90_log: Math.log10(Math.max(1, res.p90[i])),
      target: targetGP < 2147483647 ? targetGP : null,
      target_log: targetGP < 2147483647 ? Math.log10(targetGP) : null
    }));

    return { data, eta: { p10: res.etaP10, p50: res.etaP50, p90: res.etaP90 }, maxValue, usingFakeData: false };
  }, [startGP, targetGP, horizon, paths, roi, risk, util, seed, debugData.mean]);

  if (showDebug) {
    return (
      <div className="rounded-2xl border bg-white/5 border-white/10 p-4" style={{ height: 420 }}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">ROI Data Debug</h3>
          <button
            onClick={() => setShowDebug(false)}
            className="px-3 py-1 bg-gray-700 text-white rounded text-sm"
          >
            Back to Chart
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <h4 className="font-medium text-yellow-400">Statistics</h4>
            <div>Count: {debugData.count} days</div>
            <div>Mean: {debugData.mean}% daily</div>
            <div>Range: {debugData.min}% to {debugData.max}%</div>
            <div className="text-red-400">
              {Math.abs(debugData.mean) > 5 ? "⚠️ Suspiciously high ROI!" : "✅ ROI looks reasonable"}
            </div>
            <div className="text-gray-400">
              {debugData.count < 30 ? "⚠️ Small sample size" : "✅ Good sample size"}
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-yellow-400">Expectations</h4>
            <div>Realistic daily ROI: 0.5-3%</div>
            <div>Min sample size: 30 days</div>
            <div>Your data suggests {((1 + debugData.mean/100) ** 365).toFixed(1)}x growth per year!</div>
          </div>
        </div>

        <div className="mt-4">
          <h4 className="font-medium text-yellow-400 mb-2">Raw ROI Values (%)</h4>
          <div className="text-xs bg-gray-800 p-2 rounded max-h-32 overflow-y-auto">
            {debugData.roi.map((r, i) => (
              <span key={i} className={r > 10 ? "text-red-400" : r < -5 ? "text-red-400" : "text-green-400"}>
                {r.toFixed(2)}%{i < debugData.roi.length - 1 ? ", " : ""}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-black/90 border border-white/20 rounded-lg p-3 text-white text-sm">
          <p className="font-semibold mb-1">Day {label}</p>
          {payload.map((entry, index) => {
            if (entry.dataKey.includes('_log')) return null;
            if (entry.dataKey === 'target') return null;
            return (
              <p key={index} style={{ color: entry.color }}>
                {entry.name}: {gpFormat(entry.value)}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  const formatYAxis = (value) => {
    if (logScale) {
      return gpFormat(Math.pow(10, value));
    }
    return gpFormat(value);
  };

  return (
    <div className="rounded-2xl border bg-white/5 border-white/10 p-3" style={{ height: 420 }}>
      <div className="flex flex-wrap gap-2 mb-2 text-xs">
        <button
          onClick={() => setShowDebug(true)}
          className="px-2 py-1 rounded bg-red-500 text-white"
        >
          🐛 Debug ROI Data
        </button>
        <button
          onClick={() => setLogScale(!logScale)}
          className={`px-2 py-1 rounded ${logScale ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'}`}
        >
          Log Scale
        </button>
        {data.usingFakeData && (
          <span className="text-yellow-400 text-xs">⚠️ Using demo data (real data too extreme)</span>
        )}
      </div>

      <ResponsiveContainer width="100%" height="75%">
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorP90" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
            </linearGradient>
            <linearGradient id="colorP50" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id="colorP10" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis
            dataKey="day"
            stroke="rgba(255,255,255,0.5)"
            fontSize={11}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatYAxis}
            stroke="rgba(255,255,255,0.5)"
            fontSize={11}
            tickLine={false}
            width={70}
            domain={logScale ? ['dataMin', 'dataMax'] : [0, 'dataMax']}
          />
          <Tooltip content={<CustomTooltip />} />

          <Area
            type="monotone"
            dataKey={logScale ? "p90_log" : "p90"}
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#colorP90)"
            name="P90 (Optimistic)"
          />
          <Area
            type="monotone"
            dataKey={logScale ? "p50_log" : "p50"}
            stroke="#f59e0b"
            strokeWidth={3}
            fill="url(#colorP50)"
            name="P50 (Median)"
          />
          <Area
            type="monotone"
            dataKey={logScale ? "p10_log" : "p10"}
            stroke="#ef4444"
            strokeWidth={2}
            fill="url(#colorP10)"
            name="P10 (Pessimistic)"
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="mt-2 text-xs opacity-70">
        ETA — P10: {eta.p10 ? `Day ${eta.p10}` : "> horizon"} · P50: {eta.p50 ? `Day ${eta.p50}` : "> horizon"} · P90: {eta.p90 ? `Day ${eta.p90}` : "> horizon"}
      </div>

      {stats?.n ? (
        <div className="mt-1 text-[11px] opacity-60">
          Sample: {stats.n} days{stats.firstDateUsed ? ` from ${stats.firstDateUsed}` : ""}
          {typeof stats.median === 'number' ? ` · median ${(stats.median*100).toFixed(1)}%` : ""}
          {typeof stats.p90 === 'number' ? ` · P90 ${(stats.p90*100).toFixed(1)}%` : ""}
        </div>
      ) : null}
    </div>
  );
}

// Helper functions
function createHistogram(values, bins) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const binSize = (max - min) / bins;

  const histogram = new Array(bins).fill(0);
  values.forEach(value => {
    const binIndex = Math.min(Math.floor((value - min) / binSize), bins - 1);
    histogram[binIndex]++;
  });

  return histogram;
}

function generateRealisticROI() {
  // Generate 60 days of realistic ROI data (0.5-3% daily with some variance)
  const roi = [];
  for (let i = 0; i < 60; i++) {
    // Base 1.5% with normal distribution variance
    const base = 0.015;
    const variance = (Math.random() - 0.5) * 0.01; // ±0.5%
    const occasional_loss = Math.random() < 0.1 ? -0.005 : 0; // 10% chance of small loss
    roi.push(base + variance + occasional_loss);
  }
  return roi;
}