import handleMeditate from './routes/meditate.ts';
import handleAgency from './routes/agency.ts';
import handleRoast from './routes/roast.ts';
import handleOracle from './routes/oracle.ts';

function notFoundResponse(): Response {
  return new Response(JSON.stringify({ ok: false, error: 'Not found' }), {
    status: 404,
    headers: { 'content-type': 'application/json' },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (!url.pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request);
    }

    if (request.method !== 'POST') {
      return notFoundResponse();
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
        return notFoundResponse();
    }
  },
} satisfies ExportedHandler<Env>;
