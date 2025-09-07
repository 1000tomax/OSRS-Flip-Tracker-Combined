import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';

function hashKey(obj) {
  try {
    const s = JSON.stringify(obj);
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (h * 31 + s.charCodeAt(i)) >>> 0;
    }
    return h.toString(16);
  } catch (_e) {
    return 'insights';
  }
}

// Build a compact payload from guestData for last 7 days vs prior 7
function buildInsightsPayload(guestData) {
  const daily = Array.isArray(guestData?.dailySummaries) ? guestData.dailySummaries.slice() : [];
  if (daily.length === 0) return null;
  // Ensure sorted by date ascending (MM-DD-YYYY)
  daily.sort((a, b) => {
    const [am, ad, ay] = a.date.split('-');
    const [bm, bd, by] = b.date.split('-');
    return new Date(ay, am - 1, ad) - new Date(by, bm - 1, bd);
  });

  const last14 = daily.slice(-14);
  const curr7 = last14.slice(-7);
  const prev7 = last14.slice(0, Math.max(0, last14.length - 7));
  if (curr7.length === 0 || prev7.length === 0) return null;

  const sumBlock = (arr) => {
    const flips = arr.reduce((s, d) => s + (d.flipCount || d.total_flips || 0), 0);
    const profit = arr.reduce((s, d) => s + (d.totalProfit ?? d.total_profit ?? 0), 0);
    // Estimate winRate using flipsByDate if present (fallback to 0)
    let wins = 0;
    let total = 0;
    arr.forEach(d => {
      const flipsForDay = guestData?.flipsByDate?.[d.date]?.flips || guestData?.flipsByDate?.[d.date] || [];
      if (Array.isArray(flipsForDay)) {
        wins += flipsForDay.filter(f => (f.profit || 0) > 0).length;
        total += flipsForDay.length;
      }
    });
    const winRate = total > 0 ? (wins / total) * 100 : 0;
    return { profit, flips, winRate: Number(winRate.toFixed(1)) };
  };

  const currTotals = sumBlock(curr7);
  const prevTotals = sumBlock(prev7);

  // Top items for current 7 days using flipsByDate (aggregate profits)
  const itemProfit = new Map();
  const hourProfit = new Map();
  curr7.forEach(d => {
    const flips = guestData?.flipsByDate?.[d.date]?.flips || guestData?.flipsByDate?.[d.date] || [];
    if (!Array.isArray(flips)) return;
    flips.forEach(f => {
      const name = f.item || f.item_name || f.itemName;
      const p = f.profit || 0;
      if (name) itemProfit.set(name, (itemProfit.get(name) || 0) + p);
      const t = f.lastSellTime || f.last_sell_time;
      if (t) {
        const h = new Date(t).getHours();
        hourProfit.set(h, (hourProfit.get(h) || 0) + p);
      }
    });
  });
  const topItems = [...itemProfit.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, profit]) => ({ name, profit }));
  const worstItems = [...itemProfit.entries()]
    .sort((a, b) => a[1] - b[1])
    .slice(0, 5)
    .map(([name, profit]) => ({ name, profit }));
  // Previous period items/hours (for shift comparisons and to constrain mentions)
  const prevItemProfit = new Map();
  const prevHourProfit = new Map();
  prev7.forEach(d => {
    const flips = guestData?.flipsByDate?.[d.date]?.flips || guestData?.flipsByDate?.[d.date] || [];
    if (!Array.isArray(flips)) return;
    flips.forEach(f => {
      const name = f.item || f.item_name || f.itemName;
      const p = f.profit || 0;
      if (name) prevItemProfit.set(name, (prevItemProfit.get(name) || 0) + p);
      const t = f.lastSellTime || f.last_sell_time;
      if (t) {
        const h = new Date(t).getHours();
        prevHourProfit.set(h, (prevHourProfit.get(h) || 0) + p);
      }
    });
  });
  const prevTopItems = [...prevItemProfit.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, profit]) => ({ name, profit }));
  const prevBestHours = [...prevHourProfit.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([hour, profit]) => ({ hour, profit }));
  const hoursSorted = [...hourProfit.entries()].sort((a, b) => b[1] - a[1]);
  const bestHours = hoursSorted.slice(0, 3).map(([hour, profit]) => ({ hour, profit }));
  const worstHours = hoursSorted.slice(-3).map(([hour, profit]) => ({ hour, profit }));

  const range = {
    from: curr7[0].date,
    to: curr7[curr7.length - 1].date,
    prevFrom: prev7[0].date,
    prevTo: prev7[prev7.length - 1].date,
  };

  return {
    range,
    totals: currTotals,
    prevTotals,
    topItems,
    worstItems,
    bestHours,
    worstHours,
    prevTopItems,
    prevBestHours,
  };
}

export default function InsightsCard({ guestData }) {
  const [loading, setLoading] = useState(false);
  const [bullets, setBullets] = useState(null);
  const [meta, setMeta] = useState(null);

  const payload = useMemo(() => buildInsightsPayload(guestData), [guestData]);

  const cacheKey = useMemo(() => (payload ? `insights:${hashKey(payload)}` : null), [payload]);

  const tryLoadCache = () => {
    if (!cacheKey) return false;
    try {
      const raw = localStorage.getItem(cacheKey);
      if (!raw) return false;
      const cached = JSON.parse(raw);
      setBullets(cached.bullets || null);
      setMeta(cached.meta || null);
      return true;
    } catch (_e) {
      return false;
    }
  };

  const saveCache = (data) => {
    if (!cacheKey) return;
    try {
      localStorage.setItem(cacheKey, JSON.stringify({ ...data, cachedAt: new Date().toISOString() }));
    } catch (_e) {
      // noop
    }
  };

  const generate = async (force = false) => {
    if (!payload) {
      toast.info('Not enough data yet to generate insights.');
      return;
    }
    if (!force && tryLoadCache()) return;

    try {
      setLoading(true);
      const res = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setBullets(data.bullets || null);
      setMeta({ usage: data.usage, cost: data.cost });
      saveCache({ bullets: data.bullets, meta: { usage: data.usage, cost: data.cost } });
    } catch (e) {
      console.error('Insights error', e);
      toast.error('Failed to generate insights.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">AI Insights</h3>
          <p className="text-xs text-gray-400">Explains changes using only your aggregated data</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => generate(false)}
            disabled={loading}
            className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white rounded"
          >
            {loading ? 'Generating…' : 'Generate'}
          </button>
          <button
            onClick={() => generate(true)}
            disabled={loading}
            className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 disabled:bg-gray-700 text-white rounded"
            title="Bypass cache"
          >
            Regenerate
          </button>
        </div>
      </div>

      {payload && (
        <div className="mt-2 text-xs text-gray-400">
          Period: {payload.range.from} → {payload.range.to}
          <span className="mx-1">(prev {payload.range.prevFrom} → {payload.range.prevTo})</span>
        </div>
      )}

      {bullets && (
        <ul className="mt-3 list-disc list-inside text-gray-200 text-sm space-y-1">
          {bullets.filter(Boolean).map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      )}

      {meta?.cost && (
        <div className="mt-3 text-xs text-gray-500">
          Est. cost: <span className="text-gray-300">{meta.cost.formatted}</span>
        </div>
      )}
      {!payload && (
        <div className="mt-3 text-xs text-gray-400">Upload at least 14 days to enable insights.</div>
      )}
    </div>
  );
}
