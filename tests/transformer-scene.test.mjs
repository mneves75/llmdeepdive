import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { COMPONENTS } from '../src/lib/explorer-data.ts'
import {
  SLABS,
  TransformerScene,
  slabLayout,
  tokenFlowPositions,
  transformerMarkers,
} from '../src/lib/three/scenes/transformer.ts'

const context = (reducedMotion = false) => ({
  root: new THREE.Group(),
  scene: new THREE.Scene(),
  camera: new THREE.PerspectiveCamera(),
  busy() {},
  invalidate() {},
  reducedMotion,
})

test('slab and marker order remains stable from input to sampler', () => {
  assert.deepEqual(
    SLABS.map(({ id }) => id),
    ['embedding', 'norm-1', 'attention', 'residual-1', 'norm-2', 'ffn', 'residual-2', 'lm-head'],
  )
  assert.deepEqual(
    transformerMarkers().map(({ id }) => id).sort(),
    COMPONENTS.map(({ id }) => id).sort(),
  )
  const heights = [...slabLayout().values()].map(({ y }) => y)
  assert.ok(heights.every((y, index) => index === 0 || y > heights[index - 1]))
})

test('token flow is deterministic, bounded, and spans the full instrument', () => {
  const first = tokenFlowPositions()
  const second = tokenFlowPositions()
  assert.deepEqual(first, second)
  assert.equal(first.length, 270)
  const y = [...first].filter((_, index) => index % 3 === 1)
  assert.ok(Math.abs(Math.min(...y) + 2.2) < 1e-6)
  assert.ok(Math.abs(Math.max(...y) - 2.2) < 1e-6)
})

test('every slab is an instrumented assembly and isolate dims every other model piece', () => {
  const ctx = context()
  const scene = new TransformerScene()
  scene.build(ctx)

  for (const slab of SLABS) {
    const assembly = ctx.root.getObjectByName(`assembly:${slab.id}`)
    assert.ok(assembly, `missing ${slab.id} assembly`)
    assert.ok(assembly.children.length > 1, `${slab.id} is still a plain slab`)
  }
  assert.ok(ctx.root.getObjectByName('assembly:frame'))
  assert.ok(ctx.root.getObjectByName('route:residual-1'))
  assert.ok(ctx.root.getObjectByName('route:residual-2'))

  scene.isolate('attention')
  const opacity = (name) => {
    const material = ctx.root.getObjectByName(name).children.find((child) => child.material)?.material
    return material.opacity
  }
  assert.equal(opacity('assembly:attention'), 1)
  assert.equal(opacity('assembly:embedding'), 0.12)
  const frameMaterial = ctx.root.getObjectByName('assembly:frame').children[0].material
  assert.equal(frameMaterial.opacity, 0.12)

  scene.isolate('kv-cache')
  assert.equal(opacity('assembly:attention'), 1)
  assert.equal(opacity('assembly:embedding'), 0.12)

  scene.isolate(null)
  assert.equal(opacity('assembly:embedding'), 1)
  assert.equal(frameMaterial.opacity, 1)
})

test('reduced motion keeps deterministic particles but hides their animation layer', () => {
  const ctx = context(true)
  const scene = new TransformerScene()
  scene.build(ctx)
  assert.equal(ctx.root.getObjectByName('__flow').visible, false)
  assert.equal(scene.update(ctx, 1), false)
})
