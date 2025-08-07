// ETACalculator.final.js
// Simple, robust ETA calculator for "1k -> Max Cash" style runs
// Takes the solid refactored base and adds just the essential improvements

// Default configuration
const DEFAULTS = {
  target: 2147483647,           // OSRS max stack (GP)
  skipFirstDays: 7,             // ignore early noise
  expLookbackDays: 14,          // window for exponential fit
  maxExponentialDailyGrowth: 0.20, // 20%/day hard guard
  minDailyProfit: 1,            // avoid divide-by-zero
  confidenceThresholds: { high: 0.15, medium: 0.35 }, // relative spread
  maxReasonableETA: 1095,       // 3 years max (anything beyond is "unable to calculate")
};

// ----------------- Utilities -----------------

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

function median(arr) {
  if (!arr.length) return NaN;
  const a = [...arr].sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}

function variance(arr) {
  if (arr.length < 2) return 0;
  const m = arr.reduce((s, x) => s + x, 0) / arr.length;
  return arr.reduce((s, x) => s + (x - m) ** 2, 0) / (arr.length - 1);
}

function isFinitePositive(x) {
  return Number.isFinite(x) && x > 0;
}

// Least squares linear regression with R-squared
function linearRegression(x, y) {
  const n = Math.min(x.length, y.length);
  if (n < 2) return { a: NaN, b: NaN, r2: 0 };
  
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0, sumYY = 0;
  for (let i = 0; i < n; i++) {
    const xi = x[i], yi = y[i];
    if (!Number.isFinite(xi) || !Number.isFinite(yi)) continue;
    sumX += xi; sumY += yi; sumXY += xi * yi; 
    sumXX += xi * xi; sumYY += yi * yi;
  }
  
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return { a: NaN, b: NaN, r2: 0 };
  
  const b = (n * sumXY - sumX * sumY) / denom;
  const a = (sumY - b * sumX) / n;
  
  // Calculate R-squared to know if linear fit is actually good
  const yMean = sumY / n;
  const ssRes = y.reduce((sum, yi, i) => {
    const predicted = a + b * x[i];
    return sum + Math.pow(yi - predicted, 2);
  }, 0);
  const ssTot = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
  const r2 = ssTot === 0 ? 1 : Math.max(0, 1 - (ssRes / ssTot));
  
  return { a, b, r2 };
}

// Format ETA for display
export function formatETA(etaDays) {
  if (etaDays == null || etaDays === Infinity || Number.isNaN(etaDays)) return "Unable to calculate";
  if (etaDays === 0) return "Goal reached";
  const days = Math.ceil(etaDays);
  return days === 1 ? "1 day" : `${days} days`;
}

// ----------------- Core Methods -----------------

// Method A: Linear trend (only use if reasonably linear)
function etaLinear(validDays, target) {
  const x = validDays.map(d => d.day);
  const y = validDays.map(d => d.netWorth);
  const lastNW = y[y.length - 1];
  if (lastNW >= target) return 0;

  const { b: slopePerDay, r2 } = linearRegression(x, y);
  
  // Only trust linear if it's actually a decent fit AND positive slope
  if (!Number.isFinite(slopePerDay) || slopePerDay <= 0 || r2 < 0.3) {
    return Infinity;
  }

  const remaining = target - lastNW;
  return remaining / slopePerDay;
}

// Method B: Exponential trend (only use if good fit)
function etaExponential(validDays, target, { expLookbackDays, maxExponentialDailyGrowth }) {
  const last = validDays[validDays.length - 1];
  const lastNW = last.netWorth;
  if (lastNW >= target) return 0;

  const cutoff = last.day - expLookbackDays;
  const window = validDays.filter(d => d.day >= cutoff && d.netWorth > 0);
  if (window.length < 3) return Infinity;

  const x = window.map(d => d.day);
  const y = window.map(d => Math.log(d.netWorth));

  const { b, r2 } = linearRegression(x, y);
  
  // Only trust exponential if it's a good fit
  if (!Number.isFinite(b) || r2 < 0.5) return Infinity;

  const dailyGrowth = clamp(Math.exp(b) - 1, 0, maxExponentialDailyGrowth);
  if (dailyGrowth <= 0) return Infinity;

  const t = Math.log(target / lastNW) / Math.log(1 + dailyGrowth);
  return t > 0 && Number.isFinite(t) ? t : Infinity;
}

// Method C: Weighted average (always applicable)
function etaWeightedAverage(validDays, target, { minDailyProfit }) {
  const lastNW = validDays[validDays.length - 1].netWorth;
  if (lastNW >= target) return 0;

  const minDay = validDays[0].day;
  let weightedSum = 0;
  let weightTotal = 0;

  for (let i = 1; i < validDays.length; i++) {
    const prev = validDays[i - 1];
    const curr = validDays[i];
    const dt = curr.day - prev.day;
    if (dt <= 0) continue;
    const profitPerDay = (curr.netWorth - prev.netWorth) / dt;

    const w = (curr.day - minDay + 1);
    weightedSum += w * profitPerDay;
    weightTotal += w;
  }

  if (weightTotal === 0) return Infinity;
  const avgProfitPerDay = Math.max(minDailyProfit, weightedSum / weightTotal);
  if (!Number.isFinite(avgProfitPerDay) || avgProfitPerDay <= 0) return Infinity;

  const remaining = target - lastNW;
  return remaining / avgProfitPerDay;
}

// ----------------- Main API -----------------

export function calculateETA(days, options = {}) {
  const cfg = { ...DEFAULTS, ...options };

  if (!Array.isArray(days) || days.length < 2) {
    return {
      etaDays: NaN,
      confidence: "low",
      methods: { linear: NaN, exponential: NaN, weighted: NaN },
      formatted: "Unable to calculate",
      note: "Not enough data",
    };
  }

  // Sort by day and filter early noise
  const sorted = [...days].sort((a, b) => a.day - b.day);
  const validDays = sorted.filter(d => d.day >= (sorted[0].day + cfg.skipFirstDays));
  const data = validDays.length >= 2 ? validDays : sorted;
  const currentNW = data[data.length - 1].netWorth;

  // Early exit: already at target
  if (currentNW >= cfg.target) {
    return {
      etaDays: 0,
      confidence: "high",
      methods: { linear: 0, exponential: 0, weighted: 0 },
      formatted: formatETA(0),
    };
  }

  // Compute all methods
  const linear = etaLinear(data, cfg.target);
  const exponential = etaExponential(data, cfg.target, cfg);
  const weighted = etaWeightedAverage(data, cfg.target, cfg);

  // Filter reasonable estimates
  const candidates = [linear, exponential, weighted]
    .filter(eta => isFinitePositive(eta) && eta <= cfg.maxReasonableETA);

  if (candidates.length === 0) {
    return {
      etaDays: NaN,
      confidence: "low",
      methods: { linear, exponential, weighted },
      formatted: "Unable to calculate",
      note: "No methods produced reasonable estimates",
    };
  }

  // Use median for robustness
  const etaDays = median(candidates);

  // Confidence based on spread between methods
  const sd = Math.sqrt(variance(candidates));
  const relativeSpread = sd / etaDays;
  
  const confidence =
    relativeSpread < cfg.confidenceThresholds.high ? "high"
    : relativeSpread < cfg.confidenceThresholds.medium ? "medium"
    : "low";

  return {
    etaDays,
    confidence,
    methods: { linear, exponential, weighted },
    formatted: formatETA(etaDays),
  };
}

// Pretty-print helper
export function describeETA(result) {
  if (!result) return "No result";
  const { formatted, confidence, methods } = result;
  const parts = [
    `ETA: ${formatted}`,
    `Confidence: ${confidence}`,
    `Linear: ${formatETA(methods.linear)}`,
    `Exponential: ${formatETA(methods.exponential)}`,
    `Weighted: ${formatETA(methods.weighted)}`,
  ];
  return parts.join(" | ");
}