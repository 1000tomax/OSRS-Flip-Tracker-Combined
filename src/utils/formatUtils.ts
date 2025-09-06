// src/utils/formatUtils.ts - Centralized formatting utilities
// Removed import - types are defined inline
import type { FormFieldValue } from '@/types';

/**
 * Comprehensive formatting utilities for numbers, currency, and text
 */
export class FormatUtils {
  /**
   * Format currency with proper locale support
   * @param amount - Amount to format
   * @param options - Formatting options
   * @returns Formatted currency string
   */
  static currency(
    amount: number,
    options: {
      currency?: string;
      locale?: string;
      minimumFractionDigits?: number;
      maximumFractionDigits?: number;
    } = {}
  ): string {
    const {
      currency = 'USD',
      locale = 'en-US',
      minimumFractionDigits = 0,
      maximumFractionDigits = 2,
    } = options;

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(amount);
  }

  /**
   * Format OSRS GP (Gold Pieces) with K/M/B suffixes
   * @param amount - GP amount to format
   * @param options - Formatting options
   * @returns Formatted GP string
   */
  static gp(
    amount: number,
    options: {
      showSuffix?: boolean;
      precision?: number;
      alwaysShowDecimals?: boolean;
    } = {}
  ): string {
    const { showSuffix = true, precision = 1, alwaysShowDecimals = false } = options;

    if (!isFinite(amount)) return '0 gp';

    const absAmount = Math.abs(amount);
    const sign = amount < 0 ? '-' : '';

    let value: number;
    let suffix: string;

    if (absAmount >= 1000000000) {
      value = absAmount / 1000000000;
      suffix = 'B';
    } else if (absAmount >= 1000000) {
      value = absAmount / 1000000;
      suffix = 'M';
    } else if (absAmount >= 1000) {
      value = absAmount / 1000;
      suffix = 'K';
    } else {
      value = absAmount;
      suffix = '';
    }

    // Format the number
    let formatted: string;
    if (suffix === '' || alwaysShowDecimals) {
      formatted = value.toLocaleString('en-US', {
        minimumFractionDigits: alwaysShowDecimals ? precision : 0,
        maximumFractionDigits: precision,
      });
    } else {
      formatted = value.toFixed(precision).replace(/\.?0+$/, '');
    }

    const gpSuffix = showSuffix ? ' gp' : '';
    return `${sign}${formatted}${suffix}${gpSuffix}`;
  }

  /**
   * Format percentage with proper precision
   * @param value - Value to format (0.5 = 50%)
   * @param decimals - Number of decimal places
   * @returns Formatted percentage string
   */
  static percentage(value: number, decimals: number = 1): string {
    if (!isFinite(value)) return '0%';
    return `${(value * 100).toFixed(decimals)}%`;
  }

  /**
   * Format large numbers with proper locale support
   * @param value - Number to format
   * @param options - Formatting options
   * @returns Formatted number string
   */
  static number(
    value: number,
    options: {
      locale?: string;
      minimumFractionDigits?: number;
      maximumFractionDigits?: number;
      notation?: 'standard' | 'scientific' | 'engineering' | 'compact';
    } = {}
  ): string {
    const { locale = 'en-US', ...formatOptions } = options;

    if (!isFinite(value)) return '0';

    return value.toLocaleString(locale, formatOptions);
  }

  /**
   * Format time duration from minutes to human readable format
   * @param minutes - Duration in minutes
   * @param options - Formatting options
   * @returns Formatted duration string
   */
  static duration(
    minutes: number,
    options: {
      showSeconds?: boolean;
      longForm?: boolean;
      precision?: number;
    } = {}
  ): string {
    const { showSeconds = false, longForm = false, precision = 1 } = options;

    if (!isFinite(minutes) || minutes < 0) return '0m';

    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    const secs = Math.floor((minutes % 1) * 60);

    if (longForm) {
      const parts: string[] = [];
      if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
      if (mins > 0) parts.push(`${mins} minute${mins !== 1 ? 's' : ''}`);
      if (showSeconds && secs > 0) parts.push(`${secs} second${secs !== 1 ? 's' : ''}`);

      return parts.length > 0 ? parts.join(', ') : '0 minutes';
    } else {
      if (hours >= 1) {
        const fractionalHours = minutes / 60;
        return `${fractionalHours.toFixed(precision)}h`;
      } else if (showSeconds && minutes < 1) {
        return `${secs}s`;
      } else {
        return `${Math.round(minutes)}m`;
      }
    }
  }

  /**
   * Format text for display with proper capitalization
   * @param text - Text to format
   * @param style - Capitalization style
   * @returns Formatted text
   */
  static text(
    text: string,
    style: 'sentence' | 'title' | 'upper' | 'lower' | 'camel' = 'sentence'
  ): string {
    if (!text || typeof text !== 'string') return '';

    switch (style) {
      case 'sentence':
        return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
      case 'title':
        return text
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
      case 'upper':
        return text.toUpperCase();
      case 'lower':
        return text.toLowerCase();
      case 'camel':
        return text
          .split(' ')
          .map((word, index) =>
            index === 0
              ? word.toLowerCase()
              : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          )
          .join('');
      default:
        return text;
    }
  }

  /**
   * Format item names for consistent display
   * @param itemName - Item name to format
   * @returns Formatted item name
   */
  static itemName(itemName: string): string {
    if (!itemName) return 'Unknown Item';

    // Handle special OSRS item name cases
    return itemName
      .replace(/\b\w/g, l => l.toUpperCase()) // Title case
      .replace(/\bOf\b/g, 'of') // Lowercase "of"
      .replace(/\bThe\b/g, 'the') // Lowercase "the"
      .replace(/\bAnd\b/g, 'and') // Lowercase "and"
      .replace(/\bOr\b/g, 'or') // Lowercase "or"
      .replace(/\bIn\b/g, 'in') // Lowercase "in"
      .replace(/\bOn\b/g, 'on') // Lowercase "on"
      .replace(/\bAt\b/g, 'at') // Lowercase "at"
      .replace(/\bTo\b/g, 'to') // Lowercase "to"
      .replace(/\bFor\b/g, 'for') // Lowercase "for"
      .replace(/\bWith\b/g, 'with') // Lowercase "with"
      .trim();
  }

  /**
   * Format form field values for display
   * @param value - Form field value
   * @param type - Expected type of the field
   * @returns Formatted display value
   */
  static formField(
    value: FormFieldValue,
    type: 'text' | 'number' | 'currency' | 'percentage' | 'date' = 'text'
  ): string {
    if (value === null || value === undefined) return '';

    switch (type) {
      case 'number':
        return typeof value === 'number' ? FormatUtils.number(value) : String(value);
      case 'currency':
        return typeof value === 'number' ? FormatUtils.gp(value) : String(value);
      case 'percentage':
        return typeof value === 'number' ? FormatUtils.percentage(value) : String(value);
      case 'date':
        if (value instanceof Date) {
          return value.toLocaleDateString();
        }
        return String(value);
      case 'text':
      default:
        return String(value);
    }
  }

  /**
   * Truncate text with ellipsis
   * @param text - Text to truncate
   * @param maxLength - Maximum length before truncation
   * @param suffix - Suffix to add when truncated
   * @returns Truncated text
   */
  static truncate(text: string, maxLength: number, suffix: string = '...'): string {
    if (!text || text.length <= maxLength) return text;

    return text.slice(0, maxLength - suffix.length) + suffix;
  }

  /**
   * Format file size in human readable format
   * @param bytes - Size in bytes
   * @param decimals - Number of decimal places
   * @returns Formatted file size
   */
  static fileSize(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
  }

  /**
   * Format ordinal numbers (1st, 2nd, 3rd, etc.)
   * @param num - Number to format
   * @returns Ordinal number string
   */
  static ordinal(num: number): string {
    const j = num % 10;
    const k = num % 100;

    if (j === 1 && k !== 11) return `${num}st`;
    if (j === 2 && k !== 12) return `${num}nd`;
    if (j === 3 && k !== 13) return `${num}rd`;

    return `${num}th`;
  }

  /**
   * Format win rate with color indication
   * @param winRate - Win rate as percentage (0-100)
   * @param includeColor - Whether to include color class
   * @returns Formatted win rate with optional color
   */
  static winRate(winRate: number, includeColor: boolean = false): string {
    const formatted = `${winRate.toFixed(1)}%`;

    if (!includeColor) return formatted;

    // Return object with formatted text and color class
    let _colorClass = '';
    if (winRate >= 70) _colorClass = 'text-green-400';
    else if (winRate >= 50) _colorClass = 'text-yellow-400';
    else _colorClass = 'text-red-400';

    return formatted; // In actual usage, you'd return { text: formatted, colorClass }
  }

  /**
   * Format ROI (Return on Investment) with appropriate styling
   * @param roi - ROI as decimal (0.5 = 50%)
   * @param includeSign - Whether to include + sign for positive values
   * @returns Formatted ROI string
   */
  static roi(roi: number, includeSign: boolean = true): string {
    const percentage = roi * 100;
    const sign = includeSign && percentage > 0 ? '+' : '';

    return `${sign}${percentage.toFixed(2)}%`;
  }
}

// Export convenience functions for common use cases
export const {
  gp: formatGP,
  percentage: formatPercent,
  number: formatNumber,
  duration: formatDuration,
  currency: formatCurrency,
  itemName: formatItemName,
  text: formatText,
  truncate,
  fileSize: formatFileSize,
  ordinal: formatOrdinal,
  winRate: formatWinRate,
  roi: formatROI,
} = FormatUtils;

export default FormatUtils;
