// The hero element. Glassmorphic orb that scales with the breath cycle
// (driven by useBreathCycle via --orb-scale / --orb-glow CSS variables
// written by rAF — no React re-renders per frame).
//
// The orb displays the ticker, live price, change %, a 30-day sparkline,
// and a 4-dot phase indicator below. The bhāva label is rendered above
// the orb as a full-width row (centred subtitle) — works on both mobile
// and desktop, no clipping.

import { useRef } from 'react'
import type { Quote } from '../hooks/useTickerPolling'
import { useBreathCycle, type BreathPhase } from '../hooks/useBreathCycle'
import { Sparkline } from './Sparkline'
import { StaleIndicator } from './StaleIndicator'
import { getBhavaColors } from '../bhava-colors'

type Props = {
  quote: Quote
  stale: boolean
  phase: BreathPhase
  enabled: boolean
  onPhaseEnter?: (phase: BreathPhase) => void
  durationMs?: number
}

function formatPrice(price: number, currency: string): string {
  const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : ''
  return `${symbol}${price.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatChange(changePct: number): string {
  const sign = changePct >= 0 ? '+' : ''
  return `${sign}${changePct.toFixed(2)}%`
}

function formatDuration(ms: number): string {
  const total = Math.floor(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

const PHASES: { key: BreathPhase }[] = [
  { key: 'in' },
  { key: 'holdIn' },
  { key: 'out' },
  { key: 'holdOut' },
]

export function BreathingOrb({ quote, stale, phase, enabled, onPhaseEnter, durationMs = 0 }: Props) {
  const orbRef = useRef<HTMLDivElement | null>(null)
  const colors = getBhavaColors(quote.bhava)
  const isUp = quote.changePct >= 0

  useBreathCycle({
    elementRef: orbRef,
    cycle: quote.breathCycle,
    enabled,
    onPhaseEnter,
  })

  return (
    <div className="relative flex flex-col items-center">
      {/* Bhāva label — full-width row above the orb, centred */}
      <div className="mb-4 text-center" aria-label="Current bhāva">
        <div
          className="font-cinzel text-sm uppercase tracking-[0.4em]"
          style={{ color: colors.glow }}
        >
          {colors.display}
        </div>
        <div className="mt-1 text-xs italic text-muted">{colors.translation}</div>
      </div>

      <div
        ref={orbRef}
        className="breathing-orb relative flex flex-col items-center justify-center overflow-hidden rounded-full"
        style={
          {
            '--orb-base': colors.base,
            '--orb-glow': colors.glow,
            '--orb-glow-soft': colors.soft,
            '--orb-color': colors.base,
            '--orb-scale': '1.0',
          } as React.CSSProperties
        }
      >
        <div className="font-cinzel text-[0.7rem] uppercase tracking-[0.4em] text-foam/80">
          {quote.ticker}
        </div>
        <div
          className="mt-1 font-mono text-3xl font-medium tabular-nums"
          style={{ color: colors.text }}
        >
          {formatPrice(quote.price, quote.currency)}
        </div>
        <div
          className="mt-1 font-mono text-sm font-medium tabular-nums"
          style={{ color: isUp ? colors.changeUp : colors.changeDown }}
        >
          {formatChange(quote.changePct)}
        </div>
        <div className="absolute bottom-4 left-4 right-4">
          <Sparkline data={quote.sparkline} color={colors.glow} height={28} />
        </div>
        <StaleIndicator visible={stale} />
      </div>

      {/* Phase indicator — 4 dots, no labels (cleaner on mobile) */}
      <div
        className="mt-6 flex items-center gap-3"
        aria-label={`Breath cycle: ${phase}`}
      >
        {PHASES.map((p) => {
          const active = p.key === phase
          return (
            <div
              key={p.key}
              className="h-2 w-2 rounded-full transition-all"
              style={{
                backgroundColor: active ? colors.glow : 'rgba(155, 163, 176, 0.25)',
                boxShadow: active ? `0 0 10px ${colors.glow}` : 'none',
                transform: active ? 'scale(1.4)' : 'scale(1)',
              }}
              aria-hidden="true"
            />
          )
        })}
      </div>

      {/* Session duration counter */}
      <div className="mt-3 font-mono text-xs uppercase tracking-widest text-muted/60">
        {formatDuration(durationMs)}
      </div>
    </div>
  )
}
