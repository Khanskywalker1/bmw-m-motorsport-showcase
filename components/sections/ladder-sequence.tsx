'use client'

import { useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useScrollChapters } from '@/lib/motion/use-scroll-chapters'
import { Picture } from '@/components/ui/picture'
import type { Car } from '@/content/schema'

const TIER_LABEL: Record<string, string> = {
  prototype: 'Prototype',
  gt3: 'GT3',
  gt4: 'GT4',
  entry: 'Entry level',
  special: 'One-off',
}

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n)

/**
 * The Ladder: a scroll-scrubbed sequence through the five works cars.
 *
 * Transition is a cross-dissolve with a slow scale drift. Because that motion
 * carries no direction, it says nothing about the GT3 → GT4 → M2 hierarchy on
 * its own — so the rail and the tier labels carry that instead, which is why
 * both are explicit rather than decorative.
 */
export function LadderSequence({ cars }: { cars: Car[] }) {
  const layers = useRef<(HTMLDivElement | null)[]>([])
  const visuals = useRef<(HTMLDivElement | null)[]>([])
  const frames = useRef<(HTMLDivElement | null)[]>([])
  const copy = useRef<(HTMLDivElement | null)[]>([])

  // Runs every frame, so it writes to the DOM directly rather than through
  // React state — see useScrollChapters.
  const onUpdate = useCallback((t: number) => {
    for (let i = 0; i < layers.current.length; i++) {
      const d = Math.abs(t - i)

      const layer = layers.current[i]
      if (layer) layer.style.pointerEvents = d < 0.5 ? 'auto' : 'none'

      /*
       * Photography cross-dissolves, but on a slightly tightened curve rather
       * than a full linear one. A 50/50 blend of two very different frames — a
       * bright daylight Sebring shot against a dark studio portrait — goes
       * muddy, so the overlap window is shortened to keep the dissolve smooth
       * without dwelling in the murk.
       */
      const visual = visuals.current[i]
      if (visual) visual.style.opacity = clamp01(1 - d * 1.35).toFixed(3)

      /*
       * Type does NOT. Two headlines held at 50% opacity mid-transition read
       * as one illegible smear of overlapping letterforms, so the copy runs a
       * much steeper curve and is gone by d ≈ 0.42 — only ever one headline on
       * screen, while the images behind it still blend smoothly.
       */
      const c = copy.current[i]
      if (c) {
        c.style.opacity = clamp01(1 - d * 2.4).toFixed(3)
        c.style.transform = `translate3d(0, ${((t - i) * -26).toFixed(2)}px, 0)`
      }

      // A continuous drift across two chapter widths, so the image is never
      // static while its chapter is on screen.
      const frame = frames.current[i]
      if (frame) {
        const drift = 1.08 - 0.08 * clamp01((t - (i - 1)) / 2)
        frame.style.transform = `scale(${drift.toFixed(4)})`
      }
    }
  }, [])

  const { ref, active, goTo, reduced } = useScrollChapters<HTMLDivElement>({
    count: cars.length,
    onUpdate,
  })

  // Arrow / Home / End move between chapters once the section is on screen.
  useEffect(() => {
    if (reduced) return
    const onKey = (e: KeyboardEvent) => {
      const el = ref.current
      if (!el) return
      const box = el.getBoundingClientRect()
      const onScreen = box.top <= 0 && box.bottom >= window.innerHeight
      if (!onScreen) return
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault()
        goTo(active + 1)
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault()
        goTo(active - 1)
      } else if (e.key === 'Home') {
        e.preventDefault()
        goTo(0)
      } else if (e.key === 'End') {
        e.preventDefault()
        goTo(cars.length - 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, cars.length, goTo, reduced, ref])

  const current = cars[active] ?? cars[0]!

  if (reduced) {
    // No sticky, no scrubbing: five sections in normal flow, all readable.
    return (
      <section id="roster" className="scroll-mt-14 border-t border-ink-800">
        {cars.map((car, i) => (
          <div
            key={car.slug}
            id={`chapter-${i}`}
            className="border-b border-ink-800 px-6 py-16"
            style={{ backgroundColor: car.livery.surface }}
          >
            <ChapterCopy car={car} index={i} total={cars.length} />
            <div className="mt-8 overflow-hidden rounded-sm">
              <Picture
                id={car.assets.hero}
                sizes="100vw"
                className="block w-full"
                imgClassName="w-full h-auto"
              />
            </div>
          </div>
        ))}
      </section>
    )
  }

  return (
    <section
      id="roster"
      ref={ref}
      className="relative scroll-mt-14 border-t border-ink-800"
      style={{ height: `${cars.length * 100}svh` }}
      aria-label="The 2026 works roster"
    >
      <div
        className="sticky top-0 h-svh overflow-hidden transition-colors duration-700"
        style={{ backgroundColor: current.livery.surface }}
      >
        {cars.map((car, i) => (
          <div
            key={car.slug}
            id={`chapter-${i}`}
            ref={(el) => {
              layers.current[i] = el
            }}
            aria-hidden={i !== active}
            className="absolute inset-0"
          >
            {/* Image + its scrim share one opacity so they fade as one unit. */}
            <div
              ref={(el) => {
                visuals.current[i] = el
              }}
              className="absolute inset-0"
              style={{ opacity: i === 0 ? 1 : 0 }}
            >
              <div
                ref={(el) => {
                  frames.current[i] = el
                }}
                className="absolute inset-0 will-change-transform"
              >
                <Picture
                  id={car.assets.hero}
                  priority={i === 0}
                  sizes="100vw"
                  className="block h-full w-full"
                  imgClassName="h-full w-full object-cover"
                />
              </div>
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-[var(--chapter-surface)] via-[var(--chapter-surface)]/55 to-transparent"
                style={
                  { '--chapter-surface': car.livery.surface } as React.CSSProperties
                }
              />
            </div>
            <div className="absolute inset-x-0 bottom-0">
              <div
                ref={(el) => {
                  copy.current[i] = el
                }}
                style={{ opacity: i === 0 ? 1 : 0 }}
                className="mx-auto max-w-7xl px-6 pb-24 will-change-transform sm:pb-28"
              >
                <ChapterCopy
                  car={car}
                  index={i}
                  total={cars.length}
                  tabbable={i === active}
                />
              </div>
            </div>
          </div>
        ))}

        <Rail cars={cars} active={active} goTo={goTo} />
      </div>
    </section>
  )
}

function ChapterCopy({
  car,
  index,
  total,
  tabbable = true,
}: {
  car: Car
  index: number
  total: number
  tabbable?: boolean
}) {
  return (
    <>
      <p className="mb-5 flex items-center gap-3 font-display text-[11px] font-bold uppercase tracking-[0.28em] text-ink-300">
        <span className="tabular">
          {String(index + 1).padStart(2, '0')}
          <span className="text-ink-400"> / {String(total).padStart(2, '0')}</span>
        </span>
        <span
          aria-hidden
          className="h-[3px] w-10"
          style={{ backgroundColor: car.livery.accent }}
        />
        {TIER_LABEL[car.tier] ?? car.tier}
      </p>
      <h3 className="font-display text-[clamp(2.1rem,7vw,5.6rem)] font-black uppercase leading-[0.88] tracking-[-0.03em] text-white">
        {car.name}
      </h3>
      <p className="mt-6 max-w-xl text-balance text-base leading-relaxed text-ink-200 sm:text-lg">
        {car.tagline}
      </p>
      <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 font-display text-[11px] font-bold uppercase tracking-[0.18em] text-ink-300">
        {car.class}
        <span aria-hidden className="text-ink-600">·</span>
        Debut {car.debutYear}
        <span aria-hidden className="text-ink-600">·</span>
        {car.series.length} series
      </p>
      <Link
        href={`/cars/${car.slug}`}
        tabIndex={tabbable ? undefined : -1}
        aria-label={`View the ${car.name}`}
        className="mt-8 inline-flex items-center gap-3 border-b pb-1 font-display text-[12px] font-bold uppercase tracking-[0.2em] text-ink-100 transition-colors hover:text-white"
        style={{ borderColor: car.livery.accent }}
      >
        View the car
        <span aria-hidden>→</span>
      </Link>
    </>
  )
}

function Rail({
  cars,
  active,
  goTo,
}: {
  cars: Car[]
  active: number
  goTo: (i: number) => void
}) {
  return (
    <nav
      aria-label="Jump to car"
      /*
       * ONE rail, laid out two ways — a vertical list on the right at lg+, a
       * segmented bar along the bottom below that. Rendering two separate rails
       * would put two aria-current elements in the DOM at once, which is both
       * wrong for assistive tech and ambiguous to query.
       */
      className="pointer-events-auto absolute flex gap-1 max-lg:inset-x-0 max-lg:bottom-7 max-lg:flex-row max-lg:justify-center max-lg:px-6 lg:right-4 lg:top-1/2 lg:-translate-y-1/2 lg:flex-col"
    >
      {cars.map((car, i) => {
        const on = i === active
        return (
          <button
            key={car.slug}
            type="button"
            onClick={() => goTo(i)}
            aria-label={car.shortName}
            aria-current={on ? 'true' : undefined}
            className="group flex items-center justify-end gap-3 max-lg:flex-1 max-lg:px-0 max-lg:py-3 lg:py-2 lg:pl-4 lg:pr-2 lg:text-right"
          >
            <span
              className={`hidden font-display text-[10px] font-bold uppercase tracking-[0.18em] transition-colors lg:inline ${
                on ? 'text-white' : 'text-ink-400 group-hover:text-ink-200'
              }`}
            >
              {car.shortName}
            </span>
            <span
              aria-hidden
              className="h-[2px] transition-all duration-500 max-lg:w-full lg:h-[2px]"
              style={{
                width: undefined,
                backgroundColor: on ? car.livery.accent : '#3a4150',
              }}
            />
            <span
              aria-hidden
              className="hidden h-[2px] transition-all duration-500 lg:block"
              style={{
                width: on ? 34 : 14,
                backgroundColor: on ? car.livery.accent : '#3a4150',
              }}
            />
          </button>
        )
      })}
    </nav>
  )
}
