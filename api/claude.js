// Vercel Edge Function for Claude API proxy
// This runs on Vercel's servers, not in the browser
export const config = {
  runtime: 'edge'
};

// Discord webhook logging function
async function logToDiscord(requestBody, success, errorMessage = null) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  
  if (!webhookUrl) {
    return; // Skip logging if not configured
  }

  // Skip logging in dev if disabled
  if (process.env.VITE_LOG_TO_DISCORD_IN_DEV === 'false') {
    return;
  }

  try {
    const embed = {
      title: success ? '📡 Claude API Call' : '❌ Claude API Error',
      color: success ? 0x0099ff : 0xff0000,
      fields: [
        {
          name: '🔧 Model',
          value: requestBody.model || 'Unknown',
          inline: true
        },
        {
          name: '💬 Messages',
          value: `${requestBody.messages?.length || 0} messages`,
          inline: true
        },
        errorMessage ? {
          name: '💥 Error',
          value: `\`\`\`${errorMessage.substring(0, 500)}\`\`\``,
          inline: false
        } : null
      ].filter(Boolean),
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Claude API Proxy'
      }
    };

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [embed]
      })
    });
  } catch (err) {
    console.error('Discord webhook error:', err);
  }
}

export default async function handler(req) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { 
      status: 405,
      headers: { 'content-type': 'text/plain' }
    });
  }

  // Get API key from environment (set in Vercel dashboard)
  const apiKey = process.env.VITE_CLAUDE_API_KEY;
  if (!apiKey) {
    console.error('VITE_CLAUDE_API_KEY not configured in Vercel environment');
    return new Response(
      JSON.stringify({ 
        error: 'Server configuration error',
        message: 'API key not configured. Please set VITE_CLAUDE_API_KEY in Vercel dashboard.'
      }),
      { 
        status: 500, 
        headers: { 'content-type': 'application/json' }
      }
    );
  }

  let body;
  try {
    // Get request body
    body = await req.json();
    
    // Validate required fields
    if (!body.model || !body.messages) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: model and messages' }),
        { 
          status: 400,
          headers: { 'content-type': 'application/json' }
        }
      );
    }

    // Forward to Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    // Get response as text to preserve exact formatting
    const responseText = await response.text();
    
    // Log successful API call to Discord
    await logToDiscord(body, response.ok);
    
    // Return response with same status
    return new Response(responseText, {
      status: response.status,
      headers: { 
        'content-type': 'application/json',
        'cache-control': 'no-cache' // Don't cache AI responses
      }
    });
  } catch (error) {
    console.error('Proxy error:', error);
    
    // Log error to Discord
    await logToDiscord(body || {}, false, error.message);
    
    return new Response(
      JSON.stringify({ 
        error: 'Proxy error',
        message: error.message || 'An unexpected error occurred'
      }),
      { 
        status: 500,
        headers: { 'content-type': 'application/json' }
      }
    );
  }
}