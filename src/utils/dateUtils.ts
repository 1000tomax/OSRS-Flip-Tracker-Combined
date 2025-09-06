// src/utils/dateUtils.ts - Centralized date handling utilities
import logger from './logger';
import type { DateFormat, DateFormatOptions } from '@/types';

/**
 * Date formats used throughout the application
 */
export const DATE_FORMATS = {
  API: 'MM-dd-yyyy', // MM-DD-YYYY format used by API/CSV files
  DISPLAY: 'MMM dd, yyyy', // Human readable format (Jan 15, 2025)
  URL: 'yyyy/MM/dd', // URL-friendly format (2025/01/15)
  ISO: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx", // ISO format for timestamps
  FILE: 'MM-dd-yyyy', // File naming format
  CHICAGO_TZ: 'America/Chicago', // Timezone used for data consistency
};

/**
 * Comprehensive date utility class
 */
export class DateUtils {
  /**
   * Parse a date string in various formats and return a Date object
   * @param dateString - Date string to parse
   * @param expectedFormat - Expected format (optional)
   * @returns Parsed date or null if invalid
   */
  static parse(dateString: string, _expectedFormat: string = 'auto'): Date | null {
    if (!dateString) return null;

    try {
      // Try common formats explicitly

      // Try MM-DD-YYYY format first (most common)
      const mmddyyyy = dateString.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
      if (mmddyyyy) {
        const [, month, day, year] = mmddyyyy;
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (DateUtils.isValidDate(date)) return date;
      }

      // Try YYYY-MM-DD format
      const yyyymmdd = dateString.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (yyyymmdd) {
        const [, year, month, day] = yyyymmdd;
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (DateUtils.isValidDate(date)) return date;
      }

      // Try MM/DD/YYYY format
      const mmddyyyyslash = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (mmddyyyyslash) {
        const [, month, day, year] = mmddyyyyslash;
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (DateUtils.isValidDate(date)) return date;
      }

      // Fallback to native Date parsing
      const fallbackDate = new Date(dateString);
      if (DateUtils.isValidDate(fallbackDate)) return fallbackDate;

      logger.warn(`Failed to parse date string: ${dateString}`);
      return null;
    } catch (error) {
      logger.error(`Error parsing date "${dateString}":`, error);
      return null;
    }
  }

  /**
   * Check if a date object is valid
   * @param date - Date to check
   * @returns True if valid
   */
  static isValidDate(date: unknown): date is Date {
    return date instanceof Date && !isNaN(date.getTime());
  }

  /**
   * Format a date to MM-DD-YYYY format (API format)
   * @param date - Date to format
   * @returns Formatted date string
   */
  static toApiFormat(date: Date | string): string {
    const dateObj = typeof date === 'string' ? DateUtils.parse(date) : date;
    if (!DateUtils.isValidDate(dateObj)) return '';

    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const year = dateObj.getFullYear();

    return `${month}-${day}-${year}`;
  }

  /**
   * Add days to a date and return a new Date
   */
  static addDays(date: Date, days: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  /**
   * Convenience alias used by some modules (API format)
   */
  static formatDate(date: Date | string): string {
    return DateUtils.toApiFormat(date);
  }

  /**
   * Parse an API date (MM-DD-YYYY) into parts
   */
  static parseDateParts(apiDate: string): { month: string; day: string; year: string } {
    const match = apiDate.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (!match) {
      const d = DateUtils.parse(apiDate);
      if (!d) return { month: '01', day: '01', year: '1970' };
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const year = String(d.getFullYear());
      return { month, day, year };
    }
    const [, m, d, y] = match;
    return { month: m.padStart(2, '0'), day: d.padStart(2, '0'), year: y };
  }

  /**
   * Format a date to YYYY-MM-DD format (ISO-like)
   * @param date - Date to format
   * @returns Formatted date string
   */
  static toIsoFormat(date: Date | string): string {
    const dateObj = typeof date === 'string' ? DateUtils.parse(date) : date;
    if (!DateUtils.isValidDate(dateObj)) return '';

    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  /**
   * Format a date for display (human readable)
   * @param date - Date to format
   * @param options - Formatting options
   * @returns Formatted date string
   */
  static toDisplayFormat(date: Date | string, options: DateFormatOptions = {}): string {
    const { includeYear = true, shortMonth = true, includeDay = true } = options;

    const dateObj = typeof date === 'string' ? DateUtils.parse(date) : date;
    if (!DateUtils.isValidDate(dateObj)) return 'Invalid Date';

    const formatOptions: Intl.DateTimeFormatOptions = {
      month: shortMonth ? 'short' : 'long',
      ...(includeDay && { day: 'numeric' }),
      ...(includeYear && { year: 'numeric' }),
    };

    return dateObj.toLocaleDateString('en-US', formatOptions);
  }

  /**
   * Convert date to Chicago timezone (used for data consistency)
   * @param date - Date to convert
   * @returns Date in Chicago timezone
   */
  static toChicagoTime(date: Date | string): Date | null {
    const dateObj = typeof date === 'string' ? DateUtils.parse(date) : date;
    if (!DateUtils.isValidDate(dateObj)) return null;

    // Convert to Chicago timezone
    const chicagoDate = new Date(
      dateObj.toLocaleString('en-US', {
        timeZone: DATE_FORMATS.CHICAGO_TZ,
      })
    );

    return chicagoDate;
  }

  /**
   * Get today's date in Chicago timezone formatted as MM-DD-YYYY
   * @returns Today's date in API format
   */
  static getTodayChicago(): string {
    const today = new Date();
    const chicagoToday = DateUtils.toChicagoTime(today);
    return DateUtils.toApiFormat(chicagoToday);
  }

  /**
   * Convert MM-DD-YYYY to YYYY-MM-DD
   * @param apiDate - Date in MM-DD-YYYY format
   * @returns Date in YYYY-MM-DD format
   */
  static apiToIso(apiDate: string): string {
    if (!apiDate) return '';

    const date = DateUtils.parse(apiDate);
    return date ? DateUtils.toIsoFormat(date) : '';
  }

  /**
   * Convert YYYY-MM-DD to MM-DD-YYYY
   * @param isoDate - Date in YYYY-MM-DD format
   * @returns Date in MM-DD-YYYY format
   */
  static isoToApi(isoDate: string): string {
    if (!isoDate) return '';

    const date = DateUtils.parse(isoDate);
    return date ? DateUtils.toApiFormat(date) : '';
  }

  /**
   * Get a range of dates between two dates
   * @param startDate - Start date
   * @param endDate - End date
   * @param format - Format for returned dates
   * @returns Array of date strings
   */
  static getDateRange(
    startDate: Date | string,
    endDate: Date | string,
    format: DateFormat = 'api'
  ): string[] {
    const start = typeof startDate === 'string' ? DateUtils.parse(startDate) : startDate;
    const end = typeof endDate === 'string' ? DateUtils.parse(endDate) : endDate;

    if (!DateUtils.isValidDate(start) || !DateUtils.isValidDate(end)) {
      logger.warn('Invalid dates provided to getDateRange:', { startDate, endDate });
      return [];
    }

    const dates = [];
    const currentDate = new Date(start);

    while (currentDate <= end) {
      const formattedDate =
        format === 'api' ? DateUtils.toApiFormat(currentDate) : DateUtils.toIsoFormat(currentDate);

      dates.push(formattedDate);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
  }

  /**
   * Check if a date string is in the correct API format (MM-DD-YYYY)
   * @param dateString - Date string to validate
   * @returns True if valid format
   */
  static isValidApiFormat(dateString: string): boolean {
    if (!dateString || typeof dateString !== 'string') return false;

    const match = dateString.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (!match) return false;

    const [, month, day, year] = match;
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));

    // Check if the parsed date matches the input
    return (
      DateUtils.isValidDate(date) &&
      date.getMonth() === parseInt(month, 10) - 1 &&
      date.getDate() === parseInt(day, 10) &&
      date.getFullYear() === parseInt(year, 10)
    );
  }

  /**
   * Normalize various date formats to a consistent format
   * @param dateString - Date string in any format
   * @param targetFormat - Target format ('api' or 'iso')
   * @returns Normalized date string
   */
  static normalize(dateString: string, targetFormat: DateFormat = 'api'): string {
    const date = DateUtils.parse(dateString);
    if (!date) return '';

    return targetFormat === 'api' ? DateUtils.toApiFormat(date) : DateUtils.toIsoFormat(date);
  }

  /**
   * Compare two dates (handles string dates)
   * @param date1 - First date
   * @param date2 - Second date
   * @returns -1 if date1 < date2, 0 if equal, 1 if date1 > date2
   */
  static compare(date1: Date | string, date2: Date | string): number {
    const d1 = typeof date1 === 'string' ? DateUtils.parse(date1) : date1;
    const d2 = typeof date2 === 'string' ? DateUtils.parse(date2) : date2;

    if (!DateUtils.isValidDate(d1) || !DateUtils.isValidDate(d2)) {
      logger.warn('Invalid dates provided to compare:', { date1, date2 });
      return 0;
    }

    if (d1.getTime() < d2.getTime()) return -1;
    if (d1.getTime() > d2.getTime()) return 1;
    return 0;
  }
}

// Export commonly used functions for convenience
export const {
  parse: parseDate,
  toApiFormat: formatApiDate,
  toIsoFormat: formatIsoDate,
  toDisplayFormat: formatDisplayDate,
  normalize: normalizeDate,
  isValidDate,
  getTodayChicago,
  compare: compareDates,
} = DateUtils;

export default DateUtils;
