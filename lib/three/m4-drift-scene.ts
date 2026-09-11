/**
 * The drifting / exploding M4 GT3.
 *
 * Everything three.js lives in this module so it lands in an async chunk. It is
 * imported only from inside an effect — a static import would put ~170 KB gzip
 * on the shared /cars/[slug] bundle, which all five car pages load.
 *
 * Axes come from the glTF (verified, not assumed): +X left, +Y up, +Z front.
 * So yaw is about Y, wheel spin about X, steering about Y.
 *
 * The explosion is a lerp along each part's EXPLODE_OFFSET rather than a scrub
 * of a baked clip. Two reasons: drift and explosion stay completely independent
 * (the whole point — the car keeps drifting while you control the come-apart),
 * and it is one vector add per part per frame instead of an AnimationMixer.
 */
import type { Object3D, PerspectiveCamera, Scene, WebGLRenderer } from 'three'

export type DriftScene = {
  /** 0 = assembled, 1 = fully exploded. */
  setExplode: (t: number) => void
  dispose: () => void
}

type Opts = {
  canvas: HTMLCanvasElement
  modelUrl: string
  dracoPath: string
  onLoaded?: () => void
}

const CORNERS = ['FL', 'FR', 'RL', 'RR'] as const

export async function createDriftScene({
  canvas,
  modelUrl,
  dracoPath,
  onLoaded,
}: Opts): Promise<DriftScene> {
  const THREE = await import('three')
  const [{ GLTFLoader }, { DRACOLoader }, { RoomEnvironment }] = await Promise.all([
    import('three/examples/jsm/loaders/GLTFLoader.js'),
    import('three/examples/jsm/loaders/DRACOLoader.js'),
    import('three/examples/jsm/environments/RoomEnvironment.js'),
  ])

  const renderer: WebGLRenderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.25

  const scene: Scene = new THREE.Scene()

  // Procedural studio environment: car paint needs something to reflect, and
  // this costs no extra download (an HDRI would be another megabyte).
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environmentIntensity = 1.35

  // Fixed framing. Aimed at the car's vertical centre (~0.62 m) and pulled back
  // just far enough to keep the drift envelope and the exploded extent in frame.
  const camera: PerspectiveCamera = new THREE.PerspectiveCamera(34, 1, 0.1, 200)
  camera.position.set(6.6, 3.3, 8.2)
  camera.lookAt(0, 0.62, 0)

  const key = new THREE.DirectionalLight(0xffffff, 4.2)
  key.position.set(6, 9, 6)
  scene.add(key)
  const fill = new THREE.DirectionalLight(0xaecbff, 1.4)
  fill.position.set(-8, 3, 5)
  scene.add(fill)
  const rim = new THREE.DirectionalLight(0xffffff, 3.0)
  rim.position.set(-4, 5, -9)
  scene.add(rim)
  // Lifts the shadowed underside off the dark page background.
  scene.add(new THREE.HemisphereLight(0x9fb4d4, 0x101216, 1.1))

  // --- procedural sprite textures: no extra download for either effect ---
  function radialTexture(stops: [number, string][], size = 128) {
    const cv = document.createElement('canvas')
    cv.width = cv.height = size
    const g = cv.getContext('2d')!
    const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    for (const [at, col] of stops) grd.addColorStop(at, col)
    g.fillStyle = grd
    g.fillRect(0, 0, size, size)
    return new THREE.CanvasTexture(cv)
  }

  // Fake contact shadow. A real shadow map for 800k triangles costs far more
  // than this is worth, and at this camera angle a soft ellipse is
  // indistinguishable — but without it the car reads as floating.
  // The page behind is near-black, so a shadow alone reads as nothing. This
  // gives it a surface to sit on without introducing a visible hard edge.
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(26, 26),
    new THREE.MeshBasicMaterial({
      map: radialTexture([
        [0, 'rgba(150,165,190,0.10)'],
        [0.45, 'rgba(120,135,160,0.045)'],
        [1, 'rgba(0,0,0,0)'],
      ], 256),
      transparent: true,
      depthWrite: false,
    })
  )
  floor.rotation.x = -Math.PI / 2
  scene.add(floor)

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(6.4, 3.6),
    new THREE.MeshBasicMaterial({
      map: radialTexture([
        [0, 'rgba(0,0,0,0.62)'],
        [0.5, 'rgba(0,0,0,0.26)'],
        [1, 'rgba(0,0,0,0)'],
      ]),
      transparent: true,
      depthWrite: false,
    })
  )
  shadow.rotation.x = -Math.PI / 2
  shadow.position.y = 0.012
  scene.add(shadow)

  // --- tyre smoke: one draw call, per-particle size and alpha via a tiny shader ---
  const N = 240
  const sPos = new Float32Array(N * 3)
  const sVel = new Float32Array(N * 3)
  const sSize = new Float32Array(N)
  const sAlpha = new Float32Array(N)
  const sLife = new Float32Array(N)
  const smokeGeo = new THREE.BufferGeometry()
  smokeGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3))
  smokeGeo.setAttribute('size', new THREE.BufferAttribute(sSize, 1))
  smokeGeo.setAttribute('alpha', new THREE.BufferAttribute(sAlpha, 1))
  const smoke = new THREE.Points(
    smokeGeo,
    new THREE.ShaderMaterial({
      uniforms: {
        map: {
          value: radialTexture([
            [0, 'rgba(255,255,255,0.50)'],
            [0.45, 'rgba(226,232,242,0.18)'],
            [1, 'rgba(255,255,255,0)'],
          ]),
        },
      },
      vertexShader: `
        attribute float size; attribute float alpha; varying float vA;
        void main() {
          vA = alpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (320.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform sampler2D map; varying float vA;
        void main() {
          vec4 t = texture2D(map, gl_PointCoord);
          gl_FragColor = vec4(t.rgb, t.a * vA);
        }`,
      transparent: true,
      depthWrite: false,
    })
  )
  smoke.frustumCulled = false
  scene.add(smoke)

  const loader = new GLTFLoader()
  const draco = new DRACOLoader().setDecoderPath(dracoPath)
  loader.setDRACOLoader(draco)

  const gltf = await loader.loadAsync(modelUrl)
  const root = gltf.scene.getObjectByName('M4GT3_ROOT')
  if (!root) throw new Error('M4GT3_ROOT missing from model')
  scene.add(gltf.scene)

  // glTF `extras` arrive as userData. Anything carrying EXPLODE_OFFSET moves.
  const parts: { obj: Object3D; base: InstanceType<typeof THREE.Vector3>; off: InstanceType<typeof THREE.Vector3> }[] = []
  root.traverse((o) => {
    const raw = (o.userData as Record<string, unknown>)?.EXPLODE_OFFSET
    if (Array.isArray(raw) && raw.length === 3) {
      parts.push({
        obj: o,
        base: o.position.clone(),
        off: new THREE.Vector3(raw[0] as number, raw[1] as number, raw[2] as number),
      })
    }
  })

  const hubs = CORNERS.map((c) => root.getObjectByName(`HUB_${c}`)).filter(Boolean) as Object3D[]
  const steer = (['FL', 'FR'] as const)
    .map((c) => root.getObjectByName(`CORNER_${c}`))
    .filter(Boolean) as Object3D[]

  function resize() {
    const w = canvas.clientWidth || 1
    const h = canvas.clientHeight || 1
    if (canvas.width !== w || canvas.height !== h) {
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
  }

  let explode = 0
  let raf = 0
  let last = performance.now()
  let emitAcc = 0
  const start = performance.now()
  const rearL = root.getObjectByName('CORNER_RL')
  const rearR = root.getObjectByName('CORNER_RR')
  const tmp = new THREE.Vector3()

  function frame(now: number) {
    raf = requestAnimationFrame(frame)
    resize()
    const t = (now - start) / 1000

    // Continuous drift: a sustained slide that reverses, never a full spin.
    const phase = t * 0.42
    const yaw = Math.sin(phase) * 0.62
    root!.rotation.y = yaw
    root!.position.x = Math.sin(phase) * 0.55
    root!.position.z = Math.cos(phase * 2) * 0.22

    // Wheels spin with the slide; fronts counter-steer into it, as they would.
    const wheelSpin = t * 13
    for (const h of hubs) h.rotation.x = wheelSpin
    const counter = -yaw * 0.55
    for (const s of steer) s.rotation.y = counter

    for (const p of parts) p.obj.position.copy(p.base).addScaledVector(p.off, explode)

    const dt = Math.min((now - last) / 1000, 0.05)
    last = now

    // Shadow tracks the car and shrinks as the body lifts away during the explode.
    shadow.position.x = root!.position.x
    shadow.position.z = root!.position.z
    shadow.rotation.z = -yaw
    ;(shadow.material as { opacity: number }).opacity = 0.95 - explode * 0.55

    // Smoke pours off the rear tyres, thinning out as the car comes apart.
    emitAcc += dt * 150 * (1 - explode * 0.85)
    const rears = [rearL, rearR].filter(Boolean) as Object3D[]
    let emitN = Math.floor(emitAcc)
    emitAcc -= emitN
    while (emitN > 0 && rears.length) {
      // Alternate wheels, otherwise the first one consumes the whole budget.
      const src = rears[emitN % rears.length]!
      src.getWorldPosition(tmp)
      {
        emitN -= 1
        let i = -1
        for (let k = 0; k < N; k++) if ((sLife[k] as number) <= 0) { i = k; break }
        if (i < 0) break
        sPos[i * 3] = tmp.x + (Math.random() - 0.5) * 0.25
        sPos[i * 3 + 1] = 0.06 + Math.random() * 0.12
        sPos[i * 3 + 2] = tmp.z + (Math.random() - 0.5) * 0.25
        // Thrown backwards along the slide, plus a little lift and spread.
        sVel[i * 3] = -Math.sin(yaw) * 1.9 + (Math.random() - 0.5) * 1.1
        sVel[i * 3 + 1] = 0.45 + Math.random() * 0.5
        sVel[i * 3 + 2] = -Math.cos(yaw) * 1.9 + (Math.random() - 0.5) * 1.1
        sLife[i] = 1.5 + Math.random() * 0.9
        sSize[i] = 0.5 + Math.random() * 0.5
      }
    }
    for (let i = 0; i < N; i++) {
      const life = sLife[i] as number
      if (life <= 0) { sAlpha[i] = 0; continue }
      const j = i * 3
      const vx = sVel[j] as number
      const vy = sVel[j + 1] as number
      const vz = sVel[j + 2] as number
      sPos[j] = (sPos[j] as number) + vx * dt
      sPos[j + 1] = (sPos[j + 1] as number) + vy * dt
      sPos[j + 2] = (sPos[j + 2] as number) + vz * dt
      sVel[j] = vx * 0.965
      sVel[j + 2] = vz * 0.965
      sSize[i] = (sSize[i] as number) + dt * 1.5
      const next = life - dt
      sLife[i] = next
      sAlpha[i] = Math.max(next, 0) * 0.32
    }
    smokeGeo.attributes.position!.needsUpdate = true
    smokeGeo.attributes.size!.needsUpdate = true
    smokeGeo.attributes.alpha!.needsUpdate = true

    renderer.render(scene, camera)
  }

  resize()
  raf = requestAnimationFrame(frame)
  onLoaded?.()

  return {
    setExplode(v: number) {
      explode = v < 0 ? 0 : v > 1 ? 1 : v
    },
    dispose() {
      cancelAnimationFrame(raf)
      draco.dispose()
      pmrem.dispose()
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
