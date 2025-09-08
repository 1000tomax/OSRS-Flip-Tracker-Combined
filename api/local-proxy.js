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

// AI Insights endpoint (removed for now)

app
  .listen(PORT, () => {
    console.log(`Proxy server running on http://localhost:${PORT}`);
    console.log(`Claude API endpoint: http://localhost:${PORT}/api/claude`);
    console.log(`Query translation endpoint: http://localhost:${PORT}/api/translate-query`);
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
