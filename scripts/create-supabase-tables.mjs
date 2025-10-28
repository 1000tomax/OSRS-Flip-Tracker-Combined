#!/usr/bin/env node
/**
 * Create computed data tables in Supabase
 * Run: node scripts/create-supabase-tables.mjs
 */

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local', override: true });
dotenv.config({ override: true });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_KEY in .env');
  process.exit(1);
}

console.log('🔄 Creating Supabase tables for computed data...\n');

// Read the SQL file
const sqlPath = join(__dirname, '..', 'supabase', 'create-computed-data-tables.sql');
const sql = fs.readFileSync(sqlPath, 'utf-8');

// Split into individual statements (simple split on semicolons)
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

// Execute each statement via PostgREST
async function executeSql(statement) {
  // Use the /rpc endpoint with a custom function, or use direct table operations
  // For CREATE TABLE, we'll need to use the SQL editor or pgAdmin
  // PostgREST doesn't support arbitrary SQL execution for security reasons

  console.log('⚠️  Note: SQL statements need to be executed manually via Supabase Dashboard');
  console.log('   Go to: https://supabase.com/dashboard/project/fmmdulnvciiafuuogwfu/sql/new');
  console.log('\n📋 Copy and paste this SQL:\n');
  console.log('─'.repeat(80));
  console.log(sql);
  console.log('─'.repeat(80));
  console.log('\n✅ After running the SQL, you can continue with the data upload.');
}

executeSql();
