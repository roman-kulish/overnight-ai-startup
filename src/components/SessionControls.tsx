// Session controls row.
//
// Layout: both buttons sit together on the left side of the row, in
// document flow (not fixed) so the row stays above the AppShell footer
// and the Buy Me a Coffee button.
//
// Sound button: icon-only circle.
// End Session: icon + label.

import { CircleStop, Volume2, VolumeX } from 'lucide-react'

type Props = {
  muted: boolean
  onToggleMute: () => void
  onEnd: () => void
}

export function SessionControls({ muted, onToggleMute, onEnd }: Props) {
  return (
    <div
      className="flex w-full items-center justify-start gap-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2"
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
