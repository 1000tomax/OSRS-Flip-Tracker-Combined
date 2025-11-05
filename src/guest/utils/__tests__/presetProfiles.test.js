import { PRESET_PROFILES, getPreset, getAllPresets } from '../presetProfiles';

describe('presetProfiles', () => {
  describe('PRESET_PROFILES', () => {
    it('should contain expected preset configurations', () => {
      expect(PRESET_PROFILES).toHaveProperty('F2P under 1m');
      expect(PRESET_PROFILES).toHaveProperty('Budget flips');
      expect(PRESET_PROFILES).toHaveProperty('High-value items');
      expect(PRESET_PROFILES).toHaveProperty('Members 1m-10m');
      expect(PRESET_PROFILES).toHaveProperty('Wide range');
      expect(PRESET_PROFILES).toHaveProperty('Low risk flips');
    });

    it('should have query and description for each preset', () => {
      Object.values(PRESET_PROFILES).forEach(preset => {
        expect(preset).toHaveProperty('query');
        expect(preset).toHaveProperty('description');
        expect(typeof preset.query).toBe('string');
        expect(typeof preset.description).toBe('string');
      });
    });

    it('should have non-empty query and description', () => {
      Object.values(PRESET_PROFILES).forEach(preset => {
        expect(preset.query.length).toBeGreaterThan(0);
        expect(preset.description.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getPreset', () => {
    it('should return preset configuration for F2P under 1m', () => {
      const preset = getPreset('F2P under 1m');

      expect(preset).toBeDefined();
      expect(preset.query).toBe('F2P items under 1 million gp');
      expect(preset.description).toBe('Free-to-play items only, budget flips');
    });

    it('should return preset configuration for Budget flips', () => {
      const preset = getPreset('Budget flips');

      expect(preset).toBeDefined();
      expect(preset.query).toBe('Items between 100k and 5m');
      expect(preset.description).toBe('Mid-range items for flipping');
    });

    it('should return preset configuration for High-value items', () => {
      const preset = getPreset('High-value items');

      expect(preset).toBeDefined();
      expect(preset.query).toBe('Items between 5m and 50m');
      expect(preset.description).toBe('Expensive items with higher profit margins');
    });

    it('should return preset configuration for Members 1m-10m', () => {
      const preset = getPreset('Members 1m-10m');

      expect(preset).toBeDefined();
      expect(preset.query).toBe('Members-only items between 1m and 10m');
      expect(preset.description).toBe('Mid to high-value members items');
    });

    it('should return preset configuration for Wide range', () => {
      const preset = getPreset('Wide range');

      expect(preset).toBeDefined();
      expect(preset.query).toBe('Items between 100k and 20m');
      expect(preset.description).toBe('Broad selection of tradeable items');
    });

    it('should return preset configuration for Low risk flips', () => {
      const preset = getPreset('Low risk flips');

      expect(preset).toBeDefined();
      expect(preset.query).toBe('F2P items between 50k and 500k');
      expect(preset.description).toBe('Safe, consistent flips for beginners');
    });

    it('should return undefined for non-existent preset', () => {
      const preset = getPreset('Non-existent preset');

      expect(preset).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      const preset = getPreset('');

      expect(preset).toBeUndefined();
    });

    it('should return undefined for null', () => {
      const preset = getPreset(null);

      expect(preset).toBeUndefined();
    });

    it('should return undefined for undefined', () => {
      const preset = getPreset(undefined);

      expect(preset).toBeUndefined();
    });

    it('should be case-sensitive for preset names', () => {
      const preset = getPreset('f2p under 1m'); // lowercase

      expect(preset).toBeUndefined();
    });
  });

  describe('getAllPresets', () => {
    it('should return array of all preset names', () => {
      const presets = getAllPresets();

      expect(Array.isArray(presets)).toBe(true);
      expect(presets.length).toBe(6);
    });

    it('should return expected preset names', () => {
      const presets = getAllPresets();

      expect(presets).toContain('F2P under 1m');
      expect(presets).toContain('Budget flips');
      expect(presets).toContain('High-value items');
      expect(presets).toContain('Members 1m-10m');
      expect(presets).toContain('Wide range');
      expect(presets).toContain('Low risk flips');
    });

    it('should return all valid preset names that can be used with getPreset', () => {
      const presets = getAllPresets();

      presets.forEach(presetName => {
        const preset = getPreset(presetName);
        expect(preset).toBeDefined();
        expect(preset).toHaveProperty('query');
        expect(preset).toHaveProperty('description');
      });
    });

    it('should return new array each time (not cached reference)', () => {
      const presets1 = getAllPresets();
      const presets2 = getAllPresets();

      expect(presets1).toEqual(presets2);
      expect(presets1).not.toBe(presets2); // Different object references
    });
  });

  describe('preset content validation', () => {
    it('should have meaningful price ranges in queries', () => {
      const budgetFlips = getPreset('Budget flips');
      expect(budgetFlips.query).toMatch(/\d+[km]/i); // Contains price like 100k or 5m

      const highValue = getPreset('High-value items');
      expect(highValue.query).toMatch(/\d+m/i); // Contains price in millions
    });

    it('should specify F2P or members where applicable', () => {
      const f2p = getPreset('F2P under 1m');
      expect(f2p.query.toLowerCase()).toContain('f2p');

      const members = getPreset('Members 1m-10m');
      expect(members.query.toLowerCase()).toContain('members');
    });

    it('should have descriptive descriptions for user guidance', () => {
      const lowRisk = getPreset('Low risk flips');
      expect(lowRisk.description.toLowerCase()).toContain('safe');

      const highValue = getPreset('High-value items');
      expect(highValue.description.toLowerCase()).toContain('profit');
    });
  });

  describe('preset consistency', () => {
    it('should have unique queries for each preset', () => {
      const queries = Object.values(PRESET_PROFILES).map(p => p.query);
      const uniqueQueries = new Set(queries);

      expect(uniqueQueries.size).toBe(queries.length);
    });

    it('should have unique descriptions for each preset', () => {
      const descriptions = Object.values(PRESET_PROFILES).map(p => p.description);
      const uniqueDescriptions = new Set(descriptions);

      expect(uniqueDescriptions.size).toBe(descriptions.length);
    });
  });
});
