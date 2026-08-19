import { test } from 'node:test'
import assert from 'node:assert/strict'
import { STRUCTURAL_RULES, namesFromEnv, scanText } from '../scripts/private-refs.mjs'

// Every fixture here is synthetic. The real strings this gate was written for
// must not be re-committed to demonstrate that it catches them — that would
// republish the exact thing it exists to remove.

const LEAKS = [
  ['machine-local-path', "  const root = '/Users/exampledev/projects/site'"],
  ['machine-local-path', 'cd /home/builder/checkout && make'],
  ['machine-local-path', 'Config lives in ~/.somelocaltool and is not committed.'],
  ['account-subdomain', "  staging: 'https://site-staging.exampleaccount.workers.dev',"],
  ['unknown-email', 'authenticated as someone.else@example.org while deploying'],
]

for (const [rule, line] of LEAKS) {
  test(`flags ${rule}: ${line.trim().slice(0, 40)}…`, () => {
    const found = scanText(line)
    assert.ok(
      found.some((f) => f.rule === rule),
      `expected ${rule}; got ${JSON.stringify(found.map((f) => f.rule))}`,
    )
  })
}

// A gate that cries wolf on the corpus gets switched off, so the negative cases
// matter as much as the positive ones. These are real lines from the site.
const CLEAN = [
  "export const SITE = 'https://llmdeepdive.com'",
  'Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>',
  'Questions go to contato@mvneves.dev',
  // Relative and repo-internal paths are not machine-local.
  "import { finish } from './content-utils.mjs'",
  'Definitions live in `src/lib/figures/<track>.ts` — one file per track.',
  // A directory name on its own is not an absolute path.
  '.scratch/ and dist/ are ignored.',
  // `/home/` is an ordinary segment in a citation URL — Shannon's entropy paper
  // really is served from one. A path rule that fires here gets switched off.
  'url: "https://people.math.harvard.edu/~ctm/home/text/others/shannon/entropy.pdf"',
]

for (const line of CLEAN) {
  test(`allows: ${line.slice(0, 46)}…`, () => {
    assert.deepEqual(scanText(line), [], `false positive on: ${line}`)
  })
}

test('a real machine path is still caught when a URL sits beside it', () => {
  const line = 'See https://example.com/home/docs — the checkout is /Users/exampledev/site'
  assert.deepEqual(scanText(line).map((f) => f.hit), ['/Users/exampledev'])
})

test('deduplicates repeated hits and reports each distinct one', () => {
  const found = scanText('/Users/exampledev twice: /Users/exampledev and /home/other')
  assert.deepEqual(found.map((f) => f.hit).sort(), ['/Users/exampledev', '/home/other'])
})

test('names come from the environment, never from the repo', () => {
  // The shipped rules describe shapes, not names. If a literal client or
  // project name ever appears in STRUCTURAL_RULES, this repo is publishing the
  // list it is meant to protect.
  assert.equal(namesFromEnv(''), null, 'an empty list must disable the rule, not match everything')
  assert.equal(namesFromEnv(undefined), null)

  const rule = namesFromEnv('acmecorp, Widgets Inc')
  assert.ok(rule, 'a populated list must produce a rule')
  const rules = [...STRUCTURAL_RULES, rule]
  assert.deepEqual(
    scanText('deployed for acmecorp last week', rules).map((f) => f.hit),
    ['acmecorp'],
  )
  assert.deepEqual(scanText('deployed for Widgets Inc', rules).map((f) => f.hit), ['Widgets Inc'])
  // Case-insensitive, and absent from the default rule set.
  assert.deepEqual(scanText('ACMECORP', rules).map((f) => f.hit), ['ACMECORP'])
  assert.deepEqual(scanText('acmecorp'), [])
})

test('regex metacharacters in a name are escaped, not interpreted', () => {
  const rule = namesFromEnv('a.c')
  assert.deepEqual(scanText('a.c', [rule]).map((f) => f.hit), ['a.c'])
  assert.deepEqual(scanText('abc', [rule]), [], '"." must be literal, not a wildcard')
})
