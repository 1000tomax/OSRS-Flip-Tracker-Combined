const fs = require('fs');
const path = require('path');
const csv = require('csv-parse/sync');

// Read and sum up all flips day by day
const baseDir = 'C:/Users/18159/osrs-flip-dashboard/public/data/processed-flips/2025';
const dailyTotals = {};

function readFlipsFromDir(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      readFlipsFromDir(fullPath);
    } else if (file.name === 'flips.csv') {
      // Extract date from path
      const parts = fullPath.split(path.sep);
      const year = parts[parts.indexOf('2025')];
      const month = parts[parts.indexOf('2025') + 1];
      const day = parts[parts.indexOf('2025') + 2];
      const date = `${month}-${day}-${year}`;
      
      const content = fs.readFileSync(fullPath, 'utf8');
      const records = csv.parse(content, {
        columns: true,
        skip_empty_lines: true
      });
      
      if (!dailyTotals[date]) {
        dailyTotals[date] = { profit: 0, flips: 0, items: [] };
      }
      
      for (const record of records) {
        const profit = parseInt(record.profit) || 0;
        dailyTotals[date].profit += profit;
        dailyTotals[date].flips++;
        
        // Track large profits
        if (profit > 500000) {
          dailyTotals[date].items.push({
            item: record.item_name,
            profit: profit
          });
        }
      }
    }
  }
}

console.log('Calculating daily totals from raw CSV files...\n');
readFlipsFromDir(baseDir);

// Sort dates and calculate running total
const sortedDates = Object.keys(dailyTotals).sort();
let runningTotal = 0;
let totalFlips = 0;

console.log('Day-by-day breakdown:');
console.log('Date       | Daily Profit | Running Total | Flips | Large Items');
console.log('-----------|-------------|---------------|-------|-------------');

sortedDates.forEach(date => {
  const day = dailyTotals[date];
  runningTotal += day.profit;
  totalFlips += day.flips;
  
  const largeItems = day.items.map(i => `${i.item}(${(i.profit/1000).toFixed(0)}K)`).join(', ');
  
  console.log(
    `${date} | ${(day.profit/1000000).toFixed(2).padStart(10)}M | ${(runningTotal/1000000).toFixed(2).padStart(12)}M | ${day.flips.toString().padStart(5)} | ${largeItems}`
  );
  
  // Check if we've hit around 155M
  if (runningTotal >= 155000000 && runningTotal <= 156000000) {
    console.log('>>> Reached ~155M at this point <<<');
  }
});

console.log('\n========================================');
console.log(`Total profit: ${(runningTotal/1000000).toFixed(2)}M`);
console.log(`Total flips: ${totalFlips}`);

// Check what happens after 155M
const targetReached = 155000000;
let profitAfterTarget = 0;
let currentTotal = 0;

sortedDates.forEach(date => {
  const day = dailyTotals[date];
  if (currentTotal >= targetReached) {
    profitAfterTarget += day.profit;
  }
  currentTotal += day.profit;
});

console.log(`\nProfit after reaching 155M: ${(profitAfterTarget/1000000).toFixed(2)}M`);