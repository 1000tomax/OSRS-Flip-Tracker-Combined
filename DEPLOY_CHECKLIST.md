# Deployment Checklist - Supabase Migration

## ✅ Before Pushing to Cloudflare

### 1. Add Environment Variables to Cloudflare Pages

Go to **Cloudflare Dashboard** → **Pages** → **osrs-flip-tracker-combined** →
**Settings** → **Environment variables**

Add these variables for **Production** AND **Preview**:

```
VITE_SUPABASE_URL=https://fmmdulnvciiafuuogwfu.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtbWR1bG52Y2lpYWZ1dW9nd2Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjQ2MDcsImV4cCI6MjA3NDgwMDYwN30.qwInC3vYLz7Ybx8oJUI3Dp-Sc2vbyuvMNtEsg8Z4xnw
```

### 2. Verify Data in Supabase

- ✅ 8,762 flips migrated
- ✅ Item stats materialized view created
- ✅ Daily summaries function working
- ✅ RLS policies configured

### 3. Push to GitHub

```bash
git push origin main
```

Cloudflare will automatically build and deploy.

### 4. Test After Deployment

Visit `https://mreedon.com` and verify:

- [ ] No 429 rate limit errors
- [ ] Items page loads item statistics
- [ ] Flip Logs page loads daily flips
- [ ] Charts page shows summaries
- [ ] Search works correctly

## 🎉 Migration Benefits

- **No more 429 errors**: Single database connection instead of 110+ file
  requests
- **Faster queries**: PostgreSQL indexes optimize data retrieval
- **Real-time updates**: Can add new flips without redeployment
- **Better scalability**: Database handles concurrent users efficiently
- **Smaller deployments**: No 2.7MB of CSV files in build

## 🔧 Optional: Remove Old CSV Files

Once confirmed working, you can remove:

- `/public/data/processed-flips/` directory
- `/public/data/item-stats.csv`
- `/public/data/summary-index.json`
- `/public/data/daily-summary/` directory

This will reduce your repo size and deployment time.
