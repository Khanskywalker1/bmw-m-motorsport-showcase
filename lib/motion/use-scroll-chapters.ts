'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useDeferredMotion } from './defer'
import { useReducedMotion } from './use-reduced-motion'
import { scrollToOffset } from './lenis-instance'

type Bounds = { start: number; end: number }

/**
 * Maps scroll through a tall section onto N chapters.
 *
 * The visual stage is held in place with CSS `position: sticky`, not a GSAP
 * pin. ScrollTrigger only *reports* progress here — it never reparents or
 * resizes anything. Pinning rewrites the DOM around the pinned element, which
 * is where pin-spacing bugs and layout jumps come from; sticky has none of
 * that and survives React re-renders.
 *
 * `onUpdate` receives a continuous position `t` in [0, count-1]: chapter i is
 * fully on screen at t === i, and the fractional part between two integers is
 * the cross-fade. Write to the DOM directly in that callback — it fires every
 * frame, so putting it through React state would re-render the whole section
 * 60 times a second. Only `active` (which changes a handful of times) is state.
 */
export function useScrollChapters<T extends HTMLElement = HTMLDivElement>({
  count,
  onUpdate,
}: {
  count: number
  onUpdate?: (t: number) => void
}) {
  const ref = useRef<T>(null)
  const [active, setActive] = useState(0)
  const reduced = useReducedMotion()
  const bounds = useRef<Bounds | null>(null)
  const resizeTimer = useRef<number | undefined>(undefined)

  // Kept in a ref so a new inline callback each render doesn't re-run the effect.
  const onUpdateRef = useRef(onUpdate)
  useEffect(() => {
    onUpdateRef.current = onUpdate
  }, [onUpdate])

  useDeferredMotion(
    ({ gsap, ScrollTrigger }) => {
      const el = ref.current
      if (!el || count < 2) return

      const ctx = gsap.context(() => {
        ScrollTrigger.create({
          trigger: el,
          start: 'top top',
          end: 'bottom bottom',
          invalidateOnRefresh: true,
          onRefresh: (self) => {
            bounds.current = { start: self.start, end: self.end }
          },
          onUpdate: (self) => {
            const t = self.progress * (count - 1)
            onUpdateRef.current?.(t)
            const i = Math.round(t)
            setActive((prev) => (prev === i ? prev : i))
          },
        })
      }, el)

      /*
       * ScrollTrigger measures the document once, on creation. Here that is
       * too early: the hero image and the display font are still loading, so
       * the page is shorter than it will be and the trigger's start/end land
       * far too close together — the sequence then races through all five
       * chapters within the first few hundred pixels of scroll.
       *
       * Refreshing on load, on image decode, and on any body resize keeps the
       * bounds honest.
       */
      const refresh = () => ScrollTrigger.refresh()
      if (document.readyState !== 'complete') {
        window.addEventListener('load', refresh, { once: true })
      }
      const imgs = Array.from(document.images).filter((img) => !img.complete)
      for (const img of imgs) img.addEventListener('load', refresh, { once: true })

      const ro = new ResizeObserver(() => {
        window.clearTimeout(resizeTimer.current)
        resizeTimer.current = window.setTimeout(refresh, 150)
      })
      ro.observe(document.body)
      refresh()

      return {
        revert: () => {
          ro.disconnect()
          window.removeEventListener('load', refresh)
          window.clearTimeout(resizeTimer.current)
          ctx.revert()
        },
      }
    },
    [count],
    !reduced
  )

  /** Scroll so chapter `i` is centred. Falls back to element anchors pre-hydration. */
  const goTo = useCallback(
    (i: number) => {
      const clamped = Math.max(0, Math.min(count - 1, i))
      const b = bounds.current
      if (!b || count < 2) {
        const el = document.getElementById(`chapter-${clamped}`)
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }
      const top = b.start + (clamped / (count - 1)) * (b.end - b.start)
      scrollToOffset(top)
    },
    [count]
  )

  return { ref, active, goTo, reduced }
}
