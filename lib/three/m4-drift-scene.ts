/**
 * The drifting / exploding M4 GT3.
 *
 * Everything three.js lives in this module so it lands in an async chunk. It is
 * imported only from inside an effect — a static import would put ~170 KB gzip
 * on the shared /cars/[slug] bundle, which all five car pages load.
 *
 * Axes come from the glTF (verified, not assumed): +X left, +Y up, +Z front.
 * So yaw is about Y, wheel spin about X, steering about Y, and an object's
 * local +Z is its own forward direction — rotation.y = φ points that forward
 * axis at world direction (sin φ, cos φ), which every angle below relies on.
 *
 * The explosion is a lerp along each part's EXPLODE_OFFSET rather than a scrub
 * of a baked clip. Two reasons: drift and explosion stay completely independent
 * (the whole point — the car keeps drifting while you control the come-apart),
 * and it is one vector add per part per frame instead of an AnimationMixer.
 *
 * DRIFT KINEMATICS — a hand-authored curve, not a physics sim, but built from
 * the actual definition of a drift rather than an oscillation in place:
 *
 * The car travels around a closed ellipse (continuous forward motion, loops
 * seamlessly — sin/cos need no reset). Heading is the ellipse's own tangent
 * direction (where the car is actually going). The chassis yaw is heading
 * PLUS a slip angle: the nose is pointed further into the turn than the
 * direction of travel, which is what makes it read as sideways rather than
 * just cornering. Body roll leans the chassis away from the turn centre,
 * scaled by the instantaneous speed² (a stand-in for lateral g). Front wheels
 * countersteer against the slip, as a driver catching the slide would. Rear
 * wheels (the only driven wheels — confirmed RWD-only via the Xtrac
 * transaxle) spin faster than a pure roll would require, proportional to the
 * slip angle; fronts roll close to true ground speed.
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

/**
 * Every part's reveal window as a fraction of the global 0..1 explode value.
 * Mirrors the staggered choreography authored into the Blender bake (exterior
 * peels first, mechanical systems mid-reveal, cockpit/chassis last) — without
 * this a single shared explode value pops all 140+ parts apart in lockstep,
 * which reads as a toy rather than an engineering diagram. Categories not
 * built yet (ENGINE, DRIVETRAIN, COOLING, EXHAUST, SUSPENSION) are listed now
 * so wiring them up later needs no runtime change, only new geometry.
 */
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

/** Fallback for parts exported before CATEGORY extras existed. */
function classify(name: string): string {
  if (name.includes('Brake_')) return 'BRAKES'
  if (
    name.includes('Rim_') ||
    name.includes('Tire_') ||
    name.includes('Wheel_Face') ||
    name.includes('Centre_Lock') ||
    name.includes('Valve_Stem') ||
    name.includes('Wheel_Detail')
  )
    return 'WHEELS'
  if (
    name.includes('Rear_Wing') ||
    name.includes('Rear_Diffuser') ||
    name.includes('Front_Splitter')
  )
    return 'AERODYNAMICS'
  if (name.includes('Underfloor')) return 'CHASSIS'
  if (name.includes('Cockpit')) return 'COCKPIT'
  if (name.includes('Glass')) return 'GLASS'
  return 'EXTERIOR'
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1)
  return t * t * (3 - 2 * t)
}

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

  // Fixed framing, aimed at the car's vertical centre (~0.62 m). The camera
  // itself gets a little life later (handheld jitter + a heavily damped
  // follow of the car), but this is its rest pose and what "fixed hero
  // framing" is measured against.
  const baseCamPos = new THREE.Vector3(6.6, 3.3, 8.2)
  const baseLookAt = new THREE.Vector3(0, 0.62, 0)
  const camera: PerspectiveCamera = new THREE.PerspectiveCamera(34, 1, 0.1, 200)
  camera.position.copy(baseCamPos)
  camera.lookAt(baseLookAt)

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

  // --- procedural sprite/canvas textures: no extra download for any of this ---
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

  function verticalGradientTexture(stops: [number, string][], w = 8, h = 256) {
    const cv = document.createElement('canvas')
    cv.width = w
    cv.height = h
    const g = cv.getContext('2d')!
    const grd = g.createLinearGradient(0, 0, 0, h)
    for (const [at, col] of stops) grd.addColorStop(at, col)
    g.fillStyle = grd
    g.fillRect(0, 0, w, h)
    return new THREE.CanvasTexture(cv)
  }

  // Cheap deterministic PRNG (canvas silhouettes just need to look organic,
  // not be cryptographically random) so each mountain layer's ridge line is
  // stable across re-renders rather than reshuffling every reload.
  function mulberry(seed: number) {
    let a = seed
    return () => {
      a |= 0
      a = (a + 0x6d2b79f5) | 0
      let t = Math.imul(a ^ (a >>> 15), 1 | a)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }

  function mountainTexture(color: string, ridges: number, seed: number, w = 1024, h = 256) {
    const cv = document.createElement('canvas')
    cv.width = w
    cv.height = h
    const g = cv.getContext('2d')!
    const rnd = mulberry(seed)
    g.fillStyle = color
    g.beginPath()
    g.moveTo(0, h)
    const baseY = h * 0.55
    let x = 0
    while (x < w) {
      const peak = baseY - rnd() * h * 0.42
      const seg = (w / ridges) * (0.6 + rnd() * 0.8)
      g.lineTo(x, peak)
      x += seg * 0.5
      g.lineTo(x, peak + rnd() * h * 0.12)
      x += seg * 0.5
    }
    g.lineTo(w, h)
    g.closePath()
    g.fill()
    return new THREE.CanvasTexture(cv)
  }

  function roadTexture() {
    const w = 512
    const h = 1024
    const cv = document.createElement('canvas')
    cv.width = w
    cv.height = h
    const g = cv.getContext('2d')!
    // Lighter than real asphalt on purpose — true near-black tarmac disappears
    // against the page's own near-black background and the dusk fog, and the
    // road stops reading as a surface at all.
    g.fillStyle = '#3a3d44'
    g.fillRect(0, 0, w, h)
    const rnd = mulberry(4)
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = `rgba(255,255,255,${0.03 + rnd() * 0.05})`
      g.fillRect(rnd() * w, rnd() * h, 1, 1)
    }
    g.fillStyle = 'rgba(232,224,204,0.85)'
    g.fillRect(w * 0.06, 0, w * 0.012, h)
    g.fillRect(w * 0.934, 0, w * 0.012, h)
    // The period must divide h exactly. With RepeatWrapping, the texture's
    // last row (v→1) sits directly against its first row (v→0) — if a dash
    // is cut off mid-shape there, bilinear filtering blends its bright edge
    // into the wrap seam, which reads as a persistent bright line at
    // whichever repeat happens to project into a resolvable screen row. Every
    // other internal repeat boundary is fine; only this one is a hard seam.
    const period = h / 8
    const dashH = period * 0.55
    for (let y = 0; y < h; y += period) g.fillRect(w * 0.494, y, w * 0.012, dashH)
    const tex = new THREE.CanvasTexture(cv)
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.RepeatWrapping
    tex.anisotropy = 4
    return tex
  }

  /**
   * Four faint concentric tracks approximating the loop each tyre actually
   * traces — this texture is mapped onto a plane sized exactly to the ellipse
   * (see `skidMarks` below), so canvas pixel space maps 1:1 onto the loop's
   * own proportions and the marks land under the wheels rather than at some
   * arbitrary fixed radius.
   */
  function skidTexture(w = 512, h = 512) {
    const cv = document.createElement('canvas')
    cv.width = w
    cv.height = h
    const g = cv.getContext('2d')!
    const cx = w / 2
    const cy = h / 2
    const rnd = mulberry(9)
    g.lineWidth = 9
    g.lineCap = 'round'
    for (const off of [-16, -6, 6, 16]) {
      g.beginPath()
      for (let a = 0; a <= Math.PI * 2 + 0.05; a += 0.05) {
        const px = cx + Math.sin(a) * (w * 0.34 + off)
        const py = cy + Math.cos(a) * (h * 0.34 + off)
        if (a === 0) g.moveTo(px, py)
        else g.lineTo(px, py)
      }
      g.strokeStyle = `rgba(8,8,10,${0.4 + rnd() * 0.2})`
      g.stroke()
    }
    return new THREE.CanvasTexture(cv)
  }

  // --- drift path geometry, chosen small enough to hold the fixed framing ---
  const Rx = 1.7
  const Rz = 1.05
  const wheelRadius = 0.36

  // One-time horizontal direction the fixed camera looks along, in the same
  // (sin φ, cos φ) convention as rotation.y — everything in the environment
  // (road, mountains) is oriented off this single angle since the camera
  // barely moves.
  const awayAngle = Math.atan2(baseLookAt.x - baseCamPos.x, baseLookAt.z - baseCamPos.z)

  // --- sky + fog: a dusk gradient the road and mountains fade into ---
  scene.background = verticalGradientTexture([
    [0, '#05070d'],
    [0.45, '#131a2c'],
    [0.72, '#3a3d5c'],
    [0.88, '#7c5a63'],
    [1, '#c98a63'],
  ])
  scene.fog = new THREE.Fog(0x3a3d5c, 24, 92)

  // --- mountains: three receding silhouette cards, no geometry cost worth mentioning ---
  const mountainLayers = [
    { dist: 70, height: 26, width: 130, color: 'rgba(58,61,92,0.9)', ridges: 7, seed: 11, dipY: -12.1 },
    { dist: 55, height: 20, width: 105, color: 'rgba(42,45,72,0.95)', ridges: 9, seed: 37, dipY: -9.2 },
    { dist: 42, height: 15, width: 85, color: 'rgba(28,30,52,1)', ridges: 11, seed: 71, dipY: -6.8 },
  ]
  for (const layer of mountainLayers) {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(layer.width, layer.height),
      new THREE.MeshBasicMaterial({
        map: mountainTexture(layer.color, layer.ridges, layer.seed),
        transparent: true,
        depthWrite: false,
        fog: true,
        // lookAt below points -Z at the camera, so the front (+Z) face ends
        // up facing away — these are flat cards, so just render both sides.
        side: THREE.DoubleSide,
      })
    )
    // The camera looks down at ~14° to frame the car, so extending its own
    // aim ray out to mountain distance points well underground — that ray is
    // not where true ground level actually projects. dipY is that real
    // projected height (solved empirically against this exact camera), which
    // is why it needs recalculating if baseCamPos/baseLookAt ever change.
    mesh.position.set(Math.sin(awayAngle) * layer.dist, layer.dipY, Math.cos(awayAngle) * layer.dist)
    mesh.lookAt(baseCamPos.x, mesh.position.y, baseCamPos.z)
    scene.add(mesh)
  }

  // --- road: one long tiled strip along the camera's fixed viewing axis,
  // stretching into the fog so it reads as continuing to the horizon even
  // though the drift loop itself only uses a short stretch of it ---
  const roadLength = 130
  const roadTex = roadTexture()
  roadTex.repeat.set(1, roadLength / 9)
  // MeshBasicMaterial, not Standard: a physically-lit ground plane this large,
  // viewed at a shallow grazing angle under strong directional lights, throws
  // a bright Fresnel band right across the horizon. Every other ground-level
  // element here (shadow, skid marks, mountains) is already unlit for the
  // same reason — this is a stylized backdrop, not something meant to be lit.
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(13, roadLength),
    new THREE.MeshBasicMaterial({ map: roadTex, fog: true })
  )
  road.rotation.x = -Math.PI / 2
  road.rotation.z = -awayAngle
  // The near edge must stay comfortably in front of the camera. With the
  // previous placement it fell 1.47 units BEHIND it — a huge, nearly edge-on
  // plane straddling the near clip plane, which clips into a degenerate
  // sliver that rasterizes as a bright line spanning most of the screen. No
  // amount of fog, subdivision or anisotropic filtering touches this; it's a
  // clipping artifact, not a shading one.
  const camDistFromOrigin = Math.hypot(baseCamPos.x, baseCamPos.z)
  const roadNearMargin = 4
  const roadCentreS = roadNearMargin - camDistFromOrigin + roadLength / 2
  road.position.set(
    Math.sin(awayAngle) * roadCentreS,
    -0.01,
    Math.cos(awayAngle) * roadCentreS
  )
  scene.add(road)

  // Faint tyre-mark decal sized to the drift loop itself — ties the road
  // directly to what the car is actually doing on it.
  const skidMarks = new THREE.Mesh(
    new THREE.PlaneGeometry((Rx + 1.4) * 2, (Rz + 1.4) * 2),
    new THREE.MeshBasicMaterial({
      map: skidTexture(),
      transparent: true,
      depthWrite: false,
    })
  )
  skidMarks.rotation.x = -Math.PI / 2
  skidMarks.position.y = 0.006
  scene.add(skidMarks)

  // Fake contact shadow. A real shadow map for 800k triangles costs far more
  // than this is worth, and at this camera angle a soft ellipse is
  // indistinguishable — but without it the car reads as floating.
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

  // glTF `extras` arrive as userData. Anything carrying EXPLODE_OFFSET moves;
  // CATEGORY (when present) drives its reveal window, falling back to a
  // name-based guess for parts exported before that extra existed.
  const parts: {
    obj: Object3D
    base: InstanceType<typeof THREE.Vector3>
    off: InstanceType<typeof THREE.Vector3>
    category: string
  }[] = []
  root.traverse((o) => {
    const data = o.userData as Record<string, unknown>
    const raw = data?.EXPLODE_OFFSET
    if (Array.isArray(raw) && raw.length === 3) {
      const cat = typeof data.CATEGORY === 'string' ? data.CATEGORY : classify(o.name)
      parts.push({
        obj: o,
        base: o.position.clone(),
        off: new THREE.Vector3(raw[0] as number, raw[1] as number, raw[2] as number),
        category: cat,
      })
    }
  })

  const frontHubs = (['FL', 'FR'] as const)
    .map((c) => root.getObjectByName(`HUB_${c}`))
    .filter(Boolean) as Object3D[]
  const rearHubs = (['RL', 'RR'] as const)
    .map((c) => root.getObjectByName(`HUB_${c}`))
    .filter(Boolean) as Object3D[]
  const steer = (['FL', 'FR'] as const)
    .map((c) => root.getObjectByName(`CORNER_${c}`))
    .filter(Boolean) as Object3D[]
  const rearL = root.getObjectByName('CORNER_RL')
  const rearR = root.getObjectByName('CORNER_RR')

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
  let pathTheta = 0
  let frontSpinAngle = 0
  let rearSpinAngle = 0
  const start = performance.now()
  const follow = new THREE.Vector2(0, 0)
  const lookTarget = baseLookAt.clone()
  const tmp = new THREE.Vector3()

  // Tuned so a lap takes ~12–14 s and the slide never fully vanishes, but
  // both breathe slowly enough that no cycle reads as an obvious loop.
  const omegaBase = 0.5
  const omegaMod = 0.09
  const beta0 = 0.5
  const betaMod = 0.14
  const betaMax = beta0 + betaMod
  const turnSign = 1
  const maxSteer = 0.5
  const counterFactor = 0.75
  const rollGain = 0.017
  const maxRoll = 0.085

  function frame(now: number) {
    raf = requestAnimationFrame(frame)
    resize()
    const t = (now - start) / 1000
    const dt = Math.min((now - last) / 1000, 0.05)
    last = now

    // Integrate path angle rather than using t*omega directly, so the slow
    // pace modulation doesn't fight itself — this is the actual position
    // reached by accumulating the (varying) angular speed over real time.
    const omega = omegaBase * (1 + omegaMod * Math.sin(t * 0.11))
    pathTheta += omega * dt
    const theta = pathTheta

    const x = Rx * Math.sin(theta)
    const z = Rz * Math.cos(theta)
    const dxdt = Rx * Math.cos(theta) * omega
    const dzdt = -Rz * Math.sin(theta) * omega
    const speed2 = dxdt * dxdt + dzdt * dzdt
    const heading = Math.atan2(dxdt, dzdt)

    // The slip angle is the whole drift: the chassis points further into the
    // turn than the direction it is actually travelling.
    const beta = (beta0 + betaMod * Math.sin(t * 0.07)) * turnSign
    const chassisYaw = heading + beta
    const roll = -turnSign * Math.min(speed2 * rollGain, maxRoll)

    root!.position.set(x, 0, z)
    root!.rotation.set(0, chassisYaw, roll)

    // Front wheels countersteer against the slide; rear wheels (the only
    // driven ones) spin faster than pure rolling because they're the ones
    // breaking traction to hold the slide.
    const steerAngle = Math.max(-maxSteer, Math.min(maxSteer, -beta * counterFactor))
    for (const s of steer) s.rotation.y = steerAngle

    const speed = Math.sqrt(speed2)
    const baseAngular = speed / wheelRadius
    const slipNorm = Math.min(Math.abs(beta) / betaMax, 1)
    frontSpinAngle += baseAngular * dt
    rearSpinAngle += baseAngular * (1 + 0.9 * slipNorm) * dt
    for (const h of frontHubs) h.rotation.x = frontSpinAngle
    for (const h of rearHubs) h.rotation.x = rearSpinAngle

    // Staged reveal: each part only starts moving once the global explode
    // value enters its category's window, and is fully out before the next
    // stage begins — an engineering peel, not everything popping at once.
    for (const p of parts) {
      const w = STAGE_WINDOW[p.category] ?? [0, 1]
      const local = smoothstep(w[0], w[1], explode)
      p.obj.position.copy(p.base).addScaledVector(p.off, local)
    }

    // Camera: fixed hero framing plus a little life — small handheld drift
    // (layered low-frequency sines, no library needed) and a heavily damped
    // follow of the car's own path so the shot breathes without chasing it.
    const jx = Math.sin(t * 0.9 + 1.3) * 0.018 + Math.sin(t * 2.35 + 0.4) * 0.008
    const jy = Math.sin(t * 0.7 + 2.1) * 0.014 + Math.sin(t * 1.9 + 1.1) * 0.006
    const jz = Math.sin(t * 0.8 + 0.6) * 0.016 + Math.sin(t * 2.1 + 2.6) * 0.007
    const followLerp = Math.min(dt * 1.2, 1)
    follow.x += (x * 0.1 - follow.x) * followLerp
    follow.y += (z * 0.1 - follow.y) * followLerp
    camera.position.set(baseCamPos.x + jx + follow.x, baseCamPos.y + jy, baseCamPos.z + jz + follow.y)
    const lookLerp = Math.min(dt * 1.5, 1)
    lookTarget.x += (baseLookAt.x + x * 0.18 - lookTarget.x) * lookLerp
    lookTarget.z += (baseLookAt.z + z * 0.18 - lookTarget.z) * lookLerp
    camera.lookAt(lookTarget.x, baseLookAt.y, lookTarget.z)

    // Shadow tracks the car and shrinks as the body lifts away during the explode.
    shadow.position.x = x
    shadow.position.z = z
    shadow.rotation.z = -chassisYaw
    ;(shadow.material as { opacity: number }).opacity = 0.95 - explode * 0.55

    // Smoke pours off the rear tyres, harder the more the car is sliding,
    // thinning out as the car comes apart.
    emitAcc += dt * (60 + 130 * slipNorm) * (1 - explode * 0.85)
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
        sVel[i * 3] = -Math.sin(chassisYaw) * 1.9 + (Math.random() - 0.5) * 1.1
        sVel[i * 3 + 1] = 0.45 + Math.random() * 0.5
        sVel[i * 3 + 2] = -Math.cos(chassisYaw) * 1.9 + (Math.random() - 0.5) * 1.1
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
