/**
 * Convert natural language query to structured filter rules using Claude API
 * @param {string} userQuery - Natural language description of filtering criteria
 * @param {number} totalItems - Total items available
 * @param {number} itemsWithPrices - Items that have price data
 * @param {number} itemsWithVolume - Items that have volume data
 * @returns {Promise<Object>} Filter configuration object
 */
export async function convertQueryToFilterRules(
  userQuery,
  totalItems,
  itemsWithPrices,
  itemsWithVolume
) {
  const prompt = `You are a filter configuration assistant for OSRS (Old School RuneScape) Grand Exchange items.

AVAILABLE DATA:
- Total items in game: ${totalItems}
- Items with price data: ${itemsWithPrices}
- Items with volume data: ${itemsWithVolume}
- Item properties: id, name, members (boolean), price (instant buy/sell)
- Volume data: 1-hour trading volume (highPriceVolume + lowPriceVolume)

USER'S FILTERING REQUEST:
"${userQuery}"

TASK: Convert this natural language request into a structured filter configuration.

RULES:
1. The goal is to determine which items should be TRADEABLE (not blocked)
2. Default is to BLOCK all items, then INCLUDE based on rules
3. Support complex logic: AND, OR, EXCEPT
4. Handle price in gp (1k = 1000, 1m = 1000000, etc.)
5. Volume is 1-hour trading volume (approximate daily: multiply by ~24)

RETURN ONLY VALID JSON (no markdown, no explanation):

{
  "interpretation": "Brief explanation of how you understood the query",
  "rules": [
    {
      "type": "include",
      "conditions": [
        {
          "field": "price" | "volume" | "f2p" | "members",
          "operator": "gt" | "lt" | "gte" | "lte" | "eq" | "between",
          "value": number | boolean | [min, max]
        }
      ],
      "combineWith": "AND"
    }
  ],
  "defaultAction": "exclude"
}

EXAMPLES:

Query: "F2P items between 100k and 10m"
Response:
{
  "interpretation": "Include only F2P items priced between 100,000 and 10,000,000 gp",
  "rules": [
    {
      "type": "include",
      "conditions": [
        {"field": "price", "operator": "between", "value": [100000, 10000000]},
        {"field": "f2p", "operator": "eq", "value": true}
      ],
      "combineWith": "AND"
    }
  ],
  "defaultAction": "exclude"
}

Query: "Everything under 10m except high volume items"
Response:
{
  "interpretation": "Include items under 10m, but ALSO include high-volume items regardless of price",
  "rules": [
    {
      "type": "include",
      "conditions": [
        {"field": "price", "operator": "lt", "value": 10000000}
      ],
      "combineWith": "AND"
    },
    {
      "type": "include",
      "conditions": [
        {"field": "volume", "operator": "gt", "value": 10000}
      ],
      "combineWith": "AND"
    }
  ],
  "defaultAction": "exclude"
}

Query: "Members items over 1m OR any item with 50k+ volume"
Response:
{
  "interpretation": "Include items that are either: (members AND >1m) OR (volume >50k)",
  "rules": [
    {
      "type": "include",
      "conditions": [
        {"field": "members", "operator": "eq", "value": true},
        {"field": "price", "operator": "gt", "value": 1000000}
      ],
      "combineWith": "AND"
    },
    {
      "type": "include",
      "conditions": [
        {"field": "volume", "operator": "gt", "value": 50000}
      ],
      "combineWith": "AND"
    }
  ],
  "defaultAction": "exclude"
}

NOW PROCESS THE USER'S QUERY. Return ONLY the JSON, nothing else.`;

  // Use local proxy to avoid CORS issues
  const proxyUrl = import.meta.env.DEV
    ? 'http://localhost:3002/api/generate-blocklist-filter'
    : '/api/generate-blocklist-filter';

  const response = await fetch(proxyUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const jsonText = data.response.trim();

  // Strip markdown code blocks if present
  const cleanedText = jsonText
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  try {
    return JSON.parse(cleanedText);
  } catch (e) {
    throw new Error(`Failed to parse Claude response: ${e.message}`);
  }
}
