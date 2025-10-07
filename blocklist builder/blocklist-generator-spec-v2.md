# Blocklist Generator - Feature Specification

**Version:** 2.0  
**Status:** ✅ Ready for Implementation (Claude API Approach)  
**Last Updated:** 2025-10-07

---

## 📋 Recent Updates (v2.0)

**🚀 MAJOR REDESIGN: Claude API Natural Language Filtering**

- ✅ **PRIMARY INTERFACE:** Natural language text input (no complex sliders!)
- ✅ **Powered by Claude API:** Reuse existing infrastructure from text-to-SQL
  feature
- ✅ **Handles complex logic:** OR, EXCEPT, AND - all naturally
- ✅ **Faster development:** 6-8 hours vs 8-12 hours for slider UI
- ✅ **Better UX:** Users describe what they want in plain English
- ✅ **Cost effective:** $0.004 per query (negligible)
- ✅ **Preset profiles:** Common use cases as one-click options
- ✅ **Fallback mode:** Simple manual filters when API unavailable

**Why This Change:**

- Project already has Claude API integration (text-to-SQL generator)
- Natural language is more flexible than any UI we could build
- Solves OR/EXCEPT filtering problems immediately
- Faster to implement and maintain
- Consistent with existing AI features in the app

**v1.2 - CORS Verification Complete (2025-10-07):**

- ✅ **CONFIRMED:** OSRS Wiki API has CORS enabled - **no backend proxy
  needed!**
- ✅ **Tested:** All three endpoints work directly from browser
  - `/mapping`: 4,307 items (0.08s response time)
  - `/latest`: 4,194 items with prices (0.02s response time)
  - `/5m`: 1,765 items with volume data (0.02s response time)
- ✅ **Implementation:** Can be built entirely in React frontend with direct
  fetch calls
- ✅ **User-Agent:** Properly formatted headers accepted by API
- ✅ **Performance:** Fast response times suitable for real-time filtering

---

## 📍 Overview

A tool in the guest dashboard that generates Flipping Copilot profile files with
custom blocklists based on item criteria (price, volume, F2P status, etc.).

**Target Users:** OSRS players using Flipping Copilot who want to focus on
specific item categories without manually blocking thousands of items.

---

## 🎯 User Flow

```
1. User navigates to /guest/blocklist-generator
2. User configures filtering criteria via sliders/toggles
3. User clicks "Preview Blocklist"
   → Shows: X items to trade, Y items blocked
4. User clicks "Download Profile"
   → Downloads: "Custom Blocklist.profile.json"
5. User places file in RuneLite Flipping Copilot plugin directory:
   - Windows: C:\Users\<username>\.runelite\flipping-copilot\
   - macOS: ~/Library/Application Support/runelite/flipping-copilot/
   - Linux: ~/.runelite/flipping-copilot/
```

---

## 🎨 UI Layout Sketch

```
┌─────────────────────────────────────────────────────────────┐
│  🔧 Blocklist Generator                                      │
│  Describe what you want to trade - AI does the rest         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  🤖 What items do you want to trade?                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ F2P items between 100k and 10m                         │ │
│  │                                                         │ │
│  └────────────────────────────────────────────────────────┘ │
│  Powered by Claude AI ✨                                    │
│                                                              │
│  Or try these presets:                                      │
│  [F2P under 1m] [Budget flips] [High volume items]         │
│  [Members 1m-10m] [Popular items] [Low risk flips]         │
│                                                              │
│  ┌─────────────────────────────────────────┐               │
│  │ [Generate Blocklist] ⚡                  │               │
│  └─────────────────────────────────────────┘               │
│                                                              │
│  💡 Examples you can try:                                   │
│  • "Everything under 10m except high volume items"         │
│  • "F2P items between 100k-5m with good trading volume"    │
│  • "Members items over 1m that trade frequently"           │
│  • "Block cheap items unless they're popular"              │
│  • "Combat gear under 5m OR any item with 50k+ volume"     │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ 📊 Preview Results:                                    │ │
│  │                                                         │ │
│  │ 🧠 Understanding your request...                       │ │
│  │ "Block everything except F2P items between 100k-10m"  │ │
│  │                                                         │ │
│  │ ✓ 347 items will be tradeable                         │ │
│  │ ✗ 3,960 items will be blocked                         │ │
│  │                                                         │ │
│  │ Top tradeable items:                                   │ │
│  │ • Abyssal whip (2.1m, F2P: No)                        │ │
│  │ • Rune platebody (38k, F2P: Yes)                      │ │
│  │ • Dragon scimitar (60k, F2P: No)                      │ │
│  │ ... +344 more                                         │ │
│  │                                                         │ │
│  │ Profile Name:                                          │ │
│  │ [F2P 100k-10m Budget Flips    ] Mreedon              │ │
│  │ ℹ️ This name will appear in Flipping Copilot          │ │
│  │                                                         │ │
│  │ [Download Profile] [Try Different Query]              │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                              │
│  ⚙️ [Simple Mode] - Create filters manually (fallback)     │
│                                                              │
│  ℹ️ How to use:                                             │
│  1. Download the profile                                    │
│  2. Place in .runelite/flipping-copilot/                   │
│  3. Restart RuneLite                                        │
│  4. Select profile in Flipping Copilot settings            │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Data Requirements

### External APIs

**OSRS Wiki Price API:**

- Base URL: `https://prices.runescape.wiki/api/v1/osrs`
- Authentication: User-Agent header required
- Rate Limits: Reasonable (no documented limits, but be respectful)

**Endpoints:**

1. **Item Mapping** (required)

   ```
   GET /mapping
   Returns: Array of all items with metadata

   Response structure: Direct array (no wrapper object)
   [{
     "id": 4151,
     "name": "Abyssal whip",
     "members": true,
     "limit": 70,
     "value": 120001,
     "lowalch": 50000,
     "highalch": 75000,
     "icon": "Abyssal whip.png",
     "examine": "A weapon from the abyss."
   }, ...]

   Notes:
   - Returns 4,307 items total (CORS test verified)
   - 4,194 items have price data in /latest
   - 113 items have no price data (untradeable/never traded)
   - Response is direct array, not wrapped in object
   ```

2. **Latest Prices** (required)

   ```
   GET /latest
   Returns: Real-time high/low prices

   Response structure: Wrapped in .data property
   {
     "data": {
       "4151": {                      // Item ID as STRING key
         "high": 2100000,
         "highTime": 1234567890,
         "low": 2050000,
         "lowTime": 1234567890
       }
     }
   }

   ⚠️ CRITICAL NOTES:
   - Items are keyed by ID as STRING (not number): "4151" not 4151
   - If item NEVER traded, it WON'T appear in response at all
   - If NEVER instant-buy, "high" and "highTime" will be null
   - If NEVER instant-sell, "low" and "lowTime" will be null
   - Must handle null/missing values in filtering logic
   ```

3. **5-Minute Volume** (optional - Phase 2 only)

   ```
   GET /5m
   Returns: 5-minute average prices and volume

   Response structure: Wrapped in .data property
   {
     "data": {
       "4151": {                      // Item ID as STRING key
         "avgHighPrice": 2100000,
         "highPriceVolume": 150,      // Instant-buy volume (5-min)
         "avgLowPrice": 2050000,
         "lowPriceVolume": 142,       // Instant-sell volume (5-min)
         "timestamp": 1234567890      // Start of 5-min period
       }
     }
   }

   Notes:
   - Timestamp represents START of 5-minute averaging period
   - For total volume: highPriceVolume + lowPriceVolume
   - 1,765 items have volume data (CORS test verified)
   - Only ~41% of items have volume data (2,542 items don't)
   - This is for 5-minute window, multiply by ~288 for daily estimate
   ```

### File Details

**Profile JSON Structure:**

```json
{
  "blockedItemIds": [1, 2, 3, 4, ...],
  "timeframe": 5,
  "f2pOnlyMode": false
}
```

**File Details:**

- Filename: `{User Custom Name} Mreedon.profile.json` (e.g.,
  `100k-10m F2P Mreedon.profile.json`)
- Location: User downloads to their computer
- Encoding: UTF-8
- Format: Minified JSON (no whitespace)
- Compatibility: Flipping Copilot v1.7.9+
- Displays in Copilot: File name without `.profile.json` extension (e.g.,
  "100k-10m F2P Mreedon")

### Profile Name Generation

**Auto-Generated Default:**

```javascript
function generateDefaultProfileName(criteria) {
  const parts = [];

  // Format price range
  const formatPrice = price => {
    if (price >= 1000000) return `${Math.floor(price / 1000000)}m`;
    if (price >= 1000) return `${Math.floor(price / 1000)}k`;
    return `${price}gp`;
  };

  parts.push(
    `${formatPrice(criteria.minPrice)}-${formatPrice(criteria.maxPrice)}`
  );

  // Add membership filter
  if (criteria.f2pOnly) parts.push('F2P');
  else if (criteria.membersOnly) parts.push('Members');

  // Optional: Add volume if enabled (can make name long)
  // if (criteria.volumeEnabled) {
  //   parts.push(`Vol${formatNumber(criteria.minVolume)}-${formatNumber(criteria.maxVolume)}`);
  // }

  return parts.join(' ');
}

// Examples:
// "100k-10m F2P" → displays as "100k-10m F2P Mreedon"
// "500k-5m Members" → displays as "500k-5m Members Mreedon"
// "1m-50m" → displays as "1m-50m Mreedon"
```

**User Experience:**

1. Default name auto-generates based on criteria
2. User can edit name in text input before download
3. "Mreedon" suffix automatically appended to filename
4. Final filename: `{User's Name} Mreedon.profile.json`

---

## 📊 API Data Availability Matrix

Understanding what data is actually available from the OSRS Wiki API:

| Feature                | API Provides? | Endpoint       | Notes                        |
| ---------------------- | ------------- | -------------- | ---------------------------- |
| **Item ID**            | ✅ Yes        | `/mapping`     | Unique identifier            |
| **Item Name**          | ✅ Yes        | `/mapping`     | Display name                 |
| **Current Price**      | ✅ Yes        | `/latest`      | High/low instant prices      |
| **F2P/Members**        | ✅ Yes        | `/mapping`     | Boolean flag                 |
| **GE Buy Limit**       | ✅ Yes        | `/mapping`     | Daily purchase limit         |
| **Trading Volume**     | ✅ Yes        | `/5m` or `/1h` | Requires extra API call      |
| **High/Low Alch**      | ✅ Yes        | `/mapping`     | Useful but not for filtering |
| **Item Categories**    | ❌ No         | N/A            | Would need external data     |
| **Item Stats**         | ❌ No         | N/A            | Would need external data     |
| **Quest Requirements** | ❌ No         | N/A            | Would need external data     |

**Key Takeaway:** We can filter by price, volume, and F2P status. Everything
else requires external data sources.

---

## 🔧 Technical Implementation

### File Structure

```
src/guest/
  ├── pages/
  │   └── BlocklistGeneratorPage.jsx       # Main page component
  ├── components/
  │   ├── BlocklistGenerator/
  │   │   ├── NaturalLanguageInput.jsx     # Claude-powered text input
  │   │   ├── PresetButtons.jsx            # Quick preset profiles
  │   │   ├── BlocklistPreview.jsx         # Results display
  │   │   ├── ProfileDownloader.jsx        # Download handler
  │   │   ├── SimpleModeForm.jsx           # Fallback manual filters
  │   │   └── index.js                     # Barrel export
  └── utils/
      ├── osrsWikiApi.js                   # API client
      ├── claudeFilterService.js           # Claude API integration
      ├── filterRuleEvaluator.js           # Apply filter rules to items
      └── presetProfiles.js                # Predefined common profiles
```

### Core Logic

**claudeFilterService.js**

````javascript
/**
 * Convert natural language query to structured filter rules using Claude API
 * @param {string} userQuery - Natural language description of filtering criteria
 * @param {number} totalItems - Total items available
 * @param {number} itemsWithPrices - Items that have price data
 * @param {number} itemsWithVolume - Items that have volume data
 * @returns {Promise<Object>} Filter configuration object
 */
export async function convertQueryToFilterRules(
  userQuery,
  totalItems,
  itemsWithPrices,
  itemsWithVolume
) {
  const prompt = `You are a filter configuration assistant for OSRS (Old School RuneScape) Grand Exchange items.

AVAILABLE DATA:
- Total items in game: ${totalItems}
- Items with price data: ${itemsWithPrices}
- Items with volume data: ${itemsWithVolume}
- Item properties: id, name, members (boolean), price (instant buy/sell)
- Volume data: 5-minute trading volume (highPriceVolume + lowPriceVolume)

USER'S FILTERING REQUEST:
"${userQuery}"

TASK: Convert this natural language request into a structured filter configuration.

RULES:
1. The goal is to determine which items should be TRADEABLE (not blocked)
2. Default is to BLOCK all items, then INCLUDE based on rules
3. Support complex logic: AND, OR, EXCEPT
4. Handle price in gp (1k = 1000, 1m = 1000000, etc.)
5. Volume is 5-minute trading volume (approximate daily: multiply by ~288)

RETURN ONLY VALID JSON (no markdown, no explanation):

{
  "interpretation": "Brief explanation of how you understood the query",
  "rules": [
    {
      "type": "include",
      "conditions": [
        {
          "field": "price" | "volume" | "f2p" | "members",
          "operator": "gt" | "lt" | "gte" | "lte" | "eq" | "between",
          "value": number | boolean | [min, max]
        }
      ],
      "combineWith": "AND"
    }
  ],
  "defaultAction": "exclude"
}

EXAMPLES:

Query: "F2P items between 100k and 10m"
Response:
{
  "interpretation": "Include only F2P items priced between 100,000 and 10,000,000 gp",
  "rules": [
    {
      "type": "include",
      "conditions": [
        {"field": "price", "operator": "between", "value": [100000, 10000000]},
        {"field": "f2p", "operator": "eq", "value": true}
      ],
      "combineWith": "AND"
    }
  ],
  "defaultAction": "exclude"
}

Query: "Everything under 10m except high volume items"
Response:
{
  "interpretation": "Include items under 10m, but ALSO include high-volume items regardless of price",
  "rules": [
    {
      "type": "include",
      "conditions": [
        {"field": "price", "operator": "lt", "value": 10000000}
      ],
      "combineWith": "AND"
    },
    {
      "type": "include",
      "conditions": [
        {"field": "volume", "operator": "gt", "value": 10000}
      ],
      "combineWith": "AND"
    }
  ],
  "defaultAction": "exclude"
}

Query: "Members items over 1m OR any item with 50k+ volume"
Response:
{
  "interpretation": "Include items that are either: (members AND >1m) OR (volume >50k)",
  "rules": [
    {
      "type": "include",
      "conditions": [
        {"field": "members", "operator": "eq", "value": true},
        {"field": "price", "operator": "gt", "value": 1000000}
      ],
      "combineWith": "AND"
    },
    {
      "type": "include",
      "conditions": [
        {"field": "volume", "operator": "gt", "value": 50000}
      ],
      "combineWith": "AND"
    }
  ],
  "defaultAction": "exclude"
}

NOW PROCESS THE USER'S QUERY. Return ONLY the JSON, nothing else.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': import.meta.env.VITE_CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Claude API error: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  const jsonText = data.content[0].text.trim();

  // Strip markdown code blocks if present
  const cleanedText = jsonText
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  try {
    return JSON.parse(cleanedText);
  } catch (e) {
    throw new Error(`Failed to parse Claude response: ${e.message}`);
  }
}
````

**filterRuleEvaluator.js**

```javascript
/**
 * Evaluate filter rules against items to determine tradeable/blocked lists
 * @param {Object} filterConfig - Filter configuration from Claude
 * @param {Array} itemsData - Full item mapping from OSRS Wiki
 * @param {Object} priceData - Latest price data (already extracted .data from API)
 * @param {Object} volumeData - Optional 5m volume data (already extracted .data)
 * @returns {Object} { tradeable: Array, blocked: Array, stats: Object, interpretation: string }
 */
export function evaluateFilterRules(
  filterConfig,
  itemsData,
  priceData,
  volumeData = null
) {
  const { rules, defaultAction, interpretation } = filterConfig;

  // Filter items to determine which are tradeable
  const tradeable = itemsData.filter(item => {
    // Get item data
    const itemPriceData = priceData[String(item.id)];
    if (!itemPriceData) return false; // Skip items without price data

    const price = itemPriceData.high;
    if (price === null || price === undefined || price <= 0) {
      return false; // Skip items without valid price
    }

    // Calculate volume if available
    let volume = 0;
    if (volumeData) {
      const itemVolume = volumeData[String(item.id)];
      if (itemVolume) {
        volume =
          (itemVolume.highPriceVolume || 0) + (itemVolume.lowPriceVolume || 0);
      }
    }

    // Evaluate each rule
    for (const rule of rules) {
      const conditionsMet = evaluateConditions(
        rule.conditions,
        item,
        price,
        volume
      );

      // If conditions met, apply rule type
      if (conditionsMet) {
        return rule.type === 'include';
      }
    }

    // No rules matched, use default action
    return defaultAction === 'include';
  });

  // Create blocklist of everything NOT tradeable
  const blocked = itemsData
    .filter(item => !tradeable.find(t => t.id === item.id))
    .map(item => item.id);

  // Calculate statistics
  const stats = {
    tradeableCount: tradeable.length,
    blockedCount: blocked.length,
    totalItems: itemsData.length,
    itemsWithoutPriceData: itemsData.filter(i => !priceData[String(i.id)]?.high)
      .length,
  };

  return { tradeable, blocked, stats, interpretation };
}

/**
 * Evaluate a set of conditions for an item
 * @param {Array} conditions - Array of condition objects
 * @param {Object} item - Item from mapping
 * @param {number} price - Item price
 * @param {number} volume - Item volume
 * @returns {boolean} True if all conditions met (AND logic within rule)
 */
function evaluateConditions(conditions, item, price, volume) {
  return conditions.every(condition => {
    const { field, operator, value } = condition;

    // Get field value
    let fieldValue;
    switch (field) {
      case 'price':
        fieldValue = price;
        break;
      case 'volume':
        fieldValue = volume;
        break;
      case 'f2p':
        fieldValue = !item.members; // F2P = not members
        break;
      case 'members':
        fieldValue = item.members;
        break;
      default:
        return false;
    }

    // Evaluate operator
    switch (operator) {
      case 'gt':
        return fieldValue > value;
      case 'lt':
        return fieldValue < value;
      case 'gte':
        return fieldValue >= value;
      case 'lte':
        return fieldValue <= value;
      case 'eq':
        return fieldValue === value;
      case 'between':
        return fieldValue >= value[0] && fieldValue <= value[1];
      default:
        return false;
    }
  });
}

/**
 * Generate a smart profile name from the filter configuration
 * @param {Object} filterConfig - Filter configuration
 * @returns {string} Suggested profile name
 */
export function generateProfileNameFromRules(filterConfig) {
  const { interpretation } = filterConfig;

  // Try to extract key terms from interpretation
  const terms = [];

  // Look for price ranges
  const priceMatch = interpretation.match(/(\d+k|\d+m)/gi);
  if (priceMatch && priceMatch.length >= 2) {
    terms.push(`${priceMatch[0]}-${priceMatch[1]}`);
  } else if (priceMatch) {
    terms.push(priceMatch[0]);
  }

  // Look for F2P/Members
  if (/\bf2p\b/i.test(interpretation)) {
    terms.push('F2P');
  } else if (/\bmembers?\b/i.test(interpretation)) {
    terms.push('Members');
  }

  // Look for volume mentions
  if (/volume/i.test(interpretation)) {
    terms.push('High Vol');
  }

  // If we have terms, combine them
  if (terms.length > 0) {
    return terms.join(' ');
  }

  // Fallback: use first few words of interpretation
  const words = interpretation.split(' ').slice(0, 4).join(' ');
  return words.length > 30 ? words.substring(0, 27) + '...' : words;
}
```

**presetProfiles.js**

```javascript
/**
 * Predefined filter configurations for common use cases
 */
export const PRESET_PROFILES = {
  'F2P under 1m': {
    query: 'F2P items under 1 million gp',
    description: 'Free-to-play items only, budget flips',
  },
  'Budget flips': {
    query: 'Items between 100k and 5m with good volume',
    description: 'Mid-range items with decent trading volume',
  },
  'High volume items': {
    query: 'Any item with trading volume over 10000',
    description: 'Popular items that trade frequently',
  },
  'Members 1m-10m': {
    query: 'Members-only items between 1m and 10m',
    description: 'Mid to high-value members items',
  },
  'Popular items': {
    query: 'Items with volume over 5000 between 100k and 20m',
    description: 'Frequently traded items in a wide price range',
  },
  'Low risk flips': {
    query: 'F2P items between 50k and 500k with high volume',
    description: 'Safe, consistent flips for beginners',
  },
};

/**
 * Get preset configuration by name
 * @param {string} presetName - Name of preset
 * @returns {Object} Preset configuration
 */
export function getPreset(presetName) {
  return PRESET_PROFILES[presetName];
}

/**
 * Get all preset names
 * @returns {Array<string>} Array of preset names
 */
export function getAllPresets() {
  return Object.keys(PRESET_PROFILES);
}
```

**osrsWikiApi.js**

```javascript
const BASE_URL = 'https://prices.runescape.wiki/api/v1/osrs';

// ⚠️ REQUIRED: Descriptive User-Agent per OSRS Wiki API policy
// Update this URL to your actual repository
const headers = {
  'User-Agent':
    'OSRS Flip Dashboard Blocklist Generator - github.com/1000tomax/OSRS-Flip-Tracker-Combined',
};

/**
 * Fetch all item mappings
 * @returns {Promise<Array>} Array of item objects
 */
export async function fetchItemMapping() {
  const response = await fetch(`${BASE_URL}/mapping`, { headers });
  if (!response.ok) {
    throw new Error(
      `Failed to fetch item mapping: ${response.status} ${response.statusText}`
    );
  }
  // Returns array directly (no wrapper object)
  return response.json();
}

/**
 * Fetch latest prices for all items
 * @returns {Promise<Object>} Price data keyed by item ID (string)
 */
export async function fetchLatestPrices() {
  const response = await fetch(`${BASE_URL}/latest`, { headers });
  if (!response.ok) {
    throw new Error(
      `Failed to fetch prices: ${response.status} ${response.statusText}`
    );
  }
  const json = await response.json();
  // Returns: { data: { "4151": { high, highTime, low, lowTime }, ... } }
  // Extract .data property to get price info keyed by item ID
  return json.data;
}

/**
 * Fetch 5-minute volume data (Phase 2 feature)
 * @returns {Promise<Object>} Volume data keyed by item ID (string)
 */
export async function fetch5MinVolume() {
  const response = await fetch(`${BASE_URL}/5m`, { headers });
  if (!response.ok) {
    throw new Error(
      `Failed to fetch volume data: ${response.status} ${response.statusText}`
    );
  }
  const json = await response.json();
  // Returns: { data: { "4151": { avgHighPrice, highPriceVolume, avgLowPrice, lowPriceVolume, timestamp }, ... } }
  // Extract .data property to get volume info keyed by item ID
  return json.data;
}
```

**ProfileDownloader.jsx**

```javascript
/**
 * Generate a default profile name from filter interpretation
 * (This function is in filterRuleEvaluator.js, imported here)
 */
import { generateProfileNameFromRules } from '../../utils/filterRuleEvaluator';

/**
 * Download profile JSON file
 */
export function downloadProfile(blockedIds, options = {}) {
  const profile = {
    blockedItemIds: blockedIds,
    timeframe: options.timeframe || 5,
    f2pOnlyMode: options.f2pOnly || false,
  };

  // Create JSON blob
  const json = JSON.stringify(profile);
  const blob = new Blob([json], { type: 'application/json' });

  // Generate filename with Mreedon branding
  const baseName = options.profileName || 'Custom Blocklist';
  const filename = `${baseName} Mreedon.profile.json`;

  // Create download link
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();

  // Cleanup
  URL.revokeObjectURL(url);
}
```

---

## 🔒 OSRS Wiki API Compliance

### Mandatory Requirements

✅ **User-Agent Header (REQUIRED)**

- Must be descriptive and include contact info
- Format: `"Project Name - contact@example.com"` or
  `"Project Name - github.com/user/repo"`
- ❌ **Blocked User-Agents:** `python-requests`, `Python-urllib`,
  `Apache-HttpClient`, `RestSharp`, `Java/*`, `curl/*`
- ✅ **Our User-Agent:**
  `OSRS Flip Dashboard Blocklist Generator - github.com/1000tomax/OSRS-Flip-Tracker-Combined`

✅ **No ID Parameter Looping**

- ❌ **NEVER DO THIS:** Loop through 3,700 items with `?id=` parameter
- ✅ **CORRECT:** Fetch all items at once without `id` parameter
- **Reason:** 100x more efficient for both client and server

### Usage Patterns

**Our API Call Pattern:**

```javascript
// Page load: 2 API calls total
1. GET /mapping        // ~3,700 items, ~500KB
2. GET /latest         // ~3,700 prices, ~200KB

// Optional Phase 2:
3. GET /5m             // Volume data, ~300KB

// User interaction: 0 additional API calls
// All filtering happens client-side
```

**Why This Is Acceptable:**

- Very light usage (2-3 calls per page load)
- No repeated calls (client-side caching)
- No looping or pagination
- Respectful rate (only when user visits page)
- Well under "multiple large queries per second" threshold

### Error Handling for API Constraints

**Missing Price Data:**

```javascript
// Some items never traded → won't appear in /latest
const price = priceData[String(item.id)]?.high;
if (!price) {
  // Exclude from tradeable list (safer to block unknown items)
  return false;
}
```

**Null High/Low Prices:**

```javascript
// Item traded but never instant-buy → high = null
if (price === null || price === undefined || price <= 0) {
  return false; // Exclude items without valid instant-buy price
}
```

**Item ID as String Keys:**

```javascript
// API returns item IDs as string keys, not numbers
// ❌ Wrong: priceData[4151]
// ✅ Correct: priceData["4151"] or priceData[String(item.id)]
```

### Discord Communication

**Recommended:** Join `#api-discussion` channel on OSRS Wiki Discord

- Get advance notice of breaking changes
- Discuss optimization strategies
- Report issues or high usage patterns

**When to reach out:**

- Planning significant increase in usage
- Experiencing rate limiting or blocking
- Need bulk data access
- Building production tool with high traffic

---

## 🤖 Claude Code Implementation Guide

This section provides step-by-step instructions specifically for Claude Code to
implement this feature.

### Prerequisites Check

Before starting, verify the project structure:

```bash
# Verify you're in the project root
ls -la

# Check existing guest dashboard structure
ls -la src/guest/

# Verify React and dependencies are installed
cat package.json | grep -E "react|recharts"

# CRITICAL: Verify Claude API key is set
echo $VITE_CLAUDE_API_KEY

# Check if Claude API is already used in project (text-to-SQL feature)
grep -r "anthropic.com/v1/messages" src/
```

### Implementation Order

**Total Estimated Time:** 6-8 hours for MVP

#### Phase 1: Setup & File Creation (30 min)

1. **Create folder structure:**

```bash
mkdir -p src/guest/pages
mkdir -p src/guest/components/BlocklistGenerator
mkdir -p src/guest/utils
```

2. **Create placeholder files:**

```bash
# Main page
touch src/guest/pages/BlocklistGeneratorPage.jsx

# Components
touch src/guest/components/BlocklistGenerator/NaturalLanguageInput.jsx
touch src/guest/components/BlocklistGenerator/PresetButtons.jsx
touch src/guest/components/BlocklistGenerator/BlocklistPreview.jsx
touch src/guest/components/BlocklistGenerator/ProfileDownloader.jsx
touch src/guest/components/BlocklistGenerator/SimpleModeForm.jsx
touch src/guest/components/BlocklistGenerator/index.js

# Utilities
touch src/guest/utils/osrsWikiApi.js
touch src/guest/utils/claudeFilterService.js
touch src/guest/utils/filterRuleEvaluator.js
touch src/guest/utils/presetProfiles.js
```

3. **Add route to guest app:**
   - Open `src/guest/GuestApp.jsx` (or equivalent)
   - Add route: `/guest/blocklist-generator`
   - Import: `BlocklistGeneratorPage`

#### Phase 2: OSRS Wiki API Layer (1 hour)

**File:** `src/guest/utils/osrsWikiApi.js`

**Implementation:** Use the complete code from the "Core Logic" section above.
This is unchanged from v1.2.

**Requirements:**

- Export three functions: `fetchItemMapping()`, `fetchLatestPrices()`,
  `fetch5MinVolume()`
- Use the User-Agent header:
  `'OSRS Flip Dashboard Blocklist Generator - github.com/1000tomax/OSRS-Flip-Tracker-Combined'`
- Extract `.data` property from `/latest` and `/5m` responses
- `/mapping` returns array directly (no extraction needed)
- Add proper error handling with retry logic
- Add timeout handling (10 seconds)

**Testing:**

```bash
# Test in browser console after implementing
fetchItemMapping().then(data => console.log('Items:', data.length))
fetchLatestPrices().then(data => console.log('Prices:', Object.keys(data).length))
```

#### Phase 3: Claude API Integration (2 hours)

**File:** `src/guest/utils/claudeFilterService.js`

**Implementation:** Use the complete code from the "Core Logic" section above.

**Key Points:**

- Reuse existing Claude API integration patterns from text-to-SQL feature if
  available
- Use `claude-sonnet-4-20250514` model
- Set max_tokens to 1500
- Handle JSON parsing with markdown code block stripping
- Error handling for API failures
- Timeout after 30 seconds

**Prompt Engineering Tips:**

- The prompt is carefully crafted to return ONLY JSON
- Examples are provided to guide Claude's output format
- Support for AND, OR, EXCEPT logic through multiple rules
- Price parsing (1k, 1m, etc.)
- Volume interpretation (5-min window)

**Testing:**

```javascript
// Test with simple query
const result = await convertQueryToFilterRules(
  'F2P items between 100k and 1m',
  4307,
  4194,
  1765
);
console.log('Filter rules:', result);
```

#### Phase 4: Filter Rule Evaluator (1 hour)

**File:** `src/guest/utils/filterRuleEvaluator.js`

**Implementation:** Use the complete code from the "Core Logic" section above.

**Key Functions:**

1. `evaluateFilterRules()` - Main evaluation function
2. `evaluateConditions()` - Helper to check condition matches
3. `generateProfileNameFromRules()` - Smart name generation

**Logic:**

- Each rule has type "include" or "exclude"
- Conditions within a rule use AND logic
- Multiple rules use OR logic (first match wins)
- Default action when no rules match
- Handle null/missing price and volume data

**Testing:**

```javascript
// Test with sample filter config
const testConfig = {
  interpretation: 'F2P items 100k-1m',
  rules: [
    {
      type: 'include',
      conditions: [
        { field: 'price', operator: 'between', value: [100000, 1000000] },
        { field: 'f2p', operator: 'eq', value: true },
      ],
      combineWith: 'AND',
    },
  ],
  defaultAction: 'exclude',
};

const result = evaluateFilterRules(testConfig, itemsData, priceData);
console.log(
  `Tradeable: ${result.tradeable.length}, Blocked: ${result.blocked.length}`
);
```

#### Phase 5: Preset Profiles (30 min)

**File:** `src/guest/utils/presetProfiles.js`

**Implementation:** Use the complete code from the "Core Logic" section above.

**Presets to include:**

- F2P under 1m
- Budget flips (100k-5m with volume)
- High volume items
- Members 1m-10m
- Popular items
- Low risk flips

**Testing:**

```javascript
const presets = getAllPresets();
console.log('Available presets:', presets);

const preset = getPreset('F2P under 1m');
console.log('Preset query:', preset.query);
```

#### Phase 6: UI Components (2-3 hours)

**Build in this order:**

1. **NaturalLanguageInput.jsx** (Main query interface) - 45 min
   - Textarea for natural language query
   - Character limit (500 chars recommended)
   - "Generate Blocklist" button
   - Loading state during Claude API call
   - Error display for failed queries
   - Help text with examples
   - Use Tailwind CSS classes from design tokens

2. **PresetButtons.jsx** (Quick preset selection) - 30 min
   - Import presets from `presetProfiles.js`
   - Render buttons for each preset
   - Click handler fills query textarea
   - Tooltip showing preset description
   - Responsive grid layout

3. **BlocklistPreview.jsx** (Results display) - 45 min
   - Shows Claude's interpretation of query
   - Shows tradeable/blocked counts
   - Shows top 5-10 sample items with names and prices
   - **Profile name text input** (editable, shows "{name} Mreedon" suffix)
   - Help text: "This name will appear in Flipping Copilot"
   - Loading state while filtering
   - "Download Profile" button
   - "Try Different Query" button to go back

4. **SimpleModeForm.jsx** (Fallback manual filters) - 45 min
   - Simple price range inputs (min/max numbers)
   - F2P Only checkbox
   - Members Only checkbox
   - "Generate Profile" button
   - Only shown when Claude API unavailable or user requests it
   - Much simpler than original slider design

5. **ProfileDownloader.jsx** (Download handler) - 15 min
   - Export function: `downloadProfile(blockedIds, options)`
   - Create JSON blob with structure:
     `{ blockedItemIds, timeframe, f2pOnlyMode }`
   - Append "Mreedon" suffix to filename: `{profileName} Mreedon.profile.json`
   - Trigger browser download
   - Use `URL.createObjectURL()` and cleanup

6. **index.js** (Barrel export) - 5 min
   - Export all components for clean imports

#### Phase 7: Main Page Assembly (1 hour)

**File:** `src/guest/pages/BlocklistGeneratorPage.jsx`

**State Management:**

```javascript
const [query, setQuery] = useState('');
const [itemsData, setItemsData] = useState(null);
const [priceData, setPriceData] = useState(null);
const [volumeData, setVolumeData] = useState(null);

// Claude API results
const [filterConfig, setFilterConfig] = useState(null);
const [preview, setPreview] = useState(null);

// Profile name - auto-generated from filterConfig
const [profileName, setProfileName] = useState('');

// UI state
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);
const [showSimpleMode, setShowSimpleMode] = useState(false);

// Auto-generate profile name when filter config changes
useEffect(() => {
  if (filterConfig) {
    const newName = generateProfileNameFromRules(filterConfig);
    setProfileName(newName);
  }
}, [filterConfig]);
```

**Flow:**

1. **On mount**: Fetch `/mapping` and `/latest` (2 API calls)
   - Show loading state during fetch
   - Store in state
   - Optionally pre-fetch `/5m` for volume data

2. **User enters query** or clicks preset:
   - Query fills textarea
   - User clicks "Generate Blocklist"

3. **On Generate click**:
   - Show loading state
   - Call `convertQueryToFilterRules(query, ...)`
   - Get filter configuration from Claude
   - Store filterConfig in state

4. **Immediately evaluate filters**:
   - Call `evaluateFilterRules(filterConfig, itemsData, priceData, volumeData)`
   - Get tradeable/blocked lists and stats
   - Auto-generate profile name
   - Show BlocklistPreview with results

5. **User can edit profile name** in preview

6. **On "Download Profile" click**:
   - Call
     `downloadProfile(blocked, { profileName, timeframe: 5, f2pOnly: filterConfig.f2pOnly })`
   - Final filename: `{profileName} Mreedon.profile.json`

7. **Fallback to Simple Mode**:
   - If Claude API key missing or API fails
   - Show SimpleModeForm instead
   - Basic price range + F2P checkbox
   - Generate simple filter rules manually

**Error Handling:**

- Claude API timeout → Show error, suggest simpler query or Simple Mode
- Invalid JSON response → Show error, suggest rewording
- OSRS Wiki API failure → Show error with retry button
- No items match → Show warning before download

#### Phase 8: Error Handling & Edge Cases (45 min)

Add handling for:

- [ ] **Claude API failures** (show retry button + suggest Simple Mode)
- [ ] **Invalid Claude response** (JSON parse errors → suggest rewording)
- [ ] **Claude API timeout** (30s limit → suggest simpler query)
- [ ] **Missing API key** (auto-fallback to Simple Mode)
- [ ] **OSRS Wiki API failures** (show retry button)
- [ ] **Network timeouts** (10s limit for Wiki API)
- [ ] **No items match criteria** (show warning before download)
- [ ] **All items match criteria** (show info message)
- [ ] **Null/missing price data** (gracefully skip items)
- [ ] **Volume data unavailable** (filters still work without volume)
- [ ] **Query too vague** (Claude may return generic rules → show interpretation
      for confirmation)
- [ ] **Complex query timeout** (suggest breaking into simpler parts)

#### Phase 7: Polish & Testing (1 hour)

- [ ] Add loading spinner during Claude API call ("🧠 Understanding your
      request...")
- [ ] Add loading spinner during filter evaluation
- [ ] Add success toast on download
- [ ] Add helpful tooltips on query examples
- [ ] Show Claude's interpretation in preview (helps user verify)
- [ ] Add usage instructions section
- [ ] Add "Powered by Claude AI ✨" badge
- [ ] Test on mobile (responsive design)
- [ ] Test with various queries (simple to complex)
- [ ] Test with preset profiles
- [ ] Test Simple Mode fallback
- [ ] Test edge cases (no matches, all matches)
- [ ] Test OR logic ("items A OR items B")
- [ ] Test EXCEPT logic ("everything EXCEPT items with X")
- [ ] Verify downloaded JSON is valid
- [ ] Test profile can be imported into Flipping Copilot
- [ ] Verify "Mreedon" branding appears correctly

### Implementation Checklist

Copy this checklist and mark off items as you complete them:

**Setup:**

- [ ] Create folder structure (`pages/`, `components/BlocklistGenerator/`,
      `utils/`)
- [ ] Create all placeholder files
- [ ] Add route to guest app
- [ ] Verify Claude API key is set

**OSRS Wiki API Layer:**

- [ ] Implement `fetchItemMapping()` with User-Agent header
- [ ] Implement `fetchLatestPrices()` with `.data` extraction
- [ ] Implement `fetch5MinVolume()` with `.data` extraction
- [ ] Add error handling and retry logic
- [ ] Add timeout handling (10s)
- [ ] Test all three endpoints work

**Claude API Integration:**

- [ ] Implement `convertQueryToFilterRules()` function
- [ ] Craft comprehensive prompt with examples
- [ ] Use `claude-sonnet-4-20250514` model
- [ ] Handle JSON parsing with markdown stripping
- [ ] Add timeout handling (30s)
- [ ] Test with sample queries

**Filter Rule Evaluator:**

- [ ] Implement `evaluateFilterRules()` function
- [ ] Implement `evaluateConditions()` helper
- [ ] Implement `generateProfileNameFromRules()` function
- [ ] Use `String(item.id)` for lookups
- [ ] Handle null/missing prices
- [ ] Handle volume calculation (high + low)
- [ ] Return proper stats object
- [ ] Test with sample data

**Preset Profiles:**

- [ ] Create `PRESET_PROFILES` object with 6 presets
- [ ] Implement `getPreset()` function
- [ ] Implement `getAllPresets()` function
- [ ] Test preset queries

**UI Components:**

- [ ] Build `NaturalLanguageInput.jsx` with textarea and button
- [ ] Build `PresetButtons.jsx` with preset grid
- [ ] Build `BlocklistPreview.jsx` with results display
- [ ] Add profile name text input to preview (shows "{name} Mreedon")
- [ ] Build `SimpleModeForm.jsx` for fallback
- [ ] Build `ProfileDownloader.jsx` with download handler
- [ ] Create barrel export `index.js`
- [ ] Apply Tailwind styling from design tokens

**Main Page:**

- [ ] Implement state management
- [ ] Add profile name state with auto-generation from filterConfig
- [ ] Add API data fetching on mount
- [ ] Wire up NaturalLanguageInput
- [ ] Wire up PresetButtons
- [ ] Wire up BlocklistPreview
- [ ] Pass profileName and setProfileName to preview
- [ ] Wire up ProfileDownloader with profile name
- [ ] Add loading states for Claude API
- [ ] Add loading states for OSRS Wiki API
- [ ] Add error states
- [ ] Implement Simple Mode fallback

**Error Handling:**

- [ ] Handle Claude API failures with retry
- [ ] Handle invalid JSON responses
- [ ] Handle Claude API timeouts
- [ ] Handle missing API key (fallback to Simple Mode)
- [ ] Handle OSRS Wiki API failures with retry
- [ ] Handle network timeouts
- [ ] Handle no matches warning
- [ ] Handle all matches info
- [ ] Handle null/missing data
- [ ] Handle volume unavailable

**Polish:**

- [ ] Add loading spinners for Claude API
- [ ] Add loading spinners for filter evaluation
- [ ] Add success notifications
- [ ] Add tooltips and help text
- [ ] Add usage instructions
- [ ] Show Claude's interpretation
- [ ] Add "Powered by Claude AI" badge
- [ ] Mobile responsive design
- [ ] Test all features
- [ ] Test complex queries (OR, EXCEPT)
- [ ] Test presets
- [ ] Test Simple Mode
- [ ] Verify JSON format
- [ ] Test profile import

### Testing Commands

```bash
# Start dev server
npm run dev

# Navigate to page
# http://localhost:5173/guest/blocklist-generator

# Test API calls in browser console
fetch('https://prices.runescape.wiki/api/v1/osrs/mapping', {
  headers: { 'User-Agent': 'OSRS Flip Dashboard Blocklist Generator - github.com/1000tomax/OSRS-Flip-Tracker-Combined' }
}).then(r => r.json()).then(d => console.log('Items:', d.length))

# Build for production
npm run build

# Preview production build
npm run preview
```

### Common Issues & Solutions

**Issue:** Claude API returns invalid JSON **Solution:** Strip markdown code
blocks: `jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()`

**Issue:** Claude misinterprets complex query **Solution:** Show interpretation
to user for confirmation before download. Allow editing or retry.

**Issue:** Claude API timeout (>30s) **Solution:** Suggest breaking query into
simpler parts or using Simple Mode

**Issue:** Missing Claude API key **Solution:** Auto-fallback to Simple Mode,
show message about limited functionality

**Issue:** CORS error when fetching OSRS Wiki API **Solution:** Confirmed
working (from v1.2 testing) - check User-Agent header is set correctly

**Issue:** Price data lookup returns undefined **Solution:** Use
`String(item.id)` not `item.id` - IDs are string keys

**Issue:** Item has no price **Solution:** Check for null:
`if (!priceData[String(item.id)]?.high) return false;`

**Issue:** Volume data returns fewer items **Solution:** Expected - only 1,765
items have volume data (41% of items)

**Issue:** Downloaded file won't import into Flipping Copilot **Solution:**
Verify JSON structure matches:
`{ blockedItemIds: [...], timeframe: 5, f2pOnlyMode: false }`

**Issue:** Profile name has special characters **Solution:** Allow any
characters user types - filename sanitization happens in browser download

**Issue:** Claude generates rules that match all items **Solution:** Show
warning in preview: "This will allow all items. Consider being more specific."

**Issue:** User query too vague ("good items") **Solution:** Claude prompt asks
for clarification in interpretation. Show examples of better queries.

### Performance Notes

- **Target:** Preview generation in <2 seconds
- **Optimization:** All filtering happens client-side (no additional API calls
  after initial fetch)
- **Memory:** 4,307 items easily handled by modern browsers
- **Caching:** Consider using `useMemo()` for filtered results
- **Volume:** Fetch `/5m` only when user enables volume filter (saves bandwidth)

### Success Criteria

Before marking as complete, verify:

✅ User can adjust price range and see preview  
✅ User can filter by F2P/Members  
✅ User can enable volume filtering  
✅ Preview shows accurate counts  
✅ Download produces valid profile JSON  
✅ File can be imported into Flipping Copilot  
✅ Loading states show during API calls  
✅ Error states show helpful messages  
✅ Works on mobile devices  
✅ No console errors

---

## 🎛️ Configuration Options

### Default Values

| Option          | Type      | Default    | Min    | Max          | Notes                |
| --------------- | --------- | ---------- | ------ | ------------ | -------------------- |
| `minPrice`      | `number`  | `100000`   | `1000` | `2147483647` | 100k default minimum |
| `maxPrice`      | `number`  | `10000000` | `1000` | `2147483647` | 10m default maximum  |
| `volumeEnabled` | `boolean` | `false`    | -      | -            | Optional filter      |
| `minVolume`     | `number`  | `100`      | `1`    | `1000000`    | Daily trades         |
| `maxVolume`     | `number`  | `50000`    | `1`    | `1000000`    | Daily trades         |
| `f2pOnly`       | `boolean` | `false`    | -      | -            | F2P filter           |
| `membersOnly`   | `boolean` | `false`    | -      | -            | Members filter       |
| `timeframe`     | `number`  | `5`        | `1`    | `60`         | Minutes for Copilot  |

### State Management

```javascript
const [criteria, setCriteria] = useState({
  minPrice: 100000,
  maxPrice: 10000000,
  volumeEnabled: false,
  minVolume: 100,
  maxVolume: 50000,
  f2pOnly: false,
  membersOnly: false,
  timeframe: 5,
});

// Profile name - auto-generated but user can edit
const [profileName, setProfileName] = useState('100k-10m');

const [preview, setPreview] = useState(null);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

// When volume filtering is enabled, make extra API call
const [volumeData, setVolumeData] = useState(null);

// Update profile name when criteria changes
useEffect(() => {
  const newName = generateDefaultProfileName(criteria);
  setProfileName(newName);
}, [criteria]);
```

---

## 🚀 MVP vs Future Enhancements

### MVP (Build First) ✅

Must-have features for initial release:

- ✅ Natural language query input (Claude-powered)
- ✅ 6 preset profile buttons for common use cases
- ✅ Claude API integration for filter generation
- ✅ Filter rule evaluation (supports OR, EXCEPT, AND logic natively)
- ✅ Preview tradeable/blocked counts
- ✅ Show Claude's interpretation of query
- ✅ Download profile button with Mreedon branding
- ✅ Profile name customization
- ✅ Loading states (Claude API + filtering)
- ✅ Error handling (API failures, invalid queries)
- ✅ Simple Mode fallback (manual filters when API unavailable)
- ✅ Mobile responsive design
- ✅ Basic instructions/help text with query examples

**Already Included in MVP (vs slider approach):**

- ✅ OR logic ("items A OR items B")
- ✅ EXCEPT logic ("everything EXCEPT items with X")
- ✅ Complex multi-condition filtering
- ✅ Natural query refinement (just retype)
- ✅ Volume filtering handled automatically when mentioned

### Phase 2 Enhancements 📊

After MVP is validated:

- 🔍 Query history (save last 10 queries in localStorage)
- 📋 Expandable item list in preview (show all tradeable items, not just top 10)
- 💾 Save custom presets to localStorage
- 📤 Import existing profile to modify
- 📊 Visual distribution chart of tradeable items by price range
- 📈 Show price trends for top tradeable items
- 🎯 "Optimize query" button (Claude suggests improvements)
- 🔄 Query refinement suggestions ("Did you mean...?")
- 📱 Share profile link (encode filter rules in URL)
- 🌟 "Explain" button (Claude explains why certain items match)

### Phase 3 Advanced Features 🤖

Long-term enhancements:

- 🏷️ **Category filtering** (Claude could infer categories from names)
  - Requires external data or Claude analysis
  - Categories: Combat, Skilling, Consumables, Resources, etc.
  - Example: "Combat gear under 5m" → Claude identifies combat-related items
- 📈 Historical price analysis (using /timeseries endpoint)
- 🎯 Profit prediction based on past data
- 💬 Multi-turn conversation with Claude (refine query iteratively)
- 🌐 Multi-language support (Claude handles translation)
- 👥 Community preset sharing platform (vote on best queries)
- 🔄 Auto-update blocklist based on market changes
- 🔔 Profile change notifications (when market shifts affect criteria)
- 🎨 Hybrid editor (visual sliders + natural language combined)

---

## 📝 Acceptance Criteria

### Functional Requirements

✅ User can enter natural language query describing filter criteria  
✅ User can click preset buttons to auto-fill common queries  
✅ Claude API converts query to structured filter rules  
✅ System shows Claude's interpretation for user confirmation  
✅ Preview shows accurate tradeable/blocked counts  
✅ Preview shows sample tradeable items (top 5-10)  
✅ User can customize profile name before download  
✅ Downloaded file is valid JSON matching profile format  
✅ File can be imported into Flipping Copilot plugin  
✅ Loading states show during Claude API and OSRS Wiki API calls  
✅ Error states show helpful messages on API failures  
✅ User can retry on error  
✅ Simple Mode fallback works when Claude API unavailable  
✅ OR and EXCEPT logic work correctly

### UI/UX Requirements

✅ UI is responsive on mobile (320px - 1920px+)  
✅ Controls are accessible (keyboard navigation)  
✅ Visual feedback on all interactions  
✅ Clear labels and instructions  
✅ Query examples visible to guide users  
✅ Claude's interpretation shown before download  
✅ "Powered by Claude AI" badge present  
✅ Consistent with existing guest dashboard design  
✅ Performance: Claude response in <5 seconds  
✅ Performance: Filter evaluation in <2 seconds

### Technical Requirements

✅ Code follows existing project conventions  
✅ Reuses existing Claude API integration patterns  
✅ No new external dependencies (use existing Claude integration)  
✅ Proper error boundaries  
✅ Loading states prevent multiple API calls  
✅ OSRS Wiki API calls use proper User-Agent header  
✅ Downloaded JSON is minified  
✅ Memory efficient (doesn't crash with 4000+ items)  
✅ Claude API timeout handling (30s max)  
✅ Graceful fallback when API unavailable

---

## 🐛 Edge Cases & Error Handling

### API Failures

**Case:** OSRS Wiki API is down  
**Handle:** Show error message with retry button  
**Message:** "Unable to fetch OSRS item data. Please try again later."

**Case:** API rate limit hit (unlikely with our usage)  
**Handle:** Show friendly message, suggest waiting 30 seconds  
**Message:** "API rate limit reached. Please wait a moment and try again."

**Case:** Network timeout  
**Handle:** Retry automatically once, then show error  
**Implementation:**

```javascript
try {
  const data = await fetchWithRetry(url, { timeout: 10000, retries: 1 });
} catch (error) {
  showError('Network timeout. Please check your connection and try again.');
}
```

### Data Edge Cases (From OSRS Wiki API)

**Case:** Item never traded (not in `/latest` response)  
**Handle:** Exclude from tradeable list (safer to block)  
**Example:** Discontinued items, unreleased content  
**Code:** `if (!priceData[String(item.id)]) return false;`

**Case:** Item traded but `high` price is null (never instant-buy)  
**Handle:** Exclude from tradeable list  
**Reason:** Can't determine if item meets price criteria  
**Code:** `if (price === null || price === undefined) return false;`

**Case:** Item traded but `low` price is null (never instant-sell)  
**Handle:** N/A for our use case (we use `high` price)  
**Note:** Could use `low` price as fallback in future

**Case:** Item ID type mismatch (number vs string)  
**Handle:** Always convert item.id to string for lookup  
**Code:** `priceData[String(item.id)]` not `priceData[item.id]`

**Case:** Very low price items (< 1 gp)  
**Handle:** Exclude items with price <= 0  
**Code:** `if (price <= 0) return false;`

### Filtering Edge Cases

**Case:** No items match criteria  
**Handle:** Show warning before download  
**Message:** "⚠️ Your criteria are too strict. No items will be tradeable. All
~3,700 items will be blocked."  
**Action:** Disable download button, suggest loosening criteria

**Case:** All items match criteria  
**Handle:** Show warning  
**Message:** "⚠️ Your criteria will allow all items. Consider tightening filters
to focus your trading."  
**Action:** Allow download but show warning

**Case:** Very few items match (< 10)  
**Handle:** Show info message  
**Message:** "ℹ️ Only {count} items will be tradeable. This is a very focused
strategy."

**Case:** Price data missing for item (item exists in mapping but not in
/latest)  
**Handle:** Exclude from tradeable list (safer to block unknown items)  
**Stats:** Show count in preview: "X items excluded (no price data)"

### Volume Filtering Edge Cases (Phase 2)

**Case:** Volume filtering enabled but `/5m` API fails  
**Handle:** Disable volume filter, continue with price filtering only  
**Message:** "Volume data unavailable. Filtering by price only."

**Case:** Item in `/latest` but not in `/5m`  
**Handle:** Exclude from tradeable list when volume filter enabled  
**Reason:** Can't verify volume criteria

**Case:** Zero volume reported  
**Handle:** Treat as no volume data (exclude if filtering)  
**Code:** `if (totalVolume === 0) return false;`

### User Input Edge Cases

**Case:** Min price > Max price  
**Handle:** Auto-swap values or disable preview button  
**UX:** Show validation error: "Minimum price must be less than maximum price"

**Case:** Both F2P and Members selected  
**Handle:** Treat as "All Items" (don't filter by membership)  
**Logic:** `if (f2pOnly && membersOnly) { /* skip membership filter */ }`

**Case:** Extreme price ranges (1gp - 2.147b)  
**Handle:** Allow but show performance warning  
**Message:** "This will include all tradeable items. Processing may take a
moment."

**Case:** Volume range with minimum > maximum  
**Handle:** Auto-swap or show validation error

### Browser Compatibility

**Case:** `fetch` API not available (very old browser)  
**Handle:** Show compatibility error  
**Message:** "Your browser doesn't support this feature. Please use a modern
browser."

**Case:** Blob download not supported  
**Handle:** Fallback to copy-to-clipboard  
**Action:** Show JSON in textarea with "Copy" button

**Case:** localStorage not available (private mode)  
**Handle:** Still allow feature, just no saved presets  
**Message:** "Note: Presets cannot be saved in private browsing mode."

---

## 📊 Success Metrics

### Primary Metrics

- Downloads per week
- Successful profile imports (requires user feedback)
- Time to generate profile (<2 seconds target)

### User Satisfaction

- Reduction in manual blocking effort
- Repeat usage rate
- Feature requests/feedback

---

## 🔗 Related Documentation

- [Flipping Copilot GitHub](https://github.com/flippingcopilot/plugin) - Plugin
  source
- [OSRS Wiki Price API](https://oldschool.runescape.wiki/w/RuneScape:Real-time_Prices) -
  API docs
- [Profile Format Changes v1.7.9](https://github.com/flippingcopilot/plugin/releases/tag/v1.7.9) -
  Format spec

---

## 📞 Questions for Product Owner

1. Should we include category filtering in MVP or Phase 2?
2. Do we want to add analytics tracking for feature usage?
3. Should users be able to save/load multiple presets?
4. Do we want to add community preset sharing?
5. Should we add a "recommended presets" feature?

---

## 🎨 Design Tokens

Use existing guest dashboard theme:

```javascript
// Colors (from existing theme)
const COLORS = {
  primary: 'bg-blue-600',
  success: 'text-green-400',
  danger: 'text-red-400',
  background: 'bg-gray-900',
  card: 'bg-gray-800',
  border: 'border-gray-700',
};

// Typography
const FONTS = {
  heading: 'text-xl font-bold',
  body: 'text-sm text-gray-300',
  label: 'text-sm font-medium text-gray-200',
};
```

---

## 💡 Notes & Assumptions

### User Expectations

1. **File placement:** Users must manually place profile in plugin directory (no
   auto-import)
2. **User knowledge:** Users know how to navigate to RuneLite plugin directory
3. **Plugin compatibility:** Profile format matches Flipping Copilot v1.7.9+
   exactly

### API & Data

4. **API reliability:** OSRS Wiki API is stable and well-maintained
5. **Item count:** 4,307 total items (CORS test verified 2025-10-07)
6. **Price data:** 4,194 items have price data; 113 items don't (2.6%)
7. **Volume data:** 1,765 items have volume data; 2,542 items don't (41%
   coverage)
8. **Price accuracy:** Real-time prices from actual GE trades (5-minute lag max)
9. **CORS enabled:** Direct browser API calls confirmed working (no proxy
   needed)

### Technical

10. **Performance:** Modern browsers can handle filtering 4k+ items client-side
    in <2 seconds
11. **Browser compatibility:** Target modern browsers (Chrome 90+, Firefox 88+,
    Safari 14+)
12. **Network:** Assume reasonable internet connection for API calls
13. **Caching:** Browser caching reduces load on OSRS Wiki servers
14. **No authentication:** OSRS Wiki API is public (no API keys required)
15. **Frontend-only:** CORS support allows 100% frontend implementation

### Compliance

16. **Rate limiting:** No explicit limits, but be respectful (2-3 calls per page
    load max)
17. **User-Agent:** Required by OSRS Wiki API policy (will block default agents)
18. **ID looping:** Never loop with `?id=` parameter (use bulk endpoints)
19. **Community:** Join Discord if planning high-volume usage

---

## 📅 Timeline Estimate

- **Phase 1:** Setup & File Creation: 30 min
- **Phase 2:** OSRS Wiki API Layer: 1 hour
- **Phase 3:** Claude API Integration: 2 hours
- **Phase 4:** Filter Rule Evaluator: 1 hour
- **Phase 5:** Preset Profiles: 30 min
- **Phase 6:** UI Components: 2-3 hours
- **Phase 7:** Main Page Assembly: 1 hour
- **Phase 8:** Error Handling: 45 min
- **Phase 9:** Polish & Testing: 1 hour

**Total:** ~6-8 hours for MVP

**Why faster than slider UI approach:**

- ❌ No dual-range slider components to build
- ❌ No complex state management for multiple filters
- ❌ No volume toggle with conditional API logic
- ✅ Reuse existing Claude API integration patterns
- ✅ Simpler UI (mostly text input + buttons)
- ✅ Filtering logic is more straightforward

---

## ✅ Quick Reference: API Compliance Checklist

Before implementing, ensure these critical requirements are met:

**User-Agent (MANDATORY):**

- [ ] Set descriptive User-Agent header
- [ ] Include project name and contact info
- [ ] Avoid blocked agents: `python-requests`, `curl/*`, etc.
- [ ] Example:
      `"OSRS Flip Dashboard Blocklist Generator - github.com/username/repo"`

**Request Patterns (MANDATORY):**

- [ ] Fetch all items at once (NO `?id=` parameter looping)
- [ ] Make only 2-3 API calls per page load
- [ ] Cache responses client-side
- [ ] Don't make repeated calls on user interactions

**Data Handling (CRITICAL):**

- [ ] Item IDs are STRING keys: `priceData[String(item.id)]`
- [ ] Check for null `high` price: `if (price === null) return false;`
- [ ] Check for missing items: `if (!priceData[id]) return false;`
- [ ] Extract `.data` from `/latest` and `/5m` responses
- [ ] `/mapping` returns array directly (no wrapper)

**Error Handling (REQUIRED):**

- [ ] Handle items not in `/latest` response
- [ ] Handle null high/low prices
- [ ] Add retry logic for network failures
- [ ] Show user-friendly error messages
- [ ] Gracefully degrade if volume data unavailable

**Performance (RECOMMENDED):**

- [ ] Filter 4k+ items client-side (no additional API calls)
- [ ] Complete preview generation in <2 seconds
- [ ] Don't block UI during filtering
- [ ] Consider Web Worker for heavy filtering (optional)

**Testing (BEFORE LAUNCH):**

- [ ] Test with real OSRS Wiki API (not mock data)
- [ ] Verify downloaded profile format matches v1.7.9
- [ ] Test with various price ranges
- [ ] Test F2P filtering
- [ ] Test edge cases (no matches, all matches)
- [ ] Test on mobile devices

---

_Last Updated: 2025-10-07_  
_Version: 1.2_  
_Status: ✅ Ready for Implementation (CORS Verified)_

---

## 🔍 Verification Summary

This specification has been validated against the official OSRS Wiki API
documentation AND live CORS testing:

**✅ CORS Testing Verified (2025-10-07):**

- Direct browser API calls work perfectly (no backend proxy needed)
- `/mapping`: 4,307 items, 0.08s response time
- `/latest`: 4,194 items with prices, 0.02s response time
- `/5m`: 1,765 items with volume data, 0.02s response time
- User-Agent headers properly accepted
- Fast performance suitable for real-time filtering

**✅ API Endpoints Verified:**

- `/mapping` - Returns array of 4,307 items with metadata
- `/latest` - Returns `{data: {...}}` with price info keyed by string IDs
- `/5m` - Returns `{data: {...}}` with volume data (optional feature)

**✅ Compliance Requirements Met:**

- Descriptive User-Agent with contact info
- No ID parameter looping (bulk fetching only)
- Respectful usage patterns (2-3 calls per page load)
- Proper handling of null/missing data

**✅ Data Structure Verified:**

- Item IDs are string keys in price/volume responses
- `high` and `low` prices can be null
- Items without trades won't appear in `/latest`
- Volume calculated as `highPriceVolume + lowPriceVolume`

**✅ Edge Cases Documented:**

- Missing price data handling (113 items, 2.6%)
- Null high/low price handling
- Item ID type conversion (number → string)
- Response structure differences per endpoint
- Volume data coverage (only 41% of items)

**Reference:** https://oldschool.runescape.wiki/w/RuneScape:Real-time_Prices

---

**Ready to hand to Claude Code for implementation!** 🚀  
**CORS Confirmed Working ✅ - Frontend-Only Implementation**  
**v2.0: Claude API Natural Language Approach** 🤖

---

_Last Updated: 2025-10-07_  
_Version: 2.0_  
_Status: ✅ Ready for Implementation (Claude API Approach)_  
_Estimated Development Time: 6-8 hours_
