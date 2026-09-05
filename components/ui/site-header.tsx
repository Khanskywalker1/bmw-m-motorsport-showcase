import Link from 'next/link'

export function SiteHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-ink-950/60 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <Link
          href="/"
          className="group flex items-center gap-2.5"
          aria-label="BMW M Motorsport showcase, home"
        >
          {/* The M tricolour, used as the mark. */}
          <span aria-hidden className="flex h-3.5 w-9 overflow-hidden rounded-[1px]">
            <span className="flex-1 bg-[var(--color-m-blue)]" />
            <span className="flex-1 bg-[var(--color-m-violet)]" />
            <span className="flex-1 bg-[var(--color-m-red)]" />
          </span>
          <span className="whitespace-nowrap font-display text-[13px] font-extrabold uppercase tracking-[0.18em] text-ink-100">
            M Motorsport
          </span>
        </Link>
        <nav className="flex items-center gap-7 text-[12px] font-medium uppercase tracking-[0.14em] text-ink-300">
          <Link href="/#roster" className="transition-colors hover:text-ink-100">
            Roster
          </Link>
          <Link href="/#series" className="hidden transition-colors hover:text-ink-100 sm:block">
            Series
          </Link>
          <Link href="/colophon" className="transition-colors hover:text-ink-100">
            Colophon
          </Link>
        </nav>
      </div>
    </header>
  )
}
