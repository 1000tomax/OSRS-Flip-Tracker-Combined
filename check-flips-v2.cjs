const fs = require('fs');
const path = require('path');
const csv = require('csv-parse/sync');

// Read all flip files and check for duplicates and anomalies
const baseDir = 'C:/Users/18159/osrs-flip-dashboard/public/data/processed-flips/2025';
let totalProfit = 0;
let flipCount = 0;
const flipHashes = new Set();
let duplicates = 0;
let largeFlips = [];

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
        const hash = record.flip_hash;
        const item = record.item_name;
        
        if (flipHashes.has(hash)) {
          duplicates++;
          console.log(`DUPLICATE: ${item} - ${profit} GP (hash: ${hash})`);
        } else {
          flipHashes.add(hash);
          totalProfit += profit;
          flipCount++;
          
          if (profit > 5000000) {
            largeFlips.push({ 
              item, 
              profit, 
              date: fullPath.match(/(\d{2})\/(\d{2})\/flips\.csv/)?.[0] 
            });
          }
        }
      }
    }
  }
}

console.log('Analyzing all flips...\n');
readFlipsFromDir(baseDir);

console.log('=================================');
console.log(`Total flips processed: ${flipCount}`);
console.log(`Total profit calculated: ${(totalProfit/1000000).toFixed(2)}M GP (${totalProfit} GP)`);
console.log(`Duplicate flips found: ${duplicates}`);
console.log('\nLarge flips (>5M):');
largeFlips.sort((a,b) => b.profit - a.profit).forEach(f => {
  console.log(`  ${f.item}: ${(f.profit/1000000).toFixed(2)}M on ${f.date}`);
});

// Check against meta.json
const meta = JSON.parse(fs.readFileSync('C:/Users/18159/osrs-flip-dashboard/public/data/meta.json'));
console.log('\n=================================');
console.log('Meta.json comparison:');
console.log(`  Meta total_profit: ${(meta.total_profit/1000000).toFixed(2)}M`);
console.log(`  Calculated profit: ${(totalProfit/1000000).toFixed(2)}M`);
console.log(`  Difference: ${((meta.total_profit - totalProfit)/1000000).toFixed(2)}M`);