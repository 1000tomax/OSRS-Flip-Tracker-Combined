import { evaluateFilterRules, generateProfileNameFromRules } from '../filterRuleEvaluator';

describe('filterRuleEvaluator', () => {
  // Mock item data
  const mockItems = [
    { id: 1, name: 'Bronze sword', members: false },
    { id: 2, name: 'Rune scimitar', members: false },
    { id: 3, name: 'Abyssal whip', members: true },
    { id: 4, name: 'Dragon claws', members: true },
    { id: 5, name: 'Party hat', members: false },
  ];

  // Mock price data
  const mockPriceData = {
    '1': { high: 500, low: 400 },
    '2': { high: 15000, low: 14500 },
    '3': { high: 1500000, low: 1450000 },
    '4': { high: 50000000, low: 49500000 },
    '5': { high: 2000000000, low: 1950000000 },
  };

  // Mock volume data
  const mockVolumeData = {
    '1': { highPriceVolume: 1000, lowPriceVolume: 1200 },
    '2': { highPriceVolume: 5000, lowPriceVolume: 4800 },
    '3': { highPriceVolume: 800, lowPriceVolume: 750 },
    '4': { highPriceVolume: 50, lowPriceVolume: 45 },
    '5': { highPriceVolume: 5, lowPriceVolume: 3 },
  };

  describe('evaluateFilterRules', () => {
    describe('price filtering', () => {
      it('should include items below price threshold', () => {
        const filterConfig = {
          rules: [
            {
              type: 'include',
              conditions: [{ field: 'price', operator: 'lt', value: 20000 }],
            },
          ],
          defaultAction: 'exclude',
          interpretation: 'Items under 20k',
        };

        const result = evaluateFilterRules(filterConfig, mockItems, mockPriceData);

        expect(result.tradeable).toHaveLength(2);
        expect(result.tradeable.map(i => i.id)).toEqual(expect.arrayContaining([1, 2]));
        expect(result.stats.tradeableCount).toBe(2);
        expect(result.stats.blockedCount).toBe(3);
      });

      it('should exclude items above price threshold', () => {
        const filterConfig = {
          rules: [
            {
              type: 'exclude',
              conditions: [{ field: 'price', operator: 'gt', value: 100000000 }],
            },
          ],
          defaultAction: 'include',
          interpretation: 'Exclude items over 100m',
        };

        const result = evaluateFilterRules(filterConfig, mockItems, mockPriceData);

        expect(result.tradeable).toHaveLength(4);
        expect(result.tradeable.map(i => i.id)).not.toContain(5);
      });

      it('should filter items in price range using between operator', () => {
        const filterConfig = {
          rules: [
            {
              type: 'include',
              conditions: [{ field: 'price', operator: 'between', value: [1000000, 10000000] }],
            },
          ],
          defaultAction: 'exclude',
          interpretation: 'Items between 1m and 10m',
        };

        const result = evaluateFilterRules(filterConfig, mockItems, mockPriceData);

        expect(result.tradeable).toHaveLength(1);
        expect(result.tradeable[0].id).toBe(3);
      });

      it('should handle gte and lte operators correctly', () => {
        const filterConfig = {
          rules: [
            {
              type: 'include',
              conditions: [
                { field: 'price', operator: 'gte', value: 15000 },
                { field: 'price', operator: 'lte', value: 1500000 },
              ],
            },
          ],
          defaultAction: 'exclude',
          interpretation: 'Items 15k-1.5m',
        };

        const result = evaluateFilterRules(filterConfig, mockItems, mockPriceData);

        expect(result.tradeable).toHaveLength(2);
        expect(result.tradeable.map(i => i.id)).toEqual(expect.arrayContaining([2, 3]));
      });
    });

    describe('volume filtering', () => {
      it('should filter items by high volume', () => {
        const filterConfig = {
          rules: [
            {
              type: 'include',
              conditions: [{ field: 'volume', operator: 'gt', value: 5000 }],
            },
          ],
          defaultAction: 'exclude',
          interpretation: 'High volume items',
        };

        const result = evaluateFilterRules(filterConfig, mockItems, mockPriceData, mockVolumeData);

        // Item 1: 1000 + 1200 = 2200 (excluded)
        // Item 2: 5000 + 4800 = 9800 (included)
        expect(result.tradeable).toHaveLength(1);
        expect(result.tradeable.map(i => i.id)).toEqual([2]);
      });

      it('should filter items by low volume', () => {
        const filterConfig = {
          rules: [
            {
              type: 'include',
              conditions: [{ field: 'volume', operator: 'lt', value: 200 }],
            },
          ],
          defaultAction: 'exclude',
          interpretation: 'Low volume items',
        };

        const result = evaluateFilterRules(filterConfig, mockItems, mockPriceData, mockVolumeData);

        expect(result.tradeable).toHaveLength(2);
        expect(result.tradeable.map(i => i.id)).toEqual(expect.arrayContaining([4, 5]));
      });

      it('should handle missing volume data gracefully', () => {
        const filterConfig = {
          rules: [
            {
              type: 'include',
              conditions: [{ field: 'volume', operator: 'gt', value: 100 }],
            },
          ],
          defaultAction: 'exclude',
          interpretation: 'High volume items',
        };

        // No volume data provided
        const result = evaluateFilterRules(filterConfig, mockItems, mockPriceData, null);

        // Should treat all items as 0 volume
        expect(result.tradeable).toHaveLength(0);
      });
    });

    describe('f2p/members filtering', () => {
      it('should filter F2P items only', () => {
        const filterConfig = {
          rules: [
            {
              type: 'include',
              conditions: [{ field: 'f2p', operator: 'eq', value: true }],
            },
          ],
          defaultAction: 'exclude',
          interpretation: 'F2P items only',
        };

        const result = evaluateFilterRules(filterConfig, mockItems, mockPriceData);

        expect(result.tradeable).toHaveLength(3);
        expect(result.tradeable.every(i => !i.members)).toBe(true);
      });

      it('should filter members items only', () => {
        const filterConfig = {
          rules: [
            {
              type: 'include',
              conditions: [{ field: 'members', operator: 'eq', value: true }],
            },
          ],
          defaultAction: 'exclude',
          interpretation: 'Members items only',
        };

        const result = evaluateFilterRules(filterConfig, mockItems, mockPriceData);

        expect(result.tradeable).toHaveLength(2);
        expect(result.tradeable.every(i => i.members)).toBe(true);
      });
    });

    describe('complex multi-condition rules', () => {
      it('should handle AND conditions within a rule', () => {
        const filterConfig = {
          rules: [
            {
              type: 'include',
              conditions: [
                { field: 'price', operator: 'gte', value: 10000 },
                { field: 'price', operator: 'lte', value: 2000000 },
                { field: 'members', operator: 'eq', value: true },
              ],
            },
          ],
          defaultAction: 'exclude',
          interpretation: 'Members items 10k-2m',
        };

        const result = evaluateFilterRules(filterConfig, mockItems, mockPriceData);

        expect(result.tradeable).toHaveLength(1);
        expect(result.tradeable[0].id).toBe(3);
      });

      it('should handle multiple rules (OR logic between rules)', () => {
        const filterConfig = {
          rules: [
            {
              type: 'include',
              conditions: [{ field: 'price', operator: 'lt', value: 1000 }],
            },
            {
              type: 'include',
              conditions: [{ field: 'price', operator: 'gt', value: 100000000 }],
            },
          ],
          defaultAction: 'exclude',
          interpretation: 'Very cheap or very expensive items',
        };

        const result = evaluateFilterRules(filterConfig, mockItems, mockPriceData);

        expect(result.tradeable).toHaveLength(2);
        expect(result.tradeable.map(i => i.id)).toEqual(expect.arrayContaining([1, 5]));
      });

      it('should combine price, volume, and membership filters', () => {
        const filterConfig = {
          rules: [
            {
              type: 'include',
              conditions: [
                { field: 'price', operator: 'between', value: [10000, 2000000] },
                { field: 'volume', operator: 'gt', value: 1000 },
                { field: 'f2p', operator: 'eq', value: true },
              ],
            },
          ],
          defaultAction: 'exclude',
          interpretation: 'F2P items 10k-2m with high volume',
        };

        const result = evaluateFilterRules(filterConfig, mockItems, mockPriceData, mockVolumeData);

        expect(result.tradeable).toHaveLength(1);
        expect(result.tradeable[0].id).toBe(2);
      });
    });

    describe('default action behavior', () => {
      it('should include all items with valid prices when no rules match and defaultAction is include', () => {
        const filterConfig = {
          rules: [
            {
              type: 'include',
              conditions: [{ field: 'price', operator: 'lt', value: 1 }],
            },
          ],
          defaultAction: 'include',
          interpretation: 'Include all by default',
        };

        const result = evaluateFilterRules(filterConfig, mockItems, mockPriceData);

        expect(result.tradeable).toHaveLength(5);
      });

      it('should exclude all items when no rules match and defaultAction is exclude', () => {
        const filterConfig = {
          rules: [
            {
              type: 'include',
              conditions: [{ field: 'price', operator: 'lt', value: 1 }],
            },
          ],
          defaultAction: 'exclude',
          interpretation: 'Exclude all by default',
        };

        const result = evaluateFilterRules(filterConfig, mockItems, mockPriceData);

        expect(result.tradeable).toHaveLength(0);
      });
    });

    describe('edge cases', () => {
      it('should skip items without price data', () => {
        const itemsWithMissingPrice = [
          ...mockItems,
          { id: 6, name: 'Unknown item', members: false },
        ];

        const filterConfig = {
          rules: [],
          defaultAction: 'include',
          interpretation: 'All items',
        };

        const result = evaluateFilterRules(filterConfig, itemsWithMissingPrice, mockPriceData);

        expect(result.tradeable).toHaveLength(5);
        expect(result.stats.itemsWithoutPriceData).toBe(1);
      });

      it('should skip items with null or zero prices', () => {
        const priceDataWithInvalid = {
          ...mockPriceData,
          '6': { high: null, low: 100 },
          '7': { high: 0, low: 0 },
        };

        const itemsWithInvalidPrice = [
          ...mockItems,
          { id: 6, name: 'Null price', members: false },
          { id: 7, name: 'Zero price', members: false },
        ];

        const filterConfig = {
          rules: [],
          defaultAction: 'include',
          interpretation: 'All items',
        };

        const result = evaluateFilterRules(
          filterConfig,
          itemsWithInvalidPrice,
          priceDataWithInvalid
        );

        expect(result.tradeable).toHaveLength(5);
      });

      it('should handle empty items array', () => {
        const filterConfig = {
          rules: [
            {
              type: 'include',
              conditions: [{ field: 'price', operator: 'gt', value: 1000 }],
            },
          ],
          defaultAction: 'exclude',
          interpretation: 'Empty items',
        };

        const result = evaluateFilterRules(filterConfig, [], mockPriceData);

        expect(result.tradeable).toHaveLength(0);
        expect(result.blocked).toHaveLength(0);
        expect(result.stats.totalItems).toBe(0);
      });

      it('should handle unknown field types', () => {
        const filterConfig = {
          rules: [
            {
              type: 'include',
              conditions: [{ field: 'unknownField', operator: 'eq', value: 'test' }],
            },
          ],
          defaultAction: 'exclude',
          interpretation: 'Unknown field test',
        };

        const result = evaluateFilterRules(filterConfig, mockItems, mockPriceData);

        expect(result.tradeable).toHaveLength(0);
      });

      it('should handle unknown operators', () => {
        const filterConfig = {
          rules: [
            {
              type: 'include',
              conditions: [{ field: 'price', operator: 'unknownOp', value: 1000 }],
            },
          ],
          defaultAction: 'exclude',
          interpretation: 'Unknown operator test',
        };

        const result = evaluateFilterRules(filterConfig, mockItems, mockPriceData);

        expect(result.tradeable).toHaveLength(0);
      });
    });

    describe('blocked list generation', () => {
      it('should generate correct blocked list', () => {
        const filterConfig = {
          rules: [
            {
              type: 'include',
              conditions: [{ field: 'price', operator: 'lt', value: 20000 }],
            },
          ],
          defaultAction: 'exclude',
          interpretation: 'Items under 20k',
        };

        const result = evaluateFilterRules(filterConfig, mockItems, mockPriceData);

        expect(result.blocked).toHaveLength(3);
        expect(result.blocked).toEqual(expect.arrayContaining([3, 4, 5]));
      });

      it('should return array of IDs for blocked items', () => {
        const filterConfig = {
          rules: [
            {
              type: 'include',
              conditions: [{ field: 'f2p', operator: 'eq', value: true }],
            },
          ],
          defaultAction: 'exclude',
          interpretation: 'F2P only',
        };

        const result = evaluateFilterRules(filterConfig, mockItems, mockPriceData);

        expect(result.blocked).toEqual([3, 4]);
        expect(result.blocked.every(id => typeof id === 'number')).toBe(true);
      });
    });

    describe('statistics generation', () => {
      it('should calculate correct statistics', () => {
        const filterConfig = {
          rules: [
            {
              type: 'include',
              conditions: [{ field: 'price', operator: 'between', value: [1000, 2000000] }],
            },
          ],
          defaultAction: 'exclude',
          interpretation: 'Mid-range items',
        };

        const result = evaluateFilterRules(filterConfig, mockItems, mockPriceData);

        expect(result.stats.tradeableCount).toBe(2);
        expect(result.stats.blockedCount).toBe(3);
        expect(result.stats.totalItems).toBe(5);
        expect(result.stats.itemsWithoutPriceData).toBe(0);
      });
    });

    describe('interpretation passthrough', () => {
      it('should return interpretation from config', () => {
        const interpretation = 'Custom filter interpretation';
        const filterConfig = {
          rules: [],
          defaultAction: 'include',
          interpretation,
        };

        const result = evaluateFilterRules(filterConfig, mockItems, mockPriceData);

        expect(result.interpretation).toBe(interpretation);
      });
    });
  });

  describe('generateProfileNameFromRules', () => {
    it('should extract price range from interpretation', () => {
      const filterConfig = {
        interpretation: 'Items between 100k and 5m with high volume',
      };

      const name = generateProfileNameFromRules(filterConfig);

      expect(name).toContain('100k');
      expect(name).toContain('5m');
    });

    it('should identify F2P in interpretation', () => {
      const filterConfig = {
        interpretation: 'F2P items under 1 million gp',
      };

      const name = generateProfileNameFromRules(filterConfig);

      expect(name).toContain('F2P');
    });

    it('should identify Members in interpretation', () => {
      const filterConfig = {
        interpretation: 'Members-only items between 1m and 10m',
      };

      const name = generateProfileNameFromRules(filterConfig);

      expect(name).toContain('Members');
    });

    it('should identify volume mentions', () => {
      const filterConfig = {
        interpretation: 'High volume items with good margins',
      };

      const name = generateProfileNameFromRules(filterConfig);

      expect(name).toContain('High Vol');
    });

    it('should combine multiple extracted terms', () => {
      const filterConfig = {
        interpretation: 'F2P items between 100k and 1m with high volume',
      };

      const name = generateProfileNameFromRules(filterConfig);

      expect(name).toContain('100k');
      expect(name).toContain('1m');
      expect(name).toContain('F2P');
      expect(name).toContain('High Vol');
    });

    it('should fallback to first words of interpretation if no patterns match', () => {
      const filterConfig = {
        interpretation: 'Custom complex filter with special requirements',
      };

      const name = generateProfileNameFromRules(filterConfig);

      // Takes up to 8 words, which gives us the full interpretation (6 words = 47 chars)
      // Should be truncated to 30 chars
      expect(name.length).toBeLessThanOrEqual(30);
      expect(name).toContain('Custom complex filter');
    });

    it('should truncate long fallback names', () => {
      const filterConfig = {
        interpretation:
          'This is a very long interpretation that should be truncated to avoid overly long names',
      };

      const name = generateProfileNameFromRules(filterConfig);

      expect(name.length).toBeLessThanOrEqual(30);
      expect(name).toContain('...');
    });

    it('should handle single price values', () => {
      const filterConfig = {
        interpretation: 'Items under 500k',
      };

      const name = generateProfileNameFromRules(filterConfig);

      expect(name).toContain('500k');
    });
  });
});
