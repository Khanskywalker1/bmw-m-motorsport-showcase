'use client'

import { useEffect, useRef, useState } from 'react'
import { withBasePath } from '@/lib/base-path'
import { useReducedMotion } from '@/lib/motion/use-reduced-motion'
import type { DriftScene } from '@/lib/three/m4-drift-scene'

/**
 * Scroll-driven drifting / exploding hero for the M4 GT3.
 *
 * `children` is the ordinary photographic <CarHero>. It is not a placeholder —
 * it is the real hero for everyone who never gets WebGL: reduced motion, no JS,
 * a failed load, or simply the seconds before an 8 MB model arrives. The canvas
 * fades in over the top only once the scene is actually running, so the LCP
 * image is the photo either way.
 *
 * Scroll maps to a there-and-back: apart, hold, back together. Drift is
 * independent of it and never stops.
 */
export function CarHeroDrift({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion()
  const wrap = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (reduced) return
    const el = canvas.current
    const section = wrap.current
    if (!el || !section) return
    // Cheap capability probe: never download 8 MB for a device that can't draw it.
    if (!window.WebGLRenderingContext) return
    // Nor for someone who has told the browser they are paying for data.
    const conn = (
      navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string }
      }
    ).connection
    if (conn?.saveData) return
    if (conn?.effectiveType && /^(slow-)?2g$/.test(conn.effectiveType)) return

    let scene: DriftScene | null = null
    let cancelled = false
    let raf = 0

    void (async () => {
      try {
        const { createDriftScene } = await import('@/lib/three/m4-drift-scene')
        if (cancelled) return
        scene = await createDriftScene({
          canvas: el,
          modelUrl: withBasePath('/model/m4-gt3-exploded.glb'),
          dracoPath: withBasePath('/draco/'),
        })
        // The chunk or the model may have landed after unmount.
        if (cancelled) {
          scene.dispose()
          scene = null
          return
        }
        setReady(true)

        const tick = () => {
          raf = requestAnimationFrame(tick)
          const r = section.getBoundingClientRect()
          const travel = r.height - window.innerHeight
          // Progress through the tall section drives the come-apart.
          const p = travel > 0 ? Math.min(Math.max(-r.top / travel, 0), 1) : 0
          // apart (0→.40) · hold (.40→.60) · back together (.60→1)
          const t = p < 0.4 ? p / 0.4 : p < 0.6 ? 1 : (1 - p) / 0.4
          const eased = t * t * (3 - 2 * t) // smoothstep, no overshoot
          scene?.setExplode(eased)
        }
        raf = requestAnimationFrame(tick)
      } catch {
        // Leave the photographic hero in place; nothing to recover.
      }
    })()

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      scene?.dispose()
    }
  }, [reduced])

  // Reduced motion: the photo hero, at its natural height. No canvas, no three.js.
  if (reduced) return <>{children}</>

  return (
    <section ref={wrap} className="relative h-[260svh]">
      <div className="sticky top-0 h-svh overflow-hidden">
        <div className={ready ? 'opacity-0 transition-opacity duration-700' : ''}>
          {children}
        </div>
        <canvas
          ref={canvas}
          aria-hidden
          className={`absolute inset-0 h-full w-full transition-opacity duration-700 ${
            ready ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        />
      </div>
    </section>
  )
}
