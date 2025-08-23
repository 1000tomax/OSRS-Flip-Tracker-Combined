# OSRS Flip Dashboard — Update Plan

> **Status**: Ready for implementation  
> **Created**: 2025-08-23  
> **Priority**: Critical → Performance → Quality → Nice-to-have

## 🔴 Critical Fixes (Immediate)

### 1. Fix Jest Configuration

- [ ] **File**: `jest.config.js`
- [ ] Fix `moduleNameMapping` → `moduleNameMapper`
- [ ] Add proper transform configuration:

```js
export default {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)': 'identity-obj-proxy',
    '\\.(gif|ttf|eot|svg|png|jpg|jpeg)':
      '<rootDir>/src/tests/__mocks__/fileMock.js',
  },
  transform: {
    '^.+\\.(t|j)sx?': [
      'babel-jest',
      {
        presets: [
          '@babel/preset-env',
          '@babel/preset-react',
          '@babel/preset-typescript',
        ],
      },
    ],
  },
};
```

### 2. ~~Resolve React Query Dependency~~ ✅ FIXED

- [x] **Decision Required**: Choose one approach
  - ~~**Option A (Keep)**: `npm i @tanstack/react-query` and wrap app in
    `QueryClientProvider` in `src/main.jsx`~~
  - **Option B (Remove)**: ✅ Deleted unused React Query hooks/imports,
    consolidated on existing fetch hooks

### 3. Replace Alert() with Toast Notifications

- [ ] Install toast library: `npm i sonner`
- [ ] Add toaster to root (`src/App.jsx` or `src/main.jsx`):

```jsx
import { Toaster } from 'sonner';
// in JSX: <Toaster richColors closeButton />
```

- [ ] Replace all `alert()` calls with `toast.info/success/error()`
- [ ] **Files to update**:
  - `src/lib/imageExport.js:108`
  - `src/components/DailyProfitChart.jsx:104`
  - `src/pages/FlipLogs.jsx:232`
  - `src/components/NetWorthChart.jsx:100`
  - `src/pages/Items.jsx:75`
  - `src/components/WeekdayPerformanceChart.jsx:139`

### 4. Unified Challenge Date Configuration

- [ ] Create `data-processing/config.cjs`:

```js
module.exports = {
  CHALLENGE_START_ISO: '2025-07-28T05:00:00Z', // midnight CT
  DAY0_BASELINE: '07-27-2025',
};
```

- [ ] Import in `parser.cjs` and `summaryBuilder.cjs` instead of hard-coding

### 5. Fresh Data by Default (PWA)

- [ ] Update `vite.config.js` to use NetworkFirst for data:

```js
workbox: {
  runtimeCaching: [
    {
      urlPattern: /\/data\/.*\.(json|csv)$/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'data-cache',
        networkTimeoutSeconds: 3,
        expiration: { maxEntries: 200, maxAgeSeconds: 60 * 30 },
      },
    },
  ];
}
```

- [ ] Append `?v=${meta.lastUpdated}` from `/data/meta.json` to all data fetches
- [ ] Use `{ cache: 'reload' }` for fetch calls

### 6. Disable Production Sourcemaps

- [ ] Update `vite.config.js`:

```js
build: {
  sourcemap: process.env.SOURCEMAP === 'true';
}
```

- [ ] Build with `SOURCEMAP=true` only when debugging

### 7. ~~Remove Stray File~~ ✅ FIXED

- [x] Delete: `Users18159osrs-flip-dashboardpublicflipping-copilot-logo.png` ✅
      Removed

### 8. Add Circular Dependency Check

- [ ] Add to `package.json` scripts:

```json
"deps:check": "npx madge --circular --extensions js,jsx,ts,tsx src"
```

- [ ] Run in CI and before builds

## 🟡 Performance & Bundle Optimization

### 1. Pagination for Flip Data

- [ ] Refactor `src/hooks/useAllFlips.js` to accept `{limit=7, offset=0}`
- [ ] Implement lazy loading per day
- [ ] Add "Load more days" button
- [ ] Consider virtualization: `@tanstack/react-virtual` or `react-window`

### 2. Off-Thread CSV Parsing

- [ ] Ensure `Papa.parse(..., { worker: true })`
- [ ] Limit concurrency to 3-5 files at a time

### 3. Split Vendor Bundle

- [ ] Update `vite.config.js`:

```js
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        react: ['react','react-dom'],
        router: ['react-router-dom'],
        charts: ['recharts'],
        csv: ['papaparse']
      }
    }
  }
}
```

- [ ] Keep chart pages behind route-level lazy imports

## 🟢 Code Quality Improvements

### 1. TypeScript Strict Mode (Gradual)

- [ ] Enable strict mode incrementally
- [ ] Start with `noImplicitAny: false`, then progressively enable
- [ ] Standardize extensions: `.tsx` for components, `.ts` for utilities

### 2. ~~Clean Unused Code~~ ✅ PARTIALLY FIXED

- [ ] Run `npm run lint -- --fix`
- [x] Remove `src/App.working.jsx` if unused ✅ Removed
- [ ] Clean up unused imports in all components

### 3. Add High-Value Tests

- [ ] **Parser test**: Feed small `flips.csv`, assert output shapes
- [ ] **Summary builder test**: Validate Day 0 and rolling calculations
- [ ] Add coverage targets and reporting (coverage, lcov, html)

### 4. Error Boundaries for Data Routes

- [ ] Wrap each lazy page with ErrorBoundary
- [ ] Show retry functionality on errors

### 5. State Management (Optional)

- [ ] If prop drilling becomes issue: Add Zustand for UI state
- [ ] Avoid Redux for this use case

## 🛡️ Security & Accessibility

### 1. CSV Formula Injection Protection

- [ ] Add to `data-processing/utils.cjs`:

```js
function toCSVCell(val) {
  let str = val == null ? '' : String(val);
  if (/^[=+\-@]/.test(str)) str = "'" + str; // neutralize formulas
  if (/[,\"\n]/.test(str)) return '"' + str.replace(/"/g, '""') + '"';
  return str;
}
export { toCSVCell };
```

### 2. Keyboard & ARIA Improvements

- [ ] Add skip link:
      `<a href="#main" class="sr-only focus:not-sr-only">Skip to content</a>`
- [ ] Ensure focus-visible styles in dark mode
- [ ] Verify table semantics and control labels

## 📱 Mobile & Capture Improvements

### 1. Canvas Capture Safe Mode

- [ ] Create `src/styles/capture.css`:

```css
.capture-mode,
.capture-mode * {
  color-scheme: light;
}
```

- [ ] Toggle during capture:

```js
document.documentElement.classList.add('capture-mode');
// capture…
document.documentElement.classList.remove('capture-mode');
```

- [ ] Consider `html-to-image` as fallback if needed

## 🧰 Repository Hygiene

### 1. Update .gitignore

- [ ] Add `coverage/`
- [ ] Ensure `dist/` isn't committed

### 2. Configurable Input Paths

- [ ] Allow `FLIPS_FILE` env override for local paths
- [ ] Add `.env.example` with documentation

## ✨ Future Enhancements (Defer)

- [ ] Saved filter presets (localStorage)
- [ ] GP/hour and ROI trend panels on Summary
- [ ] Export improvements (CSV/Excel)
- [ ] PDF export (optional)

## 📋 Implementation Notes

### Constraints

- Maintain zero-cost, static deploy (no WebSockets/servers)
- No paid services or non-static backends
- Keep dates as **MM-DD-YYYY** format

### Validation Checklist

After implementing changes, verify:

```bash
npm run deps:check
npm run build
npm run test
```

- [ ] PWA shows fresh data
- [ ] No circular dependencies
- [ ] Tests pass
- [ ] Build succeeds without warnings

## 🎯 Priority Order

1. **Week 1**: Critical fixes (Jest, React Query, alerts, dates, PWA cache)
2. **Week 2**: Performance (pagination, bundle splitting, worker threads)
3. **Week 3**: Quality (TypeScript, testing, error handling)
4. **Week 4**: Polish (accessibility, mobile capture, state management)
5. **Future**: Nice-to-haves (saved filters, advanced exports)

---

_Generated from combined analysis by Claude and GPT_  
_Last updated: 2025-08-23_
