# Agent-engineering tracks: implementation spec

Implements [the curriculum plan](../../plans/agent-engineering/plan.md) and the
remaining items of [the lesson review](../../plans/agent-engineering/lesson-review.md).
The plan owns *what* is taught; this file owns the frozen decisions and the
writer contract every lane follows. [`inventory.json`](inventory.json) is the
frozen list of tracks and lessons: ids, order, tier, prerequisites, unlocks
and the quiz answer positions.

## Assumptions (no interview was held; the owner asked for the plan to be built)

- All twelve tracks (14–25, 60 lessons per locale) ship in one release,
  0.14.0, instead of the plan's progressive waves. Waves remain the build
  order and commit boundaries. No learner pilot was possible; the plan's
  "pilot learner feedback recorded" criterion stays open and is reported.
- The site gains two **parts**: *How models work* (tracks 0–13) and *Building
  agent systems* (14–25). One sky chart holds both as two bands, so a page
  still has one WebGL context.
- Lesson tier equals track tier. New lessons' `unlocks` are the exact inverse
  of new lessons' `prerequisites`; existing lessons' frontmatter is not edited
  to add forward links (their prose may link forward).
- Python is the exercise language. The website package manifest gains no
  dependency.
- Version pins, read 2026-10-18, chosen as the newest release at least two
  weeks old: Pydantic 2.13.5, LangGraph 1.2.12 (checkpoint-sqlite 3.1.1),
  Temporal Python SDK 1.34.0, Playwright 1.63.0 (matches the site's Node
  Playwright), psycopg 3.3.6. Protocol revisions: MCP specification
  `2026-07-28`; A2A specification v1.0.1 (2026-05-28). Firecracker v1.17.0
  (2026-09-10). Docs-only sources (E2B, gVisor, Slack, Teams, Anthropic
  engineering posts) are cited with the date they were read.

## Executable code: one rule

A code block in a lesson may present itself as runnable only if its code
lives in `examples/agent-engineering/` and a test in `tests/`,
`tests_frameworks/`, `tests_browser/` or `tests_postgres/` runs it; CI's
`examples` job runs all four (Postgres as a service container). Such a block
starts with a header line `# file: examples/agent-engineering/<path>` (or
`// file: …`), and `pnpm content:excerpts` fails unless every following line
appears in that file verbatim and contiguously. Quote the key function, not
the whole module; give the command and its expected output in prose. Every
other block says, in the prose right before it, that it is an illustration
the course's CI does not run, and why (needs KVM, a Slack workspace, a cloud
account). Lesson 17.4's microVM commands, the Slack and Teams adapters' live
calls and every E2B call fall in this second group.

The project layout is in the [project README](../../../examples/agent-engineering/README.md):
shared records in `domain.py`, adapters in `model.py`, synthetic data in
`fixtures/`, one package per track under `src/agentlab/<topic>/`, tests per
track in `tests/test_<topic>_*.py`. A track's package may import `domain`,
`model`, `fixtures` and packages of *earlier* tracks only.

| Track | Package |
|---|---|
| 14 | `agentlab.state` |
| 15 | `agentlab.tools` |
| 16 | `agentlab.security` |
| 17 | `agentlab.sandbox` |
| 18 | `agentlab.gui` |
| 19 | `agentlab.memory` |
| 20 | `agentlab.approval` |
| 21 | `agentlab.repair` |
| 22 | `agentlab.multiagent` |
| 23 | `agentlab.evals` |
| 24 | `agentlab.resilience` |
| 25 | `agentlab.capstone` |

## Writer contract (new lessons)

Read first: `AGENTS.md` (Content, Figures, Search metadata), `docs/WRITING.md`
(voice, Portuguese), the plan's section for your track, and one existing lesson
such as `src/content/lessons/en/8-building-and-serving-stacks/8.5-sglang.mdx`
for frontmatter shape.

Files per lesson: `src/content/lessons/{en,pt-br}/<track>/<id>.mdx`. Per track:
`src/content/tracks/{en,pt-br}/<track>.json` with `id`, `order`, `title`,
`summary`, `tier`, `part: "agents"`, `locale`.

Frontmatter, exactly as `inventory.json` says: `id`, `track`, `order`, `tier`,
`prerequisites`, `unlocks`. Then:

- `title`: the inventory's English title; write the pt-BR title. At most 60
  characters, unique within the locale.
- `summary`: one or two plain sentences; never " — and " or " — e ".
- `analogy`: one paragraph that also says where the comparison stops.
- `teachBack.prompt`: a *changed scenario*, not "explain X". `modelAnswer`:
  the full reasoning, sentences under about 20 words.
- `quiz`: exactly three items. Item *k* uses `correctIndex` =
  `correctIndexPattern[k]` from the inventory, in both locales (that pattern
  satisfies `content:parity`'s position rule). Four options each. At least one
  item is a changed scenario, a trace to read or a number to compute.
  **Distractors are plausible and as specific as the correct answer**: the
  correct option must not be the uniquely longest one in more than one of the
  three items. The explanation says why the tempting wrong answer is wrong.
- `citations`: primary sources only (specifications, official docs at a fixed
  version, papers, the vendor's own engineering post), each with the year it
  states. No blog summaries. A framework claim cites the doc page for the
  pinned version or the source file at the pinned tag.
- `updated`: `"2026-10-18"`. The integrator restamps it before each commit if
  the commit date differs.

Body:

- 900–1,600 words in English; pt-BR is a real translation of the same lesson
  (same headings, examples, numbers, code, math and figures).
- Open with a concrete question and a worked case from the purchasing
  assistant; define every term at first use; `##` headings that name the
  question each part answers (at most six); no numbered headings.
- A section that names the exercise: the module and test file in
  `examples/agent-engineering/`, the command to run it, the expected output,
  and the failure case the test proves is caught.
- Link the first mention of another lesson as
  `[lesson 14.3](/lessons/14-agent-architecture-and-state/14.3-checkpoints-and-serialization/)`
  (pt-BR: `[aula 14.3](/pt-br/lessons/…/)`).
- Callouts `:::note`, `:::insight`, `:::warning`, `:::caveat` as in existing
  lessons. Never a bare `$` before a digit: write `USD 10,000` (pt-BR
  `USD 10.000`). pt-BR groups thousands with `.` and decimals with `,` in
  prose; code and math stay identical across locales.
- pt-BR says *trilha* and *aula*, never *track* or *lição*. Field terms stay
  English (*prompt injection*, *checkpoint*, *sandbox*) with a short gloss at
  first use.
- No claim the plan marks as wrong (its "Claims from the proposed outline that
  must change" table), no invented statistics, no employment promises, no real
  company, person, credential or e-mail address in examples.
- Figures are optional and only where they explain a mechanism: define them in
  `src/lib/figures/<track>.ts` (already registered in `index.ts`; do not edit
  `index.ts`) and write `<Figure id="…" />` identically in both locales. SVG
  draws geometry, HTML holds strings; pt-BR labels must differ from English
  unless they are notation.

## Labs

Four lessons get a calculator (`lab: { id, kind: "calculator", budgetKb: 12 }`
in both locales). Their arithmetic is in `src/lib/lab-math.ts`, tested by
`tests/agent-labs.test.mjs`; the integrator builds the components. A lesson
with a lab uses the lab's defaults as its worked example, with these exact
numbers:

| Lesson | Lab id | Function | Worked default |
|---|---|---|---|
| 19.3 | `context-budget` | `contextBudget` | 32,768-token window, 4,096 reserved for output → 28,672 for input; instructions 1,200 + tool schemas 2,400 + 6 retrieved chunks × 800 = 8,400 fixed; a 50-turn history of 21,000 → 29,400 used, 728 over; the history must be compressed to at most 20,272 tokens. A 131,072 window fits with 97,576 to spare; an 8,192 window cannot hold even the fixed parts. |
| 21.4 | `retry-budget` | `retryBudget` | success chance per repair attempt 0.4, at most 3 attempts, USD 0.12 per attempt → 78.4% succeed, 21.6% escalate, 1.96 attempts expected, USD 0.2352 expected, USD 0.36 worst case. Assumes independent attempts; correlated failures make escalation more likely. |
| 23.2 | `trace-check` | `checkTrace` + `TRACE_POLICY` | Policy: `read_request` → `lookup_po` → `draft_invoice` → `request_approval` → `approval_granted` → `send_invoice` as required-before relations; `read_supplier_message` optional; `send_invoice` at most once; a new `draft_invoice` voids an earlier `request_approval` and `approval_granted`. Both `read_request, lookup_po, read_supplier_message, …` and `read_request, read_supplier_message, lookup_po, …` pass; sending before `approval_granted` fails with an order violation even though every step appears, and so does redrafting after approval and then sending. |
| 25.2 | `cost-per-success` | `costPerSuccess` | 30 runs (10 held-out scenarios × 3 trials), 24 successes; per run USD 0.08 model + USD 0.02 sandbox + 1.5 review minutes at USD 40/hour = USD 1.10; total USD 33.00; USD 1.375 per successful task; success rate 80%, Wilson 95% interval about 62.7%–90.5%. |

## Gates a lane runs (never `pnpm build`)

```bash
pnpm content:parity && pnpm content:stubs && pnpm content:graph \
  && pnpm content:citations && pnpm content:figures && pnpm content:excerpts
node --experimental-strip-types --test tests/content-*.test.mjs
cd examples/agent-engineering && uv run --frozen python -m unittest discover -s tests
```

`pnpm typecheck` checks figure files. The integrator runs the build, the
render gates and the browser checks once per wave.

## Fact review per wave

The content gates check shape, never truth. Before a wave's commit, a
reviewer on a different model from the one that wrote it reads every lesson
of the wave against its cited sources, recomputes every number, runs each
quoted snippet against the examples project, and returns findings with
evidence; the integrator fixes them before committing. Findings and their
dispositions go in `docs/specs/agent-engineering/fact-review/<wave>.md`.

## Existing-lesson repairs

Lanes over tracks 0–4, 5–9 and 10–13 fix the review's open findings for their
tracks (F03, F05, F10, F12, F16–F18, F22–F24, F26, F27, F32–F39, F42–F45, the
pending source checks, the pt-BR *banco* example) and repair every quiz item
whose correct option is the uniquely longest, under `docs/WRITING.md`'s
assessment-repair procedure. Each lane records every change in
`docs/specs/agent-engineering/repairs/<lane>.md`: finding id or quiz item, old
text, new text, reason, source. A claim that cannot be checked against a
primary source keeps its caveat and is listed as unresolved.

## Acceptance

1. 26 tracks and 185 lessons per locale; every content gate, `pnpm test`,
   `typecheck`, `lint`, `build`, `budget`, `a11y:contrast`, `render:check` and
   the examples suites pass.
2. The quiz length-cue census: the correct option is uniquely the longest in
   at most 20% of items per locale, uniquely the shortest in at most 35%, and
   each direction in at most half of any track's items, and a track of ten or more items has the correct option at a unique extreme in at least a tenth of them, so "never pick the longest or the shortest" is not a strategy either (`content:parity` enforces all of it).
3. The home page, tracks index and both locales show both parts in one chart
   without overlapping names at 320, 768, 1280 and 1440 px.
4. Every runnable lesson snippet maps to a passing test; every other one is
   labelled.
5. Released to staging and production with `verify:live` passing on both.

Not acceptance, reported as open: learner pilot feedback, live-model trials,
the KVM microVM run, real Slack/Teams/E2B integrations.
