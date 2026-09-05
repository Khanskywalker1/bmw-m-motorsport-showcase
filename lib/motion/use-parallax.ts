'use client'

import { useRef } from 'react'
import { useDeferredMotion } from './defer'
import { useReducedMotion } from './use-reduced-motion'

/**
 * Moves an element against the scroll to create depth.
 *
 * `depth` is the fraction of the container's travel the element lags by:
 * 0 is locked to the page, 0.3 is a distant background plate. Keep it small —
 * anything past ~0.4 reads as a bug rather than as depth.
 */
export function useParallax<T extends HTMLElement = HTMLDivElement>(
  depth = 0.2
) {
  const ref = useRef<T>(null)
  const reduced = useReducedMotion()

  useDeferredMotion(
    ({ gsap }) => {
      const el = ref.current
      if (!el) return

      // gsap.context() collects every tween and ScrollTrigger created inside
      // it, so revert() on unmount cleans up all of them. App Router remounts
      // on navigation and leaked triggers cause scroll jank that is genuinely
      // painful to trace back to its source.
      return gsap.context(() => {
        gsap.fromTo(
          el,
          { yPercent: -depth * 50 },
          {
            yPercent: depth * 50,
            ease: 'none',
            scrollTrigger: {
              trigger: el.parentElement ?? el,
              start: 'top bottom',
              end: 'bottom top',
              scrub: true,
            },
          }
        )
      })
    },
    [depth],
    !reduced
  )

  return ref
}
