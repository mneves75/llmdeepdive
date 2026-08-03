import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { disposeSubtree } from './dispose'

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
  /** Idle rotation, yielding to the user. */
  autoRotate?: boolean
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
  reducedMotion: boolean
}

/** Uniform box every scene is fitted into, so camera and lighting are reusable. */
export const FIT_SIZE = 3.8

const AUTOROTATE_RESUME_MS = 3000

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

  private readonly canvas: HTMLCanvasElement
  private readonly timer = new THREE.Timer()
  private readonly env: THREE.Texture
  private readonly resizeObserver: ResizeObserver
  private readonly intersectionObserver: IntersectionObserver
  private readonly onVisibility = (): void => {
    this.pageVisible = document.visibilityState === 'visible'
    this.invalidate()
  }

  private module: SceneModule | null = null
  private frame = 0
  private dirty = true
  private busyUntil = 0
  private onScreen = true
  private pageVisible = true
  private interactionUntil = 0
  private autoRotateWanted: boolean
  private disposed = false

  readonly reducedMotion: boolean

  constructor(opts: StageOptions) {
    this.canvas = opts.canvas
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // Reduced motion disables idle rotation outright. The reference project we
    // studied handled reduced motion only for CSS keyframes, leaving its model
    // spinning forever — the single most motion-intense thing on the page.
    this.autoRotateWanted = (opts.autoRotate ?? true) && !this.reducedMotion

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
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.08
    // No shadow maps: a baked contact shadow costs one textured quad instead of
    // an entire extra scene pass every frame.
    this.renderer.shadowMap.enabled = false

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x06141d)
    this.scene.fog = new THREE.Fog(0x06141d, 8.5, 18)
    this.scene.add(this.root)

    this.camera = new THREE.PerspectiveCamera(opts.fov ?? 39, 1, 0.1, 100)
    this.camera.position.set(4.5, 3, 7.2)

    this.controls = new OrbitControls(this.camera, this.canvas)
    this.controls.target.set(0, 0.05, 0)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.055
    this.controls.enablePan = false
    this.controls.minDistance = opts.minDistance ?? 4.8
    this.controls.maxDistance = opts.maxDistance ?? 12
    this.controls.autoRotateSpeed = 0.65
    this.controls.update()
    this.controls.addEventListener('start', () => {
      this.interactionUntil = performance.now() + AUTOROTATE_RESUME_MS
      this.invalidate()
    })

    this.env = this.buildEnvironment()
    this.scene.environment = this.env
    this.addLighting()
    this.addContactShadow()

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

    this.resize()
    this.animate()
  }

  /**
   * Image-based lighting from a 16x32 gradient baked through PMREM. Real IBL
   * quality for zero downloaded bytes — no HDR file to fetch.
   */
  private buildEnvironment(): THREE.Texture {
    const w = 16
    const h = 32
    const data = new Uint8Array(w * h * 4)
    for (let y = 0; y < h; y += 1) {
      const t = y / (h - 1)
      for (let x = 0; x < w; x += 1) {
        const horizon = Math.exp(-Math.pow((t - 0.48) / 0.2, 2))
        const key = Math.max(0, Math.cos((x / w) * Math.PI * 2 - 0.7)) ** 8
        // Cool observatory ambience with one warm, directional reflection.
        const r = Math.round(7 + 24 * (1 - t) + 42 * horizon + 90 * key)
        const g = Math.round(13 + 44 * (1 - t) + 58 * horizon + 64 * key)
        const b = Math.round(20 + 58 * (1 - t) + 70 * horizon + 40 * key)
        const i = (y * w + x) * 4
        data[i] = r
        data[i + 1] = g
        data[i + 2] = b
        data[i + 3] = 255
      }
    }
    const tex = new THREE.DataTexture(data, w, h)
    tex.needsUpdate = true
    const pmrem = new THREE.PMREMGenerator(this.renderer)
    const env = pmrem.fromEquirectangular(tex).texture
    pmrem.dispose()
    tex.dispose()
    return env
  }

  private addLighting(): void {
    const key = new THREE.DirectionalLight(0xf4fbff, 2.2)
    key.position.set(4.8, 6.2, 5.4)
    const fill = new THREE.DirectionalLight(0x8fbdcb, 0.62)
    fill.position.set(-4.6, 1.8, 2.6)
    const rim = new THREE.DirectionalLight(0xffd29c, 1.05)
    rim.position.set(-2.2, 3.4, -5.5)
    const ambient = new THREE.HemisphereLight(0x8ebdca, 0x071018, 0.42)
    this.scene.add(key, fill, rim, ambient)
  }

  private addContactShadow(): void {
    const size = 256
    const c = document.createElement('canvas')
    c.width = size
    c.height = size
    const ctx = c.getContext('2d')
    if (!ctx) return
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    grad.addColorStop(0, 'rgba(0,6,10,0.46)')
    grad.addColorStop(0.55, 'rgba(0,6,10,0.16)')
    grad.addColorStop(1, 'rgba(0,6,10,0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, size, size)

    const tex = new THREE.CanvasTexture(c)
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(7.5, 7.5),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
    )
    mesh.rotation.x = -Math.PI / 2
    mesh.position.y = -2.1
    mesh.name = '__contact-shadow'

    const grid = new THREE.GridHelper(12, 24, 0x315361, 0x17313c)
    grid.position.y = -2.08
    grid.material.transparent = true
    grid.material.opacity = 0.16
    grid.material.depthWrite = false
    grid.name = '__reference-grid'
    this.scene.add(mesh, grid)
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
      reducedMotion: this.reducedMotion,
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

  setAutoRotate(on: boolean): void {
    this.autoRotateWanted = on && !this.reducedMotion
    this.invalidate()
  }

  get autoRotate(): boolean {
    return this.autoRotateWanted
  }

  /** Suspend idle rotation while something is selected. */
  private applyAutoRotate(now: number): void {
    this.controls.autoRotate = this.autoRotateWanted && now >= this.interactionUntil
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
    const controlsChanged = this.controls.update()
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
