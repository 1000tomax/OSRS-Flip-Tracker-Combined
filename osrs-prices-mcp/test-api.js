/* eslint-env node */
// Simple test script to verify OSRS API endpoints
const OSRS_API_BASE = 'https://prices.runescape.wiki/api/v1/osrs';
const USER_AGENT = 'OSRS Investment Tracker MCP - Claude AI Assistant';

const TRACKED_ITEMS = ['20724', '27277', '24777'];
const ITEM_NAMES = {
  '20724': 'Imbued heart',
  '27277': "Tumeken's shadow (uncharged)",
  '24777': 'Blood shard',
};

async function testLatestPrices() {
  console.log('\n=== Testing Latest Prices ===');
  const response = await fetch(`${OSRS_API_BASE}/latest`, {
    headers: { 'User-Agent': USER_AGENT },
  });

  const data = await response.json();

  console.log('\nYour tracked items:');
  for (const itemId of TRACKED_ITEMS) {
    const price = data.data[itemId];
    if (price) {
      const buyPrice = price.high ? price.high.toLocaleString() : 'N/A';
      const sellPrice = price.low ? price.low.toLocaleString() : 'N/A';
      console.log(`\n${ITEM_NAMES[itemId]} (ID: ${itemId})`);
      console.log(`  Buy Price: ${buyPrice} gp`);
      console.log(`  Sell Price: ${sellPrice} gp`);
      console.log(`  Last Updated: ${new Date(price.highTime * 1000).toLocaleString()}`);
    }
  }
}

async function testItemMapping() {
  console.log('\n\n=== Testing Item Mapping ===');
  const response = await fetch(`${OSRS_API_BASE}/mapping`, {
    headers: { 'User-Agent': USER_AGENT },
  });

  const items = await response.json();

  console.log(`\nTotal items in database: ${items.length}`);

  // Find our tracked items
  console.log('\nYour tracked items:');
  for (const itemId of TRACKED_ITEMS) {
    const item = items.find(i => i.id === parseInt(itemId));
    if (item) {
      console.log(`\n${item.name} (ID: ${item.id})`);
      console.log(`  Examine: ${item.examine}`);
      console.log(`  Members: ${item.members ? 'Yes' : 'No'}`);
      console.log(`  High alch: ${item.highalch?.toLocaleString() || 'N/A'} gp`);
    }
  }
}

async function testTimeseries() {
  console.log('\n\n=== Testing Price Timeseries (1h for Imbued heart) ===');
  const response = await fetch(`${OSRS_API_BASE}/timeseries?id=20724&timestep=1h`, {
    headers: { 'User-Agent': USER_AGENT },
  });

  const result = await response.json();
  // eslint-disable-next-line no-magic-numbers
  const recentData = result.data.slice(-5); // Last 5 hours

  console.log('\nLast 5 hours of price data:');
  for (const point of recentData) {
    const time = new Date(point.timestamp * 1000).toLocaleString();
    const avgHigh = point.avgHighPrice ? point.avgHighPrice.toLocaleString() : 'N/A';
    const avgLow = point.avgLowPrice ? point.avgLowPrice.toLocaleString() : 'N/A';
    console.log(`${time}: High=${avgHigh} gp, Low=${avgLow} gp`);
  }
}

async function main() {
  try {
    console.log('Testing OSRS Wiki API integration...');
    await testLatestPrices();
    await testItemMapping();
    await testTimeseries();
    console.log('\n\n✓ All API tests completed successfully!');
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    // eslint-disable-next-line no-undef
    process.exit(1);
  }
}

main();
