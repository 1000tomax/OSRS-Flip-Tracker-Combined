/**
 * OSRS Prices MCP Server - Cloudflare Worker
 * Provides real-time OSRS price data via MCP protocol
 */

const OSRS_API_BASE = 'https://prices.runescape.wiki/api/v1/osrs';
const USER_AGENT = 'OSRS Investment Tracker MCP - Claude AI Assistant';

interface Env {
  MCP_AUTH_TOKEN: string;
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
          tools: ['get_latest_prices', 'get_item_mapping', 'get_price_timeseries'],
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
      console.error('MCP Server Error:', error);
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal error',
            data: error instanceof Error ? error.message : String(error),
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
