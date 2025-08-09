import React, { useMemo, useState } from "react";
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, CartesianGrid } from "recharts";

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

export default function UniverseMap({ items = [] }) {
  const [filters, setFilters] = useState({ minProfit: 0, onlyStable: false, search: "" });

  const data = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return items
      .filter((it) => (filters.onlyStable ? (it.stable ?? 0) >= 0.6 : true))
      .filter((it) => (q ? (it.name || "").toLowerCase().includes(q) : true))
      .filter((it) => (it.profit ?? 0) >= filters.minProfit)
      .map((it) => ({
        x: it.x,
        y: it.y,
        z: Math.max(4, Math.sqrt(Math.max(0, it.profit)) / 150), // size by profit
        name: it.name,
        profit: it.profit,
        stable: it.stable,
        holdMin: it.holdMin,
        margin: it.margin,
      }));
  }, [items, filters]);

  return (
    <div className="rounded-2xl border bg-white/5 border-white/10 p-3" style={{ height: 420 }}>
      <div className="flex gap-2 mb-2 text-xs">
        <input placeholder="Search item" className="bg-transparent border rounded-xl px-2 py-1" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
        <label className="flex items-center gap-1 cursor-pointer select-none">
          <input type="checkbox" checked={filters.onlyStable} onChange={(e) => setFilters({ ...filters, onlyStable: e.target.checked })} />
          Only stable
        </label>
        <label className="flex items-center gap-1">Min profit
          <input type="number" className="bg-transparent border rounded-xl px-2 py-1 ml-1 w-28" value={filters.minProfit} onChange={(e) => setFilters({ ...filters, minProfit: Number(e.target.value || 0) })} />
        </label>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
          <XAxis type="number" dataKey="x" name="Hold-time axis" tick={false} axisLine={false} />
          <YAxis type="number" dataKey="y" name="Margin/volatility" tick={false} axisLine={false} />
          <ZAxis type="number" dataKey="z" range={[4, 24]} />
          <Tooltip cursor={{ strokeDasharray: "3 3" }} content={({ active, payload }) => (active && payload && payload[0] ? <Tip p={payload[0].payload} /> : null)} />
          <Scatter data={data} fill="currentColor" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

function Tip({ p }) {
  return (
    <div className="rounded-xl border bg-black/80 text-white border-white/10 px-3 py-2 text-xs">
      <div className="font-semibold mb-1">{p.name}</div>
      <div>Profit: {Number(p.profit || 0).toLocaleString()} gp</div>
      <div>Stability: {Math.round((p.stable ?? 0) * 100)}%</div>
      <div>Typical hold: {p.holdMin ?? 0} min</div>
      <div>Median margin: {p.margin ?? 0} gp</div>
    </div>
  );
}