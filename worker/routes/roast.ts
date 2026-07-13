import { createAIPipelineHandler, type ChatMessage } from './shared.ts';

// Silicon Valley / startup grifter clichés that pump (then crater) the valuation.
const BUZZWORDS = [
  'ai',
  'artificial intelligence',
  'machine learning',
  'deep learning',
  'neural',
  'llm',
  'large language model',
  'generative ai',
  'gen ai',
  'agent',
  'agents',
  'autonomous',
  'chatbot',
  'nlp',
  'computer vision',
  'saas',
  'b2b',
  'b2c',
  'marketplace',
  'platform',
  'ecosystem',
  'disrupt',
  'disruption',
  'disruptive',
  'decentralized',
  'decentralisation',
  'decentralization',
  'blockchain',
  'web3',
  'dao',
  'nft',
  'tokenize',
  'tokenization',
  'gamify',
  'gamification',
  'mvp',
  'tam',
  'sam',
  'som',
  'pivot',
  'scale',
  'scaling',
  'synergy',
  'synergies',
  'leverage',
  'leveraging',
  'optimize',
  'optimization',
  'hypergrowth',
  'hyper-growth',
  'next-gen',
  'next generation',
  'cutting-edge',
  'cutting edge',
  'revolutionary',
  'game-changer',
  'game changer',
  'game-changing',
  'game changing',
  '10x',
  '10 x',
  'unicorn',
  'decacorn',
  'paradigm shift',
  'paradigm-shifting',
  'low-code',
  'low code',
  'no-code',
  'no code',
  'freemium',
  'subscription',
  'recurring revenue',
  'arr',
  'mrr',
  'burn rate',
  'runway',
  'traction',
  'monetize',
  'monetization',
  'arpu',
  'cac',
  'ltv',
  'retention',
  'churn',
  'network effects',
  'flywheel',
  'core competency',
  'core competencies',
  'value prop',
  'value proposition',
  'beachhead',
  'go-to-market',
  'gtm',
  'vertical',
  'horizontal',
  'api-first',
  'api first',
  'microservices',
  'serverless',
  'streaming',
  'real-time',
  'realtime',
  'real time',
  'democratize',
  'democratise',
  'democratization',
  'democratisation',
  'personalized',
  'personalised',
  'predictive',
  'generative',
  'copilot',
  'assistant',
  'on-demand',
  'on demand',
  'uber for',
  'airbnb for',
  'netflix for',
  'spotify for',
];

// Longer phrases are matched first so "generative ai" does not also count as "ai".
const SORTED_BUZZWORDS = [...BUZZWORDS].sort((a, b) => b.length - a.length);
const ESCAPED_BUZZWORDS = SORTED_BUZZWORDS.map((word) =>
  word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
);
const BUZZWORD_RE = new RegExp(
  `(?:^|[^a-z0-9])(?:${ESCAPED_BUZZWORDS.join('|')})(?![a-z0-9-])`,
  'gi',
);

const VALUATION_PER_BUZZWORD = 1_000_000;
const MIN_VALUATION = 100_000;
const MAX_VALUATION = 10_000_000;

export type RoastResult = {
  text: string;
  valuation: number;
  stage: string;
};

export function countBuzzwords(text: string): number {
  const normalized = text.toLowerCase();
  let count = 0;

  BUZZWORD_RE.lastIndex = 0;
  while (BUZZWORD_RE.exec(normalized) !== null) {
    count += 1;
  }

  return count;
}

export function computeValuation(buzzes: number): number {
  if (buzzes === 0) return 0;
  const raw = buzzes * VALUATION_PER_BUZZWORD;
  return Math.min(MAX_VALUATION, Math.max(MIN_VALUATION, raw));
}

export function computeStage(buzzes: number): string {
  if (buzzes === 0) return 'Pre-Industrial';
  if (buzzes >= 8) return 'Pre-Thermodynamics';
  if (buzzes >= 6) return 'Pre-Everything';
  if (buzzes >= 4) return 'Pre-Revenue';
  if (buzzes >= 2) return 'Pre-Product';
  return 'Pre-Concept';
}

function buildRoastMessages(pitch: string): ChatMessage[] {
  const safePitch = pitch.replace(/"/g, "'");
  return [
    {
      role: 'system',
      content: `You are a tier-one Silicon Valley venture capitalist, a hybrid of Kevin O'Leary and an aggressive tech-twitter contrarian. Review the startup pitch below. Teardown the idea in 2-3 short, incredibly punchy paragraphs. Use heavy startup-bro and YouTube grifter terminology (e.g., TAM, pre-revenue, burn rate, runway, pivot, B2B SaaS play, unit economics, zero-interest rate phenomenon, lifestyle business). Avoid cliché AI openings like 'Oh boy,' 'Let's break this down,' or mentioning unicorns. Start immediately with a direct, devastating critique of their market assumptions or logic. Be funny, deeply condescending, but technically accurate regarding business failures. Respond only with the raw roast.`,
    },
    {
      role: 'user',
      content: `Pitch: "${safePitch}"`,
    },
  ];
}

function computeRoastMeta(input: string): Record<string, unknown> {
  const buzzes = countBuzzwords(input);
  return {
    valuation: computeValuation(buzzes),
    stage: computeStage(buzzes),
  };
}

export default createAIPipelineHandler<RoastResult>({
  app: 'roast',
  responseKey: 'roast',
  model: (env) => env.MODEL_VC_ROAST,
  gateway: (env) => env.AI_GATEWAY_VC_ROAST,
  buildMessages: buildRoastMessages,
  transform: async (raw, input) => {
    const text = raw.trim();
    const buzzes = countBuzzwords(input);
    const valuation = computeValuation(buzzes);
    const stage = computeStage(buzzes);
    return { text, valuation, stage };
  },
  stream: {
    enabled: true,
    meta: computeRoastMeta,
  },
});
