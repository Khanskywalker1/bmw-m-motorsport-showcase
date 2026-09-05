'use client'

import { useEffect } from 'react'
import { useReducedMotion } from './use-reduced-motion'
import { setLenis } from './lenis-instance'

/**
 * Lenis smooth scrolling, driven by GSAP's ticker so that Lenis and
 * ScrollTrigger share one clock. Running them on separate RAF loops causes
 * pinned sections to lag behind the scroll position by a frame.
 *
 * Both libraries are imported dynamically so they stay out of the first-load
 * bundle — the page is fully readable and scrollable natively before this
 * resolves; smooth scrolling is an enhancement layered on afterwards.
 *
 * Disabled entirely under reduced motion: hijacking scroll is exactly the kind
 * of thing that setting is asking us not to do.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced) return

    let cancelled = false
    let cleanup: (() => void) | undefined

    void (async () => {
      const [{ default: Lenis }, { gsap, ScrollTrigger }] = await Promise.all([
        import('lenis'),
        import('./gsap'),
      ])
      if (cancelled) return

      const lenis = new Lenis({
        duration: 1.1,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        touchMultiplier: 1.6,
      })

      lenis.on('scroll', ScrollTrigger.update)
      // Published so programmatic scrolls go through Lenis instead of fighting it.
      setLenis(lenis)

      const tick = (time: number) => lenis.raf(time * 1000)
      gsap.ticker.add(tick)
      gsap.ticker.lagSmoothing(0)

      cleanup = () => {
        setLenis(null)
        gsap.ticker.remove(tick)
        gsap.ticker.lagSmoothing(500, 33)
        lenis.destroy()
      }
    })()

    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [reduced])

  return <>{children}</>
}
