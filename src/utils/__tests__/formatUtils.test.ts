import { FormatUtils } from '../formatUtils';

describe('FormatUtils', () => {
  describe('gp', () => {
    it('formats large numbers with suffixes and gp', () => {
      expect(FormatUtils.gp(1500000000)).toBe('1.5B gp');
      expect(FormatUtils.gp(2500000)).toBe('2.5M gp');
      expect(FormatUtils.gp(3500)).toBe('3.5K gp');
      expect(FormatUtils.gp(999)).toBe('999 gp');
    });

    it('handles negatives and zero', () => {
      expect(FormatUtils.gp(-1500000)).toBe('-1.5M gp');
      expect(FormatUtils.gp(-500)).toBe('-500 gp');
      expect(FormatUtils.gp(0)).toBe('0 gp');
    });

    it('respects showSuffix and precision options', () => {
      expect(FormatUtils.gp(1500000, { showSuffix: false })).toBe('1.5M');
      expect(FormatUtils.gp(500, { showSuffix: false })).toBe('500');
      expect(FormatUtils.gp(1567890, { precision: 3 })).toBe('1.568M gp');
      expect(FormatUtils.gp(1234567890, { precision: 2 })).toBe('1.23B gp');
    });
  });

  describe('number', () => {
    it('formats numbers with commas', () => {
      expect(FormatUtils.number(1234567)).toBe('1,234,567');
      expect(FormatUtils.number(1000)).toBe('1,000');
      expect(FormatUtils.number(999)).toBe('999');
    });

    it('handles negatives and decimals', () => {
      expect(FormatUtils.number(-1234567)).toBe('-1,234,567');
      expect(FormatUtils.number(1234.56)).toBe('1,234.56');
      expect(FormatUtils.number(0)).toBe('0');
    });
  });

  describe('percentage', () => {
    it('formats decimals as percentages', () => {
      expect(FormatUtils.percentage(0.25)).toBe('25.0%');
      expect(FormatUtils.percentage(0.1234)).toBe('12.3%');
      expect(FormatUtils.percentage(1.5)).toBe('150.0%');
      expect(FormatUtils.percentage(-0.15)).toBe('-15.0%');
      expect(FormatUtils.percentage(0)).toBe('0.0%');
      expect(FormatUtils.percentage(0.12345, 3)).toBe('12.345%');
      expect(FormatUtils.percentage(0.12345, 0)).toBe('12%');
    });
  });

  describe('duration', () => {
    it('formats minutes to short form by default', () => {
      expect(FormatUtils.duration(90)).toBe('1.5h');
      expect(FormatUtils.duration(60)).toBe('1.0h');
      expect(FormatUtils.duration(30)).toBe('30m');
      expect(FormatUtils.duration(0.5, { showSeconds: true })).toBe('30s');
      expect(FormatUtils.duration(-5)).toBe('0m');
    });

    it('supports long form labels', () => {
      expect(FormatUtils.duration(125, { longForm: true })).toBe('2 hours, 5 minutes');
    });
  });

  describe('text', () => {
    it('applies capitalization styles', () => {
      expect(FormatUtils.text('hello world', 'sentence')).toBe('Hello world');
      expect(FormatUtils.text('hello world', 'title')).toBe('Hello World');
      expect(FormatUtils.text('hello world', 'upper')).toBe('HELLO WORLD');
      expect(FormatUtils.text('HELLO world', 'lower')).toBe('hello world');
      expect(FormatUtils.text('hello world', 'camel')).toBe('helloWorld');
    });
  });

  describe('truncate', () => {
    it('truncates long strings with default suffix', () => {
      const longString = 'This is a very long string that should be truncated';
      expect(FormatUtils.truncate(longString, 20)).toBe('This is a very lo...');
    });

    it('does not truncate short strings and supports custom suffix', () => {
      expect(FormatUtils.truncate('Short', 20)).toBe('Short');
      expect(FormatUtils.truncate('This is a long string', 10, '***')).toBe('This is***');
    });
  });

  describe('itemName', () => {
    it('formats item names to title case and preserves specials', () => {
      expect(FormatUtils.itemName('dragon bones')).toBe('Dragon Bones');
      // Current implementation preserves existing uppercase words
      expect(FormatUtils.itemName('RUNE SWORD')).toBe('RUNE SWORD');
      expect(FormatUtils.itemName('dragon dagger(p++)')).toBe('Dragon Dagger(P++)');
    });

    it('handles edge cases', () => {
      expect(FormatUtils.itemName('')).toBe('Unknown Item');
      // Current implementation returns empty string for whitespace-only
      expect(FormatUtils.itemName('   ')).toBe('');
    });
  });

  describe('currency', () => {
    it('formats currency values with options', () => {
      expect(FormatUtils.currency(1234.56, { currency: 'USD', minimumFractionDigits: 2 })).toMatch(
        /\$1,234\.56/
      );
      const eur = FormatUtils.currency(1000, { currency: 'EUR', minimumFractionDigits: 2 });
      expect(eur).toMatch(/€1,000\.00|1,000\.00\s*€/);
    });

    it('handles different currencies and negatives', () => {
      const gbp = FormatUtils.currency(1000, { currency: 'GBP', minimumFractionDigits: 2 });
      expect(gbp).toMatch(/£1,000\.00|1,000\.00\s*£/);
      const neg = FormatUtils.currency(-500, { currency: 'USD', minimumFractionDigits: 2 });
      expect(neg).toMatch(/-\$500\.00|\(\$500\.00\)/);
    });
  });

  describe('fileSize', () => {
    it('formats file sizes', () => {
      expect(FormatUtils.fileSize(1024, 1)).toBe('1 KB');
      expect(FormatUtils.fileSize(1048576, 1)).toBe('1 MB');
      expect(FormatUtils.fileSize(1073741824, 1)).toBe('1 GB');
    });

    it('handles bytes and zero', () => {
      expect(FormatUtils.fileSize(512)).toBe('512 Bytes');
      expect(FormatUtils.fileSize(1023)).toBe('1023 Bytes');
      expect(FormatUtils.fileSize(0)).toBe('0 Bytes');
    });

    it('respects decimals parameter', () => {
      expect(FormatUtils.fileSize(1536, 2)).toBe('1.5 KB');
    });
  });
});
