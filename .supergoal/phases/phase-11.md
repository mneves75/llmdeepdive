SUPERGOAL_PHASE_START
Phase: 11 of 12 — Full browser QA of every feature
Task: The user's bar is "100% of features working as designed", which only a real browser
Type: greenfield, ui, content, perf
Mandatory commands: `pnpm build`, `pnpm qa`, `pnpm test`
Acceptance criteria: 8
Evidence required: 1 item(s)
Depends on phases: 10

## Why

The user's bar is "100% of features working as designed", which only a real browser
can establish.

## Work

- an executable QA suite covering every feature in both languages on mobile and desktop viewports, plus a written QA report with per-feature pass/fail and screenshots.

## Acceptance criteria (all must pass — verify each in transcript)

- Every navigational surface exercised: home, both language roots, all 11 track indexes, a sample of ≥20 lessons per language, course map, search, 404.
- All 12 visualizations loaded, rendered and screenshotted in a real browser; each confirmed interactive (a scripted interaction changes the rendered output, verified by pixel diff).
- Every quiz answered correctly and incorrectly; correct feedback shown in both cases.
- Progress: complete a lesson → reload → still complete → clear data → reset. Verified.
- Language switch from any lesson lands on the same lesson in the other language, for ≥10 sampled lessons.
- Zero console errors and zero failed network requests across the entire sweep; the log is printed as evidence.
- Mobile (390 px) and desktop (1440 px) both pass; no horizontal scroll at 320 px.
- Every failure found is fixed and re-verified in the same phase; the report lists what was found and what was fixed.

## Mandatory commands (run each, surface last ~10 lines + exit code)

- `pnpm build`
- `pnpm qa`
- `pnpm test`

## Evidence required in transcript

- QA report, screenshot set, console/network log.

## Notes

- Project root is /Users/mneves/dev/MEUS_SITES/llmdeepdive.com — prefix shell commands with
  `cd /Users/mneves/dev/MEUS_SITES/llmdeepdive.com &&` because the harness resets cwd.
- Run wrangler and vite under Node, never Bun: `node node_modules/wrangler/bin/wrangler.js …`.
- Never trust wrangler deploy stdout; verify with `versions list` plus a live edge smoke.
- Keystone invariant: no HTML response may vary per visitor. Reject any change that breaks it.
- Perf deltas under 5% are noise on this machine — report them as such, never as a win.
- Full context: ../ROADMAP.md, ../THINKING.md, ../CURRICULUM.md.
