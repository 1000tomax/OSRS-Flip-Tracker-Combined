// Middleware to handle SPA routing for Cloudflare Pages
export async function onRequest(context) {
  const { request, next, env } = context;
  const url = new URL(request.url);

  // Let API routes pass through to their handlers
  if (url.pathname.startsWith('/api/')) {
    return next();
  }

  // Let asset files pass through
  const assetExtensions = [
    '.js',
    '.css',
    '.json',
    '.png',
    '.jpg',
    '.jpeg',
    '.svg',
    '.ico',
    '.wasm',
    '.woff',
    '.woff2',
    '.ttf',
    '.eot',
  ];
  if (assetExtensions.some(ext => url.pathname.endsWith(ext))) {
    return next();
  }

  // Let /assets/ and /data/ directories pass through
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/data/')) {
    return next();
  }

  // For all other routes, serve index.html (SPA routing)
  try {
    const response = await next();

    // If we get a 404, serve index.html instead for SPA routing
    const NOT_FOUND = 404;
    if (response.status === NOT_FOUND) {
      const indexUrl = new URL('/index.html', url.origin);
      return env.ASSETS.fetch(indexUrl);
    }

    return response;
  } catch (_error) {
    // If anything fails, try to serve index.html
    const indexUrl = new URL('/index.html', url.origin);
    return env.ASSETS.fetch(indexUrl);
  }
}
