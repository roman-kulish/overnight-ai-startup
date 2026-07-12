export type InjectionResult =
  | { safe: true }
  | { safe: false; reason: string };

// First-pass deterrent for obvious prompt-injection patterns.
// This is a cheap regex filter paired with AI Gateway guardrails, not a robust defense.
const PATTERNS = [
  /\bignore\s+(previous|all)\b/,
  /\bdisregard\b/,
  /\byou\s+are\s+now\b/,
  /\bsystem\s+prompt\b/,
  /\bact\s+as\b/,
  /\bpretend\s+you\s+are\b/,
  /\bforget\s+your\b/,
  /\bignore\s+your\s+instructions\b/,
  /\bnew\s+instructions\b/,
];

export function detectInjection(text: string): InjectionResult {
  const lower = text.toLowerCase();

  for (const pattern of PATTERNS) {
    if (pattern.test(lower)) {
      return {
        safe: false,
        reason: 'Input flagged by safety filter.',
      };
    }
  }

  return { safe: true };
}
