import React, { useMemo, useState } from "react";
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, CartesianGrid } from "recharts";

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

export default function UniverseMap({ items = [] }) {
  const [filters, setFilters] = useState({
    minProfit: 0,
    maxProfit: 1000000, // 1M default max
    onlyStable: false,
    search: "",
    view: "galaxy", // galaxy, profit, stability
    category: "all"
  });
  const [selectedItem, setSelectedItem] = useState(null);

  const { data, stats, categories } = useMemo(() => {
    const q = filters.search.trim().toLowerCase();

    // First pass - apply basic filters
    let filtered = items
      .filter((it) => (filters.onlyStable ? (it.stable ?? 0) >= 0.6 : true))
      .filter((it) => (q ? (it.name || "").toLowerCase().includes(q) : true))
      .filter((it) => {
        const profit = it.profit || 0;
        return profit >= filters.minProfit && profit <= filters.maxProfit;
      })
      .filter((it) => {
        if (filters.category === "all") return true;
        return getCategoryFromName(it.name) === filters.category;
      });

    // Get available categories for filter dropdown
    const allCategories = [...new Set(items.map(it => getCategoryFromName(it.name)))].sort();

    const totalProfit = filtered.reduce((sum, it) => sum + (it.profit || 0), 0);
    const avgStability = filtered.reduce((sum, it) => sum + (it.stable || 0), 0) / (filtered.length || 1);

    const processedData = filtered.map((it) => {
      const profit = it.profit || 0;
      const stability = it.stable || 0;
      const holdTime = it.holdMin || 0;

      // Enhanced size calculation - more dramatic scaling
      const baseSize = Math.max(8, Math.sqrt(profit) / 80);
      const size = clamp(baseSize, 8, 40);

      // Color based on view mode
      let color = "#60a5fa"; // default blue
      let strokeColor = "rgba(255,255,255,0.3)";

      if (filters.view === "profit") {
        const profitIntensity = Math.min(profit / 200000, 1);
        const red = Math.floor(255 * profitIntensity);
        const green = Math.floor(200 * (1 - profitIntensity));
        color = `rgb(${red}, ${green}, 50)`;
        strokeColor = `rgba(${red}, ${green}, 50, 0.6)`;
      } else if (filters.view === "stability") {
        const red = Math.floor(255 * (1 - stability));
        const green = Math.floor(255 * stability);
        color = `rgb(${red}, ${green}, 100)`;
        strokeColor = `rgba(${red}, ${green}, 100, 0.6)`;
      } else {
        // Galaxy mode - color by profit quartiles with better colors
        if (profit > 100000) {
          color = "#fbbf24"; // gold for high profit
          strokeColor = "rgba(251, 191, 36, 0.8)";
        } else if (profit > 50000) {
          color = "#34d399"; // green for good profit
          strokeColor = "rgba(52, 211, 153, 0.8)";
        } else if (profit > 20000) {
          color = "#60a5fa"; // blue for medium
          strokeColor = "rgba(96, 165, 250, 0.8)";
        } else {
          color = "#9ca3af"; // gray for low
          strokeColor = "rgba(156, 163, 175, 0.6)";
        }
      }

      // Opacity based on stability (more stable = more opaque)
      const opacity = Math.max(0.6, stability);

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
        strokeColor,
        opacity,
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
      },
      categories: allCategories
    };
  }, [items, filters]);

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload[0]) return null;

    const item = payload[0].payload;
    return (
      <div className="bg-gray-900/95 border border-gray-500 rounded-xl p-4 text-white shadow-2xl backdrop-blur-sm max-w-xs">
        <div className="font-bold text-lg mb-3 text-yellow-400 flex items-center gap-2">
          <span className="text-xl">{getCategoryIcon(item.category)}</span>
          {item.name}
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Total Profit:</span>
            <span className="font-mono text-green-400 font-bold">{formatGP(item.profit)}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-300">Stability:</span>
            <div className="flex items-center gap-2">
              <span className={`font-mono ${item.stable > 0.7 ? 'text-green-400' : item.stable > 0.4 ? 'text-yellow-400' : 'text-red-400'}`}>
                {Math.round(item.stable * 100)}%
              </span>
              <span className="text-xs">{getRiskEmoji(item.stable)}</span>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-300">Avg Hold:</span>
            <span className="font-mono text-blue-400">{formatTime(item.holdMin)}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-300">Margin/flip:</span>
            <span className="font-mono text-purple-400">{formatGP(item.margin)}</span>
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-gray-700">
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Category:</span>
            <span className="text-white font-medium">{item.category}</span>
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span className="text-gray-400">Risk Level:</span>
            <span className={`${getRiskColor(item.stable)} font-medium`}>{getRiskLevel(item.stable)}</span>
          </div>
        </div>
      </div>
    );
  };

  const CustomDot = (props) => {
    const { cx, cy, payload } = props;
    if (!payload) return null;

    return (
      <g>
        {/* Glow effect */}
        <circle
          cx={cx}
          cy={cy}
          r={payload.z / 2 + 3}
          fill={payload.color}
          opacity="0.15"
          className="animate-pulse"
        />
        {/* Main dot */}
        <circle
          cx={cx}
          cy={cy}
          r={payload.z / 2}
          fill={payload.color}
          opacity={payload.opacity}
          stroke={payload.strokeColor}
          strokeWidth="2"
          className="cursor-pointer hover:stroke-white hover:stroke-4 transition-all duration-200"
          onClick={() => setSelectedItem(payload)}
        />
        {/* Center highlight */}
        <circle
          cx={cx}
          cy={cy}
          r={Math.max(2, payload.z / 6)}
          fill="rgba(255,255,255,0.8)"
          opacity="0.6"
        />
      </g>
    );
  };

  return (
    <div className="rounded-2xl border bg-gradient-to-br from-gray-900/80 to-black/60 border-gray-600 p-5 relative overflow-hidden" style={{ height: 700 }}>
      {/* Animated background stars */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full opacity-30 animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      {/* Enhanced Header */}
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div>
          <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
            🌌 Flip Universe
            {stats.count > 0 && (
              <span className="text-sm font-normal text-gray-400">
                ({stats.count} items)
              </span>
            )}
          </h3>
          <div className="text-sm text-gray-400">
            {formatGP(stats.totalProfit)} total profit • {Math.round(stats.avgStability * 100)}% avg stability
          </div>
        </div>

        {/* View Mode Selector */}
        <div className="flex gap-1 bg-gray-800/80 backdrop-blur-sm rounded-lg p-1 border border-gray-600">
          {[
            { key: "galaxy", label: "🌌", tip: "Galaxy View" },
            { key: "profit", label: "💰", tip: "Profit Heat" },
            { key: "stability", label: "📊", tip: "Stability Map" }
          ].map(mode => (
            <button
              key={mode.key}
              onClick={() => setFilters({ ...filters, view: mode.key })}
              className={`px-3 py-2 text-sm rounded-md transition-all duration-200 ${
                filters.view === mode.key
                  ? 'bg-yellow-500 text-black shadow-lg'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
              title={mode.tip}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Explanation */}
      <div className="mb-4 bg-gray-800/50 backdrop-blur-sm border border-gray-600 rounded-lg p-3 text-sm text-gray-300">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-blue-400">🗺️</span>
          <span className="font-semibold">Reading the map:</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div>
            <strong>Position:</strong> Items are grouped by trading characteristics (PCA analysis of margin, hold time, and stability)
          </div>
          <div>
            <strong>Size:</strong> Larger dots = higher total profit earned
          </div>
          <div>
            <strong>Color:</strong> {filters.view === 'galaxy' ? 'Profit tiers (🟡 Elite 100K+, 🟢 High 50K+, 🔵 Medium 20K+, ⚪ Low)' : filters.view === 'profit' ? 'Profit intensity (red = highest profit)' : 'Stability (green = reliable, red = volatile)'}
          </div>
          <div>
            <strong>Clusters:</strong> Items near each other have similar trading patterns
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="mb-6 space-y-4 relative z-10">

        {/* First Row: Search + Category + Reliable */}
        <div className="flex flex-wrap gap-3">
          <input
            placeholder="🔍 Search items..."
            className="flex-1 min-w-48 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />

          <select
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <label className="flex items-center gap-2 cursor-pointer bg-gray-800 px-3 py-2 rounded-lg border border-gray-600">
            <input
              type="checkbox"
              checked={filters.onlyStable}
              onChange={(e) => setFilters({ ...filters, onlyStable: e.target.checked })}
              className="rounded"
            />
            <span className="text-white text-sm">Reliable only</span>
          </label>
        </div>

        {/* Second Row: Profit Range */}
        <div className="bg-gray-800 border border-gray-600 rounded-lg px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-300 font-medium">Profit Range Filter</span>
            <span className="text-yellow-400 font-mono text-sm">
              {formatGP(filters.minProfit)} - {filters.maxProfit >= 1000000 ? '∞' : formatGP(filters.maxProfit)}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Minimum Profit</label>
              <input
                type="range"
                min="0"
                max="500000"
                step="25000"
                value={filters.minProfit}
                onChange={(e) => setFilters({ ...filters, minProfit: Number(e.target.value) })}
                className="w-full"
              />
              <div className="text-xs text-gray-400 mt-1">{formatGP(filters.minProfit)}</div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Maximum Profit</label>
              <input
                type="range"
                min="50000"
                max="1000000"
                step="50000"
                value={Math.min(filters.maxProfit, 1000000)}
                onChange={(e) => setFilters({ ...filters, maxProfit: Number(e.target.value) })}
                className="w-full"
              />
              <div className="text-xs text-gray-400 mt-1">
                {filters.maxProfit >= 1000000 ? 'No limit' : formatGP(filters.maxProfit)}
              </div>
            </div>
          </div>

          {/* Quick presets */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setFilters({ ...filters, minProfit: 0, maxProfit: 1000000 })}
              className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded"
            >
              All Items
            </button>
            <button
              onClick={() => setFilters({ ...filters, minProfit: 100000, maxProfit: 1000000 })}
              className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded"
            >
              High Profit (100K+)
            </button>
            <button
              onClick={() => setFilters({ ...filters, minProfit: 0, maxProfit: 50000 })}
              className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded"
            >
              Small Items (&lt;50K)
            </button>
          </div>
        </div>
      </div>

      {/* Legend - Compact horizontal */}
      {filters.view === "galaxy" && (
        <div className="flex justify-center gap-6 mb-3 text-xs text-gray-400 relative z-10">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
            <span>Elite</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-400"></div>
            <span>High</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-400"></div>
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-gray-400"></div>
            <span>Low</span>
          </div>
        </div>
      )}

      {/* Enhanced Chart */}
      <ResponsiveContainer width="100%" height="60%">
        <ScatterChart margin={{ top: 30, right: 40, left: 40, bottom: 30 }}>
          <defs>
            <radialGradient id="chartGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(59, 130, 246, 0.1)" />
              <stop offset="100%" stopColor="rgba(59, 130, 246, 0.02)" />
            </radialGradient>
          </defs>

          {/* Background glow */}
          <rect width="100%" height="100%" fill="url(#chartGlow)" />

          <CartesianGrid strokeDasharray="2 2" stroke="rgba(255,255,255,0.08)" />
          <XAxis
            type="number"
            dataKey="x"
            domain={['dataMin', 'dataMax']}
            tick={false}
            axisLine={{ stroke: 'rgba(255,255,255,0.3)' }}
            tickLine={false}
          />
          <YAxis
            type="number"
            dataKey="y"
            domain={['dataMin', 'dataMax']}
            tick={false}
            axisLine={{ stroke: 'rgba(255,255,255,0.3)' }}
            tickLine={false}
          />
          <ZAxis type="number" dataKey="z" range={[8, 40]} />

          <Tooltip
            content={<CustomTooltip />}
            cursor={false}
          />

          <Scatter
            data={data}
            shape={<CustomDot />}
          />
        </ScatterChart>
      </ResponsiveContainer>

      {/* Selected Item Popup */}
      {selectedItem && (
        <div className="absolute top-4 right-4 bg-gray-900/95 border border-gray-500 rounded-xl p-4 text-sm text-white backdrop-blur-sm shadow-2xl max-w-64 z-20">
          <div className="flex justify-between items-start mb-2">
            <div className="font-bold text-yellow-400">{selectedItem.name}</div>
            <button
              onClick={() => setSelectedItem(null)}
              className="text-gray-400 hover:text-white transition-colors ml-2"
            >
              ✕
            </button>
          </div>
          <div className="space-y-1">
            <div>{formatGP(selectedItem.profit)} profit</div>
            <div>{Math.round(selectedItem.stable * 100)}% stable</div>
            <div className="text-xs text-gray-400">{selectedItem.category}</div>
          </div>
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
  if (lower.includes('armour') || lower.includes('armor') || lower.includes('helm') || lower.includes('chest') || lower.includes('leg')) return 'Armor';
  return 'Other';
}

function getCategoryIcon(category) {
  const icons = {
    'Runes': '✨',
    'Ammunition': '🏹',
    'Bones': '🦴',
    'Materials': '⚒️',
    'Seeds': '🌱',
    'Potions': '🧪',
    'Armor': '🛡️',
    'Other': '📦'
  };
  return icons[category] || '📦';
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

function getRiskEmoji(stability) {
  if (stability >= 0.7) return '🟢';
  if (stability >= 0.4) return '🟡';
  return '🔴';
}