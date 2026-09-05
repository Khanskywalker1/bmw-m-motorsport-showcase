import { displayableSpecs } from '@/content'
import type { Car } from '@/content/schema'

/**
 * Only verified spec rows reach this component — see content/schema.ts.
 * If a car has none, the section is omitted entirely rather than rendering an
 * empty table or, worse, an unverified figure.
 */
export function CarSpecs({ car }: { car: Car }) {
  const specs = displayableSpecs(car)
  if (specs.length === 0) return null

  return (
    <section className="border-t border-ink-800 px-6 py-20" aria-labelledby={`specs-${car.slug}`}>
      <div className="mx-auto max-w-7xl">
        <h2
          id={`specs-${car.slug}`}
          className="mb-10 font-display text-[11px] font-bold uppercase tracking-[0.28em] text-ink-400"
        >
          Specification
        </h2>
        <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-sm bg-ink-800 sm:grid-cols-2 lg:grid-cols-3">
          {specs.map((spec) => (
            <div key={spec.label} className="bg-[var(--livery-surface)] p-6">
              <dt className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-400">
                {spec.label}
              </dt>
              <dd className="tabular font-display text-xl font-bold leading-tight text-ink-100">
                {spec.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
