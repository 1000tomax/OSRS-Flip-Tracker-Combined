const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('./config.cjs');
const {
  parseCSV,
  ensureDir,
  parseNumber,
  formatDate,
  toCSVCell,
} = require('./utils.cjs');

async function runParser() {
  const inputPath = path.resolve(
	  process.env.HOME || process.env.USERPROFILE,
	  'Documents',
	  'flips.csv'
	);
	let csvText;
	try {
	  csvText = await fs.promises.readFile(inputPath, 'utf8');
	} catch (err) {
	  console.error(`❌ Could not find flips.csv in Documents folder: ${inputPath}`);
	  throw err;
}


  const { header, records } = parseCSV(csvText);
  if (header.length === 0) {
    console.warn('No data found in input CSV.');
    return;
  }


  const flipsByDate = {};

  for (const row of records) {
    if (row['deleted'] && String(row['deleted']).toLowerCase() === 'true') continue;

    const accountId = row['Account'] || 'default';
    const itemName = row['Item']?.trim();
    const status = row['Status'];
    const openedQuantity = parseNumber(row['Bought']);
    const closedQuantity = parseNumber(row['Sold']);
    const avgBuyPrice = parseNumber(row['Avg. buy price']);
    const avgSellPrice = parseNumber(row['Avg. sell price']);
    const taxPaid = parseNumber(row['Tax']);
    const profit = parseNumber(row['Profit']);
    const openedTimeRaw = row['First buy time'];
    const closedTimeRaw = row['Last sell time'];
    const updatedTimeRaw = closedTimeRaw;
	

	// ✅ Skip any flips before the official challenge start date
	const challengeStart = new Date(config.CHALLENGE_START_ISO);
	const openedDateObj = new Date(openedTimeRaw);  // Check OPENED time, not closed
	if (openedDateObj < challengeStart) continue;

	// 🛡️ Safety Check: Ensure item name and timestamps exist
	if (!itemName || (!openedTimeRaw && !closedTimeRaw)) {
	  throw new Error(`❌ Flip row is missing item name or timestamp. Re-export from Copilot before proceeding.\nRow: ${JSON.stringify(row)}`);
	}

    const spent = openedQuantity * avgBuyPrice;
    const receivedPostTax = closedQuantity * avgSellPrice - taxPaid;

    const flipHash = crypto.createHash('sha256').update(`${accountId}|${itemName}|${status}|${closedQuantity}|${receivedPostTax}|${taxPaid}|${profit}|${closedTimeRaw}`).digest('hex');

    // 🔧 FIX: Use closed_time for date grouping to track when flips were completed
    // This ensures flips are grouped by when profit was realized, not when they started
    const closedDate = formatDate(new Date(closedTimeRaw));

    const recordOut = {
      account_id: accountId,
      item_name: itemName,
      status,
      opened_quantity: openedQuantity,
      spent,
      closed_quantity: closedQuantity,
      received_post_tax: receivedPostTax,
      tax_paid: taxPaid,
      profit,
      opened_time: openedTimeRaw,
      closed_time: closedTimeRaw,
      updated_time: updatedTimeRaw,
      flip_hash: flipHash,
    };

    if (!flipsByDate.hasOwnProperty(closedDate)) {
      flipsByDate[closedDate] = [];
    }
    flipsByDate[closedDate].push(recordOut);
  }

  const processedBase = path.join(__dirname, '..', 'public', 'data', 'processed-flips');
  for (const [dateStr, recordsForDate] of Object.entries(flipsByDate)) {
    const [mm, dd, yyyy] = dateStr.split('-');
    const dirPath = path.join(processedBase, yyyy, mm, dd);
    await ensureDir(dirPath);
    const filePath = path.join(dirPath, 'flips.csv');
    
    // 🔧 FIX: Overwrite instead of append to avoid mixing dates
    // This prevents accumulation of wrong-date flips in files
    const headerCols = [
      'account_id',
      'item_name',
      'status',
      'opened_quantity',
      'spent',
      'closed_quantity',
      'received_post_tax',
      'tax_paid',
      'profit',
      'opened_time',
      'closed_time',
      'updated_time',
      'flip_hash',
    ];

    let output = headerCols.join(',') + '\n';
    for (const rec of recordsForDate) {
      const row = headerCols.map(key => toCSVCell(rec[key]));
      output += row.join(',') + '\n';
    }

    await fs.promises.writeFile(filePath, output, 'utf8');
  }


  const now = new Date();
  const archiveDate = formatDate(now);
  const [amm, add, ayyy] = archiveDate.split('-');
  const rawDir = path.join(__dirname, 'raw-input', amm, add);
  await ensureDir(rawDir);

  const archiveName = `copilot-export-${archiveDate}.csv`;
  const archivePath = path.join(rawDir, archiveName);
  await fs.promises.copyFile(inputPath, archivePath);

  console.log(`✅ Parsed ${records.length} total records`);
  console.log(`✅ Processed ${Object.keys(flipsByDate).length} unique dates`);
  console.log(`✅ Archived input to: ${archivePath}`);
}

module.exports = {
  runParser,
};