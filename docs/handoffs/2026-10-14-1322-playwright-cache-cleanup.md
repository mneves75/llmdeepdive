# Handoff: llmdeepdive 0.12.0 shipped; one cleanup step left

## Goal

Owner request (2026-10-13): review every lesson for a junior developer (Feynman style), then the full pipeline through production. That is done. The owner then asked to remove leftovers: merged branches, `.scratch/`, and Playwright's WebKit and Firefox downloads.

## Status

Done:
- 0.12.0 live. `main` = `3ebaaa7`, in sync with origin; tree clean.
- Tags: `v0.12.0` on `baca722` → production version `7c7ab70a`; `v0.12.0-beta3` on `baca722` → staging version `0375e686`. `verify:live` PASS on both (939 files byte-identical, Chromium/WebKit/Firefox).
- Independent verification: round 1 (gpt-6.1-sol via Codex) FAIL with 3 findings, all fixed in PR #15. Fresh full reverify (Fable 5.1 subagent, because Codex refused at 13 GB free disk) PASS on criteria 1–4 and confirmed the fixes. Criterion 5 was closed by the production `verify:live` run afterwards, with no verifier re-run.
- `MEMORY.md` 0.12.0 entry committed as `3ebaaa7` and pushed.
- Deleted branches: `release/0.12.0`, `fix/0.12.0-verify`, `feat/feynman-rewrite` (local only, was `06177ec`, never pushed), and `feat/neutral-field-edition` (`d332000`) plus `fix/og-image-cache-key` (`335f17f`), both local and remote; both were fully merged.
- `.scratch/` in the repo: all 83 files and the folder removed. The session scratchpad and old handoffs were removed too.

Not done (blocked by the command guard dcg):
- Removing `~/Library/Caches/ms-playwright/webkit-2359` (296 MB) and `~/Library/Caches/ms-playwright/firefox-1543` (290 MB). `rm -rf` was blocked: "rm -rf is destructive and requires human approval", allow-once id `106288`.

## Decisions

- Keep `chromium-1243`, `chromium_headless_shell-1243` and `ffmpeg-1011`, because the repo's gates use Chromium.
- After removal, `pnpm render:check` and `pnpm verify:live` need WebKit and Firefox again: `pnpm exec playwright install webkit firefox`.

## Dead ends

- `scratch clean` refuses loose files ("not a real directory"); delete loose `.scratch` files with plain `rm -f -- <files>`.
- dcg blocks `find … -exec rm`, `rm -rf` outside literal /tmp, heredocs, and `git branch -D`. An allow-once id only covers the exact command string it was issued for.
- zsh aborts a whole `rm` command when one glob has no matches ("no matches found").

## Next steps

1. If the owner ran `! dcg allow-once 106288 --yes`, re-run exactly: `rm -rf /Users/mneves/Library/Caches/ms-playwright/webkit-2359 /Users/mneves/Library/Caches/ms-playwright/firefox-1543 && echo removed; ls /Users/mneves/Library/Caches/ms-playwright/`. Otherwise the owner removes them with `! rm -rf ~/Library/Caches/ms-playwright/webkit-2359 ~/Library/Caches/ms-playwright/firefox-1543`.
2. Report the space freed. Nothing else is pending for 0.12.0.

## Open questions

- None besides the allow-once approval. GitHub printed a Dependabot security notice on push; it was not investigated and is outside this task unless the owner asks.
