SUPERGOAL_PHASE_START
Phase: 12 of 12 — Polish & Harden (mandatory final phase)
Task: Deliver: Polish & Harden (mandatory final phase).
Type: greenfield, ui, content, perf
Mandatory commands: `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `node scripts/bench.mjs --iter 20 --all-routes --target production`, `pnpm qa`
Acceptance criteria: 9
Evidence required: 1 item(s)
Depends on phases: 11

## Why

Deliver: Polish & Harden (mandatory final phase).

## Work

- security headers + CSP by hash; SEO completeness; a11y audit; error/empty/ loading states; privacy page (cookieless analytics or none, LGPD/GDPR-honest); docs (`README`, `AGENTS.md`, `FOR_YOU_KNOW.md`, `MEMORY.md`, `CHANGELOG.md`); production deploy on `llmdeepdive.com`; rollback runbook.

## Acceptance criteria (all must pass — verify each in transcript)

- CSP present with no `unsafe-inline` for scripts; HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` set. Verified by `curl -I` against production.
- `security-audit` skill run; every finding either fixed or explicitly accepted in writing with a reason.
- Automated a11y audit across ≥20 pages in both languages reports zero critical/serious violations; remaining items listed with justification.
- Every error/empty/loading state has a designed treatment; screenshot evidence for 404, search-no-results, offline, WebGL-unavailable, API-unreachable.
- Lighthouse (or equivalent) on 5 representative pages: Performance ≥ 95, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 95 — actual numbers printed, not claimed.
- Production deployed to `https://llmdeepdive.com`, verified by `versions list` + live smoke returning 200 with the expected content marker.
- **Final gate re-run on production:** 100% of routes p95 < 50 ms, full table printed.
- `MEMORY.md`, `FOR_YOU_KNOW.md` and `CHANGELOG.md` reflect the shipped state.
- `autoreview` run with zero accepted-and-unfixed findings.

## Mandatory commands (run each, surface last ~10 lines + exit code)

- `pnpm build`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `node scripts/bench.mjs --iter 20 --all-routes --target production`
- `pnpm qa`

## Evidence required in transcript

- Exit code and last ~10 lines of every mandatory command.

## Notes

- Project root is /Users/mneves/dev/MEUS_SITES/llmdeepdive.com — prefix shell commands with
  `cd /Users/mneves/dev/MEUS_SITES/llmdeepdive.com &&` because the harness resets cwd.
- Run wrangler and vite under Node, never Bun: `node node_modules/wrangler/bin/wrangler.js …`.
- Never trust wrangler deploy stdout; verify with `versions list` plus a live edge smoke.
- Keystone invariant: no HTML response may vary per visitor. Reject any change that breaks it.
- Perf deltas under 5% are noise on this machine — report them as such, never as a win.
- Full context: ../ROADMAP.md, ../THINKING.md, ../CURRICULUM.md.
