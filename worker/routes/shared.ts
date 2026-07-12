import { validateInput } from '../middleware/inputValidator.ts';
import { detectInjection } from '../middleware/promptInjection.ts';

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export async function parseJson(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function createAppHandler(app: string, placeholder: string) {
  return async function handle(
    _env: Env,
    request: Request,
    _ip: string,
  ): Promise<Response> {
    // Future: _env.AI.run(modelFor(app), { ... }, { gateway: { id: gatewayFor(app) } })
    const body = await parseJson(request);

    if (!body) {
      return jsonResponse({ ok: false, error: 'Invalid JSON body' }, 400);
    }

    const validation = validateInput(app, body);

    if (!validation.valid) {
      return jsonResponse({ ok: false, error: validation.error }, 400);
    }

    const injection = detectInjection(validation.sanitized);

    if (!injection.safe) {
      return jsonResponse({ ok: false, error: injection.reason }, 400);
    }

    return jsonResponse({
      ok: true,
      output: placeholder,
    });
  };
}
