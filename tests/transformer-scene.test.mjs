import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { COMPONENTS } from '../src/lib/explorer-data.ts'
import { FIT_SIZE, STAGE_FLOOR_Y } from '../src/lib/three/envelope.ts'
import {
  FLOW_SPAN,
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
  assert.ok(Math.abs(Math.min(...y) + FLOW_SPAN) < 1e-6)
  assert.ok(Math.abs(Math.max(...y) - FLOW_SPAN) < 1e-6)
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
  assert.ok(ctx.root.getObjectByName('graphite-spine'))
  assert.ok(ctx.root.getObjectByName('instrument-plinth'))
  assert.ok(ctx.root.getObjectByName('instrument-plinth-upper'))
  assert.ok(ctx.root.getObjectByName('instrument-plinth-inset'))
  assert.ok(ctx.root.getObjectByName('instrument-cap'))
  assert.ok(ctx.root.getObjectByName('token-tile:1'))
  assert.ok(ctx.root.getObjectByName('attention-head:1'))
  assert.ok(ctx.root.getObjectByName('compute-core'))
  assert.ok(ctx.root.getObjectByName('logit-bank:1'))
  assert.ok(ctx.root.getObjectByName('circuit:attention'))
  assert.ok(ctx.root.getObjectByName('circuit:ffn'))
  assert.ok(ctx.root.getObjectByName('route:residual-1'))
  assert.ok(ctx.root.getObjectByName('route:residual-2'))
  // A decoder block has exactly two residual bypasses. A third one existed
  // briefly to match a concept render and taught a false architecture.
  assert.deepEqual(
    ctx.root.children.filter(({ name }) => name.startsWith('route:')).map(({ name }) => name),
    ['route:residual-1', 'route:residual-2'],
  )
  assert.ok(ctx.root.getObjectByName('deck-socket:attention:1'))
  const signalRail = ctx.root.getObjectByName('central-signal-rail')
  assert.equal(signalRail.position.x, 0)
  assert.equal(signalRail.position.z, 0)

  let amberCores = 0
  ctx.root.traverse((part) => {
    if (part.material?.color?.getHex() === 0xe6a83d) amberCores += 1
  })
  assert.equal(amberCores, 1, 'the FFN should have one visual compute core')

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

test('the built instrument fits the stage envelope and rests above the floor', () => {
  const ctx = context()
  new TransformerScene().build(ctx)

  // The WHOLE root, not just the meshes: `__flow` is a THREE.Points, and an
  // isMesh filter reported this scene as fitting while its particle column
  // crossed the floor plane.
  const box = new THREE.Box3().setFromObject(ctx.root)
  const size = box.getSize(new THREE.Vector3())

  // Nothing auto-frames the model: the camera, fog and floor are fixed. A scene
  // that outgrows FIT_SIZE clips the canvas and buries its own base — which is
  // exactly what a 0.5 deck gap did, invisibly, in a review harness with no floor.
  assert.ok(
    Math.max(size.x, size.y, size.z) <= FIT_SIZE,
    `instrument is ${Math.max(size.x, size.y, size.z).toFixed(3)} across, over the ${FIT_SIZE} envelope`,
  )
  assert.ok(
    box.min.y > STAGE_FLOOR_Y,
    `instrument underside ${box.min.y.toFixed(3)} is at or below the floor plane ${STAGE_FLOOR_Y}`,
  )
})

test('reduced motion keeps deterministic particles but hides their animation layer', () => {
  const ctx = context(true)
  const scene = new TransformerScene()
  scene.build(ctx)
  assert.equal(ctx.root.getObjectByName('__flow').visible, false)
  assert.equal(scene.update(ctx, 1), false)
})
