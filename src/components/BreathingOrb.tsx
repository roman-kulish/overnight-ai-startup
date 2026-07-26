// The hero element. Glassmorphic orb that scales with the breath cycle
// (driven by useBreathCycle via --orb-scale / --orb-glow CSS variables
// written by rAF — no React re-renders per frame).
//
// The orb itself is a flow element in the central vertical stack. The
// Bhāva badge, session timer, and breath pace indicator all live as
// siblings in the stack (see Meditate.tsx).
//
// Enhancements:
//   - Pulsing aura box-shadow that intensifies on inhale and softens on
//     exhale.
//   - Liquid-glass conic-gradient shimmer overlay (slowly rotating).
//   - 8 stardust sparkles orbiting the orb perimeter with staggered
//     upward drift.

import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
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

// 8 evenly-spaced perimeter positions, computed for an inscribed
// circle: x = 50 + 50*sin(θ), y = 50 − 50*cos(θ).
const SPARKLE_POSITIONS: { x: string; y: string }[] = [
  { x: '50%', y: '0%' }, // top
  { x: '85%', y: '15%' }, // top-right
  { x: '100%', y: '50%' }, // right
  { x: '85%', y: '85%' }, // bottom-right
  { x: '50%', y: '100%' }, // bottom
  { x: '15%', y: '85%' }, // bottom-left
  { x: '0%', y: '50%' }, // left
  { x: '15%', y: '15%' }, // top-left
]

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

  // Track the current breath phase so the aura box-shadow can pulse.
  const [phase, setPhase] = useState<BreathPhase>('in')

  useBreathCycle({
    elementRef: orbRef,
    cycle: quote.breathCycle,
    enabled,
    onPhaseEnter: (p) => {
      setPhase(p)
      onPhaseEnter?.(p)
    },
  })

  // The orb's outer glow is keyed by the bhava's soft glow colour. When
  // we don't have a bhava colour yet we fall back to a warm amber so the
  // first frame is never blank.
  const orbGlowColor = colors.soft

  // Inhale = stronger outer glow + brighter inset highlight. Exhale =
  // softer, receded glow. The CSS transition makes the change feel
  // breath-like rather than snappy.
  const isInhale = phase === 'in' || phase === 'holdIn'
  const glassmorphic =
    'inset 0 0 30px rgba(255, 255, 255, 0.18), inset -10px -10px 25px rgba(0, 0, 0, 0.7)'
  const aura = isInhale
    ? '0 0 70px var(--orb-glow-color, rgba(202, 138, 4, 0.4)), inset 0 0 20px rgba(255, 255, 255, 0.1)'
    : '0 0 30px var(--orb-glow-color, rgba(202, 138, 4, 0.2)), inset 0 0 8px rgba(255, 255, 255, 0.04)'

  // Pause the stardust drift under reduced-motion.
  const [reducedMotion, setReducedMotion] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return (
    <div className="relative">
      <div className="relative">
        <div
          ref={orbRef}
          className="breathing-orb relative flex flex-col items-center justify-center overflow-hidden rounded-full"
          style={
            {
              '--orb-base': colors.base,
              '--orb-glow': colors.glow,
              '--orb-glow-soft': colors.soft,
              '--orb-glow-color': orbGlowColor,
              '--orb-color': colors.base,
              '--orb-scale': '1.0',
              boxShadow: `${glassmorphic}, ${aura}`,
              transition:
                'box-shadow 2.5s ease-in-out, --orb-scale 2.5s ease-in-out',
            } as React.CSSProperties
          }
        >
          {/* Liquid-glass shimmer — conic gradient, slowly rotating.
              Sits inside the orb (overflow-hidden) so the highlight
              reads as a wet, refractive surface. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'conic-gradient(from 0deg, transparent 0deg, rgba(255,255,255,0.08) 60deg, transparent 120deg, rgba(255,255,255,0.08) 240deg, transparent 300deg, transparent 360deg)',
              animation: reducedMotion
                ? undefined
                : 'spin 20s linear infinite',
              opacity: 0.12,
              mixBlendMode: 'screen',
            }}
          />

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

        {/* Stardust — 8 amber motes drifting around the orb perimeter.
            Sits outside the overflow-hidden orb so they can rise past
            the edge. Each loops with a unique duration (4–7s) and
            staggered delay. */}
        {!reducedMotion &&
          SPARKLE_POSITIONS.map((pos, i) => {
            const duration = 4 + (i % 4) // 4, 5, 6, or 7 seconds
            const delay = i * 0.4
            return (
              <motion.div
                key={i}
                aria-hidden="true"
                className="pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-amber-200/90 shadow-[0_0_8px_rgba(251,191,36,0.8)]"
                style={{
                  left: pos.x,
                  top: pos.y,
                  filter: 'blur(0.5px)',
                  transform: 'translate(-50%, -50%)',
                }}
                initial={{ opacity: 0, scale: 0.5, y: 0 }}
                animate={{
                  opacity: [0, 0.9, 0],
                  scale: [0.5, 1.2, 0.5],
                  y: [0, -18, -36],
                }}
                transition={{
                  duration,
                  delay,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            )
          })}
      </div>
    </div>
  )
}
