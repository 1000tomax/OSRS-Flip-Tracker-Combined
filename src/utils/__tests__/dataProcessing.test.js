import {
  getItemFlips,
  calculateItemDeepMetrics,
  getItemTimePatterns,
  calculateItemRisk,
  getOptimalQuantityRange,
} from '../dataProcessing';

// Helper function to create flip data
function createFlip(overrides = {}) {
  return {
    item: 'Dragon bones',
    profit: 1000,
    quantity: 100,
    avgBuyPrice: 1000,
    avgSellPrice: 1100,
    firstBuyTime: '2025-01-01T10:00:00Z',
    lastSellTime: '2025-01-01T11:00:00Z',
    ...overrides,
  };
}

function buildFlipsByDate() {
  return {
    '01-01-2025': {
      flips: [
        createFlip({
          profit: 1000,
          quantity: 100,
          avgBuyPrice: 1000,
          avgSellPrice: 1100,
          firstBuyTime: '2025-01-01T10:00:00Z',
          lastSellTime: '2025-01-01T11:00:00Z',
        }),
        createFlip({
          profit: -200,
          quantity: 50,
          avgBuyPrice: 1200,
          avgSellPrice: 1180,
          firstBuyTime: '2025-01-01T12:00:00Z',
          lastSellTime: '2025-01-01T16:00:00Z',
        }),
      ],
    },
    '01-02-2025': {
      flips: [
        createFlip({
          profit: 300,
          quantity: 30,
          avgBuyPrice: 1500,
          avgSellPrice: 1510,
          firstBuyTime: '2025-01-02T02:00:00Z',
          lastSellTime: '2025-01-02T03:00:00Z',
        }),
        createFlip({
          item: 'Shark',
          profit: 500,
          quantity: 100,
          avgBuyPrice: 700,
          avgSellPrice: 710,
          firstBuyTime: '2025-01-02T04:00:00Z',
          lastSellTime: '2025-01-02T05:00:00Z',
        }),
      ],
    },
  };
}

describe('getItemFlips', () => {
  it('should return normalized, time-sorted flips for an item', () => {
    const flipsByDate = buildFlipsByDate();
    const flips = getItemFlips('Dragon bones', flipsByDate);

    expect(flips).toHaveLength(3);

    // Verify ascending sort by timestamp
    const times = flips.map(f => f.tsMs);
    expect(times.slice().sort((a, b) => a - b)).toEqual(times);

    // Verify normalized fields
    expect(flips[0]).toHaveProperty('avgBuyPrice');
    expect(flips[0]).toHaveProperty('avgSellPrice');
    expect(flips[0]).toHaveProperty('marginPct');
    expect(flips[0]).toHaveProperty('roi');
    expect(flips[0]).toHaveProperty('durationMin');
  });

  it('should handle case-insensitive item name matching', () => {
    const flipsByDate = buildFlipsByDate();

    expect(getItemFlips('dragon bones', flipsByDate)).toHaveLength(3);
    expect(getItemFlips('DRAGON BONES', flipsByDate)).toHaveLength(3);
    expect(getItemFlips('DrAgOn BoNeS', flipsByDate)).toHaveLength(3);
  });

  it('should handle array format (legacy format)', () => {
    const flipsByDate = {
      '01-01-2025': [createFlip({ profit: 100 }), createFlip({ profit: 200 })],
    };

    const flips = getItemFlips('Dragon bones', flipsByDate);
    expect(flips).toHaveLength(2);
  });

  it('should handle object format with flips property', () => {
    const flipsByDate = {
      '01-01-2025': {
        flips: [createFlip({ profit: 100 })],
      },
    };

    const flips = getItemFlips('Dragon bones', flipsByDate);
    expect(flips).toHaveLength(1);
  });

  it('should handle alternative field names', () => {
    const flipsByDate = {
      '01-01-2025': {
        flips: [
          {
            item_name: 'Dragon bones',
            avg_buy_price: 1000,
            avg_sell_price: 1100,
            bought: 50,
            sold: 45,
            profit: 100,
            sellerTax: 10,
            first_buy_time: '2025-01-01T10:00:00Z',
            last_sell_time: '2025-01-01T11:00:00Z',
          },
        ],
      },
    };

    const flips = getItemFlips('Dragon bones', flipsByDate);
    expect(flips).toHaveLength(1);
    expect(flips[0].avgBuyPrice).toBe(1000);
    expect(flips[0].avgSellPrice).toBe(1100);
    expect(flips[0].tax).toBe(10);
  });

  it('should calculate ROI and margin correctly', () => {
    const flipsByDate = {
      '01-01-2025': {
        flips: [
          createFlip({
            avgBuyPrice: 1000,
            avgSellPrice: 1200,
          }),
        ],
      },
    };

    const flips = getItemFlips('Dragon bones', flipsByDate);
    expect(flips[0].roi).toBeCloseTo(0.2, 5); // (1200-1000)/1000 = 0.2
    expect(flips[0].marginPct).toBeCloseTo(20, 5); // 20%
  });

  it('should calculate duration in minutes correctly', () => {
    const flipsByDate = {
      '01-01-2025': {
        flips: [
          createFlip({
            firstBuyTime: '2025-01-01T10:00:00Z',
            lastSellTime: '2025-01-01T12:30:00Z',
          }),
        ],
      },
    };

    const flips = getItemFlips('Dragon bones', flipsByDate);
    expect(flips[0].durationMin).toBe(150); // 2.5 hours = 150 minutes
  });

  it('should handle zero buy price for ROI calculation', () => {
    const flipsByDate = {
      '01-01-2025': {
        flips: [
          createFlip({
            avgBuyPrice: 0,
            avgSellPrice: 100,
          }),
        ],
      },
    };

    const flips = getItemFlips('Dragon bones', flipsByDate);
    expect(flips[0].roi).toBeNull();
    expect(flips[0].marginPct).toBeNull();
  });

  it('should handle missing timestamps', () => {
    const flipsByDate = {
      '01-01-2025': {
        flips: [
          createFlip({
            firstBuyTime: null,
            lastSellTime: null,
          }),
        ],
      },
    };

    const flips = getItemFlips('Dragon bones', flipsByDate);
    expect(flips[0].ts).toBeNull();
    expect(flips[0].durationMin).toBeNull();
  });

  it('should return empty array for non-existent item', () => {
    const flipsByDate = buildFlipsByDate();
    expect(getItemFlips('Non-existent item', flipsByDate)).toEqual([]);
  });

  it('should return empty array for null flipsByDate', () => {
    expect(getItemFlips('Dragon bones', null)).toEqual([]);
  });

  it('should return empty array for undefined flipsByDate', () => {
    expect(getItemFlips('Dragon bones', undefined)).toEqual([]);
  });

  it('should return empty array for null item name', () => {
    expect(getItemFlips(null, buildFlipsByDate())).toEqual([]);
  });

  it('should handle negative durations gracefully', () => {
    const flipsByDate = {
      '01-01-2025': {
        flips: [
          createFlip({
            firstBuyTime: '2025-01-01T12:00:00Z',
            lastSellTime: '2025-01-01T10:00:00Z', // Earlier than start
          }),
        ],
      },
    };

    const flips = getItemFlips('Dragon bones', flipsByDate);
    expect(flips[0].durationMin).toBe(0); // Math.max(0, ...)
  });
});

describe('calculateItemDeepMetrics', () => {
  it('should compute individual and cumulative series', () => {
    const flipsByDate = buildFlipsByDate();
    const deep = calculateItemDeepMetrics('Dragon bones', flipsByDate);

    expect(deep.flips).toHaveLength(3);
    expect(deep.individualSeries).toHaveLength(3);
    expect(deep.cumulativeSeries).toHaveLength(3);

    // Individual series should have profit values
    expect(deep.individualSeries[0]).toHaveProperty('profit');
    expect(deep.individualSeries[0]).toHaveProperty('x');
    expect(deep.individualSeries[0]).toHaveProperty('tsMs');

    // Cumulative series should accumulate
    expect(deep.cumulativeSeries[0].cumulativeProfit).toBe(1000);
    expect(deep.cumulativeSeries[1].cumulativeProfit).toBe(800); // 1000 - 200
    expect(deep.cumulativeSeries[2].cumulativeProfit).toBe(1100); // 800 + 300
  });

  it('should calculate wins and losses correctly', () => {
    const flipsByDate = buildFlipsByDate();
    const deep = calculateItemDeepMetrics('Dragon bones', flipsByDate);

    expect(deep.totals.wins).toBe(2); // 1000, 300
    expect(deep.totals.losses).toBe(1); // -200
  });

  it('should calculate success rate as wins/(wins+losses)*100', () => {
    const flipsByDate = buildFlipsByDate();
    const deep = calculateItemDeepMetrics('Dragon bones', flipsByDate);

    // 2 wins, 1 loss => 2/3 * 100 = 66.666...
    expect(Math.round(deep.totals.successRate)).toBe(67);
  });

  it('should track best and worst flips', () => {
    const flipsByDate = buildFlipsByDate();
    const deep = calculateItemDeepMetrics('Dragon bones', flipsByDate);

    expect(deep.totals.bestFlip.profit).toBe(1000);
    expect(deep.totals.worstFlip.profit).toBe(-200);
  });

  it('should calculate total profit correctly', () => {
    const flipsByDate = buildFlipsByDate();
    const deep = calculateItemDeepMetrics('Dragon bones', flipsByDate);

    expect(deep.totals.totalProfit).toBe(1100); // 1000 - 200 + 300
  });

  it('should calculate average profit correctly', () => {
    const flipsByDate = buildFlipsByDate();
    const deep = calculateItemDeepMetrics('Dragon bones', flipsByDate);

    expect(deep.totals.avgProfit).toBeCloseTo(1100 / 3, 5);
  });

  it('should handle zero profit flips', () => {
    const flipsByDate = {
      '01-01-2025': {
        flips: [createFlip({ profit: 0 }), createFlip({ profit: 0 })],
      },
    };

    const deep = calculateItemDeepMetrics('Dragon bones', flipsByDate);

    expect(deep.totals.wins).toBe(0);
    expect(deep.totals.losses).toBe(0);
    expect(deep.totals.totalProfit).toBe(0);
  });

  it('should handle empty flips', () => {
    const deep = calculateItemDeepMetrics('Non-existent', buildFlipsByDate());

    expect(deep.flips).toEqual([]);
    expect(deep.individualSeries).toEqual([]);
    expect(deep.cumulativeSeries).toEqual([]);
    expect(deep.totals.totalProfit).toBe(0);
    expect(deep.totals.flipCount).toBe(0);
    expect(deep.totals.wins).toBe(0);
    expect(deep.totals.losses).toBe(0);
    expect(deep.totals.avgProfit).toBe(0);
    expect(deep.totals.bestFlip).toBeNull();
    expect(deep.totals.worstFlip).toBeNull();
  });

  it('should calculate success rate correctly with only wins', () => {
    const flipsByDate = {
      '01-01-2025': {
        flips: [createFlip({ profit: 100 }), createFlip({ profit: 200 })],
      },
    };

    const deep = calculateItemDeepMetrics('Dragon bones', flipsByDate);

    expect(deep.totals.successRate).toBe(100);
  });

  it('should calculate success rate correctly with only losses', () => {
    const flipsByDate = {
      '01-01-2025': {
        flips: [createFlip({ profit: -100 }), createFlip({ profit: -200 })],
      },
    };

    const deep = calculateItemDeepMetrics('Dragon bones', flipsByDate);

    expect(deep.totals.successRate).toBe(0);
  });

  it('should handle mixed wins, losses, and zero-profit flips', () => {
    const flipsByDate = {
      '01-01-2025': {
        flips: [
          createFlip({ profit: 100 }),
          createFlip({ profit: 0 }),
          createFlip({ profit: -50 }),
          createFlip({ profit: 0 }),
          createFlip({ profit: 200 }),
        ],
      },
    };

    const deep = calculateItemDeepMetrics('Dragon bones', flipsByDate);

    expect(deep.totals.wins).toBe(2);
    expect(deep.totals.losses).toBe(1);
    expect(deep.totals.flipCount).toBe(5);
    // Success rate = 2 / (2 + 1) * 100 = 66.666...
    expect(Math.round(deep.totals.successRate)).toBe(67);
  });
});

describe('getItemTimePatterns', () => {
  it('should create 7x24 grid of day/hour cells', () => {
    const flipsByDate = buildFlipsByDate();
    const cells = getItemTimePatterns('Dragon bones', flipsByDate);

    expect(cells).toHaveLength(7 * 24); // 168 cells
  });

  it('should aggregate flips by day and hour', () => {
    const flipsByDate = {
      '01-01-2025': {
        flips: [
          createFlip({
            profit: 100,
            lastSellTime: '2025-01-01T10:00:00Z', // Thursday, 10:00 UTC
          }),
          createFlip({
            profit: 200,
            lastSellTime: '2025-01-01T10:30:00Z', // Same hour
          }),
        ],
      },
    };

    const cells = getItemTimePatterns('Dragon bones', flipsByDate);

    const date = new Date('2025-01-01T10:00:00Z');
    const day = date.getDay();
    const hour = date.getHours();

    const cell = cells.find(c => c.day === day && c.hour === hour);

    expect(cell.flips).toBe(2);
    expect(cell.profit).toBe(300);
    expect(cell.avgProfit).toBe(150);
  });

  it('should calculate average profit correctly for each cell', () => {
    const flipsByDate = {
      '01-01-2025': {
        flips: [
          createFlip({
            profit: 100,
            lastSellTime: '2025-01-01T10:00:00Z',
          }),
          createFlip({
            profit: 300,
            lastSellTime: '2025-01-01T10:30:00Z',
          }),
        ],
      },
    };

    const cells = getItemTimePatterns('Dragon bones', flipsByDate);

    const date = new Date('2025-01-01T10:00:00Z');
    const day = date.getDay();
    const hour = date.getHours();

    const cell = cells.find(c => c.day === day && c.hour === hour);

    expect(cell.avgProfit).toBe(200); // (100 + 300) / 2
  });

  it('should handle cells with no flips', () => {
    const flipsByDate = {
      '01-01-2025': {
        flips: [
          createFlip({
            profit: 100,
            lastSellTime: '2025-01-01T10:00:00Z',
          }),
        ],
      },
    };

    const cells = getItemTimePatterns('Dragon bones', flipsByDate);

    const emptyCell = cells.find(c => c.day === 0 && c.hour === 0);

    expect(emptyCell.flips).toBe(0);
    expect(emptyCell.profit).toBe(0);
    expect(emptyCell.avgProfit).toBe(0);
  });

  it('should skip flips without timestamps', () => {
    const flipsByDate = {
      '01-01-2025': {
        flips: [
          createFlip({
            profit: 100,
            firstBuyTime: null,
            lastSellTime: null,
          }),
        ],
      },
    };

    const cells = getItemTimePatterns('Dragon bones', flipsByDate);

    const totalFlips = cells.reduce((sum, c) => sum + c.flips, 0);
    expect(totalFlips).toBe(0);
  });

  it('should return empty grid for empty item', () => {
    const cells = getItemTimePatterns('Non-existent', buildFlipsByDate());

    expect(cells).toHaveLength(168);
    expect(cells.every(c => c.flips === 0)).toBe(true);
  });
});

describe('calculateItemRisk', () => {
  it('should calculate volatility (standard deviation)', () => {
    const flipsByDate = {
      '01-01-2025': {
        flips: [
          createFlip({ profit: 100 }),
          createFlip({ profit: 200 }),
          createFlip({ profit: 300 }),
        ],
      },
    };

    const risk = calculateItemRisk('Dragon bones', flipsByDate);

    // Variance = ((100-200)^2 + (200-200)^2 + (300-200)^2) / 3 = 20000/3
    // Stddev = sqrt(20000/3) ≈ 81.65
    expect(risk.volatility).toBeCloseTo(81.65, 1);
  });

  it('should calculate longest win streak', () => {
    const flipsByDate = {
      '01-01-2025': {
        flips: [
          createFlip({ profit: 100 }),
          createFlip({ profit: 200 }),
          createFlip({ profit: 300 }),
          createFlip({ profit: -50 }),
          createFlip({ profit: 100 }),
        ],
      },
    };

    const risk = calculateItemRisk('Dragon bones', flipsByDate);

    expect(risk.longestWinStreak).toBe(3);
  });

  it('should calculate longest loss streak', () => {
    const flipsByDate = {
      '01-01-2025': {
        flips: [
          createFlip({ profit: 100 }),
          createFlip({ profit: -50 }),
          createFlip({ profit: -100 }),
          createFlip({ profit: -75 }),
          createFlip({ profit: 200 }),
        ],
      },
    };

    const risk = calculateItemRisk('Dragon bones', flipsByDate);

    expect(risk.longestLossStreak).toBe(3);
  });

  it('should handle zero profit flips in streaks', () => {
    const flipsByDate = {
      '01-01-2025': {
        flips: [
          createFlip({ profit: 100 }),
          createFlip({ profit: 0 }),
          createFlip({ profit: 200 }),
        ],
      },
    };

    const risk = calculateItemRisk('Dragon bones', flipsByDate);

    // Zero profit breaks streak
    expect(risk.longestWinStreak).toBe(1);
  });

  it('should calculate max drawdown', () => {
    const flipsByDate = {
      '01-01-2025': {
        flips: [
          createFlip({ profit: 100 }), // equity: 100
          createFlip({ profit: 200 }), // equity: 300
          createFlip({ profit: -150 }), // equity: 150
          createFlip({ profit: -100 }), // equity: 50 (drawdown from 300 to 50 = -250)
          createFlip({ profit: 400 }), // equity: 450
        ],
      },
    };

    const risk = calculateItemRisk('Dragon bones', flipsByDate);

    expect(risk.maxDrawdown).toBe(-250);
  });

  it('should return zero metrics for empty flips', () => {
    const risk = calculateItemRisk('Non-existent', buildFlipsByDate());

    expect(risk.volatility).toBe(0);
    expect(risk.longestWinStreak).toBe(0);
    expect(risk.longestLossStreak).toBe(0);
    expect(risk.maxDrawdown).toBe(0);
    expect(risk.timeToRecoverAvgMin).toBeNull();
  });

  it('should calculate time to recover average', () => {
    const flipsByDate = {
      '01-01-2025': {
        flips: [
          createFlip({
            profit: 100,
            lastSellTime: '2025-01-01T10:00:00Z',
          }),
          createFlip({
            profit: -50,
            lastSellTime: '2025-01-01T11:00:00Z',
          }),
          createFlip({
            profit: 200,
            lastSellTime: '2025-01-01T13:00:00Z', // 3 hours from peak
          }),
        ],
      },
    };

    const risk = calculateItemRisk('Dragon bones', flipsByDate);

    expect(risk.timeToRecoverAvgMin).toBeGreaterThan(0);
  });

  it('should handle all positive profits', () => {
    const flipsByDate = {
      '01-01-2025': {
        flips: [
          createFlip({ profit: 100 }),
          createFlip({ profit: 200 }),
          createFlip({ profit: 300 }),
        ],
      },
    };

    const risk = calculateItemRisk('Dragon bones', flipsByDate);

    expect(risk.longestWinStreak).toBe(3);
    expect(risk.longestLossStreak).toBe(0);
    expect(risk.maxDrawdown).toBe(0);
  });

  it('should handle all negative profits', () => {
    const flipsByDate = {
      '01-01-2025': {
        flips: [
          createFlip({ profit: -100 }),
          createFlip({ profit: -200 }),
          createFlip({ profit: -300 }),
        ],
      },
    };

    const risk = calculateItemRisk('Dragon bones', flipsByDate);

    expect(risk.longestWinStreak).toBe(0);
    expect(risk.longestLossStreak).toBe(3);
    expect(risk.maxDrawdown).toBeLessThan(0);
  });
});

describe('getOptimalQuantityRange', () => {
  it('should bin flips by quantity with bin size 50', () => {
    const flipsByDate = {
      '01-01-2025': {
        flips: Array.from({ length: 10 }, (_, i) =>
          createFlip({
            quantity: 25 + i * 10,
            profit: 100,
          })
        ),
      },
    };

    const res = getOptimalQuantityRange('Dragon bones', flipsByDate);

    expect(res.byBin.length).toBeGreaterThan(0);
    expect(res.byBin[0]).toHaveProperty('from');
    expect(res.byBin[0]).toHaveProperty('to');
    expect(res.byBin[0]).toHaveProperty('count');
    expect(res.byBin[0]).toHaveProperty('avgProfit');
  });

  it('should find optimal range with minimum sample size', () => {
    const flipsByDate = {
      '01-01-2025': {
        flips: [
          ...Array.from({ length: 5 }, () => createFlip({ quantity: 25, profit: 500 })),
          ...Array.from({ length: 3 }, () => createFlip({ quantity: 75, profit: 100 })),
        ],
      },
    };

    const res = getOptimalQuantityRange('Dragon bones', flipsByDate);

    // Best bin should be quantity 0-49 (avg profit 500)
    expect(res.range).toBeTruthy();
    expect(res.range.avgProfit).toBe(500);
  });

  it('should calculate Pearson correlation between quantity and profit', () => {
    const flipsByDate = {
      '01-01-2025': {
        flips: [
          createFlip({ quantity: 10, profit: 100 }),
          createFlip({ quantity: 20, profit: 200 }),
          createFlip({ quantity: 30, profit: 300 }),
          createFlip({ quantity: 40, profit: 400 }),
        ],
      },
    };

    const res = getOptimalQuantityRange('Dragon bones', flipsByDate);

    // Perfect positive correlation
    expect(res.correlation).toBeCloseTo(1, 1);
  });

  it('should handle negative correlation', () => {
    const flipsByDate = {
      '01-01-2025': {
        flips: [
          createFlip({ quantity: 10, profit: 400 }),
          createFlip({ quantity: 20, profit: 300 }),
          createFlip({ quantity: 30, profit: 200 }),
          createFlip({ quantity: 40, profit: 100 }),
        ],
      },
    };

    const res = getOptimalQuantityRange('Dragon bones', flipsByDate);

    // Perfect negative correlation
    expect(res.correlation).toBeCloseTo(-1, 1);
  });

  it('should return null range if no bins meet minimum samples', () => {
    const flipsByDate = {
      '01-01-2025': {
        flips: [
          createFlip({ quantity: 10, profit: 100 }),
          createFlip({ quantity: 60, profit: 200 }),
        ],
      },
    };

    const res = getOptimalQuantityRange('Dragon bones', flipsByDate);

    expect(res.range).toBeNull();
  });

  it('should handle empty flips', () => {
    const res = getOptimalQuantityRange('Non-existent', buildFlipsByDate());

    expect(res.range).toBeNull();
    expect(res.correlation).toBe(0);
    expect(res.byBin).toEqual([]);
  });

  it('should handle zero correlation (no relationship)', () => {
    const flipsByDate = {
      '01-01-2025': {
        flips: [
          createFlip({ quantity: 10, profit: 200 }),
          createFlip({ quantity: 20, profit: 100 }),
          createFlip({ quantity: 30, profit: 300 }),
          createFlip({ quantity: 40, profit: 100 }),
        ],
      },
    };

    const res = getOptimalQuantityRange('Dragon bones', flipsByDate);

    expect(res.correlation).toBeLessThan(0.5);
    expect(res.correlation).toBeGreaterThan(-0.5);
  });

  it('should handle single flip', () => {
    const flipsByDate = {
      '01-01-2025': {
        flips: [createFlip({ quantity: 50, profit: 100 })],
      },
    };

    const res = getOptimalQuantityRange('Dragon bones', flipsByDate);

    expect(res.byBin).toHaveLength(1);
    expect(res.range).toBeNull(); // Only 1 sample, needs MIN_SAMPLES (5)
  });

  it('should handle all flips in same quantity bin', () => {
    const flipsByDate = {
      '01-01-2025': {
        flips: Array.from({ length: 10 }, () =>
          createFlip({
            quantity: 25,
            profit: 100,
          })
        ),
      },
    };

    const res = getOptimalQuantityRange('Dragon bones', flipsByDate);

    expect(res.byBin).toHaveLength(1);
    expect(res.range).toBeTruthy();
    expect(res.range.from).toBe(0);
    expect(res.range.to).toBe(49);
  });
});
