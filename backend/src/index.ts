// Proxy for the aoe4world.com API. The SPA must never call aoe4world directly
// from the browser; this Worker forwards GET /api/v0/* requests upstream,
// identifying the app via the User-Agent header.

const UPSTREAM_ORIGIN = 'https://aoe4world.com';
const USER_AGENT = 'aoe4friends (@jesusnoseq)';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    if (request.method !== 'GET') {
      return new Response('Method not allowed', {
        status: 405,
        headers: { ...CORS_HEADERS, Allow: 'GET, OPTIONS' },
      });
    }

    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/v0/')) {
      return new Response('Not found', { status: 404, headers: CORS_HEADERS });
    }

    const upstream = await fetch(`${UPSTREAM_ORIGIN}${url.pathname}${url.search}`, {
      cf: {
        cacheEverything: true,
        cacheTtl: 3600
      },
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
    });

    const headers = new Headers(CORS_HEADERS);
    const contentType = upstream.headers.get('Content-Type');
    if (contentType) headers.set('Content-Type', contentType);
    return new Response(upstream.body, { status: upstream.status, headers });
  },
} satisfies ExportedHandler;
