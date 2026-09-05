'use client'

import { useRef } from 'react'
import { useDeferredMotion } from './defer'

type Livery = {
  primary: string
  secondary: string
  accent: string
  surface: string
}

/**
 * Morphs the page's livery custom properties while this section is on screen.
 *
 * This is what stops the site reading as one template with five data rows —
 * the page itself takes on each car's colours as you arrive at it.
 *
 * Runs under reduced motion too: it is a colour change, not movement, and the
 * CSS transition is neutralised by the global reduced-motion block, so the
 * swap simply becomes instant rather than being lost.
 */
export function LiveryTheme({
  livery,
  children,
  className,
}: {
  livery: Livery
  children: React.ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  useDeferredMotion(
    ({ gsap, ScrollTrigger }) => {
      const el = ref.current
      if (!el) return

      const root = document.documentElement
      const apply = () => {
        root.style.setProperty('--livery-primary', livery.primary)
        root.style.setProperty('--livery-secondary', livery.secondary)
        root.style.setProperty('--livery-accent', livery.accent)
        root.style.setProperty('--livery-surface', livery.surface)
      }

      return gsap.context(() => {
        ScrollTrigger.create({
          trigger: el,
          start: 'top 60%',
          end: 'bottom 40%',
          onEnter: apply,
          onEnterBack: apply,
        })
      })
    },
    [livery]
  )

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}
