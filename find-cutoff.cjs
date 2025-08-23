const fs = require('fs');
const path = require('path');
const csv = require('csv-parse/sync');

// Target profit from in-game tracker
const TARGET_PROFIT = 155000000; // 155M

// Read all flip files chronologically
const baseDir = 'C:/Users/18159/osrs-flip-dashboard/public/data/processed-flips/2025';
let totalProfit = 0;
let flipCount = 0;
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
        allFlips.push({
          item: record.item_name,
          profit: profit,
          closed_time: record.closed_time,
          date: new Date(record.closed_time)
        });
      }
    }
  }
}

console.log('Finding cutoff point for 155M profit...\n');
readFlipsFromDir(baseDir);

// Sort by closed time
allFlips.sort((a, b) => a.date - b.date);

// Find where we hit 155M
for (const flip of allFlips) {
  totalProfit += flip.profit;
  flipCount++;
  
  if (totalProfit >= TARGET_PROFIT && totalProfit <= TARGET_PROFIT + 5000000) {
    console.log(`\nFound approximate match at flip #${flipCount}:`);
    console.log(`Total profit: ${(totalProfit/1000000).toFixed(2)}M`);
    console.log(`Last flip: ${flip.item} for ${flip.profit} GP`);
    console.log(`Timestamp: ${flip.closed_time}`);
    console.log(`\nNext 5 flips after this point:`);
    
    const idx = allFlips.indexOf(flip);
    for (let i = 1; i <= 5 && idx + i < allFlips.length; i++) {
      const nextFlip = allFlips[idx + i];
      console.log(`  ${nextFlip.closed_time}: ${nextFlip.item} (${nextFlip.profit} GP)`);
    }
    break;
  }
}

console.log(`\nTotal flips: ${allFlips.length}`);
console.log(`Final profit if all counted: ${(allFlips.reduce((sum, f) => sum + f.profit, 0)/1000000).toFixed(2)}M`);

// Find the earliest flip that should be counted
console.log(`\nFirst flip in dataset: ${allFlips[0].closed_time}`);
console.log(`Last flip in dataset: ${allFlips[allFlips.length-1].closed_time}`);