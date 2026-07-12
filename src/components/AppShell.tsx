import { Link, Outlet } from 'react-router'
import { Coffee } from 'lucide-react'

function AppShell() {
  return (
    <div className="flex min-h-screen flex-col bg-night text-foam">
      <header className="border-b border-border/60 bg-panel/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link
            to="/"
            className="rounded-lg px-3 py-2 text-sm font-medium text-foam transition hover:bg-accent/10 hover:text-accent-glow"
          >
            Return to Dashboard
          </Link>
          <span className="text-sm font-semibold tracking-wide text-accent-glow">
            overnight.ai
          </span>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-border/60 bg-panel/60">
        <div className="mx-auto max-w-6xl px-6 py-5">
          <a
            href="https://buymeacoffee.com/romanko"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition hover:-translate-y-0.5 hover:bg-accent-glow"
          >
            <Coffee className="h-4 w-4" aria-hidden="true" />
            Buy Me a Coffee
          </a>
        </div>
      </footer>
    </div>
  )
}

export default AppShell
