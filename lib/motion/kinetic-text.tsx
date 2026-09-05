'use client'

import { Fragment, useRef, type ElementType } from 'react'
import { useDeferredMotion } from './defer'
import { useReducedMotion } from './use-reduced-motion'

type Props = {
  children: string
  as?: ElementType
  className?: string
  /** Seconds to wait after the element enters before starting. */
  delay?: number
}

/**
 * Per-word masked entrance: each word rises out of a clipped line.
 *
 * The text is rendered in full in the markup — the animation only hides it
 * once JS has confirmed motion is wanted. No JS, or reduced motion, and the
 * heading is simply there, which is the correct outcome in both cases.
 */
export function KineticText({
  children,
  as: Tag = 'span',
  className,
  delay = 0,
}: Props) {
  const ref = useRef<HTMLElement | null>(null)
  const reduced = useReducedMotion()

  useDeferredMotion(
    ({ gsap }) => {
      const el = ref.current
      if (!el) return

      const words = el.querySelectorAll<HTMLElement>('[data-word]')
      if (words.length === 0) return

      return gsap.context(() => {
        gsap.set(words, { yPercent: 115 })
        gsap.to(words, {
          yPercent: 0,
          duration: 1,
          delay,
          ease: 'expo.out',
          stagger: 0.055,
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        })
      }, el)
    },
    [children, delay],
    !reduced
  )

  const words = children.split(' ')

  return (
    <Tag ref={ref} className={className}>
      {words.map((word, i) => (
        <Fragment key={`${word}-${i}`}>
          {/* The mask must clip only the word. The inter-word space lives
              outside it, or overflow-hidden collapses it and the words run
              together once the line wraps. */}
          <span className="inline-block overflow-hidden align-bottom">
            <span data-word className="inline-block will-change-transform">
              {word}
            </span>
          </span>
          {i < words.length - 1 ? ' ' : null}
        </Fragment>
      ))}
    </Tag>
  )
}
