'use client'

import { useEffect, useRef, useState } from 'react'
import { withBasePath } from '@/lib/base-path'
import { useReducedMotion } from '@/lib/motion/use-reduced-motion'
import { FILMS } from '@/content/hero-films'

/**
 * Video hero: real BMW PressClub footage that plays on arrival, with detail
 * beats revealed as the reader scrolls past it.
 *
 * This replaces a scroll-scrubbed frame sequence. Scrubbing 120 stills reads
 * as rough no matter how the frames are encoded — scroll events are coarse
 * and irregular, so the playhead stutters in a way continuous playback never
 * does. Letting the video play at its own rate and using scroll only to
 * reveal copy is both smoother and lighter than scrubbing 120 stills.
 *
 * Encoded from the ProRes 422 HQ master (177 Mbps) rather than PressClub's
 * 2.5 Mbps preview, at native 1080p for desktop: an earlier pass encoded 720p
 * and let the full-bleed hero upscale it ~1.9x on a 2x display, which is why
 * it looked soft.
 *
 * `children` is the ordinary photographic <CarHero>, and it is the real hero
 * for reduced motion and for anyone whose browser refuses autoplay.
 */


export function CarHeroVideo({
  slug,
  children,
}: {
  slug: string
  children: React.ReactNode
}) {
  const film = FILMS[slug]
  const reduced = useReducedMotion()
  const wrap = useRef<HTMLDivElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  // Beat opacity updates every frame, so it is written straight to the DOM
  // rather than through React state — the rule ladder-sequence.tsx follows.
  // 60 setState calls a second would re-render the hero on every scroll tick.
  const beatRefs = useRef<(HTMLDivElement | null)[]>([])
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (reduced || !film) return
    const beats = film.beats
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
      for (let i = 0; i < beats.length; i++) {
        const node = beatRefs.current[i]
        if (!node) continue
        const [s, e] = beats[i]!.at
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
  }, [reduced, film])

  // Reduced motion: the photographic hero at its natural height. No video.
  // An unrecognised slug degrades the same way rather than rendering a
  // <video> with no sources, which would show as a dead black rectangle.
  if (reduced || !film) return <>{children}</>

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
          poster={withBasePath(`/video/${film.prefix}.jpg`)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
            playing ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          {/* Order matters twice over: the browser takes the first entry whose
              media query matches AND whose codec it supports. So AV1 leads on
              each tier (most engines take it; H.264 covers Safari on Intel and
              older browsers), and the desktop tier is listed first.

              `media` on <source> is evaluated at load only — it is not
              re-checked on resize. Fine for a hero; worth knowing. */}
          <source
            media="(min-width: 821px)"
            src={withBasePath(`/video/${film.prefix}-1080.webm`)}
            type="video/webm; codecs=av01.0.05M.08"
          />
          <source
            media="(min-width: 821px)"
            src={withBasePath(`/video/${film.prefix}-1080.mp4`)}
            type="video/mp4"
          />
          {/* Phones get 720p: the 1080p pair is ~2x the bytes for a screen that
              cannot resolve the difference. */}
          <source
            src={withBasePath(`/video/${film.prefix}-720.webm`)}
            type="video/webm; codecs=av01.0.05M.08"
          />
          <source src={withBasePath(`/video/${film.prefix}-720.mp4`)} type="video/mp4" />
        </video>

        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-ink-950 via-ink-950/70 to-transparent" />
        </div>

        {/* Not aria-hidden: this is real editorial copy, and it is the only
            place some of it appears. Screen readers get it in document order. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 mx-auto max-w-7xl px-6 pb-20 sm:pb-28">
          {film.beats.map((beat, i) => (
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
