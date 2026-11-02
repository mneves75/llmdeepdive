import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { MarkerLayer } from '../src/lib/three/markers.ts'

const SPECS = ['first', 'middle', 'last'].map((id, index) => ({
  id,
  label: id,
  detail: id,
  position: [index, 0, 0],
}))

const withCanvasDocument = (run) => {
  const original = globalThis.document
  globalThis.document = {
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => null,
    }),
  }
  try {
    run()
  } finally {
    if (original === undefined) delete globalThis.document
    else globalThis.document = original
  }
}

test('marker keyboard cycling starts at the nearest end when nothing is selected', () => {
  withCanvasDocument(() => {
    const layer = new MarkerLayer(new THREE.PerspectiveCamera())
    layer.set(SPECS)

    assert.equal(layer.cycle(1)?.id, 'first')
    layer.select(null)
    assert.equal(layer.cycle(-1)?.id, 'last')

    layer.dispose()
  })
})

test('marker keyboard cycling still wraps from either selected end', () => {
  withCanvasDocument(() => {
    const layer = new MarkerLayer(new THREE.PerspectiveCamera())
    layer.set(SPECS)

    layer.select('last')
    assert.equal(layer.cycle(1)?.id, 'first')
    layer.select('first')
    assert.equal(layer.cycle(-1)?.id, 'last')

    layer.dispose()
  })
})

test('a tap is one still pointer: out-and-back drags and pinch fingers never select', async () => {
  const { TapGesture, TAP_SLOP } = await import('../src/lib/tap-gesture.ts')
  const still = new TapGesture()
  still.down(1, 100, 100)
  still.move(1, 100 + TAP_SLOP - 1, 100)
  assert.equal(still.up(1, 101, 100), true, 'a still press is a tap')

  const outAndBack = new TapGesture()
  outAndBack.down(1, 100, 100)
  outAndBack.move(1, 180, 120)
  assert.equal(outAndBack.up(1, 100, 100), false, 'ending where it started is still a drag')

  const pinch = new TapGesture()
  pinch.down(1, 100, 100)
  pinch.down(2, 300, 100)
  pinch.move(1, 60, 100)
  assert.equal(pinch.up(2, 300, 100), false, 'the stationary pinch finger does not select')
  assert.equal(pinch.up(1, 60, 100), false, 'nor does the finger that moved')

  const cancelled = new TapGesture()
  cancelled.down(1, 100, 100)
  cancelled.cancel(1)
  assert.equal(cancelled.up(1, 100, 100), false, 'a cancelled press is not a tap')
})

test('the floating callout never lands on the instrument; without room it docks', async () => {
  const { floatingCalloutLeft } = await import('../src/lib/callout-placement.ts')
  const base = { run: 22, cardWidth: 240, edge: 8, span: { left: 220, right: 420 } }
  const roomy = floatingCalloutLeft({ ...base, outward: 1, elbowX: 380, stageWidth: 1200 })
  assert.ok(roomy !== null && roomy >= base.span.right + base.run, `card starts past the span (${roomy})`)
  // 640px stage: right of the span is 220px, less than the card: dock, not overlap.
  assert.equal(floatingCalloutLeft({ ...base, outward: 1, elbowX: 380, stageWidth: 640 }), null)
  const leftSide = floatingCalloutLeft({ ...base, outward: -1, elbowX: 260, stageWidth: 1200 })
  assert.equal(leftSide, null, 'only 220px left of the span: dock')
  const wideLeft = floatingCalloutLeft({ ...base, span: { left: 520, right: 720 }, outward: -1, elbowX: 560, stageWidth: 1200 })
  assert.ok(wideLeft !== null && wideLeft + base.cardWidth <= 520 - base.run, `card ends before the span (${wideLeft})`)
  // Ideal spot overflows, but pulled back inside it still clears the span: float, do not dock.
  const pulledBack = floatingCalloutLeft({ ...base, outward: 1, elbowX: 442, stageWidth: 700 })
  assert.equal(pulledBack, 700 - 8 - 240, 'clamped inside the stage, 32 px clear of the span')
  const pulledBackLeft = floatingCalloutLeft({ ...base, span: { left: 280, right: 480 }, outward: -1, elbowX: 258, stageWidth: 700 })
  assert.equal(pulledBackLeft, 8, 'mirrored: clamped to the left edge, still clear of the span')
  // A card wider than the stage never floats, whichever side the instrument is on.
  assert.equal(floatingCalloutLeft({ ...base, cardWidth: 720, span: { left: -200, right: -100 }, outward: 1, elbowX: 0, stageWidth: 700 }), null)
  assert.equal(floatingCalloutLeft({ ...base, cardWidth: 720, span: { left: 800, right: 900 }, outward: -1, elbowX: 700, stageWidth: 700 }), null)
})

test('a floating callout position is always inside the stage and clear of the instrument', async () => {
  const { floatingCalloutLeft } = await import('../src/lib/callout-placement.ts')
  // Deterministic pseudo-random sweep (LCG) so a failure reproduces.
  let seed = 7
  const rand = (min, max) => { seed = (seed * 1103515245 + 12345) % 2147483648; return min + (seed / 2147483648) * (max - min) }
  for (let i = 0; i < 5000; i += 1) {
    const stageWidth = rand(200, 1600)
    const a = rand(-400, 2000)
    const span = { left: a, right: a + rand(0, 600) }
    const opts = { outward: rand(0, 1) < 0.5 ? 1 : -1, elbowX: rand(-400, 2000), span, run: 22, cardWidth: rand(80, 800), stageWidth, edge: 8 }
    const left = floatingCalloutLeft(opts)
    if (left === null) continue
    const right = left + opts.cardWidth
    assert.ok(left >= opts.edge - 1e-9 && right <= stageWidth - opts.edge + 1e-9, `inside the stage: ${JSON.stringify(opts)} -> ${left}`)
    assert.ok(opts.outward > 0 ? left >= span.right + opts.run - 1e-9 : right <= span.left - opts.run + 1e-9, `clear of the span: ${JSON.stringify(opts)} -> ${left}`)
  }
})
