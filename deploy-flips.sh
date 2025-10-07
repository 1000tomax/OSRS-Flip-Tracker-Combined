#!/usr/bin/env bash
# deploy-flips.sh - One-shot Supabase deployment
# Usage: ./deploy-flips.sh [path/to/flips.csv]
# Auto-detects flips.csv in common locations if not specified

set -euo pipefail

echo "🚀 OSRS Flip Tracker - Supabase Deployment"
echo "=========================================="
echo ""

# Find flips.csv
FLIPS_FILE=""
FLIPS_LOCATIONS=(
  "${1:-}"  # Command line argument (if provided)
  "$HOME/Documents/flips.csv"
  "/mnt/c/Users/18159/Documents/flips.csv"
)

for location in "${FLIPS_LOCATIONS[@]}"; do
  if [[ -n "$location" && -f "$location" ]]; then
    FLIPS_FILE="$location"
    echo "📄 Found flips.csv at: $FLIPS_FILE"
    break
  fi
done

if [[ -z "$FLIPS_FILE" ]]; then
  echo "❌ flips.csv not found in any location"
  echo ""
  echo "Searched locations:"
  for loc in "${FLIPS_LOCATIONS[@]}"; do
    [[ -n "$loc" ]] && echo "  - $loc"
  done
  echo ""
  echo "Usage: $0 [path/to/flips.csv]"
  exit 1
fi

# Load environment variables
if [[ ! -f .env ]]; then
  echo "❌ Missing .env file with SUPABASE_URL and SUPABASE_KEY"
  echo ""
  echo "Create .env file with:"
  echo "  SUPABASE_URL=https://your-project.supabase.co"
  echo "  SUPABASE_KEY=your-service-role-key"
  exit 1
fi

source .env

if [[ -z "${SUPABASE_URL:-}" || -z "${SUPABASE_KEY:-}" ]]; then
  echo "❌ Missing SUPABASE_URL or SUPABASE_KEY in .env file"
  exit 1
fi

# Step 1: Process CSV to correct format
echo ""
echo "⚙️  Step 1: Processing flip data..."
npm run -s process-flips

# Step 2: Find all processed CSV files and combine them
echo ""
echo "📦 Step 2: Preparing data for upload..."

# Create temporary combined CSV
TEMP_CSV=$(mktemp /tmp/flips-combined-XXXXXX.csv)
PROCESSED_DIR="public/data/processed-flips"

if [[ ! -d "$PROCESSED_DIR" ]]; then
  echo "❌ No processed data found at $PROCESSED_DIR"
  exit 1
fi

# Get header from first CSV file
FIRST_CSV=$(find "$PROCESSED_DIR" -name "*.csv" | head -1)
if [[ -z "$FIRST_CSV" ]]; then
  echo "❌ No CSV files found in processed directory"
  exit 1
fi

head -1 "$FIRST_CSV" > "$TEMP_CSV"

# Append all data rows (skip headers) and deduplicate
find "$PROCESSED_DIR" -name "*.csv" -exec tail -n +2 {} \; | sort -u >> "$TEMP_CSV"

FLIP_COUNT=$(tail -n +2 "$TEMP_CSV" | wc -l | awk '{print $1}')
echo "   Found $FLIP_COUNT flips to upload"

# Step 3: Upload to Supabase
echo ""
echo "☁️  Step 3: Uploading to Supabase..."
SUPABASE_URL="$SUPABASE_URL" \
SUPABASE_KEY="$SUPABASE_KEY" \
node scripts/upload-new-flips.mjs "$TEMP_CSV"

# Cleanup
rm -f "$TEMP_CSV"
echo ""
echo "🧹 Cleaning up..."

# Optional: Delete source flips.csv (comment out if you want to keep it)
if [[ "${KEEP_FLIPS:-0}" -eq 0 ]]; then
  rm -f "$FLIPS_FILE"
  echo "   Deleted: $FLIPS_FILE"
else
  echo "   Kept: $FLIPS_FILE (KEEP_FLIPS=1)"
fi

echo ""
echo "✅ Done! Your flips are now live on the dashboard."
echo ""
echo "🌐 Visit your dashboard to see the updates!"
