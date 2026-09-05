'use client'

/**
 * Module-level handle on the live Lenis instance.
 *
 * Programmatic scrolling has to go THROUGH Lenis: calling window.scrollTo
 * while Lenis is running fights it — Lenis keeps animating toward its own
 * target and the jump gets stomped mid-flight. Anything that scrolls the page
 * itself (the ladder rail, keyboard nav) asks for the instance here and falls
 * back to native scrolling when smooth scroll is off.
 */

type LenisLike = {
  scrollTo: (
    target: number | string | HTMLElement,
    opts?: { duration?: number; offset?: number; immediate?: boolean }
  ) => void
}

let instance: LenisLike | null = null

export function setLenis(next: LenisLike | null) {
  instance = next
}

export function getLenis(): LenisLike | null {
  return instance
}

/** Scroll to an absolute document offset, through Lenis when it is running. */
export function scrollToOffset(top: number, duration = 1.1) {
  const lenis = getLenis()
  if (lenis) {
    lenis.scrollTo(top, { duration })
    return
  }
  // No Lenis: either reduced motion or pre-hydration. Respect the OS setting.
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' })
}
