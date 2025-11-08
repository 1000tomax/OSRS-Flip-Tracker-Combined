# OSRS Prices MCP Server

MCP server for real-time OSRS price data from the OSRS Wiki API, deployed to
Cloudflare Workers.

## Deployment URL

**Live Server**: https://osrs-prices-mcp.tcoudal.workers.dev

## Features

- **get_latest_prices**: Get current buy/sell prices for items
- **get_item_mapping**: Look up item IDs by name
- **get_price_timeseries**: Get historical price data

## Setup

### 1. Configure Authentication

Copy the example configuration:

```bash
cp wrangler.toml.example wrangler.toml
```

Generate a secure auth token:

```bash
openssl rand -base64 32
```

Edit `wrangler.toml` and replace `your-secure-token-here` with your generated
token.

### 2. Deploy to Cloudflare

```bash
wrangler deploy
```

## Authentication

Your MCP server uses token-based authentication. The token is configured in
`wrangler.toml` (not committed to git).

## Claude Desktop Configuration

Add this to your Claude Desktop MCP settings (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "osrs-prices": {
      "command": "node",
      "args": [
        "-e",
        "fetch('https://osrs-prices-mcp.tcoudal.workers.dev', {method: 'POST', headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer YOUR_AUTH_TOKEN_HERE'}, body: JSON.stringify(params)}).then(r => r.json())"
      ],
      "env": {}
    }
  }
}
```

Replace `YOUR_AUTH_TOKEN_HERE` with your actual auth token from `wrangler.toml`.

## Claude.ai Web/Mobile Configuration

For Claude.ai web or mobile, the server is accessible via:

```
https://osrs-prices-mcp.tcoudal.workers.dev
```

The server supports two authentication methods:

1. **Bearer Token Header** (recommended):

   ```
   Authorization: Bearer YOUR_AUTH_TOKEN_HERE
   ```

2. **URL Parameter** (requires URL encoding):
   ```
   ?auth_token=YOUR_URL_ENCODED_TOKEN_HERE
   ```

The server supports:

- **Root endpoint** (`/`): Server info and health check
- **MCP protocol**: JSON-RPC 2.0 via POST requests
- CORS enabled for browser access

## Development

### Install dependencies:

```bash
npm install
```

### Deploy to Cloudflare:

```bash
wrangler deploy
```

### Test locally:

```bash
wrangler dev
```

## Testing the Deployed Server

Create a local test script (copy the example and add your token):

```bash
cp test-deployment.sh.example test-deployment.sh
# Edit test-deployment.sh and add your auth token
bash test-deployment.sh
```

Or test manually:

```bash
# Get server info
curl -H "Authorization: Bearer YOUR_AUTH_TOKEN_HERE" \
  https://osrs-prices-mcp.tcoudal.workers.dev

# Get latest prices
curl -X POST https://osrs-prices-mcp.tcoudal.workers.dev \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN_HERE" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "get_latest_prices",
      "arguments": {
        "item_ids": ["20724", "27277", "24777"]
      }
    }
  }'
```

## Your Tracked Items

- Imbued heart: 20724
- Tumeken's shadow (uncharged): 27277
- Blood shard: 24777

## Example Queries

Once connected to Claude:

- "Get the latest prices for my OSRS investments (items 20724, 27277, 24777)"
- "Search for items named 'dragon'"
- "Get the 1-hour price history for Imbued heart (20724)"
- "What's the current price of Tumeken's shadow?"

## API Reference

### get_latest_prices

```typescript
{
  item_ids?: string[] // Optional array of item IDs
}
```

Returns: Map of item_id -> {high, low, highTime, lowTime}

### get_item_mapping

```typescript
{
  search_name?: string // Optional search term
}
```

Returns: Array of {id, name, examine, members, lowalch, highalch, limit, value,
icon}

### get_price_timeseries

```typescript
{
  item_id: string;
  timestep: '5m' | '1h' | '6h' | '24h';
}
```

Returns: Array of price points with timestamps and volumes
