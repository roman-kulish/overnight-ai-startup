// Phrase display around the orb.
//
// Desktop (>= md): 6-slot hex pattern, each slot absolutely positioned
//   around the orb. Phrases crossfade in/out every ~10s, staggered so all
//   6 slots don't change at once. The slot offset is constrained to keep
//   the diagonal phrases inside the viewport at laptop widths.
//
// Mobile (< md): one phrase at a time, centered below the orb, crossfading
//   every ~10s. Matches the Calm/Headspace pattern — one focal point.

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'

const SLOT_DURATION_MS = 10_000

type Props = {
  phrases: string[]
}

const phraseVariants = {
  initial: { opacity: 0, scale: 0.92, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 1.5, ease: 'easeOut' as const } },
  exit: { opacity: 0, scale: 0.92, y: -8, transition: { duration: 1.5, ease: 'easeIn' as const } },
}

const mobileVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 1.5, ease: 'easeInOut' as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 1.5, ease: 'easeInOut' as const } },
}

// Hex positions for desktop, measured from the orb's centre as a percent
// of the containing block. Tuned so the diagonal phrases don't clip at
// 1366-1440px laptop widths.
const HEX_POSITIONS: { x: string; y: string }[] = [
  { x: '50%', y: '0%' }, // top
  { x: '92%', y: '20%' }, // upper right
  { x: '92%', y: '80%' }, // lower right
  { x: '50%', y: '100%' }, // bottom
  { x: '8%', y: '80%' }, // lower left
  { x: '8%', y: '20%' }, // upper left
]

export function PhraseShower({ phrases }: Props) {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (phrases.length === 0) return
    const id = setInterval(() => setTick((t) => t + 1), SLOT_DURATION_MS)
    return () => clearInterval(id)
  }, [phrases.length])

  if (phrases.length === 0) return null

  // Pick one phrase per desktop slot and one overall phrase for mobile.
  const mobileIndex = tick % phrases.length

  return (
    <>
      {/* Desktop: 6-slot hex around the orb */}
      <div
        className="pointer-events-none absolute inset-0 hidden md:block"
        aria-hidden="true"
      >
        {HEX_POSITIONS.map((pos, i) => {
          const index = (i + tick * 6) % phrases.length
          const phrase = phrases[index]
          return (
            <div
              key={i}
              className="phrase-slot"
              style={{
                left: pos.x,
                top: pos.y,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <AnimatePresence mode="sync">
                <motion.div
                  key={`${i}-${tick}`}
                  variants={phraseVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  {phrase}
                </motion.div>
              </AnimatePresence>
            </div>
          )
        })}
      </div>

      {/* Mobile: single phrase, centered below the orb, crossfading */}
      <div className="mt-8 flex h-24 items-center justify-center px-8 text-center md:hidden">
        <AnimatePresence mode="wait">
          <motion.p
            key={mobileIndex}
            variants={mobileVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="font-serif italic leading-relaxed text-foam/90"
          >
            {phrases[mobileIndex]}
          </motion.p>
        </AnimatePresence>
      </div>
    </>
  )
}
