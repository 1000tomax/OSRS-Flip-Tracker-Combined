// scripts/build-summary-index.cjs
// Fetch flips from Supabase, compute daily summaries, upload to daily_summaries table

// Load .env.local first (takes precedence), then .env
require('dotenv').config({ path: '.env.local', override: true });
require('dotenv').config({ override: true });

const DEBUG = !!process.env.DEBUG;

// Get credentials after dotenv is loaded
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[build-summary-index] ❌ Missing SUPABASE_URL or SUPABASE_KEY in .env');
  process.exit(1);
}

// --- fetch from Supabase ---------------------------------------------------
async function fetchFlips() {
  console.log('[build-summary-index] 🔄 Fetching flips from Supabase...');

  // Fetch all flips with pagination
  const allFlips = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const url = `${SUPABASE_URL}/rest/v1/flips?select=*&limit=${limit}&offset=${offset}`;
    const response = await fetch(url, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch flips: ${error}`);
    }

    const data = await response.json();
    allFlips.push(...data);

    if (DEBUG) {
      console.log(`[build-summary-index] Fetched ${data.length} flips (total: ${allFlips.length})`);
    }

    if (data.length < limit) break;
    offset += limit;
  }

  console.log(`[build-summary-index] ✓ Fetched ${allFlips.length} flips from Supabase`);
  return allFlips;
}

// --- compute daily summaries -----------------------------------------------
function computeDailySummaries(flips) {
  const byDate = new Map();

  for (const flip of flips) {
    // Extract date from opened_time or closed_time
    const dateStr = flip.closed_time || flip.opened_time;
    if (!dateStr) continue;

    const date = dateStr.split('T')[0]; // Get YYYY-MM-DD part

    if (!byDate.has(date)) {
      byDate.set(date, {
        date,
        flips: [],
        totalProfit: 0,
        totalSpent: 0,
      });
    }

    const day = byDate.get(date);
    day.flips.push(flip);

    const profit = parseInt(flip.profit) || 0;
    const spent = parseInt(flip.spent) || 0;

    day.totalProfit += profit;
    day.totalSpent += spent;
  }

  // Convert to array and compute ROI
  const summaries = [];
  let cumulativeNetWorth = 0;

  const sortedDates = Array.from(byDate.keys()).sort();

  for (const date of sortedDates) {
    const day = byDate.get(date);
    cumulativeNetWorth += day.totalProfit;

    const roi_decimal = day.totalSpent > 0
      ? (day.totalProfit / day.totalSpent)
      : 0;

    const percent_change = roi_decimal * 100;

    summaries.push({
      date,
      net_worth: Math.round(cumulativeNetWorth),
      profit: Math.round(day.totalProfit),
      percent_change: +percent_change.toFixed(2),
      roi_decimal: +roi_decimal.toFixed(4),
    });
  }

  if (DEBUG) {
    console.log(`[build-summary-index] Computed ${summaries.length} daily summaries`);
  }

  return summaries;
}

// --- upload to Supabase ----------------------------------------------------
async function uploadSummaries(summaries) {
  console.log('[build-summary-index] 🔄 Uploading summaries to Supabase...');

  // Clear existing summaries first
  const deleteResponse = await fetch(`${SUPABASE_URL}/rest/v1/daily_summaries?id=not.eq.00000000-0000-0000-0000-000000000000`, {
    method: 'DELETE',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
  });

  if (DEBUG || !deleteResponse.ok) {
    console.log('[build-summary-index] Cleared existing summaries (status:', deleteResponse.status, ')');
  }

  // Upload in batches
  const BATCH_SIZE = 100;
  let uploaded = 0;

  for (let i = 0; i < summaries.length; i += BATCH_SIZE) {
    const batch = summaries.slice(i, i + BATCH_SIZE);

    const response = await fetch(`${SUPABASE_URL}/rest/v1/daily_summaries`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=ignore-duplicates',
      },
      body: JSON.stringify(batch),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to upload batch ${i / BATCH_SIZE + 1}: ${error}`);
    }

    uploaded += batch.length;
    if (DEBUG) {
      console.log(`[build-summary-index] Uploaded ${uploaded}/${summaries.length} summaries`);
    }
  }

  console.log(`[build-summary-index] ✅ Uploaded ${uploaded} daily summaries to Supabase`);
}

// --- main ------------------------------------------------------------------
async function main() {
  try {
    const flips = await fetchFlips();

    if (!flips.length) {
      console.warn('[build-summary-index] No flips found');
      return;
    }

    const summaries = computeDailySummaries(flips);
    await uploadSummaries(summaries);

    console.log(`[build-summary-index] ✅ Completed: ${summaries.length} daily summaries uploaded`);
  } catch (error) {
    console.error('[build-summary-index] ❌ Fatal error:', error.message);
    process.exit(1);
  }
}

main();
