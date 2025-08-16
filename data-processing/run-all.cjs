const { runParser } = require('./parser.cjs');
const { runItemStats } = require('./itemStats.cjs');
const { runSummaryBuilder } = require('./summaryBuilder.cjs');
const { writeMeta, writeSummaryIndex } = require('./metaWriter.cjs');

async function runAll() {
  console.log('🚀 Starting OSRS Flip Data Processing...\n');
  
  try {
    console.log('📊 Step 1: Parsing flips.csv...');
    await runParser();
    console.log('');
    
    console.log('📈 Step 2: Building daily summaries...');
    await runSummaryBuilder();
    console.log('');
    
    console.log('🎯 Step 3: Generating item statistics...');
    await runItemStats();
    console.log('');
    
    console.log('📝 Step 4: Writing metadata...');
    await writeMeta();
    console.log('');
    
    console.log('📋 Step 5: Creating summary index...');
    await writeSummaryIndex();
    console.log('');
    
    console.log('✅ All data processing completed successfully!');
  } catch (error) {
    console.error('❌ Data processing failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runAll();
}

module.exports = {
  runAll,
};