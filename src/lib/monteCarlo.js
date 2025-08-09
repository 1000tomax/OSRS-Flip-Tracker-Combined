// monteCarlo.js — tiny, fast Monte Carlo for OSRS net-worth forecasting
// Mean-preserving variance scaling + utilization mean scaling.

export function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function simulate({
  startGP,
  targetGP = 2147483647,
  horizonDays = 365,
  paths = 1500,
  roiHistory = [], // decimals, e.g. 0.008 = 0.8%
  riskScale = 1.0, // variance stretcher
  utilScale = 0.85, // mean scaler
  seed = 12345,
}) {
  const rng = mulberry32(seed);
  const mean = roiHistory.reduce((a, b) => a + b, 0) / Math.max(roiHistory.length, 1);
  const idxMax = Math.max(roiHistory.length - 1, 0);

  const p10 = new Array(horizonDays).fill(0);
  const p50 = new Array(horizonDays).fill(0);
  const p90 = new Array(horizonDays).fill(0);

  const samples = new Array(paths);
  for (let p = 0; p < paths; p++) {
    let gp = startGP;
    const series = new Array(horizonDays);
    for (let d = 0; d < horizonDays; d++) {
      const i = Math.floor(rng() * (idxMax + 1));
      let r = roiHistory[i] ?? 0;
      r = mean + (r - mean) * riskScale; // variance scale around mean
      r = r * utilScale;                 // utilization scaling
      gp = gp * (1 + r);
      series[d] = gp;
    }
    samples[p] = series;
  }

  for (let d = 0; d < horizonDays; d++) {
    const col = samples.map((row) => row[d]).sort((a, b) => a - b);
    const n = col.length - 1;
    const q = (p) => {
      const i = n * p; const lo = Math.floor(i); const hi = Math.ceil(i);
      if (lo === hi) return col[lo];
      return col[lo] + (col[hi] - col[lo]) * (i - lo);
    };
    p10[d] = q(0.10); p50[d] = q(0.50); p90[d] = q(0.90);
  }

  const hit = (arr) => {
    for (let d = 0; d < arr.length; d++) if (arr[d] >= targetGP) return d + 1;
    return null;
  };

  return { p10, p50, p90, etaP10: hit(p10), etaP50: hit(p50), etaP90: hit(p90) };
}

export function gpFormat(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(2).replace(/\.0+$/, "") + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2).replace(/\.0+$/, "") + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(2).replace(/\.0+$/, "") + "K";
  return Math.floor(n).toLocaleString();
}