// scripts/build-summary-index.cjs
// Scan public/data/daily-summary/*.json → write /public/data/summary-index.json
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const SRC_DIR = process.env.SUMMARY_DIR
  ? path.resolve(ROOT, process.env.SUMMARY_DIR)
  : path.join(ROOT, 'public', 'data', 'daily-summary');
const OUT = path.join(ROOT, 'public', 'data', 'summary-index.json');

const toNum = v => {
  if (v == null || v === '') return NaN;
  const s = String(v).trim().replace(/,/g, '');
  const isPct = s.endsWith('%');
  const n = parseFloat(isPct ? s.slice(0, -1) : s);
  return isPct ? n / 100 : n;
};
const toISO = mmddyyyy => {
  const m = String(mmddyyyy || '').match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!m) return mmddyyyy;
  const [_, mm, dd, yy] = m;
  return `${yy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
};

function listJson(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter(f => f.toLowerCase().endsWith('.json'))
    .map(f => path.join(dir, f));
}

const files = listJson(SRC_DIR);
if (!files.length) {
  console.warn('[build-summary-index] No daily JSONs found:', SRC_DIR);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ days: [] }, null, 2));
  process.exit(0);
}

const days = [];
for (const file of files) {
  try {
    const j = JSON.parse(fs.readFileSync(file, 'utf8'));
    const dateFromFile = path.basename(file, '.json');
    const date = toISO(j.date || dateFromFile);

    const net = toNum(j.net_worth ?? j.netWorth);
    const profit = toNum(j.profit ?? j.gp_per_day);
    const rawPC = toNum(j.percent_change ?? j.percentChange ?? j.roi_percent);

    // Normalize: if >1, treat as percent and divide by 100
    const roi_decimal = Number.isFinite(rawPC) ? (Math.abs(rawPC) > 1 ? rawPC / 100 : rawPC) : null;

    days.push({ date, netWorth: net, profit, percentChange: rawPC, roi_decimal });
  } catch (e) {
    console.warn('[build-summary-index] failed parsing', file, e.message);
  }
}

// sort ascending by date
days.sort((a, b) => String(a.date).localeCompare(String(b.date)));

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ days }, null, 2));
console.log(`[build-summary-index] Wrote ${days.length} days → ${path.relative(ROOT, OUT)}`);
