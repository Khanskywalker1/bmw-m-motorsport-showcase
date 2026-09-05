import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CARS, CARS_BY_SLUG } from '@/content'
import { LiveryTheme } from '@/lib/motion'
import { CarHero } from '@/components/sections/car-hero'
import { CarNarrative } from '@/components/sections/car-narrative'
import { CarSpecs } from '@/components/sections/car-specs'
import { CarMeta } from '@/components/sections/car-meta'
import { CarGallery } from '@/components/sections/car-gallery'

export function generateStaticParams() {
  return CARS.map((car) => ({ slug: car.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const car = CARS_BY_SLUG.get(slug)
  if (!car) return {}
  return { title: car.name, description: car.tagline }
}

export default async function CarPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const car = CARS_BY_SLUG.get(slug)
  if (!car) notFound()

  const index = CARS.findIndex((c) => c.slug === car.slug)
  const next = CARS[(index + 1) % CARS.length]!

  return (
    <LiveryTheme livery={car.livery}>
      <CarHero car={car} />
      <CarNarrative car={car} />
      <CarSpecs car={car} />
      <CarMeta car={car} />
      <CarGallery car={car} />

      <nav className="border-t border-ink-800 px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <p className="mb-3 font-display text-[11px] font-bold uppercase tracking-[0.28em] text-ink-400">
            Next in the roster
          </p>
          <Link
            href={`/cars/${next.slug}`}
            className="group inline-flex items-baseline gap-4 font-display text-[clamp(1.7rem,5vw,3.4rem)] font-black uppercase leading-none tracking-[-0.02em] text-ink-100 transition-colors hover:text-white"
          >
            {next.name}
            <span
              aria-hidden
              className="transition-transform duration-300 group-hover:translate-x-2"
              style={{ color: 'var(--livery-accent)' }}
            >
              →
            </span>
          </Link>
        </div>
      </nav>
    </LiveryTheme>
  )
}
