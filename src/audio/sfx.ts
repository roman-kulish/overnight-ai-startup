// Procedural SFX via Web Audio. No external files. All events route through
// a master gain capped at 0.15 so SFX sit under the music, not on top.
//
// Mute toggle: a single boolean. When muted, all event functions become
// no-ops. The AudioContext is reused across calls (lazy init, no audio
// glitch on cold start) and only created on first call to any event.
//
// prefers-reduced-motion also implies reduced audio: the spec says SFX
// should be suppressed for users who request reduced motion. We honour
// that by short-circuiting event calls.

let context: AudioContext | null = null
let masterGain: GainNode | null = null
let muted = false
let reducedMotion = false

const MASTER_GAIN = 0.15

function ensureContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (context) return context
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    context = new Ctor()
    masterGain = context.createGain()
    masterGain.gain.value = MASTER_GAIN
    masterGain.connect(context.destination)
    return context
  } catch {
    return null
  }
}

export function setSfxMuted(next: boolean) {
  muted = next
  if (masterGain && context) {
    // Smooth ramp to avoid clicks when toggling mid-event.
    const target = next ? 0 : MASTER_GAIN
    masterGain.gain.cancelScheduledValues(context.currentTime)
    masterGain.gain.setTargetAtTime(target, context.currentTime, 0.05)
  }
}

export function setSfxReducedMotion(next: boolean) {
  reducedMotion = next
}

export function isSfxMuted(): boolean {
  return muted
}

// Call from a user-gesture handler to satisfy autoplay policy.
export async function resumeSfxContext(): Promise<void> {
  const ctx = ensureContext()
  if (ctx && ctx.state === 'suspended') {
    try {
      await ctx.resume()
    } catch {
      // best-effort
    }
  }
}

// === Event functions ====================================================

function envelope(
  ctx: AudioContext,
  destination: AudioNode,
  start: number,
  attack: number,
  decay: number,
  peak: number,
) {
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(peak, start + attack)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + attack + decay)
  gain.connect(destination)
  return gain
}

function teardown(nodes: AudioNode[], atSeconds: number) {
  for (const n of nodes) {
    if ('stop' in n && typeof (n as OscillatorNode).stop === 'function') {
      try {
        ;(n as OscillatorNode).stop(atSeconds)
      } catch {
        // already stopped
      }
    }
    try {
      n.disconnect()
    } catch {
      // already disconnected
    }
  }
}

export function playInhaleGong() {
  if (muted || reducedMotion) return
  const ctx = ensureContext()
  if (!ctx || !masterGain) return
  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.value = 110
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 400
  const gain = envelope(ctx, masterGain, now, 0.02, 2.5, 0.12)
  osc.connect(filter)
  filter.connect(gain)
  osc.start(now)
  teardown([osc, filter, gain], now + 2.6)
}

export function playExhaleChime() {
  if (muted || reducedMotion) return
  const ctx = ensureContext()
  if (!ctx || !masterGain) return
  const now = ctx.currentTime
  const filter = ctx.createGain()
  filter.gain.value = 0.06
  filter.connect(masterGain)
  const freqs = [880, 1320]
  const oscs: AudioNode[] = []
  for (const f of freqs) {
    const osc = ctx.createOscillator()
    osc.type = 'triangle'
    osc.frequency.value = f
    const g = envelope(ctx, filter, now, 0.005, 1.8, 0.5)
    osc.connect(g)
    osc.start(now)
    oscs.push(osc, g)
  }
  teardown([...oscs, filter], now + 1.9)
}

export function playShimmer() {
  if (muted || reducedMotion) return
  const ctx = ensureContext()
  if (!ctx || !masterGain) return
  const now = ctx.currentTime
  const freqs = [1200, 1800, 2400, 3000]
  const detunes = [0, 7, -5, 12]
  const oscs: AudioNode[] = []
  for (let i = 0; i < freqs.length; i++) {
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = freqs[i]
    osc.detune.value = detunes[i]
    const g = envelope(ctx, masterGain, now, 0.02, 0.4, 0.05)
    osc.connect(g)
    osc.start(now)
    oscs.push(osc, g)
  }
  teardown(oscs, now + 0.5)
}

export function playPriceUp() {
  if (muted || reducedMotion) return
  const ctx = ensureContext()
  if (!ctx || !masterGain) return
  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.value = 880
  const g = envelope(ctx, masterGain, now, 0.005, 0.6, 0.1)
  osc.connect(g)
  osc.start(now)
  teardown([osc, g], now + 0.7)
}

export function playPriceDown() {
  if (muted || reducedMotion) return
  const ctx = ensureContext()
  if (!ctx || !masterGain) return
  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(400, now)
  osc.frequency.exponentialRampToValueAtTime(180, now + 1.2)
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 800
  const g = envelope(ctx, masterGain, now, 0.05, 1.2, 0.1)
  osc.connect(filter)
  filter.connect(g)
  osc.start(now)
  teardown([osc, filter, g], now + 1.3)
}

export function playSessionEnd() {
  if (muted || reducedMotion) return
  const ctx = ensureContext()
  if (!ctx || !masterGain) return
  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.value = 220
  const g = envelope(ctx, masterGain, now, 0.1, 3, 0.08)
  osc.connect(g)
  osc.start(now)
  teardown([osc, g], now + 3.1)
}
