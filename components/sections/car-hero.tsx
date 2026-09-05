'use client'

import { useParallax, KineticText } from '@/lib/motion'
import { Picture } from '@/components/ui/picture'
import type { Car } from '@/content/schema'

export function CarHero({ car }: { car: Car }) {
  // Small depth value: the image drifts behind the type without detaching.
  const plate = useParallax<HTMLDivElement>(0.18)

  return (
    <section className="relative isolate flex min-h-[92svh] flex-col justify-end overflow-hidden">
      <div ref={plate} className="absolute inset-0 -z-10 scale-110">
        <Picture
          id={car.assets.hero}
          priority
          sizes="100vw"
          className="block h-full w-full"
          imgClassName="h-full w-full object-cover"
        />
      </div>
      {/* Legibility scrim. Two stops, weighted to the bottom where type sits. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-t from-[var(--livery-surface)] via-[var(--livery-surface)]/55 to-transparent"
      />

      <div className="mx-auto w-full max-w-7xl px-6 pb-16 sm:pb-24">
        <p className="mb-5 flex items-center gap-3 font-display text-[11px] font-bold uppercase tracking-[0.28em] text-ink-300">
          <span
            aria-hidden
            className="h-[3px] w-10"
            style={{ backgroundColor: 'var(--livery-accent)' }}
          />
          {car.class} · Debut {car.debutYear}
        </p>

        <KineticText
          as="h1"
          className="font-display text-[clamp(2.6rem,9vw,7.5rem)] font-black uppercase leading-[0.86] tracking-[-0.03em] text-white"
        >
          {car.name}
        </KineticText>

        <p className="mt-7 max-w-2xl text-balance text-lg leading-relaxed text-ink-200 sm:text-xl">
          {car.tagline}
        </p>
      </div>
    </section>
  )
}
