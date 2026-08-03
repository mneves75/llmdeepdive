import * as THREE from 'three'

/**
 * Annotation markers anchored to 3D geometry.
 *
 * Four techniques, each solving a specific problem that the obvious approach
 * gets wrong:
 *
 *  - **Constant pixel size** from FOV maths, not `sizeAttenuation`. A marker is
 *    the same 32 px on a phone and a 4K monitor, at any zoom.
 *  - **Screen-space picking**, not raycasting. Projecting a dozen points costs a
 *    few matrix ops per pointer event; a mesh raycast costs far more and gains
 *    nothing when the targets are known points.
 *  - **View-ray lift**: each frame the marker is nudged toward the camera along
 *    the view ray. Screen position is unchanged, but it clears surface relief so
 *    geometry cannot nibble the billboard, while genuine occluders still hide it.
 *  - **Occlusion by facing dot-product**, not raycasting. A marker whose outward
 *    normal turns away from the camera fades out, and picking ignores anything
 *    faded — so you cannot click a marker you cannot see.
 *
 * Keyboard access is a first-class path, not an afterthought: markers are
 * cycled with arrow keys and opened with Enter. The reference implementation we
 * studied made its entire annotation layer mouse-only, which puts the whole
 * educational payload out of reach for keyboard and switch users.
 */

export interface MarkerSpec {
  id: string
  label: string
  detail: string
  /** Anchor in the scene's normalised space. */
  position: [number, number, number]
  /** CSS colour; also drives the DOM callout accent. */
  color: string
}

const DOT_PIXELS = 32
const VIEW_LIFT = 0.3
const FADE_START = -0.05
const FADE_END = 0.3
const PICK_RADIUS_PX = 26

interface Marker {
  spec: MarkerSpec
  sprite: THREE.Sprite
  anchor: THREE.Vector3
  /** Surface normal for the facing test; null means "always facing". */
  outward: THREE.Vector3 | null
  opacity: number
}

/**
 * Outward normal of the surface a marker is pinned to.
 *
 * Markers sit on the vertical side faces of the stack, and a vertical face has a
 * horizontal normal — so the direction is the anchor's horizontal offset from
 * the model axis, with the vertical component dropped. Using the full radial
 * direction (`anchor - centre`, the obvious version) makes the top and bottom
 * markers of a tall model point at the ceiling and the floor: their facing
 * dot-product collapses and they fade to invisible while sitting in plain view,
 * which is what left this scene showing only the one selected dot.
 *
 * A marker on the axis itself has no outward direction, so it never faces away.
 */
function outwardNormal(anchor: THREE.Vector3): THREE.Vector3 | null {
  const horizontal = new THREE.Vector3(anchor.x, 0, anchor.z)
  return horizontal.lengthSq() < 1e-8 ? null : horizontal.normalize()
}

function dotTexture(color: string): THREE.CanvasTexture {
  const size = 128
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const ctx = c.getContext('2d')
  if (ctx) {
    const r = size / 2
    ctx.beginPath()
    ctx.arc(r, r, r * 0.52, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
    ctx.lineWidth = size * 0.11
    ctx.strokeStyle = 'rgba(255,255,255,0.92)'
    ctx.stroke()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1)
  return t * t * (3 - 2 * t)
}

/**
 * Desired on-screen diameter to world scale for a non-attenuated sprite.
 * `2 * (px / viewportHeight) * tan(fov/2)` is the exact conversion at the
 * projection plane.
 *
 * Returns 0 — "unknown" — for a viewport that has not been measured. A canvas
 * queried before it has a layout box reports 0 px tall, and substituting any
 * fallback height turns a 32 px dot into a ~25 world-unit billboard that fills
 * the whole canvas with one flat colour. Refusing to guess is the only safe
 * answer; callers hide the markers until a real measurement arrives.
 */
export function markerPixelScale(fovDeg: number, heightPx: number): number {
  if (!(heightPx > 0)) return 0
  return 2 * (DOT_PIXELS / heightPx) * Math.tan(((fovDeg * Math.PI) / 180) / 2)
}

export class MarkerLayer {
  readonly group = new THREE.Group()

  private markers: Marker[] = []
  /** 0 until the canvas has been measured; see `markerPixelScale`. */
  private pixelScale = 0
  private selectedId: string | null = null

  private readonly tmpDir = new THREE.Vector3()
  private readonly tmpProj = new THREE.Vector3()

  private readonly camera: THREE.PerspectiveCamera

  // Written out rather than declared as a constructor parameter property: that
  // is TypeScript-only syntax, and it stops Node from loading this module for a
  // test by stripping types.
  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera
    this.group.name = '__markers'
  }

  set(specs: readonly MarkerSpec[]): void {
    this.clear()
    for (const spec of specs) {
      const material = new THREE.SpriteMaterial({
        map: dotTexture(spec.color),
        depthTest: true,
        depthWrite: false,
        toneMapped: false,
        transparent: true,
      })
      const sprite = new THREE.Sprite(material)
      // Constant screen size: scale is derived from FOV, never from distance.
      sprite.material.sizeAttenuation = false
      const anchor = new THREE.Vector3(...spec.position)
      sprite.position.copy(anchor)
      this.group.add(sprite)
      this.markers.push({ spec, sprite, anchor, outward: outwardNormal(anchor), opacity: 1 })
    }
  }

  /**
   * Recompute marker scale for a canvas `heightPx` CSS pixels tall. Call on
   * every resize or the markers drift in size; a height of 0 (element not laid
   * out yet) is ignored rather than approximated.
   */
  setViewport(heightPx: number): void {
    const scale = markerPixelScale(this.camera.fov, heightPx)
    if (scale > 0) this.pixelScale = scale
  }

  /** Returns true if anything changed and another frame is needed. */
  update(dt: number): boolean {
    if (this.markers.length === 0) return false
    // Nothing legible can be drawn from an unmeasured viewport.
    if (this.pixelScale <= 0) {
      for (const m of this.markers) m.sprite.visible = false
      return false
    }
    const camPos = this.camera.position
    let changed = false

    for (const m of this.markers) {
      this.tmpDir.copy(camPos).sub(m.anchor).normalize()
      const target = m.outward ? smoothstep(FADE_START, FADE_END, this.tmpDir.dot(m.outward)) : 1

      // Exponential ease, frame-rate independent.
      const eased = 1 - Math.exp(-dt * 12)
      const next = m.opacity + (target - m.opacity) * eased
      if (Math.abs(next - m.opacity) > 0.002) changed = true
      m.opacity = next

      const selected = m.spec.id === this.selectedId
      m.sprite.material.opacity = selected ? Math.max(next, 0.85) : next * 0.92
      m.sprite.visible = m.sprite.material.opacity > 0.02

      const scale = this.pixelScale * (selected ? 1.35 : 1)
      m.sprite.scale.set(scale, scale, 1)

      // Lift along the view ray: identical screen position, extra depth clearance.
      m.sprite.position.copy(m.anchor).addScaledVector(this.tmpDir, VIEW_LIFT)
    }
    return changed
  }

  /** Nearest visible marker to a point in CSS pixels, or null. */
  pick(x: number, y: number, width: number, height: number): MarkerSpec | null {
    let best: MarkerSpec | null = null
    let bestDist = PICK_RADIUS_PX

    for (const m of this.markers) {
      // A marker faded past legibility is not clickable — otherwise you can hit
      // something on the far side of the model that you cannot see.
      if (m.opacity < 0.35) continue
      this.tmpProj.copy(m.sprite.position).project(this.camera)
      const sx = ((this.tmpProj.x + 1) / 2) * width
      const sy = ((1 - this.tmpProj.y) / 2) * height
      const d = Math.hypot(sx - x, sy - y)
      if (d < bestDist) {
        bestDist = d
        best = m.spec
      }
    }
    return best
  }

  /** Screen position of a marker in CSS pixels, plus whether it faces away. */
  screenPosition(
    id: string,
    width: number,
    height: number,
  ): { x: number; y: number; behind: boolean } | null {
    const m = this.markers.find((k) => k.spec.id === id)
    if (!m) return null
    this.tmpProj.copy(m.sprite.position).project(this.camera)
    return {
      x: ((this.tmpProj.x + 1) / 2) * width,
      y: ((1 - this.tmpProj.y) / 2) * height,
      behind: m.opacity < 0.35,
    }
  }

  select(id: string | null): void {
    this.selectedId = id
  }

  get selected(): string | null {
    return this.selectedId
  }

  get specs(): readonly MarkerSpec[] {
    return this.markers.map((m) => m.spec)
  }

  /** Keyboard cycling. `delta` is +1 or -1. Wraps. */
  cycle(delta: number): MarkerSpec | null {
    if (this.markers.length === 0) return null
    const ids = this.markers.map((m) => m.spec.id)
    const current = this.selectedId ? ids.indexOf(this.selectedId) : -1
    const next = (current + delta + ids.length) % ids.length
    const spec = this.markers[next]?.spec ?? null
    this.selectedId = spec?.id ?? null
    return spec
  }

  clear(): void {
    for (const m of this.markers) {
      m.sprite.material.map?.dispose()
      m.sprite.material.dispose()
      this.group.remove(m.sprite)
    }
    this.markers = []
    this.selectedId = null
  }

  dispose(): void {
    this.clear()
  }
}
