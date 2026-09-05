import { seriesById } from '@/content'
import type { Car } from '@/content/schema'

/** Where the car races, and what it has done. */
export function CarMeta({ car }: { car: Car }) {
  return (
    <section className="border-t border-ink-800 px-6 py-20">
      <div className="mx-auto grid max-w-7xl gap-x-16 gap-y-12 lg:grid-cols-2">
        <div>
          <h2 className="mb-8 font-display text-[11px] font-bold uppercase tracking-[0.28em] text-ink-400">
            Where it races
          </h2>
          <ul className="flex flex-wrap gap-2.5">
            {car.series.map((ref) => {
              const series = seriesById(ref.id)
              return (
                <li
                  key={ref.id}
                  className="rounded-full border border-ink-700 px-4 py-2 text-sm text-ink-200"
                >
                  <span className="font-semibold text-ink-100">{series.abbr}</span>
                  {ref.class ? (
                    <span className="text-ink-400"> · {ref.class}</span>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </div>

        {car.results.length > 0 ? (
          <div>
            <h2 className="mb-8 font-display text-[11px] font-bold uppercase tracking-[0.28em] text-ink-400">
              Record
            </h2>
            <ul className="space-y-5">
              {car.results.map((r, i) => (
                <li key={i} className="flex gap-5">
                  <span
                    className="tabular shrink-0 font-display text-sm font-bold"
                    style={{ color: 'var(--livery-accent)' }}
                  >
                    {r.year}
                  </span>
                  <span className="text-[0.975rem] leading-relaxed text-ink-200">
                    {r.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  )
}
