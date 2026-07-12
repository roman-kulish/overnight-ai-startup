import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { Sparkles, Briefcase, Flame, Star } from 'lucide-react'

const apps = [
  {
    name: 'Meditate to Your Shares',
    description: 'Guided meditation for stock volatility',
    route: '/meditate',
    icon: Sparkles,
    color: 'text-success',
  },
  {
    name: 'AI Automation Agency Generator',
    description: 'Turn mundane hobbies into fake €10k agencies',
    route: '/agency',
    icon: Briefcase,
    color: 'text-accent',
  },
  {
    name: 'VC Roast Pitch Deck',
    description: 'Roast billion-dollar AI ideas',
    route: '/roast',
    icon: Flame,
    color: 'text-danger',
  },
  {
    name: 'Crypto-Astrology Oracle',
    description: 'Zodiac + crypto readings',
    route: '/oracle',
    icon: Star,
    color: 'text-accent-glow',
  },
]

function Dashboard() {
  return (
    <section className="flex flex-col gap-10 px-6 py-12 max-w-6xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foam sm:text-4xl">
          Overnight AI Startup
        </h1>
        <p className="mt-3 text-muted">
          Pick a parody app and disrupt nothing in particular.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {apps.map((app) => {
          const Icon = app.icon
          return (
            <Link key={app.route} to={app.route}>
              <motion.div
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.97 }}
                className="flex h-full flex-col gap-3 rounded-2xl border border-border bg-panel p-6 shadow-sm transition-shadow hover:shadow-lg hover:shadow-accent/10"
              >
                <div className={`${app.color} w-fit`}>
                  <Icon className="h-8 w-8" />
                </div>
                <div className="flex flex-col gap-1">
                  <h2 className="font-semibold text-foam">{app.name}</h2>
                  <p className="text-sm text-muted">{app.description}</p>
                </div>
              </motion.div>
            </Link>
          )
        }) }
      </div>
    </section>
  )
}

export default Dashboard
