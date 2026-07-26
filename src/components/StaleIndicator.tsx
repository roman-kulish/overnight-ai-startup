// Tiny italic "stale" marker shown next to the price when the quote came
// from the KV cache (older than the live Yahoo fetch would have been).

export function StaleIndicator({ visible }: { visible: boolean }) {
  if (!visible) return null
  return (
    <span
      className="ml-1 align-baseline text-[0.6em] italic text-muted/70"
      title="Quote from cache — refreshing soon"
    >
      stale
    </span>
  )
}
