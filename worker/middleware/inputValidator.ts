const LIMITS: Record<string, number> = {
  meditate: 50,
  agency: 200,
  roast: 500,
  oracle: 100,
};

export type ValidationResult =
  | { valid: true; sanitized: string }
  | { valid: false; error: string };

function extractText(body: unknown): string | null {
  if (typeof body === 'string') {
    return body;
  }

  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>;

    if (typeof record.input === 'string') {
      return record.input;
    }

    if (typeof record.prompt === 'string') {
      return record.prompt;
    }
  }

  return null;
}

function sanitize(input: string): string {
  return input
    .replace(/[\x00-\x1F\x7F]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function validateInput(app: string, body: unknown): ValidationResult {
  const limit = LIMITS[app];

  if (!limit) {
    return { valid: false, error: 'Unknown app' };
  }

  const text = extractText(body);

  if (text === null || text.length === 0) {
    return { valid: false, error: 'Missing input' };
  }

  const sanitized = sanitize(text);

  if (sanitized.length === 0) {
    return { valid: false, error: 'Input is empty after sanitization' };
  }

  if (sanitized.length > limit) {
    return { valid: false, error: `Input exceeds ${limit} characters` };
  }

  return { valid: true, sanitized };
}
