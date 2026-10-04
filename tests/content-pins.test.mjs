/**
 * A track cites one upstream revision per repository.
 *
 * Tracks 11–13 teach flags and APIs that change between releases, so every
 * lesson in a track links the same pinned tag (llama.cpp b11380, MLX v0.32.3,
 * mlx-lm v0.32.0, mlx-serve v26.10.1). Moving the pin in one lesson and not
 * its neighbours would leave a track teaching two versions at once, with
 * every other gate green.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const LESSONS = 'src/content/lessons'
const PINNED = /github\.com\/(ggml-org\/llama\.cpp|ml-explore\/mlx-lm|ml-explore\/mlx|ddalcu\/mlx-serve)\/(?:blob|tree)\/([^/"\s)]+)/gu

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

test('the pin reader sees a mixed pin (control)', () => {
  const text = 'https://github.com/ggml-org/llama.cpp/blob/b11380/tools/server/README.md and https://github.com/ggml-org/llama.cpp/tree/b11381/docs'
  assert.deepEqual([...revisionsByRepo(text).get('ggml-org/llama.cpp')], ['b11380', 'b11381'])
})
