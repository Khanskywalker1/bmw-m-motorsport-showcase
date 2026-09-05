'use client'

import { useParallax, KineticText } from '@/lib/motion'
import { Picture } from '@/components/ui/picture'
import { HOME_HERO_ASSET } from '@/content'

export function HomeHero() {
  const plate = useParallax<HTMLDivElement>(0.15)

  return (
    <section className="relative isolate flex min-h-[100svh] flex-col justify-end overflow-hidden">
      <div ref={plate} className="absolute inset-0 -z-10 scale-110">
        <Picture
          id={HOME_HERO_ASSET}
          priority
          sizes="100vw"
          className="block h-full w-full"
          imgClassName="h-full w-full object-cover"
        />
      </div>
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-t from-ink-950 via-ink-950/60 to-ink-950/25"
      />

      <div className="mx-auto w-full max-w-7xl px-6 pb-20 sm:pb-28">
        <p className="mb-6 flex items-center gap-3 font-display text-[11px] font-bold uppercase tracking-[0.28em] text-ink-300">
          <span aria-hidden className="flex h-[3px] w-12 overflow-hidden">
            <span className="flex-1 bg-[var(--color-m-blue)]" />
            <span className="flex-1 bg-[var(--color-m-violet)]" />
            <span className="flex-1 bg-[var(--color-m-red)]" />
          </span>
          2026 Season
        </p>

        <KineticText
          as="h1"
          className="max-w-5xl font-display text-[clamp(2.4rem,8.5vw,7rem)] font-black uppercase leading-[0.85] tracking-[-0.035em] text-white"
        >
          Nineteen ninety-nine was the last time
        </KineticText>

        <p className="mt-8 max-w-2xl text-balance text-lg leading-relaxed text-ink-200 sm:text-xl">
          The V12 LMR won Le Mans outright in 1999. In 2026, for the first time
          since, BMW M Motorsport arrives with a prototype built to do it
          again — and a customer ladder running beneath it on five continents.
        </p>

        <a
          href="#roster"
          className="mt-10 inline-flex items-center gap-3 border-b border-ink-600 pb-1 font-display text-[12px] font-bold uppercase tracking-[0.2em] text-ink-100 transition-colors hover:border-white hover:text-white"
        >
          The roster
          <span aria-hidden>↓</span>
        </a>
      </div>
    </section>
  )
}
