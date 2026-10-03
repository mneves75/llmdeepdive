import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { COMPONENTS } from '../src/lib/explorer-data.ts'
import { FIT_SIZE, STAGE_FLOOR_Y } from '../src/lib/three/envelope.ts'
import { SKY_PERIOD_S } from '../src/lib/three/clock.ts'
import {
  DECKS,
  DIM_OPACITY,
  JOURNEY_SECONDS,
  RIM_RADIUS,
  TransformerScene,
  deckLayout,
  signalAt,
  transformerMarkers,
} from '../src/lib/three/scenes/transformer.ts'

const context = (motion = true) => ({
  root: new THREE.Group(),
  scene: new THREE.Scene(),
  camera: new THREE.PerspectiveCamera(),
  busy() {},
  invalidate() {},
  motion,
})

const built = (motion = true) => {
  const ctx = context(motion)
  const scene = new TransformerScene()
  scene.build(ctx)
  return { ctx, scene }
}

/** Samples one whole token journey (the next one starts at JOURNEY_SECONDS). */
const journey = (steps = 480) =>
  Array.from({ length: steps }, (_, index) => signalAt((index / steps) * JOURNEY_SECONDS))

test('decks run from input to output, bottom to top', () => {
  assert.deepEqual(
    DECKS.map(({ id }) => id),
    ['embedding', 'norm-1', 'attention', 'residual-1', 'norm-2', 'ffn', 'residual-2', 'lm-head'],
  )
  const heights = [...deckLayout().values()].map(({ y }) => y)
  assert.ok(heights.every((y, index) => index === 0 || y > heights[index - 1]))
})

test('every library component has one numbered port, in the order the rail numbers them', () => {
  // The rail prints each component's port number, so the 3D numbering and the
  // library order must be the same list.
  const markers = transformerMarkers()
  assert.deepEqual(markers.map(({ id }) => id), COMPONENTS.map(({ id }) => id))
  assert.equal(new Set(markers.map(({ id }) => id)).size, markers.length)
  for (const marker of markers) {
    const [x, y, z] = marker.position
    // Ports sit on a deck's rim, where the facing test has a horizontal normal.
    assert.ok(Math.abs(Math.hypot(x, z) - RIM_RADIUS) < 0.08, `${marker.id} is not on a rim`)
    assert.ok(y > STAGE_FLOOR_Y)
    assert.ok(marker.label.length > 0 && marker.detail.length > 0)
  }
})

test('the component library follows the token journey through the block', () => {
  assert.deepEqual(COMPONENTS.map(({ id }) => id), [
    'tokenizer', 'embedding', 'positional', 'norm', 'attention', 'kv-cache',
    'residual', 'ffn', 'moe-router', 'quantization', 'lm-head', 'sampler',
  ])
})

test('every deck is an instrumented assembly with its own mechanism', () => {
  const { ctx } = built()
  for (const deck of DECKS) {
    const assembly = ctx.root.getObjectByName(`assembly:${deck.id}`)
    assert.ok(assembly, `missing ${deck.id} assembly`)
    assert.ok(assembly.children.length > 1, `${deck.id} is still a plain plate`)
  }
  for (const name of [
    'assembly:frame', 'instrument-plinth', 'instrument-crown', 'central-signal-rail',
    'token-tile:1', 'attention-dome', 'attention-arc:1', 'query-star', 'compute-core',
    'compute-vane:1', 'logit-bank:1', 'calibration-ring:norm-1', 'calibration-ring:norm-2',
    'junction:residual-1', 'junction:residual-2', 'direction-chevron:1', '__signal-path',
  ]) assert.ok(ctx.root.getObjectByName(name), `missing ${name}`)

  const rail = ctx.root.getObjectByName('central-signal-rail')
  assert.equal(rail.position.x, 0)
  assert.equal(rail.position.z, 0)
})

test('a decoder block has exactly two residual bypasses, each skipping one sub-layer', () => {
  const { ctx } = built()
  // A third bypass existed briefly to match a concept render and taught a
  // false architecture. Each bypass starts at the input of the sub-layer it
  // skips and rejoins at that sub-layer's residual add.
  const bypasses = []
  ctx.root.traverse((part) => { if (part.name.startsWith('bypass:')) bypasses.push(part.name) })
  assert.deepEqual(bypasses.sort(), ['bypass:residual-1', 'bypass:residual-2'])
})

test('the FFN is the one warm core', () => {
  const { ctx } = built()
  let warm = 0
  ctx.root.traverse((part) => { if (part.material?.userData?.warm) warm += 1 })
  assert.equal(warm, 1, 'exactly one warm mesh, the FFN core')
  assert.equal(ctx.root.getObjectByName('compute-core').material.userData.warm, true)
})

test('isolate dims every other piece and maps mechanism aliases to their deck', () => {
  const { ctx, scene } = built()
  const opacity = (name) => {
    let found = null
    ctx.root.getObjectByName(name).traverse((part) => { if (found === null && part.material) found = part.material.opacity })
    return found
  }
  scene.isolate('attention')
  assert.equal(opacity('assembly:attention'), 1)
  assert.equal(opacity('assembly:embedding'), DIM_OPACITY)
  assert.equal(opacity('assembly:frame'), DIM_OPACITY)

  scene.isolate('kv-cache')
  assert.equal(opacity('assembly:attention'), 1)
  assert.equal(opacity('assembly:ffn'), DIM_OPACITY)

  // A mechanism that occurs twice in the block lights both places.
  scene.isolate('residual')
  assert.equal(opacity('assembly:residual-1'), 1)
  assert.equal(opacity('assembly:residual-2'), 1)
  assert.equal(opacity('bypass:residual-1'), 1)
  assert.equal(opacity('assembly:attention'), DIM_OPACITY)

  scene.isolate('norm')
  assert.equal(opacity('assembly:norm-1'), 1)
  assert.equal(opacity('assembly:norm-2'), 1)

  scene.isolate(null)
  assert.equal(opacity('assembly:embedding'), 1)
  assert.equal(opacity('assembly:frame'), 1)
})

test('the built instrument fits the stage envelope and rests above the floor', () => {
  const { ctx } = built()
  // The WHOLE root, including lines and the signal, not just meshes.
  const box = new THREE.Box3().setFromObject(ctx.root)
  const size = box.getSize(new THREE.Vector3())
  assert.ok(
    Math.max(size.x, size.y, size.z) <= FIT_SIZE,
    `instrument is ${Math.max(size.x, size.y, size.z).toFixed(3)} across, over the ${FIT_SIZE} envelope`,
  )
  assert.ok(box.min.y > STAGE_FLOOR_Y, `underside ${box.min.y.toFixed(3)} is at or below the floor ${STAGE_FLOOR_Y}`)
})

test('the travelling signal stays inside the envelope over its whole cycle', () => {
  const { ctx } = built()
  const box = new THREE.Box3().setFromObject(ctx.root)
  const half = FIT_SIZE / 2
  for (const state of journey()) {
    for (const point of [state.main, state.twin].filter(Boolean)) {
      assert.ok(point.y > STAGE_FLOOR_Y, `signal at y=${point.y.toFixed(3)} crosses the floor`)
      assert.ok(Math.abs(point.x) <= half && Math.abs(point.z) <= half, 'signal leaves the envelope sideways')
      assert.ok(box.containsPoint(new THREE.Vector3(point.x, point.y, point.z)), 'signal leaves the instrument')
    }
  }
})

test('the token journey reads bottom to top and passes every deck in order', () => {
  const states = journey()
  const layout = deckLayout()
  // Once the token reaches the axis it only ever rises.
  const onAxis = states.filter((state) => Math.hypot(state.main.x, state.main.z) < 1e-6)
  assert.ok(onAxis.length > states.length / 2)
  for (let index = 1; index < onAxis.length; index += 1) {
    assert.ok(onAxis[index].main.y >= onAxis[index - 1].main.y - 1e-9, 'the token moves downward')
  }
  const visited = []
  for (const state of states) if (state.deck && visited.at(-1) !== state.deck) visited.push(state.deck)
  assert.deepEqual(visited, DECKS.map(({ id }) => id))
  const top = Math.max(...states.map((state) => state.main.y))
  assert.ok(top > (layout.get('lm-head')?.y ?? 0), 'the token never leaves through the output')
})

test('each residual copy rides its own bypass and arrives with the token', () => {
  const states = journey(2400)
  const legs = new Map()
  for (const state of states) {
    if (!state.twin) continue
    const leg = legs.get(state.bypass) ?? []
    leg.push(state)
    legs.set(state.bypass, leg)
  }
  assert.deepEqual([...legs.keys()].sort(), ['residual-1', 'residual-2'])
  const layout = deckLayout()
  for (const [id, leg] of legs) {
    const last = leg.at(-1)
    // The copy and the sub-layer output meet at the add.
    assert.ok(Math.abs(last.twin.y - (layout.get(id)?.y ?? 0)) < 0.05, `${id} copy does not reach its add`)
    assert.ok(Math.abs(last.main.y - (layout.get(id)?.y ?? 0)) < 0.08, `${id} copy arrives without the token`)
  }
})

test('the journey shares the ambient clock', () => {
  // Every ambient loop on the site reads one period (--sky-period in CSS).
  assert.equal(SKY_PERIOD_S, 180)
  assert.ok(Number.isInteger(SKY_PERIOD_S / JOURNEY_SECONDS))
})

test('paused or reduced motion hides the signal and requests no frames', () => {
  const { ctx, scene } = built(false)
  assert.equal(ctx.root.getObjectByName('__signal').visible, false)
  assert.equal(scene.update(ctx, 1), false)
  // The direction of travel is still drawn without motion.
  assert.equal(ctx.root.getObjectByName('__signal-path').visible, true)
})

test('motion toggled while the scene is open shows and hides the signal on the next frame', () => {
  const { ctx, scene } = built(true)
  const signal = ctx.root.getObjectByName('__signal')
  assert.equal(scene.update(ctx, 0.016), true)
  assert.equal(signal.visible, true)
  assert.equal(scene.update({ ...ctx, motion: false }, 0.016), false)
  assert.equal(signal.visible, false)
  assert.equal(scene.update(ctx, 0.016), true)
  assert.equal(signal.visible, true)
})
