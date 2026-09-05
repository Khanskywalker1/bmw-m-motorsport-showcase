import { SERIES, CARS } from '@/content'

/** Series are attributes of cars, not destinations — so they live here, not on routes. */
export function SeriesGrid() {
  const carsFor = (seriesId: string) =>
    CARS.filter((c) => c.series.some((s) => s.id === seriesId))

  const contested = SERIES.filter((s) => carsFor(s.id).length > 0)

  return (
    <section id="series" className="scroll-mt-14 border-t border-ink-800 px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-14 flex flex-wrap items-end justify-between gap-6">
          <h2 className="font-display text-[clamp(1.8rem,5vw,3.2rem)] font-black uppercase leading-none tracking-[-0.02em] text-white">
            Where they race
          </h2>
          <p className="max-w-md text-[0.975rem] leading-relaxed text-ink-400">
            The same cars, across sprint and endurance racing on five
            continents.
          </p>
        </div>

        <ul className="grid gap-px overflow-hidden rounded-sm bg-ink-800 sm:grid-cols-2 lg:grid-cols-3">
          {contested.map((series) => {
            const cars = carsFor(series.id)
            return (
              <li key={series.id} className="bg-ink-950 p-7">
                <p className="font-display text-[11px] font-bold uppercase tracking-[0.2em] text-ink-400">
                  {series.abbr}
                </p>
                <h3 className="mt-2 font-display text-lg font-bold leading-snug text-ink-100">
                  {series.name}
                </h3>
                <p className="mt-3 text-[0.9rem] leading-relaxed text-ink-400">
                  {series.blurb}
                </p>
                <ul className="mt-5 flex flex-wrap gap-1.5">
                  {cars.map((c) => (
                    <li
                      key={c.slug}
                      className="rounded-full px-2.5 py-1 text-[11px] font-medium text-ink-200"
                      style={{ backgroundColor: `${c.livery.primary}26` }}
                    >
                      {c.shortName}
                    </li>
                  ))}
                </ul>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
