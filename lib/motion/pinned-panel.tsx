'use client'

import { useRef, useState } from 'react'
import { useDeferredMotion } from './defer'
import { useReducedMotion } from './use-reduced-motion'

/**
 * Pins a section and scrubs through a set of steps as the user scrolls past.
 *
 * Under reduced motion nothing is pinned and every step renders stacked and
 * readable. A pinned section a reduced-motion user cannot scroll past is the
 * single worst failure mode in a scroll-driven site, so the pin is not a
 * progressive enhancement here — it is opt-in, and off by default.
 */
export function PinnedPanel({
  steps,
  className = '',
  children,
}: {
  /** Rendered once per step; the active one is shown. */
  steps: React.ReactNode[]
  className?: string
  /** Persistent content shown behind the steps (e.g. the car image). */
  children?: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const reduced = useReducedMotion()

  useDeferredMotion(
    ({ gsap, ScrollTrigger }) => {
      const el = ref.current
      if (!el || steps.length === 0) return

      return gsap.context(() => {
        ScrollTrigger.create({
          trigger: el,
          start: 'top top',
          // One viewport of scroll per step beyond the first.
          end: () => `+=${window.innerHeight * (steps.length - 1)}`,
          pin: true,
          pinSpacing: true,
          scrub: true,
          onUpdate: (self) => {
            const idx = Math.min(
              steps.length - 1,
              Math.floor(self.progress * steps.length)
            )
            setActive(idx)
          },
        })
      }, el)
    },
    [steps.length],
    !reduced
  )

  // Reduced motion: no pin, no absolute positioning, everything in flow.
  if (reduced) {
    return (
      <div className={className}>
        {children}
        <div className="flex flex-col gap-16">
          {steps.map((step, i) => (
            <div key={i}>{step}</div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div ref={ref} className={`relative min-h-screen ${className}`}>
      {children}
      <div className="relative">
        {steps.map((step, i) => (
          <div
            key={i}
            aria-hidden={i !== active}
            className="transition-opacity duration-500"
            style={{
              opacity: i === active ? 1 : 0,
              position: i === 0 ? 'relative' : 'absolute',
              inset: i === 0 ? undefined : 0,
              pointerEvents: i === active ? 'auto' : 'none',
            }}
          >
            {step}
          </div>
        ))}
      </div>
    </div>
  )
}
