# OSRS Flip Dashboard - Comprehensive Analysis TODO

_Generated: August 16, 2025_

## 🚨 CRITICAL ISSUES (Fix Immediately)

### 1. Security Vulnerabilities

#### 1.1 External Image Loading Vulnerability

**File**: `src/components/ItemLeaderboard.jsx:56-60` **Complexity**: 🟢 Easy (30
minutes) **Priority**: Critical

```jsx
// CURRENT (VULNERABLE):
<img
  src="https://flippingcopilot.com/static/logo.png"
  alt="Flipping Copilot Logo"
/>

// FIX:
// 1. Download logo to public/assets/
// 2. Replace with local path:
<img
  src="/assets/flipping-copilot-logo.png"
  alt="Flipping Copilot Logo"
/>
```

#### 1.2 Console Information Leakage

**Files**: Multiple (ProfitVelocity.jsx:22-29, useAllFlips.js:64-70)
**Complexity**: 🟡 Medium (2 hours) **Priority**: Critical

```js
// CURRENT:
console.log('Debug info:', sensitiveData);

// FIX:
const isDev = process.env.NODE_ENV === 'development';
if (isDev) {
  console.log('Debug info:', sensitiveData);
}

// Or create utility:
const logger = {
  debug: (...args) =>
    process.env.NODE_ENV === 'development' && console.log(...args),
};
```

#### 1.3 Unsafe HTML Content Detection

**File**: `src/hooks/useAllFlips.js:25-28` **Complexity**: 🟡 Medium (1 hour)
**Priority**: High

```js
// CURRENT (WEAK):
if (text.trim().startsWith('<!')) {
  console.warn(`Received HTML instead of CSV for ${filePath}`);
  return [];
}

// FIX:
const isValidCSV = text => {
  const contentType = response.headers.get('content-type');
  return (
    contentType?.includes('text/csv') || contentType?.includes('text/plain')
  );
};
```

### 2. Data Integrity Issues

#### 2.1 Inconsistent Date Format Handling

**File**: `src/components/DailySummaryLog.jsx:24-46` **Complexity**: 🟡 Medium
(3 hours) **Priority**: High

```js
// CURRENT (INCONSISTENT):
const parseDate = dateStr => {
  // Multiple formats handled differently
};

// FIX - Create centralized date utility:
// src/utils/dateUtils.js
export const standardizeDateFormat = dateStr => {
  const formats = ['MM-DD-YYYY', 'YYYY-MM-DD', 'MM/DD/YYYY'];
  // Use date-fns or similar for consistent parsing
};
```

#### 2.2 Missing Error Boundaries

**Files**: Multiple components **Complexity**: 🟡 Medium (4 hours) **Priority**:
High

```jsx
// CREATE: src/components/ErrorBoundary.jsx
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Chart error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <div>Something went wrong with the chart.</div>;
    }
    return this.props.children;
  }
}

// WRAP problematic components:
<ErrorBoundary>
  <ChartComponent />
</ErrorBoundary>;
```

---

## ⚡ PERFORMANCE OPTIMIZATIONS

### 3. Bundle Size & Loading

#### 3.1 Large Bundle Warning

**File**: `vite.config.js:20` **Complexity**: 🔴 Hard (1-2 days) **Priority**:
High

```js
// CURRENT:
chunkSizeWarningLimit: 600;

// FIX - Add bundle analysis:
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    // ... other plugins
    visualizer({
      filename: 'dist/stats.html',
      open: true,
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['recharts'],
          utils: ['date-fns', 'papaparse'],
        },
      },
    },
  },
});
```

#### 3.2 Heavy Data Processing

**File**: `src/hooks/useAllFlips.js:8-57` **Complexity**: 🔴 Hard (3-5 days)
**Priority**: Critical

```js
// CURRENT (LOADS ALL 4700+ FILES):
const fetchAllFlips = async () => {
  const promises = filePaths.map(fetchCsvData);
  return Promise.all(promises);
};

// FIX - Implement pagination:
const useAllFlips = (page = 1, limit = 50) => {
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const currentPaths = filePaths.slice(startIndex, endIndex);

  // Add virtual scrolling with react-window
  // Add infinite scroll with intersection observer
};
```

#### 3.3 Inefficient Re-renders

**File**: `src/pages/ProfitVelocity.jsx:31-129` **Complexity**: 🟡 Medium (4
hours) **Priority**: Medium

```js
// CURRENT (HEAVY COMPUTATION):
const velocityData = useMemo(() => {
  // Heavy computation on every render
}, [allFlips, showDates]);

// FIX:
const velocityData = useMemo(() => {
  // Move heavy computation to web worker
  return computeVelocityData(allFlips, showDates);
}, [allFlips.length, showDates]); // Optimize dependencies

// Use React.memo for components:
const VelocityChart = React.memo(({ data }) => {
  // Chart component
});
```

### 4. Memory Management

#### 4.1 Uncleaned Event Listeners

**File**: `src/components/Navigation.jsx:76-90` **Complexity**: 🟢 Easy (30
minutes) **Priority**: Medium

```jsx
// CURRENT:
const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

// FIX:
useEffect(() => {
  const handleClickOutside = event => {
    if (menuRef.current && !menuRef.current.contains(event.target)) {
      setMobileMenuOpen(false);
    }
  };

  if (mobileMenuOpen) {
    document.addEventListener('mousedown', handleClickOutside);
  }

  return () => {
    document.removeEventListener('mousedown', handleClickOutside);
  };
}, [mobileMenuOpen]);
```

#### 4.2 Large Data Retention

**Files**: Multiple hooks cache large datasets **Complexity**: 🟡 Medium (6
hours) **Priority**: Medium

```js
// FIX - Implement cache limits:
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      // Add cache size limits
      queryFn: async ({ signal }) => {
        // Implement cache eviction strategy
      },
    },
  },
});
```

---

## 🎯 CODE QUALITY IMPROVEMENTS

### 5. TypeScript Migration

#### 5.1 Convert All Files to TypeScript

**Files**: All 40+ source files **Complexity**: 🔴 Very Hard (3-4 weeks)
**Priority**: High

```bash
# SETUP:
npm install -D typescript @types/react @types/react-dom @types/node

# CREATE tsconfig.json:
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["DOM", "DOM.Iterable", "ES6"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  }
}

# MIGRATION STRATEGY:
# 1. Start with utils and hooks
# 2. Add type definitions for data structures
# 3. Convert components one by one
# 4. Add proper interfaces for props
```

#### 5.2 Define Data Types

**Complexity**: 🟡 Medium (1 day) **Priority**: High

```ts
// CREATE: src/types/index.ts
export interface FlipData {
  itemName: string;
  buyPrice: number;
  sellPrice: number;
  profit: number;
  timestamp: string;
  quantity: number;
}

export interface DailySummary {
  date: string;
  totalProfit: number;
  totalFlips: number;
  averageProfit: number;
}

export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}
```

### 6. Component Architecture

#### 6.1 Break Down Large Components

**Files**: StrategyBattle.jsx (632 lines), FlipLogs.jsx (367 lines)
**Complexity**: 🔴 Hard (2-3 days per component) **Priority**: Medium

```jsx
// CURRENT: StrategyBattle.jsx (632 lines)

// FIX - Break into smaller components:
// src/components/StrategyBattle/
//   ├── index.jsx (main component)
//   ├── StrategySelector.jsx
//   ├── BattleResults.jsx
//   ├── ProfitChart.jsx
//   └── StatsSummary.jsx

// Example breakdown:
const StrategyBattle = () => {
  return (
    <div>
      <StrategySelector onStrategyChange={handleStrategyChange} />
      <BattleResults strategies={strategies} />
      <ProfitChart data={chartData} />
      <StatsSummary stats={calculatedStats} />
    </div>
  );
};
```

#### 6.2 Fix Prop Drilling

**File**: `src/components/SortableTable.jsx:3-11` **Complexity**: 🟡 Medium (3
hours) **Priority**: Low

```jsx
// CURRENT (TOO MANY PROPS):
export default function SortableTable({
  data, columns, initialSortField, initialSortDirection,
  className, rowClassName, headerClassName
}) {

// FIX - Use composition:
const TableProvider = ({ children, config }) => {
  return (
    <TableContext.Provider value={config}>
      {children}
    </TableContext.Provider>
  )
}

// Usage:
<TableProvider config={{ sortField, direction, styling }}>
  <SortableTable data={data} columns={columns} />
</TableProvider>
```

### 7. Code Duplication

#### 7.1 Repeated Styling Patterns

**Files**: Multiple components **Complexity**: 🟡 Medium (4 hours) **Priority**:
Low

```jsx
// CURRENT (REPEATED):
className="min-h-screen bg-gradient-to-br from-gray-800 via-gray-900 to-black text-white font-sans p-4"

// FIX - Create layout components:
// src/components/Layout/PageLayout.jsx
const PageLayout = ({ children, className = "" }) => (
  <div className={`min-h-screen bg-gradient-to-br from-gray-800 via-gray-900 to-black text-white font-sans p-4 ${className}`}>
    {children}
  </div>
)

// Usage:
<PageLayout>
  <YourPageContent />
</PageLayout>
```

#### 7.2 Duplicated Data Fetching

**Files**: useCsvData.js, useJsonData.js **Complexity**: 🟡 Medium (2 hours)
**Priority**: Medium

```js
// CREATE: src/hooks/useApiData.js
const useApiData = (url, options = {}) => {
  const { parser = 'json', transform } = options;

  return useQuery({
    queryKey: ['api-data', url, parser],
    queryFn: async () => {
      const response = await fetch(url);
      let data;

      switch (parser) {
        case 'csv':
          data = Papa.parse(await response.text(), { header: true });
          break;
        case 'json':
        default:
          data = await response.json();
      }

      return transform ? transform(data) : data;
    },
  });
};

// Replace both hooks:
const useCsvData = url => useApiData(url, { parser: 'csv' });
const useJsonData = url => useApiData(url, { parser: 'json' });
```

---

## ♿ ACCESSIBILITY ISSUES

### 8. ARIA and Semantic HTML

#### 8.1 Missing ARIA Labels

**Files**: Multiple interactive elements **Complexity**: 🟢 Easy (2 hours)
**Priority**: High

```jsx
// ADD ARIA LABELS:
<button
  onClick={handleSort}
  aria-label={`Sort by ${column.label} ${sortDirection === 'asc' ? 'descending' : 'ascending'}`}
  aria-describedby={`${column.key}-help`}
>
  {column.label}
</button>

// ADD ROLE ATTRIBUTES:
<div role="tablist">
  <button role="tab" aria-selected={isActive}>Tab 1</button>
</div>

// ADD SKIP LINKS:
<a href="#main-content" className="sr-only focus:not-sr-only">
  Skip to main content
</a>
```

#### 8.2 Poor Color Contrast

**Files**: Multiple - gray text on gray backgrounds **Complexity**: 🟡 Medium (4
hours) **Priority**: Medium

```css
/* AUDIT CURRENT COLORS:
text-gray-400 on bg-gray-800 = Contrast ratio: 4.5:1 (WCAG AA: ❌)

/* FIX - Use higher contrast:
.text-gray-300 on .bg-gray-800 = Contrast ratio: 7:1 (WCAG AAA: ✅)

/* CREATE ACCESSIBLE COLOR SYSTEM:
tailwind.config.js */
module.exports = {
  theme: {
    extend: {
      colors: {
        accessible: {
          'text-primary': '#f3f4f6',    // High contrast
          'text-secondary': '#d1d5db',  // Medium contrast
          'bg-primary': '#1f2937',      // Dark background
          'bg-secondary': '#374151'     // Lighter dark
        }
      }
    }
  }
}
```

#### 8.3 Missing Focus Management

**Files**: Modal and dropdown components **Complexity**: 🟡 Medium (6 hours)
**Priority**: Medium

```jsx
// CREATE: src/hooks/useFocusTrap.js
const useFocusTrap = isActive => {
  const containerRef = useRef();

  useEffect(() => {
    if (!isActive) return;

    const focusableElements = containerRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements?.length) {
      focusableElements[0].focus();

      const handleTab = e => {
        if (e.key === 'Tab') {
          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];

          if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      };

      document.addEventListener('keydown', handleTab);
      return () => document.removeEventListener('keydown', handleTab);
    }
  }, [isActive]);

  return containerRef;
};

// Usage in mobile menu:
const Navigation = () => {
  const trapRef = useFocusTrap(mobileMenuOpen);

  return <div ref={trapRef}>{/* Menu content */}</div>;
};
```

### 9. Keyboard Navigation

#### 9.1 Incomplete Keyboard Support

**Files**: SortableTable, chart interactions **Complexity**: 🟡 Medium (4 hours)
**Priority**: Medium

```jsx
// ADD KEYBOARD HANDLERS:
const SortableHeader = ({ column, onSort }) => {
  const handleKeyDown = e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSort(column.key);
    }
  };

  return (
    <th
      tabIndex={0}
      onClick={() => onSort(column.key)}
      onKeyDown={handleKeyDown}
      className="focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {column.label}
    </th>
  );
};
```

---

## 🔍 SEO ISSUES

### 10. Meta Tags and Structure

#### 10.1 Static Title Tags

**File**: `index.html:7` **Complexity**: 🟡 Medium (3 hours) **Priority**:
Medium

```jsx
// INSTALL: npm install react-helmet-async

// CREATE: src/components/SEO.jsx
import { Helmet } from 'react-helmet-async';

const SEO = ({ title, description, keywords }) => (
  <Helmet>
    <title>{title} | OSRS Flip Dashboard</title>
    <meta name="description" content={description} />
    <meta name="keywords" content={keywords} />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:type" content="website" />
  </Helmet>
);

// Usage in pages:
const ProfitVelocity = () => (
  <>
    <SEO
      title="Profit Velocity Analysis"
      description="Track your OSRS flipping profit velocity over time"
      keywords="OSRS, flipping, profit, velocity, oldschool runescape"
    />
    {/* Page content */}
  </>
);
```

#### 10.2 Missing Meta Descriptions

**Files**: All pages lack meta descriptions **Complexity**: 🟢 Easy (2 hours)
**Priority**: Low

```jsx
// ADD TO EACH PAGE:
const pageMetadata = {
  '/': {
    title: 'OSRS Flip Dashboard - Track Your Trading Success',
    description:
      'Professional Old School RuneScape flipping dashboard to track profits, analyze trends, and optimize your trading strategy.',
  },
  '/flip-logs': {
    title: 'Flip Logs - Detailed Trading History',
    description:
      'View detailed logs of all your OSRS flips with profit analysis and performance metrics.',
  },
  '/profit-velocity': {
    title: 'Profit Velocity - Trading Performance Analysis',
    description:
      'Analyze your OSRS flipping profit velocity and identify peak trading periods.',
  },
};
```

#### 10.3 Poor URL Structure

**Current**: `/flip-logs?date=08-16-2025` **Complexity**: 🔴 Hard (1-2 days)
**Priority**: Low

```js
// FIX - Implement proper routing:
// src/router.jsx
const routes = [
  { path: '/', component: Home },
  { path: '/flip-logs', component: FlipLogs },
  { path: '/flip-logs/:year/:month/:day', component: FlipLogs },
  { path: '/profit-velocity', component: ProfitVelocity },
  { path: '/strategy-battle', component: StrategyBattle },
];

// Usage:
// /flip-logs/2025/08/16 instead of /flip-logs?date=08-16-2025
```

---

## 🚀 PERFORMANCE ENHANCEMENTS

### 11. Image Optimization

#### 11.1 Unoptimized Images

**Files**: External logo loading **Complexity**: 🟢 Easy (1 hour) **Priority**:
Low

```jsx
// CREATE: src/components/OptimizedImage.jsx
const OptimizedImage = ({ src, alt, width, height, ...props }) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative">
      {!loaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className={`transition-opacity ${loaded ? 'opacity-100' : 'opacity-0'}`}
        {...props}
      />
    </div>
  );
};
```

### 12. Caching Strategy

#### 12.1 Improve Cache Configuration

**File**: `src/main.jsx:12-13` **Complexity**: 🟡 Medium (3 hours) **Priority**:
Medium

```js
// CURRENT (ONE SIZE FITS ALL):
staleTime: 5 * 60 * 1000, // 5 minutes
cacheTime: 10 * 60 * 1000, // 10 minutes

// FIX - Different strategies per data type:
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Historical data - cache longer
      staleTime: (query) => {
        if (query.queryKey[0] === 'historical-flips') {
          return 60 * 60 * 1000 // 1 hour
        }
        // Live data - cache shorter
        if (query.queryKey[0] === 'current-prices') {
          return 30 * 1000 // 30 seconds
        }
        return 5 * 60 * 1000 // Default 5 minutes
      }
    }
  }
})
```

#### 12.2 Add Service Worker

**Complexity**: 🔴 Hard (2-3 days) **Priority**: Low

```js
// CREATE: public/sw.js
const CACHE_NAME = 'osrs-flip-dashboard-v1';
const urlsToCache = [
  '/',
  '/static/css/main.css',
  '/static/js/main.js',
  '/assets/logos/flipping-copilot-logo.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

// REGISTER in main.jsx:
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
```

---

## 🔧 REFACTORING OPPORTUNITIES

### 13. Hooks Consolidation

#### 13.1 Create Generic Data Hook

**Files**: Multiple similar hooks **Complexity**: 🟡 Medium (4 hours)
**Priority**: Medium

```js
// CREATE: src/hooks/useApiData.js (shown above in section 7.2)
```

#### 13.2 Extract Business Logic

**File**: StrategyBattle.jsx (complex calculations) **Complexity**: 🔴 Hard (1-2
days) **Priority**: Medium

```js
// CREATE: src/hooks/useStrategyCalculations.js
const useStrategyCalculations = (flipsData, strategies) => {
  return useMemo(() => {
    const results = strategies.map(strategy => {
      const filteredFlips = flipsData.filter(strategy.filter);
      const totalProfit = filteredFlips.reduce(
        (sum, flip) => sum + flip.profit,
        0
      );
      const avgProfit = totalProfit / filteredFlips.length;

      return {
        ...strategy,
        totalProfit,
        avgProfit,
        flipCount: filteredFlips.length,
      };
    });

    return results.sort((a, b) => b.totalProfit - a.totalProfit);
  }, [flipsData, strategies]);
};
```

### 14. Utility Functions

#### 14.1 Date Handling Centralization

**Files**: Multiple date conversion functions **Complexity**: 🟡 Medium (3
hours) **Priority**: Medium

```js
// CREATE: src/utils/dateUtils.js
import { format, parse, isValid } from 'date-fns';

export class DateUtils {
  static FORMATS = {
    API: 'MM-dd-yyyy',
    DISPLAY: 'MMM dd, yyyy',
    URL: 'yyyy/MM/dd',
    ISO: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
  };

  static parse(dateString, formatType = 'API') {
    const format = this.FORMATS[formatType];
    const parsed = parse(dateString, format, new Date());

    if (!isValid(parsed)) {
      throw new Error(`Invalid date: ${dateString}`);
    }

    return parsed;
  }

  static format(date, formatType = 'DISPLAY') {
    return format(date, this.FORMATS[formatType]);
  }

  static toApiFormat(date) {
    return this.format(date, 'API');
  }

  static toDisplayFormat(date) {
    return this.format(date, 'DISPLAY');
  }
}
```

#### 14.2 Formatting Consistency

**Files**: Multiple number/currency formatting **Complexity**: 🟢 Easy (2 hours)
**Priority**: Low

```js
// CREATE: src/utils/formatUtils.js
export class FormatUtils {
  static currency(amount, options = {}) {
    const {
      currency = 'USD',
      locale = 'en-US',
      minimumFractionDigits = 0,
    } = options;

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits,
    }).format(amount);
  }

  static gp(amount) {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M gp`;
    }
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K gp`;
    }
    return `${amount.toLocaleString()} gp`;
  }

  static percentage(value, decimals = 1) {
    return `${(value * 100).toFixed(decimals)}%`;
  }

  static number(value, options = {}) {
    return value.toLocaleString('en-US', options);
  }
}
```

---

## 📁 CONFIGURATION & BUILD OPTIMIZATIONS

### 15. Development Tools

#### 15.1 Add Bundle Analyzer

**File**: `vite.config.js` **Complexity**: 🟢 Easy (30 minutes) **Priority**:
Medium

```js
// ADD TO vite.config.js:
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
});

// RUN: npm run build && npm run analyze
```

#### 15.2 Environment Configuration

**Complexity**: 🟡 Medium (2 hours) **Priority**: Medium

```js
// CREATE: .env.example
VITE_API_BASE_URL=http://localhost:3000
VITE_ENABLE_ANALYTICS=false
VITE_LOG_LEVEL=debug

// CREATE: src/config/env.js
export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'https://api.osrsflip.com',
  enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  logLevel: import.meta.env.VITE_LOG_LEVEL || 'error',
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD
}
```

### 16. Linting Configuration

#### 16.1 Enhanced ESLint Rules

**File**: `eslint.config.js` **Complexity**: 🟡 Medium (2 hours) **Priority**:
Medium

```js
// INSTALL:
npm install -D eslint-plugin-jsx-a11y eslint-plugin-react-refresh

// UPDATE eslint.config.js:
import jsxA11y from 'eslint-plugin-jsx-a11y'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  // ... existing config
  {
    plugins: {
      'jsx-a11y': jsxA11y,
      'react-refresh': reactRefresh
    },
    rules: {
      // Accessibility rules
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/anchor-has-content': 'error',
      'jsx-a11y/click-events-have-key-events': 'error',

      // Performance rules
      'react-refresh/only-export-components': 'warn',

      // Code quality
      'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
      'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn'
    }
  }
]
```

#### 16.2 Pre-commit Hooks

**Complexity**: 🟡 Medium (1 hour) **Priority**: Medium

```bash
# INSTALL:
npm install -D husky lint-staged

# SETUP:
npx husky install
npx husky add .husky/pre-commit "npx lint-staged"

# CREATE: package.json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{css,md,json}": [
      "prettier --write"
    ]
  }
}
```

---

## 🧪 TESTING IMPLEMENTATION

### 17. Testing Suite Setup

#### 17.1 Jest + React Testing Library

**Complexity**: 🔴 Hard (1 week) **Priority**: High

```bash
# INSTALL:
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event jest jest-environment-jsdom

# CREATE: jest.config.js
export default {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/**/*.test.{js,jsx}',
    '!src/test/**'
  ]
}

# CREATE: src/test/setup.js
import '@testing-library/jest-dom'
```

#### 17.2 Component Testing Examples

**Priority**: High

```js
// CREATE: src/components/__tests__/SortableTable.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import SortableTable from '../SortableTable';

const mockData = [
  { id: 1, name: 'Item 1', profit: 100 },
  { id: 2, name: 'Item 2', profit: 200 },
];

const mockColumns = [
  { key: 'name', label: 'Item Name' },
  { key: 'profit', label: 'Profit' },
];

describe('SortableTable', () => {
  test('renders table with data', () => {
    render(<SortableTable data={mockData} columns={mockColumns} />);

    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  test('sorts data when header clicked', () => {
    render(<SortableTable data={mockData} columns={mockColumns} />);

    fireEvent.click(screen.getByText('Profit'));

    // Verify sorting order changed
    const rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Item 2'); // Higher profit first
  });
});
```

#### 17.3 Hook Testing

**Priority**: Medium

```js
// CREATE: src/hooks/__tests__/useAllFlips.test.js
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import useAllFlips from '../useAllFlips';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useAllFlips', () => {
  test('fetches and processes flip data', async () => {
    const { result } = renderHook(() => useAllFlips(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
    expect(Array.isArray(result.current.data)).toBe(true);
  });
});
```

---

## 📚 DOCUMENTATION

### 18. Code Documentation

#### 18.1 JSDoc Comments

**Files**: All components and utilities **Complexity**: 🟡 Medium (1 week)
**Priority**: Low

```js
/**
 * Sortable table component with customizable columns and styling
 * @param {Object} props - Component props
 * @param {Array} props.data - Array of data objects to display
 * @param {Array} props.columns - Column configuration objects
 * @param {string} props.columns[].key - Data property key
 * @param {string} props.columns[].label - Display label
 * @param {string} [props.initialSortField] - Initial sort column
 * @param {string} [props.initialSortDirection='asc'] - Initial sort direction
 * @param {string} [props.className] - Additional CSS classes
 * @returns {JSX.Element} Rendered table component
 *
 * @example
 * <SortableTable
 *   data={flipData}
 *   columns={[
 *     { key: 'itemName', label: 'Item' },
 *     { key: 'profit', label: 'Profit' }
 *   ]}
 *   initialSortField="profit"
 * />
 */
const SortableTable = ({ data, columns, initialSortField = '', initialSortDirection = 'asc', className = '', rowClassName = '', headerClassName = '' }) => {
```

#### 18.2 API Documentation

**Complexity**: 🟡 Medium (4 hours) **Priority**: Low

````md
<!-- CREATE: docs/API.md -->

# Data Structures

## FlipData

```typescript
interface FlipData {
  itemName: string; // OSRS item name
  buyPrice: number; // Purchase price in GP
  sellPrice: number; // Sale price in GP
  profit: number; // Calculated profit (sellPrice - buyPrice)
  timestamp: string; // ISO date string
  quantity: number; // Number of items flipped
  margin: number; // Profit margin percentage
}
```
````

## CSV File Format

Expected CSV columns:

- `Item Name`: String
- `Buy Price`: Number (GP)
- `Sell Price`: Number (GP)
- `Date`: MM-DD-YYYY format
- `Quantity`: Integer

````

### 19. Setup Documentation

#### 19.1 Enhanced README
**Complexity**: 🟡 Medium (3 hours)
**Priority**: Low

```md
<!-- UPDATE: README.md -->
# OSRS Flip Dashboard

Professional Old School RuneScape flipping tracker with advanced analytics.

## Features
- 📊 Real-time profit tracking
- 📈 Velocity analysis and trends
- ⚔️ Strategy battle comparisons
- 📱 Responsive design
- 🔍 Advanced filtering and search

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation
```bash
git clone <repo-url>
cd osrs-flip-dashboard
npm install
npm run dev
````

### Data Setup

1. Place CSV files in `public/data/` directory
2. Use format: `MM-DD-YYYY.csv`
3. Required columns: Item Name, Buy Price, Sell Price, Date, Quantity

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run test` - Run test suite
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript checks

### Project Structure

```
src/
├── components/     # Reusable UI components
├── pages/         # Route components
├── hooks/         # Custom React hooks
├── utils/         # Utility functions
├── types/         # TypeScript definitions
└── test/          # Test utilities
```

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request

## Performance

- Bundle size: <600KB gzipped
- Lighthouse score: 95+
- Core Web Vitals: All green

```

---

## ⏱️ IMPLEMENTATION TIMELINE

### Phase 1: Critical Security & Performance (Week 1-2)
- ✅ Fix external image vulnerability
- ✅ Remove console logging in production
- ✅ Implement data pagination
- ✅ Add error boundaries
- ✅ Fix date handling inconsistencies

### Phase 2: Accessibility & Quality (Week 3-4)
- ♿ Add ARIA labels and keyboard navigation
- 🎯 Start TypeScript migration (utils first)
- 🧪 Set up testing framework
- 🔧 Implement pre-commit hooks

### Phase 3: Performance & Architecture (Week 5-8)
- ⚡ Bundle optimization and code splitting
- 🏗️ Component refactoring (break down large files)
- 💾 Advanced caching strategies
- 🔄 Complete TypeScript migration

### Phase 4: Polish & Enhancement (Week 9-12)
- 🔍 SEO improvements and meta tags
- 📱 Service worker implementation
- 📚 Comprehensive documentation
- 🧪 Full test coverage

---

## 📊 COMPLEXITY BREAKDOWN

### 🟢 Easy (1-4 hours each)
- External image fix
- Console logging cleanup
- ARIA label additions
- Bundle analyzer setup
- Basic documentation

### 🟡 Medium (4 hours - 2 days each)
- Date utility centralization
- Error boundary implementation
- Component prop drilling fixes
- Accessibility improvements
- Cache strategy optimization

### 🔴 Hard (2 days - 2 weeks each)
- TypeScript migration
- Large component refactoring
- Comprehensive testing setup
- Bundle optimization
- Service worker implementation

### 🔴 Very Hard (2-4 weeks each)
- Complete TypeScript conversion
- Full test coverage implementation
- Performance optimization overhaul

---

## 🎯 RECOMMENDED PRIORITY ORDER

1. **Security fixes** (Critical - Do first)
2. **Performance pagination** (Critical - User experience)
3. **TypeScript setup** (High - Developer experience)
4. **Testing framework** (High - Code reliability)
5. **Accessibility** (High - User inclusivity)
6. **Component refactoring** (Medium - Maintainability)
7. **Bundle optimization** (Medium - Performance)
8. **SEO improvements** (Low - Discoverability)
9. **Documentation** (Low - Team efficiency)

Total estimated effort: **8-12 weeks** for complete implementation

Each item includes specific file locations, code examples, and complexity ratings to help prioritize and implement systematically.
```
