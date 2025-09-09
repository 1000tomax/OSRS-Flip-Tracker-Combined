import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const app = express();
const PORT = process.env.PROXY_PORT || 3002;

// Log environment status
console.log('Environment variables loaded:', {
  hasClaudeKey: !!process.env.VITE_CLAUDE_API_KEY || !!process.env.CLAUDE_API_KEY,
  hasDiscordWebhook: !!process.env.VITE_DISCORD_WEBHOOK_URL,
  webhookUrlPrefix: process.env.VITE_DISCORD_WEBHOOK_URL
    ? `${process.env.VITE_DISCORD_WEBHOOK_URL.substring(0, 50)}...`
    : 'Not set',
  logInDev: process.env.VITE_LOG_TO_DISCORD_IN_DEV === 'true',
});

// Enable CORS for your dev server
app.use(
  cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  })
);

app.use(express.json());

// Proxy endpoint for Claude API
app.post('/api/claude', async (req, res) => {
  const apiKey = process.env.VITE_CLAUDE_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: 'Server configuration error',
      message: 'VITE_CLAUDE_API_KEY not set in .env file',
    });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.text();
    res.status(response.status).json(JSON.parse(data));
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({
      error: 'Proxy error',
      message: error.message || 'An unexpected error occurred',
    });
  }
});

// Cost calculation for Claude 3 Haiku
function calculateCost(usage) {
  if (!usage) return null;

  const INPUT_COST_PER_MILLION = 0.25; // $0.25 per million input tokens
  const OUTPUT_COST_PER_MILLION = 1.25; // $1.25 per million output tokens

  const inputCost = (usage.input_tokens / 1_000_000) * INPUT_COST_PER_MILLION;
  const outputCost = (usage.output_tokens / 1_000_000) * OUTPUT_COST_PER_MILLION;
  const totalCost = inputCost + outputCost;

  return {
    inputCost,
    outputCost,
    totalCost,
    formatted: `$${totalCost.toFixed(6)}`, // Show 6 decimal places for small amounts
  };
}

// Discord webhook logging function
async function logToDiscord(userInput, translation, success, errorMessage = null, usage = null) {
  const webhookUrl = process.env.VITE_DISCORD_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    console.log('Discord webhook not configured');
    return;
  }

  // Check if we should log in dev
  if (process.env.VITE_LOG_TO_DISCORD_IN_DEV === 'false') {
    console.log('📵 Discord logging disabled in dev (VITE_LOG_TO_DISCORD_IN_DEV=false)');
    console.log('   To enable: Set VITE_LOG_TO_DISCORD_IN_DEV=true in .env.local');
    return;
  }

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [
          {
            title: success
              ? '✅ Query Translation (Local Dev)'
              : '❌ Failed Translation (Local Dev)',
            color: success ? 0x00ff00 : 0xff0000,
            fields: [
              {
                name: 'User Input',
                value: `"${userInput.substring(0, 200)}"`,
                inline: false,
              },
              success
                ? {
                    name: 'Filters Generated',
                    value:
                      translation.query.filters.length > 0
                        ? `\`\`\`json\n${JSON.stringify(translation.query.filters, null, 2).substring(0, 500)}\`\`\``
                        : 'No filters',
                    inline: false,
                  }
                : {
                    name: 'Error',
                    value: errorMessage || 'Unknown error',
                    inline: false,
                  },
              success
                ? {
                    name: 'Display Type',
                    value: translation.display?.type || 'table',
                    inline: true,
                  }
                : null,
              success
                ? {
                    name: 'Sort/Limit',
                    value: `${translation.query.sortBy || 'none'} / ${translation.query.limit || 'all'}`,
                    inline: true,
                  }
                : null,
              success && translation.explanation
                ? {
                    name: 'AI Explanation',
                    value: translation.explanation.summary || 'No explanation',
                    inline: false,
                  }
                : null,
              usage
                ? {
                    name: '📊 Token Usage',
                    value: `Input: ${usage.input_tokens}\nOutput: ${usage.output_tokens}\nTotal: ${usage.input_tokens + usage.output_tokens}`,
                    inline: true,
                  }
                : null,
              usage && calculateCost(usage)
                ? {
                    name: '💰 Cost',
                    value: `${calculateCost(usage).formatted}\n(≈ ${(calculateCost(usage).totalCost * 100).toFixed(4)}¢)`,
                    inline: true,
                  }
                : null,
            ].filter(Boolean),
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });
    console.log('Logged to Discord successfully');
  } catch (err) {
    console.error('Discord webhook error:', err);
  }
}

// Add translate-query endpoint for local development
app.post('/api/translate-query', async (req, res) => {
  const apiKey = process.env.VITE_CLAUDE_API_KEY || process.env.CLAUDE_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: 'Server configuration error',
      message: 'Claude API key not set in .env file',
    });
  }

  const { userInput } = req.body;

  console.log('Received query translation request:', userInput);

  if (!userInput) {
    return res.status(400).json({ error: 'User input is required' });
  }

  const prompt = `Convert this natural language query about OSRS flipping data to a structured query:
"${userInput}"

IMPORTANT: The data contains individual flip records, NOT aggregated item statistics. 
- Each row is a single flip transaction
- When user says "items" they usually mean individual flips unless they explicitly ask for aggregation
- "Show my top 10 most profitable items" means show the 10 individual flips with highest profit
- DO NOT aggregate or group unless specifically requested

Available fields (per flip):
- profit (number): Total profit from flip in GP
- roi (number): Return on investment percentage
- item (string): Item name
- quantity (number): Amount traded
- date (date): When traded (YYYY-MM-DD format)
- avgBuyPrice (number): Average buy price in GP
- avgSellPrice (number): Average sell price in GP
- spent (number): Total GP spent
- revenue (number): Total GP earned
- hoursHeld (number): Hours item was held

Computed fields (calculated on the fly):
- profitVelocity (number): Profit per hour held
- marginPercent (number): Profit margin percentage
- daysSinceFlip (number): Days since the flip occurred
- profitPerItem (number): Average profit per item
- totalValue (number): Total transaction value

Return ONLY valid JSON in this exact format with no additional text:
{
  "query": {
    "filters": [{"field": "fieldname", "operator": "operator", "value": value}],
    "sortBy": "fieldname",
    "sortOrder": "desc",
    "limit": 10
  },
  "display": {
    "type": "table",
    "xAxis": "fieldname",
    "yAxis": "fieldname"
  },
  "explanation": {
    "summary": "One sentence describing what the query does (use 'flips' not 'items' when referring to individual transactions)",
    "filters": ["Human-readable explanation of each filter"],
    "insight": "Optional helpful tip or insight"
  }
}

Valid operators:
- For numbers: >, <, >=, <=, =, !=, between
- For strings: =, !=, contains, startsWith, endsWith
- For dates: >, <, =, between

Display types: table, bar_chart, pie_chart, line_chart, single_value

Examples:
- "top 10 items" or "top 10 flips" → filters: [], sortBy: "profit", sortOrder: "desc", limit: 10
- "top 10 most profitable items" → filters: [], sortBy: "profit", sortOrder: "desc", limit: 10
- "ROI over 50%" → filters: [{field: "roi", operator: ">", value: 50}]
- "flips from last week" → filters: [{field: "daysSinceFlip", operator: "<=", value: 7}]
- "flips from last month" → filters: [{field: "daysSinceFlip", operator: "<=", value: 30}]
- "yesterday's flips" → filters: [{field: "daysSinceFlip", operator: "<=", value: 1}]
- "dragon bones flips" → filters: [{field: "item", operator: "contains", value: "dragon"}]
- "all dragon items" → filters: [{field: "item", operator: "contains", value: "dragon"}]

IMPORTANT RULES:
1. For ANY time-based queries (last week, past 7 days, yesterday, last month, etc.), you MUST use the "daysSinceFlip" field, NOT the "date" field
2. NEVER generate specific dates like "2023-04-01" - always use daysSinceFlip with numeric values
3. "last week" = daysSinceFlip <= 7
4. "last month" = daysSinceFlip <= 30
5. "yesterday" = daysSinceFlip <= 1
6. The "date" field should ONLY be used when the user provides specific dates

Choose the most appropriate display type based on the query:
- Use table for detailed item lists
- Use bar_chart for comparing items
- Use pie_chart for showing proportions
- Use line_chart for trends over time
- Use single_value for aggregate totals`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        temperature: 0,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Claude API error:', errorData);
      throw new Error(`Claude API returned ${response.status}`);
    }

    const data = await response.json();

    // Extract token usage
    const usage = data.usage || null;
    if (usage) {
      const cost = calculateCost(usage);
      console.log(
        `📊 Token Usage: Input: ${usage.input_tokens}, Output: ${usage.output_tokens}, Total: ${usage.input_tokens + usage.output_tokens}`
      );
      console.log(
        `💰 Cost: ${cost.formatted} (Input: $${cost.inputCost.toFixed(6)}, Output: $${cost.outputCost.toFixed(6)})`
      );
    }

    console.log('Claude API raw response:', JSON.stringify(data.content[0].text).substring(0, 500));

    // Extract JSON from the response
    let aiResponse;
    try {
      const content = data.content[0].text;
      // Try to parse the content directly
      aiResponse = JSON.parse(content);
    } catch (_parseError) {
      // If direct parsing fails, try to extract JSON from the text
      const content = data.content[0].text;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiResponse = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Could not extract valid JSON from AI response');
      }
    }

    // Validate the response structure
    if (!aiResponse.query) {
      aiResponse.query = {
        filters: [],
        sortBy: null,
        sortOrder: 'desc',
        limit: null,
      };
    }

    if (!aiResponse.display) {
      aiResponse.display = {
        type: 'table',
      };
    }

    if (!aiResponse.explanation) {
      aiResponse.explanation = {
        summary: 'Query processed',
        filters: [],
        insight: null,
      };
    }

    console.log('Final AI response being sent:', JSON.stringify(aiResponse, null, 2));

    // Log to Discord webhook if configured (pass usage data)
    await logToDiscord(userInput, aiResponse, true, null, usage);

    res.status(200).json(aiResponse);
  } catch (error) {
    console.error('Query translation error:', error);

    // Log failure to Discord if configured
    await logToDiscord(userInput, null, false, error.message, null);

    res.status(500).json({
      error: 'Failed to translate query',
      message: error.message,
    });
  }
});

// SQL Generation endpoint for AI queries
app.post('/api/generate-sql', async (req, res) => {
  const apiKey = process.env.VITE_CLAUDE_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: 'Server configuration error',
      message: 'VITE_CLAUDE_API_KEY not set in .env file',
    });
  }

  // Rate limiting
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ 
      error: 'Too many requests. Please wait a minute.' 
    });
  }

  try {
    const { query, previousQuery, previousSQL } = req.body;
    
    // Input validation
    if (!query || query.length < 3) {
      return res.status(400).json({ 
        error: 'Query too short' 
      });
    }
    
    if (query.length > 500) {
      return res.status(400).json({ 
        error: 'Query too long. Please keep under 500 characters.' 
      });
    }
    
    // Build prompt based on whether this is a follow-up
    const isFollowUp = !!previousQuery;
    
    const prompt = isFollowUp ? `
You are refining a previous SQL query based on user feedback.

Previous user query: "${previousQuery}"
Previous SQL generated: ${previousSQL}

User's refinement request: "${query}"

Generate an updated SQL query that incorporates the refinement.

Examples of refinements:
- "exclude ammo" → Add: AND item NOT LIKE '%bolt%' AND item NOT LIKE '%arrow%'
- "only the profitable ones" → Add: AND profit > 0
- "sort by ROI instead" → Change: ORDER BY roi DESC
- "show more results" → Change: LIMIT 100
- "show all" → Remove LIMIT clause but keep all WHERE conditions and ORDER BY
- "show only top 10" → Add/Change: LIMIT 10

IMPORTANT: When user says "show all", preserve the original WHERE conditions and ORDER BY clause exactly. Only remove LIMIT restrictions.

Table schema:
CREATE TABLE flips (
  id INTEGER,
  item TEXT NOT NULL,
  buy_price INTEGER,
  sell_price INTEGER,
  profit INTEGER,
  roi REAL,
  quantity INTEGER,
  buy_time TEXT,
  sell_time TEXT,
  account TEXT,
  flip_duration_minutes INTEGER,
  date TEXT -- Format: YYYY-MM-DD
);

NOTE: 
- Item categorization is not currently implemented. Use specific item names or LIKE patterns for item filtering.
- Never select the 'id' field in queries as it's just an internal row number.

Return ONLY the updated SQL query:
` : `
You are a SQL query generator for an OSRS flip tracking database.

Table schema:
CREATE TABLE flips (
  id INTEGER,
  item TEXT NOT NULL,
  buy_price INTEGER,
  sell_price INTEGER,
  profit INTEGER,
  roi REAL,
  quantity INTEGER,
  buy_time TEXT,
  sell_time TEXT,
  account TEXT,
  flip_duration_minutes INTEGER,
  date TEXT -- Format: YYYY-MM-DD
);

NOTE: 
- Item categorization is not currently implemented. Use specific item names or LIKE patterns for item filtering.
- Never select the 'id' field in queries as it's just an internal row number.
- For time-based calculations, flip_duration_minutes can be converted to hours by dividing by 60

User request: "${query}"

Generate a SQL query that answers the user's request.

IMPORTANT RULES:
1. Return ONLY the SQL query, no explanations
2. Only include LIMIT if user specifies a number (e.g., "top 10", "first 20")
3. Use DATE() and DATETIME() functions for date operations
4. For "recent" or "latest", use date > date('now', '-7 days')
5. For aggregations, use appropriate GROUP BY with aggregate functions (SUM, COUNT, AVG)
6. NEVER use SELECT * - always specify columns explicitly (exclude id column)
7. Default to ORDER BY profit DESC if no order specified
8. Be defensive - use CAST() for numeric comparisons when needed
9. Use LIKE for partial text matches
10. When filtering by flip_duration_minutes, ALWAYS include flip_duration_minutes in SELECT for context
11. When querying by time duration (longer than, shorter than), ORDER BY flip_duration_minutes DESC for best results
12. If the user input is not about flips/trading, return: SELECT 'Please ask about OSRS flips' as error

Examples:
- "top 10 items" → SELECT item, buy_price, sell_price, profit, roi, quantity, account, date FROM flips ORDER BY profit DESC LIMIT 10
- "flips from last week" → SELECT item, buy_price, sell_price, profit, roi, quantity, account, date FROM flips WHERE date > date('now', '-7 days') ORDER BY profit DESC
- "dragon scimitar profits" → SELECT item, buy_price, sell_price, profit, roi, quantity, account, date FROM flips WHERE item LIKE '%dragon scimitar%' ORDER BY profit DESC
- "bandos items" → SELECT item, buy_price, sell_price, profit, roi, quantity, account, date FROM flips WHERE item LIKE '%bandos%' ORDER BY profit DESC
- "items I traded daily this week" → SELECT item, SUM(profit) as total_profit, AVG(roi) as avg_roi, COUNT(*) as total_flips, COUNT(DISTINCT date) as days_traded FROM flips WHERE date > date('now', '-7 days') GROUP BY item HAVING COUNT(DISTINCT date) = 7 ORDER BY SUM(profit) DESC
- "profit by item" → SELECT item, SUM(profit) as total_profit, COUNT(*) as flip_count FROM flips GROUP BY item ORDER BY total_profit DESC
- "profit by account" → SELECT account, SUM(profit) as total_profit, AVG(roi) as avg_roi FROM flips GROUP BY account ORDER BY total_profit DESC
- "most traded items" → SELECT item, COUNT(*) as flip_count, SUM(profit) as total_profit FROM flips GROUP BY item ORDER BY flip_count DESC
- "expensive flips only" → SELECT item, buy_price, sell_price, profit, roi, quantity, account, date FROM flips WHERE profit > 100000 ORDER BY profit DESC
- "flips longer than 24 hours" → SELECT item, buy_price, sell_price, profit, roi, quantity, account, date, flip_duration_minutes FROM flips WHERE flip_duration_minutes > 1440 ORDER BY flip_duration_minutes DESC

Generate SQL for the user request:`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        temperature: 0,
        messages: [{
          role: 'user',
          content: prompt
        }]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const sql = data.content[0].text.trim();
    
    // Validate SQL
    const validation = validateSQL(sql);
    if (!validation.safe) {
      return res.status(400).json({ 
        error: 'Generated SQL failed safety check',
        reason: validation.reason 
      });
    }
    
    res.status(200).json({ 
      sql,
      estimated_cost: 0.00025
    });
    
  } catch (error) {
    console.error('SQL generation error:', error);
    
    res.status(500).json({ 
      error: 'Failed to generate SQL query' 
    });
  }
});

function validateSQL(sql) {
  const forbidden = [
    'DROP', 'DELETE', 'INSERT', 'UPDATE', 'ALTER', 
    'CREATE', 'TRUNCATE', 'EXEC', 'EXECUTE'
  ];
  
  const upperSQL = sql.toUpperCase();
  for (const keyword of forbidden) {
    if (upperSQL.includes(keyword)) {
      return { safe: false, reason: `Forbidden keyword: ${keyword}` };
    }
  }
  
  if (!upperSQL.trim().startsWith('SELECT')) {
    return { safe: false, reason: 'Only SELECT queries allowed' };
  }
  
  // LIMIT clause no longer required - user preference is to see all results
  
  return { safe: true };
}

// Rate limiting for SQL endpoint
const sqlRateLimits = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const userLimits = sqlRateLimits.get(ip) || { count: 0, resetAt: now + 60000 };
  
  if (now > userLimits.resetAt) {
    userLimits.count = 0;
    userLimits.resetAt = now + 60000;
  }
  
  if (userLimits.count >= 20) {
    return false;
  }
  
  userLimits.count++;
  sqlRateLimits.set(ip, userLimits);
  
  if (sqlRateLimits.size > 1000) {
    sqlRateLimits.clear();
  }
  
  return true;
}

app
  .listen(PORT, () => {
    console.log(`Proxy server running on http://localhost:${PORT}`);
    console.log(`Claude API endpoint: http://localhost:${PORT}/api/claude`);
    console.log(`Query translation endpoint: http://localhost:${PORT}/api/translate-query`);
    console.log(`SQL generation endpoint: http://localhost:${PORT}/api/generate-sql`);
  })
  .on('error', err => {
    console.error('Failed to start proxy server:', err);
    process.exit(1);
  });

// Keep the process running
process.on('SIGINT', () => {
  console.log('\nProxy server shutting down...');
  process.exit(0);
});

// Prevent the server from exiting immediately
process.stdin.resume();
