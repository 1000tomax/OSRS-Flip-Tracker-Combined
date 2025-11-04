#!/usr/bin/env node
/**
 * Migration script to import CSV flip data into Supabase
 * Usage: SUPABASE_URL=xxx SUPABASE_KEY=xxx node scripts/migrate-to-supabase.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const BATCH_SIZE = 100; // Insert 100 flips at a time

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing environment variables!');
  console.error('Usage: SUPABASE_URL=xxx SUPABASE_KEY=xxx node scripts/migrate-to-supabase.mjs');
  process.exit(1);
}

// Simple CSV parser
function parseCSV(content) {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',');
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const row = {};
    headers.forEach((header, idx) => {
      row[header.trim()] = values[idx]?.trim() || null;
    });
    rows.push(row);
  }

  return rows;
}

// Transform CSV row to database format
function transformFlip(csvRow) {
  return {
    account_id: csvRow.account_id,
    item_name: csvRow.item_name,
    status: csvRow.status || 'FINISHED',
    opened_quantity: parseInt(csvRow.opened_quantity) || 0,
    spent: parseInt(csvRow.spent) || 0,
    closed_quantity: csvRow.closed_quantity ? parseInt(csvRow.closed_quantity) : null,
    received_post_tax: csvRow.received_post_tax ? parseInt(csvRow.received_post_tax) : null,
    tax_paid: csvRow.tax_paid ? parseInt(csvRow.tax_paid) : null,
    profit: csvRow.profit ? parseInt(csvRow.profit) : null,
    opened_time: csvRow.opened_time,
    closed_time: csvRow.closed_time || null,
    updated_time: csvRow.updated_time || csvRow.closed_time || csvRow.opened_time,
    flip_hash:
      csvRow.flip_hash ||
      createHash('sha256')
        .update(`${csvRow.account_id}-${csvRow.item_name}-${csvRow.opened_time}`)
        .digest('hex'),
  };
}

// Find all CSV files
function findCSVFiles(dir) {
  const files = [];

  function walk(currentPath) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith('.csv')) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

// Insert flips in batches
async function insertBatch(flips, batchNum, totalBatches) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/flips`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: 'resolution=ignore-duplicates', // Skip duplicates based on flip_hash
    },
    body: JSON.stringify(flips),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Batch ${batchNum}/${totalBatches} failed: ${error}`);
  }

  return response;
}

// Main migration function
async function migrate() {
  console.log('🚀 Starting migration to Supabase...\n');

  const dataDir = path.join(__dirname, '..', 'public', 'data', 'processed-flips');

  if (!fs.existsSync(dataDir)) {
    console.error(`❌ Data directory not found: ${dataDir}`);
    process.exit(1);
  }

  // Find all CSV files
  console.log('📁 Scanning for CSV files...');
  const csvFiles = findCSVFiles(dataDir);
  console.log(`   Found ${csvFiles.length} CSV files\n`);

  if (csvFiles.length === 0) {
    console.log('⚠️  No CSV files found to migrate');
    return;
  }

  // Process each CSV file
  let totalFlips = 0;
  let allFlips = [];

  for (const csvFile of csvFiles) {
    const relativePath = path.relative(dataDir, csvFile);
    console.log(`📄 Processing ${relativePath}...`);

    const content = fs.readFileSync(csvFile, 'utf-8');
    const rows = parseCSV(content);

    for (const row of rows) {
      const flip = transformFlip(row);
      allFlips.push(flip);
      totalFlips++;
    }

    console.log(`   ✓ Parsed ${rows.length} flips`);
  }

  console.log(`\n📊 Total flips to migrate: ${totalFlips}`);
  console.log(`📦 Batching into ${Math.ceil(allFlips.length / BATCH_SIZE)} batches...\n`);

  // Insert in batches
  const batches = [];
  for (let i = 0; i < allFlips.length; i += BATCH_SIZE) {
    batches.push(allFlips.slice(i, i + BATCH_SIZE));
  }

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const batchNum = i + 1;

    try {
      await insertBatch(batch, batchNum, batches.length);
      successCount += batch.length;
      process.stdout.write(
        `\r✓ Batch ${batchNum}/${batches.length} - ${successCount}/${totalFlips} flips migrated`
      );
    } catch (error) {
      errorCount += batch.length;
      console.error(`\n❌ Batch ${batchNum} failed:`, error.message);
    }

    // Rate limiting: wait 100ms between batches
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\n\n✅ Migration complete!`);
  console.log(`   Success: ${successCount} flips`);
  if (errorCount > 0) {
    console.log(`   Errors: ${errorCount} flips`);
  }

  // Refresh materialized view
  console.log('\n🔄 Refreshing item statistics...');
  try {
    const refreshResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/refresh_item_stats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    });

    if (refreshResponse.ok) {
      console.log('   ✓ Item stats refreshed');
    } else {
      console.log('   ⚠️  Could not refresh stats (may need to run manually)');
    }
  } catch (error) {
    console.log('   ⚠️  Could not refresh stats:', error.message);
  }

  console.log('\n🎉 All done! Your data is now in Supabase.');
}

// Run migration
migrate().catch(error => {
  console.error('\n❌ Migration failed:', error);
  process.exit(1);
});
