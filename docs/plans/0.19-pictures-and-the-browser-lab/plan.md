# 0.19.0: pictures for every lesson, and a model in a browser tab

Owner request, 2026-11-26, in short:

- Review the source and the front-end design.
- Update the lessons from new primary sources.
- Review the owner's `qwen-local-lab` project, use it as a test bed, and teach how it works and how it was built.
- Make the whole site understandable to a first-year university student in any field.
- Review every lesson, using motion graphics: less text, more pictures.
- Audit security and fix what the audit finds.
- Then version, docs, merge, tag, production, and staging off.

The owner also asked for the deeper version of the task, not the bigger one. This plan therefore starts from the four questions below, and every acceptance criterion is something a verifier can check.

## Base

`release/0.19-qwen-lab` was cut from `origin/main` (597ba3d, v0.17.1). It then merged three branches:

- `redesign/learning-studio` (v0.18.0). Production serves it, but `main` does not contain it.
- `content/fineweb-colibri-2026-11` (PR #29).
- `hardening/learning-state-check` (PR #30).

All three merged without conflicts. A baseline taken on that tree passed every gate:

- build, typecheck, lint, content gates, contrast, budget and privacy all pass;
- 331/331 tests pass.

`verify:learning`, `render:check` and the four Python suites run in CI on the draft pull request (owner rule: heavy suites run off the Mac).

| Measure (baseline) | Value |
|---|---|
| Lessons per locale | 230 |
| Lessons with at least one `<Figure>` | 40 (17%) |
| Tracks with no figure at all | 0, 2, 3, 6, 8, 11, 12, 13, 18, 22, 23, 25 |
| Worst per-route CSS | 69.9 KB of 72 KB (lesson 0.1) |
| CSP line | 559 characters; 2 inline script hashes, 1 inline style hash |
| CSP `media-src` | absent, so `default-src 'none'` blocks `<video>` and `<audio>` |

## The four questions

### 1. What would a top practitioner do?

A learning designer at the level of the best explorable explanations would leave the 230 lessons alone at first. They would start by finding where a novice gets lost, and fix only those places, in three ways:

- Draw the process the text is struggling to describe.
- Let the learner advance it step by step.
- Delete the paragraph the picture replaces, so that text and picture do not say the same thing twice.

They would leave the course tooling stronger than they found it, so the next lesson starts from a higher floor. And they would not claim a learning gain they did not measure.

### 2. What is the rawest material?

- The lessons themselves, the figure registry and its renderer.
- The `qwen-local-lab` source: worker, app, build script, tests, the vendored engines and the two documents.
- Primary sources fetched today: papers, model cards, release notes, tagged source.
- The real lab running in real browsers on this Mac.

The course has no learner analytics, by design (invariant 2). Comprehension therefore cannot be measured from usage. It can only be designed for and checked by cold reads.

### 3. Which methods and tools?

- **Mayer's multimedia principles**, applied as rules for writers:
  - coherence: cut extraneous words, never essential ones;
  - redundancy: a picture does not repeat its paragraph;
  - segmenting: a process is shown in learner-paced steps;
  - signalling: the step that changes is the one that moves;
  - spatial contiguity: every label sits in the picture, in HTML.
- **The 0.12.0 triage method** (`docs/specs/feynman-rewrite/plan.md`): each lesson gets a verdict instead of compulsory churn, recorded in a ledger. Each track then gets an adversarial fact pass on another model, in a fresh context.
- **The figure system's zero-JS primitives** for motion: CSS animation driven by native radio state, so motion follows state.
- **Repository gates** that lock in the outcome:
  - a figure-coverage rule in `content:figures`;
  - a motion contract test;
  - `content:excerpts` for every line of lab code a lesson quotes.

### 4. What external evidence shows it is right?

- **Animation helps most when the change itself is what the learner must understand.** Höffler & Leutner (2007, *Learning and Instruction* 17, 722–738) pooled 26 studies (76 comparisons) and found a small-to-moderate advantage for instructional animation over static pictures. Later meta-analyses and re-analyses find the advantage concentrated where the specifics of a change must be learned. So motion here shows state changes (a token moving through a pipeline, a cache filling, a bar shrinking), never decoration.
- **Learner control and segmenting** (Mayer & Chandler 2001) favour short, learner-paced steps over one continuous clip. Stepped figures already give that control, and motion is added inside each step.
- **Motion follows state, and reduced motion gets the end state at once.** That is the UI SDK motion behaviour (vercel-labs/ui, `core/behaviors/motion`) and DESIGN.md's motion vocabulary.
  - A step change replays a bounded animation that lasts at most 1.5 s and does not loop, so WCAG 2.2.2 (pause, stop, hide) does not apply.
  - A scroll-linked entrance moves only while the reader scrolls. That makes it interaction-driven motion (WCAG 2.3.3), which `prefers-reduced-motion` turns off.
- **No learner was tested.** Better comprehension is a design claim. Readability numbers are reported against the baseline, not accepted on.

## Falsified premises

- **"Less text" as a word-count target.** It would cut essential explanation. Text goes only where a picture now carries the same idea, or where it is extraneous. Total prose words are reported, not targeted.
- **"Motion graphics" as video.** The CSP blocks media. Burned-in text would also break the rule that strings live in HTML, which pt-BR wrapping and screen readers need. Motion is CSS inside the figure system.
- **Hosting the lab on llmdeepdive.com.** The lab would need blob workers and Hugging Face fetches, which the site CSP forbids (`worker-src 'self'`, `connect-src 'self'`). Its `localStorage` would also share an origin with learner progress. Adding a path-scoped exception would weaken a policy whose strictness is the privacy argument. The lab is taught and vendored, not hosted. Hosting it on its own origin remains the owner's alternative.
- **"Rewrite every lesson for a non-programmer."** Changing the reader to "any field" mostly means defining computing terms the old contract assumed and adding a plain-words line before code. A lesson that already passes keeps its prose.

## Five years out

- Scroll-driven animation is now in all three engines: MDN's Firefox 159 notes (read 2026-11-26) say it is "enabled by default". `@supports` still guards it, because a feature query proves the declaration parses, not that the end frame is reached. Inside a stepper, motion is time-based, because a scroll-linked effect resumes wherever the page happens to be scrolled.
- Browser inference (WebGPU, WASM threads, the Prompt API) will change faster than any other subject in the course. Track 34 therefore teaches mechanisms with dated, pinned examples (model revision, engine versions), never claims about what browsers "can't do".
- What stays true:
  - zero-JS figures;
  - one string table per figure in both locales;
  - a coverage gate.

  A figure written today renders the same in 2031. A video would not survive a rewording.

## Decisions

| Decision | Chosen | Strongest alternative | Why |
|---|---|---|---|
| Lab location | Vendor the source as `examples/qwen-local-lab/`, with its tests in CI and quoted through `content:excerpts`. | Host the built page at `/lab/qwen/` under a path-scoped CSP and COEP. | Keeps the site's CSP and origin intact (above). |
| Third-party engines | Keep the manifest and a stdlib `scripts/fetch_vendor.py`. It downloads the exact npm tarballs, checks their registry sha512 integrity, extracts fixed archive paths and applies the exact one-line wllama patch. It then requires each output's SHA-256 to match the manifest. Verified on 2026-11-26: `webllm.js` and both `.wasm` files are byte-identical to `@mlc-ai/web-llm@0.2.89` and `@wllama/wllama@2.3.7`. `wllama.js` is upstream `esm/index.js` plus a fallback from `document.baseURI` to `self.location.href` when `document` is undefined. | Commit the 11 MB of minified vendor code. | Avoids permanently bloating the repo with blobs nobody can actually review. The patch becomes a visible, teachable diff. |
| Model integrity | Hash the GGUF while it streams, using an audited incremental SHA-256 (`@noble/hashes`, fetched and verified like the engines), on download and on local import. Never use a second model-sized buffer. Pin `model_lib` to a commit, check its hash, and hand it to WebLLM as a blob URL. | WebCrypto `digest()`. | `digest()` needs the whole 639 MB in one buffer. |
| Motion | CSS keyframes in `Figure.astro` and `FigureBody.astro`, one vocabulary per figure kind:<br>• flow: sequential pulse<br>• stack: build<br>• grid: fill in reading order<br>• plot: stroke draw<br>Replays on step change. A single-panel figure plays on entering view where `animation-timeline: view()` exists, and is static otherwise. | Scroll-scrubbed animation everywhere. | Unconfirmed in Firefox. Time-based motion triggered by the learner matches "motion follows state". |
| Reader | `docs/WRITING.md` and `PRODUCT.md` move from "junior developer" to "a first-year university student in any field". Computing terms are defined at first use, and code gets a plain-words line before it. Depth stays. | A separate "beginner" edition. | Two editions double every gate and every fact. |
| Figure coverage | `content:figures` fails a lesson with no figure. The rule is added in the commit that reaches 100%, so no exemption list ever exists. Each new figure's ledger row names the passage it replaced, and the fact pass rejects a figure that only decorates. | A ledger target only. | A gate keeps the next lesson from regressing. The ledger row and the fact pass guard against filler, the red team's first failure cause. |
| Content passes | One lane per track: triage, figures, freshness and plain words, then a fact pass on another model. | One pass per concern across all tracks. | Disjoint track directories (AGENTS.md, "Working in parallel"), with one figure file per track. |
| New track | Track 34, *A model in your browser*, in Part 3 (`engineering`), 8 lessons. | Extending lesson 7.12. | The lab is a whole system (engines, file, cache, worker, build, measurement). A case study fits Part 3. |

## Track 34: A model in your browser (Um modelo no seu navegador)

"How this project works" in the request refers to `qwen-local-lab`, so track 34 teaches the lab, not how the Astro course is built. The size below is a draft: lesson 34.1 is piloted first, against a clean-checkout rebuild of the lab, and the track size is fixed only after that pilot (red team, 2026-11-26).

Prerequisites come from existing lessons: tokens (1.2), the KV cache (7.2), sampling (7.4), quantization (7.9, 7.10), GGUF (8.7) and local runners (7.12). Every number about Qwen3-0.6B or the lab lives in one module, `src/lib/browser-lab-facts.ts`, with a source comment beside each value. No caption or label presents those numbers as the course model's.

| Lesson | Answers | Main figure |
|---|---|---|
| 34.1 | What runs where when a 0.6B model answers inside one tab? | flow: page → worker → engine → model file → cache, with the privacy boundary drawn |
| 34.2 | What is in the 639 MB file, and how does the lab know it is the right one? | stack: header, metadata, tensors; the size arithmetic |
| 34.3 | Why are there two engines, and how does the page pick one? | flow: feature checks (WASM SIMD, exceptions, `shader-f16`, cross-origin isolation) → CPU or GPU route |
| 34.4 | How do you get 639 MB into a tab safely? | flow: streaming download, size guard, hash, Cache API; plot: download time against bandwidth |
| 34.5 | How does a chat become tokens and come back? | stepped flow: chat template, context fitting, sampling, prefix-cache reuse (TTFT) |
| 34.6 | How is it kept local and stoppable? | flow: worker messages, stop → terminate fallback, fetch guard, CSP and its limits |
| 34.7 | How do you ship it as one file? | stack: base64 overhead (4/3), notices, headers; trade-offs against a multi-file build |
| 34.8 | How do you measure it honestly? | grid: measured, environment, unverified; plot: tokens/s by route |

Measurements (34.8) are environment-tested runs on this Mac, recorded with browser, version, hardware and date. Anything not run stays labelled unverified, as the lab's own `VERIFICATION.md` does. Model downloads go to the external SSD when it is mounted.

## Waves

1. **Foundation** (main session):
   - this plan and a fresh-context red team;
   - the reader contract (`docs/WRITING.md`, `PRODUCT.md`);
   - the motion primitive (time-based replay inside steppers, scroll-linked entrances only for single panels, print reset), checked on one bilingual page in three engines at 320px: switching steps A→B→A, a deep link, reduced motion, forced colours, print, and screen-reader output;
   - the figure-coverage gate is added in the commit that reaches 100%, so no exemption list ever exists;
   - CSS headroom under the 72 KB budget.
2. **Pilot**: track 0, both locales, end to end. An independent read checks that each figure is true. Then adjust the brief.
3. **Lab**:
   - vendor the lab source, the fetch-and-verify script and its tests;
   - fix the lab's security findings (pin and hash `model_lib`, full SHA-256 of the GGUF, a CSP in its headers, the GPU `top_k` mismatch);
   - run it in a real browser;
   - write `browser-lab-facts.ts` and track 34.
4. **Lanes**: tracks 1–33, four lanes at a time. Each lane owns one track directory in both locales, its figure file and its ledger. Writers never build or touch Git. After each lane, a fact pass on another model (read-only, fresh context) compares old with new.
5. **Front end**:
   - a design critique against DESIGN.md and current frontend practice;
   - the UI SDK behaviour checklist (focus recovery, dismissal, findable hidden content, reduced motion) against the platform primitives the site uses;
   - targeted fixes, checked in screenshots at 390 and 1440 px in both editions.
6. **Review**:
   - a two-axis code review (repository standards, and the spec) and an improvement survey, with fixes;
   - a full security audit (standard profile, at most 40 agents), with every finding fixed or accepted by the owner.
7. **Integration**:
   - one build;
   - CI on the draft pull request (every gate, three engines, Python suites, lab tests);
   - visual checks;
   - test pruning under the cccc rule;
   - the `reviewer` agent;
   - independent verification in a fresh context until it returns a clean verdict.
8. **Release**:
   - 0.19.0 and all docs;
   - merge, tag;
   - the pre-deploy security gate on the exact commit;
   - staging with `verify:live`, then production with `verify:live`;
   - staging off;
   - cleanup.

   Merge, tag, production and staging-off wait for one explicit owner confirmation.

## Acceptance (frozen for the verifier)

1. Every lesson in both locales, track 34 included, references at least one figure. `content:figures` enforces it, with no exemption list. Each new figure's ledger row names the passage it replaced.
2. Every figure kind animates its primary content on step change, or on entering view where supported. Its final frame equals the static figure. The motion contract also holds:
   - under `prefers-reduced-motion: reduce` there is no animation and the end state shows at once;
   - zero JavaScript is added to figures;
   - the inline script and style hash counts are unchanged;
   - the CSP line stays at or under 1,900 characters;
   - every route's CSS stays at or under 72 KB;
   - inside a stepper, motion is time-based, lasts at most 1.5 s and does not loop. Clicking the step that is already selected changes nothing;
   - print disables animation and shows every step and every plot's data table;
   - in forced-colours mode, the selected step, focus and plot series stay distinguishable through borders, labels or patterns;
   - Pagefind excerpts carry no step labels or repeated panel text, and no live region announces more than once per step change.
3. Every lesson has a ledger verdict (keep, clarify, restructure, rewrite) with the obstacle it removes. Each unchanged lesson has a reason.
4. No claim, condition, number, formula, citation, quiz answer or lesson reference changes meaning, except a fact fix listed with a primary source read on or after 2026-11-26.
   - Every changed lesson moves its `updated` date (`content-dates.test.mjs`).
   - Both locales keep identical structural metadata, lab declarations, citation pairs and figure references (`content:parity`, `content:figures`).
   - Quiz items keep their intent, correct answer and position diversity, within the length caps: correct option uniquely longest at most 20% and uniquely shortest at most 35% per locale, and at most 50% either way per track.
   - Qwen3.8-27B numbers keep their owning lessons. A changed command is re-read at its pinned tag.
5. A cold read of sampled lessons from every track finds each new term, including computing terms, defined or linked at or before first use. Code blocks are preceded by a plain-words line.
6. Track 34 exists in both locales at the size fixed after the 34.1 pilot. Every quoted code line passes `content:excerpts` against `examples/qwen-local-lab/`, and every lab number comes from `browser-lab-facts.ts`. Fixture-tested and browser-tested claims are labelled as such. The lab's tests run in CI.
   - Track 34 fits the sky at 320px, for both the published corpus and the full planned catalog (`sky-layout.test.mjs`).
   - The inventory and the scope docs are updated.
   - Figure ids and view-transition names stay unique.
7. The lab:
   - pins `model_lib` to a commit and checks its hash;
   - verifies the GGUF's full SHA-256;
   - ships a CSP in its headers;
   - reproduces its vendored engines from npm with `fetch_vendor.py`: pinned tarball integrity, fixed archive paths, an exact patch file and the matching output SHA-256, rebuilt on a clean CI runner;
   - hashes downloaded and cached model files before use, with no second model-sized buffer.

   A test covers each of these. Cold load, warm reload from cache and cancellation run in a real browser on this Mac, with browser, version and date recorded. Anything not run is labelled unverified.
8. Freshness: every updated claim has a ledger row with URL and the date it was read. A track that moves a pin moves it in every lesson at once (`content-pins.test.mjs`).
9. Every repository gate passes locally and in CI. The pre-deploy security gate passes on the exact commit before any deploying action, the tag included. `verify:live` passes on staging and production. Staging runs nothing afterwards.
10. The security audit's findings are each fixed with a test, or accepted by name by the owner.

Reported, not accepted on: total prose words, words per sentence and Flesch–Kincaid grade per locale against the baseline. No learners were tested.
