/**
 * A lesson's `updated` date must not be older than its last content change.
 *
 * The date is shown on the page and published three more times — the
 * sitemap's `<lastmod>`, the Article's `dateModified` and `article:modified_time`.
 * Google uses lastmod only while it stays "consistently and verifiably
 * accurate". v0.6.2 rewrote summaries, quiz answers and model answers in 211
 * lessons and left every one reading "updated 2026-08-20"; nothing noticed
 * until the dates were about to be broadcast.
 *
 * History is the witness: for each lesson file, the newest commit that changed
 * any line other than `updated:` sets the floor. A commit that only moves the
 * date is ignored, so bumping it never trips this. Needs full Git history
 * (CI checks out with fetch-depth 0).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readLessons, displayPath, stringField } from '../scripts/content-utils.mjs'

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })

/**
 * `-p` alone prints no diff for a merge commit, so an edit made while resolving
 * a conflict would be invisible; `--diff-merges=remerge` shows exactly what the
 * resolution changed against Git's own automatic merge.
 */
const historyLog = (cwd, path) =>
  execFileSync('git', ['log', '--format=%x00%cs', '-p', '--unified=0', '--no-color', '--no-renames', '--diff-merges=remerge', '--', path], {
    cwd,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  })

/** Newest date on which each path had a change other than its `updated:` line, from `git log -p`. */
function parseLog(log) {
  const newest = new Map()
  for (const commit of log.split('\0').slice(1)) {
    const [date, ...rest] = commit.split('\n')
    for (const fileDiff of rest.join('\n').split(/^diff --git /mu).slice(1)) {
      const path = fileDiff.match(/^a\/\S+ b\/(\S+)/u)?.[1]
      if (!path || newest.has(path)) continue // log is newest-first
      // A resolution's conflict markers are not content; the lines around them are.
      const changed = fileDiff.split('\n').filter((line) => /^[-+](?![-+]{2} )(?![<=>]{7})/u.test(line))
      if (changed.some((line) => !/^[-+]updated:/u.test(line))) newest.set(path, date)
    }
  }
  return newest
}

function lastContentChange() {
  assert.equal(git('rev-parse', '--is-shallow-repository').trim(), 'false', 'content dates need full Git history (fetch-depth: 0)')
  return parseLog(historyLog(process.cwd(), 'src/content/lessons'))
}

test('every lesson is dated no earlier than its last content change', () => {
  const changes = lastContentChange()
  const stale = []
  let checked = 0
  for (const lesson of readLessons()) {
    const path = displayPath(lesson.file)
    const changed = changes.get(path)
    if (!changed) continue // not committed yet; CI checks it after the commit
    checked += 1
    const updated = stringField(lesson.frontmatter, 'updated', lesson.file)
    if (!updated || updated < changed) stale.push(`${path}: updated ${updated}, content changed ${changed}`)
  }
  assert.ok(checked >= 200, `expected the committed corpus, checked ${checked} lesson(s)`)
  assert.deepEqual(stale, [], `${stale.length} lesson(s) carry a date older than their content:\n${stale.slice(0, 10).join('\n')}`)
})

test('the history reader dates content changes and ignores date-only commits', () => {
  const diff = (path, lines) => `diff --git a/${path} b/${path}\nindex 1..2 100644\n--- a/${path}\n+++ b/${path}\n@@ -1 +1 @@\n${lines.join('\n')}\n`
  const log = [
    '', // git's output starts with the first record separator
    `2026-09-25\n\n${diff('a.mdx', ['-updated: "2026-08-20"', '+updated: "2026-09-25"'])}`,
    `2026-09-13\n\n${diff('a.mdx', ['-summary: "old"', '+summary: "new"'])}${diff('b.mdx', ['-updated: "2026-08-01"', '+updated: "2026-08-02"'])}`,
    `2026-08-19\n\n${diff('b.mdx', ['+id: "b"', '+updated: "2026-08-01"'])}`,
  ].join('\0')
  const newest = parseLog(log)
  assert.equal(newest.get('a.mdx'), '2026-09-13', 'a date-only commit must not count as a content change')
  assert.equal(newest.get('b.mdx'), '2026-08-19', 'the newest commit with a content line sets the floor')
})

test('an edit made while resolving a merge conflict counts as a content change', () => {
  const repo = mkdtempSync(join(tmpdir(), 'ldd-dates-'))
  try {
    const run = (date, ...args) =>
      execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=', '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null', ...args], {
        cwd: repo,
        encoding: 'utf8',
        stdio: 'pipe',
        env: { ...process.env, GIT_AUTHOR_DATE: `${date}T12:00:00Z`, GIT_COMMITTER_DATE: `${date}T12:00:00Z` },
      })
    const write = (updated, summary) => writeFileSync(join(repo, 'lesson.mdx'), `updated: "${updated}"\nsummary: "${summary}"\n`)
    run('2026-01-01', 'init', '-q', '-b', 'main')
    write('2026-01-01', 'base')
    run('2026-01-01', 'add', '.')
    run('2026-01-01', 'commit', '-q', '-m', 'base')
    run('2026-01-02', 'checkout', '-q', '-b', 'side')
    write('2026-01-02', 'side')
    run('2026-01-02', 'commit', '-q', '-am', 'side')
    run('2026-01-03', 'checkout', '-q', 'main')
    write('2026-01-03', 'main')
    run('2026-01-03', 'commit', '-q', '-am', 'main')
    assert.throws(() => run('2026-01-05', 'merge', '-q', 'side'), 'the fixture needs a real conflict')
    write('2026-01-03', 'rewritten while resolving')
    run('2026-01-05', 'commit', '-q', '-am', 'merge')

    assert.equal(parseLog(historyLog(repo, 'lesson.mdx')).get('lesson.mdx'), '2026-01-05', 'the resolution edit must date the lesson')
  } finally {
    rmSync(repo, { recursive: true, force: true })
  }
})
