# OSRS Flip Data Pipeline Skill

This skill provides expertise in processing Old School RuneScape (OSRS) flip
data from raw CSV exports to production-ready dashboard data.

## When to Activate

Activate this skill when the user mentions:

- "process flips" / "process flip data" / "process my flips"
- "upload flips" / "deploy flips" / "upload to Supabase"
- "run the pipeline" / "data pipeline"
- Issues with flip data processing
- Questions about the data workflow

## OSRS Domain Knowledge

### Trading Terminology

- **GP (Gold Pieces)**: In-game currency for OSRS
- **Flipping**: Buying items on the Grand Exchange (GE) and selling them for
  profit
- **ROI (Return on Investment)**: Profit percentage relative to investment
- **GE Tax**: 1% tax applied by the Grand Exchange on sales (already deducted in
  `received_post_tax`)
- **Margin**: The difference between buy and sell price

### Item Categories

Common OSRS item types include:

- Weapons: Abyssal whip, Dragon scimitar, Twisted bow, etc.
- Armor: Bandos, Armadyl, Dragon plate, etc.
- Resources: Logs, Ores, Herbs, Seeds
- Food: Sharks, Anglerfish, Saradomin brews
- Potions: Super combat, Prayer potions, Stamina potions
- Runes: Death runes, Blood runes, Nature runes

### Data Validation Rules

Valid flip data must have:

- **item_name**: String (OSRS item name)
- **opened_time**: ISO 8601 datetime (when flip started)
- **closed_time**: ISO 8601 datetime (when flip completed)
- **spent**: Integer (GP spent buying)
- **received_post_tax**: Integer (GP received after 1% GE tax)
- **closed_quantity**: Integer (number of items)
- **status**: Must be "FINISHED" for completed flips

### Important Dates

- Flips are grouped by **opened_time** (not closed_time) to avoid timezone
  issues
- All date calculations use UTC to ensure consistency
- Date format: YYYY-MM-DD for file organization

## Data Processing Workflow

### Cloud-First Approach (RECOMMENDED)

**The dashboard is 100% cloud-powered by Supabase.** When processing flip data,
always deploy directly to Supabase:

```bash
./deploy-flips.sh [optional-path-to-flips.csv]
```

This is the **primary workflow** - it handles everything end-to-end:

```bash
./deploy-flips.sh [optional-path-to-flips.csv]
```

**What it does:**

1. Auto-detects flips.csv in common locations:
   - Command line argument (if provided)
   - Project root (`./flips.csv`)
   - `~/Documents/flips.csv`
   - `/mnt/c/Users/18159/Documents/flips.csv` (WSL)
2. Validates `.env` file has SUPABASE_URL and SUPABASE_KEY
3. Processes CSV data (parse, deduplicate, organize by date)
4. Combines all flips and deduplicates
5. **Uploads directly to Supabase** via `scripts/upload-new-flips.mjs`
6. Cleans up temporary files and local data
7. Optionally deletes source flips.csv (unless KEEP_FLIPS=1)

**Environment requirements:**

- `.env` file with:
  - `SUPABASE_URL=https://your-project.supabase.co`
  - `SUPABASE_KEY=your-service-role-key` (must be service_role, not anon)

### Local Processing Only (Legacy/Guest Mode)

**Only use this for debugging or Guest Mode development:**

```bash
npm run process-flips
```

This processes data to local files but does NOT upload to Supabase. The main
dashboard won't see this data unless you manually upload it.

## Common Issues & Troubleshooting

### Missing flips.csv

**Symptom:** "flips.csv not found in any location" **Solution:**

1. Check if flips.csv exists in `~/Documents/flips.csv`
2. Export from FlipOS RuneLite plugin
3. Specify custom path: `./deploy-flips.sh /path/to/flips.csv`

### Supabase Upload Failures

**Symptom:** Upload script fails with authentication error **Solution:**

1. Verify `.env` file exists with SUPABASE_URL and SUPABASE_KEY
2. Confirm SUPABASE_KEY is the **service_role** key (not anon key)
3. Check key hasn't expired in Supabase dashboard

### Date Grouping Issues

**Symptom:** Flips appear in wrong date folders **Solution:**

- Parser uses `opened_time` for grouping (fixed in recent updates)
- Ensure CSV has valid ISO 8601 timestamps
- Check timezone: all processing uses UTC

### Duplicate Flips

**Symptom:** Same flips appearing multiple times **Solution:**

- Parser automatically deduplicates based on all fields
- Re-run `npm run process:parse` to clean up

### No Data After Upload

**Symptom:** Frontend shows no data after uploading to Supabase **Solution:**

1. Verify data exists in Supabase dashboard:
   - Check `flips` table has new rows
   - Check `item_stats` materialized view is populated
2. Check frontend is using Supabase mode (not Guest Mode)
3. Verify SUPABASE_URL and SUPABASE_KEY in frontend .env
4. Hard refresh browser (Ctrl+Shift+R)
5. Check browser console for API errors

## Data Architecture

### Production (Cloud-First - PRIMARY)

The main dashboard is **100% powered by Supabase**:

- Daily summaries from `get_daily_summaries()` RPC
- Flip logs from `flips` table
- Item stats from `item_stats` materialized view
- **No local files needed** - all data lives in the cloud

### Guest Mode (Secondary)

- Client-side CSV processing via Web Workers
- Users upload CSV files directly in browser
- No database required - fully offline capable
- Local files in `public/data/` are only for demo/fallback

## Success Criteria

After deploying to Supabase, verify:

1. ✅ Upload script completes without errors
2. ✅ Data visible in Supabase dashboard:
   - `flips` table shows new rows with correct dates
   - Row count matches expected number of flips
3. ✅ Frontend dashboard shows new data after refresh
4. ✅ Item stats are updated (check item performance page)
5. ✅ Daily summaries show correct GP totals
6. ✅ No duplicate flips (Supabase should reject duplicates)

## Best Practices

1. **Always deploy to Supabase** using `./deploy-flips.sh` (not local
   processing)
2. **Validate .env** exists with correct SUPABASE_URL and service_role
   SUPABASE_KEY
3. **Backup flips.csv** before processing (script deletes it by default, unless
   KEEP_FLIPS=1)
4. **Check for errors** in console output during upload
5. **Verify in Supabase** - check dashboard after upload to confirm data arrived
6. **Don't rely on local files** - the dashboard pulls from cloud, not local
   data

## Related Scripts

- `data-processing/parser.cjs` - Main CSV parser with deduplication
- `data-processing/summaryBuilder.cjs` - Daily summary calculator
- `data-processing/itemStats.cjs` - Item performance aggregator
- `data-processing/metaWriter.cjs` - Metadata generator
- `data-processing/run-all.cjs` - Orchestrates all processing steps
- `scripts/upload-new-flips.mjs` - Supabase upload utility
- `deploy-flips.sh` - End-to-end deployment script

## Example Interactions

**User:** "Process my new flip data" / "Process my flips" **Response:**

- Check for flips.csv in common locations (project root, ~/Documents, etc.)
- Verify .env has SUPABASE credentials
- Run `./deploy-flips.sh` to deploy to Supabase
- Monitor upload progress and report success
- Verify data in Supabase dashboard

**User:** "Upload flips to Supabase" / "Deploy flips" **Response:** Same as
above - run deploy-flips.sh workflow

**User:** "Why aren't my flips showing up?" **Response:**

- Check if data uploaded to Supabase successfully
- Verify frontend is in Supabase mode (not Guest Mode)
- Check Supabase dashboard for flips table data
- Suggest hard refresh browser
- Check browser console for API errors
