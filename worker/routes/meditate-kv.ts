// KV read/write helpers for the meditate app.
// Two namespaces:
//   QUOTE_CACHE  — 60s TTL, keyed by ticker (Cloudflare KV's minimum TTL)
//   PHRASE_CACHE — 2h TTL, keyed by ticker + bhāva
//
// KV is best-effort. A read or write failure is logged and treated as a
// miss / no-op respectively — the request still proceeds against Yahoo and
// the LLM. The cache exists to save cost, not to gate correctness.

import { isValidBhavaKey } from './meditate.ts'
import type { QuoteEnvelope, PhraseCacheValue } from './meditate-types.ts'

// Cloudflare KV's expirationTtl minimum is 60 seconds. The spec targets a
// 30s window to match the client's 15s polling cadence, but KV's hard floor
// forces 60s. The client still benefits: cache hits are returned for up to
// 60s, capping Yahoo at ~1 call per ticker per minute per user.
export const QUOTE_CACHE_TTL_SECONDS = 60
export const PHRASE_CACHE_TTL_SECONDS = 60 * 60 * 2 // 2h

export function quoteCacheKey(ticker: string): string {
  return `quote:${ticker.toUpperCase()}`
}

export function phraseCacheKey(ticker: string, bhava: string): string {
  return `phrases:${ticker.toUpperCase()}:${bhava}`
}

// Runtime validation: the cached value is typed as QuoteEnvelope but Cloudflare
// KV's get<T>() doesn't validate the shape. A value that's missing `bhava`
// (or any other required field) would crash downstream lookups like
// `BHAVA_TABLE[envelope.bhava].display`. Treat such values as a miss so the
// handler refetches from Yahoo and overwrites the bad entry.
function isValidQuoteEnvelope(value: unknown): value is QuoteEnvelope {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.ticker === 'string' &&
    typeof v.bhava === 'string' &&
    isValidBhavaKey(v.bhava) &&
    typeof v.price === 'number' &&
    typeof v.changePct === 'number' &&
    Array.isArray(v.sparkline)
  )
}

export async function readQuoteCache(
  env: Env,
  ticker: string,
): Promise<{ hit: true; value: QuoteEnvelope } | { hit: false }> {
  const namespace = env.QUOTE_CACHE
  if (!namespace) return { hit: false }

  try {
    const value = await namespace.get<QuoteEnvelope>(quoteCacheKey(ticker))
    if (isValidQuoteEnvelope(value)) return { hit: true, value }
    if (value) {
      console.warn('meditate: discarding malformed quote cache entry', {
        ticker,
        keys: Object.keys(value as Record<string, unknown>),
      })
    }
  } catch (err) {
    console.error('meditate: quote cache read failed', err)
  }
  return { hit: false }
}

export async function writeQuoteCache(
  env: Env,
  ticker: string,
  envelope: QuoteEnvelope,
): Promise<void> {
  const namespace = env.QUOTE_CACHE
  if (!namespace) return

  try {
    await namespace.put(quoteCacheKey(ticker), JSON.stringify(envelope), {
      expirationTtl: QUOTE_CACHE_TTL_SECONDS,
    })
  } catch (err) {
    console.error('meditate: quote cache write failed', err)
  }
}

export async function readPhraseCache(
  env: Env,
  ticker: string,
  bhava: string,
): Promise<{ hit: true; value: PhraseCacheValue } | { hit: false }> {
  const namespace = env.PHRASE_CACHE
  if (!namespace) return { hit: false }

  try {
    const value = await namespace.get<PhraseCacheValue>(
      phraseCacheKey(ticker, bhava),
    )
    if (value && Array.isArray(value.dynamic) && value.dynamic.length === 6) {
      return { hit: true, value }
    }
  } catch (err) {
    console.error('meditate: phrase cache read failed', err)
  }
  return { hit: false }
}

export async function writePhraseCache(
  env: Env,
  ticker: string,
  bhava: string,
  value: PhraseCacheValue,
): Promise<void> {
  const namespace = env.PHRASE_CACHE
  if (!namespace) return

  try {
    await namespace.put(phraseCacheKey(ticker, bhava), JSON.stringify(value), {
      expirationTtl: PHRASE_CACHE_TTL_SECONDS,
    })
  } catch (err) {
    console.error('meditate: phrase cache write failed', err)
  }
}
