// Proxy for the aoe4world.com API. The SPA must never call aoe4world directly
// from the browser; this Worker forwards GET /api/v0/* requests upstream,
// identifying the app via the User-Agent header. Game summaries live outside
// /api/v0 upstream (aoe4world.com/players/{id}/games/{id}/summary), so that
// route is allowlisted and the /api prefix stripped before forwarding.
//
// Summaries are additionally cached in R2 keyed by game id alone: the same
// game requested through different player URLs returns identical JSON, so
// once stored a summary is served from R2 without hitting aoe4world.

interface Env {
  SUMMARIES: R2Bucket;
}

const UPSTREAM_ORIGIN = 'https://aoe4world.com';
const USER_AGENT = 'aoe4friends (@jesusnoseq)';

const SUMMARY_ROUTE = /^\/api\/players\/\d+\/games\/(\d+)\/summary$/;

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function fetchUpstream(path: string, search: string): Promise<Response> {
  return fetch(`${UPSTREAM_ORIGIN}${path}${search}`, {
    cf: {
      cacheEverything: true,
      cacheTtl: 3600
    },
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
    },
  });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
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
    const summaryMatch = SUMMARY_ROUTE.exec(url.pathname);
    if (summaryMatch) {
      return serveSummary(summaryMatch[1], url, env, ctx);
    }
    if (!url.pathname.startsWith('/api/v0/')) {
      return new Response('Not found', { status: 404, headers: CORS_HEADERS });
    }

    const upstream = await fetchUpstream(url.pathname, url.search);
    const headers = new Headers(CORS_HEADERS);
    const contentType = upstream.headers.get('Content-Type');
    if (contentType) headers.set('Content-Type', contentType);
    return new Response(upstream.body, { status: upstream.status, headers });
  },
} satisfies ExportedHandler<Env>;

async function serveSummary(
  gameId: string,
  url: URL,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
  const key = `summaries/${gameId}.json`;

  const cached = await env.SUMMARIES.get(key);
  if (cached) {
    return new Response(cached.body, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json',
        'X-Cache': 'HIT',
      },
    });
  }

  const upstream = await fetchUpstream(url.pathname.slice('/api'.length), url.search);
  if (!upstream.ok) {
    const headers = new Headers(CORS_HEADERS);
    const contentType = upstream.headers.get('Content-Type');
    if (contentType) headers.set('Content-Type', contentType);
    return new Response(upstream.body, { status: upstream.status, headers });
  }

  const body = await upstream.text();
  ctx.waitUntil(
    env.SUMMARIES.put(key, body, {
      httpMetadata: { contentType: 'application/json' },
    }),
  );
  return new Response(body, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
      'X-Cache': 'MISS',
    },
  });
}
