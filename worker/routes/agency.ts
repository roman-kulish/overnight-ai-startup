import { validateInput } from '../middleware/inputValidator.ts';
import { detectInjection } from '../middleware/promptInjection.ts';

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export default async function handle(
  _env: Env,
  request: Request,
  _ip: string
): Promise<Response> {
  // Future: _env.AI.run(_env.MODEL_AGENCY, { ... }, { gateway: { id: _env.AI_GATEWAY_AGENCY } })
  const body = await parseJson(request);

  if (!body) {
    return jsonResponse({ ok: false, error: 'Invalid JSON body' }, 400);
  }

  const validation = validateInput('agency', body);

  if (!validation.valid) {
    return jsonResponse({ ok: false, error: validation.error }, 400);
  }

  const injection = detectInjection(validation.sanitized);

  if (!injection.safe) {
    return jsonResponse({ ok: false, error: injection.reason }, 400);
  }

  return jsonResponse({
    ok: true,
    output: 'Generated content goes here for agency',
  });
}

async function parseJson(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
