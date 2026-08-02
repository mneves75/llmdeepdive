SUPERGOAL_PHASE_START
Phase: 4 of 12 — WebGL harness & first visualizations
Task: The shared renderer must exist before twelve scenes are written, or they become
Type: greenfield, ui, content, perf
Mandatory commands: `pnpm build`, `pnpm typecheck`, `pnpm lint`, `node scripts/bundle-budget.mjs`, `node scripts/bench.mjs --iter 20`
Acceptance criteria: 8
Evidence required: 1 item(s)
Depends on phases: 2, 3

## Why

The shared renderer must exist before twelve scenes are written, or they become
twelve independent WebGL contexts to unpick.

## Work

- Shared renderer harness: single WebGL context checked out per scene, poster-first rendering, `IntersectionObserver` mount, rAF paused when offscreen **or** tab hidden, full `dispose()` on unmount, `prefers-reduced-motion` → poster + manual opt-in
- Per-scene KB budget manifest + a CI check asserting it
- Visualizations 1–4: 3D vector explorer (0.4), linear-transform morph (0.5), embedding space explorer (1.5), loss landscape descent (2.6)

## Acceptance criteria (all must pass — verify each in transcript)

- A page with all 4 scenes creates **at most one** `WebGLRenderingContext`/`WebGL2` context, asserted in-browser.
- rAF callback count is 0 while a scene is scrolled offscreen and 0 while the tab is hidden — asserted by instrumented counter in a real browser, printed as evidence.
- Unmounting a scene releases GPU resources: `renderer.info.memory.geometries` and `.textures` return to baseline; printed before/after.
- With JS disabled, every visualization still shows its poster image and caption.
- `prefers-reduced-motion: reduce` yields a static poster and no rAF loop until opt-in.
- No route's initial JS payload grows by more than its declared budget; budget check exits 0.
- Lesson routes containing a visualization still measure p95 < 50 ms.
- Screenshot evidence of each of the 4 scenes rendered.

## Mandatory commands (run each, surface last ~10 lines + exit code)

- `pnpm build`
- `pnpm typecheck`
- `pnpm lint`
- `node scripts/bundle-budget.mjs`
- `node scripts/bench.mjs --iter 20`

## Evidence required in transcript

- context-count assertion, rAF counters, GPU memory before/after, 4 screenshots.

## Notes

- Project root is /Users/mneves/dev/MEUS_SITES/llmdeepdive.com — prefix shell commands with
  `cd /Users/mneves/dev/MEUS_SITES/llmdeepdive.com &&` because the harness resets cwd.
- Run wrangler and vite under Node, never Bun: `node node_modules/wrangler/bin/wrangler.js …`.
- Never trust wrangler deploy stdout; verify with `versions list` plus a live edge smoke.
- Keystone invariant: no HTML response may vary per visitor. Reject any change that breaks it.
- Perf deltas under 5% are noise on this machine — report them as such, never as a win.
- Full context: ../ROADMAP.md, ../THINKING.md, ../CURRICULUM.md.
