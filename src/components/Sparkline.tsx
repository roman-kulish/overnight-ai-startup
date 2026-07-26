// Inline SVG sparkline of the last ~21 daily closes. Animates on each
// new series with a 0.6s stroke-dasharray draw-in. Stroke colour is
// driven by the parent via `currentColor` (the default emerald-300/70
// gives a soft, readable trace across all bhāvas).

import { useEffect, useRef, useState } from 'react'

type Props = {
  data: number[]
  height?: number
  className?: string
}

export function Sparkline({ data, height = 36, className }: Props) {
  const pathRef = useRef<SVGPathElement | null>(null)
  const [pathLength, setPathLength] = useState(0)

  useEffect(() => {
    const path = pathRef.current
    if (!path) return
    const length = path.getTotalLength()
    setPathLength(length)
    // Reset to drawn-out state, then animate via CSS class change.
    path.style.strokeDasharray = `${length}`
    path.style.strokeDashoffset = `${length}`
    // Force a reflow so the next attribute change animates.
    void path.getBoundingClientRect()
    path.style.transition = 'stroke-dashoffset 0.6s ease-out'
    path.style.strokeDashoffset = '0'
  }, [data])

  if (data.length < 2) return null

  const width = 200
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const stepX = width / (data.length - 1)

  const points = data.map((value, i) => {
    const x = i * stepX
    const y = height - ((value - min) / range) * height
    return [x, y] as const
  })

  const pathD = points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(' ')

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={`flex-1 text-emerald-300/70 ${className ?? ''}`}
      style={{ width: '100%', height }}
      aria-hidden="true"
    >
      <path
        ref={pathRef}
        d={pathD}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {pathLength > 0 && (
        <style>{`path { stroke-dasharray: ${pathLength}; }`}</style>
      )}
    </svg>
  )
}
