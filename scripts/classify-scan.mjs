// scripts/classify-scan.mjs
// Scan flips data to classify unique items and report coverage
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
import {
  classifyItem,
  getCoarseCategory,
  choosePrimaryCategory,
} from '../src/lib/classification.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const PROCESSED_DIR = path.join(ROOT, 'public', 'data', 'processed-flips');
const ROOT_FLIPS = path.join(ROOT, 'flips.csv');
const OUT_JSON = path.join(ROOT, 'public', 'data', 'classify-report.json');

const DEBUG = !!process.env.DEBUG;

function listCsvsRec(baseDir) {
  const out = [];
  if (!fs.existsSync(baseDir)) return out;
  (function walk(dir) {
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      const st = fs.statSync(p);
      if (st.isDirectory()) walk(p);
      else if (st.isFile() && name.toLowerCase().endsWith('.csv')) out.push(p);
    }
  })(baseDir);
  return out;
}

function loadCsv(file) {
  try {
    const text = fs.readFileSync(file, 'utf8');
    return parse(text, { columns: true, skip_empty_lines: true });
  } catch (e) {
    if (DEBUG) console.warn('[classify-scan] failed reading', file, e.message);
    return [];
  }
}

function collectItemNames() {
  const names = new Set();
  if (fs.existsSync(ROOT_FLIPS)) {
    loadCsv(ROOT_FLIPS).forEach(r => {
      const n = r.item_name || r.item || r.name;
      if (n) names.add(String(n));
    });
  }
  for (const f of listCsvsRec(PROCESSED_DIR)) {
    loadCsv(f).forEach(r => {
      const n = r.item_name || r.item || r.name;
      if (n) names.add(String(n));
    });
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

function main() {
  const items = collectItemNames();
  if (!items.length) {
    console.log('[classify-scan] No items found.');
    process.exit(0);
  }

  const rows = [];
  const coarseCounts = new Map();
  const overTagged = [];
  const others = [];

  for (const name of items) {
    const tags = classifyItem(name);
    const primary = choosePrimaryCategory(tags);
    const coarse = getCoarseCategory(tags);
    rows.push({ name, tags, primary, coarse, tagCount: tags.length });
    coarseCounts.set(coarse, (coarseCounts.get(coarse) || 0) + 1);
    if (tags.length >= 5) overTagged.push({ name, tags });
    if (tags.length === 1 && tags[0] === 'Other') others.push(name);
  }

  // Sort coarse counts desc
  const coarseSummary = Array.from(coarseCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => ({ category: k, count: v }));

  // Write JSON report
  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(
    OUT_JSON,
    JSON.stringify(
      {
        totalItems: items.length,
        coarseSummary,
        overTagged: overTagged.slice(0, 100),
        others: others.slice(0, 200),
        rows,
      },
      null,
      2
    )
  );

  // Console summary
  console.log(`Classified ${items.length} unique items.`);
  console.log('Coarse category counts:');
  for (const { category, count } of coarseSummary) {
    console.log(`- ${category}: ${count}`);
  }

  console.log(`\nOver-tagged items (>=5 tags): ${overTagged.length} (showing up to 20)`);
  overTagged.slice(0, 20).forEach(x => console.log(`- ${x.name}: ${x.tags.join(', ')}`));

  console.log(`\nUncategorized (Other): ${others.length} (showing up to 20)`);
  others.slice(0, 20).forEach(name => console.log(`- ${name}`));

  console.log(`\nReport written to ${path.relative(ROOT, OUT_JSON)}`);
}

main();
