# 0.19.0 progress

Plan and frozen acceptance criteria: `docs/plans/0.19-pictures-and-the-browser-lab/plan.md`.
Test status: `tests.json`.

## Done

- 2026-11-26. Built the integration branch `release/0.19-qwen-lab` from `origin/main`, merging PRs #26 (v0.18.0, which production serves), #29 and #30 without conflicts. Pushed it with upstream tracking.
- Baseline on the merged tree: 12 gates pass and 331/331 tests pass. The worst route's CSS is 69.9 KB of 72 KB. Only 40 of 230 lessons per locale have a figure.
- Confirmed that the CSP has no `media-src`, so `default-src 'none'` blocks video. Motion therefore stays CSS inside the figure system.
- The lab's vendored engines reproduce byte for byte from npm (`@wllama/wllama@2.3.7`, `@mlc-ai/web-llm@0.2.89`). The one exception is `wllama.js`, which carries a one-line patch: it replaces `document.baseURI` with `self.location.href` when `document` is undefined, as it is in a Worker.
- Changed the reader contract in `docs/WRITING.md` and `PRODUCT.md` to a first-year university student in any field. WRITING.md also gains two tools: draw a process instead of describing it, and say what code does before showing it.

## In progress

- Fresh-context red team of the plan.

## Next

- Motion upgrade: replay on step change, grid fill, a print reset. Then the pilot on track 0.
