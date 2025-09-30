// Catch-all function for SPA routing
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // Let API routes pass through
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
    return env.ASSETS.fetch(request);
  }

  // Let /assets/ and /data/ directories pass through
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/data/')) {
    return env.ASSETS.fetch(request);
  }

  // For all other routes, serve index.html for SPA routing
  return env.ASSETS.fetch(new URL('/index.html', url.origin));
}
