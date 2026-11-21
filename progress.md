# Test suite maintenance

## Acceptance

- Run the existing website and Python example suites before editing. Record executed cases and any baseline limits in `tests.json`.
- Use `cccc` to measure supported source. Write new tests only for code with cognitive complexity above 5 or code containing a regular expression.
- Remove existing tests or assertions only when they guard no behavior or a named check covers the same behavior. Preserve unique regressions, even when the source is simple.
- Re-run the affected suites and repository gates. Obtain fresh independent verification of the changes before merging and tagging.
- Bump the patch version, update release and contributor documentation, and keep unrelated worktrees and files intact.

## Progress

- Established the baseline at the `v0.17.0` main commit in an isolated worktree. The website build generated 538 pages. The website and all four Python suites passed with one existing Python skip.
- Scanned all 181 supported source files under `src`, `scripts`, and the Python example source with `cccc 1.8.0`. The scanner scored 1,293 functions and reported zero parse errors. Astro templates are outside this scan.
- Audited all 33 website test files and the four Python suite inventories. Existing tests with distinct behavior stay, including those for low-complexity code.
- Pruned 10 website cases and eight assertion groups across the website and Python suites. Added no tests. The website suite passed 329 cases. All four Python suites matched their baseline counts.
- The website suite's measured line and function coverage held at 41.29% and 87.20%. Reported branch coverage moved from 80.78% to 80.85% with the same coverage command.

## Pruning ledger

| Existing check | Reason and coverage that stays |
| --- | --- |
| `agent-engineering-acceptance`: both locale quiz length census cases | Duplicate of `pnpm content:parity` on the same corpus, directions and thresholds. The per-lesson and planted-corpus checks stay. |
| `agent-engineering-acceptance`: the `lastVisitKey('pt-br')` assertion | Identical input and expected key in `progress.test.mjs`. The distinct first-part completion key stays. |
| `content-quiz-distribution`: balanced positions positive case | The comparable-length positive case uses the same positions, bilingual structure, relative option lengths and successful exit assertion. |
| `course-player`: route-existence case | The acceptance tests require exactly 230 lesson pages and 34 track pages per locale. The rendered home-parts test requires content on both home routes. |
| `course-player`: retired CSS token names | Tests historical names absent from current source and specifications. The undefined-token check stays. |
| `math-scroll`: synthetic inline MathML case | The real Markdown pipeline requires the exact inline span opening, excluding focus and region attributes. The transform idempotence test stays. |
| `moe-math`: counterfactual total and serving-read derivations | The Qwen counterfactual case pins each operand using the same fixture. The removed cases recompute values in the test without calling additional application code. |
| `rendered-html`: build-produced-pages case | The SEO route-set test requires both a page and a lesson minimum and fails on missing output. |
| `rendered-html`: generic language and canonical case | Exact locale-specific language remains checked on the same HTML files. The SEO metadata test requires each page's canonical URL. |
| `rendered-html`: native timezone demonstration | Tests the runtime's formatter using constant values. The application UTC requirement and rendered lesson dates stay checked. |
| `seo`: second social-card file lookup | The exact card pathname and byte hash are checked against the first lookup. The file's actual PNG dimensions stay checked. |
| `sky-layout`: loose horizontal star bound | The same stars must stay at least 14 units inside the horizontal bounds for each catalog. Vertical and label checks stay. |
| `transformer-scene`: marker ID uniqueness | Marker IDs must equal the ordered component IDs, which are separately pinned to a unique sequence. |
| `video-token-lab`: pt-BR parsing unit case | The calculator suite uses the same parser, locale, strings and expected values. The rendered video-lab locale case stays. |
| Python `test_evals_corpus`: count of executed results | The same seeded fixture has its category sizes pinned and all case execution categories checked. Actual results are still checked for problems. |
| Python `test_memory_compression`: strictly fewer tokens in the pinned ledger | The same pinned ledger is checked against the budget separately, and the uncompressed conversation is above that budget. The ledger must still preserve its facts. |
