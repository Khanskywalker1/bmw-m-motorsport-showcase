import Link from 'next/link'
import { CARS, displayableSpecs } from '@/content'
import { Picture } from '@/components/ui/picture'

const TIER_LABEL: Record<string, string> = {
  prototype: 'Prototype',
  gt3: 'GT3',
  gt4: 'GT4',
  entry: 'Entry level',
  special: 'One-off',
}

/**
 * The customer ladder, read top to bottom: prototype, GT3, GT4, entry, and the
 * M3 Touring 24H sitting deliberately outside the hierarchy at the end.
 */
export function Roster() {
  return (
    <section id="roster" className="scroll-mt-14 border-t border-ink-800 px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-14 flex flex-wrap items-end justify-between gap-6">
          <h2 className="font-display text-[clamp(1.8rem,5vw,3.2rem)] font-black uppercase leading-none tracking-[-0.02em] text-white">
            The roster
          </h2>
          <p className="max-w-md text-[0.975rem] leading-relaxed text-ink-400">
            Five cars, one ladder — from a Le Mans prototype down to the car a
            novice buys to start racing.
          </p>
        </div>

        <ul className="flex flex-col gap-5">
          {CARS.map((car, i) => {
            const specCount = displayableSpecs(car).length
            return (
              <li key={car.slug}>
                <Link
                  href={`/cars/${car.slug}`}
                  className="group relative grid items-center gap-6 overflow-hidden rounded-sm border border-ink-800 bg-ink-900 transition-colors duration-500 hover:border-ink-600 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]"
                >
                  <div className="order-2 p-7 sm:order-1 sm:p-10">
                    <p className="mb-4 flex items-center gap-3 font-display text-[10px] font-bold uppercase tracking-[0.26em] text-ink-400">
                      <span className="tabular">{String(i + 1).padStart(2, '0')}</span>
                      <span
                        aria-hidden
                        className="h-[2px] w-6 transition-all duration-500 group-hover:w-10"
                        style={{ backgroundColor: car.livery.accent }}
                      />
                      {TIER_LABEL[car.tier] ?? car.tier}
                    </p>
                    <h3 className="font-display text-[clamp(1.5rem,3.4vw,2.4rem)] font-black uppercase leading-[0.95] tracking-[-0.02em] text-ink-100 transition-colors group-hover:text-white">
                      {car.name}
                    </h3>
                    <p className="mt-4 max-w-md text-[0.95rem] leading-relaxed text-ink-400">
                      {car.tagline}
                    </p>
                    <p className="mt-6 flex items-center gap-2 font-display text-[11px] font-bold uppercase tracking-[0.18em] text-ink-300">
                      {car.class}
                      <span aria-hidden className="text-ink-600">·</span>
                      {car.series.length} series
                      {specCount === 0 ? (
                        <>
                          <span aria-hidden className="text-ink-600">·</span>
                          <span className="text-ink-400 normal-case tracking-normal">
                            specs pending verification
                          </span>
                        </>
                      ) : null}
                    </p>
                  </div>

                  <div className="order-1 h-56 overflow-hidden sm:order-2 sm:h-72">
                    <Picture
                      id={car.assets.hero}
                      sizes="(min-width: 640px) 50vw, 100vw"
                      className="block h-full w-full"
                      imgClassName="h-full w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                    />
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
