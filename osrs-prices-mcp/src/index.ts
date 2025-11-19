/**
 * OSRS Prices MCP Server - Cloudflare Worker
 * Provides real-time OSRS price data via MCP protocol
 */

const OSRS_API_BASE = 'https://prices.runescape.wiki/api/v1/osrs';
const USER_AGENT = 'OSRS Investment Tracker MCP - discord: Mreedon';

interface Env {
  MCP_AUTH_TOKEN: string;
  SUPABASE_URL: string;
  SUPABASE_KEY: string;
}

interface LatestPrice {
  high: number;
  low: number;
  highTime: number;
  lowTime: number;
}

interface ItemMapping {
  id: number;
  name: string;
  examine: string;
  members: boolean;
  lowalch: number;
  highalch: number;
  limit: number;
  value: number;
  icon: string;
}

interface PriceDataPoint {
  timestamp: number;
  avgHighPrice: number | null;
  avgLowPrice: number | null;
  highPriceVolume: number;
  lowPriceVolume: number;
}

interface Holding {
  id: number;
  item_name: string;
  item_id: string;
  quantity: number;
  buy_price_gp: number;
  purchase_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface HoldingPerformance extends Holding {
  current_price: number;
  current_value: number;
  profit_gp: number;
  profit_percentage: number;
}

/**
 * Create Supabase client for database operations
 */
function createSupabaseClient(env: Env) {
  return {
    from(table: string) {
      return {
        select: async (columns = '*') => {
          const response = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}?select=${columns}`, {
            headers: {
              apikey: env.SUPABASE_KEY,
              Authorization: `Bearer ${env.SUPABASE_KEY}`,
            },
          });

          if (!response.ok) {
            throw new Error(`Supabase select failed: ${response.status} ${response.statusText}`);
          }

          return response.json();
        },

        insert: async (data: unknown) => {
          const response = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: env.SUPABASE_KEY,
              Authorization: `Bearer ${env.SUPABASE_KEY}`,
              Prefer: 'return=representation',
            },
            body: JSON.stringify(data),
          });

          if (!response.ok) {
            const error = await response.text();
            throw new Error(`Supabase insert failed: ${response.status} ${error}`);
          }

          return response.json();
        },

        delete: async (filter: Record<string, unknown>) => {
          const filterStr = Object.entries(filter)
            .map(([key, value]) => `${key}=eq.${value}`)
            .join('&');

          const response = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}?${filterStr}`, {
            method: 'DELETE',
            headers: {
              apikey: env.SUPABASE_KEY,
              Authorization: `Bearer ${env.SUPABASE_KEY}`,
              Prefer: 'return=representation',
            },
          });

          if (!response.ok) {
            const error = await response.text();
            throw new Error(`Supabase delete failed: ${response.status} ${error}`);
          }

          return response.json();
        },
      };
    },
  };
}

async function fetchOSRSAPI<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${OSRS_API_BASE}${endpoint}`, {
    headers: {
      'User-Agent': USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error(`OSRS API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

async function getLatestPrices(itemIds?: string[]): Promise<Record<string, LatestPrice>> {
  if (itemIds && itemIds.length === 1) {
    const data = await fetchOSRSAPI<{ data: Record<string, LatestPrice> }>(
      `/latest?id=${itemIds[0]}`
    );
    return data.data;
  }

  const data = await fetchOSRSAPI<{ data: Record<string, LatestPrice> }>('/latest');

  if (itemIds && itemIds.length > 0) {
    const filtered: Record<string, LatestPrice> = {};
    for (const id of itemIds) {
      if (data.data[id]) {
        filtered[id] = data.data[id];
      }
    }
    return filtered;
  }

  return data.data;
}

async function getItemMapping(searchName?: string): Promise<ItemMapping[]> {
  const items = await fetchOSRSAPI<ItemMapping[]>('/mapping');

  if (searchName) {
    const searchLower = searchName.toLowerCase();
    return items.filter(item => item.name.toLowerCase().includes(searchLower));
  }

  return items;
}

async function getPriceTimeseries(
  itemId: string,
  timestep: '5m' | '1h' | '6h' | '24h'
): Promise<PriceDataPoint[]> {
  const data = await fetchOSRSAPI<{ data: PriceDataPoint[] }>(
    `/timeseries?id=${itemId}&timestep=${timestep}`
  );
  return data.data;
}

/**
 * Handle MCP tool list request
 */
function handleToolsList() {
  return {
    tools: [
      {
        name: 'get_latest_prices',
        description:
          'Get current buy/sell prices for OSRS items from the Grand Exchange. Provides high/low prices and last update timestamps.',
        inputSchema: {
          type: 'object',
          properties: {
            item_ids: {
              type: 'array',
              items: { type: 'string' },
              description:
                'Array of OSRS item IDs (e.g., ["20724", "27277", "24777"]). Omit to get all items.',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_item_mapping',
        description:
          'Look up OSRS item IDs by name or get all item metadata. Returns item details including ID, name, examine text, member status, and alch values.',
        inputSchema: {
          type: 'object',
          properties: {
            search_name: {
              type: 'string',
              description:
                'Optional search term to filter items by name (case-insensitive partial match)',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_price_timeseries',
        description:
          'Get historical price data for a specific OSRS item over different time intervals. Returns arrays of price points with timestamps, volumes, and average high/low prices.',
        inputSchema: {
          type: 'object',
          properties: {
            item_id: {
              type: 'string',
              description: 'The OSRS item ID (e.g., "20724" for Imbued heart)',
            },
            timestep: {
              type: 'string',
              enum: ['5m', '1h', '6h', '24h'],
              description: 'Time interval between data points',
            },
          },
          required: ['item_id', 'timestep'],
        },
      },
      {
        name: 'add_holding',
        description:
          'Add a new OSRS item holding to track. Records the item you bought, quantity, and purchase price for later performance tracking.',
        inputSchema: {
          type: 'object',
          properties: {
            item_name: {
              type: 'string',
              description: 'Name of the OSRS item (e.g., "Imbued heart")',
            },
            item_id: {
              type: 'string',
              description: 'OSRS item ID (e.g., "20724")',
            },
            quantity: {
              type: 'integer',
              description: 'Number of items purchased',
            },
            buy_price_gp: {
              type: 'integer',
              description: 'Purchase price per item in GP',
            },
            purchase_date: {
              type: 'string',
              description: 'Purchase date in YYYY-MM-DD format',
            },
            notes: {
              type: 'string',
              description: 'Optional notes about this holding',
            },
          },
          required: ['item_name', 'item_id', 'quantity', 'buy_price_gp', 'purchase_date'],
        },
      },
      {
        name: 'get_holdings',
        description:
          "Get all OSRS items you're currently holding. Shows quantities, buy prices, and purchase dates.",
        inputSchema: {
          type: 'object',
          properties: {
            item_id: {
              type: 'string',
              description: 'Optional item ID to filter holdings for a specific item',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_holding_performance',
        description:
          'Analyze performance of your OSRS holdings. Compares buy prices to current market prices and calculates profit/loss.',
        inputSchema: {
          type: 'object',
          properties: {
            item_id: {
              type: 'string',
              description: 'Optional item ID to filter performance for a specific item',
            },
          },
          required: [],
        },
      },
      {
        name: 'remove_holding',
        description: 'Remove an OSRS holding from tracking (when sold or no longer tracking).',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'The holding ID from get_holdings',
            },
          },
          required: ['id'],
        },
      },
    ],
  };
}

/**
 * Handle get_latest_prices tool call
 */
async function handleGetLatestPrices(args: unknown) {
  try {
    const parsedArgs = args as { item_ids?: string[] } | undefined;
    const itemIds = parsedArgs?.item_ids;
    const prices = await getLatestPrices(itemIds);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(prices, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              error: 'Failed to get prices',
              message: error instanceof Error ? error.message : String(error),
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handle get_item_mapping tool call
 */
async function handleGetItemMapping(args: unknown) {
  try {
    const parsedArgs = args as { search_name?: string } | undefined;
    const searchName = parsedArgs?.search_name;
    const items = await getItemMapping(searchName);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(items, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              error: 'Failed to get item mapping',
              message: error instanceof Error ? error.message : String(error),
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handle get_price_timeseries tool call
 */
async function handleGetPriceTimeseries(args: unknown) {
  try {
    const parsedArgs = args as { item_id?: string; timestep?: string } | undefined;
    const itemId = parsedArgs?.item_id as string;
    const timestep = parsedArgs?.timestep as '5m' | '1h' | '6h' | '24h';

    if (!itemId || !timestep) {
      throw new Error('item_id and timestep are required');
    }

    const timeseries = await getPriceTimeseries(itemId, timestep);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(timeseries, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              error: 'Failed to get price timeseries',
              message: error instanceof Error ? error.message : String(error),
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handle add_holding tool call
 */
async function handleAddHolding(args: unknown, env: Env) {
  try {
    const parsedArgs = args as {
      item_name?: string;
      item_id?: string;
      quantity?: number;
      buy_price_gp?: number;
      purchase_date?: string;
      notes?: string;
    };

    const { item_name, item_id, quantity, buy_price_gp, purchase_date, notes } = parsedArgs;

    if (!item_name || !item_id || !quantity || !buy_price_gp || !purchase_date) {
      throw new Error('item_name, item_id, quantity, buy_price_gp, and purchase_date are required');
    }

    const supabase = createSupabaseClient(env);
    const holding = await supabase.from('osrs_holdings').insert({
      item_name,
      item_id,
      quantity,
      buy_price_gp,
      purchase_date,
      notes: notes || null,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              message: 'Holding added successfully',
              holding,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              error: 'Failed to add holding',
              message: error instanceof Error ? error.message : String(error),
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handle get_holdings tool call
 */
async function handleGetHoldings(args: unknown, env: Env) {
  try {
    const parsedArgs = args as { item_id?: string } | undefined;
    const itemId = parsedArgs?.item_id;

    const supabase = createSupabaseClient(env);

    if (itemId) {
      // Filter by item_id
      const response = await fetch(
        `${env.SUPABASE_URL}/rest/v1/osrs_holdings?item_id=eq.${itemId}&order=purchase_date.desc`,
        {
          headers: {
            apikey: env.SUPABASE_KEY,
            Authorization: `Bearer ${env.SUPABASE_KEY}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch holdings: ${response.status}`);
      }

      const holdings = await response.json();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(holdings, null, 2),
          },
        ],
      };
    } else {
      // Get all holdings
      const holdings = await supabase.from('osrs_holdings').select('*');

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(holdings, null, 2),
          },
        ],
      };
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              error: 'Failed to get holdings',
              message: error instanceof Error ? error.message : String(error),
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handle get_holding_performance tool call
 */
async function handleGetHoldingPerformance(args: unknown, env: Env) {
  try {
    const parsedArgs = args as { item_id?: string } | undefined;
    const itemId = parsedArgs?.item_id;

    // Get holdings
    const supabase = createSupabaseClient(env);
    let holdings: Holding[];

    if (itemId) {
      const response = await fetch(
        `${env.SUPABASE_URL}/rest/v1/osrs_holdings?item_id=eq.${itemId}`,
        {
          headers: {
            apikey: env.SUPABASE_KEY,
            Authorization: `Bearer ${env.SUPABASE_KEY}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch holdings: ${response.status}`);
      }

      holdings = (await response.json()) as Holding[];
    } else {
      holdings = (await supabase.from('osrs_holdings').select('*')) as Holding[];
    }

    if (holdings.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ message: 'No holdings found' }, null, 2),
          },
        ],
      };
    }

    // Get unique item IDs
    const uniqueItemIds = [...new Set(holdings.map(h => h.item_id))];

    // Fetch current prices
    const currentPrices = await getLatestPrices(uniqueItemIds);

    // Calculate performance for each holding (using high price = instant sell price)
    const performance: HoldingPerformance[] = holdings.map(holding => {
      const price = currentPrices[holding.item_id];

      if (!price) {
        // No price data available
        return {
          ...holding,
          current_price: 0,
          current_value: 0,
          profit_gp: 0,
          profit_percentage: 0,
        };
      }

      const currentValue = holding.quantity * price.high;
      const investmentCost = holding.quantity * holding.buy_price_gp;
      const profitGp = currentValue - investmentCost;
      const profitPercentage = (profitGp / investmentCost) * 100;

      return {
        ...holding,
        current_price: price.high,
        current_value: currentValue,
        profit_gp: profitGp,
        profit_percentage: profitPercentage,
      };
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(performance, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              error: 'Failed to get holding performance',
              message: error instanceof Error ? error.message : String(error),
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handle remove_holding tool call
 */
async function handleRemoveHolding(args: unknown, env: Env) {
  try {
    const parsedArgs = args as { id?: number } | undefined;
    const holdingId = parsedArgs?.id;

    if (!holdingId) {
      throw new Error('id is required');
    }

    const supabase = createSupabaseClient(env);
    const deleted = await supabase.from('osrs_holdings').delete({ id: holdingId });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              message: `Holding ${holdingId} removed successfully`,
              deleted,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              error: 'Failed to remove holding',
              message: error instanceof Error ? error.message : String(error),
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
}

// ============================================================================
// CLOUDFLARE WORKER HANDLER
// ============================================================================

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Verify auth token (supports both header and URL parameter)
    const url = new URL(request.url);
    const urlToken = url.searchParams.get('auth_token');
    const authHeader = request.headers.get('Authorization');

    const isValidHeader = authHeader === `Bearer ${env.MCP_AUTH_TOKEN}`;
    const isValidUrlParam = urlToken === env.MCP_AUTH_TOKEN;

    if (!isValidHeader && !isValidUrlParam) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle GET requests (for health checks / connection tests)
    if (request.method === 'GET') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          message: 'OSRS Prices MCP Server',
          version: '1.0.0',
          tools: [
            'get_latest_prices',
            'get_item_mapping',
            'get_price_timeseries',
            'add_holding',
            'get_holdings',
            'get_holding_performance',
            'remove_holding',
          ],
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Only allow POST requests for MCP protocol
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    try {
      const body = (await request.json()) as {
        jsonrpc?: string;
        method?: string;
        params?: unknown;
        id?: number | string;
      };
      const { jsonrpc, method, params, id } = body;

      // Log incoming method for debugging
      console.log(`MCP Request: method=${method}, id=${id}`);

      // Validate JSON-RPC format
      if (jsonrpc !== '2.0') {
        console.error('Invalid JSON-RPC version:', jsonrpc);
        return new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            error: { code: -32600, message: 'Invalid Request' },
            id: id || null,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      let result;

      // Handle MCP methods
      if (method === 'initialize') {
        // MCP initialization handshake
        result = {
          protocolVersion: '2024-11-05',
          serverInfo: {
            name: 'osrs-prices-mcp',
            version: '1.0.0',
          },
          capabilities: {
            tools: {},
          },
        };
      } else if (method === 'notifications/initialized') {
        // Client notification after initialization - no response needed
        console.log('Client initialized notification received');
        return new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            result: {},
            id,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      } else if (method === 'tools/list') {
        result = handleToolsList();
      } else if (method === 'tools/call') {
        const toolParams = params as { name?: string; arguments?: unknown };
        const { name, arguments: args } = toolParams;

        if (name === 'get_latest_prices') {
          result = await handleGetLatestPrices(args);
        } else if (name === 'get_item_mapping') {
          result = await handleGetItemMapping(args);
        } else if (name === 'get_price_timeseries') {
          result = await handleGetPriceTimeseries(args);
        } else if (name === 'add_holding') {
          result = await handleAddHolding(args, env);
        } else if (name === 'get_holdings') {
          result = await handleGetHoldings(args, env);
        } else if (name === 'get_holding_performance') {
          result = await handleGetHoldingPerformance(args, env);
        } else if (name === 'remove_holding') {
          result = await handleRemoveHolding(args, env);
        } else {
          result = {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: `Unknown tool: ${name}` }),
              },
            ],
            isError: true,
          };
        }
      } else {
        return new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            error: { code: -32601, message: 'Method not found' },
            id,
          }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Return successful response
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          result,
          id,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      // Log full error server-side for debugging
      console.error('MCP Server Error:', error);

      // Return sanitized error to client (no stack traces or sensitive details)
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error',
          },
          id: null,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  },
};
