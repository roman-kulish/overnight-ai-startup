import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame, RefreshCcw, AlertCircle, TrendingDown } from 'lucide-react'

interface RoastMeta {
  text: string
  valuation: number
  stage: string
}

interface StreamMeta {
  valuation: number
  stage: string
}

type ApiResponse = { ok: false; error: string } | { ok: true; roast: RoastMeta }

const LOADING_STEPS = [
  'Analyzing Pitch...',
  'Identifying Buzzwords...',
  'Evaluating Total Addressable Market...',
  'Projecting Burn Rate...',
  'Detecting Fake Differentiation...',
  'Building Fictitious Cap Table...',
  'Simulating Due Diligence...',
  'Generating Valuation Spreadsheet...',
  'Contacting Imaginary LPs...',
  'Preparing Roast...',
  'Serving Verdict...',
]

const STEP_DURATION_MS = 650

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
  const current = useCountdown(valuation, 2500)
  return (
    <span aria-label={`Implied valuation crashing from ${formatValuation(valuation)} to $0.00`}>
      <span className="tabular-nums" aria-hidden="true">
        {formatValuation(current)}
      </span>
    </span>
  )
}

function processSSEBuffer(
  buffer: string,
  handlers: {
    onToken: (token: string) => void
    onMeta: (meta: StreamMeta) => void
    onDone: () => void
    onError: (error: string) => void
  },
): string {
  const parts = buffer.split('\n\n')
  const remainder = parts.pop() ?? ''

  for (const part of parts) {
    for (const line of part.split('\n')) {
      if (!line.startsWith('data:')) continue
      const data = line.slice(5).trim()
      if (!data) continue

      try {
        const payload = JSON.parse(data) as Record<string, unknown>

        if (typeof payload.error === 'string') {
          handlers.onError(payload.error)
          return remainder
        }

        if (typeof payload.token === 'string') {
          handlers.onToken(payload.token)
        }

        if (
          (typeof payload.valuation === 'number' ||
            typeof payload.stage === 'string') &&
          payload.valuation !== undefined
        ) {
          handlers.onMeta(payload as unknown as StreamMeta)
        }

        if (payload.done === true) {
          handlers.onDone()
        }
      } catch {
        // Ignore malformed chunks.
      }
    }
  }

  return remainder
}

async function readEventStream(
  response: Response,
  signal: AbortSignal,
  handlers: {
    onToken: (token: string) => void
    onMeta: (meta: StreamMeta) => void
    onDone: () => void
    onError: (error: string) => void
  },
) {
  if (!response.body) {
    handlers.onError('No response body')
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (!signal.aborted) {
      const { done, value } = await reader.read()
      if (done) {
        processSSEBuffer(buffer, handlers)
        break
      }

      buffer += decoder.decode(value, { stream: true })
      buffer = processSSEBuffer(buffer, handlers)
    }
  } catch (err) {
    if (!signal.aborted) {
      handlers.onError(err instanceof Error ? err.message : 'Stream failed')
    }
  } finally {
    reader.releaseLock()
  }
}

export default function Roast() {
  const [pitch, setPitch] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'roasting' | 'success' | 'error'>('idle')
  const [result, setResult] = useState<RoastMeta | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [streamedText, setStreamedText] = useState('')
  const [stepIndex, setStepIndex] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const finalTextRef = useRef('')

  const stepIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function stopLoadingTicker() {
    if (stepIntervalRef.current) {
      clearInterval(stepIntervalRef.current)
      stepIntervalRef.current = null
    }
  }

  useEffect(() => {
    if (status !== 'loading') {
      stopLoadingTicker()
      return
    }

    setStepIndex(0)
    stepIntervalRef.current = setInterval(() => {
      setStepIndex((i) => (i + 1 < LOADING_STEPS.length ? i + 1 : i))
    }, STEP_DURATION_MS)

    return () => stopLoadingTicker()
  }, [status])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      stopLoadingTicker()
    }
  }, [])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    const trimmed = pitch.trim()
    if (!trimmed || status === 'loading' || status === 'roasting') return

    setStatus('loading')
    setError(null)
    setResult(null)
    setStreamedText('')
    setStepIndex(0)
    finalTextRef.current = ''

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const response = await fetch('/api/roast', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ input: trimmed, stream: true }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const data = (await response.json()) as ApiResponse
        throw new Error(!data.ok ? data.error : 'Request failed')
      }

      if (response.headers.get('content-type')?.includes('text/event-stream')) {
        await readEventStream(
          response,
          controller.signal,
          {
            onToken: (token) => {
              finalTextRef.current += token
              setStreamedText((prev) => prev + token)
              // Don't transition to 'roasting' here - wait for metadata
            },
            onMeta: (meta) => {
              setResult((prev) => ({
                text: prev?.text ?? '',
                valuation: meta.valuation,
                stage: meta.stage,
              }))
              setStatus((current) => (current === 'loading' ? 'roasting' : current))
            },
            onDone: () => {
              setResult((prev) => ({
                text: finalTextRef.current,
                valuation: prev?.valuation ?? 0,
                stage: prev?.stage ?? '',
              }))
              setStatus('success')
              stopLoadingTicker()
            },
            onError: (message) => {
              setError(message)
              setStatus('error')
              stopLoadingTicker()
            },
          },
        )
      } else {
        const data = (await response.json()) as ApiResponse
        if (!data.ok) {
          throw new Error(data.error)
        }
        setResult(data.roast)
        setStatus('success')
        stopLoadingTicker()
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return
      }
      setError(err instanceof Error ? err.message : 'Network error')
      setStatus('error')
      stopLoadingTicker()
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
    setStreamedText('')
    setStepIndex(0)
    finalTextRef.current = ''
    textareaRef.current?.focus()
  }

  const paragraphs = useMemo(() => {
    const text = status === 'success' ? result?.text ?? streamedText : streamedText
    return text.split('\n\n').filter(Boolean)
  }, [streamedText, result, status])

  return (
    <div className="relative min-h-[calc(100vh-64px)] overflow-hidden bg-roast-radial bg-grid-pattern">
      <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12 md:py-16">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foam sm:text-4xl">
            Venture Capital Roast Deck
          </h1>
          <p className="mt-2 text-sm font-medium uppercase tracking-widest text-accent sm:text-base">
            Every buzzword pumps the hype. The implied valuation tells the truth.
          </p>
          {(status === 'idle' || status === 'error') && (
            <p className="mt-3 text-muted">
              Submit your one-sentence startup pitch below for institutional evaluation.<br />
              Ensure your submission is heavily optimized with industry-standard terminology and
              emerging tech jargon.<br />
              Each buzzword systematically scales your implied baseline valuation by $1,000,000.
            </p>
          )}
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
              className="mx-auto w-full max-w-2xl rounded-3xl border border-border/80 bg-panel/90 p-6 shadow-2xl shadow-black/40 backdrop-blur-sm sm:p-10"
            >
              {error && (
                <div className="mb-5 flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/10 p-4 text-danger">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <div className="flex flex-col gap-3">
                <label htmlFor="pitch" className="text-sm font-medium text-foam">
                  Your one-sentence pitch
                </label>
                <textarea
                  ref={textareaRef}
                  id="pitch"
                  value={pitch}
                  onChange={(e) => setPitch(e.target.value)}
                  placeholder="Powdered water: a B2C Solute-as-a-Service platform requiring zero initial hydration infrastructure."
                  rows={5}
                  maxLength={500}
                  className="w-full resize-none rounded-2xl border border-border bg-night/60 p-4 text-foam placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
                <div className="flex justify-between text-xs text-muted">
                  <span>500 characters max</span>
                  <span>{pitch.length}/500</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={!pitch.trim()}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-danger px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-danger/25 transition hover:-translate-y-0.5 hover:bg-danger/90 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
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
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="mx-auto flex w-full max-w-2xl flex-col items-center gap-8 rounded-3xl border border-border/80 bg-panel/90 p-10 text-center shadow-2xl shadow-black/40"
            >
              <div className="relative h-12 w-12">
                <div className="absolute inset-0 animate-ping rounded-full bg-danger/30" />
                <div className="h-12 w-12 animate-spin rounded-full border-2 border-border border-t-danger" />
              </div>

              <div className="space-y-3">
                <p className="text-lg font-semibold text-foam">{LOADING_STEPS[stepIndex]}</p>
                <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-border">
                  <motion.div
                    className="h-full bg-danger"
                    initial={{ width: 0 }}
                    animate={{ width: `${((stepIndex + 1) / LOADING_STEPS.length) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="text-sm text-muted">Crunching imaginary numbers...</p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col items-center gap-8 px-4 mt-8 mx-auto w-full max-w-6xl md:flex-row md:items-start"
            >
              {/* CEO Avatar - 2x larger and aligned with thought bubble */}
              <div className="flex-shrink-0 md:pt-8">
                <img
                  src="/images/ceo-persona.png"
                  alt="Virtual VC Partner"
                  className="w-96 md:w-[28rem] h-auto object-contain drop-shadow-[0_0_40px_rgba(0,0,0,0.6)]"
                />
              </div>

              {/* Thought Bubble Result */}
              <div className="relative flex-1 w-full">
                {/* Mobile Pointer - Pointing up at the stacked avatar above it */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 block h-6 w-6 rotate-45 border-t border-l border-border/80 bg-panel/95 md:hidden" />

                {/* Desktop Pointer - Pointing left at the avatar's mouth area */}
                <div className="absolute -left-3 top-16 hidden h-6 w-6 rotate-45 border-b border-l border-border/80 bg-panel/95 md:block" />

                <div className="rounded-3xl border border-border/80 bg-panel/95 p-6 shadow-2xl shadow-black/40 backdrop-blur-sm sm:p-8">
                  <div className="flex w-full flex-col items-center gap-3 sm:flex-row sm:items-center sm:justify-center sm:gap-8">
                    <div className="text-center sm:text-left">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                        Hype Valuation
                      </p>
                      <p className="text-3xl font-black tabular-nums text-accent drop-shadow-[0_0_10px_rgba(139,92,246,0.5)] sm:text-4xl">
                        {result?.valuation !== undefined ? formatValuation(result.valuation) : '—'}
                      </p>
                    </div>

                    <TrendingDown className="hidden h-8 w-8 text-danger sm:block" aria-hidden="true" />

                    <div className="text-center sm:text-left">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                        Implied Valuation
                      </p>
                      <p className="animate-neon text-3xl font-black tabular-nums text-danger sm:text-4xl">
                        {result?.valuation !== undefined ? (
                          <ValuationTicker valuation={result.valuation} />
                        ) : (
                          <span className="opacity-50">Calculating...</span>
                        )}
                      </p>
                      <p className="mt-1 text-sm text-muted">
                        <span className="font-medium">Current stage:</span>{' '}
                        <span className="text-foam">{result?.stage || 'TBD'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 border-t border-border/60 pt-6">
                    <div className="h-1 w-16 rounded-full bg-danger" />
                    <div className="mt-4 space-y-4 text-foam">
                      {paragraphs.map((paragraph, index) => (
                        <p key={index} className="leading-relaxed">
                          {paragraph}
                        </p>
                      ))}
                      {status === 'roasting' && (
                        <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-danger" />
                      )}
                    </div>
                  </div>

                  {status === 'success' && (
                    <button
                      type="button"
                      onClick={handleReset}
                      className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-panel px-6 py-3 text-sm font-semibold text-foam transition hover:-translate-y-0.5 hover:border-accent hover:bg-accent/5"
                    >
                      <RefreshCcw className="h-4 w-4" aria-hidden="true" />
                      Roast another idea
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
