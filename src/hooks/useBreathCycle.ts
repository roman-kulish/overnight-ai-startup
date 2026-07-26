// requestAnimationFrame loop that writes the orb's transform scale and glow
// intensity directly to a CSS variable on the element. No React re-renders
// per frame — 60fps guaranteed, even on mobile.
//
// The cycle is in -> holdIn -> out -> holdOut (seconds). The orb scales
// from 0.85 to 1.15 across the inhale, holds at 1.15 during holdIn, scales
// back to 0.85 across the exhale, and holds at 0.85 during holdOut. The
// glow intensity follows the same shape.
//
// IMPORTANT — two anti-snap guards:
//   1. Callbacks are stored in refs and the rAF effect depends only on the
//      cycle values + enabled. A parent that passes a fresh inline
//      function each render would otherwise tear down and restart the rAF
//      on every render, snapping the orb back to MIN_SCALE.
//   2. The start time is preserved in a ref across re-runs that don't
//      change the cycle. If a quote update ever does change the cycle
//      (different volatility bucket / direction), the breath starts a
//      new cycle from t=0 — otherwise the rAF continues from where it
//      was. Without this guard, every parent re-render that doesn't
//      change the cycle would still cause a "start = performance.now()"
//      reset, which is the click-causes-orb-to-contract bug.

import { useEffect, useRef, type RefObject } from 'react'

export type BreathPhase = 'in' | 'holdIn' | 'out' | 'holdOut'

export type BreathCycle = {
  in: number
  holdIn: number
  out: number
  holdOut: number
}

const MIN_SCALE = 0.85
const MAX_SCALE = 1.15
const MIN_GLOW = 0.5
const MAX_GLOW = 1.0

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t)
}

type Params = {
  elementRef: RefObject<HTMLElement | null>
  cycle: BreathCycle
  enabled: boolean
  onPhaseEnter?: (phase: BreathPhase) => void
}

function cycleKey(c: BreathCycle): string {
  return `${c.in}|${c.holdIn}|${c.out}|${c.holdOut}`
}

export function useBreathCycle({ elementRef, cycle, enabled, onPhaseEnter }: Params) {
  // Keep the latest callback in a ref so the rAF loop can invoke it
  // without re-binding the effect on every parent render.
  const onPhaseEnterRef = useRef(onPhaseEnter)
  useEffect(() => {
    onPhaseEnterRef.current = onPhaseEnter
  }, [onPhaseEnter])

  // Preserve the rAF start time across re-runs that don't change the
  // cycle. Reset only when the cycle actually changes or when the hook
  // is re-enabled after being disabled.
  const startRef = useRef<number | null>(null)
  const cycleKeyRef = useRef<string>('')

  useEffect(() => {
    const el = elementRef.current
    if (!el || !enabled) {
      // Reset the start time when disabled so the next enable starts a
      // fresh breath rather than picking up mid-cycle.
      startRef.current = null
      return
    }

    const key = cycleKey(cycle)
    if (cycleKeyRef.current !== key || startRef.current === null) {
      startRef.current = performance.now()
      cycleKeyRef.current = key
    }
    const start = startRef.current

    let raf = 0
    let lastPhase: BreathPhase = 'in'

    const totalMs = (cycle.in + cycle.holdIn + cycle.out + cycle.holdOut) * 1000

    const tick = (now: number) => {
      const elapsed = (now - start) % totalMs

      let phase: BreathPhase
      let phaseT: number
      let scale: number
      let glow: number

      const inMs = cycle.in * 1000
      const holdInMs = inMs + cycle.holdIn * 1000
      const outMs = holdInMs + cycle.out * 1000

      if (elapsed < inMs) {
        phase = 'in'
        phaseT = elapsed / inMs
        const eased = smoothstep(phaseT)
        scale = MIN_SCALE + (MAX_SCALE - MIN_SCALE) * eased
        glow = MIN_GLOW + (MAX_GLOW - MIN_GLOW) * eased
      } else if (elapsed < holdInMs) {
        phase = 'holdIn'
        phaseT = (elapsed - inMs) / (cycle.holdIn * 1000)
        scale = MAX_SCALE
        glow = MAX_GLOW
      } else if (elapsed < outMs) {
        phase = 'out'
        phaseT = (elapsed - holdInMs) / (cycle.out * 1000)
        const eased = smoothstep(phaseT)
        scale = MAX_SCALE - (MAX_SCALE - MIN_SCALE) * eased
        glow = MAX_GLOW - (MAX_GLOW - MIN_GLOW) * eased
      } else {
        phase = 'holdOut'
        phaseT = (elapsed - outMs) / (cycle.holdOut * 1000)
        scale = MIN_SCALE
        glow = MIN_GLOW
      }

      el.style.setProperty('--orb-scale', scale.toFixed(3))
      el.style.setProperty('--orb-glow', glow.toFixed(3))

      if (phase !== lastPhase) {
        lastPhase = phase
        onPhaseEnterRef.current?.(phase)
      }

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      // Do NOT reset --orb-scale here. The next rAF tick will set the
      // correct value, and resetting causes a visible snap if the effect
      // re-runs (e.g. when the cycle changes from a quote update).
    }
  }, [elementRef, cycle.in, cycle.holdIn, cycle.out, cycle.holdOut, enabled])
}
