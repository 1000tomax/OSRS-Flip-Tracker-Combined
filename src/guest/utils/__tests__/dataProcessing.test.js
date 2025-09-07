import {
  getItemFlips,
  calculateItemDeepMetrics,
  getItemTimePatterns,
  calculateItemRisk,
  getOptimalQuantityRange,
} from '../../utils/dataProcessing';

function buildFlipsByDate() {
  return {
    '01-01-2025': {
      flips: [
        {
          item: 'Dragon bones',
          profit: 1000,
          quantity: 100,
          avgBuyPrice: 1000,
          avgSellPrice: 1100,
          firstBuyTime: '2025-01-01T10:00:00Z',
          lastSellTime: '2025-01-01T11:00:00Z',
        },
        {
          item: 'Dragon bones',
          profit: -200,
          quantity: 50,
          avgBuyPrice: 1200,
          avgSellPrice: 1180,
          firstBuyTime: '2025-01-01T12:00:00Z',
          lastSellTime: '2025-01-01T16:00:00Z',
        },
      ],
    },
    '01-02-2025': {
      flips: [
        {
          item: 'Dragon bones',
          profit: 300,
          quantity: 30,
          avgBuyPrice: 1500,
          avgSellPrice: 1510,
          firstBuyTime: '2025-01-02T02:00:00Z',
          lastSellTime: '2025-01-02T03:00:00Z',
        },
        {
          item: 'Shark',
          profit: 500,
          quantity: 100,
          avgBuyPrice: 700,
          avgSellPrice: 710,
          firstBuyTime: '2025-01-02T04:00:00Z',
          lastSellTime: '2025-01-02T05:00:00Z',
        },
      ],
    },
  };
}

describe('guest/utils/dataProcessing', () => {
  test('getItemFlips returns normalized, time-sorted flips for an item', () => {
    const flipsByDate = buildFlipsByDate();
    const flips = getItemFlips('Dragon bones', flipsByDate);
    expect(flips).toHaveLength(3);
    // ascending by timestamp
    const times = flips.map(f => f.tsMs);
    expect(times.slice().sort((a,b)=>a-b)).toEqual(times);
    // fields normalized
    expect(flips[0]).toHaveProperty('avgBuyPrice');
    expect(flips[0]).toHaveProperty('avgSellPrice');
    expect(typeof flips[0].marginPct === 'number' || flips[0].marginPct === null).toBe(true);
  });

  test('calculateItemDeepMetrics computes series and success rate as wins/(wins+losses)', () => {
    const flipsByDate = buildFlipsByDate();
    const deep = calculateItemDeepMetrics('Dragon bones', flipsByDate);
    expect(deep.flips).toHaveLength(3);
    // wins: 2 (1000, 300), losses: 1 (-200)
    expect(deep.totals.wins).toBe(2);
    expect(deep.totals.losses).toBe(1);
    // success rate = 2 / (2+1) * 100 = 66.6...
    expect(Math.round(deep.totals.successRate)).toBe(67);
    // cumulative grows by profit
    const cumEnd = deep.cumulativeSeries[deep.cumulativeSeries.length - 1].cumulativeProfit;
    expect(cumEnd).toBe(1100);
  });

  test('getItemTimePatterns aggregates by day/hour', () => {
    const flipsByDate = buildFlipsByDate();
    const cells = getItemTimePatterns('Dragon bones', flipsByDate);
    expect(cells).toHaveLength(7 * 24);
    // Find cell with at least one flip (based on first flip at 10:00Z)
    const any = cells.find(c => c.flips > 0);
    expect(any).toBeTruthy();
    expect(any).toHaveProperty('avgProfit');
  });

  test('calculateItemRisk computes volatility, streaks and drawdown', () => {
    const flipsByDate = buildFlipsByDate();
    const risk = calculateItemRisk('Dragon bones', flipsByDate);
    expect(risk).toHaveProperty('volatility');
    expect(risk.longestWinStreak).toBeGreaterThanOrEqual(1);
    expect(risk.longestLossStreak).toBeGreaterThanOrEqual(0);
    // maxDrawdown should be <= 0 (we store negative drawdown)
    expect(risk.maxDrawdown).toBeLessThanOrEqual(0);
  });

  test('getOptimalQuantityRange returns best bin and correlation', () => {
    // Build more flips to satisfy MIN_SAMPLES
    const base = buildFlipsByDate();
    base['01-03-2025'] = {
      flips: Array.from({ length: 10 }, (_, i) => ({
        item: 'Dragon bones',
        profit: i % 2 === 0 ? 100 : -50,
        quantity: 25 + i * 10,
        avgBuyPrice: 1000,
        avgSellPrice: 1010,
        lastSellTime: `2025-01-03T0${i % 10}:00:00Z`,
      })),
    };
    const res = getOptimalQuantityRange('Dragon bones', base);
    expect(res).toHaveProperty('range');
    expect(res).toHaveProperty('correlation');
    expect(Array.isArray(res.byBin)).toBe(true);
  });
});

