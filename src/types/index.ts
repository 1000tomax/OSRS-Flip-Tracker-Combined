// src/types/index.ts - Comprehensive type definitions for OSRS Flip Dashboard

/**
 * Core data types for flip trading data
 */

// Individual flip trade data
export interface FlipData {
  id?: string;
  item_name: string;
  item_id?: number;
  buy_price: number;
  sell_price: number;
  profit: number;
  margin: number;
  quantity: number;
  spent: number;
  opened_time: string;
  closed_time: string;
  duration_minutes?: number;
  roi_percent?: number;
  success?: boolean;
  _sourceDate?: string;
  _sourceFile?: string;
}

// Daily summary statistics
export interface DailySummary {
  date: string;
  total_profit: number;
  total_flips: number;
  average_profit: number;
  total_spent: number;
  roi_percent: number;
  profitable_flips: number;
  losing_flips: number;
  win_rate: number;
  largest_profit: number;
  largest_loss: number;
  total_time_minutes: number;
  average_flip_time: number;
  volume: number;
  unique_items: number;
}

// Item statistics for leaderboards
export interface ItemStats {
  item_name: string;
  item_id?: number;
  total_profit: number;
  roi_percent: number;
  flips: number;
  average_profit: number;
  win_rate: number;
  total_volume: number;
  best_flip: number;
  worst_flip: number;
  last_flip_date?: string;
}

// Chart data points for various visualizations
export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
  color?: string;
  [key: string]: any;
}

// Performance/velocity analysis data
export interface VelocityData {
  date: string;
  dayNumber: number;
  totalProfit: number;
  totalMinutes: number;
  flipCount: number;
  profitableFlips: number;
  totalInvestment: number;
  gpPerHour: number;
  avgFlipDuration: number;
  winRate: number;
  avgInvestment: number;
  displayDate: string;
  displayLabel: string;
}

// Strategy battle comparison data
export interface StrategyResult {
  name: string;
  description: string;
  totalProfit: number;
  avgProfit: number;
  flipCount: number;
  winRate: number;
  totalTime: number;
  gpPerHour: number;
  roi: number;
  flips: FlipData[];
}

/**
 * UI Component Types
 */

// Generic table column definition
export interface TableColumn<T = any> {
  key: string;
  label: string;
  sortable?: boolean;
  headerClass?: string;
  cellClass?: string;
  render?: (value: any, row: T) => React.ReactNode;
  sortValue?: (row: T) => any;
}

// Navigation item structure
export interface NavItem {
  path: string;
  label: string;
  icon: string;
  external?: boolean;
}

// Filter/control option
export interface Option {
  value: string;
  label: string;
  disabled?: boolean;
}

/**
 * Hook return types
 */

// Data fetching hook results
export interface DataHookResult<T> {
  data: T;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// Paginated data hook results
export interface PaginatedDataResult<T> extends DataHookResult<T[]> {
  hasMore: boolean;
  loadMore: () => void;
  loadAll: () => Promise<void>;
  reset: () => void;
  isLoadingMore: boolean;
  totalDays: number;
  loadedDays: number;
  loadedFlips: number;
  progress: number;
}

// Virtual scroll hook results
export interface VirtualScrollResult {
  scrollProps: React.HTMLProps<HTMLDivElement>;
  containerProps: React.HTMLProps<HTMLDivElement>;
  visibleItems: Array<
    any & {
      index: number;
      style: React.CSSProperties;
    }
  >;
  scrollToIndex: (index: number) => void;
  totalHeight: number;
  isScrolled: boolean;
}

/**
 * API and data processing types
 */

// Summary index structure from meta files
export interface SummaryIndex {
  days: Array<{
    date: string;
    profit: number;
    flips: number;
    file_path: string;
  }>;
  total_days: number;
  total_profit: number;
  total_flips: number;
  date_range: {
    start: string;
    end: string;
  };
}

// Meta information structure
export interface MetaInfo {
  last_updated: string;
  total_files: number;
  processing_time: number;
  data_range: {
    start_date: string;
    end_date: string;
  };
  statistics: {
    total_profit: number;
    total_flips: number;
    total_days: number;
    average_daily_profit: number;
  };
}

/**
 * Form and validation types
 */

// Date range selector
export interface DateRange {
  start: string;
  end: string;
}

// Search/filter criteria
export interface SearchFilters {
  itemName?: string;
  dateRange?: DateRange;
  minProfit?: number;
  maxProfit?: number;
  profitType?: 'all' | 'positive' | 'negative';
  sortBy?: 'date' | 'profit' | 'roi' | 'volume';
  sortDirection?: 'asc' | 'desc';
}

/**
 * Utility and helper types
 */

// Generic async state
export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// Theme configuration
export interface ThemeConfig {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    success: string;
    warning: string;
    error: string;
    background: string;
    surface: string;
    text: string;
  };
  spacing: Record<string, string>;
  breakpoints: Record<string, string>;
}

// Logger levels and configuration
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LoggerConfig {
  level: LogLevel;
  enableInProduction: boolean;
  prefix?: string;
}

/**
 * Error handling types
 */

// Error boundary state
export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string | null;
}

// Custom error types
export class DataProcessingError extends Error {
  constructor(
    message: string,
    public originalError?: Error,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'DataProcessingError';
  }
}

export class NetworkError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'NetworkError';
  }
}

/**
 * Environment and configuration types
 */

export interface AppConfig {
  apiBaseUrl: string;
  enableAnalytics: boolean;
  logLevel: LogLevel;
  isDevelopment: boolean;
  isProduction: boolean;
  version: string;
}

/**
 * Event and callback types
 */

export type EventHandler<T = Event> = (event: T) => void;
export type ChangeHandler<T = string> = (value: T) => void;
export type AsyncEventHandler<T = Event> = (event: T) => Promise<void>;

/**
 * React component prop types
 */

// Common props for most components
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
  id?: string;
  'data-testid'?: string;
}

// Props for components that can be disabled
export interface DisableableProps {
  disabled?: boolean;
}

// Props for components that can be in loading state
export interface LoadableProps {
  loading?: boolean;
}

// Combined common props
export interface CommonProps extends BaseComponentProps, DisableableProps, LoadableProps {}

/**
 * Export convenience types
 */

export type FlipDataArray = FlipData[];
export type DailySummaryArray = DailySummary[];
export type ItemStatsArray = ItemStats[];

// Utility type for partial updates
export type PartialUpdate<T> = {
  [K in keyof T]?: T[K];
};

// Type for component refs
export type ComponentRef<T> = React.RefObject<T>;

// Generic event handler type
export type GenericEventHandler<T extends HTMLElement = HTMLElement> = React.EventHandler<
  React.SyntheticEvent<T>
>;

// Form field types
export type FormFieldValue = string | number | boolean | Date | null | undefined;

export interface FormField {
  name: string;
  value: FormFieldValue;
  error?: string;
  touched?: boolean;
  required?: boolean;
}

/**
 * Date and time utility types
 */

export type DateFormat = 'api' | 'display' | 'iso' | 'url' | 'file';

export interface DateFormatOptions {
  includeYear?: boolean;
  shortMonth?: boolean;
  includeDay?: boolean;
  includeTime?: boolean;
}

/**
 * Performance monitoring types
 */

export interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  memoryUsage?: number;
  bundleSize?: number;
}

/**
 * Analytics and tracking types
 */

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp?: string;
  userId?: string;
}

/**
 * Type guards and validation
 */

export const isFlipData = (obj: any): obj is FlipData => {
  return (
    obj &&
    typeof obj.item_name === 'string' &&
    typeof obj.buy_price === 'number' &&
    typeof obj.sell_price === 'number' &&
    typeof obj.profit === 'number'
  );
};

export const isDailySummary = (obj: any): obj is DailySummary => {
  return (
    obj &&
    typeof obj.date === 'string' &&
    typeof obj.total_profit === 'number' &&
    typeof obj.total_flips === 'number'
  );
};

export const isValidDate = (date: any): date is Date => {
  return date instanceof Date && !isNaN(date.getTime());
};

/**
 * Re-export commonly used React types with our naming
 */

export type ReactNode = React.ReactNode;
export type ReactElement = React.ReactElement;
export type ReactComponent<P = {}> = React.ComponentType<P>;
export type ReactRef<T> = React.Ref<T>;
export type ReactEvent<T = HTMLElement> = React.SyntheticEvent<T>;
export type ReactMouseEvent<T = HTMLElement> = React.MouseEvent<T>;
export type ReactKeyboardEvent<T = HTMLElement> = React.KeyboardEvent<T>;
export type ReactChangeEvent<T = HTMLElement> = React.ChangeEvent<T>;
export type ReactFocusEvent<T = HTMLElement> = React.FocusEvent<T>;
