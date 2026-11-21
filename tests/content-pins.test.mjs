/**
 * A track cites one upstream revision per repository.
 *
 * Tracks 11–13 teach flags and APIs that change between releases, so every
 * lesson in a track links the same pinned tag (llama.cpp b11380, MLX v0.32.3,
 * mlx-lm v0.32.0, mlx-serve v26.10.1, TensorFold v1.2.1). Moving the pin in one
 * lesson and not its neighbours would leave a track teaching two versions at
 * once, with every other gate green.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const LESSONS = 'src/content/lessons'
const REPO_NAMES = 'ggml-org\\/llama\\.cpp|ml-explore\\/mlx-lm|ml-explore\\/mlx|ddalcu\\/mlx-serve|ashhart\\/TensorFold'
const PINNED = new RegExp(`github\\.com\\/(${REPO_NAMES})\\/(?:blob|tree|releases\\/tag)\\/([^/"\\s)]+)`, 'gu')
const BARE_OR_FLOATING = new RegExp(`https?:\\/\\/github\\.com\\/(${REPO_NAMES})(?![\\w.-])(?:\\/(?:blob|tree)\\/(?:main|master|HEAD)\\b|(?!\\/(?:blob|tree|releases\\/tag|discussions|issues|pull)\\/))`, 'gu')

const EXPECTED_PINS = new Map([
  ['ggml-org/llama.cpp', 'b11380'],
  ['ml-explore/mlx', 'v0.32.3'],
  ['ml-explore/mlx-lm', 'v0.32.0'],
  ['ddalcu/mlx-serve', 'v26.10.1'],
  ['ashhart/TensorFold', 'v1.2.1'],
])

const STRICT_PIN_TRACKS = new Set([
  '11-mac-studio-ultra-and-mlx',
  '12-dgx-and-cuda',
  '13-llama-cpp-in-depth',
])

/** Revisions cited per repository in one text. */
function revisionsByRepo(text) {
  const found = new Map()
  for (const [, repo, revision] of text.matchAll(PINNED)) {
    const revisions = found.get(repo) ?? new Set()
    revisions.add(revision)
    found.set(repo, revisions)
  }
  return found
}

/** Bare repository URLs or floating branch refs (main/master/HEAD) in one text. */
function unpinnedRepoUrls(text) {
  return [...text.matchAll(BARE_OR_FLOATING)].map((match) => match[0])
}

/** Track id → all its lesson text, both locales together. */
function trackTexts() {
  const texts = new Map()
  for (const locale of readdirSync(LESSONS)) {
    for (const track of readdirSync(join(LESSONS, locale))) {
      const dir = join(LESSONS, locale, track)
      const body = readdirSync(dir).map((file) => readFileSync(join(dir, file), 'utf8')).join('\n')
      texts.set(track, (texts.get(track) ?? '') + body)
    }
  }
  return texts
}

test('every track cites one revision of each upstream repository', () => {
  const mixed = []
  for (const [track, text] of trackTexts()) {
    for (const [repo, revisions] of revisionsByRepo(text)) {
      if (revisions.size > 1) mixed.push(`${track}: ${repo} at ${[...revisions].join(', ')}`)
    }
  }
  assert.deepEqual(mixed, [])
})

test('tracks 11–13 and Home.astro cite only the expected immutable tags and never bare or floating repo URLs', () => {
  const violations = []
  for (const [track, text] of trackTexts()) {
    if (STRICT_PIN_TRACKS.has(track)) {
      for (const bad of unpinnedRepoUrls(text)) violations.push(`${track}: unpinned URL ${bad}`)
      for (const [repo, revisions] of revisionsByRepo(text)) {
        const expected = EXPECTED_PINS.get(repo)
        for (const rev of revisions) {
          if (rev !== expected) violations.push(`${track}: ${repo} at ${rev} (expected ${expected})`)
        }
      }
    }
    // ashhart/TensorFold is pinned to v1.2.1 in every track where it appears (including track 7).
    const tfRevs = revisionsByRepo(text).get('ashhart/TensorFold')
    if (tfRevs) {
      for (const rev of tfRevs) {
        if (rev !== EXPECTED_PINS.get('ashhart/TensorFold')) violations.push(`${track}: ashhart/TensorFold at ${rev}`)
      }
    }
    for (const bad of unpinnedRepoUrls(text).filter((url) => url.includes('ashhart/TensorFold'))) {
      violations.push(`${track}: unpinned TensorFold URL ${bad}`)
    }
  }

  for (const surface of ['src/components/Home.astro', 'README.md']) {
    const body = readFileSync(surface, 'utf8')
    const tfRevs = revisionsByRepo(body).get('ashhart/TensorFold') ?? new Set()
    if (!tfRevs.has(EXPECTED_PINS.get('ashhart/TensorFold')) || tfRevs.size !== 1) {
      violations.push(`${surface}: expected ashhart/TensorFold@${EXPECTED_PINS.get('ashhart/TensorFold')}, got ${[...tfRevs].join(', ') || 'none'}`)
    }
    for (const bad of unpinnedRepoUrls(body).filter((url) => url.includes('ashhart/TensorFold'))) {
      violations.push(`${surface}: unpinned TensorFold URL ${bad}`)
    }
  }
  assert.deepEqual(violations, [])
})

test('201.4 tok/s 8-stream Qwen3.8-27B benchmark is attributed to 64 GB M5 Pro (--parallel 8), not M5 Ultra', () => {
  const home = readFileSync('src/components/Home.astro', 'utf8')
  assert.match(home, /TENSORFOLD_BENCHMARKS/u, 'Home.astro must read TensorFold benchmark strings from model-facts.ts')
  for (const locale of ['en', 'pt-br']) {
    const l115 = readFileSync(`src/content/lessons/${locale}/11-mac-studio-ultra-and-mlx/11.5-clustering-macs-mlx-distributed.mdx`, 'utf8')
    assert.match(l115, /M5 Pro/u, `${locale} 11.5 must attribute 201.4/201,4 tok/s to M5 Pro`)
    assert.match(l115, /--parallel 8/u, `${locale} 11.5 must name --parallel 8 for 8-stream concurrency`)
    assert.doesNotMatch(l115, /M5 Ultra[^.]*201[.,]4\s*tok\/s/u, `${locale} 11.5 must not attribute 201.4 tok/s to M5 Ultra`)
    const l114 = readFileSync(`src/content/lessons/${locale}/11-mac-studio-ultra-and-mlx/11.4-serving-from-a-mac-mlx-lm-server-and-mlx-serve.mdx`, 'utf8')
    assert.match(l114, /--parallel/u, `${locale} 11.4 must distinguish --parallel from --max-inflight`)
  }
})

test('the pin reader sees a mixed pin and unpinned/floating URLs (control)', () => {
  const text = 'https://github.com/ggml-org/llama.cpp/blob/b11380/tools/server/README.md and https://github.com/ggml-org/llama.cpp/tree/b11381/docs'
  assert.deepEqual([...revisionsByRepo(text).get('ggml-org/llama.cpp')], ['b11380', 'b11381'])
  const unpinned = 'See https://github.com/ashhart/TensorFold and https://github.com/ashhart/TensorFold/blob/main/README.md'
  assert.equal(unpinnedRepoUrls(unpinned).length, 2)
})
