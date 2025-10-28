// scripts/build-embeddings.cjs
// Fetches flip data from Supabase
// Aggregates per-item features (total profit, median margin_each, median hold minutes)
// PCA -> /public/data/item-embeddings.json

const fs = require('fs');
const path = require('path');

// Load .env.local first (takes precedence), then .env
// Use override:true to override any existing shell environment variables
require('dotenv').config({ path: '.env.local', override: true });
require('dotenv').config({ override: true });

const PCApkg = require('ml-pca');
const PCA = PCApkg.default || PCApkg.PCA || PCApkg;

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'public', 'data', 'item-embeddings.json');
const DEBUG = !!process.env.DEBUG;

// Get credentials after dotenv is loaded
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[build-embeddings] ❌ Missing SUPABASE_URL or SUPABASE_KEY in .env');
  console.error('[build-embeddings] Current values:', {
    SUPABASE_URL: SUPABASE_URL || '(not set)',
    SUPABASE_KEY: SUPABASE_KEY ? '(set)' : '(not set)'
  });
  process.exit(1);
}

// --- helpers ---------------------------------------------------------------
const toNum = v => {
  if (v == null || v === '') return NaN;
  const s = String(v).trim().replace(/,/g, '');
  const pct = s.endsWith('%');
  const out = parseFloat(pct ? s.slice(0, -1) : s);
  return pct ? out / 100 : out;
};

// --- fetch from Supabase ---------------------------------------------------
async function fetchFlips() {
  console.log('[build-embeddings] 🔄 Fetching flips from Supabase...');
  if (DEBUG) {
    console.log('[build-embeddings] URL:', SUPABASE_URL);
    console.log('[build-embeddings] Key length:', SUPABASE_KEY?.length);
  }

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
      console.error('[build-embeddings] Request URL:', url);
      console.error('[build-embeddings] Response status:', response.status);
      throw new Error(`Failed to fetch flips: ${error}`);
    }

    const data = await response.json();
    allFlips.push(...data);

    if (DEBUG) {
      console.log(`[build-embeddings] Fetched ${data.length} flips (total: ${allFlips.length})`);
    }

    // Break if we got fewer results than the limit (last page)
    if (data.length < limit) break;
    offset += limit;
  }

  console.log(`[build-embeddings] ✓ Fetched ${allFlips.length} flips from Supabase`);
  return allFlips;
}

// --- run -------------------------------------------------------------------
async function main() {
  let rows;
  try {
    rows = await fetchFlips();
  } catch (error) {
    console.error('[build-embeddings] ❌ Failed to fetch from Supabase:', error.message);
    process.exit(1);
  }

  if (!rows.length) {
    console.warn('[build-embeddings] No flips found in Supabase');
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify([], null, 2));
    process.exit(0);
  }

  // Compute per-row features from your schema
  function minutesBetween(o, c) {
    const toTs = s => (s ? Date.parse(s) : NaN);
    const t1 = toTs(o),
      t2 = toTs(c);
    if (!Number.isFinite(t1) || !Number.isFinite(t2)) return NaN;
    return (t2 - t1) / 60000;
  }

  const byItem = new Map();
  for (const r of rows) {
    const name = r.item_name || r.name || r.item;
    if (!name) continue;

    const profit = toNum(r.profit);
    const closedQty = toNum(r.closed_quantity);
    const marginEach =
      Number.isFinite(profit) && Number.isFinite(closedQty) && closedQty > 0
        ? profit / closedQty
        : NaN;

    const holdMin = minutesBetween(r.opened_time, r.closed_time);

    if (!byItem.has(name)) byItem.set(name, { profits: [], margins: [], holds: [] });
    const b = byItem.get(name);
    if (Number.isFinite(profit)) b.profits.push(profit);
    if (Number.isFinite(marginEach)) b.margins.push(marginEach);
    if (Number.isFinite(holdMin)) b.holds.push(holdMin);
  }

  // aggregate
  const sum = a => a.reduce((x, y) => x + y, 0);
  const median = a => {
    if (!a.length) return NaN;
    const s = [...a].sort((x, y) => x - y);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  const stdev = a => {
    if (a.length < 2) return NaN;
    const m = sum(a) / a.length;
    const v = sum(a.map(x => (x - m) ** 2)) / (a.length - 1);
    return Math.sqrt(v);
  };

  let feats = [];
  for (const [name, b] of byItem.entries()) {
    const totalProfit = sum(b.profits);
    const medMargin = median(b.margins);
    const holdMed = median(b.holds);
    const vol = stdev(b.margins.filter(Number.isFinite));
    const stable = Number.isFinite(vol) ? 1 / (1 + vol) : 0.5;

    // accept if we have either profit or margin
    if (!Number.isFinite(totalProfit) && !Number.isFinite(medMargin)) continue;

    feats.push({
      name,
      profit: Number.isFinite(totalProfit) ? totalProfit : 0,
      margin: Number.isFinite(medMargin) ? medMargin : 0,
      holdMin: Number.isFinite(holdMed) ? holdMed : 0,
      stable,
    });
  }

  if (DEBUG) console.log(`[build-embeddings] items with signal: ${feats.length}`);

  let out = [];
  if (feats.length >= 3) {
    // PCA to 2D on [margin, holdMin, stable]
    const X = feats.map(r => [r.margin, r.holdMin, r.stable]);
    // standardize
    const mu = [0, 0, 0],
      sd = [0, 0, 0];
    for (let j = 0; j < 3; j++) {
      const col = X.map(row => row[j]);
      mu[j] = col.reduce((a, b) => a + b, 0) / col.length;
      const variance = col.reduce((a, b) => a + (b - mu[j]) ** 2, 0) / Math.max(1, col.length - 1);
      sd[j] = Math.sqrt(variance) || 1;
    }
    const Z = X.map(row => row.map((v, j) => (v - mu[j]) / sd[j]));
    const pca = new PCA(Z, { center: false, scale: false });
    const comps = pca.predict(Z, { nComponents: 2 }).to2DArray();

    out = feats.map((r, i) => ({
      name: r.name,
      x: +comps[i][0].toFixed(5),
      y: +comps[i][1].toFixed(5),
      profit: Math.round(r.profit),
      stable: +r.stable.toFixed(4),
      holdMin: Math.round(r.holdMin),
      margin: Math.round(r.margin),
    }));
  } else {
    // Still write something so UI isn't empty
    out = feats.map((r, i) => ({
      name: r.name,
      x: i * 0.1,
      y: 0,
      profit: Math.round(r.profit),
      stable: +r.stable.toFixed(4),
      holdMin: Math.round(r.holdMin),
      margin: Math.round(r.margin),
    }));
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(`[build-embeddings] ${out.length} items → ${path.relative(ROOT, OUT)}`);
}

main().catch(err => {
  console.error('[build-embeddings] Fatal error:', err);
  process.exit(1);
});
