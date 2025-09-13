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
  isOwner = false,
  temporalContext = null
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

    // Add temporal context field if available
    if (temporalContext) {
      embed.fields.push({
        name: '📅 Temporal Context',
        value: `Date: ${temporalContext.currentDate}\nTimezone: ${temporalContext.timezone}`,
        inline: true,
      });
    }

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

function validateSQL(sql) {
  const forbidden = [
    'DROP',
    'DELETE',
    'INSERT',
    'UPDATE',
    'ALTER',
    'CREATE',
    'TRUNCATE',
    'EXEC',
    'EXECUTE',
  ];

  const upperSQL = sql.toUpperCase();
  for (const keyword of forbidden) {
    if (upperSQL.includes(keyword)) {
      return { safe: false, reason: `Forbidden keyword: ${keyword}` };
    }
  }

  const trimmedSQL = upperSQL.trim();
  if (!trimmedSQL.startsWith('SELECT') && !trimmedSQL.startsWith('WITH')) {
    return { safe: false, reason: 'Only SELECT and CTE (WITH) queries allowed' };
  }

  return { safe: true };
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

  // Rate limiting
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  if (!checkRateLimit(ip)) {
    return new Response(
      JSON.stringify({
        error: 'Too many requests. Please wait a minute.',
      }),
      {
        status: 429,
        headers: { 'content-type': 'application/json' },
      }
    );
  }

  let query,
    previousQuery,
    previousSQL,
    sessionId,
    isOwner,
    temporalContext,
    structuredSpec,
    isHybridQuery;
  try {
    ({
      query,
      previousQuery,
      previousSQL,
      sessionId,
      isOwner,
      temporalContext,
      structuredSpec,
      isHybridQuery,
    } = await req.json());

    // Support both original API and new hybrid approach
    if (!query && !structuredSpec) {
      return new Response(JSON.stringify({ error: 'Query or structured spec is required' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    // Input validation for text queries
    if (query && !structuredSpec) {
      if (query.length < 3) {
        return new Response(
          JSON.stringify({
            error: 'Query too short',
          }),
          {
            status: 400,
            headers: { 'content-type': 'application/json' },
          }
        );
      }

      if (query.length > 500) {
        return new Response(
          JSON.stringify({
            error: 'Query too long. Please keep under 500 characters.',
          }),
          {
            status: 400,
            headers: { 'content-type': 'application/json' },
          }
        );
      }
    }

    const isFollowUp = !!previousQuery;

    // Choose prompt type based on request
    console.log('Request type check:', {
      isHybridQuery,
      hasStructuredSpec: !!structuredSpec,
      isFollowUp,
    });

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
19. CRITICAL: NEVER use AVG(roi) for time period analysis - ALWAYS use (SUM(profit) / SUM(buy_price * quantity)) * 100
20. MANDATORY: When user asks for "ROI by [time period]", calculate true weighted ROI for each period, NOT average of individual flip ROIs
21. IMPORTANT: For simple ROI by time period queries, use single query with CASE statement, NOT complex multi-level CTEs

COLUMN NAMING RULES (STRICTLY ENFORCE):
- AVG(profit) → ALWAYS avg_profit_per_flip (NEVER avg_daily_profit, NEVER daily_profit)
- SUM(profit) → total_profit
- COUNT(*) → flip_count or total_flips
- AVG(roi) → avg_roi_percent
- For true daily averages from grouped data: AVG(daily_total) → avg_daily_profit
- RULE: If you use AVG(profit) directly, the column name MUST be avg_profit_per_flip
- RULE: Only use "daily_profit" in column names when you've actually grouped by date first

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
- "profit by item" → SELECT item, SUM(profit) as total_profit, COUNT(*) as flip_count FROM flips GROUP BY item ORDER BY total_profit DESC
- "profit by account" → SELECT account, SUM(profit) as total_profit, AVG(roi) as avg_roi FROM flips GROUP BY account ORDER BY total_profit DESC
- "most traded items" → SELECT item, COUNT(*) as flip_count, SUM(profit) as total_profit FROM flips GROUP BY item ORDER BY flip_count DESC
- "expensive flips only" → SELECT item, buy_price, sell_price, profit, roi, quantity, account, date FROM flips WHERE profit > 100000 ORDER BY profit DESC
- "flips longer than 24 hours" → SELECT item, buy_price, sell_price, profit, roi, quantity, account, date, flip_duration_minutes FROM flips WHERE flip_duration_minutes > 1440 ORDER BY flip_duration_minutes DESC

Generate SQL for the user request:`;

    // Function to build structured prompt for hybrid queries (90% token reduction)
    function buildStructuredPrompt(spec, temporalContext) {
      console.log('Building structured prompt for spec:', JSON.stringify(spec, null, 2));

      return `You are generating SQL for a structured query specification.

CURRENT DATE CONTEXT:
- Today: ${temporalContext?.currentDate || 'N/A'} (${temporalContext?.dayName || 'N/A'})
- Current year: ${temporalContext?.currentYear || new Date().getFullYear()}
- Timezone: ${temporalContext?.timezone || 'N/A'}

STRUCTURED QUERY SPECIFICATION:
- Intent: ${spec.intent}
- Metrics: ${JSON.stringify(spec.metrics)}
- Dimensions: ${JSON.stringify(spec.dimensions || [])}
- Filters: ${JSON.stringify(spec.filters || [])}
- Time Range: ${JSON.stringify(spec.timeRange || {})}
- Sort: ${JSON.stringify(spec.sort || [])}
${spec.limit ? `LIMIT: ${spec.limit} (MANDATORY: Include "LIMIT ${spec.limit}" at the end)` : ''}
- Include Columns: ${JSON.stringify(spec.includeColumns || [])}

${
  temporalContext
    ? `
RECENT DAY DATES:
${Object.entries(temporalContext.recentDays || {})
  .map(([key, value]) => `- ${key}: ${value}`)
  .join('\n')}
`
    : ''
}

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

IMPORTANT RULES:
1. Return ONLY the SQL query, no explanations
2. ALWAYS respect the LIMIT specification if provided
3. Use proper column names as specified
4. When metric is "*" with operation "count", use COUNT(*) in SQL
6. When Dimensions are specified (GROUP BY), only include:
   - The dimension columns (e.g., item)
   - Aggregated metrics (e.g., SUM(profit), AVG(roi), COUNT(*))
   - DO NOT include individual transaction columns like buy_price, sell_price, quantity, date in SELECT when grouping
7. Apply all filters as specified in WHERE clause
6. Use appropriate aggregation for metrics as specified
7. Never select the 'id' field
8. For item analysis with dimensions=["item"], the SELECT should be:
   - item (the grouping column)
   - Aggregated metrics only (SUM(profit), AVG(roi), COUNT(*))

Generate the SQL query based on this specification:`;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: isHybridQuery ? 300 : 500, // Smaller token limit for structured queries
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

    // Log the generated SQL for debugging
    console.log('🔍 Generated SQL:', sql);

    // Validate SQL
    const validation = validateSQL(sql);
    if (!validation.safe) {
      console.log('❌ SQL Safety Check Failed:', validation.reason);
      return new Response(
        JSON.stringify({
          error: 'Generated SQL failed safety check',
          reason: validation.reason,
        }),
        {
          status: 400,
          headers: { 'content-type': 'application/json' },
        }
      );
    }

    // Log successful generation to Discord
    const queryForLogging =
      query || (structuredSpec ? `Hybrid Query: ${structuredSpec.intent}` : 'Unknown');
    await logToDiscord(queryForLogging, sql, true, null, sessionId, isOwner, temporalContext);

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
    await logToDiscord(
      query || 'Unknown query',
      '',
      false,
      error.message,
      sessionId,
      isOwner,
      temporalContext
    );

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
