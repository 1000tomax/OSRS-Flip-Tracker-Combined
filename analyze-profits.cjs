const fs = require('fs');
const path = require('path');
const csv = require('csv-parse/sync');

const baseDir = 'C:/Users/18159/osrs-flip-dashboard/public/data/processed-flips/2025';
let allFlips = [];

function readFlipsFromDir(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      readFlipsFromDir(fullPath);
    } else if (file.name === 'flips.csv') {
      const content = fs.readFileSync(fullPath, 'utf8');
      const records = csv.parse(content, {
        columns: true,
        skip_empty_lines: true
      });
      
      for (const record of records) {
        const profit = parseInt(record.profit) || 0;
        const spent = parseInt(record.spent) || 1;
        const roi = (profit / spent) * 100;
        
        allFlips.push({
          item: record.item_name,
          profit: profit,
          spent: spent,
          roi: roi,
          date: record.closed_time
        });
      }
    }
  }
}

console.log('Analyzing profit margins...\n');
readFlipsFromDir(baseDir);

// Sort by profit
allFlips.sort((a, b) => b.profit - a.profit);

console.log('Top 20 most profitable flips:');
console.log('=====================================');
for (let i = 0; i < 20 && i < allFlips.length; i++) {
  const f = allFlips[i];
  console.log(`${(f.profit/1000).toFixed(0)}K - ${f.item} (ROI: ${f.roi.toFixed(1)}%)`);
}

// Find suspiciously high ROI flips
const highROI = allFlips.filter(f => f.roi > 100 && f.profit > 100000);
if (highROI.length > 0) {
  console.log('\n\nSuspiciously high ROI flips (>100% ROI and >100K profit):');
  console.log('=====================================');
  highROI.forEach(f => {
    console.log(`${f.item}: ${(f.profit/1000).toFixed(0)}K profit on ${(f.spent/1000).toFixed(0)}K spent (${f.roi.toFixed(1)}% ROI)`);
  });
}

// Sum up profits by day
const profitByDay = {};
allFlips.forEach(f => {
  const day = f.date.split('T')[0];
  if (!profitByDay[day]) profitByDay[day] = 0;
  profitByDay[day] += f.profit;
});

console.log('\n\nDaily profit totals:');
console.log('=====================================');
Object.keys(profitByDay).sort().forEach(day => {
  console.log(`${day}: ${(profitByDay[day]/1000000).toFixed(2)}M`);
});

const totalProfit = allFlips.reduce((sum, f) => sum + f.profit, 0);
console.log(`\nTotal: ${(totalProfit/1000000).toFixed(2)}M`);