import { Link, Outlet, useLocation } from 'react-router'

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

      <a
        href="https://buymeacoffee.com/romanko"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Buy Me a Coffee"
        className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 md:bottom-8 md:left-auto md:right-8 md:translate-x-0"
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
