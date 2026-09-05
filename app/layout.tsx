import type { Metadata } from 'next'
import { Archivo, Inter } from 'next/font/google'
import { SmoothScroll } from '@/lib/motion'
import { SiteHeader } from '@/components/ui/site-header'
import { SiteFooter } from '@/components/ui/site-footer'
import './globals.css'

const archivo = Archivo({
  subsets: ['latin'],
  variable: '--font-archivo',
  weight: ['600', '700', '800', '900'],
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://example.invalid'),
  title: {
    default: 'BMW M Motorsport — 2026 Works Roster',
    template: '%s — BMW M Motorsport Showcase',
  },
  description:
    'An unofficial showcase of the BMW M Motorsport 2026 racing roster: the M Hybrid V8 prototype and the M4 GT3 EVO, M4 GT4 EVO, M2 Racing and M3 Touring 24H customer cars.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${archivo.variable} ${inter.variable}`}>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded focus:bg-ink-100 focus:px-4 focus:py-2 focus:text-ink-950"
        >
          Skip to content
        </a>
        <SmoothScroll>
          <SiteHeader />
          <main id="main">{children}</main>
          <SiteFooter />
        </SmoothScroll>
      </body>
    </html>
  )
}
