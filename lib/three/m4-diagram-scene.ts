/**
 * Interactive labelled diagram of the M4 GT3.
 *
 * All three.js lives here so it lands in an async chunk, loaded only when the
 * reader asks for it. That is the point of this module existing separately
 * from the hero: the ~8 MB model is opt-in, not charged to every visitor.
 *
 * Axes come from the glTF (verified, not assumed): +X left, +Y up, +Z front.
 *
 * The staged reveal is the same maths the scroll version used — each part has
 * a window within the global 0..1 explode value, so systems separate in a
 * sequence a teardown would actually follow rather than everything popping
 * apart at once. Here a slider drives it instead of scroll position.
 */
import type { PerspectiveCamera, Scene, WebGLRenderer, Mesh } from 'three'

export type PartInfo = { name: string; category: string }

export type DiagramScene = {
  setExplode: (t: number) => void
  /** null clears the filter and shows everything. */
  setCategoryFilter: (category: string | null) => void
  /** Fired when the reader clicks a part, or clicks empty space (null). */
  onSelect: (cb: (part: PartInfo | null) => void) => void
  select: (name: string | null) => void
  categories: () => string[]
  resetView: () => void
  dispose: () => void
}

type Opts = {
  canvas: HTMLCanvasElement
  modelUrl: string
  dracoPath: string
}

const STAGE_WINDOW: Record<string, [number, number]> = {
  EXTERIOR: [0.0, 0.38],
  AERODYNAMICS: [0.0, 0.38],
  GLASS: [0.12, 0.5],
  WHEELS: [0.16, 0.62],
  SUSPENSION: [0.2, 0.64],
  BRAKES: [0.22, 0.66],
  COOLING: [0.3, 0.72],
  DRIVETRAIN: [0.4, 0.82],
  EXHAUST: [0.42, 0.84],
  CHASSIS: [0.46, 0.85],
  COCKPIT: [0.46, 0.85],
  ENGINE: [0.5, 0.9],
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1)
  return t * t * (3 - 2 * t)
}

export async function createDiagramScene({
  canvas,
  modelUrl,
  dracoPath,
}: Opts): Promise<DiagramScene> {
  const THREE = await import('three')
  const [{ GLTFLoader }, { DRACOLoader }, { RoomEnvironment }, { OrbitControls }] =
    await Promise.all([
      import('three/examples/jsm/loaders/GLTFLoader.js'),
      import('three/examples/jsm/loaders/DRACOLoader.js'),
      import('three/examples/jsm/environments/RoomEnvironment.js'),
      import('three/examples/jsm/controls/OrbitControls.js'),
    ])

  const renderer: WebGLRenderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15

  const scene: Scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environmentIntensity = 1.2

  const camera: PerspectiveCamera = new THREE.PerspectiveCamera(38, 1, 0.1, 200)
  const HOME = new THREE.Vector3(5.4, 2.7, 6.6)
  const TARGET = new THREE.Vector3(0, 0.55, 0)
  camera.position.copy(HOME)

  const controls = new OrbitControls(camera, canvas)
  controls.target.copy(TARGET)
  controls.enableDamping = true
  controls.dampingFactor = 0.07
  controls.minDistance = 3.2
  controls.maxDistance = 16
  // Stop the reader from orbiting under the floor, where the car reads as a
  // floating shell and the lighting makes no sense.
  controls.maxPolarAngle = Math.PI * 0.495
  controls.update()

  scene.add(new THREE.HemisphereLight(0xa8bed8, 0x14161c, 1.2))
  const key = new THREE.DirectionalLight(0xffffff, 3.0)
  key.position.set(5, 8, 6)
  scene.add(key)
  const fill = new THREE.DirectionalLight(0xbcd2ff, 1.1)
  fill.position.set(-7, 3, 4)
  scene.add(fill)
  const rim = new THREE.DirectionalLight(0xffffff, 2.0)
  rim.position.set(-3, 4, -8)
  scene.add(rim)

  const loader = new GLTFLoader()
  const draco = new DRACOLoader().setDecoderPath(dracoPath)
  loader.setDRACOLoader(draco)
  const gltf = await loader.loadAsync(modelUrl)
  const root = gltf.scene.getObjectByName('M4GT3_ROOT')
  if (!root) throw new Error('M4GT3_ROOT missing from model')
  scene.add(gltf.scene)

  type Part = {
    obj: Mesh
    base: InstanceType<typeof THREE.Vector3>
    off: InstanceType<typeof THREE.Vector3>
    category: string
    original: unknown
  }
  const parts: Part[] = []
  root.traverse((o) => {
    const data = o.userData as Record<string, unknown>
    const raw = data?.EXPLODE_OFFSET
    if (Array.isArray(raw) && raw.length === 3 && (o as Mesh).isMesh) {
      parts.push({
        obj: o as Mesh,
        base: o.position.clone(),
        off: new THREE.Vector3(raw[0] as number, raw[1] as number, raw[2] as number),
        category: typeof data.CATEGORY === 'string' ? data.CATEGORY : 'OTHER',
        original: (o as Mesh).material,
      })
    }
  })

  const categories = Array.from(new Set(parts.map((p) => p.category))).sort()

  // One shared highlight material rather than mutating each part's own — the
  // model reuses materials across many parts, so tweaking emissive in place
  // would light up every part that happens to share that material.
  const highlight = new THREE.MeshStandardMaterial({
    color: 0x1c69d4,
    emissive: 0x1c69d4,
    emissiveIntensity: 0.55,
    roughness: 0.35,
    metalness: 0.4,
  })

  let explode = 0
  let filter: string | null = null
  let selected: Part | null = null
  let selectCb: (p: PartInfo | null) => void = () => {}
  let raf = 0

  function applyFilter() {
    for (const p of parts) {
      const shown = !filter || p.category === filter
      p.obj.visible = shown
    }
  }

  function setSelected(next: Part | null) {
    if (selected && selected !== next) {
      selected.obj.material = selected.original as never
    }
    selected = next
    if (next) next.obj.material = highlight
    selectCb(next ? { name: next.obj.name, category: next.category } : null)
  }

  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  let downAt = { x: 0, y: 0 }

  function onPointerDown(e: PointerEvent) {
    downAt = { x: e.clientX, y: e.clientY }
  }
  function onPointerUp(e: PointerEvent) {
    // Ignore the pointer-up that ends an orbit drag; only treat a near-static
    // press as a selection click.
    const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y)
    if (moved > 5) return
    const rect = canvas.getBoundingClientRect()
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(pointer, camera)
    const visible = parts.filter((p) => p.obj.visible).map((p) => p.obj)
    const hits = raycaster.intersectObjects(visible, false)
    if (!hits.length) {
      setSelected(null)
      return
    }
    const hit = hits[0]!.object
    setSelected(parts.find((p) => p.obj === hit) ?? null)
  }
  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('pointerup', onPointerUp)

  function resize() {
    const w = canvas.clientWidth || 1
    const h = canvas.clientHeight || 1
    if (canvas.width !== w || canvas.height !== h) {
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
  }

  function frame() {
    raf = requestAnimationFrame(frame)
    resize()
    for (const p of parts) {
      const w = STAGE_WINDOW[p.category] ?? [0, 1]
      const local = smoothstep(w[0], w[1], explode)
      p.obj.position.copy(p.base).addScaledVector(p.off, local)
    }
    controls.update()
    renderer.render(scene, camera)
  }
  resize()
  raf = requestAnimationFrame(frame)

  return {
    setExplode(v) {
      explode = v < 0 ? 0 : v > 1 ? 1 : v
    },
    setCategoryFilter(c) {
      filter = c
      // A selected part that the filter just hid would otherwise stay
      // highlighted and named while invisible.
      if (selected && filter && selected.category !== filter) setSelected(null)
      applyFilter()
    },
    onSelect(cb) {
      selectCb = cb
    },
    select(name) {
      setSelected(name ? parts.find((p) => p.obj.name === name) ?? null : null)
    },
    categories: () => categories,
    resetView() {
      camera.position.copy(HOME)
      controls.target.copy(TARGET)
      controls.update()
    },
    dispose() {
      cancelAnimationFrame(raf)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointerup', onPointerUp)
      controls.dispose()
      draco.dispose()
      pmrem.dispose()
      highlight.dispose()
      scene.traverse((o) => {
        const m = o as { geometry?: { dispose(): void }; material?: unknown }
        m.geometry?.dispose()
        const mat = m.material
        if (Array.isArray(mat)) mat.forEach((x) => (x as { dispose(): void }).dispose())
        else if (mat) (mat as { dispose(): void }).dispose()
      })
      renderer.dispose()
    },
  }
}
