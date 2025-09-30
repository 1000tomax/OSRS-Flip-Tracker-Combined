# Supabase Data Deployment Guide

Now that your flip data is stored in Supabase instead of CSV files, the
deployment process has changed. This guide explains how to add new flip data to
your dashboard.

## 🆕 New Deployment Workflow

### Old Process (CSV-based)

1. Export flips from game plugin → CSV file
2. Run data processing scripts
3. Commit CSV files to git
4. Push to GitHub
5. Cloudflare builds and deploys

### New Process (Supabase)

1. Export flips from game plugin → CSV file
2. Upload CSV directly to Supabase database
3. Data is immediately live (no git commit/push needed!)
4. Optional: Commit CSV to git for backup

## 📤 Uploading New Flips

### Quick Method

```bash
# Set your Supabase credentials (same as .env.local)
export SUPABASE_URL=https://fmmdulnvciiafuuogwfu.supabase.co
export SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtbWR1bG52Y2lpYWZ1dW9nd2Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjQ2MDcsImV4cCI6MjA3NDgwMDYwN30.qwInC3vYLz7Ybx8oJUI3Dp-Sc2vbyuvMNtEsg8Z4xnw

# Upload new flips
npm run upload:flips path/to/your/flips.csv
```

### Using the Script Directly

```bash
SUPABASE_URL=xxx SUPABASE_KEY=xxx node scripts/upload-new-flips.mjs flips.csv
```

## 📋 CSV Format

Your CSV file must match this format:

```csv
account_id,item_name,status,opened_quantity,spent,closed_quantity,received_post_tax,tax_paid,profit,opened_time,closed_time,updated_time,flip_hash
1000tomax,Coal,FINISHED,5194,1069964,5194,1106322,20776,36358,2025-09-16T04:11:34Z,2025-09-16T04:22:05Z,2025-09-16T04:22:05Z,2d99c7cdbf...
```

**Required Fields:**

- `account_id` - Your account name
- `item_name` - Item that was flipped
- `status` - Usually "FINISHED"
- `opened_quantity` - How many you bought
- `spent` - Total GP spent buying
- `opened_time` - When you bought (ISO 8601 format)

**Optional Fields:**

- `closed_quantity` - How many you sold
- `received_post_tax` - GP received after tax
- `tax_paid` - GE tax amount
- `profit` - Net profit
- `closed_time` - When you sold
- `updated_time` - Last update timestamp
- `flip_hash` - Unique identifier (auto-generated if missing)

## 🔄 What Happens When You Upload

1. **Script parses CSV** - Reads and validates your flip data
2. **Transforms data** - Converts to database format
3. **Uploads in batches** - Inserts 100 flips at a time
4. **Handles duplicates** - Automatically skips flips already in database (based
   on `flip_hash`)
5. **Refreshes stats** - Rebuilds item statistics materialized view
6. **Data is live!** - Changes appear immediately on https://mreedon.com

## 🎯 Best Practices

### Daily Workflow

```bash
# 1. Export from game plugin to today's date folder
# Example: public/data/processed-flips/2025/09/30/flips.csv

# 2. Upload to Supabase
npm run upload:flips public/data/processed-flips/2025/09/30/flips.csv

# 3. (Optional) Commit for backup
git add public/data/processed-flips/2025/09/30/flips.csv
git commit -m "chore(data): backup flips for 2025-09-30"
git push origin main
```

### Bulk Upload

If you have multiple days of data:

```bash
# Upload each day individually
npm run upload:flips public/data/processed-flips/2025/09/28/flips.csv
npm run upload:flips public/data/processed-flips/2025/09/29/flips.csv
npm run upload:flips public/data/processed-flips/2025/09/30/flips.csv
```

Or create a bash script:

```bash
#!/bin/bash
for file in public/data/processed-flips/2025/09/*/flips.csv; do
  echo "Uploading $file..."
  npm run upload:flips "$file"
done
```

## 🔍 Verifying Uploads

### Check in Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Open your project → **Table Editor**
3. Click **flips** table
4. Sort by `created_at` DESC to see newest flips

### Check on Live Site

1. Visit https://mreedon.com
2. Go to **Items** page - should show updated totals
3. Go to **Flip Logs** - select today's date
4. Go to **Charts** - should show latest summaries

## 🚨 Troubleshooting

### "Missing environment variables"

Make sure you've exported the Supabase credentials:

```bash
export SUPABASE_URL=https://fmmdulnvciiafuuogwfu.supabase.co
export SUPABASE_KEY=eyJ...
```

Or add them to your `.env.local` file and source it:

```bash
source .env.local
```

### "Batch failed" errors

- Check your CSV format matches the required fields
- Ensure timestamps are in ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ)
- Verify numeric fields contain valid numbers

### Duplicates being uploaded

Each flip needs a unique `flip_hash`. If your CSV doesn't include it, the script
generates one based on:

- account_id
- item_name
- opened_time

Make sure your plugin exports unique timestamps for each flip.

### Stats not updating

Manually refresh the materialized view:

```bash
# Run in Supabase SQL Editor
REFRESH MATERIALIZED VIEW CONCURRENTLY item_stats;
```

Or call the function:

```bash
curl -X POST "https://fmmdulnvciiafuuogwfu.supabase.co/rest/v1/rpc/refresh_item_stats" \
  -H "apikey: eyJ..." \
  -H "Content-Type: application/json"
```

## 🔐 Security Notes

- The `SUPABASE_KEY` is the **anon/public** key, safe for client-side use
- Row Level Security (RLS) policies control database access
- The anon key can only READ data (inserts require authenticated key)
- For automated uploads, consider creating a service role key with insert
  permissions

## 📊 Monitoring

### Supabase Dashboard

Monitor your database usage:

- **Database** tab - Check table sizes and row counts
- **Logs** tab - View query logs and errors
- **API** tab - Monitor API usage and rate limits

### Free Tier Limits

- **Database size**: 500 MB
- **API requests**: 500K/month
- **Storage**: 1 GB
- **Bandwidth**: 5 GB/month

Your current data (~8,762 flips) uses approximately **1-2 MB** of database
space. You can store hundreds of thousands of flips before hitting limits.

## 🔄 Migration Reference

If you need to re-migrate all your historical data:

```bash
npm run migrate:supabase
```

This will import all CSV files from `public/data/processed-flips/`.

## 📝 Summary

**Before (CSV-based):**

- Change data → Commit → Push → Wait for build → Deploy

**After (Supabase):**

- Change data → Upload CSV → Live instantly! ✨

No more waiting for builds. No more 110+ file requests. Just fast database
queries!
