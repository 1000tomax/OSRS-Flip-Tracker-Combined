// Catch-all function for SPA routing
// _routes.json ensures only non-asset routes reach this function
export async function onRequest(context) {
  const { env, request } = context;

  // Serve index.html for all SPA routes
  return env.ASSETS.fetch(new URL('/index.html', request.url));
}
