import * as THREE from 'three'
import type { SceneContext, SceneModule } from '../stage'
import type { MarkerSpec } from '../markers'

/**
 * A transformer block, generated in-scene.
 *
 * Everything here is boxes, planes and lines, so the whole "model" is a few KB
 * of arithmetic rather than a multi-megabyte GLB download. That is the single
 * biggest departure from the 3D-explorer reference we studied, which needs ~3 MB
 * before a user can rotate anything.
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
  const at = (id: string): [number, number, number] => [
    SLAB_W / 2 + 0.12,
    layout.get(id)?.y ?? 0,
    SLAB_D / 2 + 0.05,
  ]
  return [
    {
      id: 'embedding',
      label: 'Embedding',
      detail: 'Tokens become vectors. Meaning starts as geometry here.',
      position: at('embedding'),
      color: '#8d6bcc',
    },
    {
      id: 'attention',
      label: 'Self-attention',
      detail: 'Every position reads every earlier position. This is the routing layer.',
      position: at('attention'),
      color: '#c4553f',
    },
    {
      id: 'ffn',
      label: 'Feed-forward',
      detail: 'Roughly two-thirds of the parameters. Where most knowledge is stored.',
      position: at('ffn'),
      color: '#c98a2b',
    },
    {
      id: 'residual-1',
      label: 'Residual stream',
      detail: 'The highway each block reads from and writes back into.',
      position: at('residual-1'),
      color: '#769d74',
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

export class TransformerScene implements SceneModule {
  private slabMeshes = new Map<string, THREE.Mesh>()
  private flow: THREE.Points | null = null
  private flowT = 0

  build(ctx: SceneContext): void {
    const layout = slabLayout()

    for (const slab of SLABS) {
      const pos = layout.get(slab.id)
      if (!pos) continue

      const geo = new THREE.BoxGeometry(SLAB_W, slab.height, SLAB_D)
      const mat = new THREE.MeshStandardMaterial({
        color: slab.color,
        roughness: slab.accent ? 0.44 : 0.62,
        metalness: 0.02,
        envMapIntensity: 0.34,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.y = pos.y
      mesh.name = slab.id
      ctx.root.add(mesh)
      this.slabMeshes.set(slab.id, mesh)

      // Hairline edges keep the block legible against a pale background where
      // shaded faces alone would wash out.
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geo),
        new THREE.LineBasicMaterial({ color: 0x2f2a27, transparent: true, opacity: 0.22 }),
      )
      edges.position.copy(mesh.position)
      ctx.root.add(edges)
    }

    this.buildFlow(ctx)
  }

  /** Particles rising through the stack: one token's journey, made visible. */
  private buildFlow(ctx: SceneContext): void {
    const count = 90
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * SLAB_W * 0.8
      positions[i * 3 + 1] = (Math.random() - 0.5) * 4
      positions[i * 3 + 2] = (Math.random() - 0.5) * SLAB_D * 0.8
    }
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
    for (const [slabId, mesh] of this.slabMeshes) {
      const mat = mesh.material as THREE.MeshStandardMaterial
      const dim = id !== null && slabId !== id
      mat.transparent = dim
      mat.opacity = dim ? 0.18 : 1
      mat.needsUpdate = true
    }
  }

  dispose(): void {
    this.slabMeshes.clear()
    this.flow = null
  }
}
