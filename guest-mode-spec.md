# Guest Mode Implementation Spec - Flipping Copilot Only

## Overview

Add a guest mode to OSRS Flip Dashboard at `mreedon.com/guest` where visitors
can upload their `flips.csv` from Flipping Copilot and instantly see their data
visualized. 100% client-side, completely isolated from your personal data.

## Design Philosophy & Justifications

### Why These Choices?

**Single Format Support (Flipping Copilot only)**

- **Why:** Your data pipeline already handles this format. If Flipping Copilot
  changes their schema, you'd need to update your main site anyway - so you'd
  update both at once.
- **Not doing:** Column mapping UI, format detection, or multi-format support.
  This eliminates 40% of complexity for a feature no one needs.

**Combine All Accounts**

- **Why:** Most users want total profit across alts. Those who want individual
  analysis can export accounts separately from Flipping Copilot.
- **Not doing:** Account filtering dropdown. Adds UI complexity for a problem
  that's already solved at the export level.

**Chrome Desktop Only**

- **Why:** You use Chrome. The Flipping Copilot community likely uses desktop
  for RuneLite. Why spend time on Safari quirks or mobile optimization for users
  that don't exist?
- **Not doing:** Browser polyfills, mobile responsive design, or compatibility
  fixes. "Try Chrome on desktop" is a perfectly valid solution.

**No Data Persistence**

- **Why:** Privacy-first approach. No GDPR concerns, no data storage costs, no
  security vulnerabilities. Users expect guest mode to be temporary.
- **Not doing:** localStorage, IndexedDB, or any persistence. Refresh = start
  over is simple and secure.

**Stream Processing in Worker**

- **Why:** Process data as it's parsed instead of accumulating everything first.
  Reduces memory by ~50% and provides real-time progress updates.
- **Doing differently than typical:** Most implementations parse all → then
  process. We process during parsing for better performance.

## What We're NOT Building (And Why)

### Features Intentionally Excluded

**❌ Timezone Toggle/Selector**

- **Why not:** Users expect to see dates in their local timezone. Adding a
  toggle adds complexity for no real benefit.
- **GPT suggested it but:** Overcomplicates the UI. Browser timezone is the
  right default.

**❌ Import ZIP Function**

- **Why not:** Adds complexity for minimal benefit. Users can just re-upload
  their CSV.
- **GPT suggested it but:** If they want to analyze the same data again, they
  still have their original CSV.

**❌ Profit Verification Badge**

- **Why not:** If there's a mismatch, it's likely a Flipping Copilot issue. We
  just use their profit or calculate it.
- **GPT suggested it but:** Warning badges would confuse users without providing
  actionable information.

**❌ Account Filter Dropdown**

- **Why not:** Users who want per-account analysis can export accounts
  separately from Flipping Copilot.
- **GPT suggested it but:** This adds UI complexity and state management for a
  problem already solved upstream.

**❌ Perfect Timezone Handling (date-fns-tz)**

- **Why not:** Intl.DateTimeFormat works perfectly fine for our needs.
- **GPT suggested it but:** Extra dependency for no real benefit. Built-in
  browser APIs are sufficient.

**❌ Shared Utils Module**

- **Why not:** Can refactor later if needed. For v1, some code duplication is
  fine.
- **GPT suggested it but:** Premature optimization. Ship first, refactor later.

**❌ Progress Elapsed Time Display**

- **Why not:** Row count is sufficient feedback. Time doesn't add value.
- **GPT suggested it but:** Extra complexity in the UI for marginal benefit.

**❌ Mobile Responsive Design**

- **Why not:** RuneLite users are on desktop. Why optimize for users that don't
  exist?
- **Save the effort:** "Try Chrome on desktop" is a valid solution.

**❌ File Size Limits**

- **Why not:** Your months of data is 1.8MB. Even 10x that is trivial for modern
  browsers.
- **Unnecessary complexity:** Why add limits when there's no actual problem?

---

## Core Principles

- ✅ Only accepts Flipping Copilot `flips.csv` format (no other formats)
- ✅ Zero backend - everything runs in the browser
- ✅ **Complete isolation** - Guest mode never touches your personal data
- ✅ Process large CSVs without freezing UI (Web Worker + streaming)
- ✅ Visually distinct UI makes it clear when in guest mode

## Browser Behavior & Session Management

### What Happens When...

**User refreshes the page (F5):**

- All guest data is lost (it's only in memory)
- User is redirected to `/guest` upload page
- Must re-upload CSV to continue

**User clicks browser back button:**

- From `/guest/dashboard` → goes back to `/guest` (upload page)
- Data remains in memory until they upload a new file or refresh

**User tries to bookmark `/guest/dashboard`:**

- When they return to bookmark later, redirected to `/guest` upload page
- No data persistence between sessions

**User navigates away and comes back (same session):**

- If they go to your main site then back to `/guest/dashboard`, data is retained
- Only lost on page refresh or closing tab

**User uploads a new CSV:**

- Previous data is completely replaced
- Confirmation prompt prevents accidental data loss

### This is Intentional Because:

- **Privacy first** - No data stored anywhere
- **Simple UX** - Always start with upload
- **No confusion** - Can't accidentally view old/stale data
- **Security** - Nothing persists after session

---

## Implementation Plan for Claude Code

### Step 1: Install Dependencies

```bash
npm install papaparse jszip react-dropzone
```

### Step 2: Create Project Structure

Create the following file structure:

```
src/
  data/
    data-source/
      DataSourceContext.jsx       # Context for switching data sources
      StaticFilesDataSource.js    # Current behavior (fetch from /data/)
      InMemoryDataSource.js       # Guest mode data (from processed CSV)

  guest/
    GuestPage.jsx                # Main guest mode page
    components/
      CsvDropzone.jsx            # Drag & drop upload component
      ProcessingStatus.jsx       # Progress indicator during processing
      GuestBanner.jsx            # "Data never leaves your browser" notice

  workers/
    guestProcessor.worker.js     # Web Worker for CSV processing

  lib/
    processing/
      processGuestCsv.js         # Main processing logic
      validateCsvFormat.js       # Validate it's a Flipping Copilot CSV
      deduplicateFlips.js        # Remove duplicate flips
      buildDailySummaries.js     # Create daily summaries
      buildItemStats.js          # Create item statistics
```

---

### Step 3: Data Isolation Architecture

**Important**: Guest mode is completely isolated from your personal data. We'll
use separate contexts and state management to ensure no data mixing.

#### `src/guest/contexts/GuestDataContext.jsx`

```jsx
import { createContext, useContext, useState, useMemo } from 'react';

const GuestDataContext = createContext();

export const useGuestData = () => {
  const context = useContext(GuestDataContext);
  if (!context)
    throw new Error('useGuestData must be used within GuestDataProvider');
  return context;
};

export function GuestDataProvider({ children }) {
  const [guestData, setGuestData] = useState(null);
  const [processingStats, setProcessingStats] = useState(null);

  const value = useMemo(
    () => ({ guestData, setGuestData, processingStats, setProcessingStats }),
    [guestData, processingStats]
  );

  return (
    <GuestDataContext.Provider value={value}>
      {children}
    </GuestDataContext.Provider>
  );
}
```

#### Keep Your Existing DataSource for Personal Data

Your existing `DataSourceContext` remains unchanged and is ONLY used for your
personal dashboard:

````

#### `src/data/data-source/StaticFilesDataSource.js`

```jsx
// Existing data fetching logic wrapped in this interface
export default class StaticFilesDataSource {
  async getMeta() {
    const response = await fetch('/data/meta.json');
    return await response.json();
  }

  async getDailySummaries() {
    const response = await fetch('/data/daily-summary/summary.json');
    return await response.json();
  }

  async getItemStats() {
    const response = await fetch('/data/item-stats.csv');
    const text = await response.text();
    // Parse CSV to array of objects
    return parseItemStatsCsv(text);
  }

  async getFlipsByDate(year, month, day) {
    const response = await fetch(`/data/processed-flips/${year}/${month}/${day}/flips.csv`);
    const text = await response.text();
    return parseFlipsCsv(text);
  }
}
````

#### `src/data/data-source/InMemoryDataSource.js`

```jsx
export default class InMemoryDataSource {
  constructor(data) {
    this.meta = {
      source: 'guest',
      last_updated: new Date().toISOString(),
      timezone:
        data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
    this.dailySummaries = data.dailySummaries;
    this.itemStats = data.itemStats;
    this.flipsByDate = data.flipsByDate; // Plain object: { "MM-DD-YYYY": flips[] }
  }

  async getMeta() {
    return this.meta;
  }

  async getDailySummaries() {
    return this.dailySummaries;
  }

  async getItemStats() {
    return this.itemStats;
  }

  async getFlipsByDate(year, month, day) {
    const dateKey = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}-${year}`;
    return this.flipsByDate[dateKey] || []; // Access plain object property
  }
}
```

---

### Step 4: Guest Mode UI Components

#### `src/guest/GuestModeApp.jsx` (Main Guest Entry Point)

```jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { GuestDataProvider, useGuestData } from './contexts/GuestDataContext';
import GuestUploadPage from './pages/GuestUploadPage';
import GuestDashboard from './pages/GuestDashboard';

// Protected route component - redirects to upload if no data
function RequireGuestData({ children }) {
  const { guestData } = useGuestData();

  // No data? Always redirect to upload page
  if (!guestData) {
    return <Navigate to="/guest" replace />;
  }

  return children;
}

// This is a completely separate "app" for guest mode
export default function GuestModeApp() {
  return (
    <GuestDataProvider>
      {/* Different background color to make it visually distinct */}
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-purple-900">
        {/* Persistent banner across all guest pages */}
        <div className="bg-yellow-500 text-black p-2 text-center font-bold sticky top-0 z-50">
          🔒 GUEST MODE - Your data never leaves this browser
        </div>

        <Routes>
          {/* Upload is always accessible */}
          <Route path="/" element={<GuestUploadPage />} />

          {/* Dashboard requires data to be uploaded first */}
          <Route
            path="/dashboard"
            element={
              <RequireGuestData>
                <GuestDashboard />
              </RequireGuestData>
            }
          />

          {/* Any other guest routes redirect to upload */}
          <Route path="/*" element={<Navigate to="/guest" replace />} />
        </Routes>
      </div>
    </GuestDataProvider>
  );
}
```

#### `src/guest/pages/GuestUploadPage.jsx`

```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGuestData } from '../contexts/GuestDataContext';
import CsvDropzone from '../components/CsvDropzone';
import ProcessingStatus from '../components/ProcessingStatus';
export default function GuestUploadPage() {
  const [step, setStep] = useState('upload'); // 'upload' | 'processing' | 'complete'
  const { guestData, setGuestData, setProcessingStats } = useGuestData();
  const navigate = useNavigate();

  // If user already has data and came back to upload page
  const hasExistingData = !!guestData;

  const handleFileSelect = async file => {
    // If they have existing data, confirm replacement
    if (hasExistingData) {
      const confirmed = confirm(
        'This will replace your current data. Continue?'
      );
      if (!confirmed) return;
    }

    setStep('processing');

    // Get browser timezone
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

    // Create Web Worker
    const worker = new Worker(
      new URL('../workers/guestProcessor.worker.js', import.meta.url),
      { type: 'module' }
    );

    // Handle messages from worker
    worker.onmessage = e => {
      if (e.data.type === 'PROGRESS') {
        setProcessingStats({
          rowsProcessed: e.data.rowsProcessed,
          totalRows: e.data.totalRows,
        });
      } else if (e.data.type === 'COMPLETE') {
        setGuestData(e.data.result);
        setStep('complete');
        worker.terminate(); // Clean up worker

        // Navigate to guest dashboard
        setTimeout(() => navigate('/guest/dashboard'), 500);
      } else if (e.data.type === 'ERROR') {
        alert(`Error processing CSV: ${e.data.message}`);
        setStep('upload');
        worker.terminate(); // Clean up worker
      }
    };

    // Handle worker errors
    worker.onerror = error => {
      alert(`Processing error: ${error.message}`);
      setStep('upload');
      worker.terminate();
    };

    // Handle message errors (malformed messages)
    worker.onmessageerror = event => {
      console.error('Worker message error:', event);
      alert('An error occurred while processing. Please try again.');
      setStep('upload');
      worker.terminate();
    };

    // Start processing with timezone
    worker.postMessage({ type: 'START', file, timezone });
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-4xl font-bold mb-2 text-white">Upload Your Flips</h1>
      <p className="text-gray-400 mb-8">
        Upload your flips.csv export from the Flipping Copilot RuneLite plugin
      </p>

      {/* Show option to return to dashboard if data exists */}
      {hasExistingData && step === 'upload' && (
        <div className="mb-6 p-4 bg-blue-900/50 border border-blue-500 rounded-lg">
          <p className="text-blue-200">
            You already have data loaded.
            <button
              onClick={() => navigate('/guest/dashboard')}
              className="ml-2 underline hover:text-white"
            >
              Return to dashboard
            </button>{' '}
            or upload a new file below.
          </p>
        </div>
      )}

      {step === 'upload' && <CsvDropzone onFileSelect={handleFileSelect} />}

      {step === 'processing' && <ProcessingStatus stats={processingStats} />}

      {step === 'complete' && (
        <div className="text-center">
          <div className="text-green-500 text-6xl mb-4">✓</div>
          <h2 className="text-2xl font-bold mb-2">Processing Complete!</h2>
          <p className="text-gray-400">Redirecting to your dashboard...</p>
        </div>
      )}
    </div>
  );
}
```

#### `src/guest/components/CsvDropzone.jsx`

```jsx
import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

export default function CsvDropzone({ onFileSelect }) {
  const onDrop = useCallback(
    acceptedFiles => {
      const file = acceptedFiles[0];
      if (file && file.name.endsWith('.csv')) {
        onFileSelect(file);
      } else {
        alert('Please upload a flips.csv file from Flipping Copilot');
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1,
  });

  return (
    <div>
      {/* Important notice about Show Buying */}
      <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 mb-4">
        <p className="text-red-200 text-sm">
          <strong>⚠️ Important:</strong> "Show Buying" must be{' '}
          <strong>disabled</strong> in Flipping Copilot settings before
          exporting. Only completed flips should be included in your export.
        </p>
      </div>

      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-16 text-center cursor-pointer
          transition-colors duration-200
          ${
            isDragActive
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-gray-600 hover:border-gray-500 bg-gray-800/50'
          }
        `}
      >
        <input {...getInputProps()} />
        <div className="text-6xl mb-4">📁</div>
        <p className="text-xl mb-2">
          {isDragActive
            ? 'Drop your flips.csv here...'
            : 'Drag & drop your flips.csv here'}
        </p>
        <p className="text-gray-400">or click to select file</p>
        <p className="text-sm text-gray-500 mt-4">
          Export from Flipping Copilot RuneLite plugin
        </p>

        {/* Browser compatibility note */}
        <p className="text-xs text-gray-600 mt-6">
          Works best in Chrome on desktop. Mobile and other browsers may have
          issues.
        </p>
      </div>
    </div>
  );
}
```

---

### Step 5: Processing Logic (Production-Ready Final Version)

#### `src/workers/guestProcessor.worker.js`

```javascript
import Papa from 'papaparse';

// Expected Flipping Copilot column names (lowercase for comparison)
const EXPECTED_COLUMNS = [
  'item',
  'quantity',
  'avg_buy_price',
  'avg_sell_price',
  'profit',
  'seller_tax',
  'first_buy_time',
  'last_sell_time',
  'account_id',
];

// Utility to clean numeric values (removes commas that Flipping Copilot might include)
// e.g., "1,234" → 1234, "1,234.56" → 1234.56
const cleanNumeric = val => {
  if (!val && val !== 0) return 0;
  const cleaned = String(val).replace(/,/g, '');
  return Number(cleaned) || 0; // Using Number instead of parseInt to preserve decimals
};

// Format date key using browser's timezone (not Chicago)
function toDateKey(iso, timezone) {
  const d = new Date(iso);
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(d);
  const mm = parts.find(p => p.type === 'month').value;
  const dd = parts.find(p => p.type === 'day').value;
  const yyyy = parts.find(p => p.type === 'year').value;
  return `${mm}-${dd}-${yyyy}`; // MM-DD-YYYY in user's timezone
}

self.onmessage = async e => {
  if (e.data.type !== 'START') return;

  const { file, timezone = Intl.DateTimeFormat().resolvedOptions().timeZone } =
    e.data;

  // Stream processing - maintain state as we parse
  let headers = null;
  let headerMap = {}; // Maps normalized names to actual column names
  let parser = null; // Store parser reference so we can abort if needed
  let rowsProcessed = 0;
  const accounts = new Set();
  const seen = new Set(); // For deduplication
  const flipsByDate = {}; // Plain object, not Map (for serialization)
  const itemStatsMap = {}; // Accumulate item stats on the fly
  const allFlips = []; // Keep all flips for potential re-bucketing
  let hasShowBuyingError = false;

  try {
    await new Promise((resolve, reject) => {
      parser = Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false, // We'll handle type conversion ourselves
        chunk: results => {
          // Build header lookup map on first chunk (case-insensitive)
          if (!headers) {
            headers = results.meta.fields;

            // Build normalized → original header map
            headers.forEach(header => {
              const normalized = header.trim().toLowerCase();
              headerMap[normalized] = header;
            });

            // Validate required columns exist (case-insensitive)
            const normalizedHeaders = Object.keys(headerMap);
            const missingColumns = EXPECTED_COLUMNS.filter(
              col => !normalizedHeaders.includes(col)
            );

            if (missingColumns.length > 0) {
              parser.abort(); // Stop parsing immediately
              reject(
                new Error(
                  `Not a valid Flipping Copilot CSV. Missing columns: ${missingColumns.join(', ')}`
                )
              );
              return;
            }

            // Check for "Show Buying" columns that shouldn't be there
            if (
              normalizedHeaders.includes('buy_state') ||
              normalizedHeaders.includes('actively_buying') ||
              normalizedHeaders.includes('buy_abort_time')
            ) {
              hasShowBuyingError = true;
            }
          }

          // Helper to get value by normalized column name
          const getValue = (row, normalizedColName) => {
            const actualColName = headerMap[normalizedColName];
            return row[actualColName];
          };

          // Process each row immediately (streaming)
          for (const row of results.data) {
            // Skip rows without last_sell_time (incomplete flips)
            const lastSellTime = getValue(row, 'last_sell_time');
            if (!lastSellTime) {
              hasShowBuyingError = true;
              continue;
            }

            // Track accounts
            const accountId = getValue(row, 'account_id');
            if (accountId) accounts.add(accountId);

            // Parse and clean the flip data using case-insensitive access
            const flip = {
              item: getValue(row, 'item'),
              quantity: cleanNumeric(getValue(row, 'quantity')),
              avgBuyPrice: cleanNumeric(getValue(row, 'avg_buy_price')),
              avgSellPrice: cleanNumeric(getValue(row, 'avg_sell_price')),
              sellerTax: cleanNumeric(getValue(row, 'seller_tax')),
              firstBuyTime: getValue(row, 'first_buy_time'),
              lastSellTime: lastSellTime,
              accountId: accountId || 'Unknown',
            };

            // Calculate profit - use CSV value if present, otherwise compute
            const profitCsv = cleanNumeric(getValue(row, 'profit'));
            const computedProfit =
              (flip.avgSellPrice - flip.sellerTax) * flip.quantity -
              flip.avgBuyPrice * flip.quantity;
            flip.profit = profitCsv || computedProfit;

            // Validate the flip has required data
            if (
              !flip.item ||
              flip.quantity <= 0 ||
              flip.avgBuyPrice <= 0 ||
              flip.avgSellPrice <= 0
            ) {
              continue;
            }

            // Create comprehensive hash for deduplication (with normalized ISO times)
            const isoFirst = new Date(flip.firstBuyTime).toISOString();
            const isoLast = new Date(flip.lastSellTime).toISOString();
            const hash = [
              flip.item,
              flip.quantity,
              flip.avgBuyPrice,
              flip.avgSellPrice,
              isoFirst,
              isoLast,
              flip.accountId,
            ].join('|');

            // Skip if duplicate
            if (seen.has(hash)) continue;
            seen.add(hash);

            // Keep the flip for potential re-bucketing
            allFlips.push(flip);

            // Add to date bucket (stream processing - no accumulation phase)
            const dateKey = toDateKey(flip.lastSellTime, timezone);
            if (!flipsByDate[dateKey]) {
              flipsByDate[dateKey] = [];
            }
            flipsByDate[dateKey].push(flip);

            // Update item stats on the fly (streaming aggregation)
            if (!itemStatsMap[flip.item]) {
              itemStatsMap[flip.item] = {
                item: flip.item,
                totalProfit: 0,
                flipCount: 0,
                totalQuantity: 0,
              };
            }
            itemStatsMap[flip.item].totalProfit += flip.profit;
            itemStatsMap[flip.item].flipCount += 1;
            itemStatsMap[flip.item].totalQuantity += flip.quantity;

            rowsProcessed++;
          }

          // Send progress update
          self.postMessage({
            type: 'PROGRESS',
            rowsProcessed: rowsProcessed,
            totalRows: rowsProcessed, // We don't know total until complete
          });
        },
        complete: () => {
          // Check if we should throw "Show Buying" error
          if (hasShowBuyingError) {
            reject(
              new Error(
                'Invalid export settings detected!\n\n' +
                  'Please disable "Show Buying" in Flipping Copilot:\n' +
                  '1. Open Flipping Copilot settings in RuneLite\n' +
                  '2. Uncheck "Show Buying"\n' +
                  '3. Export your flips.csv again\n\n' +
                  'Only completed flips should be included in the export.'
              )
            );
            return;
          }

          // Check if we have any valid flips
          if (rowsProcessed === 0) {
            reject(new Error('No valid flips found in the CSV file.'));
            return;
          }

          resolve();
        },
        error: error => {
          parser.abort(); // Ensure parsing stops
          reject(error);
        },
      });
    });

    // Process the accumulated data into final format
    const dailySummaries = Object.entries(flipsByDate)
      .map(([date, flips]) => ({
        date,
        totalProfit: flips.reduce((sum, f) => sum + f.profit, 0),
        flipCount: flips.length,
        uniqueItems: new Set(flips.map(f => f.item)).size,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Convert item stats map to sorted array
    const itemStats = Object.values(itemStatsMap).sort(
      (a, b) => b.totalProfit - a.totalProfit
    );

    // Calculate totals
    const totalProfit = itemStats.reduce(
      (sum, item) => sum + item.totalProfit,
      0
    );
    const totalFlips = itemStats.reduce((sum, item) => sum + item.flipCount, 0);
    const uniqueItems = itemStats.length;

    // Get date range
    const dateRange =
      dailySummaries.length > 0
        ? {
            from: dailySummaries[0].date,
            to: dailySummaries[dailySummaries.length - 1].date,
          }
        : null;

    // Send completion message with plain objects (not Maps)
    self.postMessage({
      type: 'COMPLETE',
      result: {
        dailySummaries,
        itemStats,
        flipsByDate, // Plain object, will serialize fine
        allFlips, // Keep for potential timezone changes
        totalProfit,
        totalFlips,
        uniqueItems,
        timezone,
        metadata: {
          accounts: Array.from(accounts).sort(),
          accountCount: accounts.size,
          dateRange,
          rowsProcessed,
          timezone,
          message:
            accounts.size > 1
              ? `Data includes ${accounts.size} accounts: ${Array.from(accounts).join(', ')}`
              : `Data from account: ${Array.from(accounts)[0] || 'Unknown'}`,
        },
      },
    });
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      message: error.message,
    });
  }
};
```

### Technical Notes on Production-Ready Implementation

**Why header lookup map?**

- CSV column names might vary in case (e.g., "Item" vs "item" vs "ITEM")
- Map normalized names to actual column names for reliable access
- Prevents breaking when Flipping Copilot changes capitalization

**Why abort parser on error?**

- Stops processing immediately when critical error detected
- Prevents wasted processing on invalid files
- Cleaner error handling flow

**Why Number instead of parseInt?**

- Preserves decimal values if they exist
- More accurate for potential future use cases
- Still handles comma removal correctly

**Why store parser reference?**

- Allows us to abort parsing on critical errors
- Prevents continued processing of invalid data
- Better resource management
  // Deduplicate const seen = new Set(); const uniqueFlips =
  validFlips.filter(flip => { if (seen.has(flip.hash)) return false;
  seen.add(flip.hash); return true; });
  // Build daily summaries const flipsByDate = new Map();
  uniqueFlips.forEach(flip => { const date = new Date(flip.lastSellTime); const
  dateKey = formatDateKey(date);
      if (!flipsByDate.has(dateKey)) {
        flipsByDate.set(dateKey, []);
      }
      flipsByDate.get(dateKey).push(flip);
  });
  // Create daily summaries const dailySummaries =
  Array.from(flipsByDate.entries()).map(([date, flips]) => ({ date, totalProfit:
  flips.reduce((sum, f) => sum + f.profit, 0), flipCount: flips.length,
  uniqueItems: new Set(flips.map(f => f.item)).size })).sort((a, b) =>
  a.date.localeCompare(b.date));
  // Create item stats const itemStatsMap = new Map(); uniqueFlips.forEach(flip
  => { const stats = itemStatsMap.get(flip.item) || { item: flip.item,
  totalProfit: 0, flipCount: 0, totalQuantity: 0 };
      stats.totalProfit += flip.profit;
      stats.flipCount += 1;
      stats.totalQuantity += flip.quantity;

      itemStatsMap.set(flip.item, stats);
  });
  const itemStats = Array.from(itemStatsMap.values()) .sort((a, b) =>
  b.totalProfit - a.totalProfit);
  // Calculate overall stats const totalProfit = uniqueFlips.reduce((sum, f) =>
  sum + f.profit, 0); const dateRange = dailySummaries.length > 0 ? { from:
  dailySummaries[0].date, to: dailySummaries[dailySummaries.length - 1].date } :
  null;
  return { dailySummaries, itemStats, flipsByDate, totalProfit, totalFlips:
  uniqueFlips.length, uniqueItems: itemStats.length, // Include metadata about
  accounts metadata: { accounts: Array.from(accounts).sort(), accountCount:
  accounts.size, dateRange, message: accounts.size > 1 ?
  `Data includes ${accounts.size} accounts: ${Array.from(accounts).join(', ')}`
  : `Data from account: ${Array.from(accounts)[0] || 'Unknown'}` } }; }

function formatDateKey(date) { const month = String(date.getMonth() +
1).padStart(2, '0'); const day = String(date.getDate()).padStart(2, '0'); const
year = date.getFullYear(); return `${month}-${day}-${year}`; }

````

---

### Step 6: Update App.jsx - Clear Separation

**Important**: Guest mode is a separate "app within an app". Your personal dashboard and guest mode never share data.

```jsx
import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Your existing dashboard components
import Dashboard from './pages/Dashboard';
import FlipLogs from './pages/FlipLogs';

// Lazy load the entire guest mode - it's a separate "app"
const GuestModeApp = lazy(() => import('./guest/GuestModeApp'));

function App() {
  return (
    <Router>
      <Routes>
        {/* Your personal dashboard - uses your data */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/flip-logs" element={<FlipLogs />} />
        <Route path="/items" element={<ItemStats />} />
        {/* ... other personal routes ... */}

        {/* Guest mode - completely separate, lazy loaded */}
        <Route path="/guest/*" element={
          <Suspense fallback={
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
              <div className="text-white text-xl">Loading Guest Mode...</div>
            </div>
          }>
            <GuestModeApp />
          </Suspense>
        } />
      </Routes>
    </Router>
  );
}

export default App;
````

### Step 7: Guest Dashboard (Reusing Your Components)

### Step 7: Guest Dashboard with Export Functionality

Create a guest-specific dashboard that reuses your visualization components but
with guest data:

#### `src/guest/pages/GuestDashboard.jsx`

```jsx
import { useGuestData } from '../contexts/GuestDataContext';
import { useNavigate } from 'react-router-dom';
import JSZip from 'jszip';

// Import your existing chart components
import ProfitChart from '../../components/charts/ProfitChart';
import ItemBreakdown from '../../components/charts/ItemBreakdown';
import DailyStatsTable from '../../components/tables/DailyStatsTable';

// Import or define formatGP (use your existing utility or define here)
// Option 1: Import your existing formatter
// import { formatGP } from '../../utils/formatUtils';

// Option 2: Define a simple formatter
const formatGP = (value) => {
  if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toLocaleString('en-US');
};

// Export function - creates a ZIP with all processed data
async function exportGuestData(guestData) {
  const zip = new JSZip();

  // Create metadata
  const metadata = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    source: 'guest-mode',
    accounts: guestData.metadata.accounts,
    dateRange: guestData.metadata.dateRange,
    timezone: guestData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    stats: {
      totalProfit: guestData.totalProfit,
      totalFlips: guestData.totalFlips,
      uniqueItems: guestData.uniqueItems
    }
  };

  // Add files to ZIP
  zip.file('meta.json', JSON.stringify(metadata, null, 2));
  zip.file('daily-summaries.json', JSON.stringify(guestData.dailySummaries, null, 2));
  zip.file('item-stats.json', JSON.stringify(guestData.itemStats, null, 2));

  // Optional: Include all flips organized by date
  if (guestData.flipsByDate) {
    zip.file('flips-by-date.json', JSON.stringify(guestData.flipsByDate, null, 2));
  }

  // Generate and download ZIP
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `osrs-flips-export-${new Date().toISOString().split('T')[0]}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function GuestDashboard() {
  const { guestData } = useGuestData();
  const navigate = useNavigate();

  // Note: We don't need to check for data here because RequireGuestData handles it
  const userTimezone = guestData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div className="max-w-7xl mx-auto p-8">
      {/* Warning about refreshing */}
      <div className="bg-orange-900/50 border border-orange-500 rounded-lg p-3 mb-6">
        <p className="text-orange-200 text-sm">
          ⚠️ <strong>Note:</strong> Your data exists only in this session. Refreshing the page will require re-uploading your CSV.
          Use the Export button to save your processed data.
        </p>
      </div>

      {/* Account info if multiple accounts */}
      {guestData.metadata?.accountCount > 1 && (
        <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-3 mb-6">
          <p className="text-blue-200 text-sm">
            📊 <strong>Combined data from {guestData.metadata.accountCount} accounts:</strong> {guestData.metadata.accounts.join(', ')}
          </p>
          <p className="text-blue-300 text-xs mt-1">
            Tip: Export accounts separately from Flipping Copilot if you want individual analysis
          </p>
        </div>
      )}

      {/* Header with clear indication this is guest mode */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-white">Your Flip Analysis</h1>
          <p className="text-gray-400 mt-2">
            Guest Session - {guestData.metadata?.dateRange ?
              `${guestData.metadata.dateRange.from} to ${guestData.metadata.dateRange.to}` :
              new Date().toLocaleDateString()
            }
          </p>
          <p className="text-gray-500 text-xs mt-1">
            Dates shown in your timezone: {userTimezone}
          </p>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => {
              if (confirm('This will clear your current data. Continue?')) {
                navigate('/guest');
              }
            }}
            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
          >
            Upload New CSV
          </button>
          <button
            onClick={() => exportGuestData(guestData)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
          >
            📥 Export Results
          </button>
        </div>
      </div>

        <div className="flex gap-4">
          <button
            onClick={() => {
              if (confirm('This will clear your current data. Continue?')) {
                navigate('/guest');
              }
            }}
            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
          >
            Upload New CSV
          </button>
          <button
            onClick={() => exportGuestData(guestData)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
          >
            📥 Export Results
          </button>
        </div>
      </div>

        <div className="flex gap-4">
          <button
            onClick={() => {
              if (confirm('This will clear your current data. Continue?')) {
                navigate('/guest');
              }
            }}
            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
          >
            Upload New CSV
          </button>
          <button
            onClick={() => exportGuestData(guestData)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
          >
            Export Results
          </button>
        </div>
      </div>

      {/* Summary Cards - No challenge metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="text-gray-400 text-sm">Total Profit</div>
          <div className="text-2xl font-bold text-green-400">
            {formatGP(guestData.totalProfit)}
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="text-gray-400 text-sm">Total Flips</div>
          <div className="text-2xl font-bold text-white">
            {guestData.totalFlips.toLocaleString()}
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="text-gray-400 text-sm">Unique Items</div>
          <div className="text-2xl font-bold text-white">
            {guestData.uniqueItems}
          </div>
        </div>
      </div>

      {/* Reuse your existing chart components with guest data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ProfitChart data={guestData.dailySummaries} hideChallenge={true} />
        <ItemBreakdown data={guestData.itemStats} />
      </div>

      <div className="mt-8">
        <DailyStatsTable data={guestData.dailySummaries} hideChallenge={true} />
      </div>
    </div>
  );
}
```

### Step 8: Add Link to Guest Mode

Add a link to guest mode in your main navigation or landing page:

````jsx
// In your main navigation or homepage
function Navigation() {
  return (
    <nav className="bg-gray-800 p-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-6">
          <Link to="/" className="text-white hover:text-gray-300">My Dashboard</Link>
          <Link to="/flip-logs" className="text-white hover:text-gray-300">Flip Logs</Link>
        </div>

        <Link
          to="/guest"
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-500"
        >
          🎯 Try Guest Mode
        </Link>
      </div>
    </nav>
  );
}

## Key Architecture Decisions

### Data Isolation
- **Guest mode uses completely separate context** (`GuestDataContext`) from your personal data
- **No shared state** between personal dashboard and guest mode
- **Lazy loading** keeps guest code separate from main bundle
- **Visual distinction** with different color scheme makes it clear when in guest mode
- **URL structure** (`/guest/*`) clearly separates guest routes

### Security & Privacy
- **100% client-side** - No data ever sent to server
- **No persistence** - Data only exists in browser memory during session
- **Clear messaging** - Persistent banner explaining data privacy
- **No mixing** - Guest data cannot access or affect your personal dashboard data

---

## Testing Checklist

### Upload & Processing
- [ ] Upload a valid flips.csv - should process and show dashboard
- [ ] Upload CSV with "1,234" style numbers - should parse correctly as 1234
- [ ] Upload CSV with decimal values - should preserve them (using Number not parseInt)
- [ ] Upload CSV with mixed case headers (e.g., "ITEM", "Avg_Buy_Price") - should still work
- [ ] Upload CSV with missing profit column - should calculate from prices
- [ ] Upload CSV with incomplete flips (no last_sell_time) - should show "Show Buying" error
- [ ] Upload non-CSV file - should show error
- [ ] Upload CSV with wrong format - should show specific error about missing columns
- [ ] Process 50k+ rows - UI should remain responsive with progress updates
- [ ] Upload new CSV when data already loaded - should show confirmation prompt
- [ ] Worker terminates properly after completion or error (check DevTools > Sources > Threads)
- [ ] Parser aborts on critical error (invalid headers)

### Data Integrity
- [ ] Verify deduplication works (upload same file twice in one session)
- [ ] Check that all numeric fields handle comma-separated values
- [ ] Check that decimal values are preserved (1,234.56 → 1234.56)
- [ ] Verify accounts are tracked correctly (shown in dashboard header)
- [ ] Confirm date keys are consistent MM-DD-YYYY format everywhere
- [ ] Test with browser in different timezone - dates should group by local days
- [ ] **DST Test**: Upload CSV with flips spanning daylight saving time change - verify dates still group correctly
- [ ] Verify timezone shown correctly in dashboard header
- [ ] Check profit calculation when CSV profit is 0 or missing

### Navigation & State Management
- [ ] Navigate directly to `/guest/dashboard` - should redirect to `/guest` upload page
- [ ] Navigate to `/guest/random-route` - should redirect to `/guest` upload page
- [ ] After uploading, use browser back button - should return to upload with "Return to dashboard" option
- [ ] Refresh page on dashboard (F5) - should redirect to upload page (data lost)
- [ ] Navigate to main site then back to `/guest/dashboard` - data should persist (same session)
- [ ] Close tab and reopen `/guest/dashboard` - should redirect to upload page

### Export Functionality
- [ ] Export button creates ZIP file with all data
- [ ] ZIP contains: meta.json, daily-summaries.json, item-stats.json, flips-by-date.json
- [ ] Exported metadata includes timezone information
- [ ] Exported data matches what's shown in dashboard
- [ ] File naming includes current date

### UI & Visual Consistency
- [ ] Purple gradient background distinguishes guest mode from personal dashboard
- [ ] Yellow security banner persists on all guest pages
- [ ] Warning about data loss on refresh is visible on dashboard
- [ ] "Show Buying" warning is prominent on upload page
- [ ] Timezone displayed in dashboard header
- [ ] Check dates are in MM-DD-YYYY format everywhere
- [ ] Verify no network calls after initial page load (check Network tab)
- [ ] Challenge-specific fields (Day N, % to Goal, ETA) are never shown
- [ ] No duplicate button blocks in dashboard

### Data Isolation
- [ ] Guest mode doesn't affect personal dashboard data
- [ ] No localStorage or sessionStorage is used
- [ ] Data only exists in memory during session
- [ ] Worker completes without errors for large files
- [ ] InMemoryDataSource uses plain object for flipsByDate (not Map)

### Error Handling
- [ ] Helpful error messages that explain what's wrong
- [ ] "Show Buying" error tells user exactly how to fix it
- [ ] Browser compatibility issues suggest "Try Chrome on desktop"
- [ ] Worker errors are caught and displayed properly
- [ ] Message errors (onmessageerror) are handled gracefully

---

## Implementation Order

1. **Day 1**: Set up guest route structure and contexts
2. **Day 2**: Create upload UI with dropzone and "Show Buying" validation
3. **Day 3**: Implement Web Worker with CSV processing
4. **Day 4**: Build guest dashboard with account info display
5. **Day 5**: Testing and polish

---

## Key Decisions & Constraints

### What We're Building
- **Single format only**: Flipping Copilot `flips.csv` (no other formats)
- **Multiple accounts**: Combined into one view with clear labeling
- **"Show Buying" must be disabled**: Validated and enforced
- **Chrome desktop focused**: "If it doesn't work, try Chrome on desktop"
- **Zero persistence**: Refresh = start over
- **Distribution**: Post to Flipping Copilot Discord only

### What We're NOT Building
- File size limits (not needed - exports are tiny)
- Mobile optimization
- Browser compatibility fixes
- Multiple format support
- Account filtering (users can export separately if needed)
- Marketing/SEO/public discovery
- Data persistence between sessions

### User Flow
1. User exports from Flipping Copilot (with "Show Buying" disabled)
2. Navigates to `mreedon.com/guest`
3. Uploads their `flips.csv`
4. Sees combined results (with account info if multiple)
5. Can export results as JSON
6. Data gone on refresh

---

## Future Enhancements (Not Phase 1)

- Account filtering dropdown (if requested)
- Date range filtering
- Demo mode with sample data
- Share links (compressed data in URL)

---

## Implementation Summary - Final Version

### The Final Architecture with All Fixes

**What we're building:** A guest mode that processes Flipping Copilot exports entirely client-side, with zero backend involvement and complete isolation from your personal data.

**Critical technical fixes incorporated:**
- ✅ **Browser timezone** - Users see dates in their local timezone (not Chicago)
- ✅ **Stream processing** - Process rows as they're parsed (50% less memory)
- ✅ **Comma stripping** - Handle "1,234" format numbers from Flipping Copilot
- ✅ **Case-insensitive headers** - Handle variations in CSV column names
- ✅ **Profit fallback** - Calculate if missing or zero in CSV
- ✅ **Plain objects** - No Maps across worker boundary (avoids serialization issues)
- ✅ **ISO normalization** - Consistent dedup regardless of date formats
- ✅ **Worker termination** - Prevent zombie workers after completion
- ✅ **Export to ZIP** - Let users save their processed data

**What makes this pragmatic:**
- Single format support (Flipping Copilot only) = 40% less code
- No persistence = No privacy concerns
- Chrome desktop only = No compatibility headaches
- Browser timezone = Correct for every user automatically
- Combine all accounts = Simple UX (users can control at export level)
- Reuse existing components = Faster implementation

**Final dependencies to install:**
```bash
npm install papaparse jszip react-dropzone
````

**Distribution:** Post to Flipping Copilot Discord when ready. No public
marketing, no SEO, just a tool for the community that needs it.

---

## Ready to Build

This spec represents a focused, pragmatic solution that:

1. Solves a real problem for Flipping Copilot users
2. Handles all the technical edge cases (commas, timezones, serialization,
   streaming)
3. Requires minimal maintenance (no backend, no data storage)
4. Protects user privacy (100% client-side)
5. Ships quickly by avoiding unnecessary features

The architecture is intentionally simple: **Upload → Process → Display →
Export**. No more, no less.

Every technical issue has been addressed, every design decision has
justification, and the scope is locked down tight.
