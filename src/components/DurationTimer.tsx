// Session duration timer. Clean floating monospace text below the orb
// in the central vertical stack — no pill, no border, just the digits
// with a soft drop shadow. Local 1s interval keeps the clock ticking
// like a wall clock, independent of parent re-renders.

import { useEffect, useState } from 'react'

function formatDuration(ms: number): string {
  const total = Math.floor(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function DurationTimer({ startMs }: { startMs: number | null }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (startMs === null) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [startMs])

  const durationMs = startMs !== null ? Math.max(0, now - startMs) : 0

  return (
    <div
      className="mt-8 mb-1 font-mono text-sm font-semibold tracking-widest text-zinc-300/90 drop-shadow-md"
      aria-label="Session duration"
    >
      {formatDuration(durationMs)}
    </div>
  )
}
