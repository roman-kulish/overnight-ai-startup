// Meditate to Your Shares — main page.
// Lifecycle: idle (input) -> loading (8 steps) -> meditating (orb + phrases)
// -> ended (final card).
//
// On begin:
//   1. generate sessionId
//   2. resume audio context + start music (user gesture)
//   3. call /api/meditate {ticker} to fetch the 24-phrase pool
//   4. start the breath cycle, the phrase carousel, and the 15s quote polling
//
// During meditation:
//   - /api/meditate/quote drives the orb display every 15s
//   - when bhava changes between quotes, refetch /api/meditate with lastBhava
//   - phase SFX fire on each new breath phase
//   - polling pauses when the tab is hidden
//
// On end: fade out music, stop rAF, show the final card.

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, Sparkles } from 'lucide-react'
import { BreathingOrb } from '../components/BreathingOrb'
import { BreathPhaseIndicator } from '../components/BreathPhaseIndicator'
import { BhavaLabel } from '../components/BhavaLabel'
import { DurationTimer } from '../components/DurationTimer'
import { PhraseShower } from '../components/PhraseShower'
import { SessionControls } from '../components/SessionControls'
import { getBhavaColors } from '../bhava-colors'
import { pickTrackIndex, MUSIC_CREDIT, MUSIC_SOURCES } from '../audio/credits'
import {
  isSfxMuted,
  playInhaleGong,
  playExhaleChime,
  playShimmer,
  playPriceUp,
  playPriceDown,
  playSessionEnd,
  resumeSfxContext,
  setSfxMuted,
  setSfxReducedMotion,
} from '../audio/sfx'
import { useAmbientAudio } from '../hooks/useAmbientAudio'
import {
  useTickerPolling,
  type Quote,
} from '../hooks/useTickerPolling'
import { useSessionShuffle } from '../hooks/useSessionShuffle'
import type { BreathPhase } from '../hooks/useBreathCycle'
import { BHAVA_COLORS } from '../bhava-colors'

const LOADING_STEPS = [
  'Validating ticker...',
  'Lighting the candles...',
  'Sweeping the dojo...',
  'Fetching the cosmic ledger...',
  'Centering the breath...',
  'Releasing attachment to outcome...',
  'Opening the lotus...',
  'Commencing practice...',
]
const STEP_DURATION_MS = 400
const SESSION_PHRASE_COUNT = 12

type Status = 'idle' | 'loading' | 'meditating' | 'ended'

type Meditation = {
  ticker: string
  longName: string
  currency: string
  price: number
  changePct: number
  sparkline: number[]
  bhava: keyof typeof BHAVA_COLORS
  bhavaTranslation: string
  breathCycle: { in: number; holdIn: number; out: number; holdOut: number }
  phrases: string[]
  poolSize: number
  cached: boolean
}

type MeditationResponse = {
  ok: true
  meditation: Meditation
}

type StepperProps = { stepIndex: number }
function LoadingStepper({ stepIndex }: StepperProps) {
  return (
    <div className="flex flex-col items-center gap-8">
      <div className="relative h-12 w-12">
        <div className="absolute inset-0 animate-ping rounded-full bg-accent/20" />
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-border border-t-accent" />
      </div>
      <div className="space-y-3 text-center">
        <p className="font-cinzel text-base uppercase tracking-[0.3em] text-foam">
          {LOADING_STEPS[stepIndex]}
        </p>
        <div className="mx-auto h-1 w-64 max-w-full overflow-hidden rounded-full bg-border">
          <motion.div
            className="h-full bg-accent"
            initial={{ width: 0 }}
            animate={{ width: `${((stepIndex + 1) / LOADING_STEPS.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <p className="text-xs text-muted">
          Inhale slowly. The market is just breathing too.
        </p>
      </div>
    </div>
  )
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)
  useEffect(() => {
    const media = window.matchMedia(query)
    setMatches(media.matches)
    function handleChange(event: MediaQueryListEvent) {
      setMatches(event.matches)
    }
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [query])
  return matches
}

function formatDuration(ms: number): string {
  const total = Math.floor(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}m ${s.toString().padStart(2, '0')}s`
}

function IdleView({
  onBegin,
  error,
}: {
  onBegin: (ticker: string) => void
  error: string | null
}) {
  const [ticker, setTicker] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = ticker.trim().toUpperCase()
    if (trimmed.length === 0) return
    onBegin(trimmed)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex w-full max-w-xl flex-col items-center gap-6 rounded-3xl border border-border/80 bg-panel/90 p-8 text-center shadow-2xl shadow-black/40 backdrop-blur-sm sm:p-10"
    >
      {error && (
        <div className="flex w-full items-start gap-3 rounded-xl border border-danger/30 bg-danger/10 p-4 text-danger">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-3">
        <h2 className="font-cinzel text-2xl font-semibold uppercase tracking-[0.3em] text-foam">
          Enter a ticker
        </h2>
        <p className="text-sm text-muted">
          Stocks, crypto, ETFs, class shares — TSLA, BTC-USD, SPY, BRK-B.
        </p>
      </div>

      <div className="flex w-full flex-col gap-2">
        <label htmlFor="ticker" className="sr-only">
          Ticker symbol
        </label>
        <input
          ref={inputRef}
          id="ticker"
          type="text"
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          placeholder="AAPL"
          maxLength={10}
          className="w-full rounded-2xl border border-border bg-night/60 px-4 py-3 text-center font-mono text-2xl uppercase tracking-widest text-foam placeholder:text-muted/40 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
        <p className="text-xs text-muted">10 characters max, letters and numbers.</p>
      </div>

      <button
        type="submit"
        disabled={ticker.trim().length === 0}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-accent px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition hover:-translate-y-0.5 hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
      >
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        Begin Meditation
      </button>
    </form>
  )
}

function EndCard({
  ticker,
  bhava,
  durationMs,
  onBeginAnother,
  trackIndex,
}: {
  ticker: string
  bhava: keyof typeof BHAVA_COLORS
  durationMs: number
  onBeginAnother: () => void
  trackIndex: number
}) {
  const credit = MUSIC_CREDIT[trackIndex]
  const colors = BHAVA_COLORS[bhava]
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6 rounded-3xl border border-border/80 bg-panel/90 p-8 text-center shadow-2xl shadow-black/40 backdrop-blur-sm sm:p-10">
      <div className="text-xs font-semibold uppercase tracking-widest text-muted">
        Session complete
      </div>
      <h2 className="font-cinzel text-2xl font-semibold uppercase tracking-[0.3em] text-foam">
        You have meditated.
      </h2>

      <div
        className="font-mono text-sm font-medium uppercase tracking-widest"
        style={{ color: colors.glow }}
      >
        {ticker} · {colors.display} · {formatDuration(durationMs)}
      </div>

      <blockquote className="text-sm italic leading-relaxed text-muted">
        You breathed with the market. It did not notice. You did.
      </blockquote>

      <button
        type="button"
        onClick={onBeginAnother}
        className="mt-2 w-full cursor-pointer rounded-2xl border border-border bg-panel px-6 py-3 text-sm font-semibold text-foam transition hover:-translate-y-0.5 hover:border-accent hover:bg-accent/5"
      >
        Begin another ticker
      </button>

      {credit && (
        <a
          href={credit.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted transition hover:text-foam"
        >
          Music from {credit.hashtag} — {credit.track} by {credit.artist}
        </a>
      )}
    </div>
  )
}

export default function Meditate() {
  const [status, setStatus] = useState<Status>('idle')
  const [ticker, setTicker] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [meditation, setMeditation] = useState<Meditation | null>(null)
  const [liveQuote, setLiveQuote] = useState<Quote | null>(null)
  const [stale, setStale] = useState(false)
  const [phase, setPhase] = useState<BreathPhase>('in')
  const [error, setError] = useState<string | null>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [trackIndex, setTrackIndex] = useState(0)
  const [muted, setMuted] = useState(false)
  const [, setSessionStart] = useState<number | null>(null)
  const [endDuration, setEndDuration] = useState(0)

  const stepIntervalRef = useRef<number | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const sessionStartRef = useRef<number | null>(null)
  const lastPriceRef = useRef<number | null>(null)

  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const { pickSessionPhrases } = useSessionShuffle()

  const ambient = useAmbientAudio()

  // Track mount: SFX reduced motion + initial mute sync.
  useEffect(() => {
    setSfxReducedMotion(prefersReducedMotion)
    setMuted(isSfxMuted())
  }, [prefersReducedMotion])

  // Loading step ticker.
  useEffect(() => {
    if (status !== 'loading') {
      if (stepIntervalRef.current !== null) {
        clearInterval(stepIntervalRef.current)
        stepIntervalRef.current = null
      }
      return
    }
    setStepIndex(0)
    stepIntervalRef.current = window.setInterval(() => {
      setStepIndex((i) => (i + 1 < LOADING_STEPS.length ? i + 1 : i))
    }, STEP_DURATION_MS)
    return () => {
      if (stepIntervalRef.current !== null) {
        clearInterval(stepIntervalRef.current)
        stepIntervalRef.current = null
      }
    }
  }, [status])

  // Unmount cleanup.
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  const activeQuote: Quote | null = liveQuote ?? (meditation
    ? {
        ticker: meditation.ticker,
        longName: meditation.longName,
        currency: meditation.currency,
        price: meditation.price,
        change: 0,
        changePct: meditation.changePct,
        dayHigh: meditation.price,
        dayLow: meditation.price,
        sparkline: meditation.sparkline,
        bhava: meditation.bhava,
        bhavaTranslation: meditation.bhavaTranslation,
        mood: '',
        breathCycle: meditation.breathCycle,
        volatility: 0,
      }
    : null)

  // Quote polling (meditating only).
  useTickerPolling({
    ticker,
    enabled: status === 'meditating',
    onQuote: (quote, isStale) => {
      setLiveQuote(quote)
      setStale(isStale)
      // Price-change SFX.
      const prev = lastPriceRef.current
      if (prev !== null && quote.price !== prev) {
        const deltaPct = prev === 0 ? 0 : ((quote.price - prev) / prev) * 100
        if (deltaPct > 0.5) playPriceUp()
        else if (deltaPct < -0.5) playPriceDown()
      }
      lastPriceRef.current = quote.price
    },
    onBhavaChange: async (newBhava, oldBhava) => {
      if (oldBhava === newBhava) return
      if (!ticker) return
      playShimmer()
      // Refetch the pool for the new bhāva.
      try {
        abortRef.current?.abort()
        const controller = new AbortController()
        abortRef.current = controller
        const response = await fetch('/api/meditate', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ticker, lastBhava: oldBhava }),
          signal: controller.signal,
        })
        const data = (await response.json()) as MeditationResponse | { ok: false; error: string }
        if (data.ok) {
          setMeditation(data.meditation)
        }
      } catch {
        // bhāva refresh is best-effort; the old pool is still valid.
      }
    },
  })

  async function handleBegin(inputTicker: string) {
    setError(null)
    setStatus('loading')
    setTicker(inputTicker)
    setStepIndex(0)
    setMeditation(null)
    setLiveQuote(null)
    setStale(false)
    setSessionStart(null)
    setEndDuration(0)
    lastPriceRef.current = null

    const id = crypto.randomUUID()
    setSessionId(id)
    const track = pickTrackIndex(id)
    setTrackIndex(track)

    // User gesture: resume SFX context, create + start music, THEN begin
    // the network call. The audio element MUST be created synchronously
    // inside this handler — a useEffect-driven creation runs after the
    // gesture ends and the browser blocks .play().
    await resumeSfxContext()
    await ambient.begin(MUSIC_SOURCES[track])

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const response = await fetch('/api/meditate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ticker: inputTicker }),
        signal: controller.signal,
      })
      const data = (await response.json()) as MeditationResponse | { ok: false; error: string }
      if (!data.ok) {
        throw new Error(data.error)
      }
      setMeditation(data.meditation)
      const now = Date.now()
      setSessionStart(now)
      sessionStartRef.current = now
      // First LLM phrase arrival shimmer (or cache hit shimmer — same cue).
      playShimmer()
      setStatus('meditating')
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      ambient.stop()
      setError(err instanceof Error ? err.message : 'Network error')
      setStatus('idle')
    }
  }

  function handleEnd() {
    if (sessionStartRef.current) {
      setEndDuration(Date.now() - sessionStartRef.current)
    }
    playSessionEnd()
    ambient.fadeOut(1)
    setStatus('ended')
  }

  function handleBeginAnother() {
    setStatus('idle')
    setTicker(null)
    setSessionId(null)
    setMeditation(null)
    setLiveQuote(null)
    setStale(false)
    setError(null)
    setSessionStart(null)
    setEndDuration(0)
    sessionStartRef.current = null
  }

  function handleToggleMute() {
    const next = !muted
    setMuted(next)
    // Mute all sound sources: SFX (Web Audio) + ambient music (HTML audio).
    setSfxMuted(next)
    ambient.setMuted(next)
  }

  // Shuffled 12-phrase cycle for this session.
  const sessionPhrases = useMemo(() => {
    if (!meditation || !sessionId) return []
    return pickSessionPhrases(meditation.phrases, sessionId, SESSION_PHRASE_COUNT)
  }, [meditation, sessionId, pickSessionPhrases])

  const meditating = status === 'meditating' && meditation && activeQuote

  return (
    <section
      className="bg-mystic-radial relative min-h-[calc(100vh-64px)] overflow-hidden bg-grid-pattern"
      style={
        meditating
          ? ({ '--orb-color': BHAVA_COLORS[meditation!.bhava].base } as React.CSSProperties)
          : undefined
      }
    >
      <div
        className={
          meditating
            ? 'relative z-10 -mt-8 mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center justify-start px-4 pt-16 pb-24 text-center'
            : 'relative z-10 mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center justify-center px-4 py-12 text-center'
        }
      >
        <div className="mt-2 mb-4 text-center">
          <h1 className="font-serif text-xl font-light uppercase tracking-[0.25em] text-amber-100/60 md:text-3xl">
            Meditate to Your Shares
          </h1>
          {(status === 'idle' || status === 'loading') && (
            <p className="mt-3 font-serif text-base italic text-muted sm:text-lg">
              A mindfulness practice for the financially devastated.
            </p>
          )}
        </div>

        <AnimatePresence mode="wait">
          {status === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <IdleView onBegin={handleBegin} error={error} />
              {MUSIC_CREDIT[0] && (
                <p className="mt-6 text-center text-xs text-muted/70">
                  Music from {MUSIC_CREDIT[0].hashtag} —{' '}
                  {MUSIC_CREDIT.map((c, i) => (
                    <span key={c.url}>
                      {i > 0 && ' · '}
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-foam"
                      >
                        {c.track}
                      </a>
                    </span>
                  ))}
                </p>
              )}
            </motion.div>
          )}

          {status === 'loading' && (
            <motion.div
              key="loading"
              role="status"
              aria-live="polite"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="rounded-3xl border border-border/80 bg-panel/90 p-10 shadow-2xl shadow-black/40"
            >
              <LoadingStepper stepIndex={stepIndex} />
            </motion.div>
          )}

          {meditating && activeQuote && (
            <motion.div
              key="meditating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="relative z-10 mt-12 mx-auto flex min-h-screen w-full flex-col items-center justify-start px-4 text-center"
            >
              <PhraseShower phrases={sessionPhrases} phase={phase} />
              <BhavaLabel
                display={getBhavaColors(activeQuote.bhava).display}
                translation={getBhavaColors(activeQuote.bhava).translation}
              />
              <BreathingOrb
                quote={activeQuote}
                stale={stale}
                enabled
                onPhaseEnter={(p) => {
                  setPhase(p)
                  if (p === 'in') playInhaleGong()
                  else if (p === 'out') playExhaleChime()
                }}
              />
              <DurationTimer startMs={sessionStartRef.current} />
              <BreathPhaseIndicator phase={phase} />
            </motion.div>
          )}

          {meditating && (
            <SessionControls
              muted={muted}
              onToggleMute={handleToggleMute}
              onEnd={handleEnd}
            />
          )}

          {status === 'ended' && meditation && (
            <motion.div
              key="ended"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4 }}
              className="w-full"
            >
              <EndCard
                ticker={meditation.ticker}
                bhava={meditation.bhava}
                durationMs={endDuration}
                trackIndex={trackIndex}
                onBeginAnother={handleBeginAnother}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}
