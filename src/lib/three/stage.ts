import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { SKY_PERIOD_S } from './clock'
import { disposeSubtree } from './dispose'
import { STAGE_FLOOR_Y } from './envelope'
import { FIELD_PALETTE, type ScenePalette } from './palette'

/**
 * A single long-lived WebGL stage that scenes are swapped into.
 *
 * The alternative — one renderer per visualisation — fails at this site's scale:
 * browsers cap concurrent WebGL contexts (commonly cited as 8–16, though we
 * found no authoritative number) and silently evict the oldest, so a page with
 * several labs starts blanking canvases with no error. One context, reused, has
 * no such ceiling.
 *
 * Rendering is on demand. `requestAnimationFrame` always reschedules, but the
 * draw is skipped unless something marked the stage dirty or a tween declared
 * it needs more frames via `busy()`. An idle scene costs approximately nothing,
 * which matters when most of the site is prose with a canvas somewhere on it.
 */

export interface StageOptions {
  canvas: HTMLCanvasElement
  /** Vertical field of view in degrees. */
  fov?: number
  /** Orbit distance clamp. */
  minDistance?: number
  maxDistance?: number
  /** Token colours for the floor chart and lights; defaults to the field edition. */
  palette?: ScenePalette
}

export interface SceneModule {
  /** Build geometry into `root`. Called once when the module is mounted. */
  build(ctx: SceneContext): void
  /** Per-frame update. Return true to request another frame. */
  update?(ctx: SceneContext, dt: number): boolean
  /** Release anything not parented to `root` (root is disposed for you). */
  dispose?(): void
}

export interface SceneContext {
  root: THREE.Group
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  /** Keep drawing for `seconds`; use for any animation that is not per-frame. */
  busy(seconds: number): void
  /** Request exactly one more frame. */
  invalidate(): void
  /** Ambient animation is allowed: false under reduced motion or when paused. */
  motion: boolean
}

const AUTOROTATE_RESUME_MS = 3000
/**
 * One full turn of the instrument per half sky period (90 s). OrbitControls
 * turns `2π / 60 * speed` radians per second when it is given the frame time.
 */
const AUTOROTATE_SPEED = 60 / (SKY_PERIOD_S / 2)

export class Stage {
  readonly renderer: THREE.WebGLRenderer
  readonly scene: THREE.Scene
  readonly camera: THREE.PerspectiveCamera
  readonly controls: OrbitControls
  readonly root = new THREE.Group()

  /**
   * Called with the canvas' CSS size whenever it changes. Anything that sizes
   * itself in pixels — screen-space markers, DOM overlays — must hang off this
   * rather than `window.resize`: the canvas is a grid item and changes size on
   * layout shifts, container queries and font loads that never resize the
   * window, and a screen-space scale computed once is wrong forever after.
   */
  onResize: ((width: number, height: number) => void) | null = null

  /** Called when a system reduced-motion change resets the motion default. */
  onMotionChange: ((motion: boolean) => void) | null = null

  private readonly canvas: HTMLCanvasElement
  private readonly palette: ScenePalette
  private readonly timer = new THREE.Timer()
  private readonly env: THREE.Texture
  private readonly resizeObserver: ResizeObserver
  private readonly intersectionObserver: IntersectionObserver
  private readonly onVisibility = (): void => {
    this.pageVisible = document.visibilityState === 'visible'
    this.invalidate()
  }
  private readonly motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  // The preference can change while the explorer is open (an OS toggle, or a
  // battery saver that implies it). Each change resets motion to that
  // preference's default; an explicit choice afterwards still wins.
  private readonly onMotionPreference = (): void => {
    this.applyMotionPreference()
    this.onMotionChange?.(this.motionWanted)
  }

  private module: SceneModule | null = null
  private frame = 0
  private dirty = true
  private busyUntil = 0
  private onScreen = true
  private pageVisible = true
  private interactionUntil = 0
  private motionWanted: boolean
  private disposed = false

  constructor(opts: StageOptions) {
    this.canvas = opts.canvas
    this.palette = opts.palette ?? FIELD_PALETTE
    // Reduced motion disables idle rotation and the token flow by default. The
    // reference project we studied handled reduced motion only for CSS
    // keyframes, leaving its model spinning forever — the single most
    // motion-intense thing on the page.
    this.motionWanted = !this.motionQuery.matches

    const lowPower =
      window.matchMedia('(max-width: 780px)').matches || (navigator.hardwareConcurrency ?? 8) < 6

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: !lowPower,
      stencil: false,
      alpha: true,
      powerPreference: 'high-performance',
    })
    // Decided once. A dynamic pixel-ratio controller ratchets down under vsync
    // quantisation and never recovers, which looks like a permanent regression.
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowPower ? 1.5 : 2))
    // Neutral, not ACES: ACES pushes the token pigments toward orange and
    // desaturates the porcelain, so the enamel would stop matching the page.
    this.renderer.toneMapping = THREE.NeutralToneMapping
    this.renderer.toneMappingExposure = 1
    // The night plate is the page's own `--night`, painted behind a clear canvas,
    // so the stage can never disagree with the surface around it.
    this.renderer.setClearColor(0x000000, 0)
    // No shadow maps: a baked contact shadow costs one textured quad instead of
    // an entire extra scene pass every frame.
    this.renderer.shadowMap.enabled = false

    this.scene = new THREE.Scene()
    this.scene.add(this.root)

    this.camera = new THREE.PerspectiveCamera(opts.fov ?? 39, 1, 0.1, 100)
    this.camera.position.set(3.72, 1.22, 5.95)

    this.controls = new OrbitControls(this.camera, this.canvas)
    this.controls.target.set(0, -0.28, 0)
    this.controls.dampingFactor = 0.055
    this.controls.enablePan = false
    this.controls.minDistance = opts.minDistance ?? 4.4
    this.controls.maxDistance = opts.maxDistance ?? 11
    this.controls.autoRotateSpeed = AUTOROTATE_SPEED
    // Never look up through the chart floor.
    this.controls.maxPolarAngle = Math.PI * 0.53
    this.controls.update()
    this.controls.addEventListener('start', () => {
      this.interactionUntil = performance.now() + AUTOROTATE_RESUME_MS
      this.invalidate()
    })

    this.env = this.buildEnvironment()
    this.scene.environment = this.env
    this.addLighting()
    this.addChartFloor()

    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(this.canvas)

    this.intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        this.onScreen = entry?.isIntersecting ?? false
        this.invalidate()
      },
      { rootMargin: '120px' },
    )
    this.intersectionObserver.observe(this.canvas)

    document.addEventListener('visibilitychange', this.onVisibility)
    this.motionQuery.addEventListener('change', this.onMotionPreference)
    this.applyMotionPreference()

    this.resize()
    this.animate()
  }

  /**
   * Image-based lighting from a small procedural studio baked through PMREM:
   * a night dome with one broad overhead softbox and a narrow side strip.
   * Enamel and nickel need something bright to reflect, and this gives them
   * clean, long highlights for zero downloaded bytes.
   */
  private buildEnvironment(): THREE.Texture {
    const w = 64
    const h = 32
    const data = new Uint8Array(w * h * 4)
    const night = new THREE.Color(this.palette.plate)
    const sky = new THREE.Color(this.palette.accent)
    for (let y = 0; y < h; y += 1) {
      const v = y / (h - 1)
      for (let x = 0; x < w; x += 1) {
        const u = x / w
        // Overhead softbox, a vertical strip light, and a faint chart-blue horizon.
        const softbox = Math.exp(-(((v - 0.12) / 0.09) ** 2)) * Math.exp(-(((u - 0.3) / 0.16) ** 2))
        const strip = Math.exp(-(((u - 0.78) / 0.025) ** 2)) * (v > 0.15 && v < 0.6 ? 1 : 0)
        const horizon = Math.exp(-(((v - 0.5) / 0.08) ** 2)) * 0.18
        const light = Math.min(1, softbox * 1.6 + strip * 0.9)
        const i = (y * w + x) * 4
        data[i] = Math.round(255 * Math.min(1, night.r * 1.6 + sky.r * horizon + light))
        data[i + 1] = Math.round(255 * Math.min(1, night.g * 1.6 + sky.g * horizon + light))
        data[i + 2] = Math.round(255 * Math.min(1, night.b * 1.6 + sky.b * horizon + light))
        data[i + 3] = 255
      }
    }
    const tex = new THREE.DataTexture(data, w, h)
    tex.mapping = THREE.EquirectangularReflectionMapping
    tex.colorSpace = THREE.SRGBColorSpace
    tex.needsUpdate = true
    const pmrem = new THREE.PMREMGenerator(this.renderer)
    const env = pmrem.fromEquirectangular(tex).texture
    pmrem.dispose()
    tex.dispose()
    return env
  }

  private addLighting(): void {
    const key = new THREE.DirectionalLight(0xffffff, 1.9)
    key.position.set(3.5, 6.5, 5.5)
    const fill = new THREE.DirectionalLight(this.palette.accent, 0.45)
    fill.position.set(-5, 1.5, 2.5)
    const rim = new THREE.DirectionalLight(0xffffff, 0.8)
    rim.position.set(-2, 3, -6)
    const ambient = new THREE.HemisphereLight(this.palette.accent, this.palette.plate, 0.35)
    this.scene.add(key, fill, rim, ambient)
  }

  /**
   * The instrument stands on a star chart: a polar graticule in chart blue,
   * fading toward its edge, with a soft contact shadow under the foot. Lines,
   * not a lit surface, so the plate colour behind the canvas shows through.
   */
  private addChartFloor(): void {
    const size = 2048
    const c = document.createElement('canvas')
    c.width = size
    c.height = size
    const ctx = c.getContext('2d')
    if (!ctx) return
    const centre = size / 2
    const accent = new THREE.Color(this.palette.grid)
    const rgb = `${Math.round(accent.r * 255)} ${Math.round(accent.g * 255)} ${Math.round(accent.b * 255)}`
    const fade = (radius: number): number => Math.max(0, 1 - (radius / centre) ** 2.2)
    // Parallels every half unit (the plane is 9 units across).
    for (let ring = 1; ring <= 9; ring += 1) {
      const radius = (ring / 9) * centre
      ctx.strokeStyle = `rgb(${rgb} / ${0.5 * fade(radius)})`
      ctx.lineWidth = ring % 3 === 0 ? 2.4 : 1.3
      ctx.beginPath()
      ctx.arc(centre, centre, radius, 0, Math.PI * 2)
      ctx.stroke()
    }
    // Meridians every 15 degrees, drawn as short faded segments.
    for (let line = 0; line < 24; line += 1) {
      const angle = (line / 24) * Math.PI * 2
      for (let step = 0; step < 24; step += 1) {
        const r0 = (step / 24) * centre
        const r1 = ((step + 1) / 24) * centre
        if (r0 < centre * 0.12) continue
        ctx.strokeStyle = `rgb(${rgb} / ${0.42 * fade(r1)})`
        ctx.lineWidth = line % 6 === 0 ? 2 : 1.1
        ctx.beginPath()
        ctx.moveTo(centre + Math.cos(angle) * r0, centre + Math.sin(angle) * r0)
        ctx.lineTo(centre + Math.cos(angle) * r1, centre + Math.sin(angle) * r1)
        ctx.stroke()
      }
    }
    // Contact shadow under the foot.
    const shadow = ctx.createRadialGradient(centre, centre, 0, centre, centre, centre * 0.2)
    shadow.addColorStop(0, 'rgb(0 0 0 / 0.55)')
    shadow.addColorStop(1, 'rgb(0 0 0 / 0)')
    ctx.fillStyle = shadow
    ctx.fillRect(0, 0, size, size)

    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy()
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 9),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }),
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.y = STAGE_FLOOR_Y
    floor.name = '__chart-floor'
    this.scene.add(floor)
  }

  mount(module: SceneModule): void {
    this.unmount()
    this.module = module
    module.build(this.context())
    this.invalidate()
  }

  unmount(): void {
    this.module?.dispose?.()
    this.module = null
    disposeSubtree(this.root)
    this.root.clear()
    this.invalidate()
  }

  private context(): SceneContext {
    return {
      root: this.root,
      scene: this.scene,
      camera: this.camera,
      busy: (s) => this.busy(s),
      invalidate: () => this.invalidate(),
      motion: this.motionWanted,
    }
  }

  /** Mark one frame needed. */
  invalidate(): void {
    this.dirty = true
  }

  /** Keep drawing for `seconds` — for tweens and transitions. */
  busy(seconds: number): void {
    this.busyUntil = Math.max(this.busyUntil, performance.now() + seconds * 1000)
    this.dirty = true
  }

  /** An explicit visitor choice; honoured even under reduced motion. */
  setMotion(on: boolean): void {
    this.motionWanted = on
    this.invalidate()
  }

  get motion(): boolean {
    return this.motionWanted
  }

  private applyMotionPreference(): void {
    const reduced = this.motionQuery.matches
    this.motionWanted = !reduced
    // Inertia after a drag is motion the visitor did not ask for (WCAG 2.3.3);
    // the drag itself stays direct.
    this.controls.enableDamping = !reduced
    this.invalidate()
  }

  /** Suspend idle rotation for a moment after the visitor takes the controls. */
  private applyAutoRotate(now: number): void {
    this.controls.autoRotate = this.motionWanted && now >= this.interactionUntil
  }

  private resize(): void {
    const w = this.canvas.clientWidth
    const h = this.canvas.clientHeight
    if (w === 0 || h === 0) return
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.onResize?.(w, h)
    this.invalidate()
  }

  private readonly animate = (): void => {
    if (this.disposed) return
    this.frame = requestAnimationFrame(this.animate)

    // Off-screen or backgrounded: reschedule but never draw. Browsers already
    // throttle rAF in hidden tabs; this makes the cost zero rather than small.
    if (!this.onScreen || !this.pageVisible) return

    const now = performance.now()
    this.applyAutoRotate(now)

    // Suspension can leave the timer untouched for minutes. Limit the first
    // resumed step so time-based objects do not all jump to the same state.
    const dt = Math.min(this.timer.update(now).getDelta(), 0.1)
    // Given the frame time, autorotation is the same speed at 60 and 120 Hz.
    const controlsChanged = this.controls.update(dt)
    const moduleWants = this.module?.update?.(this.context(), dt) ?? false

    if (!this.dirty && !controlsChanged && !moduleWants && now >= this.busyUntil) return

    this.dirty = false
    this.renderer.render(this.scene, this.camera)
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    cancelAnimationFrame(this.frame)
    document.removeEventListener('visibilitychange', this.onVisibility)
    this.motionQuery.removeEventListener('change', this.onMotionPreference)
    this.resizeObserver.disconnect()
    this.intersectionObserver.disconnect()
    this.timer.dispose()
    this.unmount()
    // Everything parented to the scene, including the lights and the contact
    // shadow the constructor added — not just the current module.
    disposeSubtree(this.scene)
    this.env.dispose()
    this.controls.dispose()
    this.renderer.dispose()
    // dispose() alone leaves the context alive on some drivers; this is what
    // actually hands it back so another stage can have one.
    this.renderer.forceContextLoss()
  }
}
