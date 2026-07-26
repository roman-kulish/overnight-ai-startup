// Bhāva badge. Flow element that sits in the central vertical stack
// above the breathing orb. Shows the full label including the English
// translation: "MOHA · DELUSION".

export function BhavaLabel({
  display,
  translation,
}: {
  display: string
  translation: string
}) {
  return (
    <div
      className="mb-6 whitespace-nowrap rounded-full border border-white/10 bg-white/5 px-4 py-1.5 font-serif text-[13px] font-bold uppercase tracking-[0.25em] text-amber-200/90 shadow-xl backdrop-blur-md"
      aria-label={`Current bhāva: ${display}, ${translation}`}
    >
      {display} · {translation}
    </div>
  )
}
