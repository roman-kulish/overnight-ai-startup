// Central "Orb Emergence" phrase animation.
//
// A single phrase that sits in the central vertical stack above the
// Bhāva badge. Each new breath cycle advances the index; the phrase
// emerges from `y: 10` through a `blur(8px)` haze to a crisp rest
// position, then exits upward through the same haze to `y: -10`.

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import type { BreathPhase } from '../hooks/useBreathCycle'

type Props = {
  phrases: string[]
  phase: BreathPhase
}

const IN_DURATION = 1.6
const OUT_DURATION = 1.2

export function PhraseShower({ phrases, phase }: Props) {
  const [phraseIndex, setPhraseIndex] = useState(0)
  const previousPhaseRef = useRef<BreathPhase | null>(null)

  // Advance the index at the holdOut → in boundary. The exit animation
  // for the old phrase and the enter animation for the new one overlap
  // around this transition.
  useEffect(() => {
    if (previousPhaseRef.current === 'holdOut' && phase === 'in') {
      setPhraseIndex((i) => (i + 1) % Math.max(phrases.length, 1))
    }
    previousPhaseRef.current = phase
  }, [phase, phrases.length])

  if (phrases.length === 0) return null

  return (
    <div
      className="mx-auto mb-2 flex w-full max-w-xl items-center justify-center px-4 text-center"
      style={{ minHeight: '56px' }}
      aria-live="polite"
      aria-atomic="true"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={phraseIndex}
          initial={{ opacity: 0, filter: 'blur(8px)', scale: 0.95, y: 10 }}
          animate={{
            opacity: 1,
            filter: 'blur(0px)',
            scale: 1,
            y: 0,
            transition: { duration: IN_DURATION, ease: 'easeOut' },
          }}
          exit={{
            opacity: 0,
            filter: 'blur(8px)',
            scale: 1.05,
            y: -10,
            transition: { duration: OUT_DURATION, ease: 'easeIn' },
          }}
          className="font-serif text-2xl font-medium leading-relaxed tracking-wide text-white/95 drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] md:text-3xl"
        >
          {phrases[phraseIndex]}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}