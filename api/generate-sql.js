// Vercel Edge Function for SQL generation
export const config = {
  runtime: 'edge',
};

// Discord webhook logging function
async function logToDiscord(
  userQuery,
  sql,
  success,
  errorMessage = null,
  sessionId = null,
  isOwner = false
) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    console.log('Discord webhook not configured');
    return;
  }

  // Skip logging in dev if disabled
  if (process.env.VITE_LOG_TO_DISCORD_IN_DEV === 'false') {
    console.log('📵 Discord logging disabled (VITE_LOG_TO_DISCORD_IN_DEV=false)');
    return;
  }

  try {
    // Determine user type and session info
    const userType = isOwner ? '👑 Owner' : `👤 ${sessionId || 'Unknown Session'}`;

    const embed = {
      title: success ? '✅ SQL Query Generated' : '❌ SQL Generation Failed',
      color: success ? (isOwner ? 0x00ff00 : 0x00aaff) : 0xff0000, // Different color for owner vs users
      fields: [
        {
          name: '👤 Session',
          value: userType,
          inline: true,
        },
        {
          name: '📝 User Query',
          value: `\`\`\`${userQuery.substring(0, 1000)}${userQuery.length > 1000 ? '...' : ''}\`\`\``,
          inline: false,
        },
        success
          ? {
              name: '🔍 Generated SQL',
              value: `\`\`\`sql\n${sql.substring(0, 1000)}${sql.length > 1000 ? '...' : ''}\n\`\`\``,
              inline: false,
            }
          : null,
        errorMessage
          ? {
              name: '💥 Error',
              value: `\`\`\`${errorMessage}\`\`\``,
              inline: false,
            }
          : null,
      ].filter(Boolean),
      timestamp: new Date().toISOString(),
      footer: {
        text: isOwner
          ? 'OSRS AI Query System - Owner'
          : `OSRS AI Query System - ${sessionId || 'Anonymous'}`,
      },
    };

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [embed],
      }),
    });

    console.log('Logged to Discord successfully');
  } catch (err) {
    console.error('Discord webhook error:', err);
  }
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: { 'content-type': 'text/plain' },
    });
  }

  const apiKey = process.env.VITE_CLAUDE_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: 'Server configuration error',
        message: 'VITE_CLAUDE_API_KEY not configured in Vercel environment',
      }),
      {
        status: 500,
        headers: { 'content-type': 'application/json' },
      }
    );
  }

  let query, previousQuery, previousSQL, sessionId, isOwner;
  try {
    ({ query, previousQuery, previousSQL, sessionId, isOwner } = await req.json());

    if (!query) {
      return new Response(JSON.stringify({ error: 'Query is required' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    const isFollowUp = !!previousQuery;

    const prompt = isFollowUp
      ? `
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
`
      : `
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
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API error: ${error}`);
    }

    const data = await response.json();
    const sql = data.content[0].text.trim();

    // Log successful generation to Discord
    await logToDiscord(query, sql, true, null, sessionId, isOwner);

    return new Response(JSON.stringify({ sql }), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'cache-control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('SQL generation error:', error);

    // Log error to Discord
    await logToDiscord(query || 'Unknown query', '', false, error.message, sessionId, isOwner);

    return new Response(
      JSON.stringify({
        error: 'Failed to generate SQL',
        message: error.message,
      }),
      {
        status: 500,
        headers: { 'content-type': 'application/json' },
      }
    );
  }
}
