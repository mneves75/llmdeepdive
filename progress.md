# 0.19.0 progress

Plan and frozen acceptance criteria: `docs/plans/0.19-pictures-and-the-browser-lab/plan.md`.
Test status: `tests.json`.

## Done

- 2026-11-26. Built the integration branch `release/0.19-qwen-lab` from `origin/main`, merging PRs #26 (v0.18.0, which production serves), #29 and #30 without conflicts. Pushed it with upstream tracking.
- Baseline on the merged tree: 12 gates pass and 331/331 tests pass. The worst route's CSS is 69.9 KB of 72 KB. Only 40 of 230 lessons per locale have a figure.
- Confirmed that the CSP has no `media-src`, so `default-src 'none'` blocks video. Motion therefore stays CSS inside the figure system.
- The lab's vendored engines reproduce byte for byte from npm (`@wllama/wllama@2.3.7`, `@mlc-ai/web-llm@0.2.89`). The one exception is `wllama.js`, which carries a one-line patch: it replaces `document.baseURI` with `self.location.href` when `document` is undefined, as it is in a Worker.
- Changed the reader contract in `docs/WRITING.md` and `PRODUCT.md` to a first-year university student in any field. WRITING.md also gains two tools: draw a process instead of describing it, and say what code does before showing it.

- Red team (fresh context, another model) returned "run this experiment first". Its gaps are folded into the plan's acceptance criteria. Firefox 159 turned scroll-driven animation on by default (MDN release notes, read 2026-11-26).
- Motion (`858a74e` plus this commit): stepped figures replay on the document clock on every step change, within 880–900 ms. All motion is screen-only. Verified with probes in Chromium and WebKit at 320px:
  - stepped flow 1.3, stack 7.2 (pt-BR) and grid 4.4 replay on A→B→A; clicking the selected step replays nothing; every stage ends fully opaque;
  - reduced motion and print run no figure animation; print shows every panel and the plot data table;
  - **two defects found and fixed:** print captured animations (the first frame is at opacity 0), and single-panel grid rows bound by `view()` to their own `.fig-scroll` box sat at 0.5 opacity forever. Rows now use the named timeline `--fig-rows`.
- `render:check` now asserts all of the above in three engines, with a planted defect per check. `--self-test` passes in Chromium and WebKit.
- Firefox 157, the flashwright-pinned build, does not launch on this Mac even outside the sandbox; Firefox coverage comes from CI. Because 157 predates 159, no engine in CI exercises Firefox's scroll-linked path; Firefox gets the static figure there.
- Flashwright downloads browsers from the official Playwright mirrors (`cdn.playwright.dev`, `playwright.download.prss.microsoft.com`). A note for the security audit.
- Empty figure registries now exist for tracks 0, 2, 3, 6, 8, 11, 12, 13 and 34, all registered in `src/lib/figures/index.ts`. Lanes never edit that file.
- Worst route CSS: 70.8 of 72 KB. The CSS headroom task has to land before the front-end wave.

## In progress

- Draft PR, so CI runs the three-engine gates on every wave.

## Next

- Pilot on track 0 (kill criterion for the 100% figure rule in the plan), then the lab clean-checkout rebuild and the 34.1 pilot.
