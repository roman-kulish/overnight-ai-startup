import handleMeditate from './routes/meditate.ts';
import handleAgency from './routes/agency.ts';
import handleRoast from './routes/roast.ts';
import handleOracle from './routes/oracle.ts';

const MAX_BODY_SIZE = 10_000; // bytes

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (!url.pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request);
    }

    if (request.method !== 'POST') {
      return jsonResponse({ ok: false, error: 'Method not allowed' }, 405);
    }

    const contentLength = Number(request.headers.get('content-length') ?? '0');
    if (contentLength > MAX_BODY_SIZE) {
      return jsonResponse({ ok: false, error: 'Request body too large' }, 413);
    }

    const ip = request.headers.get('CF-Connecting-IP') ?? 'cf-placeholder-ip';

    switch (url.pathname) {
      case '/api/meditate':
        return handleMeditate(env, request, ip);
      case '/api/agency':
        return handleAgency(env, request, ip);
      case '/api/roast':
        return handleRoast(env, request, ip);
      case '/api/oracle':
        return handleOracle(env, request, ip);
      default:
        return jsonResponse({ ok: false, error: 'Not found' }, 404);
    }
  },
} satisfies ExportedHandler<Env>;
