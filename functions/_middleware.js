// Middleware to handle SPA routing for Cloudflare Pages
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // Let API routes pass through to their handlers
  if (url.pathname.startsWith('/api/')) {
    return context.next();
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
    return context.next();
  }

  // Let /assets/ and /data/ directories pass through
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/data/')) {
    return context.next();
  }

  // For all other routes (/, /items, /charts, etc.), serve index.html
  // This enables SPA routing without waiting for a 404
  return env.ASSETS.fetch(new URL('/index.html', url.origin));
}
