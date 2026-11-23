---
name: learning-state
description: "Verify the lesson-completion record — present only when the quiz is right and the teach-back passes, and never withdrawn by a reload. Use after changing Lesson.astro's sync handlers, TeachBack.astro or LessonQuiz.astro's storage keys or thresholds, or progress.ts's record shape."
---

# Learning state

One promise: **a lesson is in `ldd:complete:<locale>:<lesson id>` only while its
quiz is answered correctly and its teach-back passes 80 characters and 15
words, and loading the page never takes a passing record away.**

The harm when it breaks: track pages, the header count and the syllabus all read
that record, so a false record claims work the learner did not do and a
withdrawn record loses work they did.

## Run it

```bash
pnpm build
pnpm verify:learning
```

`LEARNING_STATE_BROWSERS=chromium pnpm verify:learning` narrows the engines.
Exit code 0 is a pass; each failure names the case and what disagreed.

## What it actually does

`scripts/learning-state-check.mjs` serves `dist/` with `scripts/serve-dist.mjs`,
then for every case opens a fresh browser context with storage seeded **before
any page script runs** (`addInitScript`), loads
`/lessons/0-orientation-and-foundations/0.1-what-is-a-language-model/`, and
in the same write-then-announce order the real components use. It then compares
`localStorage` and the page's completion line with a rule computed from the
inputs alone. 120 record cases per engine: eight teach-back answers on and
around both floors × quiz true / false / absent × no action or one of four
actions, in Chromium and WebKit. A second part drives the producers themselves:
the textarea's `input` event at every boundary, and the quiz's Check button with
the documented answers and with one deliberately wrong, reading each
question's verdict and the stored record.

Why a browser and not more unit tests: `tests/learning-ui.test.mjs` hands
`Lesson.astro` a fake DOM whose `[data-teach-back]` is already `true`, so it
models one script ordering. The reload case depends on `TeachBack.astro`'s
bundle running before `Lesson.astro`'s, which only a real page shows.
`data-complete` is deliberately not asserted: `progress-client.ts` writes the
same attribute from the stored record, so two writers decide it and its value is
not the promise.

## What is covered

| Piece | Role |
| --- | --- |
| `src/layouts/Lesson.astro` (`sync`, the `ldd:teach-back` and `ldd:quiz` listeners, the load-time `sync()`) | the state machine under test |
| `src/components/TeachBack.astro` | the 80-character / 15-word floor and `ldd:teach-back:<key>` |
| `src/components/LessonQuiz.astro` | `ldd:quiz:<key>` = `true` only on a fully correct answer |
| `src/lib/progress.ts` | `ldd:complete:<locale>:<lesson id>` key and `isComplete` reading `=== 'true'` |
| `src/lib/progress-client.ts` | the second writer of `data-complete` (why that attribute is not asserted) |

**Sync commit:** `3be65dc`. The verification was last confirmed to describe the
code at that commit. If any file above changes after it, re-run the check; once
it passes and you have read the diff, move this line forward — never before.

## Not covered

- The record matrix still dispatches the components' events and performs their
  storage write itself; only the producer cases use the real controls. A quiz
  whose documented key is itself wrong is invisible to both, because the page
  and the check read the same `data-correct`.
- The pt-BR keys, Firefox, and storage that throws. Each is a real risk with its
  own unit coverage; add a case here only if one of them changes.
- Any lesson other than `0.1`. The page shape is shared, so one route proves it
  unless a lesson introduces its own completion UI.

## Reading a failure

- `record is <x>, the rule says <y>` — the page and the promise disagree. Treat
  it as a product bug, not a flaky test: run the same case twice, then read
  `sync()` in `Lesson.astro`.
- `completion text reads …` with a correct record — the visible line and the
  record disagree; fix the writer, not the expectation.
- Every case failing in one engine only — suspect script order, engine timing or
  a storage key mismatch before the logic.
- A failure in `teach-back …, no action` is the load-path regression the unit
  tests cannot see. That is the case this check exists for.

Before changing an expectation, prove the old one wrong: re-read the lesson
promise in `AGENTS.md` → **Content** and `README.md` → *Why this exists*. A
check edited to match a regression is worse than no check.

## Keeping it honest

Two mutations were run when this verification was created, and both failed it:

1. `const complete = teachBackValid && quizValid` → `||`: 44 failures.
2. `let teachBackValid = …dataset.complete === 'true'` → `let teachBackValid = false`: 8 failures, including the reload with both gates stored.
3. `characters >= 80 && words >= 15` → `characters >= 80`: 20 failures, both producer cases between the floors among them.
4. `const correct = selected…` → `const correct = true`: 2 failures, the quiz storing `true` for a wrong answer.

Repeat one of them after any change to the state machine, then revert. A check
that has never been seen red is a draft.
