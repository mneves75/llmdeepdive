import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import type { SceneContext, SceneModule } from '../stage'
import type { MarkerSpec } from '../markers'
import { FIELD_PALETTE, type ScenePalette } from '../palette.ts'

/**
 * The Signal Observatory: one decoder block built as a fine instrument.
 *
 * An armillary stack on a single axis. The token enters as a ceramic tile on
 * the embedding plate, rises up the axis through every deck, and leaves
 * through the crown — input at the bottom, output at the top, always. Each
 * deck is an enamel plate engraved like a chart, carrying its mechanism:
 *
 *  - attention is a small celestial dome; the query token is one star on it
 *    and its attention to earlier tokens is drawn as great-circle arcs, line
 *    weight following the attention weight;
 *  - the feed-forward network is the one warm core, a gold enamel sphere in
 *    an armillary cage of vanes;
 *  - normalisation decks are calibration hoops; residual adds are junction
 *    hoops whose spokes meet at the axis;
 *  - the two residual bypasses are side meridians, and a copy of the signal
 *    rides each one, arriving at its add at the same moment as the token.
 *
 * Everything is procedural, so the instrument is a few KB of arithmetic
 * rather than a downloaded model, and every number below is checked against
 * the stage envelope by `tests/transformer-scene.test.mjs`.
 */

export interface Deck {
  id: string
  label: string
  /** Thickness of the plate or hoop. */
  plate: number
  /** Height of the mechanism standing on the plate. */
  rise: number
}

export const DECKS: readonly Deck[] = [
  { id: 'embedding', label: 'Token + positional embedding', plate: 0.09, rise: 0.07 },
  { id: 'norm-1', label: 'RMSNorm', plate: 0.03, rise: 0 },
  { id: 'attention', label: 'Multi-head self-attention', plate: 0.07, rise: 0.44 },
  { id: 'residual-1', label: 'Residual add', plate: 0.03, rise: 0 },
  { id: 'norm-2', label: 'RMSNorm', plate: 0.03, rise: 0 },
  { id: 'ffn', label: 'Feed-forward network', plate: 0.07, rise: 0.32 },
  { id: 'residual-2', label: 'Residual add', plate: 0.03, rise: 0 },
  { id: 'lm-head', label: 'LM head + sampler', plate: 0.07, rise: 0.27 },
]

/** Radius of every plate and hoop; ports sit just outside it. */
export const RIM_RADIUS = 1
/** Opacity of everything an isolated selection is not. */
export const DIM_OPACITY = 0.12
/**
 * One token journey, bottom to top. A whole fraction of the shared ambient
 * clock (`SKY_PERIOD_S` = 180 s) so every loop on the site stays in phase.
 */
export const JOURNEY_SECONDS = 12

/** Underside of the plinth; the stem below it stands on the chart floor. */
const BASE_Y = -1.94
const FOOT_Y = -2.08
const PLINTH_H = 0.14
const PLINTH_R = 1.22
const PLINTH_GAP = 0.17
const DECK_GAP = 0.2
const CROWN_GAP = 0.12
const CROWN_H = 0.16
const MERIDIAN_BULGE = 0.4
/** Both bypasses run up one side meridian, at this azimuth (radians). */
const MERIDIAN_AZIMUTH = (-30 * Math.PI) / 180
/** The initial camera looks at the instrument from this azimuth (radians, +x toward +z). */
export const FRONT_AZIMUTH = (58 * Math.PI) / 180
const FRONT = FRONT_AZIMUTH
const DOME_RADIUS = 0.6

export interface DeckPlacement {
  /** Centre of the plate. */
  y: number
  plate: number
  rise: number
  /** Top of the mechanism. */
  top: number
}

/** Plate centre and extent of every deck, bottom to top. */
export function deckLayout(): Map<string, DeckPlacement> {
  const out = new Map<string, DeckPlacement>()
  let cursor = BASE_Y + PLINTH_H + PLINTH_GAP
  for (const deck of DECKS) {
    const top = cursor + deck.plate + deck.rise
    out.set(deck.id, { y: cursor + deck.plate / 2, plate: deck.plate, rise: deck.rise, top })
    cursor = top + DECK_GAP
  }
  return out
}

const placement = (layout: Map<string, DeckPlacement>, id: string): DeckPlacement =>
  layout.get(id) ?? { y: 0, plate: 0, rise: 0, top: 0 }

const plateTop = (deck: DeckPlacement): number => deck.y + deck.plate / 2

function crownY(layout: Map<string, DeckPlacement>): number {
  return placement(layout, 'lm-head').top + CROWN_GAP + CROWN_H / 2
}

const radial = (radius: number, angle: number, y: number): THREE.Vector3 =>
  new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius)

// ---- Ports ------------------------------------------------------------------

/**
 * One numbered port per library component, in the library's own order (the
 * rail prints the same numbers). Angles are degrees from +x toward +z; the
 * camera starts at 58°, so ports cluster on the side that faces it.
 */
const PORTS: ReadonlyArray<{ id: string; deck: string; angle: number; label: string; detail: string }> = [
  { id: 'tokenizer', deck: 'embedding', angle: 100, label: 'Tokenizer', detail: 'Text is split into the units that enter the model.' },
  { id: 'embedding', deck: 'embedding', angle: 58, label: 'Embedding', detail: 'Tokens become vectors. Meaning starts as geometry here.' },
  { id: 'positional', deck: 'embedding', angle: 16, label: 'Position', detail: 'Order is encoded before attention routes information.' },
  { id: 'norm', deck: 'norm-1', angle: 80, label: 'Normalisation', detail: 'RMSNorm keeps activation scale stable through the stack.' },
  { id: 'attention', deck: 'attention', angle: 40, label: 'Self-attention', detail: 'Every position reads every earlier position.' },
  { id: 'kv-cache', deck: 'attention', angle: 98, label: 'KV cache', detail: 'Past keys and values are kept beside attention.' },
  { id: 'residual', deck: 'residual-1', angle: 12, label: 'Residual stream', detail: 'The highway each block reads from and writes back into.' },
  { id: 'ffn', deck: 'ffn', angle: 44, label: 'Feed-forward', detail: 'Most of the parameters; where most knowledge is stored.' },
  { id: 'moe-router', deck: 'ffn', angle: 100, label: 'MoE router', detail: 'A sparse gate picks which experts process each token.' },
  { id: 'quantization', deck: 'ffn', angle: 4, label: 'Quantisation', detail: 'Fewer bits per weight, across every learned mechanism.' },
  { id: 'lm-head', deck: 'lm-head', angle: 44, label: 'LM head', detail: 'Back to vocabulary space: one logit per token.' },
  { id: 'sampler', deck: 'lm-head', angle: 100, label: 'Sampler', detail: 'A decoding policy chooses one token from the logits.' },
]

const PORT_RADIUS = RIM_RADIUS + 0.04

export function transformerMarkers(): MarkerSpec[] {
  const layout = deckLayout()
  return PORTS.map(({ id, deck, angle, label, detail }) => {
    const point = radial(PORT_RADIUS, (angle * Math.PI) / 180, placement(layout, deck).y)
    return { id, label, detail, position: [point.x, point.y, point.z] }
  })
}

/** Which deck(s) a component lives on, for isolation. */
const ISOLATE_TARGET: Readonly<Record<string, readonly string[]>> = {
  tokenizer: ['embedding'],
  embedding: ['embedding'],
  positional: ['embedding'],
  norm: ['norm-1', 'norm-2'],
  attention: ['attention'],
  'kv-cache': ['attention'],
  residual: ['residual-1', 'residual-2'],
  ffn: ['ffn'],
  'moe-router': ['ffn'],
  quantization: ['ffn'],
  'lm-head': ['lm-head'],
  sampler: ['lm-head'],
}

export function isolationTargets(id: string): readonly string[] {
  return ISOLATE_TARGET[id] ?? [id]
}

// ---- Attention: a celestial dome --------------------------------------------

/** Directions on the unit hemisphere (azimuth, elevation in degrees). */
const KEY_STARS: ReadonlyArray<{ azimuth: number; elevation: number; weight: number }> = [
  { azimuth: 210, elevation: 24, weight: 0.36 },
  { azimuth: 268, elevation: 44, weight: 0.24 },
  { azimuth: 330, elevation: 22, weight: 0.17 },
  { azimuth: 12, elevation: 50, weight: 0.13 },
  { azimuth: 130, elevation: 30, weight: 0.1 },
]
const QUERY_STAR = { azimuth: 70, elevation: 58 }

const domeDirection = (azimuth: number, elevation: number): THREE.Vector3 => {
  const a = (azimuth * Math.PI) / 180
  const e = (elevation * Math.PI) / 180
  return new THREE.Vector3(Math.cos(e) * Math.cos(a), Math.sin(e), Math.cos(e) * Math.sin(a))
}

/** The dome is flattened to fit its deck; directions are scaled after slerp. */
function domePoint(direction: THREE.Vector3, base: number, height: number): THREE.Vector3 {
  return new THREE.Vector3(direction.x * DOME_RADIUS, base + direction.y * height, direction.z * DOME_RADIUS)
}

/** A great-circle arc between two dome stars, sampled on the flattened dome. */
function greatCircle(from: THREE.Vector3, to: THREE.Vector3, base: number, height: number, steps = 40): THREE.Vector3[] {
  const a = new THREE.Quaternion()
  const b = new THREE.Quaternion().setFromUnitVectors(from, to)
  const out: THREE.Vector3[] = []
  for (let step = 0; step <= steps; step += 1) {
    const q = a.clone().slerp(b, step / steps)
    out.push(domePoint(from.clone().applyQuaternion(q), base, height))
  }
  return out
}

// ---- The token journey --------------------------------------------------------

export interface SignalPoint { x: number; y: number; z: number }

export interface SignalState {
  main: SignalPoint
  /** The residual copy on its bypass, when one is travelling. */
  twin: SignalPoint | null
  /** Which residual add the copy is heading for. */
  bypass: 'residual-1' | 'residual-2' | null
  /** The deck the token last reached. */
  deck: string
  /** 0..1 visibility of the token (it fades in at the input, out past the crown). */
  presence: number
  /** 0..1 progress of the attention read, while it happens. */
  attention: number
  /** 0..1 heat of the FFN core. */
  core: number
  /** 0..1 brightness of the sampled logit. */
  sample: number
}

interface Waypoint {
  deck: string
  y: number
  /** Seconds to travel here from the previous waypoint. */
  travel: number
  /** Seconds to rest here. */
  dwell: number
}

interface Journey {
  start: THREE.Vector3
  waypoints: Waypoint[]
  /** Arrival time at each waypoint, and departure time. */
  arrive: number[]
  depart: number[]
  exitY: number
  meridians: Record<'residual-1' | 'residual-2', THREE.Vector3[]>
}

const smoother = (t: number): number => {
  const x = Math.min(Math.max(t, 0), 1)
  return x * x * x * (x * (x * 6 - 15) + 10)
}

/** Polyline length-parameterised lookup, so the copy moves at even speed. */
function along(points: readonly THREE.Vector3[], t: number): THREE.Vector3 {
  const lengths = [0]
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1] as THREE.Vector3
    const current = points[index] as THREE.Vector3
    lengths.push((lengths[index - 1] ?? 0) + previous.distanceTo(current))
  }
  const total = lengths[lengths.length - 1] ?? 0
  const target = Math.min(Math.max(t, 0), 1) * total
  for (let index = 1; index < points.length; index += 1) {
    const end = lengths[index] ?? 0
    if (target <= end) {
      const begin = lengths[index - 1] ?? 0
      const span = end - begin || 1
      return (points[index - 1] as THREE.Vector3).clone().lerp(points[index] as THREE.Vector3, (target - begin) / span)
    }
  }
  return (points[points.length - 1] as THREE.Vector3).clone()
}

/**
 * A bypass path: out from the axis along a spoke, up the side meridian, back in
 * along the junction's spoke to the add on the axis.
 */
function meridian(y0: number, y1: number, steps = 48): THREE.Vector3[] {
  const points: THREE.Vector3[] = []
  for (let step = 0; step <= 8; step += 1) points.push(radial((RIM_RADIUS * step) / 8, MERIDIAN_AZIMUTH, y0))
  for (let step = 1; step < steps; step += 1) {
    const s = step / steps
    points.push(radial(RIM_RADIUS + MERIDIAN_BULGE * Math.sin(Math.PI * s), MERIDIAN_AZIMUTH, y0 + (y1 - y0) * s))
  }
  for (let step = 8; step >= 0; step -= 1) points.push(radial((RIM_RADIUS * step) / 8, MERIDIAN_AZIMUTH, y1))
  return points
}

let journeyCache: Journey | null = null

function journey(): Journey {
  if (journeyCache) return journeyCache
  const layout = deckLayout()
  const embedding = placement(layout, 'embedding')
  const ffn = placement(layout, 'ffn')
  const tileY = plateTop(embedding) + 0.035
  const waypoints: Waypoint[] = [
    { deck: 'embedding', y: tileY, travel: 0.9, dwell: 0.35 },
    { deck: 'norm-1', y: placement(layout, 'norm-1').y, travel: 0.55, dwell: 0.15 },
    { deck: 'attention', y: placement(layout, 'attention').y, travel: 0.55, dwell: 0.2 },
    // The attention read happens on the way up through the dome, slowly.
    { deck: 'residual-1', y: placement(layout, 'residual-1').y, travel: 1.9, dwell: 0.35 },
    { deck: 'norm-2', y: placement(layout, 'norm-2').y, travel: 0.5, dwell: 0.15 },
    { deck: 'ffn', y: plateTop(ffn) + 0.16, travel: 0.7, dwell: 0.6 },
    { deck: 'residual-2', y: placement(layout, 'residual-2').y, travel: 0.6, dwell: 0.35 },
    { deck: 'lm-head', y: plateTop(placement(layout, 'lm-head')) + 0.02, travel: 0.7, dwell: 0.8 },
  ]
  const arrive: number[] = []
  const depart: number[] = []
  let clock = 0
  for (const point of waypoints) {
    clock += point.travel
    arrive.push(clock)
    clock += point.dwell
    depart.push(clock)
  }
  journeyCache = {
    start: radial(0.62, FRONT, tileY),
    waypoints,
    arrive,
    depart,
    exitY: crownY(layout) + CROWN_H / 2 + 0.12,
    meridians: {
      'residual-1': meridian(tileY - 0.02, placement(layout, 'residual-1').y),
      'residual-2': meridian(placement(layout, 'residual-1').y, placement(layout, 'residual-2').y),
    },
  }
  return journeyCache
}

/** The two bypass centrelines, for drawings that must agree with the scene. */
export function bypassPaths(): Record<'residual-1' | 'residual-2', SignalPoint[]> {
  const { meridians } = journey()
  const plain = (points: readonly THREE.Vector3[]): SignalPoint[] => points.map(({ x, y, z }) => ({ x, y, z }))
  return { 'residual-1': plain(meridians['residual-1']), 'residual-2': plain(meridians['residual-2']) }
}

/** Where everything is `seconds` into a journey (wraps every JOURNEY_SECONDS). */
export function signalAt(seconds: number): SignalState {
  const path = journey()
  const t = ((seconds % JOURNEY_SECONDS) + JOURNEY_SECONDS) % JOURNEY_SECONDS
  const { waypoints, arrive, depart } = path
  const last = waypoints.length - 1
  const exitStart = depart[last] ?? 0
  const exitEnd = exitStart + 0.9
  const fadeEnd = exitEnd + 0.5

  const state: SignalState = {
    main: { x: 0, y: 0, z: 0 },
    twin: null,
    bypass: null,
    deck: 'embedding',
    presence: 1,
    attention: 0,
    core: 0,
    sample: 0,
  }
  const set = (point: THREE.Vector3): void => { state.main = { x: point.x, y: point.y, z: point.z } }

  const firstArrive = arrive[0] ?? 0
  if (t < firstArrive) {
    // The token leaves its tile for the axis.
    const u = smoother(t / firstArrive)
    set(path.start.clone().lerp(new THREE.Vector3(0, path.start.y, 0), u))
    state.presence = Math.min(1, t / 0.35)
  } else if (t >= exitStart) {
    const u = smoother((t - exitStart) / (exitEnd - exitStart))
    const fromY = waypoints[last]?.y ?? 0
    set(new THREE.Vector3(0, fromY + (path.exitY - fromY) * u, 0))
    state.deck = 'lm-head'
    state.presence = t < exitEnd ? 1 : Math.max(0, 1 - (t - exitEnd) / (fadeEnd - exitEnd))
  } else {
    let index = 0
    while (index < last && t >= (arrive[index + 1] ?? Infinity)) index += 1
    const here = waypoints[index] as Waypoint
    const leave = depart[index] ?? 0
    const next = waypoints[index + 1]
    state.deck = here.deck
    if (t < leave || !next) {
      set(new THREE.Vector3(0, here.y, 0))
    } else {
      const reach = arrive[index + 1] ?? leave
      const u = smoother((t - leave) / (reach - leave))
      set(new THREE.Vector3(0, here.y + (next.y - here.y) * u, 0))
    }
  }

  // Residual copies: each leaves when the token leaves the sub-layer's input
  // and reaches its add exactly when the token does.
  const legs: Array<['residual-1' | 'residual-2', number, number]> = [
    ['residual-1', depart[0] ?? 0, arrive[3] ?? 0],
    ['residual-2', depart[3] ?? 0, arrive[6] ?? 0],
  ]
  for (const [id, from, to] of legs) {
    if (t > from && t < to) {
      const point = along(path.meridians[id], smoother((t - from) / (to - from)))
      state.twin = { x: point.x, y: point.y, z: point.z }
      state.bypass = id
    }
  }

  const attentionFrom = depart[2] ?? 0
  const attentionTo = arrive[3] ?? 0
  if (t > attentionFrom && t < attentionTo) state.attention = (t - attentionFrom) / (attentionTo - attentionFrom)
  const coreY = waypoints[5]?.y ?? 0
  state.core = Math.exp(-(((state.main.y - coreY) / 0.18) ** 2))
  const sampleFrom = arrive[last] ?? 0
  if (t > sampleFrom - 0.2) state.sample = Math.min(1, (t - (sampleFrom - 0.2)) / 0.3) * Math.max(0, 1 - Math.max(0, t - exitEnd) / 0.5)
  return state
}

// ---- Materials ----------------------------------------------------------------

interface Materials {
  porcelain: THREE.MeshPhysicalMaterial
  enamel: THREE.MeshPhysicalMaterial
  steel: THREE.MeshStandardMaterial
  warm: THREE.MeshPhysicalMaterial
  star: THREE.MeshBasicMaterial
  engraving: THREE.LineBasicMaterial
  faint: THREE.LineBasicMaterial
}

function materials(palette: ScenePalette): Materials {
  const enamelColor = new THREE.Color(palette.plate).lerp(new THREE.Color(palette.accent), 0.13)
  return {
    // Glazed ceramic: a clear glaze over a near-white body.
    porcelain: new THREE.MeshPhysicalMaterial({
      name: 'porcelain',
      color: palette.ink,
      roughness: 0.42,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
      envMapIntensity: 0.7,
    }),
    // Vitreous enamel on a dark ground: deep ink, high gloss.
    enamel: new THREE.MeshPhysicalMaterial({
      name: 'enamel',
      color: enamelColor,
      roughness: 0.55,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      envMapIntensity: 0.45,
    }),
    // Satin nickel for every rod, hoop and spoke.
    steel: new THREE.MeshStandardMaterial({
      name: 'steel',
      color: palette.inkMuted,
      roughness: 0.26,
      metalness: 1,
      envMapIntensity: 1.1,
    }),
    warm: new THREE.MeshPhysicalMaterial({
      name: 'warm-core',
      color: palette.tierCore,
      emissive: palette.tierCore,
      emissiveIntensity: 0.22,
      roughness: 0.3,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      userData: { warm: true },
    }),
    star: new THREE.MeshBasicMaterial({ name: 'star', color: palette.ink, toneMapped: false }),
    engraving: new THREE.LineBasicMaterial({ color: palette.accent, transparent: true, opacity: 0.55, toneMapped: false }),
    faint: new THREE.LineBasicMaterial({ color: palette.grid, transparent: true, opacity: 0.32, toneMapped: false }),
  }
}

/**
 * An engraved face: a canvas drawing used as a plate's top texture. Returns
 * null outside a browser (the scene tests build without a document).
 */
function engraving(size: number, draw: (ctx: CanvasRenderingContext2D, size: number) => void): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  draw(ctx, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

const css = (hex: number, alpha = 1): string => {
  const color = new THREE.Color(hex)
  return `rgb(${Math.round(color.r * 255)} ${Math.round(color.g * 255)} ${Math.round(color.b * 255)} / ${alpha})`
}

/** Concentric rings and a degree scale, like the rim of a planisphere. */
function drawDial(ctx: CanvasRenderingContext2D, size: number, ink: string, base: string, ticks: number): void {
  const c = size / 2
  ctx.fillStyle = base
  ctx.fillRect(0, 0, size, size)
  ctx.strokeStyle = ink
  ctx.lineCap = 'butt'
  for (const [radius, width] of [[0.985, 3], [0.94, 1.5], [0.7, 1.2], [0.42, 1.2], [0.14, 1.5]] as const) {
    ctx.lineWidth = width
    ctx.beginPath()
    ctx.arc(c, c, radius * c, 0, Math.PI * 2)
    ctx.stroke()
  }
  for (let tick = 0; tick < ticks; tick += 1) {
    const angle = (tick / ticks) * Math.PI * 2
    const major = tick % (ticks / 12) === 0
    const inner = major ? 0.86 : 0.905
    ctx.lineWidth = major ? 2.4 : 1.2
    ctx.beginPath()
    ctx.moveTo(c + Math.cos(angle) * inner * c, c + Math.sin(angle) * inner * c)
    ctx.lineTo(c + Math.cos(angle) * 0.94 * c, c + Math.sin(angle) * 0.94 * c)
    ctx.stroke()
  }
  // Twelve hairline meridians, stopping short of the hub.
  ctx.lineWidth = 1
  for (let line = 0; line < 12; line += 1) {
    const angle = (line / 12) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(c + Math.cos(angle) * 0.16 * c, c + Math.sin(angle) * 0.16 * c)
    ctx.lineTo(c + Math.cos(angle) * 0.7 * c, c + Math.sin(angle) * 0.7 * c)
    ctx.stroke()
  }
}

/**
 * Screen position, in CSS pixels, of a deck's left silhouette as `camera` sees
 * it: where a label in the left margin should point its leader.
 */
export function deckSilhouette(camera: THREE.Camera, deckId: string, width: number, height: number): { x: number; y: number } {
  const side = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).setY(0).normalize()
  const point = new THREE.Vector3(0, placement(deckLayout(), deckId).y, 0)
    .addScaledVector(side, -(RIM_RADIUS + 0.05))
    .project(camera)
  return { x: ((point.x + 1) / 2) * width, y: ((1 - point.y) / 2) * height }
}

// ---- The scene ------------------------------------------------------------------

export class TransformerScene implements SceneModule {
  private readonly palette: ScenePalette
  private partGroups = new Map<string, THREE.Object3D[]>()
  private signal: THREE.Group | null = null
  private head: THREE.Mesh | null = null
  private trail: THREE.InstancedMesh | null = null
  private twin: THREE.Mesh | null = null
  private pulses: Array<{ mesh: THREE.Mesh; segments: number }> = []
  private core: THREE.MeshPhysicalMaterial | null = null
  private sampled: THREE.MeshPhysicalMaterial | null = null
  private queryStar: THREE.Mesh | null = null
  private textures: THREE.Texture[] = []
  private readonly history: THREE.Vector3[] = []
  private time: number

  // Written out rather than as a parameter property: that is TypeScript-only
  // syntax, and Node strips types to load this file in the tests.
  constructor(palette: ScenePalette = FIELD_PALETTE) {
    this.palette = palette
    // Start in phase with the shared clock rather than at the same frame for everyone.
    this.time = (performance.now() / 1000) % JOURNEY_SECONDS
  }

  build(ctx: SceneContext): void {
    const layout = deckLayout()
    // Materials are per assembly, never shared across them: isolation fades
    // one assembly's materials, and a shared steel would fade every deck.
    const m = (): Materials => materials(this.palette)

    for (const deck of DECKS) {
      const at = placement(layout, deck.id)
      const group = new THREE.Group()
      group.name = `assembly:${deck.id}`
      group.position.y = at.y
      this.buildDeck(group, deck, at, m())
      ctx.root.add(group)
      this.partGroups.set(deck.id, [group])
    }

    this.buildBypasses(ctx, m)
    this.buildFrame(ctx, layout, m())
    this.buildSignal(ctx, m())
    this.applyMotion(ctx.motion)
  }

  // ---- decks ----

  private plate(group: THREE.Group, at: DeckPlacement, material: THREE.Material, name: string, face: THREE.Texture | null): void {
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(RIM_RADIUS, RIM_RADIUS, at.plate, 96, 1), material)
    plate.name = name
    group.add(plate)
    if (face) {
      const top = new THREE.Mesh(
        new THREE.CircleGeometry(RIM_RADIUS * 0.985, 96),
        new THREE.MeshBasicMaterial({ map: face, transparent: true, depthWrite: false, toneMapped: false }),
      )
      top.rotation.x = -Math.PI / 2
      top.position.y = at.plate / 2 + 0.0015
      top.name = `${name}:engraving`
      group.add(top)
    }
  }

  private engraved(ink: number, alpha: number, ticks: number): THREE.CanvasTexture | null {
    const texture = engraving(1024, (ctx, size) => drawDial(ctx, size, css(ink, alpha), 'rgb(0 0 0 / 0)', ticks))
    if (texture) this.textures.push(texture)
    return texture
  }

  private hoop(group: THREE.Group, name: string, tube: number, m: Materials, spokes: number, collar: number): void {
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(RIM_RADIUS, tube, 10, 128), m.steel)
    hoop.rotation.x = Math.PI / 2
    hoop.name = `${name}:hoop`
    group.add(hoop)
    for (let spoke = 0; spoke < spokes; spoke += 1) {
      const angle = MERIDIAN_AZIMUTH + (spoke / spokes) * Math.PI * 2
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(tube * 0.45, tube * 0.45, RIM_RADIUS, 6), m.steel)
      rod.rotation.z = Math.PI / 2
      rod.rotation.y = -angle
      rod.position.copy(radial(RIM_RADIUS / 2, angle, 0))
      group.add(rod)
    }
    const hub = new THREE.Mesh(new THREE.TorusGeometry(0.075, collar, 10, 32), m.steel)
    hub.rotation.x = Math.PI / 2
    hub.name = name
    group.add(hub)
  }

  private buildDeck(group: THREE.Group, deck: Deck, at: DeckPlacement, m: Materials): void {
    const top = at.plate / 2
    switch (deck.id) {
      case 'embedding': {
        this.plate(group, at, m.porcelain, 'embedding-plate', this.engraved(this.palette.plate, 0.5, 72))
        // The input sequence: ceramic tiles around the plate; the first one is
        // the token whose journey the signal shows.
        for (let index = 0; index < 8; index += 1) {
          const angle = FRONT + (index / 8) * Math.PI * 2
          const tile = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.06, 0.13, 2, 0.02), index === 0 ? m.porcelain : m.enamel)
          tile.position.copy(radial(0.62, angle, top + 0.03))
          tile.rotation.y = -angle
          tile.name = `token-tile:${index + 1}`
          group.add(tile)
        }
        break
      }
      case 'norm-1':
      case 'norm-2': {
        this.hoop(group, `calibration-ring:${deck.id}`, 0.011, m, 3, 0.012)
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(RIM_RADIUS * 0.86, RIM_RADIUS * 0.995, 128, 1),
          new THREE.MeshBasicMaterial({
            map: this.engraved(this.palette.accent, 0.9, 144),
            color: this.palette.accent,
            transparent: true,
            opacity: 0.55,
            side: THREE.DoubleSide,
            depthWrite: false,
            toneMapped: false,
          }),
        )
        ring.rotation.x = -Math.PI / 2
        ring.name = `calibration-scale:${deck.id}`
        group.add(ring)
        break
      }
      case 'residual-1':
      case 'residual-2':
        this.hoop(group, `junction:${deck.id}`, 0.017, m, 4, 0.022)
        break
      case 'attention':
        this.plate(group, at, m.enamel, 'attention-plate', this.engraved(this.palette.accent, 0.26, 72))
        this.buildDome(group, top, deck.rise - 0.02, m)
        break
      case 'ffn':
        this.plate(group, at, m.enamel, 'ffn-plate', this.engraved(this.palette.accent, 0.26, 72))
        this.buildCore(group, top, m)
        break
      case 'lm-head':
        this.plate(group, at, m.porcelain, 'lm-head-plate', this.engraved(this.palette.plate, 0.5, 72))
        this.buildLogits(group, top, deck.rise, m)
        break
    }
  }

  private buildDome(group: THREE.Group, base: number, height: number, m: Materials): void {
    // Engraved wire of the dome: base circle, two parallels, eight meridians.
    const wire: THREE.Vector3[] = []
    const ring = (elevation: number): void => {
      const steps = 96
      for (let step = 0; step < steps; step += 1) {
        wire.push(domePoint(domeDirection((step / steps) * 360, elevation), base, height))
        wire.push(domePoint(domeDirection(((step + 1) / steps) * 360, elevation), base, height))
      }
    }
    ring(0)
    ring(30)
    ring(60)
    for (let line = 0; line < 8; line += 1) {
      for (let step = 0; step < 24; step += 1) {
        wire.push(domePoint(domeDirection(line * 45, (step / 24) * 90), base, height))
        wire.push(domePoint(domeDirection(line * 45, ((step + 1) / 24) * 90), base, height))
      }
    }
    const dome = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(wire), m.faint)
    dome.name = 'attention-dome'
    group.add(dome)

    const query = domeDirection(QUERY_STAR.azimuth, QUERY_STAR.elevation)
    const star = new THREE.Mesh(new THREE.SphereGeometry(0.042, 20, 12), m.star)
    star.position.copy(domePoint(query, base, height))
    star.name = 'query-star'
    group.add(star)
    this.queryStar = star

    for (const [index, key] of KEY_STARS.entries()) {
      const direction = domeDirection(key.azimuth, key.elevation)
      const keyStar = new THREE.Mesh(new THREE.SphereGeometry(0.018 + key.weight * 0.05, 16, 10), m.star)
      keyStar.position.copy(domePoint(direction, base, height))
      keyStar.name = `key-star:${index + 1}`
      group.add(keyStar)

      const curve = new THREE.CatmullRomCurve3(greatCircle(query, direction, base, height))
      const segments = 48
      const arc = new THREE.Mesh(
        new THREE.TubeGeometry(curve, segments, 0.005 + key.weight * 0.016, 6, false),
        new THREE.MeshBasicMaterial({
          color: this.palette.accent,
          transparent: true,
          opacity: 0.35 + key.weight * 1.4,
          toneMapped: false,
        }),
      )
      arc.name = `attention-arc:${index + 1}`
      group.add(arc)

      // A brighter sleeve that runs along the arc while the token is read.
      const pulse = new THREE.Mesh(
        new THREE.TubeGeometry(curve, segments, 0.008 + key.weight * 0.014, 6, false),
        new THREE.MeshBasicMaterial({ color: this.palette.ink, transparent: true, opacity: 0.9, toneMapped: false }),
      )
      pulse.name = `attention-pulse:${index + 1}`
      pulse.visible = false
      group.add(pulse)
      this.pulses.push({ mesh: pulse, segments })
    }
  }

  private buildCore(group: THREE.Group, base: number, m: Materials): void {
    const coreY = base + 0.16
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.17, 48, 32), m.warm)
    core.position.y = coreY
    core.name = 'compute-core'
    group.add(core)
    this.core = m.warm

    // An armillary cage: two inclined hoops around the core.
    for (const [index, tilt] of [0.6, -0.6].entries()) {
      const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.006, 8, 96), m.steel)
      hoop.position.y = coreY
      hoop.rotation.set(Math.PI / 2 + tilt, 0, tilt * 0.6)
      hoop.name = `core-hoop:${index + 1}`
      group.add(hoop)
    }

    // The expansion: sixteen radial vanes, the hidden width of the FFN.
    for (let vane = 0; vane < 16; vane += 1) {
      const angle = (vane / 16) * Math.PI * 2 + Math.PI / 16
      const height = 0.2 + (vane % 2) * 0.06
      const blade = new THREE.Mesh(new RoundedBoxGeometry(0.46, height, 0.026, 1, 0.008), m.enamel)
      blade.position.copy(radial(0.64, angle, base + height / 2))
      blade.rotation.y = -angle
      blade.name = `compute-vane:${vane + 1}`
      group.add(blade)
    }
  }

  private buildLogits(group: THREE.Group, base: number, rise: number, m: Materials): void {
    // One bar per vocabulary entry shown, heights a fixed softmax-shaped
    // distribution; the tallest is the token the sampler takes.
    const count = 28
    const logits = Array.from({ length: count }, (_, index) => Math.sin(index * 2.399) * 1.6 + Math.cos(index * 0.7) * 0.9)
    const winner = 5
    logits[winner] = 3.4
    // A warm temperature, so the runners-up are visible beside the winner.
    const weights = logits.map((value) => Math.exp(value / 2.2))
    const peak = Math.max(...weights)
    const sampled = m.porcelain.clone()
    sampled.name = 'sampled-logit'
    sampled.emissive = new THREE.Color(this.palette.ink)
    sampled.emissiveIntensity = 0
    this.sampled = sampled
    for (let index = 0; index < count; index += 1) {
      const angle = FRONT + (index / count) * Math.PI * 2 - (winner / count) * Math.PI * 2
      const height = 0.04 + (rise - 0.05) * ((weights[index] ?? 0) / peak)
      const bar = new THREE.Mesh(
        new RoundedBoxGeometry(0.045, height, 0.075, 1, 0.012),
        index === winner ? sampled : m.enamel,
      )
      bar.position.copy(radial(0.8, angle, base + height / 2))
      bar.rotation.y = -angle
      bar.name = index === winner ? 'sampled-logit' : `logit-bank:${index + 1}`
      group.add(bar)
    }
  }

  // ---- bypasses ----

  /**
   * The residual bypasses, as side meridians. A decoder block has exactly two,
   * and each starts at the input of the sub-layer it skips: the block input
   * around norm-1 + attention, and the first add around norm-2 + FFN. There is
   * no third: one existed briefly to match a concept render and taught an
   * architecture that does not exist.
   */
  private buildBypasses(ctx: SceneContext, m: () => Materials): void {
    const path = journey()
    for (const id of ['residual-1', 'residual-2'] as const) {
      const curve = new THREE.CatmullRomCurve3(path.meridians[id], false, 'centripetal')
      // Porcelain, not steel: the residual stream is the one path a reader must
      // be able to follow by eye from either side.
      const route = new THREE.Mesh(new THREE.TubeGeometry(curve, 160, 0.016, 10, false), m().porcelain)
      route.name = `bypass:${id}`
      ctx.root.add(route)
      this.partGroups.get(id)?.push(route)
    }
  }

  // ---- frame ----

  private buildFrame(ctx: SceneContext, layout: Map<string, DeckPlacement>, m: Materials): void {
    const frame = new THREE.Group()
    frame.name = 'assembly:frame'

    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.035, 64), m.steel)
    foot.position.y = FOOT_Y + 0.0175
    foot.name = 'instrument-foot'
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, BASE_Y - FOOT_Y, 24), m.steel)
    stem.position.y = (BASE_Y + FOOT_Y) / 2
    stem.name = 'instrument-stem'

    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(PLINTH_R, PLINTH_R, PLINTH_H, 128), m.enamel)
    plinth.position.y = BASE_Y + PLINTH_H / 2
    plinth.name = 'instrument-plinth'
    const bezel = new THREE.Mesh(new THREE.TorusGeometry(PLINTH_R, 0.018, 10, 160), m.steel)
    bezel.rotation.x = Math.PI / 2
    bezel.position.y = BASE_Y + PLINTH_H
    bezel.name = 'instrument-bezel'
    frame.add(foot, stem, plinth, bezel)
    const face = this.engraved(this.palette.accent, 0.5, 360)
    if (face) {
      const dial = new THREE.Mesh(
        new THREE.CircleGeometry(PLINTH_R * 0.99, 128),
        new THREE.MeshBasicMaterial({ map: face, transparent: true, depthWrite: false, toneMapped: false }),
      )
      dial.rotation.x = -Math.PI / 2
      dial.position.y = BASE_Y + PLINTH_H + 0.0015
      dial.name = 'instrument-dial'
      frame.add(dial)
    }

    const crown = crownY(layout)
    const railBottom = BASE_Y + PLINTH_H
    const railTop = crown
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, railTop - railBottom, 12), m.steel)
    rail.position.set(0, (railTop + railBottom) / 2, 0)
    rail.name = 'central-signal-rail'
    frame.add(rail)

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.022, 12, 64), m.steel)
    ring.rotation.x = Math.PI / 2
    ring.position.y = crown
    ring.name = 'instrument-crown'
    const aperture = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.008, 8, 48), m.porcelain)
    aperture.rotation.x = Math.PI / 2
    aperture.position.y = crown + CROWN_H / 2 - 0.02
    aperture.name = 'crown-aperture'
    const struts = new THREE.Group()
    for (let strut = 0; strut < 3; strut += 1) {
      const angle = (strut / 3) * Math.PI * 2
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.16, 6), m.steel)
      rod.rotation.z = Math.PI / 2
      rod.rotation.y = -angle
      rod.position.copy(radial(0.08, angle, crown))
      struts.add(rod)
    }
    frame.add(ring, aperture, struts)

    // Direction of travel, readable without motion: a porcelain chevron on
    // the axis in every gap, pointing up.
    let chevron = 0
    const ys = DECKS.map((deck) => placement(layout, deck.id))
    for (let index = 0; index < ys.length - 1; index += 1) {
      const below = ys[index] as DeckPlacement
      const above = ys[index + 1] as DeckPlacement
      const gapMid = (below.top + (above.y - above.plate / 2)) / 2
      chevron += 1
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.034, 0.06, 20), m.porcelain)
      cone.position.y = gapMid
      cone.name = `direction-chevron:${chevron}`
      frame.add(cone)
    }

    // The token's whole path as a dashed engraving: from its tile, onto the
    // axis, up through the crown.
    const path = journey()
    const points = [path.start, new THREE.Vector3(0, path.start.y, 0), new THREE.Vector3(0, path.exitY, 0)]
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineDashedMaterial({ color: this.palette.accent, dashSize: 0.05, gapSize: 0.035, transparent: true, opacity: 0.7, toneMapped: false }),
    )
    line.computeLineDistances()
    line.name = '__signal-path'
    frame.add(line)

    ctx.root.add(frame)
    this.partGroups.set('__frame', [frame])
  }

  // ---- the token ----

  private buildSignal(ctx: SceneContext, m: Materials): void {
    const signal = new THREE.Group()
    signal.name = '__signal'
    const headMaterial = new THREE.MeshBasicMaterial({ color: this.palette.ink, transparent: true, toneMapped: false })
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.048, 24, 14), headMaterial)
    head.name = 'signal-head'
    head.renderOrder = 2
    // A fine ring around the head, the way an atlas marks a variable star.
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.1, 0.006, 6, 64),
      new THREE.MeshBasicMaterial({ color: this.palette.accent, transparent: true, opacity: 0.8, toneMapped: false }),
    )
    halo.rotation.x = Math.PI / 2
    head.add(halo)

    const trail = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.03, 10, 6),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, toneMapped: false }),
      TRAIL,
    )
    trail.name = 'signal-trail'
    trail.frustumCulled = false
    const plate = new THREE.Color(this.palette.plate)
    const accent = new THREE.Color(this.palette.accent)
    for (let index = 0; index < TRAIL; index += 1) {
      trail.setColorAt(index, accent.clone().lerp(plate, index / TRAIL))
    }

    const twin = new THREE.Mesh(new THREE.SphereGeometry(0.036, 16, 10), m.star)
    twin.name = 'signal-twin'

    signal.add(head, trail, twin)
    ctx.root.add(signal)
    this.signal = signal
    this.head = head
    this.trail = trail
    this.twin = twin
    this.partGroups.set('__signal', [signal])
    this.place(signalAt(this.time))
  }

  private place(state: SignalState): void {
    if (!this.head || !this.trail || !this.twin) return
    this.head.position.set(state.main.x, state.main.y, state.main.z)
    const material = this.head.material as THREE.MeshBasicMaterial
    material.opacity = state.presence
    this.head.scale.setScalar(0.4 + 0.6 * state.presence)

    // Trail: the last positions, thinning out behind the head.
    this.history.unshift(this.head.position.clone())
    if (this.history.length > TRAIL * 2) this.history.length = TRAIL * 2
    const matrix = new THREE.Matrix4()
    for (let index = 0; index < TRAIL; index += 1) {
      const point = this.history[Math.min(index * 2, this.history.length - 1)] ?? this.head.position
      const scale = (1 - index / TRAIL) * state.presence
      matrix.makeScale(scale, scale, scale).setPosition(point)
      this.trail.setMatrixAt(index, matrix)
    }
    this.trail.instanceMatrix.needsUpdate = true

    this.twin.visible = state.twin !== null
    if (state.twin) this.twin.position.set(state.twin.x, state.twin.y, state.twin.z)

    for (const { mesh, segments } of this.pulses) {
      mesh.visible = state.attention > 0
      if (!mesh.visible) continue
      const geometry = mesh.geometry
      const perSegment = (geometry.index?.count ?? 0) / segments
      const head = Math.floor(smoother(state.attention) * segments)
      const length = 10
      const start = Math.max(0, head - length)
      geometry.setDrawRange(start * perSegment, (Math.min(segments, head) - start) * perSegment)
    }
    if (this.queryStar) this.queryStar.scale.setScalar(1 + 0.5 * Math.sin(Math.PI * state.attention))
    if (this.core) this.core.emissiveIntensity = 0.22 + 0.9 * state.core
    if (this.sampled) this.sampled.emissiveIntensity = 0.85 * state.sample
  }

  /** Rest pose: no token, every mechanism at rest, the path still drawn. */
  private applyMotion(motion: boolean): void {
    if (this.signal) this.signal.visible = motion
    if (motion) return
    for (const { mesh } of this.pulses) mesh.visible = false
    if (this.queryStar) this.queryStar.scale.setScalar(1)
    if (this.core) this.core.emissiveIntensity = 0.22
    if (this.sampled) this.sampled.emissiveIntensity = 0
    this.history.length = 0
  }

  update(ctx: SceneContext, dt: number): boolean {
    if (!this.signal) return false
    // Motion can be paused or reduced at any time, not only at build.
    this.applyMotion(ctx.motion)
    if (!ctx.motion) return false
    this.time = (this.time + dt) % JOURNEY_SECONDS
    this.place(signalAt(this.time))
    return true
  }

  /** Dim everything except the deck(s) a component lives on. */
  isolate(id: string | null): void {
    const targets = id === null ? null : new Set(isolationTargets(id))
    for (const [owner, objects] of this.partGroups) {
      const dim = targets !== null && !targets.has(owner)
      for (const object of objects) object.traverse((part) => {
        const material = (part as THREE.Mesh).material
        if (!material) return
        for (const mat of Array.isArray(material) ? material : [material]) {
          const baseOpacity = (mat.userData.baseOpacity as number | undefined) ?? mat.opacity
          const baseTransparent = (mat.userData.baseTransparent as boolean | undefined) ?? mat.transparent
          mat.userData.baseOpacity = baseOpacity
          mat.userData.baseTransparent = baseTransparent
          mat.transparent = baseTransparent || dim
          mat.opacity = dim ? DIM_OPACITY : baseOpacity
          mat.needsUpdate = true
        }
      })
    }
  }

  dispose(): void {
    for (const texture of this.textures) texture.dispose()
    this.textures = []
    this.partGroups.clear()
    this.pulses = []
    this.signal = null
    this.head = null
    this.trail = null
    this.twin = null
    this.core = null
    this.sampled = null
    this.queryStar = null
    this.history.length = 0
  }
}

const TRAIL = 14
