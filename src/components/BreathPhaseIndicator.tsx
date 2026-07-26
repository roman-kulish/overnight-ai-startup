// Breath pace indicator: 4 phase dots with a "BREATH PACE:" label.
// Flow element in the central vertical stack, sitting between the
// session timer and the bottom of the stack.

import type { BreathPhase } from '../hooks/useBreathCycle'

const PHASES: { key: BreathPhase; label: string }[] = [
  { key: 'in', label: 'IN' },
  { key: 'holdIn', label: 'HOLD' },
  { key: 'out', label: 'OUT' },
  { key: 'holdOut', label: 'HOLD' },
]

export function BreathPhaseIndicator({ phase }: { phase: BreathPhase }) {
  return (
    <div
      className="mt-1 mb-2 flex items-center justify-center gap-2 rounded-full border border-white/10 bg-black/40 px-4 py-1.5 text-xs text-zinc-300 backdrop-blur-sm"
      role="status"
      aria-label={`Breath phase: ${phase}`}
    >
      <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-400">
        Breath Pace:
      </span>
      {PHASES.map((p) => {
        const active = p.key === phase
        return (
          <div key={p.key} className="flex items-center gap-1">
            <div
              className="h-1.5 w-1.5 rounded-full transition-colors"
              style={{
                backgroundColor: active ? '#a78bfa' : 'rgba(255,255,255,0.3)',
                boxShadow: active ? '0 0 6px #a78bfa' : 'none',
              }}
              aria-hidden="true"
            />
            <span
              className={`text-[0.6rem] uppercase tracking-widest ${
                active ? 'text-foam' : 'text-muted/60'
              }`}
            >
              {p.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
