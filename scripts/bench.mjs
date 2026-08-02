#!/usr/bin/env node
/**
 * Page-load benchmark with a hard p95 gate.
 *
 * This harness exists because benchmarks in this codebase have lied before, in
 * four specific ways. Each countermeasure below maps to one of them:
 *
 *  1. A "p95" column that was really max-of-5, because ITER was 6.
 *     → --iter is floored at MIN_ITER and the percentile is computed properly.
 *  2. A content marker that matched a global footer / framework payload, so a
 *     page serving only a skeleton passed.
 *     → Each route asserts its OWN marker, read from the built HTML, and
 *       duplicate markers across routes are a hard error.
 *  3. Measuring loadEventEnd instead of content.
 *     → We measure server TTFB and assert the body actually contains the marker.
 *  4. ±5% drift between identical builds on a loaded machine read as a win.
 *     → loadavg is recorded with every run and printed in the report.
 *
 * A gate that has never been seen red is not a gate. `--self-test` proves this
 * one can fail, by injecting an impossible budget against real measurements.
 */
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { loadavg } from 'node:os'
import { connect } from 'node:net'

const MIN_ITER = 16
const DEFAULT_ITER = 20
const DEFAULT_BUDGET_MS = 50
const DIST = 'dist'

const TARGETS = {
  production: 'https://llmdeepdive.com',
  staging: 'https://llmdeepdive-staging.mvneves.workers.dev',
  local: 'http://127.0.0.1:8787',
}

function parseArgs(argv) {
  const args = { iter: DEFAULT_ITER, target: 'staging', budget: DEFAULT_BUDGET_MS, selfTest: false, base: null }
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i]
    if (a === '--iter') args.iter = Number(argv[++i])
    else if (a === '--target') args.target = argv[++i]
    else if (a === '--budget') args.budget = Number(argv[++i])
    else if (a === '--base') args.base = argv[++i]
    else if (a === '--self-test') args.selfTest = true
    else if (a === '--all-routes') { /* default; accepted for explicitness */ }
    else if (a.startsWith('--')) throw new Error(`Unknown flag: ${a}`)
  }
  if (!Number.isFinite(args.iter)) throw new Error('--iter must be a number')
  if (args.iter < MIN_ITER) {
    console.error(
      `--iter ${args.iter} is below the ${MIN_ITER} floor. Below this a "p95" is` +
        ` just the maximum of a tiny sample and means nothing. Raising to ${MIN_ITER}.`,
    )
    args.iter = MIN_ITER
  }
  return args
}

/** Walk dist/ for built pages, pairing each route with the marker it declares. */
function discoverRoutes(dist) {
  const routes = []
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      if (statSync(full).isDirectory()) walk(full)
      else if (entry === 'index.html') {
        const html = readFileSync(full, 'utf8')
        const m = html.match(/data-page-marker="([^"]+)"/)
        const rel = relative(dist, full).split(sep).slice(0, -1).join('/')
        const route = rel ? `/${rel}/` : '/'
        routes.push({ route, marker: m ? m[1] : null })
      }
    }
  }
  walk(dist)
  return routes.sort((a, b) => a.route.localeCompare(b.route))
}

/**
 * Pure network round-trip to host:443, measured as a bare TCP handshake — no
 * TLS, no request, no server work. This is the floor no optimisation can move.
 *
 * It matters because the operator runs this from Brazil and the honest total
 * includes ~40ms of physics. Reporting only the total would understate the
 * site; gating on only the total would make the gate unpassable regardless of
 * how fast the site is. So we report both and gate on the part we control.
 */
async function measureRtt(host, samples = 12) {
  const times = []
  for (let i = 0; i < samples; i += 1) {
    const t = await new Promise((resolve) => {
      const started = performance.now()
      const sock = connect({ host, port: 443 }, () => {
        const ms = performance.now() - started
        sock.destroy()
        resolve(ms)
      })
      sock.on('error', () => resolve(NaN))
      sock.setTimeout(5000, () => {
        sock.destroy()
        resolve(NaN)
      })
    })
    if (Number.isFinite(t)) times.push(t)
  }
  if (times.length === 0) return 0
  times.sort((a, b) => a - b)
  // Median, not min: the minimum flatters the site by crediting it with a
  // lucky packet.
  return times[Math.floor(times.length / 2)]
}

function percentile(sorted, p) {
  if (sorted.length === 0) return NaN
  // Nearest-rank on a sorted ascending sample.
  const rank = Math.ceil((p / 100) * sorted.length)
  return sorted[Math.min(Math.max(rank, 1), sorted.length) - 1]
}

async function timeOnce(url) {
  const started = performance.now()
  const res = await fetch(url, { redirect: 'follow', headers: { 'accept-encoding': 'gzip, br' } })
  const body = await res.text()
  return { ms: performance.now() - started, status: res.status, body }
}

async function measure(url, iter) {
  const samples = []
  let status = 0
  let body = ''
  // One untimed warm-up so TLS/connection setup is not charged to sample 1.
  try {
    await timeOnce(url)
  } catch {
    /* surfaced by the real run below */
  }
  for (let i = 0; i < iter; i += 1) {
    const r = await timeOnce(url)
    samples.push(r.ms)
    status = r.status
    body = r.body
  }
  samples.sort((a, b) => a - b)
  return {
    n: samples.length,
    p50: percentile(samples, 50),
    p95: percentile(samples, 95),
    min: samples[0],
    max: samples[samples.length - 1],
    status,
    body,
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const base = args.base ?? TARGETS[args.target]
  if (!base) throw new Error(`Unknown --target ${args.target}. Use one of: ${Object.keys(TARGETS).join(', ')}`)

  const budget = args.selfTest ? 0.000001 : args.budget

  const routes = discoverRoutes(DIST)
  if (routes.length === 0) throw new Error(`No built pages under ${DIST}/. Run the build first.`)

  // Guard 2: a marker shared between routes cannot prove a page rendered.
  const missing = routes.filter((r) => !r.marker)
  const seen = new Map()
  const dupes = []
  for (const r of routes) {
    if (!r.marker) continue
    if (seen.has(r.marker)) dupes.push([seen.get(r.marker), r.route, r.marker])
    else seen.set(r.marker, r.route)
  }

  const load = loadavg()
  const host = new URL(base).hostname
  const rtt = base.startsWith('https://') ? await measureRtt(host) : 0

  console.log(`bench · target=${base} · iter=${args.iter} · budget=${budget}ms (server)`)
  console.log(`routes=${routes.length} · loadavg=${load.map((n) => n.toFixed(2)).join(' ')}`)
  console.log(
    `network RTT to ${host}: ${rtt.toFixed(1)}ms (bare TCP handshake, median of 12) — ` +
      `subtracted from totals to isolate server time`,
  )
  if (args.selfTest) console.log('SELF-TEST: budget forced impossibly low; this run MUST fail.')
  console.log('')

  if (missing.length) {
    console.error(`FAIL — ${missing.length} route(s) built without a data-page-marker:`)
    for (const r of missing) console.error(`  ${r.route}`)
    process.exit(1)
  }
  if (dupes.length) {
    console.error(`FAIL — duplicate page markers (a shared marker cannot prove a page rendered):`)
    for (const [a, b, m] of dupes) console.error(`  "${m}" used by ${a} and ${b}`)
    process.exit(1)
  }

  const rows = []
  let failures = 0

  for (const { route, marker } of routes) {
    const url = new URL(route, base).href
    let r
    try {
      r = await measure(url, args.iter)
    } catch (err) {
      console.error(`FAIL ${route} — request error: ${err.message}`)
      failures += 1
      continue
    }

    // Server time = observed total minus the physics. Clamped at 0 so a lucky
    // sample faster than the median RTT cannot report a negative duration.
    const serverP50 = Math.max(0, r.p50 - rtt)
    const serverP95 = Math.max(0, r.p95 - rtt)

    const okStatus = r.status === 200
    const okMarker = r.body.includes(marker)
    const okBudget = serverP95 < budget
    const ok = okStatus && okMarker && okBudget
    if (!ok) failures += 1

    rows.push({ route, marker, ...r, rtt, serverP50, serverP95, ok, okStatus, okMarker, okBudget })
    const reason = [
      okStatus ? '' : `status=${r.status}`,
      okMarker ? '' : 'marker-missing',
      okBudget ? '' : `server p95=${serverP95.toFixed(1)}ms>budget`,
    ]
      .filter(Boolean)
      .join(' ')

    console.log(
      `${ok ? 'PASS' : 'FAIL'}  ${route.padEnd(34)} n=${r.n} ` +
        `server p50=${serverP50.toFixed(1).padStart(5)}ms p95=${serverP95.toFixed(1).padStart(5)}ms  ` +
        `(wire p50=${r.p50.toFixed(1)} p95=${r.p95.toFixed(1)}) ${reason}`,
    )
  }

  const worstServer = Math.max(...rows.map((r) => r.serverP95), 0)
  const worstWire = Math.max(...rows.map((r) => r.p95), 0)
  console.log('')
  console.log(
    `summary · ${rows.length - failures}/${rows.length} routes with server p95 < ${budget}ms · ` +
      `worst server p95=${worstServer.toFixed(1)}ms · worst wire p95=${worstWire.toFixed(1)}ms · ` +
      `RTT=${rtt.toFixed(1)}ms · loadavg=${load.map((n) => n.toFixed(2)).join(' ')}`,
  )
  console.log(
    'reading this: "server" is what the site controls; "wire" is what this machine saw,\n' +
      'including network RTT to the edge. A visitor near a Cloudflare PoP sees close to\n' +
      'the server number; one in Brazil on this link adds the RTT. Neither is the "real"\n' +
      'number on its own — the gate is on server, the wire figure is printed so nobody\n' +
      'can mistake one for the other.',
  )
  console.log('note: run-to-run drift on a loaded machine is ~5%; treat smaller deltas as noise.')

  mkdirSync('bench-results', { recursive: true })
  writeFileSync(
    join('bench-results', 'latest.json'),
    JSON.stringify({ base, iter: args.iter, budget, loadavg: load, rows: rows.map(({ body, ...r }) => r) }, null, 2),
  )

  if (args.selfTest) {
    if (failures === rows.length && rows.length > 0) {
      console.log('\nSELF-TEST PASSED: every route failed against an impossible budget, so the gate can go red.')
      process.exit(0)
    }
    console.error('\nSELF-TEST FAILED: the gate did not fail when it should have. Do not trust it.')
    process.exit(1)
  }

  process.exit(failures > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
