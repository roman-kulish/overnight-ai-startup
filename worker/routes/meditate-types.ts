// Shared types for the meditate backend.
// Kept in a separate module so both the main handler, the quote handler,
// the KV helpers, and the test file can import from one place.

export type BhavaKey = 'Sunyata' | 'Dukkha' | 'Upekkha' | 'Sankhara' | 'Piti' | 'Moha'

export type BhavaInfo = {
  key: BhavaKey
  // ASCII-safe name (matches the cache key). For display the UI
  // also has a diacritic-rich version (e.g. "Śūnyatā") but we keep
  // the canonical identifier ASCII for KV, log lines, and tests.
  display: string
  translation: string
  color: string // hex
}

export type Direction = 'up' | 'down' | 'flat'

export type BreathCycle = {
  in: number
  holdIn: number
  out: number
  holdOut: number
}

export type SparklinePoint = number

export type QuoteEnvelope = {
  ticker: string
  longName: string
  currency: string
  price: number
  change: number
  changePct: number
  dayHigh: number
  dayLow: number
  sparkline: SparklinePoint[]
  bhava: BhavaKey
  bhavaTranslation: string
  mood: string
  breathCycle: BreathCycle
  volatility: number
  generatedAt: number
}

export type PhraseCacheValue = {
  dynamic: string[]
  generatedAt: number
}

export type MeditateEnvelope = QuoteEnvelope & {
  phrases: string[]
  poolSize: number
  cached: boolean
}

export type YahooChartResult = {
  meta?: {
    regularMarketPrice?: number
    chartPreviousClose?: number
    regularMarketDayHigh?: number
    regularMarketDayLow?: number
    currency?: string
    fullExchangeName?: string
    longName?: string
  }
  indicators?: {
    quote?: Array<{
      close?: Array<number | null>
    }>
  }
}

export type YahooChartResponse = {
  chart?: {
    result?: YahooChartResult[]
    error?: { code?: string; description?: string } | null
  }
}

export const BHAVA_TABLE: Record<BhavaKey, Omit<BhavaInfo, 'key'>> = {
  Sunyata: { display: 'Śūnyatā', translation: 'Emptiness', color: '#7f1d1d' },
  Dukkha: { display: 'Dukkha', translation: 'Suffering', color: '#991b1b' },
  Upekkha: { display: 'Upekkhā', translation: 'Equanimity', color: '#ca8a04' },
  Sankhara: { display: 'Saṅkhāra', translation: 'Formation', color: '#d97706' },
  Piti: { display: 'Pīti', translation: 'Rapture', color: '#15803d' },
  Moha: { display: 'Moha', translation: 'Delusion', color: '#22c55e' },
}

// Defensive lookup. Returns the BHAVA_TABLE entry for `key` if it's a
// recognised BhavaKey, otherwise falls back to Upekkha (equanimity). Used
// at every read of the bhāva table to keep the meditation running even
// if the KV cache returns a corrupt or unknown value.
export function getBhava(
  key: unknown,
): Omit<BhavaInfo, 'key'> & { key: BhavaKey } {
  if (typeof key === 'string' && key in BHAVA_TABLE) {
    return { key: key as BhavaKey, ...BHAVA_TABLE[key as BhavaKey] }
  }
  return { key: 'Upekkha', ...BHAVA_TABLE.Upekkha }
}
