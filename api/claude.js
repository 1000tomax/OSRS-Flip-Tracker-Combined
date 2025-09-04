// Vercel Edge Function for Claude API proxy
// This runs on Vercel's servers, not in the browser
export const config = {
  runtime: 'edge'
};

export default async function handler(req) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { 
      status: 405,
      headers: { 'content-type': 'text/plain' }
    });
  }

  // Get API key from environment (set in Vercel dashboard)
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY not configured in Vercel environment');
    return new Response(
      JSON.stringify({ 
        error: 'Server configuration error',
        message: 'API key not configured. Please set ANTHROPIC_API_KEY in Vercel dashboard.'
      }),
      { 
        status: 500, 
        headers: { 'content-type': 'application/json' }
      }
    );
  }

  try {
    // Get request body
    const body = await req.json();
    
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