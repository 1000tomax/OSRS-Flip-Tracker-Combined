import { DateUtils } from '../dateUtils';

describe('DateUtils', () => {
  beforeAll(() => {
    // Mock timezone to be consistent across different environments
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('parse', () => {
    it('should parse ISO date strings correctly', () => {
      const result = DateUtils.parse('2024-01-15T10:30:00Z');
      expect(result).toBeInstanceOf(Date);
      expect(result?.toISOString()).toBe('2024-01-15T10:30:00.000Z');
    });

    it('should parse simple date strings', () => {
      const result = DateUtils.parse('2024-01-15');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2024);
      expect(result?.getMonth()).toBe(0); // January is 0
      expect(result?.getDate()).toBe(15);
    });

    it('should return null for invalid dates', () => {
      expect(DateUtils.parse('invalid-date')).toBeNull();
      expect(DateUtils.parse('')).toBeNull();
      expect(DateUtils.parse('2024-13-45')).toBeNull();
    });

    it('should handle timestamp strings', () => {
      const timestamp = '1705312200000'; // 2024-01-15T10:30:00.000Z
      const result = DateUtils.parse(timestamp);
      expect(result).toBeInstanceOf(Date);
      expect(result?.toISOString()).toBe('2024-01-15T10:30:00.000Z');
    });
  });

  describe('toApiFormat', () => {
    it('should format Date object to YYYY-MM-DD', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      expect(DateUtils.toApiFormat(date)).toBe('2024-01-15');
    });

    it('should format date string to YYYY-MM-DD', () => {
      expect(DateUtils.toApiFormat('2024-01-15T10:30:00Z')).toBe('2024-01-15');
    });

    it('should handle single digit months and days', () => {
      const date = new Date('2024-03-05T10:30:00Z');
      expect(DateUtils.toApiFormat(date)).toBe('2024-03-05');
    });
  });

  describe('toDisplayFormat', () => {
    it('should format date to readable display format', () => {
      const result = DateUtils.toDisplayFormat('2024-01-15');
      expect(result).toMatch(/Jan(uary)? 15, 2024/i);
    });

    it('should handle different input formats', () => {
      const result = DateUtils.toDisplayFormat(new Date('2024-01-15'));
      expect(result).toMatch(/Jan(uary)? 15, 2024/i);
    });
  });

  describe('isValidDate', () => {
    it('should return true for valid dates', () => {
      expect(DateUtils.isValidDate(new Date('2024-01-15'))).toBe(true);
      expect(DateUtils.isValidDate('2024-01-15')).toBe(true);
    });

    it('should return false for invalid dates', () => {
      expect(DateUtils.isValidDate(new Date('invalid'))).toBe(false);
      expect(DateUtils.isValidDate('invalid-date')).toBe(false);
      expect(DateUtils.isValidDate('')).toBe(false);
    });
  });

  describe('getDaysBetween', () => {
    it('should calculate days between two dates', () => {
      const start = new Date('2024-01-15');
      const end = new Date('2024-01-20');
      expect(DateUtils.getDaysBetween(start, end)).toBe(5);
    });

    it('should handle negative differences', () => {
      const start = new Date('2024-01-20');
      const end = new Date('2024-01-15');
      expect(DateUtils.getDaysBetween(start, end)).toBe(-5);
    });

    it('should handle same dates', () => {
      const date = new Date('2024-01-15');
      expect(DateUtils.getDaysBetween(date, date)).toBe(0);
    });
  });

  describe('getTodayChicago', () => {
    it('should return today in Chicago timezone as YYYY-MM-DD', () => {
      const result = DateUtils.getTodayChicago();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('toChicagoTime', () => {
    it('should convert date to Chicago timezone', () => {
      const utcDate = new Date('2024-01-15T12:00:00Z');
      const chicagoDate = DateUtils.toChicagoTime(utcDate);
      expect(chicagoDate).toBeInstanceOf(Date);
      // Chicago is UTC-6 or UTC-5 depending on DST
      expect(chicagoDate?.getHours()).toBeLessThan(12);
    });

    it('should handle string inputs', () => {
      const result = DateUtils.toChicagoTime('2024-01-15T12:00:00Z');
      expect(result).toBeInstanceOf(Date);
    });

    it('should return null for invalid dates', () => {
      expect(DateUtils.toChicagoTime('invalid')).toBeNull();
    });
  });

  describe('formatDuration', () => {
    it('should format milliseconds to readable duration', () => {
      expect(DateUtils.formatDuration(60000)).toBe('1m 0s');
      expect(DateUtils.formatDuration(3661000)).toBe('1h 1m 1s');
      expect(DateUtils.formatDuration(90061000)).toBe('1d 1h 1m 1s');
    });

    it('should handle zero duration', () => {
      expect(DateUtils.formatDuration(0)).toBe('0s');
    });

    it('should handle negative duration', () => {
      expect(DateUtils.formatDuration(-60000)).toBe('0s');
    });
  });

  describe('isToday', () => {
    it("should return true for today's date", () => {
      const today = new Date();
      expect(DateUtils.isToday(today)).toBe(true);
    });

    it('should return false for other dates', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(DateUtils.isToday(yesterday)).toBe(false);
    });

    it('should handle string inputs', () => {
      const todayString = DateUtils.toApiFormat(new Date());
      expect(DateUtils.isToday(todayString)).toBe(true);
    });
  });
});
