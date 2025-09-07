/**
 * Data processing utilities for Guest Mode item analysis
 *
 * These functions accept an item name and the guest flipsByDate structure
 * (either { [date]: Flip[] } or { [date]: { flips: Flip[] } }) and return
 * precomputed series and statistics for use in charts and tables.
 */

/**
 * Normalize the flipsByDate object into a flat array of flips for a specific item.
 * @param {string} itemName
 * @param {Record<string, any>|undefined} flipsByDate
 * @returns {Array<object>} standardized flips with timestamps
 */
export function getItemFlips(itemName, flipsByDate) {
  if (!flipsByDate || !itemName) return [];
  const rows = [];
  const nameLower = String(itemName).toLowerCase();

  Object.values(flipsByDate).forEach(day => {
    const flips = Array.isArray(day) ? day : day?.flips || [];
    flips.forEach(f => {
      const n = f.item || f.item_name;
      if (!n || String(n).toLowerCase() !== nameLower) return;

      const buy = Number(f.avgBuyPrice || f.avg_buy_price || 0);
      const sell = Number(f.avgSellPrice || f.avg_sell_price || 0);
      const qty = Number(f.quantity || f.bought || f.sold || 0);
      const profit = Number(f.profit || 0);
      const tax = Number(f.sellerTax || f.tax || 0);
      const startRaw = f.firstBuyTime || f.first_buy_time || f.startTime;
      const endRaw = f.lastSellTime || f.last_sell_time || f.endTime;
      const start = startRaw ? new Date(startRaw) : null;
      const end = endRaw ? new Date(endRaw) : null;
      const ts = end || start || null;
      const tsMs = ts ? ts.getTime() : 0;
      const durationMin = start && end ? Math.max(0, (end.getTime() - start.getTime()) / 60000) : null;
      const roi = buy > 0 ? (sell - buy) / buy : null;
      const marginPct = buy > 0 ? ((sell - buy) / buy) * 100 : null;

      rows.push({
        item: n,
        profit,
        quantity: qty,
        avgBuyPrice: buy,
        avgSellPrice: sell,
        tax,
        startTime: start?.toISOString() || null,
        endTime: end?.toISOString() || null,
        ts: ts ? ts.toISOString() : null,
        tsMs,
        durationMin,
        roi,
        marginPct,
      });
    });
  });

  // Sort by timestamp ascending
  rows.sort((a, b) => a.tsMs - b.tsMs);
  return rows;
}

/**
 * Calculate the core metrics and time series for a single item.
 * @param {string} itemName
 * @param {Record<string, any>|undefined} flipsByDate
 */
export function calculateItemDeepMetrics(itemName, flipsByDate) {
  const flips = getItemFlips(itemName, flipsByDate);
  let totalProfit = 0;
  let wins = 0;
  let losses = 0;
  let bestFlip = null;
  let worstFlip = null;

  const individualSeries = flips.map((f, idx) => {
    totalProfit += f.profit || 0;
    if ((f.profit || 0) > 0) wins += 1; else if ((f.profit || 0) < 0) losses += 1;
    if (bestFlip === null || (f.profit || 0) > (bestFlip?.profit || -Infinity)) bestFlip = f;
    if (worstFlip === null || (f.profit || 0) < (worstFlip?.profit || Infinity)) worstFlip = f;
    return { x: idx + 1, tsMs: f.tsMs, ts: f.ts, profit: f.profit };
  });

  let cum = 0;
  const cumulativeSeries = flips.map((f, idx) => {
    cum += f.profit || 0;
    return { x: idx + 1, tsMs: f.tsMs, ts: f.ts, cumulativeProfit: cum, profit: f.profit };
  });

  const flipCount = flips.length;
  const avgProfit = flipCount > 0 ? totalProfit / flipCount : 0;
  const wlCount = wins + losses;
  const successRate = wlCount > 0 ? (wins / wlCount) * 100 : (flipCount > 0 ? (wins / flipCount) * 100 : 0);

  return {
    flips,
    individualSeries,
    cumulativeSeries,
    totals: {
      totalProfit,
      flipCount,
      wins,
      losses,
      successRate,
      avgProfit,
      bestFlip,
      worstFlip,
    },
  };
}

/**
 * Build a day/hour performance grid for heatmap-like analysis.
 * @param {string} itemName
 * @param {Record<string, any>|undefined} flipsByDate
 */
export function getItemTimePatterns(itemName, flipsByDate) {
  const flips = getItemFlips(itemName, flipsByDate);
  const grid = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => ({ profit: 0, flips: 0 })));

  flips.forEach(f => {
    if (!f.ts) return;
    const dt = new Date(f.ts);
    const day = dt.getDay(); // 0-6
    const hour = dt.getHours(); // 0-23
    grid[day][hour].profit += f.profit || 0;
    grid[day][hour].flips += 1;
  });

  const cells = [];
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      const { profit, flips } = grid[d][h];
      cells.push({ day: d, hour: h, profit, flips, avgProfit: flips > 0 ? profit / flips : 0 });
    }
  }
  return cells;
}

/**
 * Calculate risk metrics from flip profit series: volatility, streaks, max drawdown.
 * @param {string} itemName
 * @param {Record<string, any>|undefined} flipsByDate
 */
export function calculateItemRisk(itemName, flipsByDate) {
  const flips = getItemFlips(itemName, flipsByDate);
  const profits = flips.map(f => Number(f.profit) || 0);
  const n = profits.length;
  if (n === 0) {
    return {
      volatility: 0,
      longestWinStreak: 0,
      longestLossStreak: 0,
      maxDrawdown: 0,
      timeToRecoverAvgMin: null,
    };
  }

  // Volatility (stddev)
  const mean = profits.reduce((a, b) => a + b, 0) / n;
  const variance = profits.reduce((acc, p) => acc + Math.pow(p - mean, 2), 0) / n;
  const volatility = Math.sqrt(variance);

  // Streaks
  let longestWinStreak = 0, longestLossStreak = 0, curWin = 0, curLoss = 0;
  profits.forEach(p => {
    if (p > 0) { curWin += 1; curLoss = 0; } else if (p < 0) { curLoss += 1; curWin = 0; } else { curWin = 0; curLoss = 0; }
    if (curWin > longestWinStreak) longestWinStreak = curWin;
    if (curLoss > longestLossStreak) longestLossStreak = curLoss;
  });

  // Max drawdown from cumulative equity
  let peak = 0; let trough = 0; let equity = 0; let maxDrawdown = 0;
  const equitySeries = profits.map(p => (equity += p));
  equitySeries.forEach(v => {
    if (v > peak) { peak = v; trough = v; }
    if (v < trough) { trough = v; maxDrawdown = Math.min(maxDrawdown, trough - peak); }
  });

  // Time to recover (average minutes from local trough to exceed prior peak)
  // Simple heuristic: track times when equity makes a new peak after a decline
  let lastPeakValue = 0;
  let lastPeakIndex = 0;
  const recoveries = [];
  for (let i = 0; i < equitySeries.length; i++) {
    const v = equitySeries[i];
    if (v > lastPeakValue) {
      // new peak, record recovery time from last peak if a drawdown happened
      if (i > lastPeakIndex) {
        // approximate duration: use flip durations if available
        const startTs = getSafeTs(flips[lastPeakIndex]);
        const endTs = getSafeTs(flips[i]);
        if (startTs && endTs && endTs > startTs) {
          recoveries.push((endTs - startTs) / 60000);
        }
      }
      lastPeakValue = v;
      lastPeakIndex = i;
    }
  }
  const timeToRecoverAvgMin = recoveries.length > 0
    ? recoveries.reduce((a, b) => a + b, 0) / recoveries.length
    : null;

  return { volatility, longestWinStreak, longestLossStreak, maxDrawdown, timeToRecoverAvgMin };
}

function getSafeTs(flip) {
  if (!flip) return null;
  const ts = flip.endTime || flip.startTime || flip.ts;
  return ts ? new Date(ts).getTime() : null;
}

/**
 * Determine an optimal quantity range and correlation between quantity and profit.
 * @param {string} itemName
 * @param {Record<string, any>|undefined} flipsByDate
 */
export function getOptimalQuantityRange(itemName, flipsByDate) {
  const flips = getItemFlips(itemName, flipsByDate);
  if (flips.length === 0) return { range: null, correlation: 0, byBin: [] };

  // Bin by quantity using simple bins of size 50
  const binSize = 50;
  const bins = new Map();
  flips.forEach(f => {
    const q = Math.max(0, Math.floor((Number(f.quantity) || 0) / binSize));
    if (!bins.has(q)) bins.set(q, { count: 0, profit: 0 });
    const b = bins.get(q);
    b.count += 1;
    b.profit += Number(f.profit) || 0;
  });
  const byBin = Array.from(bins.entries()).map(([k, v]) => ({
    from: k * binSize,
    to: (k + 1) * binSize - 1,
    count: v.count,
    avgProfit: v.count > 0 ? v.profit / v.count : 0,
  }));

  // Choose the best bin with at least a small sample size
  const MIN_SAMPLES = 5;
  const viable = byBin.filter(b => b.count >= MIN_SAMPLES);
  const best = viable.sort((a, b) => b.avgProfit - a.avgProfit)[0] || null;

  // Correlation between quantity and profit (Pearson)
  const qArr = flips.map(f => Number(f.quantity) || 0);
  const pArr = flips.map(f => Number(f.profit) || 0);
  const correlation = pearson(qArr, pArr);

  return { range: best, correlation, byBin };
}

function pearson(xs, ys) {
  const n = Math.min(xs.length, ys.length);
  if (n === 0) return 0;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (let i = 0; i < n; i++) {
    const x = xs[i];
    const y = ys[i];
    sumX += x; sumY += y; sumXY += x * y; sumX2 += x * x; sumY2 += y * y;
  }
  const numerator = n * sumXY - sumX * sumY;
  const denom = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  if (!isFinite(denom) || denom === 0) return 0;
  return numerator / denom;
}

export default {
  getItemFlips,
  calculateItemDeepMetrics,
  getItemTimePatterns,
  calculateItemRisk,
  getOptimalQuantityRange,
};
