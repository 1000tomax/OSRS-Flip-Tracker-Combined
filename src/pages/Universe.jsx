// src/pages/Universe.jsx — aligned heat overlay (uses chart margins)
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const CHART_MARGIN = { top: 30, right: 30, bottom: 30, left: 46 }; // <-- single source of truth

export default function Universe() {
  const [items, setItems] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [filters, setFilters] = useState({ search: "", category: "all", minProfit: 0, maxProfit: 1_000_000_000 });
  const [yMetric, setYMetric] = useState("margin");  // margin | ppm
  const [colorMode, setColorMode] = useState("tier"); // tier | category
  const [sizeMode, setSizeMode] = useState("total");  // total | margin
  const [logX, setLogX] = useState(true);
  const [logY, setLogY] = useState(true);

  // Heat controls
  const [showHeat, setShowHeat] = useState(true);
  const [heatMetric, setHeatMetric] = useState("totalProfit"); // totalProfit | count | avgMargin | avgPPM
  const [heatResolution, setHeatResolution] = useState("normal"); // coarse | normal | fine
  const [heatSaturation, setHeatSaturation] = useState(0.85);
  const [heatStyle, setHeatStyle] = useState("glow"); // grid | glow

  useEffect(() => {
    fetch("/data/item-embeddings.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((j) => setItems(Array.isArray(j) ? j : []))
      .catch(() => {});
  }, []);

  const { data, domain, stats, categories } = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    let filtered = items
      .filter((it) => (q ? (it.name || "").toLowerCase().includes(q) : true))
      .filter((it) => {
        const p = +it.profit || 0;
        return p >= filters.minProfit && p <= filters.maxProfit;
      })
      .filter((it) => (filters.category === "all" ? true : getCategoryFromName(it.name) === filters.category));

    const categories = [...new Set(items.map((it) => getCategoryFromName(it.name)))].sort();

    const processed = filtered.map((it) => {
      const profit = +it.profit || 0;              // total profit (item)
      const holdMin = +it.holdMin || 0;            // avg hold (min)
      const margin = Math.max(0, +it.margin || 0); // profit/flip
      const ppm = holdMin > 0 ? margin / holdMin : margin;

      const xRaw = holdMin;
      const yRaw = yMetric === "ppm" ? ppm : margin;

      const sizeVal = sizeMode === "margin" ? margin : profit;
      const size = 8 + Math.min(36, Math.sqrt(Math.max(1, sizeVal)) / 150);

      const tier = getProfitTier(profit);
      const category = getCategoryFromName(it.name);
      const { color, strokeColor } = colorMode === "category" ? getCategoryColors(category) : getTierColors(tier);

      return { name: it.name, profit, holdMin, margin, ppm, tier, category, color, strokeColor, xRaw, yRaw, z: size };
    });

    const minX = Math.min(...processed.map((d) => d.xRaw), 1);
    const maxX = Math.max(...processed.map((d) => d.xRaw), 1);
    const minY = Math.min(...processed.map((d) => d.yRaw), 1);
    const maxY = Math.max(...processed.map((d) => d.yRaw), 1);

    return {
      data: processed,
      domain: { minX, maxX, minY, maxY },
      categories,
      stats: {
        count: processed.length,
        totalProfit: processed.reduce((s, d) => s + d.profit, 0),
        topItem: processed.reduce((m, d) => (d.profit > (m?.profit || 0) ? d : m), null),
      },
    };
  }, [items, filters, yMetric, colorMode, sizeMode]);

  const TooltipContent = ({ active, payload }) => {
    if (!active || !payload || !payload[0]) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-gray-900/95 border border-gray-700 rounded-xl p-3 text-white shadow-2xl backdrop-blur-sm">
        <div className="font-semibold text-yellow-400">{d.name}</div>
        <div className="text-xs mt-1 grid grid-cols-2 gap-x-4 gap-y-1">
          <div className="text-gray-400">Total profit</div><div className="text-green-400">{formatGP(d.profit)}</div>
          <div className="text-gray-400">Profit/flip</div><div>{formatGP(d.margin)}</div>
          <div className="text-gray-400">Hold time</div><div>{formatTime(d.holdMin)}</div>
          <div className="text-gray-400">Profit/min</div><div>{formatGP(Math.round(d.ppm))}</div>
          <div className="text-gray-400">Category</div><div>{getCategoryIcon(d.category)} {d.category}</div>
        </div>
      </div>
    );
  };

  // ---- heat overlay (aligned to margins) ----
  const wrapperRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!showHeat) return;
    const host = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas || !data.length) return;

    const ctx = canvas.getContext("2d");
    const resize = () => {
      const { clientWidth, clientHeight } = host;
      canvas.width = clientWidth;
      canvas.height = clientHeight;
      draw();
    };

    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    function draw() {
      const W = canvas.width;
      const H = canvas.height;

      // plot area (inner rect)
      const L = CHART_MARGIN.left;
      const T = CHART_MARGIN.top;
      const R = CHART_MARGIN.right;
      const B = CHART_MARGIN.bottom;
      const IW = Math.max(1, W - L - R);
      const IH = Math.max(1, H - T - B);

      ctx.clearRect(0, 0, W, H);
      ctx.save();
      // clip to plot area so nothing bleeds into margins
      ctx.beginPath();
      ctx.rect(L, T, IW, IH);
      ctx.clip();

      const { minX, maxX, minY, maxY } = domain;
      const lxMin = Math.log10(Math.max(1, minX));
      const lxMax = Math.log10(Math.max(1, maxX));
      const lyMin = Math.log10(Math.max(1, minY));
      const lyMax = Math.log10(Math.max(1, maxY));

      const xToPx = (x) =>
        L +
        (((logX ? Math.log10(Math.max(1, x)) : x) - (logX ? lxMin : minX)) /
          ((logX ? lxMax : maxX) - (logX ? lxMin : minX))) *
          IW;

      const yToPx = (y) =>
        T +
        (IH -
          (((logY ? Math.log10(Math.max(1, y)) : y) - (logY ? lyMin : minY)) /
            ((logY ? lyMax : maxY) - (logY ? lyMin : minY))) *
            IH);

      if (heatStyle === "grid") {
        const res = heatResolution === "coarse" ? 24 : heatResolution === "fine" ? 80 : 48;
        const cols = res;
        const rows = Math.round((res * IH) / IW);

        const grid = Array.from({ length: rows }, () =>
          Array.from({ length: cols }, () => ({ count: 0, sumProfit: 0, sumMargin: 0, sumPPM: 0 }))
        );

        for (const d of data) {
          const px = xToPx(d.xRaw);
          const py = yToPx(d.yRaw);
          const c = Math.floor(clamp(((px - L) / IW) * cols, 0, cols - 1));
          const r = Math.floor(clamp(((py - T) / IH) * rows, 0, rows - 1));
          const cell = grid[r][c];
          cell.count += 1;
          cell.sumProfit += d.profit;
          cell.sumMargin += d.margin;
          cell.sumPPM += d.ppm;
        }

        const val = (cell) => {
          if (heatMetric === "count") return cell.count;
          if (heatMetric === "avgMargin") return cell.count ? cell.sumMargin / cell.count : 0;
          if (heatMetric === "avgPPM") return cell.count ? cell.sumPPM / cell.count : 0;
          return cell.sumProfit;
        };
        let maxVal = 0;
        for (const row of grid) for (const cell of row) maxVal = Math.max(maxVal, val(cell));

        const cw = IW / cols;
        const ch = IH / rows;
        ctx.globalCompositeOperation = "lighter";
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const value = val(grid[r][c]);
            if (!value) continue;
            const t = value / (maxVal || 1);
            const alpha = Math.pow(t, 0.75) * heatSaturation;
            const rgb = lerpColor({ r: 59, g: 130, b: 246 }, { r: 234, g: 179, b: 8 }, { r: 34, g: 197, b: 94 }, t);
            ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
            ctx.fillRect(L + c * cw, T + r * ch, cw + 1, ch + 1);
          }
        }
        ctx.globalCompositeOperation = "source-over";
      } else {
        // glow
        const weight = (d) => {
          if (heatMetric === "count") return 1;
          if (heatMetric === "avgMargin") return d.margin;
          if (heatMetric === "avgPPM") return d.ppm;
          return d.profit;
        };
        let maxW = 0;
        for (const d of data) maxW = Math.max(maxW, weight(d));
        const radius = heatResolution === "coarse" ? 60 : heatResolution === "fine" ? 24 : 36;

        ctx.globalCompositeOperation = "lighter";
        ctx.filter = "blur(2px)";
        for (const d of data) {
          const px = xToPx(d.xRaw);
          const py = yToPx(d.yRaw);
          const t = maxW ? weight(d) / maxW : 0;
          const a = Math.pow(t, 0.7) * (0.6 * heatSaturation);
          const col = lerpColor({ r: 59, g: 130, b: 246 }, { r: 234, g: 179, b: 8 }, { r: 34, g: 197, b: 94 }, t);

          const g = ctx.createRadialGradient(px, py, 0, px, py, radius);
          g.addColorStop(0, `rgba(${col.r},${col.g},${col.b},${a})`);
          g.addColorStop(1, `rgba(${col.r},${col.g},${col.b},0)`);
          ctx.fillStyle = g;
          ctx.fillRect(px - radius, py - radius, radius * 2, radius * 2);
        }
        ctx.filter = "none";
        ctx.globalCompositeOperation = "source-over";
      }

      ctx.restore();
    }

    return () => ro.disconnect();
  }, [data, domain, logX, logY, showHeat, heatMetric, heatResolution, heatSaturation, heatStyle]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-800 via-gray-900 to-black text-white">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className={`${sidebarOpen ? "w-80" : "w-16"} transition-all duration-200 bg-gray-900/80 backdrop-blur-sm border-r border-gray-700 flex flex-col`}>
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            {sidebarOpen ? <h1 className="text-xl font-bold">🌌 Flip Universe</h1> : <span className="text-lg">🌌</span>}
            <button className="bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg px-2 py-1 text-sm" onClick={() => setSidebarOpen((v) => !v)} aria-label="Toggle sidebar">
              {sidebarOpen ? "←" : "→"}
            </button>
          </div>

          {sidebarOpen && (
            <div className="flex-1 p-4 space-y-6 overflow-y-auto">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Search Items</label>
                <input
                  placeholder="🔍 Search items..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-yellow-500 focus:outline-none"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-yellow-500 focus:outline-none"
                >
                  <option value="all">All Categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {getCategoryIcon(c)} {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Profit range */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Profit Range (total)</label>
                <div className="flex items-center gap-2">
                  <input type="number" className="w-1/2 bg-gray-800 border border-gray-700 rounded px-2 py-1"
                    value={filters.minProfit} onChange={(e) => setFilters({ ...filters, minProfit: Number(e.target.value) || 0 })} />
                  <input type="number" className="w-1/2 bg-gray-800 border border-gray-700 rounded px-2 py-1"
                    value={filters.maxProfit} onChange={(e) => setFilters({ ...filters, maxProfit: Number(e.target.value) || 0 })} />
                </div>
              </div>

              {/* Encodings */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1 text-gray-400">Y metric</label>
                  <select className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1" value={yMetric} onChange={(e) => setYMetric(e.target.value)}>
                    <option value="margin">Profit per Flip</option>
                    <option value="ppm">Profit per Minute</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs mb-1 text-gray-400">Color</label>
                  <select className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1" value={colorMode} onChange={(e) => setColorMode(e.target.value)}>
                    <option value="tier">Profit Tiers</option>
                    <option value="category">Item Category</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs mb-1 text-gray-400">Size</label>
                  <select className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1" value={sizeMode} onChange={(e) => setSizeMode(e.target.value)}>
                    <option value="total">Total Profit</option>
                    <option value="margin">Profit per Flip</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-400">Log X</label>
                  <input type="checkbox" checked={logX} onChange={(e) => setLogX(e.target.checked)} />
                  <label className="text-xs text-gray-400 ml-3">Log Y</label>
                  <input type="checkbox" checked={logY} onChange={(e) => setLogY(e.target.checked)} />
                </div>
              </div>

              {/* Heat overlay */}
              <div className="space-y-2 pt-2 border-t border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-gray-300">Heatmap</div>
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={showHeat} onChange={(e) => setShowHeat(e.target.checked)} />
                    Show
                  </label>
                </div>

                {showHeat && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs mb-1 text-gray-400">Heat metric</label>
                      <select className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1" value={heatMetric} onChange={(e) => setHeatMetric(e.target.value)}>
                        <option value="totalProfit">Total Profit</option>
                        <option value="count">Item Density</option>
                        <option value="avgMargin">Avg Profit/Flip</option>
                        <option value="avgPPM">Avg Profit/Minute</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs mb-1 text-gray-400">Resolution</label>
                      <select className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1" value={heatResolution} onChange={(e) => setHeatResolution(e.target.value)}>
                        <option value="coarse">Coarse</option>
                        <option value="normal">Normal</option>
                        <option value="fine">Fine</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs mb-1 text-gray-400">Style</label>
                      <select className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1" value={heatStyle} onChange={(e) => setHeatStyle(e.target.value)}>
                        <option value="grid">Grid (squares)</option>
                        <option value="glow">Glow (smooth)</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs mb-1 text-gray-400">Saturation</label>
                      <input type="range" min="0.1" max="1" step="0.05" value={heatSaturation} onChange={(e) => setHeatSaturation(Number(e.target.value))} className="w-full" />
                    </div>
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="bg-gray-800/50 rounded-lg p-3">
                <h3 className="text-sm font-medium text-gray-300 mb-2">Summary</h3>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-gray-400">Items:</span><span>{stats.count}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Total Profit:</span><span className="text-green-400">{formatGP(stats.totalProfit)}</span></div>
                  {stats.topItem && (
                    <div className="pt-2 border-t border-gray-700">
                      <div className="text-gray-400">Top Item:</div>
                      <div className="text-white font-medium">{stats.topItem.name}</div>
                      <div className="text-yellow-400">{formatGP(stats.topItem.profit)}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Chart area */}
        <div className="flex-1 relative">
          {showHeat && <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />}
          <div ref={wrapperRef} className="absolute inset-0">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={CHART_MARGIN}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" />
                <XAxis
                  type="number"
                  dataKey={logX ? (d) => Math.log10(Math.max(1, d.xRaw)) : "xRaw"}
                  domain={["dataMin", "dataMax"]}
                  tickFormatter={(v) => (logX ? formatAxisTicksPow10(v) : Math.round(v))}
                  axisLine={{ stroke: "rgba(255,255,255,0.3)" }}
                  tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12 }}
                  tickLine={false}
                  label={{ value: "Average Hold Time (minutes) →", position: "insideBottom", offset: -8, style: { fill: "rgba(255,255,255,0.8)" } }}
                />
                <YAxis
                  type="number"
                  dataKey={logY ? (d) => Math.log10(Math.max(1, d.yRaw)) : "yRaw"}
                  domain={["dataMin", "dataMax"]}
                  tickFormatter={(v) => (logY ? formatAxisTicksPow10(v) : formatGP(Math.round(v)))}
                  axisLine={{ stroke: "rgba(255,255,255,0.3)" }}
                  tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12 }}
                  tickLine={false}
                  label={{ value: yMetric === "ppm" ? "↑ Profit per Minute (GP)" : "↑ Profit per Flip (GP)", angle: -90, position: "insideLeft", style: { fill: "rgba(255,255,255,0.8)" } }}
                />
                <ZAxis type="number" dataKey="z" range={[12, 56]} />
                <Tooltip content={<TooltipContent />} cursor={false} />
                <Scatter data={data} shape={<Dot />} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

// Dot renderer
function Dot({ cx, cy, payload }) {
  if (!payload) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={payload.z / 2 + 4} fill={payload.color} opacity="0.16" />
      <circle cx={cx} cy={cy} r={payload.z / 2} fill={payload.color} opacity={0.85} stroke={payload.strokeColor} strokeWidth="2" className="cursor-pointer hover:stroke-white transition-all duration-150" />
      <circle cx={cx} cy={cy} r={Math.max(3, payload.z / 8)} fill="rgba(255,255,255,0.9)" opacity="0.7" />
    </g>
  );
}

function formatGP(v){ if(v>=1_000_000_000) return (v/1_000_000_000).toFixed(2).replace(/\.00$/,'')+"B"; if(v>=1_000_000) return (v/1_000_000).toFixed(1).replace(/\.0$/,'')+"M"; if(v>=1_000) return Math.round(v/1_000)+"K"; return (v??0).toLocaleString(); }
function formatTime(m){ if(m>=60) return `${Math.floor(m/60)}h ${m%60}m`; return `${Math.max(0,Math.round(m))}m`; }
function formatAxisTicksPow10(v){ const p=Math.pow(10,v); if(p>=1_000_000) return (p/1_000_000).toFixed(1).replace(/\.0$/,'')+"M"; if(p>=1_000) return Math.round(p/1_000)+"K"; return Math.round(p); }

function getProfitTier(p){ if(p>100_000) return "high"; if(p>20_000) return "good"; if(p>=0) return "small"; return "loss"; }
function getTierColors(t){ if(t==="high") return {color:"#22c55e",strokeColor:"rgba(34,197,94,0.9)"}; if(t==="good") return {color:"#eab308",strokeColor:"rgba(234,179,8,0.9)"}; if(t==="small") return {color:"#60a5fa",strokeColor:"rgba(96,165,250,0.9)"}; return {color:"#ef4444",strokeColor:"rgba(239,68,68,0.9)"}; }

function getCategoryFromName(name=""){ const s=name.toLowerCase();
  if(s.includes("rune")) return "Runes";
  if(s.includes("arrow")||s.includes("bolt")||s.includes("dart")) return "Ammunition";
  if(s.includes("bone")) return "Bones";
  if(s.includes("bar")||s.includes("ore")) return "Materials";
  if(s.includes("seed")) return "Seeds";
  if(s.includes("potion")) return "Potions";
  if(s.includes("shark")||s.includes("lobster")||s.includes("karamb")) return "Food";
  if(s.includes("helm")||s.includes("plate")||s.includes("legs")||s.includes("kite")) return "Armor";
  if(s.includes("sword")||s.includes("scim")||s.includes("whip")||s.includes("bow")) return "Weapons";
  if(s.includes("ring")||s.includes("amulet")||s.includes("necklace")) return "Jewelry";
  if(s.includes("staff")||s.includes("wand")||s.includes("tome")) return "Magic";
  if(s.includes("pickaxe")||s.includes("axe")) return "Tools";
  return "Misc";
}
function getCategoryIcon(c){ const m={Runes:"🔮",Ammunition:"🏹",Bones:"🦴",Materials:"⛏️",Seeds:"🌱",Potions:"🧪",Food:"🍖",Armor:"🛡️",Weapons:"⚔️",Jewelry:"💍",Magic:"✨",Tools:"🧰",Misc:"📦"}; return m[c]||"📦"; }
function getCategoryColors(c){ const p={Runes:"#a78bfa",Ammunition:"#60a5fa",Bones:"#94a3b8",Materials:"#f97316",Seeds:"#22c55e",Potions:"#14b8a6",Food:"#f59e0b",Armor:"#64748b",Weapons:"#ef4444",Jewelry:"#e879f9",Magic:"#38bdf8",Tools:"#84cc16",Misc:"#cbd5e1"}; const color=p[c]||"#60a5fa"; return {color,strokeColor:color}; }
function lerpColor(a,b,c,t){ const mix=(x,y,t)=>Math.round(x+(y-x)*t); if(t<=0.5){const tt=t/0.5; return {r:mix(a.r,b.r,tt),g:mix(a.g,b.g,tt),b:mix(a.b,b.b,tt)};} const tt=(t-0.5)/0.5; return {r:mix(b.r,c.r,tt),g:mix(b.g,c.g,tt),b:mix(b.b,c.b,tt)}; }
