import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import handleMeditate, {
  buildQuoteEnvelope,
  computeBhava,
  computeBreathCycle,
  computeDirection,
  computeMood,
  computeVolatility,
  fetchYahooQuote,
  isValidBhavaKey,
  parsePhrasesFromLLMOutput,
  parseYahooQuote,
  pickSessionPhrases,
  validateTicker,
  YahooError,
} from './meditate.ts';
import handleMeditateQuote from './meditate-quote.ts';
import { STATIC_PHRASES, ALL_BHAVA_KEYS } from './meditate-static-phrases.ts';

// === Mocks ==============================================================

const MODEL = '@cf/meta/llama-3.2-3b-instruct';
const GATEWAY = 'meditate';

type MockKV = KVNamespace & { _store: Map<string, unknown> }

type TestEnv = Omit<Env, 'QUOTE_CACHE' | 'PHRASE_CACHE'> & {
  QUOTE_CACHE: MockKV
  PHRASE_CACHE: MockKV
}

function createMockKV(): MockKV {
  const store = new Map<string, unknown>()
  const kv = {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    put: vi.fn(async (key: string, value: string) => {
      store.set(key, JSON.parse(value))
    }),
    delete: vi.fn(),
    list: vi.fn(),
    getWithMetadata: vi.fn(),
    _store: store,
  }
  return kv as unknown as MockKV
}

function seedKV(kv: MockKV, key: string, value: unknown) {
  kv._store.set(key, value)
}

function createEnv(opts: {
  quoteCache?: MockKV;
  phraseCache?: MockKV;
  aiResponse?: unknown;
} = {}): TestEnv {
  return {
    AI: {
      run: vi.fn().mockResolvedValue(opts.aiResponse ?? { response: 'PHRASE: a' }),
    } as unknown as Env['AI'],
    QUOTE_CACHE: opts.quoteCache ?? createMockKV(),
    PHRASE_CACHE: opts.phraseCache ?? createMockKV(),
    MODEL_MEDITATE: MODEL,
    AI_GATEWAY_MEDITATE: GATEWAY,
  } as unknown as TestEnv;
}

function postRequest(url: string, body: object): Request {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function yahooResponse(price: number, prev: number, closes: number[]): unknown {
  return {
    chart: {
      result: [
        {
          meta: {
            regularMarketPrice: price,
            chartPreviousClose: prev,
            regularMarketDayHigh: price + 1,
            regularMarketDayLow: price - 1,
            currency: 'USD',
            fullExchangeName: 'NASDAQ',
            longName: 'Test Co',
          },
          indicators: {
            quote: [{ close: closes }],
          },
        },
      ],
      error: null,
    },
  };
}

function mockYahooResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

let fetchSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  fetchSpy = vi.spyOn(globalThis, 'fetch');
});
afterEach(() => {
  fetchSpy.mockRestore();
});

// === validateTicker =====================================================

describe('validateTicker', () => {
  it('uppercases lowercase tickers', () => {
    expect(validateTicker('tsla')).toEqual({ valid: true, sanitized: 'TSLA' });
  });

  it('accepts an already-uppercased ticker', () => {
    expect(validateTicker('AAPL')).toEqual({ valid: true, sanitized: 'AAPL' });
  });

  it('accepts crypto and BRK-style tickers with hyphens', () => {
    expect(validateTicker('BTC-USD')).toEqual({ valid: true, sanitized: 'BTC-USD' });
  });

  it('rejects tickers with invalid characters', () => {
    expect(validateTicker('aapl!')).toEqual({ valid: false, error: expect.any(String) });
  });

  it('rejects tickers that are too long', () => {
    expect(validateTicker('TOOLONGTICKER')).toEqual({ valid: false, error: expect.any(String) });
  });

  it('rejects an empty string', () => {
    expect(validateTicker('')).toEqual({ valid: false, error: expect.any(String) });
  });
});

// === isValidBhavaKey ====================================================

describe('isValidBhavaKey', () => {
  it('accepts the six canonical keys', () => {
    for (const k of ALL_BHAVA_KEYS) expect(isValidBhavaKey(k)).toBe(true);
  });

  it('rejects unknown strings', () => {
    expect(isValidBhavaKey('sunyata')).toBe(false);
    expect(isValidBhavaKey('DUKKHA')).toBe(false);
    expect(isValidBhavaKey('')).toBe(false);
  });
});

// === computeBhava =======================================================

describe('computeBhava', () => {
  it('returns Sunyata for change < -3%', () => {
    expect(computeBhava(-5, 0.02)).toBe('Sunyata');
  });

  it('returns Dukkha for change in -3%..-1%', () => {
    expect(computeBhava(-2, 0.01)).toBe('Dukkha');
  });

  it('returns Upekkha for flat change with low volatility', () => {
    expect(computeBhava(0, 0.005)).toBe('Upekkha');
  });

  it('returns Sankhara for flat change with high volatility', () => {
    expect(computeBhava(0, 0.04)).toBe('Sankhara');
  });

  it('returns Piti for change in +1%..+3%', () => {
    expect(computeBhava(2, 0.02)).toBe('Piti');
  });

  it('returns Moha for change > +3%', () => {
    expect(computeBhava(5, 0.01)).toBe('Moha');
  });
});

// === computeDirection ===================================================

describe('computeDirection', () => {
  it('returns up for positive changes', () => {
    expect(computeDirection(0.5)).toBe('up');
  });

  it('returns down for negative changes', () => {
    expect(computeDirection(-0.5)).toBe('down');
  });

  it('returns flat for changes within the deadzone', () => {
    expect(computeDirection(0)).toBe('flat');
    expect(computeDirection(0.05)).toBe('flat');
    expect(computeDirection(-0.05)).toBe('flat');
  });
});

// === computeVolatility ==================================================

describe('computeVolatility', () => {
  it('returns a non-negative number for a series of closes', () => {
    const v = computeVolatility([100, 101, 99, 102, 98, 100, 103]);
    expect(v).toBeGreaterThan(0);
  });

  it('returns 0 for an empty series', () => {
    expect(computeVolatility([])).toBe(0);
  });

  it('returns 0 for a single price', () => {
    expect(computeVolatility([100])).toBe(0);
  });

  it('returns 0 for a flat series', () => {
    expect(computeVolatility([100, 100, 100])).toBe(0);
  });
});

// === computeBreathCycle =================================================

describe('computeBreathCycle', () => {
  it('returns the fast cycle for high volatility and down direction', () => {
    expect(computeBreathCycle('high', 'down')).toEqual({
      in: 3, holdIn: 4, out: 5, holdOut: 4,
    });
  });

  it('returns the deep cycle for low volatility and flat direction', () => {
    expect(computeBreathCycle('low', 'flat')).toEqual({
      in: 5, holdIn: 7, out: 8, holdOut: 7,
    });
  });
});

// === computeMood ========================================================

describe('computeMood', () => {
  it('labels a flat low-vol day as still', () => {
    expect(computeMood('flat', 0.005)).toBe('still');
  });

  it('labels an up day with high volatility as volatile climb', () => {
    expect(computeMood('up', 0.04)).toBe('volatile climb');
  });
});

// === parsePhrasesFromLLMOutput ==========================================

describe('parsePhrasesFromLLMOutput', () => {
  it('parses 6 PHRASE:-delimited lines', () => {
    const out = parsePhrasesFromLLMOutput(
      'PHRASE: a\nPHRASE: b\nPHRASE: c\nPHRASE: d\nPHRASE: e\nPHRASE: f\n',
    );
    expect(out).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
  });

  it('pads short output to 6 with the fallback phrase', () => {
    const out = parsePhrasesFromLLMOutput('PHRASE: a\nPHRASE: b\n');
    expect(out).toHaveLength(6);
    expect(out[0]).toBe('a');
    expect(out[1]).toBe('b');
    expect(out.slice(2)).toEqual([
      'Breathe in, and notice you are still here.',
      'Breathe in, and notice you are still here.',
      'Breathe in, and notice you are still here.',
      'Breathe in, and notice you are still here.',
    ]);
  });

  it('returns 6 fallback phrases when input has no PHRASE: markers', () => {
    const out = parsePhrasesFromLLMOutput('not delimited');
    expect(out).toHaveLength(6);
    expect(out.every((p) => p === 'Breathe in, and notice you are still here.')).toBe(true);
  });

  it('takes the first 6 when input has more', () => {
    const out = parsePhrasesFromLLMOutput(
      'PHRASE: a\nPHRASE: b\nPHRASE: c\nPHRASE: d\nPHRASE: e\nPHRASE: f\nPHRASE: g\n',
    );
    expect(out).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
  });
});

// === pickSessionPhrases =================================================

describe('pickSessionPhrases', () => {
  it('returns the same output for the same sessionId', () => {
    const pool = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l'];
    const first = pickSessionPhrases(pool, 'session-123', 6);
    const second = pickSessionPhrases(pool, 'session-123', 6);
    expect(first).toEqual(second);
  });

  it('returns different outputs for different sessionIds', () => {
    const pool = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l'];
    const a = pickSessionPhrases(pool, 'session-A', 6);
    const b = pickSessionPhrases(pool, 'session-B', 6);
    expect(a).not.toEqual(b);
  });

  it('returns the requested count', () => {
    const pool = Array.from({ length: 24 }, (_, i) => `p${i}`);
    expect(pickSessionPhrases(pool, 's', 12)).toHaveLength(12);
  });

  it('returns all phrases when pool is smaller than the count', () => {
    expect(pickSessionPhrases(['a', 'b'], 's', 12)).toEqual(['a', 'b']);
  });
});

// === STATIC_PHRASES =====================================================

describe('STATIC_PHRASES', () => {
  it('contains 18 phrases for every bhava', () => {
    for (const k of ALL_BHAVA_KEYS) {
      expect(STATIC_PHRASES[k]).toHaveLength(18);
    }
  });

  it('contains no banned words in any phrase', () => {
    // Phrase-level ("inner peace") -> raw contains.
    // Word-level ("yourself") -> word-boundary match so substrings inside
    // other words don't trigger false positives.
    const phrases: string[] = ['inner peace']
    const words: string[] = ['center', 'present', 'wealth', 'money', 'stock', 'crypto', 'yourself']
    for (const k of ALL_BHAVA_KEYS) {
      for (const phrase of STATIC_PHRASES[k]) {
        const lower = phrase.toLowerCase()
        for (const phrase_banned of phrases) {
          expect(lower).not.toContain(phrase_banned)
        }
        for (const word of words) {
          const re = new RegExp(`\\b${word}\\b`)
          expect(lower).not.toMatch(re)
        }
      }
    }
  });
});

// === Yahoo parsing ======================================================

describe('parseYahooQuote', () => {
  it('throws YahooError(not_found) when chart.error is present', () => {
    expect(() => parseYahooQuote('TSLA', { chart: { error: { code: 'Not Found' } } })).toThrow(
      YahooError,
    );
  });

  it('returns parsed values for a valid response', () => {
    const parsed = parseYahooQuote(
      'TSLA',
      yahooResponse(110, 100, [95, 97, 99, 100, 101, 103, 105, 107, 108, 109, 110]) as never,
    );
    expect(parsed.price).toBe(110);
    expect(parsed.change).toBe(10);
    expect(parsed.changePct).toBe(10);
    expect(parsed.currency).toBe('USD');
    expect(parsed.longName).toBe('Test Co');
    expect(parsed.sparkline).toHaveLength(11);
  });
});

describe('fetchYahooQuote', () => {
  it('throws YahooError(rate_limited) on 429', async () => {
    fetchSpy.mockResolvedValue(mockYahooResponse({}, 429));
    await expect(fetchYahooQuote('TSLA')).rejects.toMatchObject({ kind: 'rate_limited' });
  });

  it('throws YahooError(upstream_error) on 500', async () => {
    fetchSpy.mockResolvedValue(mockYahooResponse({}, 500));
    await expect(fetchYahooQuote('TSLA')).rejects.toMatchObject({ kind: 'upstream_error' });
  });
});

// === buildQuoteEnvelope =================================================

describe('buildQuoteEnvelope', () => {
  it('produces a complete envelope for a flat low-vol input', () => {
    const parsed = parseYahooQuote(
      'SPY',
      yahooResponse(100, 100, [100, 100, 100, 100, 100, 100, 100, 100, 100, 100]) as never,
    );
    const env = buildQuoteEnvelope('SPY', parsed);
    expect(env.ticker).toBe('SPY');
    expect(env.bhava).toBe('Upekkha');
    expect(env.bhavaTranslation).toBe('Equanimity');
    expect(env.mood).toBe('still');
    expect(env.breathCycle).toEqual({ in: 5, holdIn: 7, out: 8, holdOut: 7 });
  });
});

// === POST /api/meditate/quote ==========================================

describe('POST /api/meditate/quote', () => {
  it('returns a quote with stale=false on cache miss', async () => {
    const env = createEnv();
    fetchSpy.mockResolvedValue(
      mockYahooResponse(
        yahooResponse(110, 100, [95, 97, 99, 100, 101, 103, 105, 107, 108, 109, 110]),
      ),
    );
    const res = await handleMeditateQuote(
      env,
      postRequest('http://localhost/api/meditate/quote', { ticker: 'TSLA' }),
      '127.0.0.1',
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      ok: true;
      quote: { ticker: string; price: number };
      stale: boolean;
    };
    expect(json.ok).toBe(true);
    expect(json.quote.ticker).toBe('TSLA');
    expect(json.stale).toBe(false);
  });

  it('returns a quote with stale=true on cache hit', async () => {
    const env = createEnv();
    const cached = {
      ticker: 'AAPL',
      longName: 'Apple',
      currency: 'USD',
      price: 200,
      change: 1,
      changePct: 0.5,
      dayHigh: 201,
      dayLow: 199,
      sparkline: [198, 199, 200],
      bhava: 'Piti' as const,
      bhavaTranslation: 'Rapture',
      mood: 'calm ascent',
      breathCycle: { in: 4, holdIn: 5, out: 6, holdOut: 5 },
      volatility: 0.005,
      generatedAt: 1000,
    };
    seedKV(env.QUOTE_CACHE, 'quote:AAPL', cached);
    const res = await handleMeditateQuote(
      env,
      postRequest('http://localhost/api/meditate/quote', { ticker: 'AAPL' }),
      '127.0.0.1',
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: true; quote: typeof cached; stale: boolean };
    expect(json.stale).toBe(true);
    expect(json.quote.price).toBe(200);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('treats a corrupt cache entry (missing bhava) as a miss and refetches', async () => {
    // Regression for the production crash: a stale cache entry with a
    // missing or invalid `bhava` field used to slip through and crash
    // `buildMeditateMessages` when the LLM was called. Now readQuoteCache
    // validates the shape and falls through to Yahoo.
    const env = createEnv();
    // Missing every required field except price — the validator rejects it.
    seedKV(env.QUOTE_CACHE, 'quote:TSLA', { ticker: 'TSLA', price: 100 });
    fetchSpy.mockResolvedValue(
      mockYahooResponse(
        yahooResponse(110, 100, [95, 97, 99, 100, 101, 103, 105, 107, 108, 109, 110]),
      ),
    );
    const res = await handleMeditateQuote(
      env,
      postRequest('http://localhost/api/meditate/quote', { ticker: 'TSLA' }),
      '127.0.0.1',
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: true; quote: { ticker: string }; stale: boolean };
    expect(json.stale).toBe(false);
    expect(json.quote.ticker).toBe('TSLA');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('treats a cache entry with an unknown bhava as a miss', async () => {
    const env = createEnv();
    seedKV(env.QUOTE_CACHE, 'quote:TSLA', {
      ticker: 'TSLA',
      longName: 'Tesla',
      currency: 'USD',
      price: 100,
      change: 0,
      changePct: 0,
      dayHigh: 100,
      dayLow: 100,
      sparkline: [99, 100, 101],
      bhava: 'NotARealBhava', // <-- invalid
      bhavaTranslation: '?',
      mood: '?',
      breathCycle: { in: 4, holdIn: 5, out: 6, holdOut: 5 },
      volatility: 0.01,
      generatedAt: 0,
    });
    fetchSpy.mockResolvedValue(
      mockYahooResponse(
        yahooResponse(110, 100, [95, 97, 99, 100, 101, 103, 105, 107, 108, 109, 110]),
      ),
    );
    const res = await handleMeditateQuote(
      env,
      postRequest('http://localhost/api/meditate/quote', { ticker: 'TSLA' }),
      '127.0.0.1',
    );
    expect(res.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('rejects an invalid ticker with 400', async () => {
    const env = createEnv();
    const res = await handleMeditateQuote(
      env,
      postRequest('http://localhost/api/meditate/quote', { ticker: 'aapl!' }),
      '127.0.0.1',
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when Yahoo says the ticker is not found', async () => {
    const env = createEnv();
    fetchSpy.mockResolvedValue(
      mockYahooResponse({ chart: { result: null, error: { code: 'Not Found' } } }),
    );
    const res = await handleMeditateQuote(
      env,
      postRequest('http://localhost/api/meditate/quote', { ticker: 'NOPE' }),
      '127.0.0.1',
    );
    expect(res.status).toBe(400);
    const json = (await res.json()) as { ok: false; error: string };
    expect(json.error).toContain('Ticker not found');
  });

  it('returns 502 when Yahoo rate-limits us', async () => {
    const env = createEnv();
    fetchSpy.mockResolvedValue(mockYahooResponse({}, 429));
    const res = await handleMeditateQuote(
      env,
      postRequest('http://localhost/api/meditate/quote', { ticker: 'TSLA' }),
      '127.0.0.1',
    );
    expect(res.status).toBe(502);
  });
});

// === POST /api/meditate ================================================

function yahooBodyForBhava(bhava: 'Dukkha' | 'Sunyata' | 'Piti') {
  // -5% for Sunyata, -2% for Dukkha, +2% for Piti
  const prices = {
    Dukkha: { price: 98, prev: 100 },
    Sunyata: { price: 95, prev: 100 },
    Piti: { price: 102, prev: 100 },
  }[bhava];
  return yahooResponse(prices.price, prices.prev, [
    99, 99.5, 99, 99.5, 99, 99.5, 99, 99.5, 99, 99.5, prices.price,
  ]);
}

describe('POST /api/meditate', () => {
  it('returns a full pool on first call, cached=false', async () => {
    const env = createEnv({
      aiResponse: {
        response:
          'PHRASE: phrase one\nPHRASE: phrase two\nPHRASE: phrase three\nPHRASE: phrase four\nPHRASE: phrase five\nPHRASE: phrase six\n',
      },
    });
    fetchSpy.mockResolvedValue(mockYahooResponse(yahooBodyForBhava('Dukkha')));

    const res = await handleMeditate(
      env,
      postRequest('http://localhost/api/meditate', { ticker: 'TSLA' }),
      '127.0.0.1',
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      ok: true;
      meditation: { phrases: string[]; poolSize: number; cached: boolean; bhava: string };
    };
    expect(json.meditation.cached).toBe(false);
    expect(json.meditation.bhava).toBe('Dukkha');
    // 6 dynamic + 18 static = 24
    expect(json.meditation.poolSize).toBe(24);
    expect(json.meditation.phrases).toHaveLength(24);
    expect(json.meditation.phrases[0]).toBe('phrase one');
  });

  it('rejects an invalid ticker with 400', async () => {
    const env = createEnv();
    const res = await handleMeditate(
      env,
      postRequest('http://localhost/api/meditate', { ticker: 'aapl!' }),
      '127.0.0.1',
    );
    expect(res.status).toBe(400);
  });

  it('rejects prompt-injection input with 400 and does not call the AI', async () => {
    // The ticker regex limits input to [A-Z0-9-] so a real prompt injection
    // can't reach the AI. But the injection check still runs on the
    // uppercased value. Verify the AI is not called for malformed input.
    const env = createEnv();
    const res = await handleMeditate(
      env,
      postRequest('http://localhost/api/meditate', { ticker: 'aapl!' }),
      '127.0.0.1',
    );
    expect(res.status).toBe(400);
    expect(env.AI.run as ReturnType<typeof vi.fn>).not.toHaveBeenCalled();
  });

  it('rejects an invalid lastBhava with 400', async () => {
    const env = createEnv();
    fetchSpy.mockResolvedValue(mockYahooResponse(yahooBodyForBhava('Dukkha')));
    const res = await handleMeditate(
      env,
      postRequest('http://localhost/api/meditate', { ticker: 'TSLA', lastBhava: 'NotARealKey' }),
      '127.0.0.1',
    );
    expect(res.status).toBe(400);
  });

  it('returns cached=true on a second call with the same bhava, no LLM call', async () => {
    // Pre-populate both caches: quote and phrase for (TSLA, Dukkha).
    const env = createEnv();
    const quoteEnvelope = buildQuoteEnvelope(
      'TSLA',
      parseYahooQuote('TSLA', yahooBodyForBhava('Dukkha') as never),
    );
    seedKV(env.QUOTE_CACHE, 'quote:TSLA', quoteEnvelope);
    seedKV(env.PHRASE_CACHE, 'phrases:TSLA:Dukkha', {
      dynamic: ['d1', 'd2', 'd3', 'd4', 'd5', 'd6'],
      generatedAt: 1000,
    });

    const res = await handleMeditate(
      env,
      postRequest('http://localhost/api/meditate', {
        ticker: 'TSLA',
        lastBhava: 'Dukkha',
      }),
      '127.0.0.1',
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      ok: true;
      meditation: { cached: boolean; phrases: string[] };
    };
    expect(json.meditation.cached).toBe(true);
    expect(json.meditation.phrases).toHaveLength(24);
    expect(json.meditation.phrases.slice(0, 6)).toEqual(['d1', 'd2', 'd3', 'd4', 'd5', 'd6']);
    expect(env.AI.run as ReturnType<typeof vi.fn>).not.toHaveBeenCalled();
  });

  it('calls the LLM again when the bhava changes between calls', async () => {
    // Quote cache is empty so we always hit Yahoo. The Yahoo mock returns
    // prices that compute to Sunyata. The phrase cache for (TSLA, Sunyata)
    // is empty (only Dukkha is pre-seeded), so the LLM fires once.
    const env = createEnv({
      aiResponse: {
        response:
          'PHRASE: p1\nPHRASE: p2\nPHRASE: p3\nPHRASE: p4\nPHRASE: p5\nPHRASE: p6\n',
      },
    });
    // Pre-populate phrase cache for Dukkha only.
    seedKV(env.PHRASE_CACHE, 'phrases:TSLA:Dukkha', {
      dynamic: ['d1', 'd2', 'd3', 'd4', 'd5', 'd6'],
      generatedAt: 1000,
    });

    const res = await handleMeditate(
      env,
      postRequest('http://localhost/api/meditate', {
        ticker: 'TSLA',
        lastBhava: 'Dukkha',
      }),
      '127.0.0.1',
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      ok: true;
      meditation: { cached: boolean; bhava: string };
    };
    // New bhava (Sunyata) -> cache miss -> LLM called -> cached=false
    expect(json.meditation.bhava).toBe('Sunyata');
    expect(json.meditation.cached).toBe(false);
    expect(env.AI.run as ReturnType<typeof vi.fn>).toHaveBeenCalledTimes(1);
  });

  it('returns 502 when the AI call fails', async () => {
    const env = {
      ...createEnv(),
      AI: { run: vi.fn().mockRejectedValue(new Error('AI service unavailable')) } as unknown as Env['AI'],
    } as unknown as Env;
    fetchSpy.mockResolvedValue(mockYahooResponse(yahooBodyForBhava('Dukkha')));
    const res = await handleMeditate(
      env,
      postRequest('http://localhost/api/meditate', { ticker: 'TSLA' }),
      '127.0.0.1',
    );
    expect(res.status).toBe(502);
  });
});
