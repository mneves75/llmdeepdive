import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { MarkerLayer } from '../src/lib/three/markers.ts'

const SPECS = ['first', 'middle', 'last'].map((id, index) => ({
  id,
  label: id,
  detail: id,
  position: [index, 0, 0],
  color: '#ffffff',
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
