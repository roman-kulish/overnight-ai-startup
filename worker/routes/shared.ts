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

export type ChatMessage = { role: 'system' | 'user'; content: string };

export interface AppConfig<TOutput> {
  app: string;
  responseKey: string;
  model: (env: Env) => string;
  gateway: (env: Env) => string;
  buildMessages: (input: string) => ChatMessage[];
  transform?: (raw: string, input: string) => TOutput | Promise<TOutput>;
}

function extractTextFromAIResponse(response: unknown): string | undefined {
  if (typeof response === 'string') {
    return response;
  }

  if (!response || typeof response !== 'object') {
    return undefined;
  }

  const record = response as Record<string, unknown>;

  if (typeof record.response === 'string') {
    return record.response;
  }

  const result = record.result as Record<string, unknown> | undefined;
  if (typeof result?.response === 'string') {
    return result.response;
  }

  const choices = record.choices as Array<{ message?: { content?: string } }> | undefined;
  if (choices && choices.length > 0 && typeof choices[0]?.message?.content === 'string') {
    return choices[0].message.content;
  }

  return undefined;
}

export function createAIPipelineHandler<TOutput = string>({
  app,
  responseKey,
  model,
  gateway,
  buildMessages,
  transform,
}: AppConfig<TOutput>) {
  return async function handle(
    env: Env,
    request: Request,
    _ip: string,
  ): Promise<Response> {
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

    const messages = buildMessages(validation.sanitized);

    try {
      const aiResponse = await env.AI.run(model(env), { messages }, { gateway: { id: gateway(env) } });
      const rawText = extractTextFromAIResponse(aiResponse);

      if (rawText === undefined || rawText.trim() === '') {
        return jsonResponse({ ok: false, error: 'Empty AI response' }, 502);
      }

      const output = transform ? await transform(rawText, validation.sanitized) : (rawText as TOutput);

      return jsonResponse({
        ok: true,
        [responseKey]: output,
      });
    } catch (err) {
      console.error(`AI pipeline error for ${app}:`, err);
      return jsonResponse({ ok: false, error: 'AI processing failed' }, 502);
    }
  };
}

// Lightweight placeholder handler for apps that haven't been wired to the AI pipeline yet.
export function createAppHandler(app: string, placeholder: string) {
  return async function handle(
    _env: Env,
    request: Request,
    _ip: string,
  ): Promise<Response> {
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
