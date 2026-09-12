'use client'

import { useEffect, useRef, useState } from 'react'
import { withBasePath } from '@/lib/base-path'
import { useReducedMotion } from '@/lib/motion/use-reduced-motion'

/**
 * Video hero: real BMW PressClub footage that plays on arrival, with detail
 * beats revealed as the reader scrolls past it.
 *
 * This replaces a scroll-scrubbed frame sequence. Scrubbing 120 stills reads
 * as rough no matter how the frames are encoded — scroll events are coarse
 * and irregular, so the playhead stutters in a way continuous playback never
 * does. Letting the video play at its own rate and using scroll only to
 * reveal copy is both smoother and lighter (1.6 MB AV1 / 2.5 MB H.264 against
 * 2.4 MB of frames).
 *
 * `children` is the ordinary photographic <CarHero>, and it is the real hero
 * for reduced motion and for anyone whose browser refuses autoplay.
 */

/**
 * Scroll-progress windows for the detail beats, as fractions of the section.
 *
 * ACCURACY: this footage is the 2021 M4 GT3 development car in camouflage —
 * the generation BEFORE the EVO this page is about. The copy says so rather
 * than letting a reader assume otherwise. Claims here are checkable: the 2021
 * date is on the clip's own slate, and the ~80 wins are the EVO's 2025 debut
 * season, already carried as verified data in content/cars/m4-gt3-evo.ts.
 * The circuit is deliberately unnamed — the footage does not identify it.
 */
const BEATS: { at: [number, number]; kicker: string; line: string }[] = [
  {
    at: [0.04, 0.34],
    kicker: 'Development testing · 2021',
    line: 'It started as a prototype in camouflage.',
  },
  {
    at: [0.36, 0.66],
    kicker: 'The platform',
    line: 'Proving the car that would become the most widely raced GT3 BMW M builds.',
  },
  {
    at: [0.68, 0.98],
    kicker: 'BMW M4 GT3 EVO · 2025',
    line: 'The EVO followed — and won around eighty times in its debut season.',
  },
]

export function CarHeroVideo({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion()
  const wrap = useRef<HTMLDivElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  // Beat opacity updates every frame, so it is written straight to the DOM
  // rather than through React state — the rule ladder-sequence.tsx follows.
  // 60 setState calls a second would re-render the hero on every scroll tick.
  const beatRefs = useRef<(HTMLDivElement | null)[]>([])
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (reduced) return
    const section = wrap.current
    const el = video.current
    if (!section || !el) return

    let raf = 0
    let cancelled = false

    // Autoplay can be refused (iOS low power mode, data saver, policy). If it
    // is, the poster stays up and the beats still work — the page is never
    // left showing a dead black rectangle.
    void el.play().then(
      () => {
        if (!cancelled) setPlaying(true)
      },
      () => {}
    )

    // Pause while off-screen. A looping video decoding behind three screens of
    // article is wasted battery on a laptop and noticeable on a phone.
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return
        if (entry.isIntersecting) void el.play().catch(() => {})
        else el.pause()
      },
      { threshold: 0.05 }
    )
    io.observe(section)

    const tick = () => {
      raf = requestAnimationFrame(tick)
      const r = section.getBoundingClientRect()
      const travel = r.height - window.innerHeight
      const p = travel > 0 ? Math.min(Math.max(-r.top / travel, 0), 1) : 0
      for (let i = 0; i < BEATS.length; i++) {
        const node = beatRefs.current[i]
        if (!node) continue
        const [s, e] = BEATS[i]!.at
        const mid = (s + e) / 2
        const half = (e - s) / 2
        const o = Math.max(0, 1 - Math.abs(p - mid) / half)
        const eased = o * o * (3 - 2 * o)
        node.style.opacity = eased.toFixed(3)
        node.style.transform = `translate3d(0, ${((1 - eased) * 18).toFixed(1)}px, 0)`
      }
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      io.disconnect()
    }
  }, [reduced])

  // Reduced motion: the photographic hero at its natural height. No video.
  if (reduced) return <>{children}</>

  return (
    <section ref={wrap} className="relative h-[260svh]">
      <div className="sticky top-0 h-svh overflow-hidden bg-ink-950">
        {/* The photo hero stays mounted underneath until the video is actually
            running, so a refused autoplay degrades to it rather than to black. */}
        <div className={playing ? 'opacity-0 transition-opacity duration-700' : ''}>
          {children}
        </div>

        <video
          ref={video}
          aria-hidden
          muted
          loop
          playsInline
          preload="metadata"
          poster={withBasePath('/video/m4-gt3-hero.jpg')}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
            playing ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          {/* AV1 first: roughly a third smaller, and browsers pick by order. */}
          <source src={withBasePath('/video/m4-gt3-hero.webm')} type="video/webm; codecs=av01.0.05M.08" />
          <source src={withBasePath('/video/m4-gt3-hero.mp4')} type="video/mp4" />
        </video>

        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-ink-950 via-ink-950/70 to-transparent" />
        </div>

        {/* Not aria-hidden: this is real editorial copy, and it is the only
            place some of it appears. Screen readers get it in document order. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 mx-auto max-w-7xl px-6 pb-20 sm:pb-28">
          {BEATS.map((beat, i) => (
            <div
              key={beat.kicker}
              ref={(el) => {
                beatRefs.current[i] = el
              }}
              style={{ opacity: 0 }}
              className="absolute bottom-20 left-6 right-6 sm:bottom-28"
            >
              <p className="mb-4 font-display text-[11px] font-bold uppercase tracking-[0.28em] text-ink-300">
                {beat.kicker}
              </p>
              <p className="max-w-2xl text-balance font-display text-[clamp(1.5rem,4vw,2.9rem)] font-black uppercase leading-[0.95] tracking-[-0.02em] text-white">
                {beat.line}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
