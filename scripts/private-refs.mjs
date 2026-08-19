#!/usr/bin/env node
// Fails the build when a private reference reaches the repo. Gitleaks looks for
// credentials; this looks for the other half — the things a public repo leaks
// that are not secrets. Both halves are needed: the full-history Gitleaks scan
// passed on every commit while an absolute home path, a third party's email
// address and an account-specific deploy subdomain sat in tracked files.
//
// It scans tracked file contents AND commit metadata (author, committer,
// subject, body), because a name in a commit's author field is exactly as
// public as one in a file and no file-level check can see it.
//
// The shipped rules are *structural* — they describe a shape, not a name. A
// gate that hardcoded the names it forbids would publish that list to everyone
// who clones the repo, which is the leak it is supposed to prevent. Names go in
// PRIVATE_REFS_NAMES instead (see below).
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { finish } from './content-utils.mjs'

// This file holds the patterns and its test holds the fixtures that prove they
// fire, so both would match themselves. Exempted by exact path, never by glob,
// so a new file cannot quietly inherit the exemption. Everything in the test is
// synthetic, which is what makes its exemption free.
const EXEMPT_PATHS = new Set([
  'scripts/private-refs.mjs',
  'tests/private-refs.test.mjs',
  '.gitignore',
])

// Binary payloads produce byte-sequence false positives — an email regex hits
// inside PNG data. Matched on extension: this repo ships no binary that carries
// prose.
const BINARY = /\.(png|jpe?g|gif|webp|avif|ico|pdf|woff2?|ttf|otf|mp4|webm|zip|gz)$/iu

// Addresses allowed to appear anywhere. An allowlist, not a denylist: only an
// allowlist catches the address nobody thought to forbid, which is the failure
// mode that actually happened here.
const ALLOWED_EMAILS = new Set(['contato@mvneves.dev', 'noreply@anthropic.com'])
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/gu

// A citation URL can contain `/home/` as an ordinary path segment — Shannon's
// entropy paper is served from one — so the path rule looks at the text with
// http(s) URLs removed. Only that rule: an address or a deploy subdomain inside
// a URL is still worth flagging.
const HTTP_URL = /https?:\/\/\S+/gu

export const STRUCTURAL_RULES = [
  {
    name: 'machine-local-path',
    pattern: /((?:\/Users\/|\/home\/)[a-z][a-z0-9._-]*|[A-Z]:\\Users\\[A-Za-z][\w.-]*|~\/\.[a-z][a-z0-9_-]*)/gu,
    why: 'an absolute path that exists only on one developer machine',
    ignoreUrls: true,
  },
  {
    name: 'account-subdomain',
    // *.workers.dev is namespaced per Cloudflare account, so the subdomain
    // identifies the account. Deploy targets belong in an env var.
    pattern: /\b[a-z0-9][a-z0-9-]*\.workers\.dev\b/giu,
    why: 'an account-specific deployment subdomain; read it from an env var',
  },
]

/**
 * Extra names to forbid — clients, projects, local tooling wrappers — as a
 * comma-separated list in PRIVATE_REFS_NAMES. Kept out of the repo on purpose:
 * committing the list would publish exactly what it exists to protect. Set it
 * locally in your shell and as a CI secret.
 */
export function namesFromEnv(raw = process.env.PRIVATE_REFS_NAMES) {
  const names = (raw ?? '')
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean)
  if (names.length === 0) return null
  const escaped = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'))
  return {
    name: 'forbidden-name',
    pattern: new RegExp(`\\b(${escaped.join('|')})\\b`, 'giu'),
    why: 'a name listed in PRIVATE_REFS_NAMES',
  }
}

/** Returns one finding per distinct offending match in `text`. */
export function scanText(text, rules = STRUCTURAL_RULES) {
  const findings = []
  for (const rule of rules) {
    const subject = rule.ignoreUrls ? text.replace(HTTP_URL, ' ') : text
    for (const hit of new Set([...subject.matchAll(rule.pattern)].map((m) => m[0]))) {
      findings.push({ rule: rule.name, hit, why: rule.why })
    }
  }
  for (const address of new Set(text.match(EMAIL) ?? [])) {
    if (ALLOWED_EMAILS.has(address.toLowerCase())) continue
    findings.push({
      rule: 'unknown-email',
      hit: address,
      why: 'an email address other than the project contact',
    })
  }
  return findings
}

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })
}

function scanTrackedFiles(rules) {
  const failures = []
  const files = git(['ls-files']).split('\n').filter(Boolean)
  for (const file of files) {
    if (EXEMPT_PATHS.has(file) || BINARY.test(file)) continue
    let text
    try {
      text = readFileSync(file, 'utf8')
    } catch {
      continue // in the index but not the worktree
    }
    for (const { rule, hit, why } of scanText(text, rules)) {
      failures.push(`${file}: ${rule} "${hit}" — ${why}`)
    }
  }
  return { failures, scanned: files.length }
}

function scanCommitMetadata(rules) {
  const failures = []
  // \x1f separates fields, \x1e separates commits; neither occurs in a message.
  const log = git(['log', '--all', '--format=%H%x1f%an %ae%x1f%cn %ce%x1f%s%x1f%b%x1e'])
  const commits = log.split('\x1e').map((c) => c.trim()).filter(Boolean)
  for (const commit of commits) {
    const [sha, author, committer, subject, body] = commit.split('\x1f')
    const fields = [
      ['author', author],
      ['committer', committer],
      ['subject', subject],
      ['body', body],
    ]
    for (const [field, value] of fields) {
      for (const { rule, hit, why } of scanText(value ?? '', rules)) {
        failures.push(`${sha.slice(0, 8)} ${field}: ${rule} "${hit}" — ${why}`)
      }
    }
  }
  return { failures, scanned: commits.length }
}

// Only scan when invoked as a command; the exports above are imported by tests.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const names = namesFromEnv()
    const rules = names ? [...STRUCTURAL_RULES, names] : STRUCTURAL_RULES
    const files = scanTrackedFiles(rules)
    const commits = scanCommitMetadata(rules)
    // Say so rather than passing quietly: a rule that silently did not run is
    // worse than one that is absent, because the green tick implies coverage.
    if (!names) {
      console.warn(
        'private-refs: PRIVATE_REFS_NAMES is unset, so no client, project or tooling' +
          ' name was checked. Structural rules ran. Set it locally and as a CI secret.',
      )
    }
    finish(
      'private-refs',
      [...files.failures, ...commits.failures],
      `${files.scanned} tracked file(s) and ${commits.scanned} commit(s) carry no machine-local path,` +
        ` account subdomain, unknown email${names ? ' or forbidden name' : ''}`,
    )
  } catch (error) {
    console.error('private-refs FAIL — ' + (error instanceof Error ? error.message : String(error)))
    process.exitCode = 1
  }
}
