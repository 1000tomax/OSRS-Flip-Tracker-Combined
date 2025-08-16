import { FormatUtils } from '../formatUtils';

describe('FormatUtils', () => {
  describe('gp', () => {
    it('should format large numbers with appropriate suffixes', () => {
      expect(FormatUtils.gp(1500000000)).toBe('1.5B gp');
      expect(FormatUtils.gp(2500000)).toBe('2.5M gp');
      expect(FormatUtils.gp(3500)).toBe('3.5K gp');
      expect(FormatUtils.gp(999)).toBe('999 gp');
    });

    it('should handle negative numbers', () => {
      expect(FormatUtils.gp(-1500000)).toBe('-1.5M gp');
      expect(FormatUtils.gp(-500)).toBe('-500 gp');
    });

    it('should handle zero', () => {
      expect(FormatUtils.gp(0)).toBe('0 gp');
    });

    it('should respect hideGP option', () => {
      expect(FormatUtils.gp(1500000, { hideGP: true })).toBe('1.5M');
      expect(FormatUtils.gp(500, { hideGP: true })).toBe('500');
    });

    it('should respect decimals option', () => {
      expect(FormatUtils.gp(1567890, { decimals: 3 })).toBe('1.568M GP');
      expect(FormatUtils.gp(1234567890, { decimals: 2 })).toBe('1.23B GP');
    });
  });

  describe('number', () => {
    it('should format numbers with commas', () => {
      expect(FormatUtils.number(1234567)).toBe('1,234,567');
      expect(FormatUtils.number(1000)).toBe('1,000');
      expect(FormatUtils.number(999)).toBe('999');
    });

    it('should handle negative numbers', () => {
      expect(FormatUtils.number(-1234567)).toBe('-1,234,567');
    });

    it('should handle decimals', () => {
      expect(FormatUtils.number(1234.56)).toBe('1,234.56');
    });

    it('should handle zero', () => {
      expect(FormatUtils.number(0)).toBe('0');
    });
  });

  describe('percent', () => {
    it('should format percentages correctly', () => {
      expect(FormatUtils.percent(0.25)).toBe('25.0%');
      expect(FormatUtils.percent(0.1234)).toBe('12.3%');
      expect(FormatUtils.percent(1.5)).toBe('150.0%');
    });

    it('should handle negative percentages', () => {
      expect(FormatUtils.percent(-0.15)).toBe('-15.0%');
    });

    it('should handle zero', () => {
      expect(FormatUtils.percent(0)).toBe('0.0%');
    });

    it('should respect decimals option', () => {
      expect(FormatUtils.percent(0.12345, { decimals: 3 })).toBe('12.345%');
      expect(FormatUtils.percent(0.12345, { decimals: 0 })).toBe('12%');
    });

    it('should handle already formatted percentages', () => {
      expect(FormatUtils.percent(25)).toBe('25.0%');
      expect(FormatUtils.percent(-15)).toBe('-15.0%');
    });
  });

  describe('duration', () => {
    it('should format milliseconds to readable duration', () => {
      expect(FormatUtils.duration(60000)).toBe('1m 0s');
      expect(FormatUtils.duration(3661000)).toBe('1h 1m 1s');
      expect(FormatUtils.duration(90061000)).toBe('1d 1h 1m 1s');
    });

    it('should handle seconds only', () => {
      expect(FormatUtils.duration(30000)).toBe('30s');
      expect(FormatUtils.duration(1000)).toBe('1s');
    });

    it('should handle zero duration', () => {
      expect(FormatUtils.duration(0)).toBe('0s');
    });

    it('should handle negative duration', () => {
      expect(FormatUtils.duration(-60000)).toBe('0s');
    });

    it('should respect compact option', () => {
      expect(FormatUtils.duration(3661000, { compact: true })).toBe('1h 1m');
      expect(FormatUtils.duration(90000, { compact: true })).toBe('1m 30s');
    });
  });

  describe('capitalize', () => {
    it('should capitalize first letter', () => {
      expect(FormatUtils.capitalize('hello')).toBe('Hello');
      expect(FormatUtils.capitalize('WORLD')).toBe('WORLD');
      expect(FormatUtils.capitalize('tEST')).toBe('TEST');
    });

    it('should handle empty strings', () => {
      expect(FormatUtils.capitalize('')).toBe('');
    });

    it('should handle single characters', () => {
      expect(FormatUtils.capitalize('a')).toBe('A');
      expect(FormatUtils.capitalize('Z')).toBe('Z');
    });
  });

  describe('truncate', () => {
    it('should truncate long strings', () => {
      const longString = 'This is a very long string that should be truncated';
      expect(FormatUtils.truncate(longString, 20)).toBe('This is a very lo...');
    });

    it('should not truncate short strings', () => {
      const shortString = 'Short';
      expect(FormatUtils.truncate(shortString, 20)).toBe('Short');
    });

    it('should handle custom suffix', () => {
      const longString = 'This is a long string';
      expect(FormatUtils.truncate(longString, 10, '***')).toBe('This is a***');
    });

    it('should handle edge cases', () => {
      expect(FormatUtils.truncate('', 10)).toBe('');
      expect(FormatUtils.truncate('Test', 0)).toBe('...');
      expect(FormatUtils.truncate('Test', 4)).toBe('Test');
    });
  });

  describe('itemName', () => {
    it('should clean up item names', () => {
      expect(FormatUtils.itemName('dragon bones')).toBe('Dragon Bones');
      expect(FormatUtils.itemName('RUNE SWORD')).toBe('Rune Sword');
      expect(FormatUtils.itemName('abyssal_whip')).toBe('Abyssal Whip');
    });

    it('should handle edge cases', () => {
      expect(FormatUtils.itemName('')).toBe('Unknown Item');
      expect(FormatUtils.itemName('   ')).toBe('Unknown Item');
    });

    it('should preserve numbers and special characters', () => {
      expect(FormatUtils.itemName('rune 2h sword')).toBe('Rune 2h Sword');
      expect(FormatUtils.itemName('dragon dagger(p++)')).toBe('Dragon Dagger(p++)');
    });
  });

  describe('currency', () => {
    it('should format currency values', () => {
      expect(FormatUtils.currency(1234.56, 'USD')).toMatch(/\$1,234\.56/);
      expect(FormatUtils.currency(1000, 'EUR')).toMatch(/€1,000\.00|1,000\.00\s*€/);
    });

    it('should handle different currencies', () => {
      const result = FormatUtils.currency(1000, 'GBP');
      expect(result).toMatch(/£1,000\.00|1,000\.00\s*£/);
    });

    it('should handle negative amounts', () => {
      const result = FormatUtils.currency(-500, 'USD');
      expect(result).toMatch(/-\$500\.00|\(\$500\.00\)/);
    });
  });

  describe('fileSize', () => {
    it('should format file sizes correctly', () => {
      expect(FormatUtils.fileSize(1024)).toBe('1.0 KB');
      expect(FormatUtils.fileSize(1048576)).toBe('1.0 MB');
      expect(FormatUtils.fileSize(1073741824)).toBe('1.0 GB');
    });

    it('should handle bytes', () => {
      expect(FormatUtils.fileSize(512)).toBe('512 bytes');
      expect(FormatUtils.fileSize(1023)).toBe('1023 bytes');
    });

    it('should handle zero', () => {
      expect(FormatUtils.fileSize(0)).toBe('0 bytes');
    });

    it('should respect decimals option', () => {
      expect(FormatUtils.fileSize(1536, { decimals: 2 })).toBe('1.50 KB');
    });
  });
});
