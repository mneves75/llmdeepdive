/**
 * A lesson that quotes the examples project must quote it exactly. A code
 * block whose first line is `# file: examples/…` (or `// file: …`) claims to
 * be that file's code; if the file changes and the lesson does not, the
 * lesson teaches code that no test runs.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

function run(block) {
  const root = mkdtempSync(join(tmpdir(), 'llmdeepdive-excerpts-'))
  mkdirSync(join(root, 'examples/agent-engineering/src'), { recursive: true })
  writeFileSync(join(root, 'examples/agent-engineering/src/demo.py'), 'def add(a, b):\n    """Sum."""\n    return a + b\n\n\ndef sub(a, b):\n    return a - b\n')
  const lessons = join(root, 'src/content/lessons/en/14-track')
  mkdirSync(lessons, { recursive: true })
  writeFileSync(join(lessons, '14.1-test.mdx'), `---\nid: "14.1-test"\n---\nText.\n\n${block}\n`)
  const result = spawnSync(process.execPath, [resolve('scripts/content-excerpts.mjs')], {
    cwd: process.cwd(),
    env: { ...process.env, LLMDEEPDIVE_CONTENT_ROOT: join(root, 'src/content'), LLMDEEPDIVE_REPO_ROOT: root },
    encoding: 'utf8',
  })
  rmSync(root, { recursive: true, force: true })
  return result
}

test('an exact contiguous excerpt passes', () => {
  const result = run('```python\n# file: examples/agent-engineering/src/demo.py\ndef add(a, b):\n    """Sum."""\n    return a + b\n```')
  assert.equal(result.status, 0, result.stderr)
})

test('an excerpt that drifted from its file fails', () => {
  const result = run('```python\n# file: examples/agent-engineering/src/demo.py\ndef add(a, b):\n    return a + b + 1\n```')
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /14\.1-test\.mdx: excerpt of examples\/agent-engineering\/src\/demo\.py does not match the file/u)
})

test('an excerpt naming a missing file or a path outside the project fails', () => {
  assert.match(run('```python\n# file: examples/agent-engineering/src/gone.py\nx = 1\n```').stderr, /does not exist/u)
  assert.match(run('```python\n# file: examples/agent-engineering/../../package.json\nx = 1\n```').stderr, /outside examples\/agent-engineering/u)
})

test('blocks without a file header are not checked', () => {
  assert.equal(run('```python\nprint("illustration")\n```').status, 0)
})
