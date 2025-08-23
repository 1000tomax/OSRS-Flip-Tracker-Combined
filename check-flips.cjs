const fs = require('fs');
const path = require('path');

// Read all flip files and check for duplicates and anomalies
const baseDir = 'C:/Users/18159/osrs-flip-dashboard/public/data/processed-flips/2025';
let totalProfit = 0;
let flipCount = 0;
const flipHashes = new Set();
let duplicates = 0;
let negativeProfit = 0;
let largeFlips = [];

function readFlipsFromDir(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      readFlipsFromDir(fullPath);
    } else if (file.name === 'flips.csv') {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      const header = lines[0];
      
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const parts = lines[i].split(',');
        
        // Get profit column (index 8)
        const profit = parseInt(parts[8]);
        const hash = parts[parts.length - 1];
        const item = parts[1];
        
        if (flipHashes.has(hash)) {
          duplicates++;
          console.log(`DUPLICATE: ${item} - ${profit} GP (hash: ${hash})`);
        } else {
          flipHashes.add(hash);
          totalProfit += profit;
          flipCount++;
          
          if (profit < 0) {
            negativeProfit++;
          }
          
          if (profit > 5000000) {
            largeFlips.push({ item, profit, file: fullPath });
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
console.log(`Total profit calculated: ${(totalProfit/1000000).toFixed(2)}M GP`);
console.log(`Duplicate flips found: ${duplicates}`);
console.log(`Negative profit flips: ${negativeProfit}`);
console.log('\nLarge flips (>5M):');
largeFlips.forEach(f => {
  console.log(`  ${f.item}: ${(f.profit/1000000).toFixed(2)}M`);
});

// Check against meta.json
const meta = JSON.parse(fs.readFileSync('C:/Users/18159/osrs-flip-dashboard/public/data/meta.json'));
console.log('\n=================================');
console.log('Meta.json comparison:');
console.log(`  Meta total_profit: ${(meta.total_profit/1000000).toFixed(2)}M`);
console.log(`  Calculated profit: ${(totalProfit/1000000).toFixed(2)}M`);
console.log(`  Difference: ${((meta.total_profit - totalProfit)/1000000).toFixed(2)}M`);