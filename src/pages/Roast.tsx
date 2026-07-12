import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame, RefreshCcw, AlertCircle, TrendingDown } from 'lucide-react'

type RoastResult = {
  text: string
  valuation: number
  stage: string
}

type ApiResponse =
  | { ok: false; error: string }
  | { ok: true; roast: RoastResult }

const LOADING_STEPS = [
  'Analyzing Pitch...',
  'Evaluating TAM...',
  'Projecting Burn Rate...',
  'Preparing Roast...',
]

const TICK_DURATION_MS = 3500

function formatValuation(value: number): string {
  return `$${Math.max(0, value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function useCountdown(from: number, duration: number) {
  const [value, setValue] = useState(from)
  const startRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    setValue(from)
    startRef.current = null

    const step = (timestamp: number) => {
      if (startRef.current === null) {
        startRef.current = timestamp
      }

      const elapsed = timestamp - startRef.current
      const progress = Math.min(1, elapsed / duration)
      const current = Math.max(0, from * (1 - progress))
      setValue(current)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step)
      }
    }

    rafRef.current = requestAnimationFrame(step)

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [from, duration])

  return value
}

function ValuationTicker({ valuation }: { valuation: number }) {
  const current = useCountdown(valuation, TICK_DURATION_MS)
  return (
    <span aria-label={`Peak valuation ${formatValuation(valuation)}`}>
      <span className="tabular-nums" aria-hidden="true">
        {formatValuation(current)}
      </span>
    </span>
  )
}

export default function Roast() {
  const [pitch, setPitch] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [result, setResult] = useState<RoastResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (status !== 'loading') return

    const interval = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, LOADING_STEPS.length - 1))
    }, 900)

    return () => clearInterval(interval)
  }, [status])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    const trimmed = pitch.trim()
    if (!trimmed || status === 'loading') return

    setStatus('loading')
    setError(null)
    setResult(null)
    setStepIndex(0)

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const response = await fetch('/api/roast', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ input: trimmed }),
        signal: controller.signal,
      })

      const data = (await response.json()) as ApiResponse

      if (!response.ok || !data.ok) {
        setStatus('error')
        setError('error' in data ? data.error : 'Something went wrong')
        return
      }

      setResult(data.roast)
      setStatus('success')
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return
      }
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null
      }
    }
  }

  function handleReset() {
    setPitch('')
    setStatus('idle')
    setResult(null)
    setError(null)
    setStepIndex(0)
    textareaRef.current?.focus()
  }

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-12">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-danger/10">
          <Flame className="h-6 w-6 text-danger" aria-hidden="true" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foam sm:text-4xl">
          VC Roast Pitch Deck
        </h1>
        <p className="mt-3 text-muted">
          Submit your billion-dollar AI idea. We'll tear it apart with Silicon Valley precision.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {status === 'idle' || status === 'error' ? (
          <motion.form
            key="input"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            onSubmit={handleSubmit}
            className="flex flex-col gap-5"
          >
            {error && (
              <div className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/10 p-4 text-danger">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label htmlFor="pitch" className="text-sm font-medium text-foam">
                Your one-sentence pitch
              </label>
              <textarea
                ref={textareaRef}
                id="pitch"
                value={pitch}
                onChange={(e) => setPitch(e.target.value)}
                placeholder="An AI that reminds me to drink water."
                rows={4}
                maxLength={500}
                className="w-full resize-none rounded-2xl border border-border bg-panel p-4 text-foam placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
              <div className="flex justify-between text-xs text-muted">
                <span>500 characters max</span>
                <span>{pitch.length}/500</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={!pitch.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-danger px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-danger/25 transition hover:-translate-y-0.5 hover:bg-danger/90 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              <Flame className="h-4 w-4" aria-hidden="true" />
              Roast my pitch
            </button>
          </motion.form>
        ) : status === 'loading' ? (
          <motion.div
            key="loading"
            role="status"
            aria-live="polite"
            aria-label={LOADING_STEPS[stepIndex]}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col items-center gap-6 rounded-3xl border border-border bg-panel p-10 text-center"
          >
            <div className="relative">
              <div className="h-12 w-12 animate-spin rounded-full border-2 border-border border-t-accent" />
            </div>

            <div className="space-y-2">
              <p className="text-lg font-semibold text-foam">{LOADING_STEPS[stepIndex]}</p>
              <p className="text-sm text-muted">Crunching imaginary numbers...</p>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-night px-5 py-3 text-sm text-muted">
              <TrendingDown className="h-4 w-4 text-danger" aria-hidden="true" />
              <span>Valuation:</span>
              <span className="tabular-nums text-foam">pending</span>
            </div>
          </motion.div>
        ) : (
          result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col gap-6 rounded-3xl border border-border bg-panel p-8 shadow-2xl shadow-danger/5"
            >
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Input
                </p>
                <p className="text-lg font-medium italic text-foam">"{pitch.trim()}"</p>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-night px-5 py-4">
                <div className="flex items-center gap-2 text-sm text-muted">
                  <TrendingDown className="h-4 w-4 text-danger" aria-hidden="true" />
                  <span>Valuation:</span>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold tabular-nums text-danger">
                    <ValuationTicker valuation={result.valuation} />
                  </p>
                  <p className="text-xs text-muted">({result.stage})</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="h-1 w-16 rounded-full bg-danger" />
                <div className="space-y-4 text-foam">
                  {result.text.split('\n\n').map((paragraph, index) => (
                    <p key={index} className="leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-panel px-6 py-3 text-sm font-semibold text-foam transition hover:-translate-y-0.5 hover:border-accent hover:bg-accent/5"
              >
                <RefreshCcw className="h-4 w-4" aria-hidden="true" />
                Roast another idea
              </button>
            </motion.div>
          )
        )}
      </AnimatePresence>

      <p className="text-center text-xs text-muted/60">
        Not investment advice. Not even good advice.
      </p>
    </section>
  )
}
