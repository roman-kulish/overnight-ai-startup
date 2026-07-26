// Polls /api/meditate/quote every 15 seconds while the session is active.
// Pauses on document.visibilitychange === 'hidden'. On focus, fires
// immediately. Notifies the caller on every quote, and separately when
// the bhava changes between quotes (used to trigger a phrase refresh).

import { useEffect, useRef } from 'react'

export type Quote = {
  ticker: string
  longName: string
  currency: string
  price: number
  change: number
  changePct: number
  dayHigh: number
  dayLow: number
  sparkline: number[]
  bhava: string
  bhavaTranslation: string
  mood: string
  breathCycle: { in: number; holdIn: number; out: number; holdOut: number }
  volatility: number
}

export type QuoteResponse = {
  ok: true
  quote: Quote
  stale: boolean
}

type Params = {
  ticker: string | null
  enabled: boolean
  onQuote: (quote: Quote, stale: boolean) => void
  onBhavaChange: (newBhava: string, oldBhava: string) => void
  onError?: (error: string) => void
  pollIntervalMs?: number
}

export function useTickerPolling({
  ticker,
  enabled,
  onQuote,
  onBhavaChange,
  onError,
  pollIntervalMs = 15_000,
}: Params) {
  const lastBhavaRef = useRef<string | null>(null)
  const onQuoteRef = useRef(onQuote)
  const onBhavaChangeRef = useRef(onBhavaChange)
  const onErrorRef = useRef(onError)

  // Keep refs current without re-binding the polling effect.
  useEffect(() => {
    onQuoteRef.current = onQuote
    onBhavaChangeRef.current = onBhavaChange
    onErrorRef.current = onError
  }, [onQuote, onBhavaChange, onError])

  useEffect(() => {
    if (!enabled || !ticker) return

    let interval: number | null = null
    let stopped = false
    let inFlight = false

    async function fetchQuote() {
      if (stopped || inFlight) return
      inFlight = true
      try {
        const response = await fetch('/api/meditate/quote', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ticker }),
        })
        if (stopped) return
        const data = (await response.json()) as
          | QuoteResponse
          | { ok: false; error: string }
        if (!data.ok) {
          onErrorRef.current?.(data.error)
          return
        }
        const prev = lastBhavaRef.current
        const next = data.quote.bhava
        lastBhavaRef.current = next
        onQuoteRef.current(data.quote, data.stale)
        if (prev !== null && prev !== next) {
          onBhavaChangeRef.current(next, prev)
        }
      } catch (err) {
        if (stopped) return
        onErrorRef.current?.(err instanceof Error ? err.message : 'Network error')
      } finally {
        inFlight = false
      }
    }

    function visibilityHandler() {
      if (document.visibilityState === 'hidden') {
        if (interval !== null) {
          clearInterval(interval)
          interval = null
        }
        return
      }
      // Resumed — fire immediately, then resume the interval.
      fetchQuote()
      if (interval === null) {
        interval = window.setInterval(fetchQuote, pollIntervalMs)
      }
    }

    // Initial fetch + interval (skipped if tab is hidden on mount).
    if (document.visibilityState !== 'hidden') {
      fetchQuote()
      interval = window.setInterval(fetchQuote, pollIntervalMs)
    }
    document.addEventListener('visibilitychange', visibilityHandler)

    return () => {
      stopped = true
      if (interval !== null) clearInterval(interval)
      document.removeEventListener('visibilitychange', visibilityHandler)
    }
  }, [ticker, enabled, pollIntervalMs])
}
