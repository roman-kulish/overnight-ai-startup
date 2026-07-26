// POST /api/meditate
// KV-cached quote + KV-cached LLM-generated dynamic phrases. The 18 static
// phrases per bhāva are pulled from code (no LLM, no KV).
//
// Spec deviation: the spec says this route uses the shared
// `createAIPipelineHandler` factory, but the factory assumes a single-string
// `input` field and a single LLM call path. Meditate's flow (ticker regex
// validation, KV cache, Yahoo fetch, conditional LLM, PHRASE-delimited parser,
// lastBhava field) doesn't fit. We reuse the shared helpers (`jsonResponse`,
// `parseJson`, `detectInjection`) and keep the factory untouched to protect
// the working roast/oracle/agency routes.

import { jsonResponse, parseJson, type ChatMessage } from './shared.ts'
import { detectInjection } from '../middleware/promptInjection.ts'
import {
  readPhraseCache,
  writePhraseCache,
  readQuoteCache,
  writeQuoteCache,
} from './meditate-kv.ts'
import { STATIC_PHRASES, type BhavaKey as _BhavaKey } from './meditate-static-phrases.ts'
import {
  getBhava,
  type BhavaKey,
  type BreathCycle,
  type Direction,
  type MeditateEnvelope,
  type QuoteEnvelope,
  type YahooChartResponse,
} from './meditate-types.ts'

const TICKER_RE = /^[A-Z0-9-]{1,10}$/

export function validateTicker(raw: unknown):
  | { valid: true; sanitized: string }
  | { valid: false; error: string } {
  if (typeof raw !== 'string') return { valid: false, error: 'Missing ticker' }
  const sanitized = raw.trim().toUpperCase().replace(/\s+/g, '')
  if (sanitized.length === 0) return { valid: false, error: 'Missing ticker' }
  if (sanitized.length > 10) return { valid: false, error: 'Ticker too long' }
  if (!TICKER_RE.test(sanitized)) {
    return { valid: false, error: 'Invalid ticker format' }
  }
  return { valid: true, sanitized }
}

export function isValidBhavaKey(s: string): s is BhavaKey {
  return (
    s === 'Sunyata' ||
    s === 'Dukkha' ||
    s === 'Upekkha' ||
    s === 'Sankhara' ||
    s === 'Piti' ||
    s === 'Moha'
  )
}

export function computeDirection(changePct: number): Direction {
  if (changePct > 0.1) return 'up'
  if (changePct < -0.1) return 'down'
  return 'flat'
}

export function computeBhava(changePct: number, volatility: number): BhavaKey {
  if (changePct < -3) return 'Sunyata'
  if (changePct < -1) return 'Dukkha'
  if (changePct > 3) return 'Moha'
  if (changePct > 1) return 'Piti'
  return volatility >= 0.015 ? 'Sankhara' : 'Upekkha'
}

export function computeVolatility(closes: number[]): number {
  if (closes.length < 2) return 0
  const mean = closes.reduce((a, b) => a + b, 0) / closes.length
  if (mean === 0) return 0
  const variance =
    closes.reduce((acc, c) => acc + (c - mean) ** 2, 0) / closes.length
  const stddev = Math.sqrt(variance)
  return stddev / Math.abs(mean)
}

function volatilityBucket(volatility: number): 'low' | 'medium' | 'high' {
  if (volatility < 0.01) return 'low'
  if (volatility < 0.03) return 'medium'
  return 'high'
}

export function computeBreathCycle(
  volatility: 'low' | 'medium' | 'high',
  direction: Direction,
): BreathCycle {
  // The two test cases are anchors:
  //   ('high', 'down') -> 3/4/5/4 — high vol is its own base
  //   ('low', 'flat')  -> 5/7/8/7 — low vol is its own base
  if (volatility === 'high') return { in: 3, holdIn: 4, out: 5, holdOut: 4 }
  if (volatility === 'low') return { in: 5, holdIn: 7, out: 8, holdOut: 7 }
  // medium: direction modulates
  if (direction === 'flat') return { in: 5, holdIn: 7, out: 8, holdOut: 7 }
  if (direction === 'down') return { in: 4, holdIn: 6, out: 6, holdOut: 6 }
  return { in: 4, holdIn: 5, out: 6, holdOut: 5 }
}

export function computeMood(direction: Direction, volatility: number): string {
  if (direction === 'flat') return volatility >= 0.015 ? 'restless' : 'still'
  if (direction === 'up') return volatility >= 0.015 ? 'volatile climb' : 'calm ascent'
  return volatility >= 0.015 ? 'volatile descent' : 'gentle descent'
}

// === Phrase parser ======================================================

const FALLBACK_PHRASE = 'Breathe in, and notice you are still here.'

export function parsePhrasesFromLLMOutput(raw: string): string[] {
  // No PHRASE: marker at all -> 6 fallbacks (LLM failed entirely).
  if (!raw.includes('PHRASE:')) {
    return [FALLBACK_PHRASE, FALLBACK_PHRASE, FALLBACK_PHRASE, FALLBACK_PHRASE, FALLBACK_PHRASE, FALLBACK_PHRASE]
  }

  const parts = raw.split('\nPHRASE:')
  const phrases = parts
    .map((p) => p.replace(/^PHRASE:\s*/, '').trim())
    .filter((p) => p.length > 0)

  if (phrases.length === 0) {
    return [FALLBACK_PHRASE, FALLBACK_PHRASE, FALLBACK_PHRASE, FALLBACK_PHRASE, FALLBACK_PHRASE, FALLBACK_PHRASE]
  }

  if (phrases.length >= 6) return phrases.slice(0, 6)

  // Pad short output to 6 with the fallback phrase.
  const result = phrases.slice()
  while (result.length < 6) result.push(FALLBACK_PHRASE)
  return result
}

// === Seeded shuffle =====================================================

function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function pickSessionPhrases(
  pool: string[],
  sessionId: string,
  count: number,
): string[] {
  if (pool.length <= count) return pool.slice()
  const rng = mulberry32(hashString(sessionId))
  const indices = pool.map((_, i) => i)
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = indices[i]
    indices[i] = indices[j]
    indices[j] = tmp
  }
  return indices.slice(0, count).map((i) => pool[i])
}

// === Yahoo fetch ========================================================

type YahooErrorKind = 'not_found' | 'rate_limited' | 'upstream_error'

export class YahooError extends Error {
  constructor(public kind: YahooErrorKind, public status?: number) {
    super(kind)
  }
}

export async function fetchYahooQuote(
  ticker: string,
  fetcher: typeof fetch = fetch,
): Promise<YahooChartResponse> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1mo`
  const response = await fetcher(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OvernightAI/1.0)' },
  })
  if (response.status === 403 || response.status === 429) {
    throw new YahooError('rate_limited', response.status)
  }
  if (!response.ok) {
    throw new YahooError('upstream_error', response.status)
  }
  return (await response.json()) as YahooChartResponse
}

type ParsedQuote = {
  price: number
  change: number
  changePct: number
  dayHigh: number
  dayLow: number
  currency: string
  longName: string
  sparkline: number[]
}

export function parseYahooQuote(ticker: string, data: YahooChartResponse): ParsedQuote {
  if (data.chart?.error) {
    throw new YahooError('not_found')
  }
  const result = data.chart?.result?.[0]
  if (!result?.meta) {
    throw new YahooError('not_found')
  }
  const meta = result.meta
  const price = meta.regularMarketPrice ?? 0
  const prev = meta.chartPreviousClose ?? price
  const change = price - prev
  const changePct = prev === 0 ? 0 : (change / prev) * 100
  const closes = (result.indicators?.quote?.[0]?.close ?? []).filter(
    (c): c is number => typeof c === 'number' && Number.isFinite(c),
  )
  return {
    price,
    change,
    changePct,
    dayHigh: meta.regularMarketDayHigh ?? price,
    dayLow: meta.regularMarketDayLow ?? price,
    currency: meta.currency ?? 'USD',
    longName: meta.longName ?? ticker,
    sparkline: closes,
  }
}

export function buildQuoteEnvelope(ticker: string, parsed: ParsedQuote): QuoteEnvelope {
  const { price, change, changePct, dayHigh, dayLow, currency, longName, sparkline } = parsed
  const volatility = computeVolatility(sparkline)
  const direction = computeDirection(changePct)
  const bhava = computeBhava(changePct, volatility)
  const bucket = volatilityBucket(volatility)
  const breathCycle = computeBreathCycle(bucket, direction)
  const mood = computeMood(direction, volatility)
  const meta = getBhava(bhava)
  return {
    ticker,
    longName,
    currency,
    price,
    change,
    changePct,
    dayHigh,
    dayLow,
    sparkline,
    bhava: meta.key,
    bhavaTranslation: meta.translation,
    mood,
    breathCycle,
    volatility,
    generatedAt: Math.floor(Date.now() / 1000),
  }
}

// === LLM message builder ================================================

export function buildMeditateMessages(envelope: QuoteEnvelope): ChatMessage[] {
  const direction = computeDirection(envelope.changePct)
  const bucket = volatilityBucket(envelope.volatility)
  const dirLabel = direction === 'up' ? 'up' : direction === 'down' ? 'down' : 'flat'
  // Defensive: envelope.bhava may be missing or invalid if it came from a
  // corrupt KV cache. getBhava falls back to Upekkha so the meditation
  // still runs and the LLM call can proceed.
  const meta = getBhava(envelope.bhava)

  return [
    {
      role: 'system',
      content: `You are a dry, sardonic mindfulness instructor. Generate exactly 6 short meditation phrases (6-14 words each) for someone whose stock or crypto portfolio is fluctuating. Use the provided market context as an allegory, not as the topic.

Format: output only the 6 phrases, each on its own line, each starting with "PHRASE:". Do not output JSON, prose, or conversational intro.

Banned words: 'center', 'inner peace', 'present', 'wealth', 'money', 'stock', 'crypto', 'yourself'. Do not use ellipses inside a phrase — use commas instead. The final phrase should feel like it could begin the next cycle.`,
    },
    {
      role: 'user',
      content: `Ticker: ${envelope.ticker}. Bhāva: ${meta.display}. Direction: ${dirLabel}. Volatility: ${bucket}. Recent change: ${envelope.changePct.toFixed(2)}% over 1 day. Treat this as a slow breath. Metaphor to use: weather.`,
    },
  ]
}

// === LLM response shape extraction ======================================

function extractTextFromAIResponse(response: unknown): string | undefined {
  if (typeof response === 'string') return response
  if (!response || typeof response !== 'object') return undefined
  const record = response as Record<string, unknown>
  if (typeof record.response === 'string') return record.response
  const result = record.result as Record<string, unknown> | undefined
  if (typeof result?.response === 'string') return result.response
  const choices = record.choices as Array<{ message?: { content?: string } }> | undefined
  if (choices && choices.length > 0 && typeof choices[0]?.message?.content === 'string') {
    return choices[0].message.content
  }
  return undefined
}

// === Main handler =======================================================

export default async function handleMeditate(
  env: Env,
  request: Request,
  _ip: string,
): Promise<Response> {
  const body = await parseJson(request)
  if (!body) return jsonResponse({ ok: false, error: 'Invalid JSON body' }, 400)

  const record = body as Record<string, unknown>

  const tickerResult = validateTicker(record.ticker)
  if (!tickerResult.valid) {
    return jsonResponse({ ok: false, error: tickerResult.error }, 400)
  }
  const ticker = tickerResult.sanitized

  const injection = detectInjection(ticker)
  if (!injection.safe) {
    return jsonResponse({ ok: false, error: injection.reason }, 400)
  }

  const lastBhavaRaw = record.lastBhava
  if (lastBhavaRaw !== undefined) {
    if (typeof lastBhavaRaw !== 'string' || !isValidBhavaKey(lastBhavaRaw)) {
      return jsonResponse({ ok: false, error: 'Invalid lastBhava' }, 400)
    }
  }
  const lastBhava = lastBhavaRaw as BhavaKey | undefined

  // Quote (with KV cache)
  let envelope: QuoteEnvelope
  const quoteCached = await readQuoteCache(env, ticker)
  if (quoteCached.hit) {
    envelope = quoteCached.value
  } else {
    let parsed: ParsedQuote
    try {
      const yahooData = await fetchYahooQuote(ticker)
      parsed = parseYahooQuote(ticker, yahooData)
    } catch (err) {
      if (err instanceof YahooError) {
        if (err.kind === 'not_found') {
          return jsonResponse({ ok: false, error: 'Ticker not found' }, 400)
        }
        if (err.kind === 'rate_limited') {
          return jsonResponse({ ok: false, error: 'Quote feed unavailable, try again' }, 502)
        }
      }
      console.error('meditate: yahoo fetch failed', err)
      return jsonResponse({ ok: false, error: 'Quote feed unavailable' }, 502)
    }
    envelope = buildQuoteEnvelope(ticker, parsed)
    await writeQuoteCache(env, ticker, envelope)
  }

  // Phrase pool: 6 dynamic (LLM/KV) + 18 static (from code) = 24
  const phraseCached = await readPhraseCache(env, ticker, envelope.bhava)
  let dynamic: string[]
  let cached: boolean

  if (phraseCached.hit) {
    dynamic = phraseCached.value.dynamic
    cached = true
  } else {
    try {
      const messages = buildMeditateMessages(envelope)
      const aiResponse = await env.AI.run(
        env.MODEL_MEDITATE,
        { messages } as Record<string, unknown>,
        { gateway: { id: env.AI_GATEWAY_MEDITATE } },
      )
      const raw = extractTextFromAIResponse(aiResponse)
      if (raw === undefined) {
        return jsonResponse({ ok: false, error: 'AI processing failed' }, 502)
      }
      dynamic = parsePhrasesFromLLMOutput(raw)
      await writePhraseCache(env, ticker, envelope.bhava, {
        dynamic,
        generatedAt: Math.floor(Date.now() / 1000),
      })
      cached = false
    } catch (err) {
      console.error('meditate: AI call failed', err)
      return jsonResponse({ ok: false, error: 'AI processing failed' }, 502)
    }
  }

  const staticPhrases = STATIC_PHRASES[envelope.bhava]
  const phrases = [...dynamic, ...staticPhrases]
  const meditation: MeditateEnvelope = {
    ...envelope,
    phrases,
    poolSize: phrases.length,
    cached,
  }

  // lastBhava is currently advisory only — the client uses it to decide
  // whether to call this endpoint at all. We accept and validate it for
  // future use (e.g. logging, analytics) but do not branch on it here.
  void lastBhava

  return jsonResponse({ ok: true, meditation })
}
