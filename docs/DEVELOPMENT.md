# Development Guide 🛠️

Complete guide for setting up and contributing to the OSRS Flip Dashboard project.

## 📋 Table of Contents

- [Getting Started](#getting-started)
- [Development Environment](#development-environment)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing Guide](#testing-guide)
- [Debugging](#debugging)
- [Performance](#performance)

## 🚀 Getting Started

### System Requirements

```bash
# Required versions
Node.js >= 18.17.0 (LTS recommended)
npm >= 9.0.0 or yarn >= 1.22.0
Git >= 2.25.0

# Recommended system specs
RAM: 8GB+ (for smooth development)
Storage: 2GB free space
OS: Windows 10+, macOS 12+, Ubuntu 20.04+
```

### Initial Setup

```bash
# 1. Clone repository
git clone https://github.com/your-username/osrs-flip-dashboard.git
cd osrs-flip-dashboard

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env.local

# 4. Start development server
npm run dev

# 5. Verify installation
# Navigate to http://localhost:3000
# You should see the dashboard loading
```

### Verify Installation

```bash
# Check all systems
npm run check-setup     # (custom script to verify everything)

# Or manually verify:
npm run lint           # Should pass with no errors
npm test              # Should run test suite
npm run typecheck     # Should pass TypeScript checks
npm run build         # Should create production build
```

## 🖥️ Development Environment

### Required Tools

```bash
# Essential development tools
VS Code              # Recommended editor
Chrome DevTools      # Primary debugging
React DevTools       # React debugging
TanStack Query DevTools  # Query debugging

# Optional but recommended
Git Kraken          # Git GUI
Postman            # API testing (if applicable)
Figma              # Design assets
```

### VS Code Configuration

Create `.vscode/settings.json`:

```json
{
  "typescript.suggest.autoImports": true,
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "emmet.includeLanguages": {
    "javascript": "javascriptreact",
    "typescript": "typescriptreact"
  },
  "files.associations": {
    "*.css": "tailwindcss"
  }
}
```

Recommended extensions:
```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint", 
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "ms-vscode.vscode-json",
    "christian-kohler.path-intellisense",
    "visualstudioexptteam.vscodeintellicode"
  ]
}
```

### Environment Variables

Create `.env.local` for development:

```env
# Development mode
VITE_DEV_MODE=true
VITE_LOG_LEVEL=debug

# API Configuration
VITE_API_BASE_URL=http://localhost:3000
VITE_DATA_BASE_URL=/data

# Feature Flags
VITE_ENABLE_CACHE_MONITOR=true
VITE_ENABLE_DEVTOOLS=true
VITE_ENABLE_PWA=false

# Analytics (leave empty for privacy)
VITE_ANALYTICS_ID=
VITE_ANALYTICS_ENABLED=false

# Performance Monitoring
VITE_ENABLE_PERFORMANCE_MONITORING=true
VITE_BUNDLE_ANALYZER=false
```

## 📁 Project Structure Deep Dive

### Source Code Organization

```
src/
├── components/                 # React components
│   ├── charts/                # Chart-specific components
│   │   ├── NetWorthChart.jsx
│   │   ├── DailyProfitChart.jsx
│   │   └── WeekdayPerformanceChart.jsx
│   ├── layouts/               # Layout components
│   │   ├── PageContainer.jsx
│   │   ├── CardContainer.jsx
│   │   ├── PageHeader.jsx
│   │   └── index.js          # Barrel exports
│   ├── ui/                   # Basic UI components
│   │   ├── LoadingSpinner.jsx
│   │   ├── ErrorBoundary.jsx
│   │   └── SearchControls.jsx
│   └── [feature]/            # Feature-specific components
│       ├── StrategyBattle/
│       └── ItemCards/
├── hooks/                    # Custom React hooks
│   ├── useApiData.ts         # Data fetching hook
│   ├── useAllFlips.js        # Trading data hook
│   ├── useCsvData.js         # CSV processing hook
│   └── __tests__/           # Hook tests
├── pages/                   # Route components
│   ├── Home.jsx
│   ├── Items.jsx
│   ├── FlipLogs.jsx
│   ├── Charts.jsx
│   └── ProfitVelocity.jsx
├── utils/                   # Utility functions
│   ├── cacheManager.ts      # Advanced caching
│   ├── dateUtils.ts         # Date manipulation
│   ├── formatUtils.ts       # Data formatting
│   ├── analytics.ts         # Privacy analytics
│   └── logger.ts           # Logging utility
├── types/                   # TypeScript definitions
│   ├── index.ts            # Main type exports
│   ├── api.ts              # API response types
│   └── components.ts       # Component prop types
└── tests/                  # Test utilities
    ├── utils/
    │   ├── testUtils.tsx   # RTL helpers
    │   └── mockData.ts     # Test data
    └── __mocks__/          # Module mocks
```

### Component Patterns

#### 1. Page Components

```typescript
// Pattern: Composition over inheritance
export default function PageName() {
  // 1. Data fetching
  const { data, loading, error } = usePageData();
  
  // 2. Early returns for states
  if (loading) return <LoadingLayout />;
  if (error) return <ErrorLayout error={error} />;
  
  // 3. Main render with layout composition
  return (
    <PageContainer>
      <CardContainer>
        <PageHeader title="Page Title" />
        <PageContent data={data} />
      </CardContainer>
    </PageContainer>
  );
}
```

#### 2. Data Components

```typescript
// Pattern: Custom hooks for data logic
function usePageData() {
  const { data: rawData, loading, error } = useApiData('/api/endpoint');
  
  // Business logic transformation
  const processedData = useMemo(() => {
    if (!rawData) return null;
    return transformData(rawData);
  }, [rawData]);
  
  return { data: processedData, loading, error };
}
```

#### 3. UI Components

```typescript
// Pattern: Prop types and forwarded refs
interface ButtonProps {
  variant: 'primary' | 'secondary';
  size: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant, size, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'base-button',
          variants[variant],
          sizes[size]
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
```

## 🔄 Development Workflow

### Daily Development

```bash
# 1. Start development
git pull origin main              # Get latest changes
npm install                       # Update dependencies
npm run dev                       # Start dev server

# 2. Development cycle
# - Make changes
# - See live updates (HMR)
# - Write tests
# - Run tests: npm test

# 3. Before committing
npm run lint:fix                  # Fix linting issues
npm run format                    # Format code
npm run typecheck                # Check TypeScript
npm test                         # Run test suite
npm run build                    # Verify production build

# 4. Commit changes
git add .
git commit -m "feat: add new feature"
git push origin feature-branch
```

### Feature Development

```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Implement feature
# - Add components
# - Add tests
# - Update types
# - Add documentation

# 3. Test thoroughly
npm run test:coverage           # Check test coverage
npm run build:analyze          # Check bundle size
npm run lighthouse             # Performance audit

# 4. Create pull request
git push origin feature/new-feature
# Open PR on GitHub
```

### Hot Module Replacement (HMR)

The development server supports instant updates:

```typescript
// HMR preserves state during development
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    // Custom HMR logic if needed
  });
}
```

### Development Servers

```bash
# Default development server
npm run dev                    # http://localhost:3000

# Network accessible (for mobile testing)
npm run dev:host              # http://0.0.0.0:3000

# Production preview
npm run build && npm run preview  # Test production build
```

## 📏 Code Standards

### ESLint Configuration

```javascript
// .eslintrc.js - Key rules
module.exports = {
  rules: {
    // React specific
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    'react/prop-types': 'off', // Using TypeScript instead
    
    // TypeScript
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
    
    // Code quality
    'prefer-const': 'error',
    'no-var': 'error',
    'no-console': 'off', // Allowed for debugging
    
    // Accessibility
    'jsx-a11y/alt-text': 'warn',
    'jsx-a11y/aria-props': 'warn',
  }
};
```

### Prettier Configuration

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "avoid"
}
```

### TypeScript Guidelines

```typescript
// 1. Use interfaces for object shapes
interface FlipData {
  itemName: string;
  profit: number;
  timestamp: Date;
}

// 2. Use types for unions and computed types
type ViewMode = 'table' | 'cards';
type FlipStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

// 3. Use generic constraints
function processData<T extends FlipData>(data: T[]): ProcessedData<T> {
  // Implementation
}

// 4. Avoid 'any', use 'unknown' if needed
function parseData(raw: unknown): FlipData {
  // Type guards and validation
}
```

### Component Guidelines

```typescript
// 1. Use functional components with hooks
function MyComponent({ data }: Props) {
  const [state, setState] = useState(initial);
  return <div>{data}</div>;
}

// 2. Extract custom hooks for logic
function useFlipData(date: string) {
  return useApiData(`/data/${date}/flips.csv`);
}

// 3. Use memo for expensive computations
const expensiveValue = useMemo(() => {
  return heavyComputation(data);
}, [data]);

// 4. Use callback for event handlers
const handleClick = useCallback(() => {
  // Handler logic
}, [dependencies]);
```

### File Naming Conventions

```
# React components
PascalCase.jsx/tsx          # MyComponent.jsx
  
# Hooks
camelCase.js/ts             # useMyHook.ts

# Utilities
camelCase.js/ts             # formatUtils.ts

# Pages
PascalCase.jsx              # HomePage.jsx

# Types
camelCase.ts                # userTypes.ts

# Tests
*.test.js/tsx               # MyComponent.test.tsx
*.spec.js/tsx               # integration.spec.tsx
```

## 🧪 Testing Guide

### Testing Stack

- **Jest** - Test runner and assertions
- **React Testing Library** - Component testing
- **MSW** - API mocking (if needed)
- **Testing Utils** - Custom helpers

### Test Structure

```typescript
// Component test template
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MyComponent from '../MyComponent';

describe('MyComponent', () => {
  let queryClient: QueryClient;
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
  });
  
  it('should render correctly', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MyComponent data={mockData} />
      </QueryClientProvider>
    );
    
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
  
  it('should handle user interactions', async () => {
    render(<MyComponent />);
    
    fireEvent.click(screen.getByRole('button'));
    
    await waitFor(() => {
      expect(screen.getByText('Updated Text')).toBeInTheDocument();
    });
  });
});
```

### Testing Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test MyComponent.test.tsx

# Run tests with coverage
npm run test:coverage

# Update snapshots
npm test -- --updateSnapshot
```

### Testing Best Practices

1. **Test User Behavior** - Focus on what users see and do
2. **Avoid Implementation Details** - Don't test internal state
3. **Use Queries Properly** - Prefer `getByRole`, `getByText`
4. **Mock External Dependencies** - Keep tests isolated
5. **Write Descriptive Tests** - Clear test names and assertions

## 🐛 Debugging

### Browser DevTools

```typescript
// Debug React components
// 1. Install React DevTools extension
// 2. Components tab shows component tree
// 3. Profiler tab shows performance

// Debug TanStack Query
// 1. Query DevTools show query state
// 2. Network tab shows HTTP requests
// 3. Application tab shows cache storage
```

### Cache Debugging

```typescript
// Enable cache monitor in development
// Press Ctrl+Shift+C to toggle cache monitor
// Shows hit rates, memory usage, etc.

// Manual cache inspection
import { CacheUtils } from '../utils/cacheManager';

// In browser console:
CacheUtils.getAllStats();  // Get cache statistics
CacheUtils.clearAll();     // Clear all caches
```

### Logging

```typescript
// Development logging
import logger from '../utils/logger';

logger.debug('Debug message', { data });
logger.info('Info message');
logger.warn('Warning message');
logger.error('Error message', error);

// Enable detailed logging
localStorage.setItem('debug', 'osrs:*');
```

### Common Issues

**Build Errors**:
```bash
# Clear everything and rebuild
rm -rf node_modules package-lock.json dist
npm install
npm run build
```

**TypeScript Errors**:
```bash
# Check TypeScript version
npx tsc --version

# Run type checking
npm run typecheck

# Check tsconfig.json for correct paths
```

**Performance Issues**:
```bash
# Analyze bundle size
npm run build:analyze

# Check for memory leaks
# Use Chrome DevTools Memory tab
```

## ⚡ Performance

### Development Performance

```bash
# Enable Fast Refresh
# Vite has this enabled by default

# Use React DevTools Profiler
# Identify slow components

# Monitor bundle size
npm run build:analyze
```

### Build Performance

```typescript
// Vite configuration for speed
export default defineConfig({
  esbuild: {
    target: 'es2020',
    format: 'esm',
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
    exclude: ['@vite/client'],
  },
});
```

### Runtime Performance

```typescript
// Use React.memo for expensive components
const ExpensiveComponent = React.memo(function ExpensiveComponent({ data }) {
  return <div>{expensiveRender(data)}</div>;
});

// Use useMemo for expensive calculations
const result = useMemo(() => {
  return expensiveCalculation(data);
}, [data]);

// Use useCallback for event handlers
const handleClick = useCallback(() => {
  // Handler logic
}, [dependencies]);
```

## 🚀 Advanced Development

### Custom Hooks Development

```typescript
// Template for custom hooks
function useCustomHook(param: string) {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    // Hook logic
  }, [param]);
  
  return { state, loading, error };
}
```

### Component Testing

```typescript
// Test custom hooks
import { renderHook, act } from '@testing-library/react';

test('useCustomHook should work', () => {
  const { result } = renderHook(() => useCustomHook('test'));
  
  expect(result.current.loading).toBe(false);
  
  act(() => {
    // Trigger hook action
  });
  
  expect(result.current.state).toBe('expected');
});
```

### Performance Monitoring

```typescript
// Use React DevTools Profiler API
import { Profiler } from 'react';

function onRenderCallback(id, phase, actualDuration) {
  console.log('Render performance:', { id, phase, actualDuration });
}

<Profiler id="MyComponent" onRender={onRenderCallback}>
  <MyComponent />
</Profiler>
```

---

This development guide should help you get up and running quickly while maintaining high code quality and performance standards. Happy coding! 🚀