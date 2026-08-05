import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import type { SceneContext, SceneModule } from '../stage'
import type { MarkerSpec } from '../markers'

/**
 * A transformer block, generated in-scene.
 *
 * Everything here is procedural geometry, so the whole instrument is a few KB
 * of arithmetic rather than a multi-megabyte GLB download.
 *
 * Slab layout, bottom to top, matching data flow through a decoder block.
 */

export interface Slab {
  id: string
  label: string
  height: number
  color: number
  /** Emphasised slabs read as the "working" parts of the block. */
  accent?: boolean
}

export const SLABS: readonly Slab[] = [
  { id: 'embedding', label: 'Token + positional embedding', height: 0.18, color: 0x344553 },
  { id: 'norm-1', label: 'RMSNorm', height: 0.08, color: 0x223644 },
  { id: 'attention', label: 'Multi-head self-attention', height: 0.18, color: 0x173846, accent: true },
  { id: 'residual-1', label: 'Residual add', height: 0.08, color: 0x29404b },
  { id: 'norm-2', label: 'RMSNorm', height: 0.08, color: 0x223644 },
  { id: 'ffn', label: 'Feed-forward network', height: 0.18, color: 0x1e3039, accent: true },
  { id: 'residual-2', label: 'Residual add', height: 0.08, color: 0x29404b },
  { id: 'lm-head', label: 'LM head + sampler', height: 0.16, color: 0x173d48 },
]

const SLAB_W = 1.9
const SLAB_D = 1.7
const FRAME_W = 2.4
const FRAME_D = 2.1
/**
 * Deck separation. Sized so the whole assembly — plinth underside to spine cap —
 * fits `FIT_SIZE`, which is what the stage's fixed camera, fog and floor plane
 * at y = -2.1 are tuned for. A previous revision used 0.5 to match a concept
 * render's proportions and sank the plinth half a unit through the floor.
 */
const GAP = 0.255
const DARK = 0x081927
const SIGNAL = 0x5de7ee
const AMBER = 0xe6a83d
const CERAMIC = 0xd9d5ca
const ISOLATE_TARGET: Readonly<Record<string, string>> = {
  tokenizer: 'embedding',
  positional: 'embedding',
  norm: 'norm-2',
  residual: 'residual-1',
  'kv-cache': 'attention',
  'moe-router': 'ffn',
  quantization: 'ffn',
  sampler: 'lm-head',
}

/** Y centre of each slab, so markers and camera focus agree with the geometry. */
export function slabLayout(): Map<string, { y: number; height: number }> {
  const total = SLABS.reduce((s, x) => s + x.height, 0) + GAP * (SLABS.length - 1)
  let cursor = -total / 2
  const out = new Map<string, { y: number; height: number }>()
  for (const slab of SLABS) {
    out.set(slab.id, { y: cursor + slab.height / 2, height: slab.height })
    cursor += slab.height + GAP
  }
  return out
}

export function transformerMarkers(): MarkerSpec[] {
  const layout = slabLayout()
  const at = (id: string, side = 1, z = SLAB_D / 2 + 0.05): [number, number, number] => [
    side * (SLAB_W / 2 + 0.12),
    layout.get(id)?.y ?? 0,
    z,
  ]
  return [
    {
      id: 'tokenizer',
      label: 'Tokenizer',
      detail: 'Text is split into the discrete units that enter the model.',
      position: at('embedding', -1, 0.28),
      color: '#5de7ee',
    },
    {
      id: 'embedding',
      label: 'Embedding',
      detail: 'Tokens become vectors. Meaning starts as geometry here.',
      position: at('embedding'),
      color: '#d9d5ca',
    },
    {
      id: 'positional',
      label: 'Position',
      detail: 'Sequence order is encoded before attention routes information.',
      position: at('embedding', 1, 0.08),
      color: '#5de7ee',
    },
    {
      id: 'attention',
      label: 'Self-attention',
      detail: 'Every position reads every earlier position. This is the routing layer.',
      position: at('attention'),
      color: '#5de7ee',
    },
    {
      id: 'kv-cache',
      label: 'KV cache',
      detail: 'Past keys and values are retained beside the attention mechanism.',
      position: at('attention', -1),
      color: '#5de7ee',
    },
    {
      id: 'ffn',
      label: 'Feed-forward',
      detail: 'Roughly two-thirds of the parameters. Where most knowledge is stored.',
      position: at('ffn'),
      color: '#e6a83d',
    },
    {
      id: 'moe-router',
      label: 'MoE router',
      detail: 'A sparse gate selects which feed-forward experts process each token.',
      position: at('ffn', -1),
      color: '#e6a83d',
    },
    {
      id: 'quantization',
      label: 'Quantisation',
      detail: 'Reduced-precision weights compress every learned mechanism.',
      position: at('ffn', 1, 0.14),
      color: '#d9d5ca',
    },
    {
      id: 'norm',
      label: 'Normalisation',
      detail: 'RMSNorm keeps activation scale stable through the stack.',
      position: at('norm-2', -1),
      color: '#d9d5ca',
    },
    {
      id: 'residual',
      label: 'Residual stream',
      detail: 'The highway each block reads from and writes back into.',
      position: at('residual-1'),
      color: '#5de7ee',
    },
    {
      id: 'sampler',
      label: 'Sampler',
      detail: 'A decoding policy chooses one token from the output distribution.',
      position: at('lm-head', -1),
      color: '#5de7ee',
    },
    {
      id: 'lm-head',
      label: 'LM head',
      detail: 'Back to vocabulary space, then a sampler picks the next token.',
      position: at('lm-head'),
      color: '#5de7ee',
    },
  ]
}

/**
 * Half-height of the rising particle column.
 *
 * The particles are scene geometry like anything else, so they obey the stage
 * envelope too: at ±2.2 the column crossed the floor plane, and a bounding box
 * that skipped it — `THREE.Points` is not a `Mesh` — reported the scene as
 * fitting when it did not.
 */
export const FLOW_SPAN = 1.7

/** Stable particle placement keeps screenshots and reduced-motion fallbacks reproducible. */
export function tokenFlowPositions(count = 90): Float32Array {
  const positions = new Float32Array(count * 3)
  const rows = Math.ceil(count / 6)
  for (let i = 0; i < count; i += 1) {
    const lane = i % 6
    const progress = Math.floor(i / 6) / Math.max(1, rows - 1)
    const angle = (lane / 6) * Math.PI * 2 + progress * 1.35
    positions[i * 3] = Math.sin(angle) * (0.45 + (lane % 2) * 0.3)
    positions[i * 3 + 1] = -FLOW_SPAN + progress * FLOW_SPAN * 2
    positions[i * 3 + 2] = Math.cos(angle) * (0.28 + (lane % 3) * 0.1)
  }
  return positions
}

export class TransformerScene implements SceneModule {
  private partGroups = new Map<string, THREE.Object3D[]>()
  private flow: THREE.Points | null = null
  private flowT = 0

  build(ctx: SceneContext): void {
    const layout = slabLayout()

    for (const slab of SLABS) {
      const pos = layout.get(slab.id)
      if (!pos) continue

      const group = new THREE.Group()
      group.name = `assembly:${slab.id}`
      group.position.y = pos.y
      const geo = new RoundedBoxGeometry(SLAB_W, slab.height, SLAB_D, 2, 0.055)
      const mat = new THREE.MeshPhysicalMaterial({
        color: slab.color,
        roughness: slab.accent ? 0.2 : 0.27,
        metalness: 0.14,
        clearcoat: 0.72,
        clearcoatRoughness: 0.18,
        transmission: 0.16,
        thickness: 0.22,
        ior: 1.35,
        envMapIntensity: 0.68,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.name = slab.id
      group.add(mesh)

      const socketMaterial = new THREE.MeshStandardMaterial({ color: DARK, roughness: 0.3, metalness: 0.58 })
      const corners = [
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ] as const
      for (const [index, [xSide, zSide]] of corners.entries()) {
        const socket = new THREE.Mesh(
          new RoundedBoxGeometry(0.14, slab.height + 0.08, 0.14, 1, 0.018),
          socketMaterial,
        )
        socket.name = `deck-socket:${slab.id}:${index + 1}`
        socket.position.set(xSide * (SLAB_W / 2 + 0.055), 0, zSide * (SLAB_D / 2 + 0.055))
        group.add(socket)
      }

      // A dark undercut makes every layer read as a machined instrument deck.
      const undercut = new THREE.Mesh(
        new RoundedBoxGeometry(SLAB_W + 0.035, 0.035, SLAB_D + 0.035, 2, 0.012),
        new THREE.MeshStandardMaterial({ color: DARK, roughness: 0.36, metalness: 0.5 }),
      )
      undercut.position.y = -slab.height / 2 - 0.012
      group.add(undercut)

      this.addMechanism(group, slab)
      ctx.root.add(group)
      this.partGroups.set(slab.id, [group])
    }

    this.buildResidualRoutes(ctx, layout)
    this.buildFrame(ctx, layout)
    this.buildFlow(ctx)
  }

  private addMechanism(group: THREE.Group, slab: Slab): void {
    const top = slab.height / 2 + 0.026
    const dark = new THREE.MeshStandardMaterial({ color: DARK, roughness: 0.3, metalness: 0.48 })
    const mechanismColor = slab.id === 'ffn' ? AMBER : slab.id === 'embedding' ? CERAMIC : SIGNAL
    const glow = new THREE.MeshStandardMaterial({
      color: mechanismColor,
      emissive: mechanismColor,
      emissiveIntensity: slab.id === 'embedding' ? 0.02 : 0.38,
      roughness: 0.28,
      metalness: 0.18,
    })

    if (slab.accent) {
      const trace = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-0.78, top + 0.008, -0.52),
          new THREE.Vector3(0.48, top + 0.008, -0.52),
          new THREE.Vector3(0.78, top + 0.008, -0.2),
          new THREE.Vector3(0.78, top + 0.008, 0.52),
          new THREE.Vector3(-0.48, top + 0.008, 0.52),
          new THREE.Vector3(-0.78, top + 0.008, 0.2),
        ]),
        new THREE.LineBasicMaterial({ color: SIGNAL, transparent: true, opacity: 0.82 }),
      )
      trace.name = `circuit:${slab.id}`
      group.add(trace)
    }

    if (slab.id === 'attention') {
      for (let i = 0; i < 8; i += 1) {
        const x = -0.68 + (i % 4) * 0.45
        const z = i < 4 ? -0.27 : 0.27
        const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 16), dark)
        socket.position.set(x, top + 0.025, z)
        const core = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.28, 8), dark)
        core.position.set(x, top + 0.17, z)
        core.name = `attention-head:${i + 1}`
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.018, 6, 18), glow)
        ring.rotation.x = Math.PI / 2
        ring.position.set(x, top + 0.055, z)
        group.add(socket, core, ring)
      }
    } else if (slab.id === 'ffn') {
      for (let i = 0; i < 9; i += 1) {
        const height = i === 4 ? 0.3 : 0.22
        const fin = new THREE.Mesh(
          new THREE.BoxGeometry(i === 4 ? 0.16 : 0.1, height, i === 4 ? 1.12 : 1.02),
          i === 4 ? glow : dark,
        )
        fin.position.set(-0.72 + i * 0.18, top + height / 2, 0)
        fin.name = i === 4 ? 'compute-core' : `compute-bank:${i + 1}`
        group.add(fin)
      }
    } else if (slab.id === 'embedding') {
      for (let i = 0; i < 12; i += 1) {
        const tile = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.08, 0.22, 1, 0.018), i % 4 ? glow : dark)
        tile.position.set(-0.78 + (i % 4) * 0.52, top + 0.04, i < 4 ? -0.39 : i < 8 ? 0 : 0.39)
        tile.name = `token-tile:${i + 1}`
        group.add(tile)
      }
    } else if (slab.id.startsWith('norm-')) {
      for (const z of [-0.31, 0, 0.31]) {
        const rail = new THREE.Mesh(new RoundedBoxGeometry(1.55, 0.035, 0.07, 1, 0.012), dark)
        rail.position.set(0, top, z)
        group.add(rail)
      }
    } else if (slab.id.startsWith('residual-')) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.035, 8, 24), glow)
      ring.rotation.x = Math.PI / 2
      ring.position.y = top
      ring.name = `junction:${slab.id}`
      const bridge = new THREE.Mesh(new RoundedBoxGeometry(1.42, 0.04, 0.08, 1, 0.015), dark)
      bridge.position.y = top
      group.add(ring, bridge)
    } else if (slab.id === 'lm-head') {
      const ceramic = new THREE.MeshStandardMaterial({ color: CERAMIC, roughness: 0.45, metalness: 0 })
      for (let i = 0; i < 7; i += 1) {
        const height = 0.12 + i * 0.035
        const bar = new THREE.Mesh(new RoundedBoxGeometry(0.14, height, 0.22, 1, 0.025), ceramic)
        bar.position.set(-0.69 + i * 0.23, top + height / 2, 0)
        bar.name = `logit-bank:${i + 1}`
        group.add(bar)
      }
    }
  }

  /**
   * External bypasses make residual addition legible instead of another coloured plate.
   *
   * A decoder block has exactly two of them, and each starts at the *input* of
   * the sub-layer it skips: the block input around norm-1+attention, and the
   * first residual output around norm-2+FFN. There is no third bypass — an
   * earlier revision added one to match a concept render's silhouette, which
   * would have taught a transformer architecture that does not exist.
   */
  private buildResidualRoutes(ctx: SceneContext, layout: Map<string, { y: number; height: number }>): void {
    const pairs = [
      ['embedding', 'residual-1'],
      ['residual-1', 'residual-2'],
    ] as const
    for (const [index, [from, to]] of pairs.entries()) {
      const y0 = layout.get(from)?.y ?? 0
      const y1 = layout.get(to)?.y ?? 0
      const x = FRAME_W / 2 + 0.14 + index * 0.12
      const z = FRAME_D / 2 + 0.08
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(SLAB_W / 2 - 0.05, y0, z),
        new THREE.Vector3(x, y0 + 0.08, z),
        new THREE.Vector3(x, y1 - 0.08, z),
        new THREE.Vector3(SLAB_W / 2 - 0.05, y1, z),
      ])
      const route = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 24, 0.018, 6, false),
        new THREE.MeshStandardMaterial({ color: SIGNAL, emissive: SIGNAL, emissiveIntensity: 0.5, metalness: 0.2 }),
      )
      route.name = `route:${to}`
      ctx.root.add(route)
      this.partGroups.get(to)?.push(route)
    }
  }

  private buildFrame(ctx: SceneContext, layout: Map<string, { y: number; height: number }>): void {
    const bottom = (layout.get('embedding')?.y ?? 0) - (layout.get('embedding')?.height ?? 0) / 2
    const top = (layout.get('lm-head')?.y ?? 0) + (layout.get('lm-head')?.height ?? 0) / 2
    const frameTop = top + 0.5
    const frame = new THREE.Group()
    frame.name = 'assembly:frame'
    const material = new THREE.MeshStandardMaterial({ color: 0x183649, roughness: 0.3, metalness: 0.68 })
    for (const x of [-FRAME_W / 2, FRAME_W / 2]) {
      for (const z of [-FRAME_D / 2, FRAME_D / 2]) {
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, frameTop - bottom, 8), material)
        rod.position.set(x, (frameTop + bottom) / 2, z)
        frame.add(rod)

        for (const y of [bottom + 0.02, frameTop - 0.08]) {
          const collar = new THREE.Mesh(new RoundedBoxGeometry(0.17, 0.15, 0.17, 1, 0.025), material)
          collar.position.set(x, y, z)
          collar.name = `post-collar:${x > 0 ? 'right' : 'left'}:${z > 0 ? 'front' : 'rear'}:${y > 0 ? 'top' : 'bottom'}`
          frame.add(collar)
        }
      }
    }
    const spine = new THREE.Mesh(
      new RoundedBoxGeometry(0.24, frameTop - bottom + 0.24, 0.38, 2, 0.035),
      material,
    )
    spine.name = 'graphite-spine'
    spine.position.set(FRAME_W / 2 + 0.12, (frameTop + bottom) / 2, -FRAME_D / 2 + 0.04)
    frame.add(spine)
    const plinth = new THREE.Mesh(
      new RoundedBoxGeometry(FRAME_W + 0.34, 0.28, FRAME_D + 0.34, 3, 0.055),
      new THREE.MeshStandardMaterial({ color: DARK, roughness: 0.24, metalness: 0.72 }),
    )
    plinth.name = 'instrument-plinth'
    plinth.position.y = bottom - 0.19
    const plinthUpper = new THREE.Mesh(
      new RoundedBoxGeometry(FRAME_W + 0.16, 0.12, FRAME_D + 0.16, 2, 0.04),
      material,
    )
    plinthUpper.name = 'instrument-plinth-upper'
    plinthUpper.position.y = bottom - 0.02
    const plinthInset = new THREE.Mesh(
      new RoundedBoxGeometry(FRAME_W - 0.14, 0.08, FRAME_D - 0.14, 2, 0.03),
      new THREE.MeshStandardMaterial({ color: 0x0d2a35, roughness: 0.24, metalness: 0.5 }),
    )
    plinthInset.name = 'instrument-plinth-inset'
    plinthInset.position.y = bottom + 0.055
    const cap = new THREE.Mesh(
      new RoundedBoxGeometry(FRAME_W + 0.18, 0.16, FRAME_D + 0.18, 3, 0.035),
      material,
    )
    cap.name = 'instrument-cap'
    cap.position.y = top + 0.42
    frame.add(plinth, plinthUpper, plinthInset, cap)
    ctx.root.add(frame)
    this.partGroups.set('__frame', [frame])

    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, frameTop - bottom - 0.08, 8),
      new THREE.MeshStandardMaterial({ color: SIGNAL, emissive: SIGNAL, emissiveIntensity: 0.5 }),
    )
    shaft.name = 'central-signal-rail'
    shaft.position.set(0, (frameTop + bottom) / 2 - 0.04, 0)
    frame.add(shaft)
    for (const [id, { y }] of layout) {
      const node = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.08, 0.08),
        new THREE.MeshStandardMaterial({ color: SIGNAL, emissive: SIGNAL, emissiveIntensity: 0.65 }),
      )
      node.name = `signal-node:${id}`
      node.position.set(0, y, 0)
      frame.add(node)
    }

  }

  /** Particles rising through the stack: one token's journey, made visible. */
  private buildFlow(ctx: SceneContext): void {
    const count = 90
    const positions = tokenFlowPositions(count)
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const mat = new THREE.PointsMaterial({
      color: SIGNAL,
      size: 0.035,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    })
    this.flow = new THREE.Points(geo, mat)
    this.flow.name = '__flow'
    ctx.root.add(this.flow)
    this.partGroups.set('__flow', [this.flow])
    if (ctx.reducedMotion && this.flow) this.flow.visible = false
  }

  update(ctx: SceneContext, dt: number): boolean {
    if (!this.flow || ctx.reducedMotion) return false
    this.flowT += dt
    const attr = this.flow.geometry.getAttribute('position') as THREE.BufferAttribute
    const arr = attr.array as Float32Array
    for (let i = 0; i < arr.length; i += 3) {
      const y = (arr[i + 1] ?? 0) + dt * 0.55
      arr[i + 1] = y > FLOW_SPAN ? -FLOW_SPAN : y
    }
    attr.needsUpdate = true
    return true
  }

  /** Dim everything except one slab. */
  isolate(id: string | null): void {
    const target = id === null ? null : ISOLATE_TARGET[id] ?? id
    for (const [owner, objects] of this.partGroups) {
      const dim = target !== null && owner !== target
      for (const object of objects) object.traverse((part) => {
        const material = (part as THREE.Mesh).material
        if (!material) return
        for (const mat of Array.isArray(material) ? material : [material]) {
          const baseOpacity = (mat.userData.baseOpacity as number | undefined) ?? mat.opacity
          const baseTransparent = (mat.userData.baseTransparent as boolean | undefined) ?? mat.transparent
          mat.userData.baseOpacity = baseOpacity
          mat.userData.baseTransparent = baseTransparent
          mat.transparent = baseTransparent || dim
          mat.opacity = baseOpacity * (dim ? 0.12 : 1)
          mat.needsUpdate = true
        }
      })
    }
  }

  dispose(): void {
    this.partGroups.clear()
    this.flow = null
    this.flowT = 0
  }
}
