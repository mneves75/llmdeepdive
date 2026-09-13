import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { readFileSync, readdirSync, statSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { createServer } from 'node:http'
import { join, relative, resolve as resolvePath, sep } from 'node:path'
import { tmpdir } from 'node:os'

function builtRouteMarkers() {
  const markers = new Map()
  const visit = (directory) => {
    for (const entry of readdirSync(directory)) {
      const file = join(directory, entry)
      if (statSync(file).isDirectory()) visit(file)
      else if (entry === 'index.html') {
        const html = readFileSync(file, 'utf8')
        const marker = html.match(/data-page-marker="([^"]+)"/u)?.[1]
        const routeDirectory = relative('dist', file).split(sep).slice(0, -1).join('/')
        if (marker) markers.set(routeDirectory ? `/${routeDirectory}/` : '/', marker)
      }
    }
  }
  visit('dist')
  return markers
}

function runBench(base, { cwd = process.cwd(), budget = '1000000' } = {}) {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [resolvePath('scripts/bench.mjs'), '--base', base, '--iter', '16', '--budget', budget],
      { cwd, stdio: ['ignore', 'pipe', 'pipe'] },
    )
    let stdout = ''
    let stderr = ''
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (chunk) => { stdout += chunk })
    child.stderr.on('data', (chunk) => { stderr += chunk })
    child.on('close', (code) => resolve({ code, stdout, stderr }))
  })
}

test('benchmark rejects a route when any measured response is invalid', async () => {
  const markers = builtRouteMarkers()
  assert.ok(markers.size > 0, 'dist/ has no built route markers; run pnpm build first')
  const counts = new Map()
  const server = createServer((request, response) => {
    const route = new URL(request.url ?? '/', 'http://127.0.0.1').pathname
    const marker = markers.get(route)
    const count = (counts.get(route) ?? 0) + 1
    counts.set(route, count)
    if (!marker) {
      response.writeHead(404).end('missing route')
    } else if (count === 2) {
      response.writeHead(500).end('transient failure')
    } else {
      response.writeHead(200, { 'content-type': 'text/html' }).end(`<main data-page-marker="${marker}"></main>`)
    }
  })

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  try {
    const address = server.address()
    assert.ok(address && typeof address !== 'string')
    const result = await runBench(`http://127.0.0.1:${address.port}`)
    assert.equal(result.code, 1, result.stdout + result.stderr)
    assert.match(result.stdout, /bad-status-samples=1/u)
    assert.match(result.stdout, /marker-missing-samples=1/u)
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve())
    })
  }
})

for (const scenario of [
  { name: 'rejects failed HTTP responses', status: 500, marker: true, exit: 1 },
  { name: 'rejects missing page content', status: 200, marker: false, exit: 1 },
  { name: 'clears a healthy fast confirmation', status: 200, marker: true, exit: 0 },
]) {
  test(`benchmark confirmation ${scenario.name}`, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'llmdeepdive-bench-'))
    mkdirSync(join(directory, 'dist'))
    writeFileSync(join(directory, 'dist/index.html'), '<main data-page-marker="confirmation-fixture"></main>')
    let requests = 0
    const server = createServer((_request, response) => {
      requests += 1
      // One warm-up and 16 slow, valid samples force the real confirmation path.
      const firstPass = requests <= 17
      const reply = () => response.writeHead(firstPass ? 200 : scenario.status, { 'content-type': 'text/html' })
        .end(firstPass || scenario.marker ? '<main data-page-marker="confirmation-fixture"></main>' : '<main>wrong page</main>')
      if (firstPass) setTimeout(reply, 250)
      else reply()
    })
    await new Promise((done) => server.listen(0, '127.0.0.1', done))
    try {
      const address = server.address()
      assert.ok(address && typeof address !== 'string')
      const result = await runBench(`http://127.0.0.1:${address.port}`, { cwd: directory, budget: '200' })
      assert.match(result.stdout, /confirming 1 over-budget route/u, result.stdout + result.stderr)
      assert.equal(requests, 34, 'both passes must include all 16 samples and their warm-up')
      assert.equal(result.code, scenario.exit, result.stdout + result.stderr)
      assert.match(result.stdout, scenario.exit === 0 ? /CLEARED/u : /CONFIRMED/u)
      const report = JSON.parse(readFileSync(join(directory, 'bench-results/latest.json'), 'utf8'))
      assert.equal(report.rows[0].ok, scenario.exit === 0)
    } finally {
      await new Promise((done, reject) => server.close((error) => error ? reject(error) : done()))
      rmSync(directory, { recursive: true, force: true })
    }
  })
}
