'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { withBasePath } from '@/lib/base-path'
import { labelFor, CATEGORY_LABELS } from '@/content/part-labels'
import type { DiagramScene, PartInfo } from '@/lib/three/m4-diagram-scene'

/**
 * On-demand labelled 3D diagram.
 *
 * Nothing here loads until the reader presses the button — the model and
 * three.js together are ~8 MB, which is not a cost to charge someone who came
 * to read about the car. Because it is explicitly user-initiated it is also
 * available under reduced motion: nothing moves unless the reader moves it.
 */
export function CarDiagram() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<DiagramScene | null>(null)
  const [active, setActive] = useState(false)
  // Starts true the moment the reader activates, set alongside setActive in
  // the click handler so the effect never has to setState synchronously.
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [categories, setCategories] = useState<string[]>([])
  const [filter, setFilter] = useState<string | null>(null)
  const [selected, setSelected] = useState<PartInfo | null>(null)
  const [explode, setExplode] = useState(0)

  useEffect(() => {
    if (!active) return
    const el = canvas.current
    if (!el) return

    let cancelled = false
    let scene: DiagramScene | null = null

    void (async () => {
      try {
        // Probed in here rather than in the effect body: a synchronous
        // setState during an effect triggers an immediate extra render pass.
        if (!window.WebGLRenderingContext) throw new Error('no webgl')
        const { createDiagramScene } = await import('@/lib/three/m4-diagram-scene')
        if (cancelled) return
        scene = await createDiagramScene({
          canvas: el,
          modelUrl: withBasePath('/model/m4-gt3-exploded.glb'),
          dracoPath: withBasePath('/draco/'),
        })
        if (cancelled) {
          scene.dispose()
          return
        }
        sceneRef.current = scene
        scene.onSelect(setSelected)
        setCategories(scene.categories())
        setLoading(false)
      } catch {
        if (!cancelled) {
          setFailed(true)
          setLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
      scene?.dispose()
      sceneRef.current = null
    }
  }, [active])

  const onExplode = useCallback((v: number) => {
    setExplode(v)
    sceneRef.current?.setExplode(v)
  }, [])

  const onFilter = useCallback((c: string | null) => {
    setFilter(c)
    sceneRef.current?.setCategoryFilter(c)
  }, [])

  return (
    <section id="explore" className="scroll-mt-14 border-t border-ink-800 px-6 py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <h2 className="font-display text-[clamp(1.8rem,5vw,3.2rem)] font-black uppercase leading-none tracking-[-0.02em] text-white">
            Explore the car
          </h2>
          <p className="max-w-md text-[0.975rem] leading-relaxed text-ink-400">
            An interactive model of the M4 GT3. Click any component to identify it, isolate a
            system, or take the car apart.
          </p>
        </div>

        {!active ? (
          <div className="flex flex-col items-start gap-4 rounded-sm border border-ink-800 bg-ink-950 p-8">
            <p className="text-[0.95rem] leading-relaxed text-ink-300">
              The interactive model is about 8 MB. It loads only when you ask for it.
            </p>
            <button
              type="button"
              onClick={() => {
                setLoading(true)
                setActive(true)
              }}
              className="inline-flex items-center gap-3 border-b border-[var(--livery-accent)] pb-1 font-display text-[12px] font-bold uppercase tracking-[0.2em] text-ink-100 transition-colors hover:text-white"
            >
              Load the interactive model
              <span aria-hidden>→</span>
            </button>
          </div>
        ) : failed ? (
          <div className="rounded-sm border border-ink-800 bg-ink-950 p-8 text-[0.95rem] text-ink-300">
            The interactive model could not be loaded in this browser. The photography and
            specifications on this page cover the same car.
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
            <div className="relative aspect-[16/10] overflow-hidden rounded-sm border border-ink-800 bg-ink-950">
              <canvas ref={canvas} className="h-full w-full touch-none" />
              {loading && (
                <div className="absolute inset-0 grid place-items-center">
                  <p className="font-display text-[11px] font-bold uppercase tracking-[0.28em] text-ink-400">
                    Loading model…
                  </p>
                </div>
              )}
              {!loading && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 p-5">
                  <div className="inline-block rounded-sm bg-ink-950/85 px-4 py-3 backdrop-blur-sm">
                    <p className="font-display text-[10px] font-bold uppercase tracking-[0.24em] text-ink-400">
                      {selected ? CATEGORY_LABELS[selected.category] ?? selected.category : 'Selected part'}
                    </p>
                    <p className="mt-1 font-display text-lg font-bold leading-tight text-white">
                      {selected ? labelFor(selected.name, selected.category) : 'Click a component'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-7">
              <div>
                <label
                  htmlFor="explode-range"
                  className="mb-3 block font-display text-[11px] font-bold uppercase tracking-[0.24em] text-ink-400"
                >
                  Disassembly
                </label>
                <input
                  id="explode-range"
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={explode}
                  onChange={(e) => onExplode(Number(e.target.value))}
                  className="w-full accent-[var(--livery-accent)]"
                />
                <p className="mt-2 text-[12px] tabular-nums text-ink-500">
                  {Math.round(explode * 100)}% apart
                </p>
              </div>

              <div>
                <p className="mb-3 font-display text-[11px] font-bold uppercase tracking-[0.24em] text-ink-400">
                  System
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <FilterChip active={filter === null} onClick={() => onFilter(null)}>
                    All
                  </FilterChip>
                  {categories.map((c) => (
                    <FilterChip key={c} active={filter === c} onClick={() => onFilter(c)}>
                      {CATEGORY_LABELS[c] ?? c}
                    </FilterChip>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => sceneRef.current?.resetView()}
                className="self-start font-display text-[11px] font-bold uppercase tracking-[0.2em] text-ink-400 transition-colors hover:text-ink-100"
              >
                Reset view
              </button>

              <p className="text-[12px] leading-relaxed text-ink-500">
                Drag to orbit, scroll to zoom. Engine, drivetrain, cooling, exhaust and suspension
                are representative geometry — the source model does not include them.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors ${
        active ? 'bg-ink-100 text-ink-950' : 'bg-ink-800/70 text-ink-300 hover:bg-ink-800'
      }`}
    >
      {children}
    </button>
  )
}
