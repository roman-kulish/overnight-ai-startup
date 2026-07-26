// The hero element. Glassmorphic orb that scales with the breath cycle
// (driven by useBreathCycle via --orb-scale / --orb-glow CSS variables
// written by rAF — no React re-renders per frame).
//
// The orb itself is a flow element in the central vertical stack. The
// Bhāva badge, session timer, and breath pace indicator all live as
// siblings in the stack (see Meditate.tsx).

import { useRef } from 'react'
import type { Quote } from '../hooks/useTickerPolling'
import { useBreathCycle, type BreathPhase } from '../hooks/useBreathCycle'
import { Sparkline } from './Sparkline'
import { StaleIndicator } from './StaleIndicator'
import { getBhavaColors } from '../bhava-colors'

type Props = {
  quote: Quote
  stale: boolean
  enabled: boolean
  onPhaseEnter?: (phase: BreathPhase) => void
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

export function BreathingOrb({ quote, stale, enabled, onPhaseEnter }: Props) {
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
      <div className="font-mono text-sm font-bold uppercase tracking-[0.2em] text-zinc-300 mb-1">
        {quote.ticker}
      </div>
      <div
        className="font-mono text-3xl font-medium tabular-nums"
        style={{ color: colors.text }}
      >
        {formatPrice(quote.price, quote.currency)}
      </div>
      <div
        className="mt-1 font-mono text-sm font-semibold tracking-wide"
        style={{ color: isUp ? '#34d399' : '#f87171' }}
      >
        {formatChange(quote.changePct)}
      </div>
      <div className="absolute bottom-4 left-4 right-4">
        <Sparkline data={quote.sparkline} height={28} />
      </div>
      <StaleIndicator visible={stale} />
    </div>
  )
}
