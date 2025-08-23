const fs = require('fs');
const path = require('path');

let totalProfit = 0;
const dir = 'C:/Users/18159/osrs-flip-dashboard/public/data/daily-summary';
const files = fs.readdirSync(dir);

console.log('Day-by-day profit breakdown:');
console.log('================================');

files.forEach(file => {
  if (file.endsWith('.json') && file !== '07-27-2025.json') {
    const data = JSON.parse(fs.readFileSync(path.join(dir, file)));
    totalProfit += data.profit;
    console.log(`${file.replace('.json', '')}: ${(data.profit/1000000).toFixed(2)}M (Total: ${(totalProfit/1000000).toFixed(2)}M)`);
  }
});

console.log('================================');
console.log(`Total profit: ${(totalProfit/1000000).toFixed(2)}M`);
console.log(`Total profit (exact): ${totalProfit} GP`);