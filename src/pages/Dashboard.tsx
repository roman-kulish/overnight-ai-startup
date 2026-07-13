import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'

type AppEntry = {
  name: string
  description: string
  route: string
  image: string
  shadow: string
}

const apps: AppEntry[] = [
  {
    name: 'Meditate to Your Shares',
    description:
      'Breathe in the unearned wealth, exhale your imposter syndrome. Hyper-sarcastic guided mindfulness tied directly to your portfolio’s volatility.',
    route: '/meditate',
    image: '/images/tile-meditate-to-your-shares.png',
    shadow: '0 0 60px rgba(185, 28, 28, 0.35)',
  },
  {
    name: 'AI Automation Agency Generator',
    description:
      'Launch a $10k/mo MRR empire doing absolutely nothing. Generate fake, slop-as-a-service pitch decks for un-monetizable hobbies.',
    route: '/agency',
    image: '/images/tile-ai-auto-agency.jpg',
    shadow: '0 0 60px rgba(139, 92, 246, 0.35), 0 0 80px rgba(6, 182, 212, 0.25)',
  },
  {
    name: 'VC Roast Pitch Deck',
    description:
      "Pitch your 'unicorn'. Get brutally dismantled by a soulless AI venture capitalist. Watch your valuation bleed to zero in real-time.",
    route: '/roast',
    image: '/images/tile-ace-of-cash.png',
    shadow: '0 0 60px rgba(239, 68, 68, 0.35)',
  },
  {
    name: 'Crypto-Astrology Oracle',
    description:
      'On-chain data meets 16th-century planetary ephemeris. Find out if Mercury in Retrograde is currently liquidating your bags.',
    route: '/oracle',
    image: '/images/tile-crypto-astrology.jpg',
    shadow: '0 0 60px rgba(99, 102, 241, 0.35)',
  },
]

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(query)
    setMatches(media.matches)

    function handleChange(event: MediaQueryListEvent) {
      setMatches(event.matches)
    }

    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [query])

  return matches
}

interface TiltCardProps {
  children: React.ReactNode
  shadow: string
  className?: string
}

function TiltCard({ children, shadow, className }: TiltCardProps) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [hovered, setHovered] = useState(false)
  const isLargeScreen = useMediaQuery('(min-width: 768px)')
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const cardRef = useRef<HTMLDivElement>(null)

  const tiltEnabled = isLargeScreen && !prefersReducedMotion

  function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    if (!tiltEnabled || !cardRef.current) return

    const rect = cardRef.current.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width - 0.5
    const y = (event.clientY - rect.top) / rect.height - 0.5

    setTilt({
      x: y * -20,
      y: x * 20,
    })
  }

  function handleMouseLeave() {
    setTilt({ x: 0, y: 0 })
    setHovered(false)
  }

  const transform =
    tiltEnabled && hovered
      ? `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(1.05) translateY(-4px)`
      : undefined

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        transform,
        boxShadow: hovered ? shadow : 'none',
      }}
      className={className}
    >
      {children}
    </div>
  )
}

function AppCard({ app }: { app: AppEntry }) {
  return (
    <TiltCard
      shadow={app.shadow}
      className="group relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-900 shadow-none transition-shadow duration-300 hover:scale-105 hover:-translate-y-1"
    >
      <Link to={app.route} className="flex h-full flex-col">
        <div className="relative aspect-[3/4] w-full overflow-hidden">
          <img
            src={app.image}
            alt={app.name}
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover transition-all duration-300 group-hover:scale-105 group-hover:brightness-110"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>
        
        <div className="flex flex-1 flex-col gap-3 p-5">
          <h2 className="text-lg font-bold uppercase tracking-wide text-white">
            {app.name}
          </h2>
          <p className="text-base font-medium leading-relaxed text-gray-300">
            {app.description}
          </p>
        </div>
      </Link>
    </TiltCard>
  )
}

function Dashboard() {
  return (
      <section className="mx-auto flex min-h-screen max-w-7xl flex-col gap-10 px-6 py-12">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Overnight AI Startup
        </h1>
        <p className="mt-3 text-zinc-400">Pick a parody app and disrupt nothing in particular.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {apps.map((app) => (
          <AppCard key={app.route} app={app} />
        ))}
      </div>
    </section>
  )
}

export default Dashboard
