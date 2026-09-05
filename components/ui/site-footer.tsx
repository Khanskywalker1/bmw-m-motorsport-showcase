import Link from 'next/link'

/**
 * The disclaimer here is a licensing requirement, not boilerplate — the press
 * imagery this site uses is free for editorial use only. See spec section 7.
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-ink-800 bg-ink-950 px-6 py-12 text-sm text-ink-400">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <p className="max-w-xl leading-relaxed">
          Unofficial fan project. Not affiliated with, endorsed by, or sponsored
          by BMW AG. All trademarks and imagery are the property of BMW AG.
          Photography from BMW Group PressClub, used editorially.
        </p>
        <nav className="flex gap-6">
          <Link href="/" className="transition-colors hover:text-ink-100">
            Home
          </Link>
          <Link href="/colophon" className="transition-colors hover:text-ink-100">
            Colophon
          </Link>
        </nav>
      </div>
    </footer>
  )
}
