'use client'

import { useEffect, type DependencyList } from 'react'

/** Anything with a revert(), which is all we need from a gsap.Context. */
export type Revertible = { revert: () => void }

/**
 * Runs a motion effect that first dynamically imports GSAP.
 *
 * GSAP + ScrollTrigger is ~51 KB gzipped. Imported statically it lands in the
 * page's first-load bundle and pushes us past the JS budget, even though not a
 * frame of animation runs until after hydration. Loading it inside the effect
 * moves it to an async chunk: the page paints on the critical path, motion
 * arrives a moment later.
 *
 * Handles the unmount-before-import-resolves race, which is easy to get wrong
 * by hand and shows up as ScrollTriggers that outlive their component.
 */
export function useDeferredMotion(
  setup: (gsapModule: typeof import('./gsap')) => Revertible | void,
  deps: DependencyList,
  enabled = true
) {
  useEffect(() => {
    if (!enabled) return

    let cancelled = false
    let ctx: Revertible | void

    void (async () => {
      const mod = await import('./gsap')
      // The component may have unmounted while the chunk was in flight.
      if (cancelled) return
      ctx = setup(mod)
    })()

    return () => {
      cancelled = true
      ctx?.revert()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled])
}
