// Hand-crafted meditation phrases, 18 per bhāva.
// These never call the LLM — they are liturgy. The LLM only contributes 6
// market-aware dynamic phrases per (ticker, bhāva) pair, KV-cached for 2h.
//
// Style: dry, sardonic mindfulness for the financially devastated.
// Banned: 'center', 'inner peace', 'present', 'wealth', 'money', 'stock',
// 'crypto', 'yourself'. No ellipses inside a phrase — commas only.

export type BhavaKey = 'Sunyata' | 'Dukkha' | 'Upekkha' | 'Sankhara' | 'Piti' | 'Moha'

// From the Book of Śūnyatā, verses 1-18
const SUNYATA: string[] = [
  'Breathe in, and notice the void where value used to be.',
  'The chart has no opinion. The chart is merely empty.',
  'Breathe out, and release the last flicker of hope.',
  'All positions are temporary. This one ended sooner than expected.',
  'Hold, and let the crimson settle into the dark.',
  'The form of your portfolio was always already gone.',
  'Breathe in, and observe the shape of what is missing.',
  'Breathe out, and do not grasp at the number.',
  'What was held cannot be lost, only returned to formlessness.',
  'Hold, and the silence where a gain used to live.',
  'Empty is not nothing. Empty is what remains after subtraction.',
  'Breathe in, and greet the depth of the ledger.',
  'Breathe out, and forget the figure you memorized.',
  'The ticker is a sound. The sound fades. The air remains.',
  'Hold, and feel the spaciousness of having less.',
  'You did not lose. You relinquished what was never stable.',
  'Breathe in, and welcome the quiet of the cleared account.',
  'Breathe out, and be unburdened by the cost basis.',
]

// From the Book of Dukkha, verses 1-18
const DUKKHA: string[] = [
  'Breathe in, and acknowledge what is here.',
  'The chart has fallen. You are still here.',
  'Breathe out, and loosen your grip on the number.',
  'Every position is impermanent. This one taught you so.',
  'Hold, and feel the weight of what you carried.',
  'The red is not a verdict. The red is weather.',
  'Breathe in, and accept the descent.',
  'Breathe out, and let the comparison to yesterday go.',
  'Pain is the market speaking in a low tone.',
  'Hold, and let the storm pass through you.',
  'You are not your drawdown. You are not your entry.',
  'Breathe in, and greet the ache with steady attention.',
  'Breathe out, and soften around the loss.',
  'The cost basis was always a story you once believed.',
  'Hold, and watch the number shrink without resistance.',
  'Suffering is the resistance. The descent is just the descent.',
  'Breathe in, and begin again from here.',
  'Breathe out, and trust that the body still breathes.',
]

// From the Book of Upekkhā, verses 1-18
const UPEKKHA: string[] = [
  'Breathe in, and meet the chart with a level gaze.',
  'The number neither praises nor condemns you.',
  'Breathe out, and rest in the middle of the bell curve.',
  'Nothing moved. Nothing was asked of you. Rest here.',
  'Hold, and feel the evenness of an unchanged day.',
  'Breathe in, and notice how little you need to do.',
  'Breathe out, and release the urge to act on stillness.',
  'Equanimity is not apathy. Equanimity is fluent calm.',
  'Hold, and the absence of drama is its own practice.',
  'The candle is the same length as it was at open.',
  'Breathe in, and let the flat line be a friend.',
  'Breathe out, and stop monitoring.',
  'Boredom is a door. Walk through it without commentary.',
  'Hold, and feel the comfortable weight of uneventfulness.',
  'Nothing to fix. Nothing to flee. Nothing to chase.',
  'Breathe in, and let the day be ordinary.',
  'Breathe out, and trust the unremarkable.',
  'Hold, and you have arrived.',
]

// From the Book of Saṅkhāra, verses 1-18
const SANKHARA: string[] = [
  'Breathe in, and observe the restlessness in the candles.',
  'The chart is in formation. The formation has not resolved.',
  'Breathe out, and do not predict the next bar.',
  'Hold, and watch the energy without following it.',
  'Volatility is the universe rehearsing.',
  'Breathe in, and feel the flicker.',
  'Breathe out, and soften the impulse to trade the move.',
  'Not every formation completes. Most simply dissipate.',
  'Hold, and let the indecision be enough.',
  'The market is a thought you are not required to finish.',
  'Breathe in, and greet the turbulence with open palms.',
  'Breathe out, and offer the unsettled mind to the air.',
  'You are not the pattern. You are the watcher of it.',
  'Hold, and let the candles speak without translation.',
  'Breathe in, and acknowledge the urge to do something.',
  'Breathe out, and put the doing down.',
  'Formation is not yet formation. It is a becoming.',
  'Hold, and trust the unformed.',
]

// From the Book of Pīti, verses 1-18
const PITI: string[] = [
  'Breathe in, and welcome the rise without grasping it.',
  'The chart has climbed. The chart will also be a chart.',
  'Breathe out, and loosen your grip on the gain.',
  'Hold, and let the green wash through without commentary.',
  'Joy is allowed. Attachment to joy is optional.',
  'Breathe in, and feel the lift in the chest.',
  'Breathe out, and release the urge to celebrate prematurely.',
  'The number is up. The number will be a number tomorrow.',
  'Hold, and let the pleasure pass through you cleanly.',
  'Breathe in, and greet the ascent as weather.',
  'Breathe out, and do not believe your own headline.',
  'Rapture is a guest. Greet it. Feed it. Let it go.',
  'Hold, and notice the lightness without clinging.',
  'Breathe in, and let the day be good for no reason.',
  'Breathe out, and offer the gain back to the market.',
  'You are not your gain. You are the breathing around it.',
  'Hold, and the green settles like pollen on still water.',
  'Breathe in, and begin again from here.',
]

// From the Book of Moha, verses 1-18
const MOHA: string[] = [
  'Breathe in, and notice the bright emerald of the screen.',
  'The chart has gone vertical. So have you, briefly.',
  'Breathe out, and suspect the feeling of inevitability.',
  'Hold, and observe the certainty without trusting it.',
  'Delusion is a candle that burns twice as bright.',
  'Breathe in, and let the green wash over you like rain.',
  'Breathe out, and release the belief that this is skill.',
  'The market gave. The market will eventually take back.',
  'Hold, and do not narrate your genius to the room.',
  'Breathe in, and let the euphoria move through you.',
  'Breathe out, and remember every prior peak.',
  'Confidence is a phase. So is the peak.',
  'Hold, and the bright color is not a forecast.',
  'Breathe in, and greet the day without a thesis.',
  'Breathe out, and let the chart do the chart.',
  'You are not the candle. The candle is the candle.',
  'Hold, and the green is allowed to be just a color.',
  'Breathe in, and begin again from here.',
]

export const STATIC_PHRASES: Record<BhavaKey, string[]> = {
  Sunyata: SUNYATA,
  Dukkha: DUKKHA,
  Upekkha: UPEKKHA,
  Sankhara: SANKHARA,
  Piti: PITI,
  Moha: MOHA,
}

export const ALL_BHAVA_KEYS: readonly BhavaKey[] = [
  'Sunyata',
  'Dukkha',
  'Upekkha',
  'Sankhara',
  'Piti',
  'Moha',
] as const
