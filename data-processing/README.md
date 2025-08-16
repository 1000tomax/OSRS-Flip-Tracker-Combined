# OSRS Flip Data Processing

This directory contains the backend data processing scripts that transform raw Flipping Copilot exports into the structured data used by the frontend dashboard.

## Quick Start

1. **Export data** from Flipping Copilot RuneLite plugin to `~/Documents/flips.csv`
2. **Run full processing:** `npm run process-flips`
3. **Start frontend:** `npm run dev`

## Scripts Overview

| Script | Purpose | Output |
|--------|---------|--------|
| `parser.js` | Parse raw CSV, dedupe, organize by date | `public/data/processed-flips/` |
| `summaryBuilder.js` | Create daily summary stats | `public/data/daily-summary/` |
| `itemStats.js` | Generate item statistics CSV | `public/data/item-stats.csv` |
| `metaWriter.js` | Write metadata and index files | `public/data/meta.json`, `summary-index.json` |
| `run-all.js` | Execute all scripts in sequence | All of the above |

## Key Fixes Applied

### 🔧 Date Grouping Issue
**Problem:** Flips were grouped by `closed_time` causing timezone issues and mixed dates in files.

**Solution:** Changed to use `opened_time` for date grouping to ensure flips are categorized by when they were started, not when they ended.

### 🔧 File Append Issue  
**Problem:** CSV files were being appended to, causing accumulation of wrong-date flips.

**Solution:** Changed to overwrite files completely on each run to prevent data mixing.

### 🔧 UTC Date Handling
**Problem:** Local timezone calculations caused inconsistent date boundaries.

**Solution:** Updated `formatDate()` to use UTC methods for consistent date calculation.

## NPM Scripts

```bash
# Process all data (recommended)
npm run process-flips

# Individual steps
npm run process:parse      # Parse flips.csv
npm run process:summaries  # Build daily summaries  
npm run process:items      # Generate item stats
npm run process:meta       # Write metadata

# Frontend
npm run dev               # Start development server
npm run build             # Build for production (includes data processing)
```

## Data Flow

```
~/Documents/flips.csv (Flipping Copilot export)
           ↓
    parser.js (dedupe, organize by opened_time)
           ↓
    public/data/processed-flips/YYYY/MM/DD/flips.csv
           ↓
    summaryBuilder.js + itemStats.js + metaWriter.js
           ↓
    public/data/{daily-summary/, item-stats.csv, meta.json, summary-index.json}
           ↓
    Frontend Dashboard (React)
```

## Archive

Raw input files are automatically archived to `data-processing/raw-input/MM/DD/` with timestamps for backup purposes.