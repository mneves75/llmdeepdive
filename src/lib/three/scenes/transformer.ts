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
  { id: 'embedding', label: 'Token + positional embedding', height: 0.34, color: 0x8d6bcc },
  { id: 'norm-1', label: 'RMSNorm', height: 0.16, color: 0x9aa3b2 },
  { id: 'attention', label: 'Multi-head self-attention', height: 0.72, color: 0xc4553f, accent: true },
  { id: 'residual-1', label: 'Residual add', height: 0.14, color: 0x769d74 },
  { id: 'norm-2', label: 'RMSNorm', height: 0.16, color: 0x9aa3b2 },
  { id: 'ffn', label: 'Feed-forward network', height: 0.66, color: 0xc98a2b, accent: true },
  { id: 'residual-2', label: 'Residual add', height: 0.14, color: 0x769d74 },
  { id: 'lm-head', label: 'LM head + sampler', height: 0.3, color: 0x2f8a8a },
]

const SLAB_W = 2.6
const SLAB_D = 1.5
const GAP = 0.11
const DARK = 0x081927
const SIGNAL = 0x5de7ee
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
      color: '#2f8a8a',
    },
    {
      id: 'embedding',
      label: 'Embedding',
      detail: 'Tokens become vectors. Meaning starts as geometry here.',
      position: at('embedding'),
      color: '#8d6bcc',
    },
    {
      id: 'positional',
      label: 'Position',
      detail: 'Sequence order is encoded before attention routes information.',
      position: at('embedding', 1, 0.08),
      color: '#c98a2b',
    },
    {
      id: 'attention',
      label: 'Self-attention',
      detail: 'Every position reads every earlier position. This is the routing layer.',
      position: at('attention'),
      color: '#c4553f',
    },
    {
      id: 'kv-cache',
      label: 'KV cache',
      detail: 'Past keys and values are retained beside the attention mechanism.',
      position: at('attention', -1),
      color: '#2f8a8a',
    },
    {
      id: 'ffn',
      label: 'Feed-forward',
      detail: 'Roughly two-thirds of the parameters. Where most knowledge is stored.',
      position: at('ffn'),
      color: '#c98a2b',
    },
    {
      id: 'moe-router',
      label: 'MoE router',
      detail: 'A sparse gate selects which feed-forward experts process each token.',
      position: at('ffn', -1),
      color: '#c98a2b',
    },
    {
      id: 'quantization',
      label: 'Quantisation',
      detail: 'Reduced-precision weights compress every learned mechanism.',
      position: at('ffn', 1, 0.14),
      color: '#9aa3b2',
    },
    {
      id: 'norm',
      label: 'Normalisation',
      detail: 'RMSNorm keeps activation scale stable through the stack.',
      position: at('norm-2', -1),
      color: '#9aa3b2',
    },
    {
      id: 'residual',
      label: 'Residual stream',
      detail: 'The highway each block reads from and writes back into.',
      position: at('residual-1'),
      color: '#769d74',
    },
    {
      id: 'sampler',
      label: 'Sampler',
      detail: 'A decoding policy chooses one token from the output distribution.',
      position: at('lm-head', -1),
      color: '#2f8a8a',
    },
    {
      id: 'lm-head',
      label: 'LM head',
      detail: 'Back to vocabulary space, then a sampler picks the next token.',
      position: at('lm-head'),
      color: '#2f8a8a',
    },
  ]
}

/** Stable particle placement keeps screenshots and reduced-motion fallbacks reproducible. */
export function tokenFlowPositions(count = 90): Float32Array {
  const positions = new Float32Array(count * 3)
  const rows = Math.ceil(count / 6)
  for (let i = 0; i < count; i += 1) {
    const lane = i % 6
    const progress = Math.floor(i / 6) / Math.max(1, rows - 1)
    const angle = (lane / 6) * Math.PI * 2 + progress * 1.35
    positions[i * 3] = Math.sin(angle) * (0.45 + (lane % 2) * 0.3)
    positions[i * 3 + 1] = -2.2 + progress * 4.4
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
      const mat = new THREE.MeshStandardMaterial({
        color: slab.color,
        roughness: slab.accent ? 0.32 : 0.5,
        metalness: slab.accent ? 0.2 : 0.1,
        envMapIntensity: 0.54,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.name = slab.id
      group.add(mesh)

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
    const glow = new THREE.MeshStandardMaterial({
      color: slab.color,
      emissive: slab.color,
      emissiveIntensity: 0.24,
      roughness: 0.28,
      metalness: 0.18,
    })

    if (slab.id === 'attention') {
      for (let i = 0; i < 8; i += 1) {
        const x = -0.9 + (i % 4) * 0.6
        const z = i < 4 ? -0.27 : 0.27
        const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 16), dark)
        socket.position.set(x, top, z)
        const core = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.06, 16), glow)
        core.position.set(x, top + 0.012, z)
        group.add(socket, core)
      }
    } else if (slab.id === 'ffn') {
      for (let i = 0; i < 9; i += 1) {
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.075, 1.02), i % 2 ? dark : glow)
        fin.position.set(-0.92 + i * 0.23, top, 0)
        group.add(fin)
      }
    } else if (slab.id === 'embedding') {
      for (let i = 0; i < 12; i += 1) {
        const tile = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.045, 0.22, 1, 0.018), i % 3 ? dark : glow)
        tile.position.set(-0.78 + (i % 4) * 0.52, top, i < 4 ? -0.39 : i < 8 ? 0 : 0.39)
        group.add(tile)
      }
    } else if (slab.id.startsWith('norm-')) {
      for (const z of [-0.31, 0, 0.31]) {
        const rail = new THREE.Mesh(new RoundedBoxGeometry(2.15, 0.035, 0.07, 1, 0.012), dark)
        rail.position.set(0, top, z)
        group.add(rail)
      }
    } else if (slab.id.startsWith('residual-')) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.035, 8, 24), glow)
      ring.rotation.x = Math.PI / 2
      ring.position.y = top
      const bridge = new THREE.Mesh(new RoundedBoxGeometry(1.42, 0.04, 0.08, 1, 0.015), dark)
      bridge.position.y = top
      group.add(ring, bridge)
    } else if (slab.id === 'lm-head') {
      for (let i = 0; i < 7; i += 1) {
        const bar = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.05, 0.35 + i * 0.11, 1, 0.025), i === 3 ? glow : dark)
        bar.position.set(-0.69 + i * 0.23, top, 0)
        group.add(bar)
      }
    }
  }

  /** External bypasses make residual addition legible instead of another coloured plate. */
  private buildResidualRoutes(ctx: SceneContext, layout: Map<string, { y: number; height: number }>): void {
    const pairs = [
      ['norm-1', 'residual-1'],
      ['norm-2', 'residual-2'],
    ] as const
    for (const [from, to] of pairs) {
      const y0 = layout.get(from)?.y ?? 0
      const y1 = layout.get(to)?.y ?? 0
      const x = -SLAB_W / 2 - 0.22
      const z = SLAB_D / 2 + 0.1
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-SLAB_W / 2 + 0.08, y0, z),
        new THREE.Vector3(x, y0 + 0.08, z),
        new THREE.Vector3(x, y1 - 0.08, z),
        new THREE.Vector3(-SLAB_W / 2 + 0.08, y1, z),
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
    const frame = new THREE.Group()
    frame.name = 'assembly:frame'
    const material = new THREE.MeshStandardMaterial({ color: 0x183649, roughness: 0.3, metalness: 0.68 })
    for (const x of [-SLAB_W / 2 - 0.16, SLAB_W / 2 + 0.16]) {
      for (const z of [-SLAB_D / 2 - 0.12, SLAB_D / 2 + 0.12]) {
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, top - bottom + 0.2, 8), material)
        rod.position.set(x, (top + bottom) / 2, z)
        frame.add(rod)
      }
    }
    ctx.root.add(frame)
    this.partGroups.set('__frame', [frame])

    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, top - bottom + 0.15, 8),
      new THREE.MeshStandardMaterial({ color: SIGNAL, emissive: SIGNAL, emissiveIntensity: 0.5 }),
    )
    shaft.position.set(-SLAB_W / 2 - 0.32, (top + bottom) / 2, SLAB_D / 2 + 0.28)
    const arrow = new THREE.Mesh(
      new THREE.ConeGeometry(0.075, 0.18, 10),
      new THREE.MeshStandardMaterial({ color: SIGNAL, emissive: SIGNAL, emissiveIntensity: 0.5 }),
    )
    arrow.position.set(shaft.position.x, top + 0.15, shaft.position.z)
    frame.add(shaft, arrow)

  }

  /** Particles rising through the stack: one token's journey, made visible. */
  private buildFlow(ctx: SceneContext): void {
    const count = 90
    const positions = tokenFlowPositions(count)
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const mat = new THREE.PointsMaterial({
      color: 0xfff3dd,
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
      arr[i + 1] = y > 2.2 ? -2.2 : y
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
