// src/lib/roiClient.js
async function tryJSON(url) {
  try { const r = await fetch(url, { cache: "no-store" }); return r.ok ? r.json() : null; }
  catch { return null; }
}
async function tryText(url) {
  try { const r = await fetch(url, { cache: "no-store" }); return r.ok ? r.text() : null; }
  catch { return null; }
}
const num = (x) => {
  if (x == null || x === "") return NaN;
  const s = String(x).trim().replace(/,/g, "");
  return s.endsWith("%") ? parseFloat(s)/100 : parseFloat(s);
};

const MIN_NET_FOR_ROI = 10_000_000; // ignore bootstrap days
const ABS_CAP = 0.50;                // absolute guardrail ±50% (your early growth is legit!)

function quantile(arr, q) {
  const a = [...arr].sort((x,y)=>x-y);
  const i = (a.length - 1) * q;
  const lo = Math.floor(i), hi = Math.ceil(i);
  return lo === hi ? a[lo] : a[lo] + (a[hi] - a[lo]) * (i - lo);
}

export async function loadROIClientSide() {
  // Prefer normalized build-time index
  const idx = await tryJSON("/data/summary-index.json");
  if (idx && Array.isArray(idx.days) && idx.days.length) {
    const days = idx.days;
    const roiRaw = [];
    let firstUsedDate = null;

    // Sort by date to ensure proper order
    days.sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));

    for (let i = 1; i < days.length; i++) {
      const prevDay = days[i - 1];
      const currDay = days[i];

      const prevNet = num(prevDay.netWorth ?? prevDay.net ?? prevDay.net_worth);
      const currNet = num(currDay.netWorth ?? currDay.net ?? currDay.net_worth);

      // ✅ PRIORITIZE percent_change for wealth forecasting
      let r = num(currDay.percent_change ?? currDay.percentChange ?? currDay.pctChange);
      if (Number.isFinite(r)) {
        r = Math.abs(r) > 1 ? r / 100 : r; // Convert to decimal if needed
      }

      // Fallback to roi_decimal if no percent_change
      if (!Number.isFinite(r)) {
        r = num(currDay.roi_decimal);
      }

      // ✅ FIXED: Calculate net worth growth rate instead of profit/previous_net
      if (!Number.isFinite(r) && Number.isFinite(prevNet) && Number.isFinite(currNet) && prevNet > 0) {
        r = (currNet / prevNet) - 1;  // This is the correct growth rate calculation
      }

      // Only include if we have valid data and sufficient net worth
      if (Number.isFinite(r) && Number.isFinite(prevNet) && prevNet >= MIN_NET_FOR_ROI) {
        roiRaw.push(r);
        if (!firstUsedDate) firstUsedDate = currDay.date;
      }
    }

    let roi = [];
    if (roiRaw.length >= 5) {
      const q01 = quantile(roiRaw, 0.01);
      const q99 = quantile(roiRaw, 0.99);
      const lo = Math.max(-ABS_CAP, q01);
      const hi = Math.min(ABS_CAP, q99);
      roi = roiRaw.map(r => Math.min(hi, Math.max(lo, r)));
    } else {
      // tiny sample → fall back to absolute cap
      roi = roiRaw.map(r => Math.max(-ABS_CAP, Math.min(ABS_CAP, r)));
    }

    const lastNet = days.at(-1)?.netWorth ?? 10_000_000;
    const stats = {
      n: roi.length,
      median: roi.length ? quantile(roi, 0.5) : null,
      p90: roi.length ? quantile(roi, 0.9) : null,
      firstDateUsed: firstUsedDate,
      capAbs: ABS_CAP,
      rawSample: roiRaw.slice(0, 10), // Include raw sample for debugging
    };
    return { roi, startNet: lastNet, stats };
  }

  // CSV fallback with same fix
  const t = await tryText("/data/daily_summary.csv");
  if (t) {
    const lines = t.trim().split(/\r?\n/);
    const header = lines.shift().split(",").map((h) => h.toLowerCase());
    const idxs = {
      net: header.findIndex((h) => h.includes("net") && h.includes("worth")),
      profit: header.findIndex((h) => h.includes("profit")),
      pct: header.findIndex((h) => h.includes("%") || h.includes("percent")),
    };

    const nets = [], profits = [], pct = [];
    for (const line of lines) {
      const cols = line.split(",");
      if (idxs.net >= 0) nets.push(num(cols[idxs.net]));
      if (idxs.profit >= 0) profits.push(num(cols[idxs.profit]));
      if (idxs.pct >= 0) pct.push(num(cols[idxs.pct]));
    }

    let roi = [];
    if (pct.filter(Number.isFinite).length >= 5) {
      roi = pct.filter(Number.isFinite).map((v) => (Math.abs(v) > 1 ? v/100 : v));
    } else {
      // ✅ FIXED: Use net worth growth instead of profit/previous_net
      for (let i = 1; i < nets.length; i++) {
        const prevNet = nets[i-1];
        const currNet = nets[i];
        if (Number.isFinite(prevNet) && Number.isFinite(currNet) && prevNet > 0) {
          roi.push((currNet / prevNet) - 1);
        }
      }
    }

    // winsorize CSV path too
    if (roi.length >= 5) {
      const q01 = quantile(roi, 0.01), q99 = quantile(roi, 0.99);
      const lo = Math.max(-ABS_CAP, q01), hi = Math.min(ABS_CAP, q99);
      roi = roi.map(r => Math.min(hi, Math.max(lo, r)));
    } else {
      roi = roi.map(r => Math.max(-ABS_CAP, Math.min(ABS_CAP, r)));
    }
    return { roi, startNet: nets.filter(Number.isFinite).at(-1) ?? 10_000_000, stats: { n: roi.length } };
  }

  // Last resort demo with realistic values
  return {
    roi: [0.015, 0.008, -0.003, 0.012, 0.009, 0.006, 0.018, -0.002, 0.011, 0.007],
    startNet: 25_000_000,
    stats: { n: 10 }
  };
}