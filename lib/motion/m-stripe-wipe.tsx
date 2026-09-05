'use client'

import { useRef } from 'react'
import { useDeferredMotion } from './defer'
import { useReducedMotion } from './use-reduced-motion'

/**
 * The signature move: the BMW M tricolour sweeps across the element and the
 * content is revealed in its wake.
 *
 * Deliberately the only overtly branded animation in the system. It earns its
 * place by being rare — use it on section openings, not on every card, or it
 * stops reading as a signature and starts reading as a tic.
 */
export function MStripeWipe({
  children,
  className = '',
  /** Sweep direction. */
  from = 'left',
}: {
  children: React.ReactNode
  className?: string
  from?: 'left' | 'right'
}) {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  useDeferredMotion(
    ({ gsap }) => {
      const el = ref.current
      if (!el) return

      const content = el.querySelector<HTMLElement>('[data-wipe-content]')
      const stripes = el.querySelectorAll<HTMLElement>('[data-stripe]')
      if (!content || stripes.length === 0) return

      const dir = from === 'left' ? -1 : 1

      return gsap.context(() => {
      gsap.set(content, { opacity: 0 })
      gsap.set(stripes, { xPercent: dir * -100 })

      const tl = gsap.timeline({
        scrollTrigger: { trigger: el, start: 'top 82%', once: true },
      })

      // Stripes sweep in...
      tl.to(stripes, {
        xPercent: 0,
        duration: 0.45,
        ease: 'power3.inOut',
        stagger: 0.06,
      })
        // ...content appears behind them...
        .set(content, { opacity: 1 })
        // ...and they continue off the far edge.
        .to(stripes, {
          xPercent: dir * 100,
          duration: 0.55,
          ease: 'power3.inOut',
          stagger: 0.06,
        })
      }, el)
    },
    [from],
    !reduced
  )

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      <div data-wipe-content>{children}</div>
      <div aria-hidden className="pointer-events-none absolute inset-0 flex flex-col">
        <span data-stripe className="flex-1 bg-[var(--color-m-blue)]" />
        <span data-stripe className="flex-1 bg-[var(--color-m-violet)]" />
        <span data-stripe className="flex-1 bg-[var(--color-m-red)]" />
      </div>
    </div>
  )
}
