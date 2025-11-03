#!/usr/bin/env node
/**
 * Upload new flip data to Supabase
 * Usage: SUPABASE_URL=xxx SUPABASE_KEY=xxx node scripts/upload-new-flips.mjs path/to/flips.csv
 */

import 'dotenv/config';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __filename = fileURLToPath(import.meta.url);

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const BATCH_SIZE = 100;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing environment variables!');
  console.error('Usage: SUPABASE_URL=xxx SUPABASE_KEY=xxx node scripts/upload-new-flips.mjs path/to/flips.csv');
  process.exit(1);
}

const csvFile = process.argv[2];
if (!csvFile) {
  console.error('❌ Please provide a CSV file path');
  console.error('Usage: node scripts/upload-new-flips.mjs path/to/flips.csv');
  process.exit(1);
}

if (!fs.existsSync(csvFile)) {
  console.error(`❌ File not found: ${csvFile}`);
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
  // Support both Copilot export format and processed format
  const accountId = csvRow.account_id || csvRow.Account;
  const itemName = csvRow.item_name || csvRow.Item;
  const status = csvRow.status || csvRow.Status || 'FINISHED';
  const openedQty = csvRow.opened_quantity || csvRow.Bought;
  const closedQty = csvRow.closed_quantity || csvRow.Sold;
  const openedTime = csvRow.opened_time || csvRow['First buy time'];
  const closedTime = csvRow.closed_time || csvRow['Last sell time'];

  // Calculate values from Copilot format
  const avgBuyPrice = parseFloat(csvRow['Avg. buy price']) || 0;
  const avgSellPrice = parseFloat(csvRow['Avg. sell price']) || 0;
  const bought = parseInt(openedQty) || 0;
  const sold = parseInt(closedQty) || 0;
  const spent = csvRow.spent ? parseInt(csvRow.spent) : (avgBuyPrice * bought);
  const received = avgSellPrice * sold;
  const tax = csvRow.tax_paid || csvRow.Tax ? parseInt(csvRow.tax_paid || csvRow.Tax) : 0;
  const receivedPostTax = csvRow.received_post_tax ? parseInt(csvRow.received_post_tax) : (received - tax);
  const profit = csvRow.profit || csvRow.Profit ? parseInt(csvRow.profit || csvRow.Profit) : (receivedPostTax - spent);

  return {
    account_id: accountId,
    item_name: itemName,
    status: status,
    opened_quantity: bought,
    spent: Math.round(spent),
    closed_quantity: sold || null,
    received_post_tax: sold ? Math.round(receivedPostTax) : null,
    tax_paid: sold ? Math.round(tax) : null,
    profit: sold ? Math.round(profit) : null,
    opened_time: openedTime,
    closed_time: closedTime || null,
    updated_time: csvRow.updated_time || closedTime || openedTime,
    flip_hash: csvRow.flip_hash || createHash('sha256')
      .update(`${accountId}-${itemName}-${openedTime}`)
      .digest('hex'),
  };
}

// Insert flips in batches
async function insertBatch(flips, batchNum, totalBatches) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/flips`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'resolution=ignore-duplicates',
    },
    body: JSON.stringify(flips),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Batch ${batchNum}/${totalBatches} failed: ${error}`);
  }

  return response;
}

// Main upload function
async function upload() {
  console.log('🚀 Uploading new flips to Supabase...\n');

  // Read and parse CSV
  console.log(`📄 Reading ${csvFile}...`);
  const content = fs.readFileSync(csvFile, 'utf-8');
  const rows = parseCSV(content);

  console.log(`   Found ${rows.length} flips\n`);

  if (rows.length === 0) {
    console.log('⚠️  No flips found in CSV file');
    return;
  }

  // Transform flips
  const flips = rows.map(transformFlip);

  // Batch and upload
  const batches = [];
  for (let i = 0; i < flips.length; i += BATCH_SIZE) {
    batches.push(flips.slice(i, i + BATCH_SIZE));
  }

  console.log(`📦 Uploading ${batches.length} batches...\n`);

  let successCount = 0;
  let errorCount = 0;
  let duplicateCount = 0;

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const batchNum = i + 1;

    try {
      await insertBatch(batch, batchNum, batches.length);
      successCount += batch.length;
      process.stdout.write(`\r✓ Batch ${batchNum}/${batches.length} - ${successCount}/${flips.length} flips uploaded`);
    } catch (error) {
      if (error.message.includes('duplicate') || error.message.includes('23505')) {
        duplicateCount += batch.length;
        process.stdout.write(`\r⚠ Batch ${batchNum}/${batches.length} - duplicates skipped`);
      } else {
        errorCount += batch.length;
        console.error(`\n❌ Batch ${batchNum} failed:`, error.message);
      }
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\n\n✅ Upload complete!`);
  console.log(`   Success: ${successCount} flips`);
  if (duplicateCount > 0) {
    console.log(`   Duplicates skipped: ${duplicateCount} flips`);
  }
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
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
    });

    if (refreshResponse.ok) {
      console.log('   ✓ Item stats refreshed');
    } else {
      console.log('   ⚠️  Stats refresh may need manual trigger');
    }
  } catch (error) {
    console.log('   ⚠️  Stats refresh failed:', error.message);
  }

  console.log('\n🎉 All done! New flips are now live on the site.');
}

// Run upload
upload().catch(error => {
  console.error('\n❌ Upload failed:', error);
  process.exit(1);
});