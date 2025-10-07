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
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:5173',
    ],
    credentials: true,
  })
);

app.use(express.json());

// AI proxy disabled while query tools are offline
app.post('/api/claude', (_req, res) => {
  res.status(410).json({
    error: 'AI query service disabled',
  });
});

// Add translate-query endpoint for local development
app.post('/api/translate-query', (_req, res) => {
  res.status(410).json({
    error: 'AI query service disabled',
  });
});

// Blocklist filter generation endpoint
app.post('/api/generate-blocklist-filter', async (req, res) => {
  const apiKey = process.env.VITE_CLAUDE_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: 'Server configuration error',
      message: 'VITE_CLAUDE_API_KEY not set in .env file',
    });
  }

  try {
    const { prompt } = req.body;

    if (!prompt || prompt.length < 3) {
      return res.status(400).json({
        error: 'Prompt too short',
      });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const jsonText = data.content[0].text.trim();

    res.status(200).json({
      response: jsonText,
    });
  } catch (error) {
    console.error('Blocklist filter generation error:', error);

    res.status(500).json({
      error: 'Failed to generate blocklist filter',
    });
  }
});

// SQL Generation endpoint for AI queries
app.post('/api/generate-sql', async (req, res) => {
  res.status(410).json({
    error: 'AI query service disabled',
  });
  return;
  /*
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
      error: 'Too many requests. Please wait a minute.',
    });
  }

  try {
    const { query, previousQuery, previousSQL, temporalContext, structuredSpec, isHybridQuery } =
      req.body;

    // Log the type of request
    console.log(`🔍 SQL Generation Request: ${isHybridQuery ? 'Hybrid' : 'Legacy'}`);
    if (isHybridQuery && structuredSpec) {
      console.log('📋 Structured Spec:', JSON.stringify(structuredSpec, null, 2));
    }

    // Input validation
    if (!query || query.length < 3) {
      return res.status(400).json({
        error: 'Query too short',
      });
    }

    if (query.length > 500) {
      return res.status(400).json({
        error: 'Query too long. Please keep under 500 characters.',
      });
    }

    // Build prompt based on query type
    const isFollowUp = !!previousQuery;

    const prompt =
      isHybridQuery && structuredSpec
        ? buildStructuredPrompt(structuredSpec, temporalContext)
        : isFollowUp
          ? `
You are refining a previous SQL query based on user feedback.

CURRENT DATE CONTEXT:
- Today: ${temporalContext?.currentDate || 'N/A'} (${temporalContext?.dayName || 'N/A'})
- Current year: ${temporalContext?.currentYear || 'N/A'}
- Timezone: ${temporalContext?.timezone || 'N/A'}

Previous user query: "${previousQuery}"
Previous SQL generated: ${previousSQL}

User's refinement request: "${query}"

Generate an updated SQL query that incorporates the refinement.

IMPORTANT DATE RULES:
1. When user mentions a month without a year, use ${temporalContext?.currentYear || new Date().getFullYear()} if that month has already passed this year, otherwise use the previous year
2. Day of week queries use: strftime('%w', date) where 0=Sunday, 6=Saturday
3. CRITICAL: "last [day]" means the most recent occurrence of that specific day (use specific date)
4. "[day] flips" means all occurrences of that day of the week (use strftime)

RECENT DAY DATES:
${
  temporalContext?.recentDays
    ? Object.entries(temporalContext.recentDays)
        .map(([key, value]) => `- ${key}: ${value}`)
        .join('\\n')
    : ''
}

Examples of refinements:
- "exclude ammo" → Add: AND item NOT LIKE '%bolt%' AND item NOT LIKE '%arrow%'
- "only the profitable ones" → Add: AND profit > 0
- "sort by ROI instead" → Change: ORDER BY roi DESC
- "show more results" → Change: LIMIT 100
- "show all" → Remove LIMIT clause but keep all WHERE conditions and ORDER BY
- "show only top 10" → Add/Change: LIMIT 10
- "only weekends" → Add: AND strftime('%w', date) IN ('0','6')

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
You are a helpful SQL query generator for OSRS flipping data.

CURRENT DATE CONTEXT:
- Today: ${temporalContext?.currentDate || 'N/A'} (${temporalContext?.dayName || 'N/A'})
- Current year: ${temporalContext?.currentYear || new Date().getFullYear()}
- Timezone: ${temporalContext?.timezone || 'N/A'}

IMPORTANT DATE RULES:
1. When user mentions a month without a year (e.g., "May"), use ${temporalContext?.currentYear || new Date().getFullYear()} if that month has already passed this year, otherwise use the previous year
2. "This week" = last 7 days from today
3. "Last month" = previous calendar month, not last 30 days
4. CRITICAL: "last [day]" means the most recent occurrence of that specific day (use specific date)
5. "[day] flips" means all occurrences of that day of the week (use strftime)

RECENT DAY DATES:
${
  temporalContext?.recentDays
    ? Object.entries(temporalContext.recentDays)
        .map(([key, value]) => `- ${key}: ${value}`)
        .join('\\n')
    : ''
}

DAY OF WEEK QUERIES using SQLite:
- strftime('%w', date) returns: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday

EXAMPLES:
- "Tuesday flips" (all Tuesdays) → WHERE strftime('%w', date) = '2'
- "last Tuesday flips" (specific date) → WHERE date = '${temporalContext?.recentDays?.lastTuesday || 'YYYY-MM-DD'}'
- "weekend flips" → WHERE strftime('%w', date) IN ('0','6')
- "weekday flips" → WHERE strftime('%w', date) IN ('1','2','3','4','5')
- "last Monday" → WHERE date = '${temporalContext?.recentDays?.lastMonday || 'YYYY-MM-DD'}'
- "weekend vs weekday profit" → 
  SELECT 
    CASE 
      WHEN strftime('%w', date) IN ('0','6') THEN 'Weekend'
      ELSE 'Weekday'
    END as day_type,
    SUM(profit) as total_profit,
    COUNT(*) as flip_count,
    AVG(roi) as avg_roi
  FROM flips
  GROUP BY day_type
- "most profitable Mondays" →
  SELECT 
    date,
    SUM(profit) as daily_profit,
    COUNT(*) as flip_count
  FROM flips
  WHERE strftime('%w', date) = '1'
  GROUP BY date
  ORDER BY daily_profit DESC
  LIMIT 10

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
13. NEVER use UNION queries - use CTEs (WITH clauses) and window functions instead
14. For "each day of week" queries, use a single query with CASE statements and ROW_NUMBER() OVER (PARTITION BY...)
15. CRITICAL: Use precise column names that clearly indicate what the metric represents
16. MANDATORY: NEVER name AVG(profit) as "avg_daily_profit" - it is ALWAYS "avg_profit_per_flip"
17. IMPORTANT: "compare [time period] vs [time period]" means compare aggregate metrics for those periods, NOT individual items between periods
18. CRITICAL: In CASE statements with overlapping categories, put specific conditions BEFORE general ones
19. CRITICAL: NEVER use AVG(roi) for time period analysis - ALWAYS use (CAST(SUM(profit) AS REAL) / CAST(SUM(buy_price * quantity) AS REAL)) * 100
20. MANDATORY: When user asks for "ROI by [time period]", calculate true weighted ROI for each period, NOT average of individual flip ROIs
21. IMPORTANT: For simple ROI by time period queries, use single query with CASE statement, NOT complex multi-level CTEs

COLUMN NAMING RULES (STRICTLY ENFORCE):
- AVG(profit) → ALWAYS avg_profit_per_flip (NEVER avg_daily_profit, NEVER daily_profit)
- SUM(profit) → total_profit
- COUNT(*) → flip_count or total_flips
- AVG(roi) → avg_individual_flip_roi (use sparingly - usually wrong for period analysis)
- (SUM(profit) / SUM(buy_price * quantity)) * 100 → period_roi_percent or weighted_roi_percent
- For true daily averages from grouped data: AVG(daily_total) → avg_daily_profit
- RULE: If you use AVG(profit) directly, the column name MUST be avg_profit_per_flip
- RULE: Only use "daily_profit" in column names when you've actually grouped by date first
- RULE: For ROI by time period, NEVER use AVG(roi) - use weighted calculation

FUZZY ITEM MATCHING RULES:
13. Handle common typos and abbreviations with multiple LIKE patterns using OR
14. For partial item names, use broad LIKE patterns to catch variations
15. Handle plural/singular variations (e.g., "whip" matches "Abyssal whip")
16. Common OSRS abbreviations: "dscim" = "dragon scimitar", "bcp" = "bandos chestplate", "sgs" = "saradomin godsword"
17. When unsure about exact item name, use multiple LIKE patterns with OR conditions

Examples:
- "top 10 items" → SELECT item, buy_price, sell_price, profit, roi, quantity, account, date FROM flips ORDER BY profit DESC LIMIT 10
- "flips from last week" → SELECT item, buy_price, sell_price, profit, roi, quantity, account, date FROM flips WHERE date > date('now', '-7 days') ORDER BY profit DESC
- "dragon scimitar profits" → SELECT item, buy_price, sell_price, profit, roi, quantity, account, date FROM flips WHERE item LIKE '%dragon scimitar%' ORDER BY profit DESC
- "bandos items" → SELECT item, buy_price, sell_price, profit, roi, quantity, account, date FROM flips WHERE item LIKE '%bandos%' ORDER BY profit DESC

FUZZY MATCHING EXAMPLES:
- "dscim profits" → SELECT item, buy_price, sell_price, profit, roi, quantity, account, date FROM flips WHERE (item LIKE '%dragon scimitar%' OR item LIKE '%d scim%' OR item LIKE '%dscim%') ORDER BY profit DESC
- "whips" → SELECT item, buy_price, sell_price, profit, roi, quantity, account, date FROM flips WHERE (item LIKE '%whip%' OR item LIKE '%abyssal whip%') ORDER BY profit DESC
- "bcp flips" → SELECT item, buy_price, sell_price, profit, roi, quantity, account, date FROM flips WHERE (item LIKE '%bandos chestplate%' OR item LIKE '%bcp%') ORDER BY profit DESC
- "sgs profits" → SELECT item, buy_price, sell_price, profit, roi, quantity, account, date FROM flips WHERE (item LIKE '%saradomin godsword%' OR item LIKE '%sgs%') ORDER BY profit DESC
- "zgs items" → SELECT item, buy_price, sell_price, profit, roi, quantity, account, date FROM flips WHERE (item LIKE '%zamorak godsword%' OR item LIKE '%zgs%') ORDER BY profit DESC
- "rune scim" → SELECT item, buy_price, sell_price, profit, roi, quantity, account, date FROM flips WHERE (item LIKE '%rune scimitar%' OR item LIKE '%rune scim%') ORDER BY profit DESC
- "items I traded daily this week" → SELECT item, SUM(profit) as total_profit, AVG(roi) as avg_roi, COUNT(*) as total_flips, COUNT(DISTINCT date) as days_traded FROM flips WHERE date > date('now', '-7 days') GROUP BY item HAVING COUNT(DISTINCT date) = 7 ORDER BY SUM(profit) DESC
- "profit by item" → SELECT item, SUM(profit) as total_profit, COUNT(*) as flip_count, AVG(profit) as avg_profit_per_flip FROM flips GROUP BY item ORDER BY total_profit DESC
- "profit by account" → SELECT account, SUM(profit) as total_profit, AVG(roi) as avg_roi_percent, COUNT(*) as total_flips FROM flips GROUP BY account ORDER BY total_profit DESC
- "most traded items" → SELECT item, COUNT(*) as flip_count, SUM(profit) as total_profit FROM flips GROUP BY item ORDER BY flip_count DESC
- "expensive flips only" → SELECT item, buy_price, sell_price, profit, roi, quantity, account, date FROM flips WHERE profit > 100000 ORDER BY profit DESC
- "flips longer than 24 hours" → SELECT item, buy_price, sell_price, profit, roi, quantity, account, date, flip_duration_minutes FROM flips WHERE flip_duration_minutes > 1440 ORDER BY flip_duration_minutes DESC
- "most profitable day for each day of week" →
  WITH daily_totals AS (
    SELECT 
      date,
      strftime('%w', date) as dow,
      SUM(profit) as daily_profit
    FROM flips
    GROUP BY date
  ),
  ranked_days AS (
    SELECT 
      dow,
      date,
      daily_profit,
      ROW_NUMBER() OVER (PARTITION BY dow ORDER BY daily_profit DESC) as rn
    FROM daily_totals
  )
  SELECT 
    CASE dow
      WHEN '0' THEN 'Sunday'
      WHEN '1' THEN 'Monday'
      WHEN '2' THEN 'Tuesday'
      WHEN '3' THEN 'Wednesday'
      WHEN '4' THEN 'Thursday'
      WHEN '5' THEN 'Friday'
      WHEN '6' THEN 'Saturday'
    END as day_name,
    date as best_date,
    daily_profit as best_profit
  FROM ranked_days
  WHERE rn = 1
  ORDER BY dow
- "average profit per flip by day of week" →
  SELECT 
    CASE strftime('%w', date)
      WHEN '0' THEN 'Sunday'
      WHEN '1' THEN 'Monday'
      WHEN '2' THEN 'Tuesday'
      WHEN '3' THEN 'Wednesday'  
      WHEN '4' THEN 'Thursday'
      WHEN '5' THEN 'Friday'
      WHEN '6' THEN 'Saturday'
    END as day_name,
    AVG(profit) as avg_profit_per_flip
  FROM flips
  GROUP BY strftime('%w', date)
  ORDER BY avg_profit_per_flip DESC
- "compare last weekend vs this week" →
  SELECT 
    CASE 
      WHEN date IN ('${temporalContext?.recentDays?.lastSaturday || 'YYYY-MM-DD'}', '${temporalContext?.recentDays?.lastSunday || 'YYYY-MM-DD'}') THEN 'Last Weekend'
      WHEN date > date('now', '-7 days') THEN 'This Week'
      ELSE 'Other'
    END as time_period,
    SUM(profit) as total_profit,
    COUNT(*) as flip_count,
    AVG(profit) as avg_profit_per_flip,
    AVG(roi) as avg_roi_percent
  FROM flips
  WHERE date IN ('${temporalContext?.recentDays?.lastSaturday || 'YYYY-MM-DD'}', '${temporalContext?.recentDays?.lastSunday || 'YYYY-MM-DD'}') 
     OR date > date('now', '-7 days')
  GROUP BY time_period
  ORDER BY total_profit DESC
- "ROI by weekdays vs weekends vs Fridays" →
  SELECT
    CASE
      WHEN strftime('%w', date) = '5' THEN 'Friday'
      WHEN strftime('%w', date) IN ('0', '6') THEN 'Weekend'
      ELSE 'Other Weekdays'
    END AS time_period,
    (CAST(SUM(profit) AS REAL) / CAST(SUM(buy_price * quantity) AS REAL)) * 100 AS period_roi_percent,
    SUM(profit) as total_profit,
    SUM(buy_price * quantity) as total_invested,
    COUNT(*) as flip_count
  FROM flips
  GROUP BY time_period
  ORDER BY period_roi_percent DESC

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
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const sql = data.content[0].text.trim();

    // Log the generated SQL for debugging
    console.log('🔍 Generated SQL:', sql);

    // Validate SQL
    const validation = validateSQL(sql);
    if (!validation.safe) {
      console.log('❌ SQL Safety Check Failed:', validation.reason);
      return res.status(400).json({
        error: 'Generated SQL failed safety check',
        reason: validation.reason,
      });
    }

    res.status(200).json({
      sql,
      estimated_cost: 0.00025,
    });
  } catch (error) {
    console.error('SQL generation error:', error);

    res.status(500).json({
      error: 'Failed to generate SQL query',
    });
  }
  */
});

// Feedback endpoint
app.post('/api/feedback', async (req, res) => {
  const { user_query, generated_sql, feedback_text, results_count, sessionId, isOwner } = req.body;

  if (!feedback_text || !feedback_text.trim()) {
    return res.status(400).json({ success: false, message: 'Feedback text is required' });
  }

  if (!process.env.VITE_DISCORD_WEBHOOK_URL) {
    console.log('Discord webhook not configured');
    return res.status(500).json({ success: false, message: 'Webhook not configured' });
  }

  try {
    // Determine user type
    const userType = isOwner ? '👑 Owner' : `👤 ${sessionId || 'Unknown Session'}`;

    const embed = {
      title: '💬 AI Query Feedback',
      color: isOwner ? 0x00ff00 : 0xffa500, // Green for owner, orange for users
      fields: [
        {
          name: '👤 Session',
          value: userType,
          inline: true,
        },
        {
          name: '📝 Original Query',
          value: `\`\`\`${user_query ? user_query.substring(0, 500) : 'N/A'}\`\`\``,
          inline: false,
        },
        {
          name: '🔍 Generated SQL',
          value: `\`\`\`sql\n${generated_sql ? generated_sql.substring(0, 500) : 'N/A'}\n\`\`\``,
          inline: false,
        },
        {
          name: '💭 User Feedback',
          value: `\`\`\`${feedback_text.substring(0, 1000)}${feedback_text.length > 1000 ? '...' : ''}\`\`\``,
          inline: false,
        },
        {
          name: '📊 Results Count',
          value: results_count?.toString() || '0',
          inline: true,
        },
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: isOwner
          ? 'OSRS AI Feedback - Owner'
          : `OSRS AI Feedback - ${sessionId || 'Anonymous'}`,
      },
    };

    const response = await fetch(process.env.VITE_DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [embed],
      }),
    });

    if (!response.ok) {
      throw new Error(`Discord webhook failed: ${response.status}`);
    }

    console.log('Feedback sent to Discord successfully');
    res.json({ success: true });
  } catch (error) {
    console.error('Feedback submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit feedback',
      error: error.message,
    });
  }
});

app
  .listen(PORT, () => {
    console.log(`🚀 Proxy server running on http://localhost:${PORT}`);
    console.log(`🤖 Claude API endpoint: http://localhost:${PORT}/api/claude`);
    console.log(`🔤 Query translation endpoint: http://localhost:${PORT}/api/translate-query`);
    console.log(`📊 SQL generation endpoint: http://localhost:${PORT}/api/generate-sql`);
    console.log(
      `🔧 Blocklist filter endpoint: http://localhost:${PORT}/api/generate-blocklist-filter`
    );
    console.log(`💬 Feedback endpoint: http://localhost:${PORT}/api/feedback`);
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
