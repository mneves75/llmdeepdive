SUPERGOAL_PHASE_START
Phase: 1 of 12 — Foundation, edge & the honest bench
Task: Nothing can be measured or trusted until the site is on the real edge and the
Type: greenfield, ui, content, perf
Mandatory commands: `pnpm install`, `pnpm build`, `pnpm typecheck`, `pnpm lint`, `node scripts/bench.mjs --iter 20`
Acceptance criteria: 8
Evidence required: 1 item(s)
Depends on phases: none

## Why

Nothing can be measured or trusted until the site is on the real edge and the
measuring instrument has been proven able to fail.

## Work

- `package.json`, `pnpm-workspace.yaml`, `tsconfig.json` (strict, no `any`)
- Astro project scaffold with TypeScript + Tailwind v4
- `wrangler.jsonc` — one Worker, static assets + `/api/*`, `staging` and `production` envs each redeclaring assets/vars/bindings
- `src/worker/index.ts` thin entrypoint
- `scripts/bench.mjs` — the performance harness
- `scripts/check.mjs` — aggregate gate (build + typecheck + lint + tests)
- `AGENTS.md`, `CLAUDE.md`, `README.md`, `MEMORY.md`, `FOR_YOU_KNOW.md`, `CHANGELOG.md`
- `.gitignore`, git repo initialized, ast-grep kit installed with pre-commit hook
- Deployed staging Worker + `llmdeepdive.com` zone verified reachable

## Acceptance criteria (all must pass — verify each in transcript)

- `pnpm build` exits 0 and emits `dist/` containing at least one HTML file.
- `pnpm typecheck` exits 0 with `strict: true` and zero errors.
- `ast-grep scan` exits 0; the `no-explicit-any` rule is present and error-severity.
- `wrangler deploy --env staging` succeeds, verified by `versions list` showing the new version ID **and** a live 200 from the staging URL (not by deploy stdout).
- `dig +short llmdeepdive.com` returns Cloudflare IPs and `https://llmdeepdive.com/` returns 200 from the deployed Worker.
- `scripts/bench.mjs` accepts `--iter` (default 20, minimum enforced at 16), records `os.loadavg()` per run, and prints per-route `n`, p50, p95 computed as a true percentile.
- **The bench is proven able to fail:** a deliberately delayed probe route is added, bench run against it exits non-zero and reports it over budget; the probe is then removed and the removal verified by `grep`. Both the red and green transcripts are shown.
- The bench asserts a **per-page unique content marker** supplied per route, and fails if a route returns 200 without its marker. Demonstrated by pointing a route at a wrong marker and observing a failure.

## Mandatory commands (run each, surface last ~10 lines + exit code)

- `pnpm install`
- `pnpm build`
- `pnpm typecheck`
- `pnpm lint`
- `node scripts/bench.mjs --iter 20`

## Evidence required in transcript

- full transcripts of the bench RED run and GREEN run; `versions list` output; `curl -sI https://llmdeepdive.com/` headers.

## Notes

- Project root is /Users/mneves/dev/MEUS_SITES/llmdeepdive.com — prefix shell commands with
  `cd /Users/mneves/dev/MEUS_SITES/llmdeepdive.com &&` because the harness resets cwd.
- Run wrangler and vite under Node, never Bun: `node node_modules/wrangler/bin/wrangler.js …`.
- Never trust wrangler deploy stdout; verify with `versions list` plus a live edge smoke.
- Keystone invariant: no HTML response may vary per visitor. Reject any change that breaks it.
- Perf deltas under 5% are noise on this machine — report them as such, never as a win.
- Full context: ../ROADMAP.md, ../THINKING.md, ../CURRICULUM.md.
