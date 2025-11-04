# API Reference 📚

Complete reference for components, hooks, utilities, and types used in the OSRS
Flip Dashboard.

## 📋 Table of Contents

- [Components](#components)
- [Hooks](#hooks)
- [Utilities](#utilities)
- [Types](#types)
- [Context](#context)

## 🧩 Components

### Layout Components

#### PageContainer

Provides the foundational page layout with gradient background and responsive
padding.

```typescript
interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'normal' | 'compact' | 'none';
}

function PageContainer(props: PageContainerProps): JSX.Element;
```

**Usage:**

```jsx
<PageContainer padding="normal">
  <div>Your page content</div>
</PageContainer>
```

**Props:**

- `children` - Content to render inside the container
- `className` - Additional CSS classes to apply
- `padding` - Padding variant for different page types

---

#### CardContainer

Styled content card with consistent border, shadow, and spacing.

```typescript
interface CardContainerProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'compact' | 'normal' | 'large';
  overflow?: boolean;
}

function CardContainer(props: CardContainerProps): JSX.Element;
```

**Usage:**

```jsx
<CardContainer padding="normal" overflow={true}>
  <h2>Card Title</h2>
  <p>Card content</p>
</CardContainer>
```

---

#### PageHeader

Standardized page title with optional description and icon.

```typescript
interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: string;
  className?: string;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
}

function PageHeader(props: PageHeaderProps): JSX.Element;
```

**Usage:**

```jsx
<PageHeader
  title="Trading Statistics"
  description="Comprehensive trading analytics"
  icon="📊"
  level={1}
/>
```

---

#### ResponsiveGrid

Flexible grid layout with predefined responsive patterns.

```typescript
interface ResponsiveGridProps {
  children: React.ReactNode;
  variant?:
    | 'auto'
    | 'twoColumn'
    | 'equal'
    | 'threeEqual'
    | 'fourColumn'
    | 'sidebar'
    | 'cards';
  gap?: 'none' | 'small' | 'normal' | 'large';
  className?: string;
}

function ResponsiveGrid(props: ResponsiveGridProps): JSX.Element;
```

**Usage:**

```jsx
<ResponsiveGrid variant="twoColumn" gap="normal">
  <MainContent />
  <Sidebar />
</ResponsiveGrid>
```

---

#### LoadingLayout

Consistent loading state presentation.

```typescript
interface LoadingLayoutProps {
  text?: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

function LoadingLayout(props: LoadingLayoutProps): JSX.Element;
```

---

#### ErrorLayout

Standardized error state presentation.

```typescript
interface ErrorLayoutProps {
  title?: string;
  error: Error | string;
  onRetry?: () => void;
  className?: string;
}

function ErrorLayout(props: ErrorLayoutProps): JSX.Element;
```

### UI Components

#### LoadingSpinner

Configurable loading spinner with text.

```typescript
interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  text?: string;
  className?: string;
}

function LoadingSpinner(props: LoadingSpinnerProps): JSX.Element;
```

---

#### SortableTable

Advanced data table with sorting, responsive design, and custom rendering.

```typescript
interface Column<T> {
  key: string;
  label: string;
  headerClass?: string;
  cellClass?: string;
  sortValue?: (row: T) => any;
  render?: (value: any, row: T) => React.ReactNode;
}

interface SortableTableProps<T> {
  data: T[];
  columns: Column<T>[];
  initialSortField?: string;
  initialSortDirection?: 'asc' | 'desc';
  className?: string;
}

function SortableTable<T>(props: SortableTableProps<T>): JSX.Element;
```

**Usage:**

```jsx
const columns = [
  {
    key: 'name',
    label: 'Item Name',
    render: value => <span className="font-bold">{value}</span>,
  },
  {
    key: 'profit',
    label: 'Profit',
    sortValue: row => row.profit,
    render: value => <span className="text-green-400">{formatGP(value)}</span>,
  },
];

<SortableTable
  data={items}
  columns={columns}
  initialSortField="profit"
  initialSortDirection="desc"
/>;
```

---

#### SearchControls

Search input with view mode toggle and filtering controls.

```typescript
interface SearchControlsProps {
  query: string;
  onQueryChange: (query: string) => void;
  placeholder?: string;
  viewMode?: 'table' | 'cards';
  onViewModeChange?: (mode: 'table' | 'cards') => void;
  showViewToggle?: boolean;
  className?: string;
}

function SearchControls(props: SearchControlsProps): JSX.Element;
```

---

#### DateNavigation

Date picker with navigation for time-series data.

```typescript
interface DateNavigationProps {
  currentDate?: string;
  availableDates?: string[];
  baseUrl?: string;
  label?: string;
  onDateChange?: (date: string) => void;
}

function DateNavigation(props: DateNavigationProps): JSX.Element;
```

### Chart Components

#### NetWorthChart

Displays net worth progression over time.

```typescript
interface NetWorthChartProps {
  data?: Array<{
    date: string;
    netWorth: number;
    profit: number;
  }>;
  className?: string;
}

function NetWorthChart(props: NetWorthChartProps): JSX.Element;
```

---

#### DailyProfitChart

Shows daily profit trends and patterns.

```typescript
interface DailyProfitChartProps {
  data?: Array<{
    date: string;
    profit: number;
    flips: number;
  }>;
  className?: string;
}

function DailyProfitChart(props: DailyProfitChartProps): JSX.Element;
```

## 🎣 Hooks

### Data Fetching Hooks

#### useApiData

Unified data fetching hook with advanced caching.

```typescript
interface ApiDataOptions {
  parser?: 'json' | 'csv' | 'text';
  transform?: (data: any) => any;
  csvOptions?: Papa.ParseConfig;
  enabled?: boolean;
  staleTime?: number;
  cacheTime?: number;
  retry?: boolean | number;
  refetchOnWindowFocus?: boolean;
  cacheStrategy?: 'aggressive' | 'moderate' | 'minimal' | 'none';
  customCacheTtl?: number;
}

interface DataHookResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

function useApiData<T>(
  url: string,
  options?: ApiDataOptions
): DataHookResult<T>;
```

**Usage:**

```typescript
// JSON data
const { data, loading, error } = useApiData('/api/summary.json');

// CSV data with caching
const { data: flips } = useApiData('/data/flips.csv', {
  parser: 'csv',
  cacheStrategy: 'aggressive',
  transform: data => data.filter(flip => flip.profit > 0),
});
```

---

#### useCsvData

Specialized hook for CSV file processing.

```typescript
function useCsvData<T>(
  filePath: string,
  options?: Omit<ApiDataOptions, 'parser'>
): DataHookResult<T[]>;
```

---

#### useJsonData

Specialized hook for JSON data loading.

```typescript
function useJsonData<T>(
  filePath: string,
  options?: Omit<ApiDataOptions, 'parser'>
): DataHookResult<T>;
```

### Business Logic Hooks

#### useAllFlips

Loads and processes all trading data with pagination support.

```typescript
interface AllFlipsResult {
  data: FlipData[] | null;
  loading: boolean;
  error: string | null;
  totalDays: number;
  progress: number;
}

function useAllFlips(): AllFlipsResult;
```

---

#### useStrategyAnalysis

Analyzes trading strategies for comparison.

```typescript
interface StrategyAnalysisResult {
  highVolumeStrategy: StrategyData;
  highValueStrategy: StrategyData;
  winner: 'volume' | 'value' | 'tie';
  isValid: boolean;
  error?: string;
}

function useStrategyAnalysis(
  flips: FlipData[],
  date: string
): StrategyAnalysisResult;
```

---

#### useDailySummaries

Computes daily trading summaries and statistics.

```typescript
interface DailySummaryData {
  date: string;
  totalProfit: number;
  totalFlips: number;
  avgProfitPerFlip: number;
  topItems: Array<{
    name: string;
    profit: number;
  }>;
}

function useDailySummaries(): {
  data: DailySummaryData[] | null;
  loading: boolean;
  error: string | null;
};
```

### Analytics Hooks

#### useAnalytics

Provides analytics tracking functions.

```typescript
interface AnalyticsHook {
  trackPageView: (event: PageViewEvent) => void;
  trackEvent: (event: AnalyticsEvent) => void;
  trackTradingEvent: (action: string, details?: any) => void;
  trackEngagement: (action: string, context: string) => void;
  trackError: (error: Error, context: string) => void;
  trackPreference: (setting: string, value: string) => void;
}

function useAnalytics(): AnalyticsHook;
```

## 🛠️ Utilities

### Date Utilities

#### DateUtils

Comprehensive date manipulation utilities.

```typescript
class DateUtils {
  // Format date to string
  static formatDate(date: Date): string;

  // Parse date parts
  static parseDateParts(dateString: string): {
    month: string;
    day: string;
    year: string;
  };

  // Add/subtract days
  static addDays(date: Date, days: number): Date;

  // Get Chicago timezone date
  static toChicagoTime(date: Date): Date;

  // Check if date is today
  static isToday(date: Date): boolean;

  // Get date range
  static getDateRange(start: Date, end: Date): Date[];
}
```

### Format Utilities

#### Formatting Functions

```typescript
// Format GP values
function formatGP(value: number): string;

// Format percentages
function formatPercent(value: number): string;

// Format duration
function formatDuration(milliseconds: number): string;

// Format numbers with commas
function formatNumber(value: number): string;

// Format ROI
function formatROI(profit: number, investment: number): string;
```

### Cache Manager

#### CacheManager

Advanced multi-layer caching system.

```typescript
class CacheManager {
  constructor(config: CacheConfig);

  // Cache operations
  async get<T>(key: string): Promise<T | null>;
  async set<T>(key: string, data: T, customTtl?: number): Promise<void>;
  async invalidate(key: string): Promise<void>;
  async invalidatePattern(pattern: string): Promise<void>;

  // Statistics
  getStats(): CacheStats & { hitRate: number; memoryUsage: string };
}

// Cache instances
export const flipDataCache: CacheManager;
export const summaryCache: CacheManager;
export const chartCache: CacheManager;
export const itemStatsCache: CacheManager;
```

### Analytics

#### Analytics

Privacy-focused analytics system.

```typescript
class Analytics {
  // Track page views
  trackPageView(event: PageViewEvent): void;

  // Track custom events
  trackEvent(event: AnalyticsEvent): void;

  // Track trading-specific events
  trackTradingEvent(action: string, details?: any): void;

  // Track user engagement
  trackEngagement(action: string, context: string): void;

  // Track performance metrics
  trackPerformance(metric: string, value: number): void;

  // Track errors
  trackError(error: Error, context: string): void;
}
```

## 📊 Types

### Core Data Types

```typescript
// Trading data structure
interface FlipData {
  item_name: string;
  opened_time: string;
  closed_time: string;
  spent: number;
  received_post_tax: number;
  closed_quantity: number;
  status: 'PENDING' | 'FINISHED' | 'CANCELLED';
  profit?: number;
}

// Item statistics
interface ItemStats {
  item_name: string;
  flips: number;
  total_profit: number;
  total_spent: number;
  roi_percent: number;
  avg_profit_per_flip: number;
  last_flipped: string;
}

// Daily summary
interface DailySummary {
  date: string;
  total_profit: number;
  total_flips: number;
  avg_profit_per_flip: number;
  top_items: Array<{
    name: string;
    profit: number;
  }>;
}
```

### Component Types

```typescript
// Common component props
interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

// Data hook result
interface DataHookResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// Chart data point
interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}
```

### API Types

```typescript
// API response wrapper
interface ApiResponse<T> {
  data: T;
  status: 'success' | 'error';
  message?: string;
  timestamp: number;
}

// Error response
interface ApiError {
  status: number;
  message: string;
  details?: any;
}
```

### Analytics Types

```typescript
// Analytics event
interface AnalyticsEvent {
  action: string;
  category: string;
  label?: string;
  value?: number;
}

// Page view event
interface PageViewEvent {
  page_title: string;
  page_location: string;
  page_path: string;
}
```

### Cache Types

```typescript
// Cache configuration
interface CacheConfig {
  ttl: number;
  maxEntries: number;
  storage: 'memory' | 'localStorage' | 'indexedDB';
  namespace: string;
  compression?: boolean;
}

// Cache statistics
interface CacheStats {
  hits: number;
  misses: number;
  writes: number;
  evictions: number;
  totalSize: number;
  entryCount: number;
}
```

## 🎯 Context

### QueryClient Context

TanStack Query client configuration:

```typescript
// Accessing query client
import { useQueryClient } from '@tanstack/react-query';

function MyComponent() {
  const queryClient = useQueryClient();

  // Invalidate queries
  queryClient.invalidateQueries(['api-data']);

  // Get cached data
  const cachedData = queryClient.getQueryData(['api-data', '/endpoint']);

  // Set query data
  queryClient.setQueryData(['api-data', '/endpoint'], newData);
}
```

## 🚀 Usage Examples

### Complete Page Example

```tsx
import React, { useState } from 'react';
import {
  PageContainer,
  CardContainer,
  PageHeader,
  LoadingLayout,
  ErrorLayout,
  ResponsiveGrid,
} from '../components/layouts';
import { SearchControls, SortableTable } from '../components/ui';
import { useCsvData } from '../hooks/useApiData';
import { formatGP, formatPercent } from '../utils/formatUtils';

export default function ItemsPage() {
  const [query, setQuery] = useState('');
  const { data: items, loading, error } = useCsvData('/data/item-stats.csv');

  if (loading) return <LoadingLayout text="Loading item statistics..." />;
  if (error) return <ErrorLayout title="Failed to load items" error={error} />;

  const filteredItems = items.filter(item =>
    item.item_name.toLowerCase().includes(query.toLowerCase())
  );

  const columns = [
    {
      key: 'item_name',
      label: 'Item Name',
      render: value => <span className="font-medium">{value}</span>,
    },
    {
      key: 'total_profit',
      label: 'Total Profit',
      render: value => (
        <span className={value >= 0 ? 'text-green-400' : 'text-red-400'}>
          {formatGP(value)} GP
        </span>
      ),
    },
    {
      key: 'roi_percent',
      label: 'ROI %',
      render: value => (
        <span className={value >= 0 ? 'text-green-400' : 'text-red-400'}>
          {formatPercent(value)}
        </span>
      ),
    },
  ];

  return (
    <PageContainer>
      <CardContainer>
        <PageHeader
          title="Item Statistics"
          description="Comprehensive trading performance by item"
          icon="📊"
        />

        <SearchControls
          query={query}
          onQueryChange={setQuery}
          placeholder="Search items..."
        />

        <SortableTable
          data={filteredItems}
          columns={columns}
          initialSortField="total_profit"
          initialSortDirection="desc"
        />
      </CardContainer>
    </PageContainer>
  );
}
```

---

This API reference provides complete documentation for all major components,
hooks, and utilities in the OSRS Flip Dashboard. Use it as a reference when
developing new features or integrating existing functionality.
