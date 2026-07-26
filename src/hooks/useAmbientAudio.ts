// <audio> element ref + imperative start/stop/mute. The audio element can
// preload="auto" without a user gesture, but .play() requires one.
//
// `begin(src)` is the only function that creates the Audio element, and it
// MUST be called synchronously inside a user-gesture handler (e.g. the
// "Begin Meditation" button click). We can't rely on a useEffect to create
// the audio from a React state update: the state transition (`sessionId` ->
// not null) is scheduled, and the effect runs AFTER the click handler
// returns — too late for the autoplay user-gesture chain. By the time the
// effect runs, the gesture is over and the browser blocks .play().

import { useCallback, useEffect, useRef, useState } from 'react'

export function useAmbientAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const mutedRef = useRef(false)
  const [muted, setMuted] = useState(false)

  useEffect(() => {
    mutedRef.current = muted
    const audio = audioRef.current
    if (audio) audio.muted = muted
  }, [muted])

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      const audio = audioRef.current
      if (audio) {
        audio.pause()
        audio.src = ''
        audioRef.current = null
      }
    }
  }, [])

  const begin = useCallback(async (src: string) => {
    if (!src) return
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
    }
    const audio = new Audio(src)
    audio.loop = true
    audio.preload = 'auto'
    audio.volume = 0.8
    audio.muted = mutedRef.current
    audioRef.current = audio
    try {
      await audio.play()
    } catch {
      // Autoplay blocked or file missing — meditation continues without music.
    }
  }, [])

  const stop = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
  }, [])

  const fadeOut = useCallback((durationSeconds = 1) => {
    const audio = audioRef.current
    if (!audio) return
    const start = audio.volume
    const startTime = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - startTime) / (durationSeconds * 1000))
      audio.volume = Math.max(0, start * (1 - t))
      if (t < 1) requestAnimationFrame(step)
      else audio.pause()
    }
    requestAnimationFrame(step)
  }, [])

  return { begin, stop, fadeOut, muted, setMuted }
}
