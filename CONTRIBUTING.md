# Contributing

Thanks for considering it. This is a course as much as a codebase, so there are
two very different ways to help.

## Translations (the most useful contribution)

Every lesson exists in English and Brazilian Portuguese. A missing translation
**fails the build** by design, so translation work is never optional debt.

If you translate a lesson: keep industry-standard English terms (*embedding*,
*attention*, *fine-tuning*) as-is inside Portuguese prose — that is how the
field is actually spoken in Brazil. Translate the explanation, not the jargon.
Correct accents and diacritics are required.

## Content corrections

If a claim is wrong, open an issue with the primary source. Citations matter
more than prose here: every empirical claim carries a paper and a year, or an
explicit statement of why none is needed.

Some numbers in Track 11 were hard-won and are documented in `AGENTS.md` under
"Facts that must not drift". If you believe one is wrong, bring evidence — but
please read that section first, because several plausible-sounding corrections
are the errors it exists to prevent.

## Code

```bash
pnpm install && pnpm build && pnpm typecheck && pnpm lint && pnpm test
```

All must pass, plus the content checks (`pnpm content:parity`, `content:stubs`,
`content:graph`, `content:citations`, `content:assets`) and `pnpm budget`.
CI runs exactly these.

Read `AGENTS.md` before non-trivial changes. The invariants there are load-bearing:
no personalised HTML, no teach-back text leaving the browser, no Three.js on the
critical path, no `any`.

## Licence

By contributing you agree your work is MIT licensed. If you add an asset, add
its source and licence to `NOTICE.md` in the same commit.
