import { Link, Outlet, useLocation } from 'react-router'
import { ExternalLink } from 'lucide-react'

function AppShell() {
  const location = useLocation()
  const isDashboard = location.pathname === '/'

  return (
    <div className="relative min-h-screen bg-night text-foam">
      {!isDashboard && (
        <header className="sticky top-0 z-50 border-b border-border/60 bg-panel/80 backdrop-blur-sm">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link
              to="/"
              className="rounded-lg px-3 py-2 text-sm font-medium text-foam transition hover:bg-accent/10 hover:text-accent-glow"
            >
              Return to Dashboard
            </Link>
            <span className="text-sm font-semibold tracking-wide text-accent-glow">
              Overnight AI Startups
            </span>
          </div>
        </header>
      )}

      <main>
        <Outlet />
      </main>

      <footer className="border-t border-border/60 bg-panel/40 pb-20 pt-6 md:pb-8">
        <div className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-6 text-center text-sm text-muted sm:text-base">
          <a
            href="https://medium.com/@roman.kulish/mortgage-vs-the-machine-inside-the-youtube-overnight-ai-startup-grift-8b3833f24146"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 transition hover:text-accent-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            <span>Read the original article on Medium</span>
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      </footer>

      <a
        href="https://buymeacoffee.com/romanko"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Buy Me a Coffee"
        className="fixed bottom-6 right-6 z-30"
      >
        <img
          src="/images/bmc-yellow-button.png"
          alt="Buy Me a Coffee"
          className="h-12 w-auto drop-shadow-lg transition-transform hover:scale-105"
        />
      </a>
    </div>
  )
}

export default AppShell
