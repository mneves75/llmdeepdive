import * as THREE from 'three'
import { LineMaterial } from 'three/addons/lines/LineMaterial.js'
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js'
// Explicit extensions: the scene tests load this file in Node, which does not
// guess them. (tsconfig allows .ts specifiers; Vite resolves them as usual.)
import { SKY_PERIOD_S } from '../clock.ts'
import { disposeSubtree } from '../dispose.ts'
import { readTokens, type TokenColor } from '../palette.ts'

/**
 * The curriculum sky in 3D: the server-rendered star chart, lifted onto a
 * celestial sphere.
 *
 * It reads the chart from the SVG the page already shows, so it cannot draw a
 * different sky. Frame one is the poster itself — every point on a plane
 * tangent to the sphere, seen by a camera framed so that each chart unit
 * lands on the pixel where the SVG (`xMidYMid meet`) drew it. The lift then
 * slides every point along its ray from the sphere's centre onto the sphere
 * (an inverse gnomonic projection), so the chart's straight lines become great
 * circles and the plate bulges into a dome. After that the sphere sways on the
 * site's one ambient clock, with a little pointer parallax.
 *
 * Nothing here captures the wheel or touch: the page scrolls over the sky.
 */

export interface ChartFrame {
  /** The SVG viewBox size, in chart units. */
  width: number
  height: number
}

export const SPHERE_RADIUS = 1
/**
 * Half the chart's width on the tangent plane, in sphere radii: the tangent
 * of the half-angle the chart spans in longitude once lifted (about 27°).
 */
const PLANE_HALF_WIDTH = 0.5
/** Camera distance from the sphere's centre while the chart is flat. */
const FLAT_DISTANCE = 2.75
/** …and once it is a dome: slightly further, so the bulge stays in frame. */
const DOME_DISTANCE = 2.85
/** Sway amplitudes (radians): mostly a slow turn about the tilted pole. */
const SWAY_YAW = (5.5 * Math.PI) / 180
const SWAY_PITCH = (0.6 * Math.PI) / 180
/** The pole leans toward the viewer like a planisphere's (radians). */
const POLE_TILT = (23.4 * Math.PI) / 180
/** Largest pointer parallax, in radians, each axis. */
export const PARALLAX_LIMIT = (1.3 * Math.PI) / 180
/** How long the lift takes, and how much of it is a left-to-right wave. */
const LIFT_SECONDS = 2.6
const LIFT_STAGGER = 0.45

const POLE = new THREE.Vector3(0, Math.cos(POLE_TILT), Math.sin(POLE_TILT)).normalize()
const X_AXIS = new THREE.Vector3(1, 0, 0)

const unitsPerChart = (frame: ChartFrame): number => (2 * PLANE_HALF_WIDTH) / frame.width

/** A chart point on the tangent plane at the sphere's front (z = R). */
function planePoint(frame: ChartFrame, x: number, y: number, out = new THREE.Vector3()): THREE.Vector3 {
  const k = unitsPerChart(frame)
  return out.set((x - frame.width / 2) * k, -(y - frame.height / 2) * k, SPHERE_RADIUS)
}

/** A chart point `lift` of the way (0..1, already eased) from the plane onto the sphere. */
export function liftedPoint(frame: ChartFrame, x: number, y: number, lift: number, out = new THREE.Vector3()): THREE.Vector3 {
  planePoint(frame, x, y, out)
  const length = out.length()
  return out.multiplyScalar((length + (SPHERE_RADIUS - length) * lift) / length)
}

const ease = (t: number): number => {
  const x = Math.min(Math.max(t, 0), 1)
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2
}

/** Per-point lift: a wave that crosses the chart left to right. */
function pointLift(frame: ChartFrame, x: number, progress: number): number {
  return ease(progress * (1 + LIFT_STAGGER) - LIFT_STAGGER * (x / frame.width))
}

/**
 * Point the camera at the sphere so that, while the chart is flat, each chart
 * unit falls where the SVG draws it in a `width`×`height` CSS-pixel box.
 */
export function frameCamera(camera: THREE.PerspectiveCamera, frame: ChartFrame, width: number, height: number, lift: number): void {
  const scale = Math.min(width / frame.width, height / frame.height)
  const worldPerPixel = unitsPerChart(frame) / scale
  const planeDistance = FLAT_DISTANCE - SPHERE_RADIUS
  camera.fov = (2 * Math.atan((height * worldPerPixel) / 2 / planeDistance) * 180) / Math.PI
  camera.aspect = width / height
  camera.near = 0.05
  camera.far = 20
  camera.position.set(0, 0, FLAT_DISTANCE + (DOME_DISTANCE - FLAT_DISTANCE) * lift)
  camera.lookAt(0, 0, 0)
  camera.updateProjectionMatrix()
  camera.updateMatrixWorld()
}

export interface Sway {
  yaw: number
  pitch: number
}

/** The ambient sway `seconds` into the shared clock. Periodic in SKY_PERIOD_S. */
export function swayAt(seconds: number): Sway {
  const phase = (2 * Math.PI * seconds) / SKY_PERIOD_S
  return { yaw: SWAY_YAW * Math.sin(phase), pitch: SWAY_PITCH * Math.sin(2 * phase + 0.6) }
}

/** Sway plus parallax (each axis within ±PARALLAX_LIMIT), weighted by the lift. */
export function skyRotation(sway: Sway, parallax: { x: number; y: number }, weight: number, out = new THREE.Quaternion()): THREE.Quaternion {
  const yaw = new THREE.Quaternion().setFromAxisAngle(POLE, (sway.yaw + parallax.x) * weight)
  const pitch = new THREE.Quaternion().setFromAxisAngle(X_AXIS, (sway.pitch + parallax.y) * weight)
  return out.copy(pitch).multiply(yaw)
}

// ---- Reading the chart from the page --------------------------------------

type Polyline = Array<[number, number]>

/** Absolute and relative M/L/H/V path data, which is all the chart uses. */
function parsePath(d: string): Polyline[] {
  const lines: Polyline[] = []
  let current: Polyline = []
  let x = 0
  let y = 0
  for (const [, command, args] of d.matchAll(/([MLHVmlhv])([^MLHVmlhv]*)/gu)) {
    const numbers = (args ?? '').trim().split(/[\s,]+/u).filter(Boolean).map(Number)
    switch (command) {
      case 'M':
      case 'm':
        if (current.length > 1) lines.push(current)
        x = command === 'M' ? (numbers[0] ?? 0) : x + (numbers[0] ?? 0)
        y = command === 'M' ? (numbers[1] ?? 0) : y + (numbers[1] ?? 0)
        current = [[x, y]]
        for (let index = 2; index + 1 < numbers.length; index += 2) {
          x = command === 'M' ? (numbers[index] ?? 0) : x + (numbers[index] ?? 0)
          y = command === 'M' ? (numbers[index + 1] ?? 0) : y + (numbers[index + 1] ?? 0)
          current.push([x, y])
        }
        break
      case 'L':
      case 'l':
        for (let index = 0; index + 1 < numbers.length; index += 2) {
          x = command === 'L' ? (numbers[index] ?? 0) : x + (numbers[index] ?? 0)
          y = command === 'L' ? (numbers[index + 1] ?? 0) : y + (numbers[index + 1] ?? 0)
          current.push([x, y])
        }
        break
      case 'H':
      case 'h':
        for (const value of numbers) { x = command === 'H' ? value : x + value; current.push([x, y]) }
        break
      case 'V':
      case 'v':
        for (const value of numbers) { y = command === 'V' ? value : y + value; current.push([x, y]) }
        break
    }
  }
  if (current.length > 1) lines.push(current)
  return lines
}

const attr = (element: Element, name: string): number => Number(element.getAttribute(name) ?? 0)

interface ChartStar {
  x: number
  y: number
  r: number
  tier: string
  constellation: string
  element: Element
}

interface ChartConstellation {
  id: string
  tier: string
  lines: Polyline[]
}

interface Chart {
  frame: ChartFrame
  grid: Polyline[]
  neatline: Polyline[]
  bridges: Polyline[]
  constellations: ChartConstellation[]
  stars: ChartStar[]
  route: Polyline
}

function readChart(svg: SVGSVGElement): Chart {
  const box = svg.viewBox.baseVal
  const frame = { width: box?.width || 1000, height: box?.height || 560 }
  const grid = [...svg.querySelectorAll('.sky__grid line')].map((line): Polyline => [
    [attr(line, 'x1'), attr(line, 'y1')],
    [attr(line, 'x2'), attr(line, 'y2')],
  ])
  const neatline: Polyline[] = [[[0, 0], [frame.width, 0], [frame.width, frame.height], [0, frame.height], [0, 0]]]
  for (const tick of svg.querySelectorAll('.sky__neatline path')) neatline.push(...parsePath(tick.getAttribute('d') ?? ''))
  const bridges = [...svg.querySelectorAll('.sky__bridges path')].flatMap((path) => parsePath(path.getAttribute('d') ?? ''))
  const constellations: ChartConstellation[] = []
  const stars: ChartStar[] = []
  for (const group of svg.querySelectorAll<SVGGElement>('g[data-constellation]')) {
    const id = group.dataset.constellation ?? ''
    const tier = group.dataset.tier ?? 'foundations'
    const path = group.querySelector('[data-constellation-path]')
    constellations.push({ id, tier, lines: parsePath(path?.getAttribute('d') ?? '') })
    for (const circle of group.querySelectorAll('[data-star]')) {
      stars.push({ x: attr(circle, 'cx'), y: attr(circle, 'cy'), r: attr(circle, 'r'), tier, constellation: id, element: circle })
    }
  }
  const route = parsePath(svg.querySelector('.sky__comet')?.getAttribute('d') ?? '')[0] ?? []
  return { frame, grid, neatline, bridges, constellations, stars, route }
}

// ---- Rendering --------------------------------------------------------------

const TIERS = ['foundations', 'core', 'advanced', 'frontier'] as const
const TOKENS = ['--plate', '--grid', '--rule-strong', '--reticle', ...TIERS.map((tier) => `--tier-${tier}`)]

/** Long chart segments are subdivided so they bend into great circles. */
const STEP = 10

interface LineSet {
  object: LineSegments2
  material: LineMaterial
  /** Chart coordinates of every segment endpoint, as x,y pairs. */
  source: Float32Array
  dashed: boolean
}

const STAR_VERTEX = /* glsl */ `
  attribute float aRadius;
  attribute vec3 aColor;
  attribute float aFill;
  attribute float aAlpha;
  uniform float uPixels;
  uniform float uRatio;
  uniform float uStroke;
  varying vec3 vColor;
  varying float vFill;
  varying float vAlpha;
  varying float vRadius;
  varying float vSize;
  void main() {
    vColor = aColor;
    vFill = aFill;
    vAlpha = aAlpha;
    vRadius = aRadius * uPixels;
    vSize = (vRadius + uStroke) * 2.0 + 3.0;
    gl_PointSize = vSize * uRatio;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const STAR_FRAGMENT = /* glsl */ `
  uniform vec3 uPlate;
  uniform float uStroke;
  varying vec3 vColor;
  varying float vFill;
  varying float vAlpha;
  varying float vRadius;
  varying float vSize;
  void main() {
    // Distances in CSS pixels, so the ring is the poster's 1.4px stroke.
    float d = length(gl_PointCoord - 0.5) * vSize;
    float ring = 1.0 - smoothstep(uStroke * 0.5 - 0.55, uStroke * 0.5 + 0.55, abs(d - vRadius));
    float inside = 1.0 - smoothstep(vRadius - 0.55, vRadius + 0.55, d);
    float alpha = max(ring, inside) * vAlpha;
    if (alpha < 0.01) discard;
    vec3 body = mix(uPlate, vColor, vFill);
    gl_FragColor = vec4(mix(body, vColor, ring), alpha);
    #include <colorspace_fragment>
  }
`

export interface SkyOptions {
  figure: HTMLElement
  canvas: HTMLCanvasElement
  svg: SVGSVGElement
  /** Constellation names: `li[data-constellation-label]`, positioned by --x/--y. */
  labels: HTMLElement[]
  toggle: HTMLInputElement | null
  /** Called once, after the first frame has been drawn. */
  onFirstFrame(): void
  /** Called if the GPU drops the context; the caller restores the poster. */
  onLost(): void
}

export interface SkyController {
  /** Begin the lift (or settle straight onto the dome without motion). */
  begin(): void
  dispose(): void
}

export function mountSky(options: SkyOptions): SkyController {
  const { figure, canvas, svg, labels, toggle } = options
  const chart = readChart(svg)
  const { frame } = chart

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power', stencil: false })
  const ratio = Math.min(window.devicePixelRatio || 1, 2)
  renderer.setPixelRatio(ratio)
  renderer.setClearColor(0x000000, 0)
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera()
  const sky = new THREE.Group()
  scene.add(sky)

  // ---- state ----
  const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)')
  let width = 0
  let height = 0
  let progress = 0 // lift progress, 0..1
  let lifting = false
  let began = false
  let onScreen = true
  let clock = performance.now() / 1000 // sway time, advances only with motion
  let cometProgress = readCometProgress()
  const parallax = { x: 0, y: 0 }
  const parallaxTarget = { x: 0, y: 0 }
  let highlighted: string | null = null
  let frameHandle = 0
  let lastTime = 0
  let lastDraw = 0
  let firstFrameSent = false
  let disposed = false
  const motionAllowed = (): boolean => !reducedQuery.matches && (toggle?.checked ?? true)

  // ---- palette ----
  let tokens = readTokens(figure, TOKENS)
  const token = (name: string, fallback: number): TokenColor => tokens.get(name) ?? { color: fallback, alpha: 1 }

  // ---- lines ----
  const lineSets: LineSet[] = []
  const constellationLines = new Map<string, LineSet>()

  function segments(lines: readonly Polyline[]): Float32Array {
    const out: number[] = []
    for (const line of lines) {
      for (let index = 1; index < line.length; index += 1) {
        const [x0, y0] = line[index - 1] as [number, number]
        const [x1, y1] = line[index] as [number, number]
        const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / STEP))
        for (let step = 0; step < steps; step += 1) {
          const a = step / steps
          const b = (step + 1) / steps
          out.push(x0 + (x1 - x0) * a, y0 + (y1 - y0) * a, x0 + (x1 - x0) * b, y0 + (y1 - y0) * b)
        }
      }
    }
    return new Float32Array(out)
  }

  function lineSet(lines: readonly Polyline[], linewidth: number, dashed: boolean, order: number): LineSet {
    const material = new LineMaterial({ linewidth, transparent: true, depthTest: false, dashed, worldUnits: false })
    const object = new LineSegments2(new LineSegmentsGeometry(), material)
    object.renderOrder = order
    object.frustumCulled = false
    sky.add(object)
    const set = { object, material, source: segments(lines), dashed }
    lineSets.push(set)
    return set
  }

  const grid = lineSet(chart.grid, 1, true, 0)
  const neatline = lineSet(chart.neatline, 1, false, 1)
  const bridges = lineSet(chart.bridges, 1, true, 2)
  for (const constellation of chart.constellations) {
    constellationLines.set(constellation.id, lineSet(constellation.lines, 1.4, false, 3))
  }
  const comet = lineSet([], 2.6, false, 5)

  // ---- stars ----
  const starGeometry = new THREE.BufferGeometry()
  const starPositions = new Float32Array(chart.stars.length * 3)
  const starColors = new Float32Array(chart.stars.length * 3)
  const starFill = new Float32Array(chart.stars.length)
  const starAlpha = new Float32Array(chart.stars.length).fill(1)
  starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
  starGeometry.setAttribute('aRadius', new THREE.BufferAttribute(new Float32Array(chart.stars.map((star) => star.r)), 1))
  starGeometry.setAttribute('aColor', new THREE.BufferAttribute(starColors, 3))
  starGeometry.setAttribute('aFill', new THREE.BufferAttribute(starFill, 1))
  starGeometry.setAttribute('aAlpha', new THREE.BufferAttribute(starAlpha, 1))
  const starMaterial = new THREE.ShaderMaterial({
    vertexShader: STAR_VERTEX,
    fragmentShader: STAR_FRAGMENT,
    uniforms: {
      uPixels: { value: 1 },
      uRatio: { value: ratio },
      uStroke: { value: 1.4 },
      uPlate: { value: new THREE.Color() },
    },
    transparent: true,
    depthTest: false,
  })
  const stars = new THREE.Points(starGeometry, starMaterial)
  stars.renderOrder = 4
  stars.frustumCulled = false
  sky.add(stars)

  // ---- colour ----
  function applyColors(): void {
    const plate = token('--plate', 0xffffff)
    const gridColor = token('--grid', 0x2b44c7)
    const rule = token('--rule-strong', 0x0b1533)
    grid.material.color.setHex(gridColor.color)
    grid.material.opacity = gridColor.alpha
    neatline.material.color.setHex(rule.color)
    neatline.material.opacity = rule.alpha
    bridges.material.color.setHex(rule.color)
    bridges.material.opacity = rule.alpha
    const reticle = token('--reticle', 0xc8102e)
    comet.material.color.setHex(reticle.color)
    comet.material.opacity = 1
    for (const constellation of chart.constellations) {
      const set = constellationLines.get(constellation.id)
      if (!set) continue
      set.material.color.setHex(token(`--tier-${constellation.tier}`, 0x2b44c7).color)
    }
    ;(starMaterial.uniforms.uPlate?.value as THREE.Color).setHex(plate.color)
    const color = new THREE.Color()
    for (const [index, star] of chart.stars.entries()) {
      color.setHex(token(`--tier-${star.tier}`, 0x2b44c7).color)
      starColors.set([color.r, color.g, color.b], index * 3)
    }
    starGeometry.getAttribute('aColor').needsUpdate = true
    applyHighlight()
  }

  /** Completion is owned by the page (`data-complete`); this only reads it. */
  function applyCompletion(): void {
    for (const [index, star] of chart.stars.entries()) {
      starFill[index] = star.element.getAttribute('data-complete') === 'true' ? 1 : 0
    }
    starGeometry.getAttribute('aFill').needsUpdate = true
  }

  /** Hovering or focusing a name dims every other constellation, as on the poster. */
  function applyHighlight(): void {
    for (const constellation of chart.constellations) {
      const set = constellationLines.get(constellation.id)
      if (set) set.material.opacity = 0.8 * (highlighted && highlighted !== constellation.id ? 0.35 : 1)
    }
    for (const [index, star] of chart.stars.entries()) {
      starAlpha[index] = highlighted && highlighted !== star.constellation ? 0.35 : 1
    }
    starGeometry.getAttribute('aAlpha').needsUpdate = true
  }

  // ---- geometry ----
  const point = new THREE.Vector3()
  const rotation = new THREE.Quaternion()

  function liftAt(x: number): number {
    return pointLift(frame, x, progress)
  }

  function layoutGeometry(): void {
    for (const set of lineSets) {
      if (set === comet) continue
      const positions = new Float32Array((set.source.length / 2) * 3)
      for (let index = 0; index < set.source.length; index += 2) {
        const x = set.source[index] ?? 0
        liftedPoint(frame, x, set.source[index + 1] ?? 0, liftAt(x), point)
        positions.set([point.x, point.y, point.z], (index / 2) * 3)
      }
      set.object.geometry.setPositions(positions)
      if (set.dashed) set.object.computeLineDistances()
    }
    for (const [index, star] of chart.stars.entries()) {
      liftedPoint(frame, star.x, star.y, liftAt(star.x), point)
      starPositions.set([point.x, point.y, point.z], index * 3)
    }
    starGeometry.getAttribute('position').needsUpdate = true
  }

  /** The comet: a short lit stretch of the course route, once per sky period. */
  const routeLengths: number[] = [0]
  for (let index = 1; index < chart.route.length; index += 1) {
    const [x0, y0] = chart.route[index - 1] as [number, number]
    const [x1, y1] = chart.route[index] as [number, number]
    routeLengths.push((routeLengths[index - 1] ?? 0) + Math.hypot(x1 - x0, y1 - y0))
  }
  const routeTotal = routeLengths[routeLengths.length - 1] ?? 0
  function routeAt(distance: number): [number, number] {
    const target = Math.min(Math.max(distance, 0), routeTotal)
    for (let index = 1; index < chart.route.length; index += 1) {
      const end = routeLengths[index] ?? 0
      if (target <= end) {
        const begin = routeLengths[index - 1] ?? 0
        const t = (target - begin) / (end - begin || 1)
        const [x0, y0] = chart.route[index - 1] as [number, number]
        const [x1, y1] = chart.route[index] as [number, number]
        return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]
      }
    }
    return chart.route[chart.route.length - 1] ?? [0, 0]
  }
  function layoutComet(): void {
    const show = motionAllowed() && routeTotal > 0
    comet.object.visible = show
    if (!show) return
    // The poster's comet is 0.6% of the route long.
    const head = cometProgress * routeTotal
    const tail = Math.max(0, head - routeTotal * 0.006)
    const steps = 6
    const positions = new Float32Array(steps * 6)
    for (let step = 0; step < steps; step += 1) {
      const [xa, ya] = routeAt(tail + ((head - tail) * step) / steps)
      const [xb, yb] = routeAt(tail + ((head - tail) * (step + 1)) / steps)
      liftedPoint(frame, xa, ya, liftAt(xa), point)
      positions.set([point.x, point.y, point.z], step * 6)
      liftedPoint(frame, xb, yb, liftAt(xb), point)
      positions.set([point.x, point.y, point.z], step * 6 + 3)
    }
    comet.object.geometry.setPositions(positions)
  }

  /** Where the CSS comet is, so the 3D one continues it rather than restarting. */
  function readCometProgress(): number {
    const animation = svg.querySelector('.sky__comet')?.getAnimations()[0]
    const value = animation?.effect?.getComputedTiming().progress
    return typeof value === 'number' ? value : 0
  }

  // ---- labels ----
  const anchors = labels.map((label) => {
    const read = (name: string): number => Number.parseFloat(label.style.getPropertyValue(name)) / 100
    return {
      label,
      original: { x: label.style.getPropertyValue('--x'), y: label.style.getPropertyValue('--y') },
      x: read('--x') * frame.width,
      y: read('--y') * frame.height,
      halfWidth: 0,
      halfHeight: 0,
    }
  })
  function measureLabels(): void {
    for (const anchor of anchors) {
      anchor.halfWidth = anchor.label.offsetWidth / 2
      anchor.halfHeight = anchor.label.offsetHeight / 2
    }
  }
  const toCamera = new THREE.Vector3()
  function placeLabels(): void {
    if (!(width > 0 && height > 0)) return
    for (const anchor of anchors) {
      if (!Number.isFinite(anchor.x) || !Number.isFinite(anchor.y)) continue
      liftedPoint(frame, anchor.x, anchor.y, liftAt(anchor.x), point).applyQuaternion(rotation)
      toCamera.copy(camera.position).sub(point).normalize()
      const facing = point.clone().normalize().dot(toCamera)
      point.project(camera)
      // Kept inside the figure by the label's own half-size: a label pushed
      // past the edge would widen the page.
      const x = Math.min(Math.max(((point.x + 1) / 2) * width, anchor.halfWidth), width - anchor.halfWidth)
      const y = Math.min(Math.max(((1 - point.y) / 2) * height, anchor.halfHeight), height - anchor.halfHeight)
      anchor.label.style.setProperty('--x', `${((x / width) * 100).toFixed(3)}%`)
      anchor.label.style.setProperty('--y', `${((y / height) * 100).toFixed(3)}%`)
      anchor.label.toggleAttribute('data-occluded', facing < 0.15)
    }
  }

  // ---- drawing ----
  function draw(): void {
    const sway = swayAt(clock)
    const weight = ease(progress)
    skyRotation(sway, parallax, weight, rotation)
    sky.quaternion.copy(rotation)
    frameCamera(camera, frame, width, height, weight)
    layoutComet()
    placeLabels()
    renderer.render(scene, camera)
    lastDraw = performance.now()
    if (!firstFrameSent) {
      firstFrameSent = true
      options.onFirstFrame()
    }
  }

  function resize(): void {
    const box = canvas.getBoundingClientRect()
    if (!(box.width > 0 && box.height > 0)) return
    width = box.width
    height = box.height
    renderer.setSize(width, height, false)
    const scale = Math.min(width / frame.width, height / frame.height)
    ;(starMaterial.uniforms.uPixels as { value: number }).value = scale
    const worldPerPixel = unitsPerChart(frame) / scale
    for (const set of lineSets) {
      set.material.resolution.set(width, height)
      // The poster's dash patterns, in CSS pixels at the chart plane.
      if (set === grid) { set.material.dashSize = worldPerPixel; set.material.gapSize = 3 * worldPerPixel }
      if (set === bridges) { set.material.dashSize = 2 * worldPerPixel; set.material.gapSize = 5 * worldPerPixel }
    }
    measureLabels()
    draw()
  }

  // ---- the loop: runs only while something moves ----
  function wantsFrames(): boolean {
    if (disposed || !onScreen || document.hidden) return false
    return lifting || (began && motionAllowed()) || Math.abs(parallax.x - parallaxTarget.x) + Math.abs(parallax.y - parallaxTarget.y) > 1e-5
  }

  function tick(now: number): void {
    frameHandle = 0
    if (!wantsFrames()) return
    const dt = Math.min((now - lastTime) / 1000, 0.1)
    lastTime = now
    let urgent = false
    if (lifting) {
      progress = Math.min(1, progress + dt / LIFT_SECONDS)
      layoutGeometry()
      urgent = true
      if (progress >= 1) lifting = false
    }
    if (motionAllowed() && began) {
      clock += dt
      cometProgress = (cometProgress + dt / SKY_PERIOD_S) % 1
    }
    const follow = 1 - Math.exp(-dt * 5)
    const before = parallax.x + parallax.y
    parallax.x += (parallaxTarget.x - parallax.x) * follow
    parallax.y += (parallaxTarget.y - parallax.y) * follow
    if (Math.abs(parallax.x + parallax.y - before) > 1e-5) urgent = true
    // The sway and comet move a fraction of a pixel per frame: 30 fps is
    // indistinguishable and halves the cost of an idle home page.
    if (urgent || now - lastDraw > 1000 / 30) draw()
    schedule()
  }

  function schedule(): void {
    if (frameHandle || !wantsFrames()) return
    lastTime = performance.now()
    frameHandle = requestAnimationFrame(tick)
  }

  /** A change that is not motion (theme, completion, toggle off): one frame. */
  function refresh(): void {
    if (!motionAllowed()) {
      parallax.x = parallaxTarget.x = 0
      parallax.y = parallaxTarget.y = 0
    }
    if (width > 0) draw()
    schedule()
  }

  // ---- events ----
  const cleanups: Array<() => void> = []
  const on = (target: EventTarget, type: string, handler: EventListener, options?: AddEventListenerOptions): void => {
    target.addEventListener(type, handler, options)
    cleanups.push(() => target.removeEventListener(type, handler, options))
  }

  // Parallax follows a mouse only. Passive listeners, no preventDefault:
  // the page must scroll over the sky on every device.
  on(figure, 'pointermove', ((event: PointerEvent) => {
    if (event.pointerType !== 'mouse' || !motionAllowed() || !began) return
    const box = figure.getBoundingClientRect()
    parallaxTarget.x = (((event.clientX - box.left) / box.width) * 2 - 1) * PARALLAX_LIMIT
    parallaxTarget.y = (((event.clientY - box.top) / box.height) * 2 - 1) * PARALLAX_LIMIT
    schedule()
  }) as EventListener, { passive: true })
  on(figure, 'pointerleave', () => { parallaxTarget.x = 0; parallaxTarget.y = 0; schedule() }, { passive: true })

  for (const anchor of anchors) {
    const id = anchor.label.dataset.constellationLabel ?? null
    const enter = (): void => { highlighted = id; applyHighlight(); refresh() }
    const leave = (): void => { highlighted = null; applyHighlight(); refresh() }
    on(anchor.label, 'pointerenter', enter)
    on(anchor.label, 'pointerleave', leave)
    on(anchor.label, 'focusin', enter)
    on(anchor.label, 'focusout', leave)
  }

  if (toggle) on(toggle, 'change', () => refresh())
  on(reducedQuery, 'change', () => {
    if (reducedQuery.matches && lifting) { lifting = false; progress = 1; layoutGeometry() }
    refresh()
  })
  const recolor = (): void => { tokens = readTokens(figure, TOKENS); applyColors(); refresh() }
  on(darkQuery, 'change', recolor)
  const themeObserver = new MutationObserver(recolor)
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  cleanups.push(() => themeObserver.disconnect())

  const completionObserver = new MutationObserver(() => { applyCompletion(); refresh() })
  completionObserver.observe(svg, { subtree: true, attributes: true, attributeFilter: ['data-complete'] })
  cleanups.push(() => completionObserver.disconnect())

  on(document, 'visibilitychange', () => schedule())
  const visibility = new IntersectionObserver(([entry]) => {
    onScreen = entry?.isIntersecting ?? false
    schedule()
  })
  visibility.observe(figure)
  cleanups.push(() => visibility.disconnect())

  const sizeObserver = new ResizeObserver(() => resize())
  sizeObserver.observe(figure)
  cleanups.push(() => sizeObserver.disconnect())

  on(canvas, 'webglcontextlost', ((event: Event) => {
    event.preventDefault()
    options.onLost()
  }) as EventListener)

  // ---- first frame ----
  // Without motion there is no lift: the first frame is already the dome.
  if (!motionAllowed()) progress = 1
  applyColors()
  applyCompletion()
  layoutGeometry()
  resize()

  return {
    begin(): void {
      if (began || disposed) return
      began = true
      if (progress < 1) lifting = true
      schedule()
    },
    dispose(): void {
      if (disposed) return
      disposed = true
      if (frameHandle) cancelAnimationFrame(frameHandle)
      for (const cleanup of cleanups.splice(0)) cleanup()
      for (const anchor of anchors) {
        anchor.label.style.setProperty('--x', anchor.original.x)
        anchor.label.style.setProperty('--y', anchor.original.y)
        anchor.label.removeAttribute('data-occluded')
      }
      disposeSubtree(scene)
      renderer.dispose()
      renderer.forceContextLoss()
    },
  }
}
