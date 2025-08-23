const fs = require('fs');
const csv = require('csv-parse/sync');

// Check a specific flip's math
const filePath = 'C:/Users/18159/osrs-flip-dashboard/public/data/processed-flips/2025/08/21/flips.csv';
const content = fs.readFileSync(filePath, 'utf8');
const records = csv.parse(content, {
  columns: true,
  skip_empty_lines: true
});

console.log('Checking math for large flips on Aug 21...\n');

let discrepancies = 0;
records.forEach(record => {
  const spent = parseInt(record.spent) || 0;
  const receivedPostTax = parseInt(record.received_post_tax) || 0;
  const taxPaid = parseInt(record.tax_paid) || 0;
  const recordedProfit = parseInt(record.profit) || 0;
  
  // Calculate what profit should be
  const calculatedProfit = receivedPostTax - spent - taxPaid;
  
  // Check if it matches
  if (Math.abs(calculatedProfit - recordedProfit) > 1) {
    console.log(`${record.item_name}:`);
    console.log(`  Spent: ${spent}`);
    console.log(`  Received (post-tax): ${receivedPostTax}`);
    console.log(`  Tax: ${taxPaid}`);
    console.log(`  Recorded profit: ${recordedProfit}`);
    console.log(`  Calculated profit: ${calculatedProfit}`);
    console.log(`  DISCREPANCY: ${recordedProfit - calculatedProfit}\n`);
    discrepancies++;
  }
});

console.log(`Found ${discrepancies} discrepancies`);