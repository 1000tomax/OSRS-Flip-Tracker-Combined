# OSRS Flip Dashboard - Query Builder Implementation Documentation

## Overview
The Query Builder is an AI-powered natural language query interface for the OSRS Flip Dashboard that allows users to search and filter their flip data using plain English queries.

## Current Implementation Status

### Core Components

#### 1. Query Builder UI (`src/guest/components/QueryBuilder/index.jsx`)
- **Natural Language Input**: Text field for AI queries with example prompts
- **Manual Filter Builder**: Direct filter creation interface
- **Results Display**: Multiple visualization options (table, charts, single value)
- **No mode restrictions**: All fields available at all times

#### 2. Query Executor (`src/guest/utils/queryExecutor.js`)
- **Data Structure**: Expects `data.allFlips` or `data.flips` array
- **Filter Operations**: Supports >, <, >=, <=, =, !=, contains, startsWith, endsWith, between
- **Case-Insensitive**: String comparisons are case-insensitive
- **Computed Fields**: Calculates daysSinceFlip, profitVelocity, marginPercent, etc. on the fly

#### 3. Query Results (`src/guest/components/QueryBuilder/QueryResults.jsx`)
- **Display Types**: table, bar_chart, line_chart, pie_chart, single_value
- **Formatting**: Uses formatGP, formatNumber, formatItemName from formatUtils
- **Color Coding**: Profit (green/red), ROI levels, margin percentages

#### 4. API Endpoints
- **Local Development**: `api/local-proxy.js` (port 3002)
- **Production**: `api/translate-query.js` (Vercel function)
- **Model**: Claude 3 Haiku for cost efficiency
- **Token Tracking**: Logs usage and costs to Discord

### Data Structure

The guest data structure from the worker (`src/workers/guestProcessor.worker.js`):
```javascript
{
  allFlips: [          // Array of individual flip records
    {
      item: "Dragon bones",
      profit: 150000,
      roi: 15.5,
      quantity: 100,
      date: "2024-08-29",
      avgBuyPrice: 2500,
      avgSellPrice: 4000,
      spent: 250000,
      revenue: 400000,
      hoursHeld: 4.5
    }
    // ... more flips
  ],
  itemStats: [...],    // Aggregated stats per item
  dailySummaries: [...], // Daily summaries
  totalProfit: 5000000,
  totalFlips: 17111,
  uniqueItems: 245
}
```

### Available Fields

All fields are always available (no mode restrictions):

**Core Fields:**
- `item` (string): Item name
- `profit` (number): Profit in GP
- `roi` (number): ROI percentage
- `quantity` (number): Amount traded
- `date` (date): Trade date

**Price Fields:**
- `avgBuyPrice` (number): Average buy price
- `avgSellPrice` (number): Average sell price
- `spent` (number): Total GP spent
- `revenue` (number): Total GP earned

**Time Fields:**
- `hoursHeld` (number): Hours item was held
- `daysSinceFlip` (number): Days since flip (computed)

**Computed Fields:**
- `profitVelocity` (number): Profit per hour
- `marginPercent` (number): Profit margin percentage
- `profitPerItem` (number): Average profit per item
- `totalValue` (number): Total transaction value

### AI Prompt Configuration

Key prompt elements in the API endpoints:
```
IMPORTANT: The data contains individual flip records, NOT aggregated item statistics.
- Each row is a single flip transaction
- When user says "items" they usually mean individual flips
- DO NOT aggregate or group unless specifically requested

For time-based queries:
- MUST use "daysSinceFlip" field, NOT "date" field
- NEVER generate specific dates like "2023-04-01"
```

### Current Issues & Bugs

1. **Terminology Confusion**: AI sometimes says "items" when it should say "flips"
2. **Date Handling**: Previously generated hardcoded dates instead of using daysSinceFlip
3. **Cost Display**: Was showing incorrect cents calculation (fixed)
4. **Data Access**: Was looking for `data.flips` but actual structure has `data.allFlips` (fixed)
5. **Case Sensitivity**: String comparisons were case-sensitive (fixed)

### Environment Variables

Required in `.env.local`:
```
VITE_CLAUDE_API_KEY=your-api-key
VITE_DISCORD_WEBHOOK_URL=your-webhook-url
VITE_LOG_TO_DISCORD_IN_DEV=true
```

### Token Usage & Costs

Using Claude 3 Haiku:
- Input: $0.25 per million tokens
- Output: $1.25 per million tokens
- Average query: ~1000 tokens (~$0.0004 or 0.04¢)

### Discord Webhook Logging

Logs include:
- User input query
- Generated filters
- Display type
- Sort/limit configuration
- Token usage
- Cost in USD
- AI explanation

### Vite Configuration

The dev server proxies `/api/*` requests to `localhost:3002` where the local proxy handles them.

### Testing Queries

Example queries that should work:
- "Show my top 10 most profitable flips"
- "Flips with ROI over 50% from last week"
- "Dragon bones transactions"
- "Items held for less than 4 hours"
- "Yesterday's flips sorted by quantity"

### Known Working Features

✅ Natural language to query translation
✅ Manual filter creation
✅ All field types accessible
✅ Case-insensitive string matching
✅ Computed fields (daysSinceFlip, profitVelocity, etc.)
✅ Multiple display formats
✅ Proper GP formatting
✅ Token usage tracking
✅ Discord logging
✅ Cost calculation

### Potential Improvements

1. **Query Caching**: Cache AI translations for identical queries
2. **Aggregation Support**: Add explicit aggregation/grouping when requested
3. **Query History**: Store successful queries for reuse
4. **Better Error Messages**: More specific error feedback
5. **Query Templates**: Pre-built complex queries
6. **Export Functionality**: Export query results to CSV
7. **Saved Queries**: Let users save favorite queries

### File Structure
```
src/
├── guest/
│   ├── components/
│   │   └── QueryBuilder/
│   │       ├── index.jsx         # Main component
│   │       ├── FilterRow.jsx     # Individual filter UI
│   │       └── QueryResults.jsx  # Results display
│   └── utils/
│       └── queryExecutor.js      # Query execution logic
├── utils/
│   └── formatUtils.ts            # Formatting utilities
└── workers/
    └── guestProcessor.worker.js  # Data processing

api/
├── local-proxy.js                # Local dev proxy
└── translate-query.js            # Vercel function
```

## Integration Points

1. **GuestDashboard.jsx**: Hosts the QueryBuilder component, passes `guestData`
2. **GuestDataContext**: Provides the flip data
3. **formatUtils**: Centralized formatting for consistency
4. **SortableTable**: Reusable table component for results

## For Claude Chat

When working with this implementation:
1. The main data array is `data.allFlips`, not `data.flips`
2. All queries operate on individual flip records unless aggregation is explicitly requested
3. Use `daysSinceFlip` for relative date queries, never hardcoded dates
4. All string comparisons should be case-insensitive
5. The AI should describe results as "flips" not "items" for individual transactions

## Current State Summary

The Query Builder is functional with natural language processing, proper formatting, and Discord logging. Main issues are around terminology (items vs flips) and ensuring the AI understands it's querying individual flip records, not aggregated data.