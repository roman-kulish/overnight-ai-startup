export type InjectionResult =
  | { safe: true }
  | { safe: false; reason: string };

const PATTERNS = [
  'ignore previous',
  'ignore all',
  'disregard',
  'you are now',
  'system prompt',
  'act as',
  'pretend you are',
  'forget your',
  'ignore your instructions',
  'new instructions',
];

export function detectInjection(text: string): InjectionResult {
  const lower = text.toLowerCase();

  for (const pattern of PATTERNS) {
    if (lower.includes(pattern)) {
      return { safe: false, reason: `Prompt injection attempt detected: ${pattern}` };
    }
  }

  return { safe: true };
}
