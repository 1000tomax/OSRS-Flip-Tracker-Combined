import React, { useMemo, useState } from "react";
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, CartesianGrid } from "recharts";

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

export default function UniverseMap({ items = [] }) {
  const [filters, setFilters] = useState({
    minProfit: 0,
    onlyStable: false,
    search: "",
    view: "galaxy" // galaxy, profit, stability
  });
  const [selectedItem, setSelectedItem] = useState(null);

  const { data, stats } = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    const filtered = items
      .filter((it) => (filters.onlyStable ? (it.stable ?? 0) >= 0.6 : true))
      .filter((it) => (q ? (it.name || "").toLowerCase().includes(q) : true))
      .filter((it) => (it.profit ?? 0) >= filters.minProfit);

    const totalProfit = filtered.reduce((sum, it) => sum + (it.profit || 0), 0);
    const avgStability = filtered.reduce((sum, it) => sum + (it.stable || 0), 0) / filtered.length;

    const processedData = filtered.map((it) => {
      const profit = it.profit || 0;
      const stability = it.stable || 0;
      const holdTime = it.holdMin || 0;

      // Enhanced size calculation - more dramatic scaling
      const baseSize = Math.max(6, Math.sqrt(profit) / 100);
      const size = clamp(baseSize, 6, 35);

      // Color based on view mode
      let color = "#60a5fa"; // default blue
      if (filters.view === "profit") {
        const profitIntensity = Math.min(profit / 200000, 1); // Cap at 200K for color scale
        color = `rgba(${Math.floor(255 * profitIntensity)}, ${Math.floor(200 * (1 - profitIntensity))}, 50, 0.8)`;
      } else if (filters.view === "stability") {
        const red = Math.floor(255 * (1 - stability));
        const green = Math.floor(255 * stability);
        color = `rgba(${red}, ${green}, 100, 0.8)`;
      } else {
        // Galaxy mode - color by profit quartiles
        if (profit > 100000) color = "#fbbf24"; // gold for high profit
        else if (profit > 50000) color = "#34d399"; // green for good profit
        else if (profit > 20000) color = "#60a5fa"; // blue for medium
        else color = "#9ca3af"; // gray for low
      }

      // Opacity based on stability (more stable = more opaque)
      const opacity = Math.max(0.4, stability);

      return {
        x: it.x,
        y: it.y,
        z: size,
        name: it.name,
        profit,
        stable: stability,
        holdMin: holdTime,
        margin: it.margin,
        color,
        opacity,
        // Add categories for filtering
        category: getCategoryFromName(it.name),
        profitTier: getProfitTier(profit)
      };
    });

    return {
      data: processedData,
      stats: {
        count: filtered.length,
        totalProfit,
        avgStability: avgStability || 0,
        topItem: filtered.reduce((max, it) => (it.profit > (max?.profit || 0) ? it : max), null)
      }
    };
  }, [items, filters]);

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload[0]) return null;

    const item = payload[0].payload;
    return (
      <div className="bg-gray-900/95 border border-gray-600 rounded-xl p-4 text-white shadow-2xl backdrop-blur-sm max-w-xs">
        <div className="font-bold text-lg mb-2 text-yellow-400">{item.name}</div>

        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-300">Total Profit:</span>
            <span className="font-mono text-green-400">{formatGP(item.profit)}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-300">Stability:</span>
            <span className={`font-mono ${item.stable > 0.7 ? 'text-green-400' : item.stable > 0.4 ? 'text-yellow-400' : 'text-red-400'}`}>
              {Math.round(item.stable * 100)}%
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-300">Avg Hold:</span>
            <span className="font-mono text-blue-400">{formatTime(item.holdMin)}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-300">Margin/flip:</span>
            <span className="font-mono text-purple-400">{formatGP(item.margin)}</span>
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-gray-700">
          <div className="text-xs text-gray-400">
            Category: <span className="text-white">{item.category}</span>
          </div>
          <div className="text-xs text-gray-400">
            Risk Level: <span className={`${getRiskColor(item.stable)} font-medium`}>{getRiskLevel(item.stable)}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-2xl border bg-gradient-to-br from-gray-900/50 to-black/50 border-white/10 p-4" style={{ height: 420 }}>
      {/* Enhanced Header */}
      <div className="flex justify-between items-center mb-3">
        <div>
          <h3 className="text-lg font-bold text-white mb-1">🌌 Flip Universe</h3>
          <div className="text-xs text-gray-400">
            {stats.count} items • {formatGP(stats.totalProfit)} total profit
          </div>
        </div>

        {/* View Mode Selector */}
        <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
          {[
            { key: "galaxy", label: "🌌", tip: "Galaxy View" },
            { key: "profit", label: "💰", tip: "Profit Heat" },
            { key: "stability", label: "📊", tip: "Stability Map" }
          ].map(mode => (
            <button
              key={mode.key}
              onClick={() => setFilters({ ...filters, view: mode.key })}
              className={`px-2 py-1 text-xs rounded transition ${
                filters.view === mode.key
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
              title={mode.tip}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Enhanced Controls */}
      <div className="flex flex-wrap gap-2 mb-3 text-xs">
        <input
          placeholder="🔍 Search items..."
          className="bg-gray-800/50 border border-gray-600 rounded-lg px-3 py-1.5 text-white placeholder-gray-400 flex-1 min-w-32"
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />

        <label className="flex items-center gap-2 cursor-pointer bg-gray-800/50 px-3 py-1.5 rounded-lg border border-gray-600 hover:bg-gray-700/50 transition">
          <input
            type="checkbox"
            checked={filters.onlyStable}
            onChange={(e) => setFilters({ ...filters, onlyStable: e.target.checked })}
            className="rounded"
          />
          <span className="text-white">Stable only</span>
        </label>

        <div className="flex items-center gap-2 bg-gray-800/50 px-3 py-1.5 rounded-lg border border-gray-600">
          <span className="text-gray-300">Min profit:</span>
          <input
            type="number"
            className="bg-transparent text-white w-20 outline-none"
            value={filters.minProfit}
            onChange={(e) => setFilters({ ...filters, minProfit: Number(e.target.value || 0) })}
          />
        </div>
      </div>

      {/* Legend */}
      {filters.view === "galaxy" && (
        <div className="flex gap-4 mb-3 text-xs text-gray-400">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
            <span>High Profit (100K+)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-400"></div>
            <span>Good Profit (50K+)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-blue-400"></div>
            <span>Medium (20K+)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-gray-400"></div>
            <span>Low (&lt;20K)</span>
          </div>
        </div>
      )}

      {/* Enhanced Chart */}
      <ResponsiveContainer width="100%" height="85%">
        <ScatterChart margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
          <defs>
            <radialGradient id="galaxyGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.8"/>
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.1"/>
            </radialGradient>
          </defs>

          <CartesianGrid strokeDasharray="2 2" stroke="rgba(255,255,255,0.1)" />
          <XAxis type="number" dataKey="x" domain={['dataMin', 'dataMax']} tick={false} axisLine={false} />
          <YAxis type="number" dataKey="y" domain={['dataMin', 'dataMax']} tick={false} axisLine={false} />
          <ZAxis type="number" dataKey="z" range={[6, 35]} />

          <Tooltip
            content={<CustomTooltip />}
            cursor={{ strokeDasharray: "3 3", stroke: "rgba(255,255,255,0.3)" }}
          />

          <Scatter
            data={data}
            fill="url(#galaxyGlow)"
            shape={(props) => {
              const { cx, cy, payload } = props;
              return (
                <circle
                  cx={cx}
                  cy={cy}
                  r={payload.z / 2}
                  fill={payload.color}
                  opacity={payload.opacity}
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="1"
                  className="cursor-pointer hover:stroke-white hover:stroke-2 transition-all"
                  onClick={() => setSelectedItem(payload)}
                />
              );
            }}
          />
        </ScatterChart>
      </ResponsiveContainer>

      {/* Selected Item Details */}
      {selectedItem && (
        <div className="absolute top-4 right-4 bg-gray-900/95 border border-gray-600 rounded-lg p-3 text-xs text-white backdrop-blur-sm">
          <div className="font-bold text-yellow-400 mb-1">{selectedItem.name}</div>
          <div>{formatGP(selectedItem.profit)} profit • {Math.round(selectedItem.stable * 100)}% stable</div>
          <button
            onClick={() => setSelectedItem(null)}
            className="mt-2 text-gray-400 hover:text-white"
          >
            ✕ Close
          </button>
        </div>
      )}
    </div>
  );
}

// Helper functions
function formatGP(value) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toLocaleString();
}

function formatTime(minutes) {
  if (minutes >= 60) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  return `${Math.round(minutes)}m`;
}

function getCategoryFromName(name) {
  const lower = name.toLowerCase();
  if (lower.includes('rune')) return 'Runes';
  if (lower.includes('arrow') || lower.includes('bolt') || lower.includes('dart')) return 'Ammunition';
  if (lower.includes('bone')) return 'Bones';
  if (lower.includes('bar') || lower.includes('ore')) return 'Materials';
  if (lower.includes('seed')) return 'Seeds';
  if (lower.includes('potion')) return 'Potions';
  if (lower.includes('armour') || lower.includes('helm') || lower.includes('chest') || lower.includes('leg')) return 'Armor';
  return 'Other';
}

function getProfitTier(profit) {
  if (profit >= 100000) return 'Elite';
  if (profit >= 50000) return 'High';
  if (profit >= 20000) return 'Medium';
  return 'Low';
}

function getRiskLevel(stability) {
  if (stability >= 0.7) return 'Low Risk';
  if (stability >= 0.4) return 'Medium Risk';
  return 'High Risk';
}

function getRiskColor(stability) {
  if (stability >= 0.7) return 'text-green-400';
  if (stability >= 0.4) return 'text-yellow-400';
  return 'text-red-400';
}