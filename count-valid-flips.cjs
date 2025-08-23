const fs = require('fs');
const path = require('path');
const csv = require('csv-parse/sync');

// Blue firelighter opened time
const CHALLENGE_START = new Date('2025-07-28T10:42:03Z');

const baseDir = 'C:/Users/18159/osrs-flip-dashboard/public/data/processed-flips/2025';
let validProfit = 0;
let validFlips = 0;
let invalidProfit = 0;
let invalidFlips = 0;

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
        const closedTime = new Date(record.closed_time);
        const profit = parseInt(record.profit) || 0;
        
        if (closedTime >= CHALLENGE_START) {
          validProfit += profit;
          validFlips++;
        } else {
          invalidProfit += profit;
          invalidFlips++;
          console.log(`BEFORE START: ${record.item_name} closed at ${record.closed_time} for ${profit} GP`);
        }
      }
    }
  }
}

console.log('Counting flips after blue firelighter (challenge start)...\n');
readFlipsFromDir(baseDir);

console.log('\n=================================');
console.log(`Flips AFTER challenge start: ${validFlips}`);
console.log(`Profit AFTER challenge start: ${(validProfit/1000000).toFixed(2)}M GP`);
console.log(`\nFlips BEFORE challenge start: ${invalidFlips}`);
console.log(`Profit BEFORE challenge start: ${(invalidProfit/1000000).toFixed(2)}M GP`);
console.log(`\nTotal profit being counted: ${((validProfit + invalidProfit)/1000000).toFixed(2)}M GP`);