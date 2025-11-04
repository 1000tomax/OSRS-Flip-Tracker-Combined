#!/usr/bin/env node
/**
 * Fetch 24-hour trading volume data from OSRS Wiki API and store in Supabase
 * Runs twice daily via GitHub Actions cron job
 *
 * Usage: node scripts/update-osrs-volumes.mjs
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: '.env.local', override: true });
dotenv.config({ override: true });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_KEY in environment');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const BASE_URL = 'https://prices.runescape.wiki/api/v1/osrs';
const headers = {
  'User-Agent':
    'OSRS Flip Dashboard Volume Updater - github.com/1000tomax/OSRS-Flip-Tracker-Combined',
};

/**
 * Fetch 24 hours of volume data by aggregating hourly snapshots
 */
async function fetch24HourVolume() {
  console.log('🔄 Fetching 24-hour volume data from OSRS Wiki API...\n');

  const now = Math.floor(Date.now() / 1000);
  const oneHour = 3600;

  // Round down to the nearest hour boundary
  const currentHourStart = Math.floor(now / oneHour) * oneHour;

  // Generate timestamps for last 24 hours (aligned to hour boundaries)
  const timestamps = Array.from({ length: 24 }, (_, i) => currentHourStart - i * oneHour);

  console.log(`📊 Fetching ${timestamps.length} hourly snapshots...`);

  // Fetch all 24 hours in parallel with error handling
  const hourlySnapshots = await Promise.all(
    timestamps.map(async (ts, index) => {
      try {
        const response = await fetch(`${BASE_URL}/1h?timestamp=${ts}`, { headers });
        if (!response.ok) {
          console.log(
            `  ⚠ Hour ${index + 1}/24 failed: ${response.status} ${response.statusText}`
          );
          return null;
        }
        const json = await response.json();
        console.log(`  ✓ Hour ${index + 1}/24 fetched`);
        return json.data;
      } catch (error) {
        console.log(`  ⚠ Hour ${index + 1}/24 failed: ${error.message}`);
        return null;
      }
    })
  );

  // Count successful vs failed fetches
  const successfulSnapshots = hourlySnapshots.filter(s => s !== null);
  const failedCount = hourlySnapshots.length - successfulSnapshots.length;

  console.log(`✅ Successfully fetched ${successfulSnapshots.length}/24 hourly snapshots`);
  if (failedCount > 0) {
    console.log(`⚠ ${failedCount} snapshot(s) failed - continuing with available data\n`);
  } else {
    console.log();
  }

  console.log('🔄 Aggregating 24-hour volumes...');

  // Aggregate volumes across all successful hours
  const volume24h = {};

  successfulSnapshots.forEach(snapshot => {
    Object.entries(snapshot).forEach(([itemId, data]) => {
      if (!volume24h[itemId]) {
        volume24h[itemId] = 0;
      }
      volume24h[itemId] += (data.highPriceVolume || 0) + (data.lowPriceVolume || 0);
    });
  });

  console.log(`✅ Aggregated volumes for ${Object.keys(volume24h).length} items\n`);

  return volume24h;
}

/**
 * Fetch item mapping to get item names
 */
async function fetchItemMapping() {
  console.log('🔄 Fetching item mapping...');
  const response = await fetch(`${BASE_URL}/mapping`, { headers });
  if (!response.ok) {
    throw new Error(`Failed to fetch item mapping: ${response.status}`);
  }
  const items = await response.json();
  console.log(`✅ Fetched ${items.length} item names\n`);

  // Convert to map of id -> name
  const mapping = {};
  items.forEach(item => {
    mapping[String(item.id)] = item.name;
  });
  return mapping;
}

/**
 * Upload volume data to Supabase
 */
async function uploadToSupabase(volumeData, itemNames) {
  console.log('🔄 Uploading to Supabase...\n');

  // Convert to array of records
  const records = Object.entries(volumeData).map(([itemId, volume]) => ({
    item_id: itemId,
    item_name: itemNames[itemId] || null,
    volume_24h: volume,
    last_updated: new Date().toISOString(),
  }));

  console.log(`📦 Preparing to upsert ${records.length} records...`);

  // Upsert in batches of 1000 (Supabase limit)
  const batchSize = 1000;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const { error } = await supabase.from('osrs_item_volumes').upsert(batch, {
      onConflict: 'item_id',
    });

    if (error) {
      console.error(`❌ Error upserting batch ${i / batchSize + 1}:`, error);
      throw error;
    }

    console.log(
      `  ✓ Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(records.length / batchSize)} uploaded`
    );
  }

  console.log('\n✅ All data uploaded successfully!');
}

/**
 * Main execution
 */
async function main() {
  const startTime = Date.now();
  console.log('🚀 Starting OSRS Volume Data Update');
  console.log('━'.repeat(60));
  console.log(`⏰ Started at: ${new Date().toISOString()}\n`);

  try {
    // Fetch item names first (1 API call)
    const itemNames = await fetchItemMapping();

    // Fetch 24-hour volume data (24 API calls)
    const volumeData = await fetch24HourVolume();

    // Upload to Supabase
    await uploadToSupabase(volumeData, itemNames);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n' + '━'.repeat(60));
    console.log(`✅ Update completed successfully in ${duration}s`);
    console.log(`📊 Total items updated: ${Object.keys(volumeData).length}`);
    console.log(`⏰ Finished at: ${new Date().toISOString()}`);
  } catch (error) {
    console.error('\n❌ Update failed:', error);
    process.exit(1);
  }
}

main();
