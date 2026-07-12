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

  for (const word of BUZZWORDS) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const boundary = `(?:^|[^a-z0-9])${escaped}(?![a-z0-9-])`;
    const matches = normalized.match(new RegExp(boundary, 'g'));
    count += matches ? matches.length : 0;
  }

  return count;
}

export function computeValuation(buzzes: number): number {
  const raw = buzzes * VALUATION_PER_BUZZWORD;
  return Math.min(MAX_VALUATION, Math.max(MIN_VALUATION, raw));
}

// The satire curve is circular: zero buzzwords is just as fictional as an extreme pile.
// Both ends land on Pre-Thermodynamics.
export function computeStage(buzzes: number): string {
  if (buzzes >= 8) return 'Pre-Thermodynamics';
  if (buzzes >= 6) return 'Pre-Everything';
  if (buzzes >= 4) return 'Pre-Revenue';
  if (buzzes >= 2) return 'Pre-Product';
  if (buzzes >= 1) return 'Pre-Concept';
  return 'Pre-Thermodynamics';
}

function buildRoastMessages(pitch: string): ChatMessage[] {
  const safePitch = pitch.replace(/"/g, "'");
  return [
    {
      role: 'system',
      content: `You are a brutally honest, buzzword-fluent Silicon Valley partner. Roast the startup pitch below in 2-3 short, punchy paragraphs using VC and startup YouTube vocabulary ("pre-revenue," "TAM," "pivot," "burn rate," "traction," "runway," etc.). Be witty, punchy, and mean-but-funny. Respond only with the roast.`,
    },
    {
      role: 'user',
      content: `Pitch: "${safePitch}"`,
    },
  ];
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
});
