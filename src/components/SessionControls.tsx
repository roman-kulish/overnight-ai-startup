// Session controls: Mute toggle + End Session, fixed at bottom-left.
//
// The breath pace indicator lives in its own component
// (BreathPhaseIndicator) at the bottom-centre, and the Buy Me a Coffee
// button is at the bottom-right in AppShell.

import { CircleStop, Volume2, VolumeX } from 'lucide-react'

type Props = {
  muted: boolean
  onToggleMute: () => void
  onEnd: () => void
}

export function SessionControls({ muted, onToggleMute, onEnd }: Props) {
  return (
    <div
      className="fixed bottom-6 left-6 z-30 flex items-center gap-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      role="toolbar"
      aria-label="Session controls"
    >
      <button
        type="button"
        onClick={onToggleMute}
        aria-label={muted ? 'Unmute sound' : 'Mute sound'}
        aria-pressed={muted}
        className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-border/80 bg-panel/90 text-foam shadow-lg shadow-black/40 backdrop-blur-sm transition hover:border-accent/60 hover:text-accent-glow"
      >
        {muted ? (
          <VolumeX className="h-5 w-5" aria-hidden="true" />
        ) : (
          <Volume2 className="h-5 w-5" aria-hidden="true" />
        )}
      </button>

      <button
        type="button"
        onClick={onEnd}
        className="flex h-11 cursor-pointer items-center gap-2 whitespace-nowrap rounded-full border border-border/80 bg-panel/90 px-5 text-sm font-medium text-foam shadow-lg shadow-black/40 backdrop-blur-sm transition hover:border-danger/60 hover:text-danger"
      >
        <CircleStop className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="leading-none">End Session</span>
      </button>
    </div>
  )
}
