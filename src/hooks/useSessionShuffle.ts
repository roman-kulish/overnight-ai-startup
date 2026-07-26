// Seeded PRNG: same sessionId always picks the same 12 phrases from a
// 24-phrase pool. Different sessions get different cycles even when the
// pool is identical. The PRNG is mulberry32 with an FNV-1a hash seed.

function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function pickSessionPhrases<T>(pool: T[], sessionId: string, count: number): T[] {
  if (pool.length <= count) return pool.slice()
  const rng = mulberry32(hashString(sessionId))
  const indices = pool.map((_, i) => i)
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = indices[i]
    indices[i] = indices[j]
    indices[j] = tmp
  }
  return indices.slice(0, count).map((i) => pool[i])
}

export function useSessionShuffle() {
  return { pickSessionPhrases }
}
