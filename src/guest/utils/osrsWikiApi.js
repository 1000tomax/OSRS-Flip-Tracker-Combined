const BASE_URL = 'https://prices.runescape.wiki/api/v1/osrs';

// ⚠️ REQUIRED: Descriptive User-Agent per OSRS Wiki API policy
const headers = {
  'User-Agent': 'OSRS Flip Dashboard - discord: Mreedon',
};

/**
 * Fetch all item mappings
 * @returns {Promise<Array>} Array of item objects
 */
export async function fetchItemMapping() {
  const response = await fetch(`${BASE_URL}/mapping`, { headers });
  if (!response.ok) {
    throw new Error(`Failed to fetch item mapping: ${response.status} ${response.statusText}`);
  }
  // Returns array directly (no wrapper object)
  return response.json();
}

/**
 * Fetch latest prices for all items
 * @returns {Promise<Object>} Price data keyed by item ID (string)
 */
export async function fetchLatestPrices() {
  const response = await fetch(`${BASE_URL}/latest`, { headers });
  if (!response.ok) {
    throw new Error(`Failed to fetch prices: ${response.status} ${response.statusText}`);
  }
  const json = await response.json();
  // Returns: { data: { "4151": { high, highTime, low, lowTime }, ... } }
  // Extract .data property to get price info keyed by item ID
  return json.data;
}

/**
 * Fetch 1-hour volume data (better for filtering than 5-min)
 * @returns {Promise<Object>} Volume data keyed by item ID (string)
 */
export async function fetch1HourVolume() {
  const response = await fetch(`${BASE_URL}/1h`, { headers });
  if (!response.ok) {
    throw new Error(`Failed to fetch volume data: ${response.status} ${response.statusText}`);
  }
  const json = await response.json();
  // Returns: { data: { "4151": { avgHighPrice, highPriceVolume, avgLowPrice, lowPriceVolume, timestamp }, ... } }
  // Extract .data property to get volume info keyed by item ID
  return json.data;
}

/**
 * Fetch 5-minute volume data (kept for backwards compatibility)
 * @returns {Promise<Object>} Volume data keyed by item ID (string)
 */
export async function fetch5MinVolume() {
  const response = await fetch(`${BASE_URL}/5m`, { headers });
  if (!response.ok) {
    throw new Error(`Failed to fetch volume data: ${response.status} ${response.statusText}`);
  }
  const json = await response.json();
  // Returns: { data: { "4151": { avgHighPrice, highPriceVolume, avgLowPrice, lowPriceVolume, timestamp }, ... } }
  // Extract .data property to get volume info keyed by item ID
  return json.data;
}
