// POST /api/meditate/quote
// Fast quote polling endpoint. No LLM. KV-cached for 30s. Used by the client
// every 15s while the meditation runs. Returns the full quote envelope plus
// a `stale` flag so the UI can mark cached data.

import { jsonResponse, parseJson } from './shared.ts'
import { detectInjection } from '../middleware/promptInjection.ts'
import { readQuoteCache, writeQuoteCache } from './meditate-kv.ts'
import {
  buildQuoteEnvelope,
  fetchYahooQuote,
  parseYahooQuote,
  validateTicker,
  YahooError,
} from './meditate.ts'

export default async function handleMeditateQuote(
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

  const cached = await readQuoteCache(env, ticker)
  if (cached.hit) {
    return jsonResponse({ ok: true, quote: cached.value, stale: true })
  }

  try {
    const yahooData = await fetchYahooQuote(ticker)
    const parsed = parseYahooQuote(ticker, yahooData)
    const envelope = buildQuoteEnvelope(ticker, parsed)
    await writeQuoteCache(env, ticker, envelope)
    return jsonResponse({ ok: true, quote: envelope, stale: false })
  } catch (err) {
    if (err instanceof YahooError) {
      if (err.kind === 'not_found') {
        return jsonResponse({ ok: false, error: 'Ticker not found' }, 400)
      }
      if (err.kind === 'rate_limited') {
        return jsonResponse({ ok: false, error: 'Quote feed unavailable, try again' }, 502)
      }
    }
    console.error('meditate/quote: yahoo fetch failed', err)
    return jsonResponse({ ok: false, error: 'Quote feed unavailable' }, 502)
  }
}
