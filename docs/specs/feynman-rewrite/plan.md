# Feynman review of every lesson (0.12.0)

Owner request, 2026-10-13: "review all texts, explain better, use feynman;
think a junior developer". Then: review, verify, release, staging, production.

## What the review changed

The first draft rewrote every lesson and gated mean sentence length. An
advisor pass, an adversarial plan review (gpt-6-astra) and an expert review
changed it:

- **Triage, not compulsory churn.** Every lesson is reviewed and gets a
  verdict (keep, clarify, restructure, rewrite) with the obstacle it removes,
  recorded in `ledger.md`. "None left unchanged" rewarded cosmetic edits.
- **The contract is a toolbox, not a template.** Mandatory "In words:"
  lines, closing recaps and fixed heading counts across 250 lessons would
  read as boilerplate. `docs/WRITING.md` now says to use the tools a passage
  needs.
- **Additions are the main factual risk**, not deletions. The keep-checker
  lists every number and formula a writer added, and the fact pass checks
  each one. Worked examples use toy numbers or point to the lesson that owns
  a number; no new Qwen facts; tracks 11–13 add no unverified flags.
- **Pilot on hard lessons.** Track 0 plus 4.3, 4.16 and 7.11 (the densest by
  grade level), so the brief is tuned on derivations and systems lessons.
- **No hard readability ceilings.** Writers can pass a metric by inserting
  full stops. Measurements are reported, not gated; a tail ceiling (no prose
  paragraph over ~200 words) is decided after the pilot.
- **Figure captions and labels are in scope** (`src/lib/figures/<track>.ts`,
  owned by the track's writer); numbers there stay. Explorer copy gets a
  main-session pass.
- Writers make no Git writes; the coordinator commits each accepted track
  with explicit paths and stamps `updated` at commit time.

Alternatives considered: a definitions-only pass (safest, leaves sequencing
problems such as 0.1's in place); a shared glossary page with term links
(challenges the premise that bodies need work; a new route is scope growth,
so it is proposed in the report, not built).

## Baseline (measured on main `ce94276`)

| | EN | pt-BR |
|---|---|---|
| Lessons | 125 | 125 |
| Body words, mean | 972 | 1,081 |
| Words per sentence, mean | 20.0 | 22.1 |
| Flesch–Kincaid grade, mean (EN formula; pt-BR only comparable to itself) | 13.1 | 16.8 |
| Longest paragraph, mean per lesson | 147 words | 163 words |
| Lessons with `##` headings | 16 | 16 |

Sentence length already meets the US plain-language target (about 20). What
loses a junior reader is elsewhere: terms used before they are defined
(softmax, logit, saturation, gradient), two or three claims per sentence, the
formula before the example, expert shorthand, and no headings.

## Scope

In: lesson bodies, analogies, summaries, teach-backs, quiz questions and
explanations (both locales), figure strings, the 14 track summaries, explorer
copy, `docs/WRITING.md`.

Out: titles, quiz options and `correctIndex` (answer positions are gated),
citations, labs, visual redesign beyond how the new prose renders.

## Steps

1. Contract and keep-checker (done).
2. Pilot: track 0 + 4.3, 4.16, 7.11, both locales, one writer. Coordinator
   reads it against the contract, runs the fact pass, adjusts the brief.
3. Fan-out: one writer per track, waves of about seven, each owning one track
   directory in both locales plus its figure file; no builds, no Git.
4. Fact pass per track on another model, fresh context: old against new,
   every added number and formula, caveats kept, question–option entailment,
   pt-BR quality. Writers fix; high findings get a second read.
5. Main session: track summaries, explorer copy, AGENTS.md pointer to
   `docs/WRITING.md`; decide the tail gate from measurements.
6. Integration: one build, every gate, render:check, a rewritten lesson
   looked at in a browser at 390 and 1440 px, both editions.
7. Review: a two-axis code review, an independent reviewer and an independent verification on the
   criteria below.
8. Release 0.12.0: docs, CHANGELOG, version, PR, merge, `v0.12.0-beta1` to
   staging + `verify:live`, `v0.12.0` to production + `verify:live`,
   cleanup.

## Acceptance (frozen for the verifier)

1. Every lesson in both locales has a ledger verdict; each unchanged lesson
   has a reason.
2. No claim, condition, number, formula, figure, citation, quiz answer or
   lesson reference changed meaning, except a fact fix reported with its
   source.
3. In a cold read of sampled lessons from every track, each new technical
   term is defined or linked at or before first use, and a worked case
   precedes a general formula where the lesson has one.
4. pt-BR reads as natural Brazilian Portuguese and says what EN says.
5. Every repository gate passes; production serves the new text
   (`verify:live`).

Readability measurements are reported against the baseline, not accepted on:
no learners were tested, so better comprehension is a design claim, not a
measured one.
