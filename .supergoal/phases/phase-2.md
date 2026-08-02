SUPERGOAL_PHASE_START
Phase: 2 of 12 — Design system & visual identity
Task: The visual language must exist before 100+ content pages are written against it,
Type: greenfield, ui, content, perf
Mandatory commands: `pnpm build`, `pnpm typecheck`, `pnpm lint`, `node scripts/a11y-contrast.mjs`
Acceptance criteria: 7
Evidence required: 1 item(s)
Depends on phases: 1

## Why

The visual language must exist before 100+ content pages are written against it,
or every page needs retrofitting.

## Work

- Design tokens (color, type scale, spacing, radii, motion) as CSS custom properties
- Dark-first theme + light theme, switchable, respecting `prefers-color-scheme`
- Typography system with self-hosted variable fonts, subset, `font-display: swap`
- Core components: header, track sidebar, lesson layout, breadcrumb, prev/next, callout (note/warning/insight/math), code block with copy + language label, figure/caption, quiz shell, progress indicator, footer, 404, search modal shell
- `/design` internal reference page rendering every component in every state
- Accessibility baseline: focus-visible everywhere, skip link, landmark regions

## Acceptance criteria (all must pass — verify each in transcript)

- `/design` renders every component listed above; screenshot evidence at 390 px, 768 px and 1440 px in both themes (6 screenshots minimum).
- Every text/background pair on `/design` meets WCAG AA (≥4.5:1 body, ≥3:1 large), verified by a computed-contrast script that exits non-zero on failure — not by eye.
- Keyboard-only traversal of `/design` reaches every interactive element with a visible focus ring; evidenced by an automated tab-order dump.
- Zero layout shift on `/design`: measured CLS = 0.
- Fonts are self-hosted (no third-party font requests in the network log) and total font payload ≤ 120 KB.
- Theme toggle persists across reload. No flash of wrong theme, established two ways: (a) a synchronous inline `<script>` in `<head>` sets the theme attribute before any stylesheet paints — asserted by a test that the script exists, is not `defer`/`async`, and precedes the first `<link rel=stylesheet>` in the emitted HTML; (b) a browser trace confirms the `<html>` theme attribute never changes value after first paint.
- `pnpm build`, `pnpm typecheck`, `pnpm lint` all exit 0.

## Mandatory commands (run each, surface last ~10 lines + exit code)

- `pnpm build`
- `pnpm typecheck`
- `pnpm lint`
- `node scripts/a11y-contrast.mjs`

## Evidence required in transcript

- the 6+ screenshots, contrast script output, tab-order dump.

## Notes

- Project root is /Users/mneves/dev/MEUS_SITES/llmdeepdive.com — prefix shell commands with
  `cd /Users/mneves/dev/MEUS_SITES/llmdeepdive.com &&` because the harness resets cwd.
- Run wrangler and vite under Node, never Bun: `node node_modules/wrangler/bin/wrangler.js …`.
- Never trust wrangler deploy stdout; verify with `versions list` plus a live edge smoke.
- Keystone invariant: no HTML response may vary per visitor. Reject any change that breaks it.
- Perf deltas under 5% are noise on this machine — report them as such, never as a win.
- Full context: ../ROADMAP.md, ../THINKING.md, ../CURRICULUM.md.
