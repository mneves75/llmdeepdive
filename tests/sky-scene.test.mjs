/**
 * The 3D curriculum sky lifts the server-rendered chart onto a sphere.
 *
 * What must hold, and why:
 *  - frame one IS the poster: every chart point projects to the pixel where the
 *    SVG (viewBox, xMidYMid meet) draws it, so the cross-fade cannot pop;
 *  - after the lift every point lies on the sphere;
 *  - the whole chart plate stays inside the frame and facing the viewer over
 *    the entire sway, at maximum pointer parallax — labels are positioned in
 *    percent of the figure, and one pushed outside it widens the page;
 *  - the sway runs on the site's one ambient clock;
 *  - the boot module that ships on the home page never reaches three.js.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import * as THREE from 'three'
import { SKY_PERIOD_S } from '../src/lib/three/clock.ts'
import {
  PARALLAX_LIMIT,
  SPHERE_RADIUS,
  frameCamera,
  liftedPoint,
  skyRotation,
  swayAt,
} from '../src/lib/three/scenes/sky.ts'

const FRAME = { width: 1000, height: 560 }

const project = (camera, point, width, height) => {
  const p = point.clone().project(camera)
  return { x: ((p.x + 1) / 2) * width, y: ((1 - p.y) / 2) * height, z: p.z }
}

const grid = (step = 50) => {
  const points = []
  for (let x = 0; x <= FRAME.width; x += step) for (let y = 0; y <= FRAME.height; y += step) points.push([x, y])
  points.push([FRAME.width, FRAME.height])
  return points
}

test('frame one draws every chart point exactly where the poster does', () => {
  // A figure at the chart's own ratio, and one letterboxed by `meet`.
  for (const [width, height] of [[1000, 560], [640, 358.4], [1200, 560], [600, 600]]) {
    const camera = new THREE.PerspectiveCamera()
    frameCamera(camera, FRAME, width, height, 0)
    const scale = Math.min(width / FRAME.width, height / FRAME.height)
    const offsetX = (width - FRAME.width * scale) / 2
    const offsetY = (height - FRAME.height * scale) / 2
    for (const [x, y] of grid()) {
      const screen = project(camera, liftedPoint(FRAME, x, y, 0), width, height)
      assert.ok(Math.abs(screen.x - (offsetX + x * scale)) < 0.01, `x of (${x}, ${y}) at ${width}x${height}`)
      assert.ok(Math.abs(screen.y - (offsetY + y * scale)) < 0.01, `y of (${x}, ${y}) at ${width}x${height}`)
    }
  }
})

test('the lift ends with every point on the sphere and starts on the chart plane', () => {
  for (const [x, y] of grid()) {
    assert.ok(Math.abs(liftedPoint(FRAME, x, y, 1).length() - SPHERE_RADIUS) < 1e-9)
    assert.ok(Math.abs(liftedPoint(FRAME, x, y, 0).z - SPHERE_RADIUS) < 1e-9)
  }
})

test('the lifted plate stays in frame and faces the viewer over the whole sway', () => {
  const [width, height] = [1000, 560]
  const camera = new THREE.PerspectiveCamera()
  frameCamera(camera, FRAME, width, height, 1)
  const toCamera = new THREE.Vector3()
  const corners = [[-1, -1], [-1, 1], [1, -1], [1, 1], [0, 0]]
  for (let step = 0; step <= 360; step += 1) {
    const sway = swayAt((step / 360) * SKY_PERIOD_S)
    for (const [px, py] of corners) {
      const rotation = skyRotation(sway, { x: px * PARALLAX_LIMIT, y: py * PARALLAX_LIMIT }, 1)
      for (const [x, y] of grid(100)) {
        const point = liftedPoint(FRAME, x, y, 1).applyQuaternion(rotation)
        const screen = project(camera, point, width, height)
        assert.ok(screen.x >= 0 && screen.x <= width, `(${x}, ${y}) leaves the frame sideways (${screen.x.toFixed(1)})`)
        assert.ok(screen.y >= 0 && screen.y <= height, `(${x}, ${y}) leaves the frame vertically (${screen.y.toFixed(1)})`)
        toCamera.copy(camera.position).sub(point).normalize()
        assert.ok(point.clone().normalize().dot(toCamera) > 0.2, `(${x}, ${y}) turns away from the viewer`)
      }
    }
  }
})

test('nothing turns while the chart is still flat', () => {
  const rotation = skyRotation(swayAt(37), { x: PARALLAX_LIMIT, y: -PARALLAX_LIMIT }, 0)
  assert.ok(Math.abs(rotation.w - 1) < 1e-12)
})

test('the sway runs on the shared ambient clock', () => {
  const css = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8')
  const period = /--sky-period:\s*([\d.]+)s/u.exec(css)?.[1]
  assert.equal(Number(period), SKY_PERIOD_S, '--sky-period and SKY_PERIOD_S disagree')
  for (const t of [0, 13.7, 91, 179.5]) {
    const now = swayAt(t)
    const later = swayAt(t + SKY_PERIOD_S)
    assert.ok(Math.abs(now.yaw - later.yaw) < 1e-12 && Math.abs(now.pitch - later.pitch) < 1e-12)
  }
})

test('the boot module never statically imports three.js', () => {
  // Only `import(...)` may reach the scene; a static edge would put three.js
  // on the home page's critical path.
  const seen = new Set()
  const visit = (file) => {
    if (seen.has(file)) return
    seen.add(file)
    const source = readFileSync(file, 'utf8')
    for (const match of source.matchAll(/^\s*import\s+(?!type\b)(?:[^'"]*?\sfrom\s+)?['"]([^'"]+)['"]/gmu)) {
      const specifier = match[1]
      assert.ok(!/^three(\/|$)/u.test(specifier), `${file} statically imports ${specifier}`)
      assert.ok(!/scenes\/|\/stage$|\/markers$/u.test(specifier), `${file} statically imports ${specifier}`)
      if (!specifier.startsWith('.') && !specifier.startsWith('~/')) continue
      const base = specifier.startsWith('~/')
        ? resolve('src', specifier.slice(2))
        : resolve(dirname(file), specifier)
      const target = [base, `${base}.ts`, `${base}/index.ts`].find((candidate) => existsSync(candidate) && candidate.endsWith('.ts'))
      if (target) visit(target)
    }
  }
  visit(resolve('src/lib/sky-client.ts'))
  assert.ok(seen.size >= 2, 'the walk did not follow any import')
})
