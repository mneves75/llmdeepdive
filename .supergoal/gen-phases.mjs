#!/usr/bin/env node
// Generates .supergoal/phases/phase-N.md specs from ROADMAP.md.
// ROADMAP.md stays the single source of truth; specs are derived, never hand-edited.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const roadmap = readFileSync(join(root, 'ROADMAP.md'), 'utf8')
mkdirSync(join(root, 'phases'), { recursive: true })

const blocks = roadmap.split(/\n## Phase /).slice(1)
const total = blocks.length

const section = (body, label) => {
  const re = new RegExp(`\\*\\*${label}:?\\*\\*([\\s\\S]*?)(?=\\n\\*\\*|\\n---|$)`)
  return (body.match(re)?.[1] ?? '').trim()
}
const bullets = (text) => {
  // Fold wrapped continuation lines into the bullet they belong to; dropping them would
  // silently truncate multi-line acceptance criteria in the generated spec.
  const listed = []
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    if (/^([-*]|\d+\.)\s/.test(line)) {
      listed.push('- ' + line.replace(/^([-*]|\d+\.)\s*/, ''))
    } else if (listed.length) {
      listed[listed.length - 1] += ' ' + line
    }
  }
  if (listed.length) return listed
  // Prose sections (e.g. "Deliverables: all lessons in Tracks 0-3 ...") become one bullet
  // per sentence so the spec still reads as a checklist.
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=\.)\s+(?=[A-Z(])/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => '- ' + s)
}

for (const block of blocks) {
  const [heading, ...rest] = block.split('\n')
  const m = heading.match(/^(\d+)\s+—\s+(.*)$/)
  if (!m) throw new Error(`Unparsable phase heading: ${heading}`)
  const [, n, name] = m
  const body = rest.join('\n')

  const why = section(body, 'Why') || `Deliver: ${name}.`
  const work = bullets(section(body, 'Deliverables'))
  const crit = bullets(section(body, 'Acceptance criteria'))
  const cmdsRaw = section(body, 'Mandatory commands')
  const cmds = (cmdsRaw.match(/`[^`]+`/g) ?? []).map((c) => '- ' + c)
  const evidence = bullets(section(body, 'Evidence')) || []
  const deps = section(body, 'Depends on') || 'none'

  if (!work.length) throw new Error(`Phase ${n}: no deliverables parsed`)
  if (crit.length < 3) throw new Error(`Phase ${n}: only ${crit.length} criteria parsed`)
  if (!cmds.length) throw new Error(`Phase ${n}: no mandatory commands parsed`)

  const ev = evidence.length
    ? evidence
    : ['- Exit code and last ~10 lines of every mandatory command.']

  const spec = `SUPERGOAL_PHASE_START
Phase: ${n} of ${total} — ${name}
Task: ${why.split('\n')[0].replace(/\s+/g, ' ').trim()}
Type: greenfield, ui, content, perf
Mandatory commands: ${cmds.map((c) => c.slice(2)).join(', ')}
Acceptance criteria: ${crit.length}
Evidence required: ${ev.length} item(s)
Depends on phases: ${deps}

## Why

${why}

## Work

${work.join('\n')}

## Acceptance criteria (all must pass — verify each in transcript)

${crit.join('\n')}

## Mandatory commands (run each, surface last ~10 lines + exit code)

${cmds.join('\n')}

## Evidence required in transcript

${ev.join('\n')}

## Notes

- Project root is /Users/mneves/dev/MEUS_SITES/llmdeepdive.com — prefix shell commands with
  \`cd /Users/mneves/dev/MEUS_SITES/llmdeepdive.com &&\` because the harness resets cwd.
- Run wrangler and vite under Node, never Bun: \`node node_modules/wrangler/bin/wrangler.js …\`.
- Never trust wrangler deploy stdout; verify with \`versions list\` plus a live edge smoke.
- Keystone invariant: no HTML response may vary per visitor. Reject any change that breaks it.
- Perf deltas under 5% are noise on this machine — report them as such, never as a win.
- Full context: ../ROADMAP.md, ../THINKING.md, ../CURRICULUM.md.
`
  writeFileSync(join(root, 'phases', `phase-${n}.md`), spec)
  console.log(`phase-${n}.md — ${name} (${crit.length} criteria, ${cmds.length} commands)`)
}
console.log(`\nGenerated ${total} phase specs.`)
