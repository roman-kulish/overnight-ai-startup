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

export interface StreamConfig {
  enabled: boolean;
  meta: (input: string) => Record<string, unknown> | Promise<Record<string, unknown>>;
}

export interface AppConfig<TOutput> {
  app: string;
  responseKey: string;
  model: (env: Env) => string;
  gateway: (env: Env) => string;
  buildMessages: (input: string) => ChatMessage[];
  transform?: (raw: string, input: string) => TOutput | Promise<TOutput>;
  stream?: StreamConfig;
}

function wantsStream(body: unknown): boolean {
  return typeof body === 'object' && body !== null && (body as { stream?: unknown }).stream === true;
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

function encodeSSE(payload: unknown): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

function extractTokenFromData(data: string): string | undefined {
  if (data === '[DONE]') return undefined;

  try {
    const parsed = JSON.parse(data) as Record<string, unknown>;

    if (typeof parsed.response === 'string' && parsed.response.length > 0) {
      return parsed.response;
    }

    const delta = (parsed.choices as Array<{ delta?: { content?: string } }> | undefined)?.[0]?.delta;
    if (typeof delta?.content === 'string' && delta.content.length > 0) {
      return delta.content;
    }
  } catch {
    // Ignore malformed chunks.
  }

  return undefined;
}

function createStreamResponse(
  meta: Record<string, unknown>,
  upstream: ReadableStream<Uint8Array>,
): Response {
  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream<string, Uint8Array>({
    transform(chunk, controller) {
      controller.enqueue(encoder.encode(chunk));
    },
  });
  const writer = writable.getWriter();

  async function pump() {
    const reader = upstream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      await writer.write(encodeSSE(meta));

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          const dataLine = part.split('\n').find((line) => line.startsWith('data:'));
          if (!dataLine) continue;

          const token = extractTokenFromData(dataLine.slice(5).trim());
          if (token !== undefined) {
            await writer.write(encodeSSE({ token }));
          }
        }
      }

      await writer.write(encodeSSE({ done: true }));
    } catch (err) {
      console.error('Stream pump error:', err);
      try {
        await writer.write(encodeSSE({ error: 'Stream interrupted' }));
      } catch {
        // Writer may already be closed.
      }
    } finally {
      reader.releaseLock();
      try {
        await writer.close();
      } catch {
        // Ignore close errors on an already-closed writer.
      }
    }
  }

  pump();

  return new Response(readable, {
    status: 200,
    headers: {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache, no-transform',
      'connection': 'keep-alive',
      'x-accel-buffering': 'no', // Prevent nginx/proxy buffering
    },
  });
}

export function createAIPipelineHandler<TOutput = string>({
  app,
  responseKey,
  model,
  gateway,
  buildMessages,
  transform,
  stream,
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

    if (wantsStream(body)) {
      if (!stream?.enabled) {
        return jsonResponse({ ok: false, error: 'Streaming not enabled for this route' }, 400);
      }

      try {
        const meta = await stream.meta(validation.sanitized);
        const aiResponse = await env.AI.run(
          model(env),
          { messages, stream: true } as Record<string, unknown>,
          { gateway: { id: gateway(env) } },
        );

        if (!(aiResponse instanceof ReadableStream)) {
          return jsonResponse({ ok: false, error: 'AI did not return a stream' }, 502);
        }

        return createStreamResponse(meta, aiResponse as ReadableStream<Uint8Array>);
      } catch (err) {
        console.error(`AI stream error for ${app}:`, err);
        return jsonResponse({ ok: false, error: 'AI streaming failed' }, 502);
      }
    }

    try {
      const aiResponse = await env.AI.run(
        model(env),
        { messages } as Record<string, unknown>,
        { gateway: { id: gateway(env) } },
      );
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
