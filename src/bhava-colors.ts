// Color tokens per bhāva. Used by the orb (via CSS variables) and any
// other element that needs to react to the current market mood.
//
// Per the visual iteration notes (2026-07-26): use the DARKER end of each
// colour family for the orb base and reserve the BRIGHT version for the
// glow halo. The contrast is what gives the orb depth instead of a flat
// colour block.

export type BhavaKey = 'Sunyata' | 'Dukkha' | 'Upekkha' | 'Sankhara' | 'Piti' | 'Moha'

export type BhavaColors = {
  base: string
  glow: string
  soft: string
  text: string
  changeUp: string
  changeDown: string
  display: string
  translation: string
}

export const BHAVA_COLORS: Record<BhavaKey, BhavaColors> = {
  Sunyata: {
    base: '#7f1d1d',
    glow: '#ef4444',
    soft: 'rgba(239, 68, 68, 0.4)',
    text: '#fca5a5',
    changeUp: '#4ade80',
    changeDown: '#fca5a5',
    display: 'Śūnyatā',
    translation: 'Emptiness',
  },
  Dukkha: {
    base: '#7f1d1d',
    glow: '#ef4444',
    soft: 'rgba(239, 68, 68, 0.35)',
    text: '#fca5a5',
    changeUp: '#4ade80',
    changeDown: '#fca5a5',
    display: 'Dukkha',
    translation: 'Suffering',
  },
  Upekkha: {
    base: '#a16207',
    glow: '#fbbf24',
    soft: 'rgba(251, 191, 36, 0.35)',
    text: '#fde68a',
    changeUp: '#4ade80',
    changeDown: '#fca5a5',
    display: 'Upekkhā',
    translation: 'Equanimity',
  },
  Sankhara: {
    base: '#92400e',
    glow: '#fbbf24',
    soft: 'rgba(251, 191, 36, 0.35)',
    text: '#fdba74',
    changeUp: '#4ade80',
    changeDown: '#fca5a5',
    display: 'Saṅkhāra',
    translation: 'Formation',
  },
  Piti: {
    base: '#166534',
    glow: '#22c55e',
    soft: 'rgba(34, 197, 94, 0.35)',
    text: '#86efac',
    changeUp: '#86efac',
    changeDown: '#fca5a5',
    display: 'Pīti',
    translation: 'Rapture',
  },
  Moha: {
    base: '#15803d',
    glow: '#22c55e',
    soft: 'rgba(34, 197, 94, 0.4)',
    text: '#bbf7d0',
    changeUp: '#86efac',
    changeDown: '#fca5a5',
    display: 'Moha',
    translation: 'Delusion',
  },
}

export function getBhavaColors(key: string): BhavaColors {
  return BHAVA_COLORS[key as BhavaKey] ?? BHAVA_COLORS.Upekkha
}
