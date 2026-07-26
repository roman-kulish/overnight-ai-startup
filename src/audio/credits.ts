// Uppbeat music credits. Each session picks one track at random
// (seeded with sessionId) and shows this attribution in the end-session
// card and the idle-view footer.

export type MusicCredit = {
  artist: string
  track: string
  url: string
  hashtag: '#Uppbeat'
}

export const MUSIC_CREDIT = [
  {
    artist: 'Adi Goldstein',
    track: 'Getting Lighter',
    url: 'https://uppbeat.io/t/adi-goldstein/getting-lighter',
    hashtag: '#Uppbeat',
  },
  {
    artist: 'RA',
    track: 'Worldview',
    url: 'https://uppbeat.io/t/ra/worldview',
    hashtag: '#Uppbeat',
  },
  {
    artist: 'Enzalla',
    track: 'Above',
    url: 'https://uppbeat.io/t/enzalla/above',
    hashtag: '#Uppbeat',
  },
] as const satisfies readonly MusicCredit[]

// File paths for the <audio> element. Indexed parallel to MUSIC_CREDIT.
export const MUSIC_SOURCES = [
  '/audio/ambient-01.mp3',
  '/audio/ambient-02.mp3',
  '/audio/ambient-03.mp3',
] as const

export function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }
  return h >>> 0
}

export function pickTrackIndex(sessionId: string): number {
  return hashCode(sessionId) % MUSIC_CREDIT.length
}
