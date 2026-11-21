# Production readiness ledger

Schema: 1 · Catalog: 3 · Unit: static website · Stage: live · Visibility: public

- Profile: `ui` and `i18n` from `src/pages/`, `src/content/lessons/`, and `astro.config.mjs`. The two deployment environments serve one static website. The asset-only configuration in `wrangler.jsonc` has no runtime, bindings, or product integrations. The Python exercises run separately on the learner's machine or against synthetic CI fixtures.
- Stake: the course is free, open source, and account-free. Learner drafts and completion are held in the reader's browser. The operator has no customer records, payment flow, or declared availability commitment. See `PRODUCT.md`, `SECURITY.md`, `src/components/TeachBack.astro`, and `src/lib/progress-client.ts`.
- Contracts: none declared. Scope evidence shows no sales, accounts, health or payment data, or EU consumer-contract flow. The course is maintained independently by an individual. The [EU accessibility directive's covered services](https://eur-lex.europa.eu/eli/dir/2019/0882) and [article 63 of Brazil's inclusion law](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13146.htm) were checked against this operating profile. Changes to the operator, service or markets require reassessment.
- Baseline: provisional assessment on 2026-11-21 of the working tree at `af3f985f55f999e543286121fecd89ac27b65800`. All evidence below is dated to this assessment unless noted. Maximum baseline age is 90 days. Cursors are pending a binding run for each target.
- Owners: site maintainer for delivery, runtime maintenance and product scope. The release operator coordinates testing and evidence. The independent verifier reviews the frozen production candidate.
- This baseline records source and observed checks available during review. The release operator records the final candidate, target results, any dated waivers, and restricted provider or security evidence in the private release records.

| ID | Status | Tier | Evidence and scope | Owner | Next action or waiver |
|---|---|---|---|---|---|
| DM-01 | NOT APPLICABLE | blocker | Source · `wrangler.jsonc` and `SECURITY.md`. Public content is rebuilt from Git. Learner storage belongs to the browser. | Maintainer | — |
| DM-02 | NOT APPLICABLE | blocker | Source · `wrangler.jsonc` and `SECURITY.md`. Public content is rebuilt from Git. Learner storage belongs to the browser. | Maintainer | — |
| DM-03 | NOT APPLICABLE | blocker | Source · `wrangler.jsonc` and `SECURITY.md`. Public content is rebuilt from Git. Learner storage belongs to the browser. | Maintainer | — |
| DM-04 | NOT APPLICABLE | blocker | Source · `wrangler.jsonc` and `SECURITY.md`. Public content is rebuilt from Git. Learner storage belongs to the browser. | Maintainer | — |
| DM-05 | NOT APPLICABLE | blocker | Source · `wrangler.jsonc` and `SECURITY.md`. Public content is rebuilt from Git. Learner storage belongs to the browser. | Maintainer | — |
| DM-06 | NOT APPLICABLE | advisory | Source · `wrangler.jsonc` and `SECURITY.md`. Public content is rebuilt from Git. Learner storage belongs to the browser. | Maintainer | — |
| DM-07 | NOT APPLICABLE | advisory | Source · `wrangler.jsonc` and `SECURITY.md`. Public content is rebuilt from Git. Learner storage belongs to the browser. | Maintainer | — |
| BR-01 | NOT APPLICABLE | blocker | Source · `wrangler.jsonc` and `SECURITY.md`. Public content is rebuilt from Git. Learner storage belongs to the browser. | Maintainer | — |
| BR-02 | NOT APPLICABLE | blocker | Source · `wrangler.jsonc` and `SECURITY.md`. Public content is rebuilt from Git. Learner storage belongs to the browser. | Maintainer | — |
| BR-03 | NOT APPLICABLE | blocker | Source · `wrangler.jsonc` and `SECURITY.md`. Public content is rebuilt from Git. Learner storage belongs to the browser. | Maintainer | — |
| BR-04 | NOT APPLICABLE | advisory | Source · The free static course has no customer records, payments, or SLA. See the profile above. | Maintainer | — |
| BR-05 | NOT APPLICABLE | contract | Source · The free static course has no customer records, payments, or SLA. See the profile above. | Maintainer | — |
| DC-01 | PASS | blocker | Local · Playwright WebKit on the rebuilt site in EN and pt-BR preserved a synthetic teach-back fixture exactly across reload, including accents, combining marks, punctuation, emoji, Arabic and Hebrew. Clear and reload also passed in both locales. There are no email or account fields. | Release operator | — |
| DC-02 | NOT APPLICABLE | blocker | Source · `wrangler.jsonc`, `astro.config.mjs` and `package.json`. The deployable unit is static assets. No scheduled events or external mutations. | Maintainer | — |
| DC-03 | NOT APPLICABLE | blocker | Source · `PRODUCT.md` and `wrangler.jsonc`. The course is free and has no payment system. Cost examples are local calculations. | Maintainer | — |
| DC-04 | NOT APPLICABLE | blocker | Source · `PRODUCT.md` and `wrangler.jsonc`. The course is free and has no payment system. Cost examples are local calculations. | Maintainer | — |
| DC-05 | NOT APPLICABLE | blocker | Source · `wrangler.jsonc`, `astro.config.mjs` and `package.json`. The deployable unit is static assets. No scheduled events or external mutations. | Maintainer | — |
| DC-06 | NOT APPLICABLE | advisory | Source · `wrangler.jsonc`, `astro.config.mjs` and `package.json`. The deployable unit is static assets. Inputs do not submit records. | Maintainer | — |
| DC-07 | NOT APPLICABLE | advisory | Source · `wrangler.jsonc` and `SECURITY.md`. Public content is rebuilt from Git. Learner storage belongs to the browser. Track and lesson lists are generated at build time. | Maintainer | — |
| DC-08 | NOT APPLICABLE | advisory | Source · `PRODUCT.md` and `SECURITY.md`. Course access is account-free. | Maintainer | — |
| DC-09 | NOT APPLICABLE | advisory | Source · `src/pages/` and `wrangler.jsonc`. Public routes serve course pages and assets. The course accepts no imports. | Maintainer | — |
| DC-10 | NOT APPLICABLE | contract | Source · `wrangler.jsonc` and `SECURITY.md`. Public content is rebuilt from Git. Learner storage belongs to the browser. There is no declared operator retention commitment. | Maintainer | — |
| DEL-01 | NOT TESTED | advisory | Source · `wrangler.jsonc` deploys `dist/` with the same asset routing in both environments. Hosting names and domain routes differ. | Release operator | Prove the frozen build on staging. |
| DEL-02 | NOT TESTED | advisory | Source · `wrangler.jsonc` versions asset and route settings. `AGENTS.md` documents the zone redirect and Search Console records. | Maintainer | Assess provider drift when those settings change. |
| DEL-03 | NOT TESTED | blocker | Source · `.github/workflows/ci.yml` and `README.md` specify build, types, lint, tests, browser and content gates. | Release operator | Attach the results from a clean checkout of the pushed candidate. |
| DEL-04 | NOT TESTED | blocker | Source · historical tags and `SECURITY.md` show rebuild/redeploy recovery. Cloudflare documents [Worker rollback](https://developers.cloudflare.com/workers/configuration/versions-and-deployments/rollbacks/). | Release operator | Exercise a known previous staging version and restore staging. Save the exact production rollback command in the private release evidence. |
| DEL-05 | NOT APPLICABLE | advisory | Source · The free static course has no customer records, payments, or SLA. See the profile above. | Maintainer | — |
| DEL-06 | NOT APPLICABLE | advisory | Source · `wrangler.jsonc`, `astro.config.mjs` and `package.json`. The deployable unit is static assets. The reviewed release has no feature-flag surface. | Maintainer | — |
| DEL-07 | NOT TESTED | advisory | Source · `scripts/bench.mjs` defines route latency checks. No capacity result for this release was reviewed here. | Maintainer | Review capacity evidence if load warrants it. |
| DEL-08 | NOT TESTED | advisory | Source · Cloudflare Static Assets serves fingerprinted bundles and byte-identical public HTML. See `AGENTS.md` and `wrangler.jsonc`. | Release operator | Verify served headers alongside the live asset checks. |
| DEL-09 | BLOCKED | blocker | Production · registrar read confirmed auto-renew and registrar lock, with domain expiry 2027-08-02. Live certificate expiry was 2026-12-29. Source · `wrangler.jsonc` uses managed custom domains. | Maintainer | Owner attests that the renewal payment method is valid and that an expiry alert reaches an operator weeks ahead. |
| ASY-01 | NOT APPLICABLE | advisory | Source · `wrangler.jsonc`, `astro.config.mjs` and `package.json`. The deployable unit is static assets. There is no product scheduler, queue, or integration. | Maintainer | — |
| ASY-02 | NOT APPLICABLE | blocker | Source · `wrangler.jsonc`, `astro.config.mjs` and `package.json`. The deployable unit is static assets. There is no product scheduler, queue, or integration. | Maintainer | — |
| ASY-03 | NOT APPLICABLE | blocker | Source · `wrangler.jsonc`, `astro.config.mjs` and `package.json`. The deployable unit is static assets. There is no product scheduler, queue, or integration. | Maintainer | — |
| ASY-04 | NOT APPLICABLE | blocker | Source · `wrangler.jsonc`, `astro.config.mjs` and `package.json`. The deployable unit is static assets. There is no product scheduler, queue, or integration. | Maintainer | — |
| ASY-05 | NOT TESTED | advisory | Source · `AGENTS.md` defines byte-identical HTML; `scripts/gen-headers.mjs` owns header generation. Course writes occur only in the browser. | Maintainer | Verify replacement assets and cache headers on staging. |
| ASY-06 | NOT APPLICABLE | blocker | Source · `src/pages/` and `wrangler.jsonc`. Public routes serve course pages and assets. There are no webhooks. | Maintainer | — |
| ASY-07 | NOT APPLICABLE | blocker | Source · `src/pages/` and `wrangler.jsonc`. Public routes serve course pages and assets. There are no webhooks. | Maintainer | — |
| ASY-08 | NOT APPLICABLE | advisory | Source · `wrangler.jsonc`, `astro.config.mjs` and `package.json`. The deployable unit is static assets. There are no application API clients. | Maintainer | — |
| ASY-09 | NOT APPLICABLE | blocker | Source · `PRODUCT.md` and `SECURITY.md`. Course access is account-free. There is no product OAuth integration. | Maintainer | — |
| EML-01 | NOT APPLICABLE | blocker | Source · `wrangler.jsonc`, `astro.config.mjs` and `package.json`. The deployable unit is static assets. The product sends no mail. | Maintainer | — |
| EML-02 | NOT APPLICABLE | blocker | Source · `wrangler.jsonc`, `astro.config.mjs` and `package.json`. The deployable unit is static assets. The product sends no mail. | Maintainer | — |
| EML-03 | NOT APPLICABLE | advisory | Source · `wrangler.jsonc`, `astro.config.mjs` and `package.json`. The deployable unit is static assets. The product sends no mail. | Maintainer | — |
| EML-04 | NOT APPLICABLE | advisory | Source · `wrangler.jsonc`, `astro.config.mjs` and `package.json`. The deployable unit is static assets. The product sends no mail. | Maintainer | — |
| CST-01 | NOT TESTED | advisory | Source · no application uploads, exports, or buckets. Provider and CI retention settings were outside the source check. | Maintainer | Review artifact and log retention. |
| CST-02 | NOT APPLICABLE | advisory | Source · The free static course has no customer records, payments, or SLA. See the profile above. | Maintainer | — |
| CST-03 | NOT TESTED | advisory | Source · staging has no Worker code, binding, or schedule. `workers_dev` and `preview_urls` are disabled in source. | Release operator | After production verification, check the staging deployment's address settings, scheduled work, and writes. |
| OBS-01 | NOT TESTED | advisory | Source · Cloudflare observability is enabled in `wrangler.jsonc`. No application logger or production log sample was assessed. | Maintainer | Assess provider telemetry if needed for an incident. |
| OBS-02 | NOT APPLICABLE | advisory | Source · The free static course has no customer records, payments, or SLA. See the profile above. | Maintainer | — |
| OBS-03 | NOT APPLICABLE | advisory | Source · The free static course has no customer records, payments, or SLA. See the profile above. | Maintainer | — |
| OBS-04 | NOT APPLICABLE | advisory | Source · The free static course has no customer records, payments, or SLA. See the profile above. | Maintainer | — |
| OBS-05 | NOT TESTED | advisory | Source · `AGENTS.md` describes Cloudflare edge analytics. Dashboard coverage was outside the assessment. | Maintainer | Record the useful traffic and error views in the handover. |
| OBS-06 | NOT APPLICABLE | advisory | Source · `wrangler.jsonc`, `astro.config.mjs` and `package.json`. The deployable unit is static assets. No cross-service request path. | Maintainer | — |
| OBS-07 | NOT APPLICABLE | advisory | Source · The free static course has no customer records, payments, or SLA. See the profile above. | Maintainer | — |
| OBS-08 | NOT APPLICABLE | advisory | Source · The free static course has no customer records, payments, or SLA. See the profile above. No paging obligation was declared. | Maintainer | — |
| OBS-09 | NOT TESTED | advisory | Owner evidence for an incident review process was unavailable in this baseline. | Maintainer | Record any incident reviews and track follow-up actions. |
| OBS-10 | NOT TESTED | advisory | No separate status page was established in the project documentation. No SLA is declared. | Maintainer | Reassess if public status reporting is adopted. |
| TST-01 | NOT TESTED | advisory | Source · `tests/engineering-math.test.mjs` and `tests/sampling-math.test.mjs` check worked examples. | Release operator | Record the test run for the frozen candidate. |
| TST-02 | NOT APPLICABLE | advisory | Source · `wrangler.jsonc`, `astro.config.mjs` and `package.json`. The deployable unit is static assets. Runtime has no external APIs. | Maintainer | — |
| TST-03 | NOT APPLICABLE | blocker | Source · The free static course has no customer records, payments, or SLA. See the profile above. Browser release verification remains part of the repository gate. | Maintainer | — |
| TST-04 | NOT APPLICABLE | advisory | Source · The free static course has no customer records, payments, or SLA. See the profile above. Browser release verification remains part of the repository gate. | Maintainer | — |
| TST-05 | PASS | blocker | Source and staging · `wrangler.jsonc` declares distinct asset-only Workers. A Wrangler dry run and the release operator's staging version lookup found zero bindings. There is no runtime server or product action. The examples are separate from the deployable unit and use synthetic CI fixtures. | Release operator | Recheck when staging configuration changes. |
| TST-06 | PASS | advisory | Source · `tests/learning-ui.test.mjs` adds regressions for teach-back reset and result keyboard focus. `.github/workflows/ci.yml` invokes the suite. | Maintainer | — |
| TST-07 | NOT TESTED | advisory | Source · `scripts/render-check.mjs` exercises Chromium, WebKit, and Firefox and checks 320 px layouts. A combined low-end CPU and network budget result was unavailable. | Release operator | Retain the candidate browser matrix and measure slowed runs if support targets expand. |
| BIL-01 | NOT APPLICABLE | blocker | Source · `PRODUCT.md` and `wrangler.jsonc`. The course is free and has no payment system. | Maintainer | — |
| BIL-02 | NOT APPLICABLE | blocker | Source · `PRODUCT.md` and `wrangler.jsonc`. The course is free and has no payment system. | Maintainer | — |
| BIL-03 | NOT APPLICABLE | contract | Source · `PRODUCT.md` and `wrangler.jsonc`. The course is free and has no payment system. | Maintainer | — |
| BIL-04 | NOT APPLICABLE | blocker | Source · `PRODUCT.md` and `wrangler.jsonc`. The course is free and has no payment system. | Maintainer | — |
| BIL-05 | NOT APPLICABLE | blocker | Source · `PRODUCT.md` and `wrangler.jsonc`. The course is free and has no payment system. | Maintainer | — |
| BIL-06 | NOT APPLICABLE | blocker | Source · `PRODUCT.md` and `wrangler.jsonc`. The course is free and has no payment system. | Maintainer | — |
| BIL-07 | NOT APPLICABLE | contract | Source · `PRODUCT.md` and `wrangler.jsonc`. The course is free and has no payment system. | Maintainer | — |
| BIL-08 | NOT APPLICABLE | advisory | Source · `PRODUCT.md` and `wrangler.jsonc`. The course is free and has no payment system. | Maintainer | — |
| API-01 | NOT APPLICABLE | blocker | Source · `src/pages/` and `wrangler.jsonc`. Public routes serve course pages and assets. | Maintainer | — |
| API-02 | NOT APPLICABLE | blocker | Source · `src/pages/` and `wrangler.jsonc`. Public routes serve course pages and assets. | Maintainer | — |
| API-03 | NOT APPLICABLE | blocker | Source · `src/pages/` and `wrangler.jsonc`. Public routes serve course pages and assets. | Maintainer | — |
| API-04 | NOT APPLICABLE | contract | Source · `src/pages/` and `wrangler.jsonc`. Public routes serve course pages and assets. | Maintainer | — |
| AI-01 | NOT APPLICABLE | blocker | Source · `wrangler.jsonc`, `astro.config.mjs` and `package.json`. The deployable unit is static assets. AI concepts are taught through published examples and browser simulations. The site calls no model. | Maintainer | — |
| AI-02 | NOT APPLICABLE | blocker | Source · `wrangler.jsonc`, `astro.config.mjs` and `package.json`. The deployable unit is static assets. AI concepts are taught through published examples and browser simulations. The site calls no model. | Maintainer | — |
| AI-03 | NOT APPLICABLE | advisory | Source · `wrangler.jsonc`, `astro.config.mjs` and `package.json`. The deployable unit is static assets. No serving model is configured. | Maintainer | — |
| UX-01 | NOT TESTED | advisory | Source · the explorer and charts are progressively enhanced with lazy WebGL. See `AGENTS.md`. | Release operator | Capture a throttled run. |
| UX-02 | NOT TESTED | advisory | Source · search, labs, teach-back, and exploration have checks in `scripts/render-check.mjs` and `tests/learning-ui.test.mjs`. | Release operator | Record candidate runtime results applicable to this control. UX-05 is the local draft-clear flow. UX-06 also needs a manual keyboard and screen-reader run. |
| UX-03 | NOT TESTED | advisory | Source · search, labs, teach-back, and exploration have checks in `scripts/render-check.mjs` and `tests/learning-ui.test.mjs`. | Release operator | Record candidate runtime results applicable to this control. UX-05 is the local draft-clear flow. UX-06 also needs a manual keyboard and screen-reader run. |
| UX-04 | NOT TESTED | advisory | Source · search, labs, teach-back, and exploration have checks in `scripts/render-check.mjs` and `tests/learning-ui.test.mjs`. | Release operator | Record candidate runtime results applicable to this control. UX-05 is the local draft-clear flow. UX-06 also needs a manual keyboard and screen-reader run. |
| UX-05 | NOT TESTED | advisory | Source · search, labs, teach-back, and exploration have checks in `scripts/render-check.mjs` and `tests/learning-ui.test.mjs`. | Release operator | Record candidate runtime results applicable to this control. UX-05 is the local draft-clear flow. UX-06 also needs a manual keyboard and screen-reader run. |
| UX-06 | NOT TESTED | advisory | Source · search, labs, teach-back, and exploration have checks in `scripts/render-check.mjs` and `tests/learning-ui.test.mjs`. | Release operator | Record candidate runtime results applicable to this control. UX-05 is the local draft-clear flow. UX-06 also needs a manual keyboard and screen-reader run. |
| UX-07 | NOT APPLICABLE | contract | Source and owner profile · `LICENSE`, `PRODUCT.md`, and the operating profile above identify a free, individually maintained educational site with no declared accessibility conformance contract. Inspect accessibility during routine browser verification. | Maintainer | — |
| UX-08 | NOT TESTED | advisory | Source · search, labs, teach-back, and exploration have checks in `scripts/render-check.mjs` and `tests/learning-ui.test.mjs`. | Release operator | Record candidate runtime results applicable to this control. UX-05 is the local draft-clear flow. UX-06 also needs a manual keyboard and screen-reader run. |
| UX-09 | NOT TESTED | advisory | Source · search, labs, teach-back, and exploration have checks in `scripts/render-check.mjs` and `tests/learning-ui.test.mjs`. | Release operator | Record candidate runtime results applicable to this control. UX-05 is the local draft-clear flow. UX-06 also needs a manual keyboard and screen-reader run. |
| MNT-01 | PASS | advisory | Source · Astro components, pure TypeScript math, separate exercises, and CI lint and typecheck. See `AGENTS.md` and `.github/workflows/ci.yml`. | Maintainer | — |
| MNT-02 | NOT APPLICABLE | advisory | Source · The free static course has no customer records, payments, or SLA. See the profile above. The release's independent verification requirement still applies. | Maintainer | — |
| MNT-03 | PASS | advisory | Source · `AGENTS.md` scopes parallel work and reserves the build for one session. `.github/workflows/ci.yml` verifies candidate heads. The versioned history shows working branches and release tags. | Maintainer | — |
| MNT-04 | NOT TESTED | advisory | Source · `pnpm-lock.yaml` is tracked and `package.json` pins dependencies. Git records recent updates. A scheduled cadence was not established. | Maintainer | Confirm and record regular dependency review. |
| MNT-05 | PASS | blocker | Source and release policy · `package.json`, `pnpm-lock.yaml`, and CI pin Astro 7 and Node 22. The [Node.js schedule](https://github.com/nodejs/Release#release-schedule) gives Node 22 maintenance until 2027-04-30. [Astro releases](https://github.com/withastro/astro/releases) show active Astro 7 patches. High and critical findings must be resolved before the next deployment. | Maintainer | Review supported pins and upgrade the Node 22 CI line before its end of life. The exact-candidate dependency audit is SEC-13. |
| MNT-06 | NOT TESTED | advisory | Source · `AGENTS.md` defines lint and complexity checks. No repository-wide unused-code or size inventory was run for this baseline. | Maintainer | Review changed modules and their guardrails. |
| MNT-07 | NOT TESTED | advisory | Source · `AGENTS.md` defines lint and complexity checks. No repository-wide unused-code or size inventory was run for this baseline. | Maintainer | Review changed modules and their guardrails. |
| MNT-08 | PASS | advisory | Source · `docs/adr/0001-markdown-processor.md` and `docs/adr/0002-display-face-and-css-delivery.md` document tooling decisions. `AGENTS.md` documents the static deployment architecture. | Maintainer | — |
| MNT-09 | NOT TESTED | advisory | Source · `README.md` documents setup and local checks. | Release operator | Record the clean candidate checkout and run time. |
| MNT-10 | NOT TESTED | advisory | Source · `README.md`, `AGENTS.md`, and `SECURITY.md` cover architecture, deploy, and recovery. | Maintainer | Consolidate the maintainer roles and recovery steps as operational evidence becomes available. |
| OPS-01 | NOT APPLICABLE | advisory | Source · `PRODUCT.md` and `SECURITY.md`. Course access is account-free. | Maintainer | — |
| OPS-02 | NOT APPLICABLE | advisory | Source · `PRODUCT.md` and `SECURITY.md`. Course access is account-free. | Maintainer | — |
| OPS-03 | PASS | advisory | Source · `CHANGELOG.md` publishes dated release notes. | Maintainer | — |
| OPS-04 | BLOCKED | blocker | Source · `LICENSE` names an individual maintainer. Registrar, DNS, hosting, and repository access are operational dependencies. Administrative recovery evidence is restricted. | Maintainer | Owner records asset ownership, two strong-auth administrators, and recovery available through a vault, or requests a dated control waiver. |
| OPS-05 | NOT APPLICABLE | advisory | Source · The free static course has no customer records, payments, or SLA. See the profile above. | Maintainer | — |
| OPS-06 | NOT APPLICABLE | advisory | Source · The free static course has no customer records, payments, or SLA. See the profile above. | Maintainer | — |
| SEC-01 | NOT TESTED | blocker | The exact-candidate security assessment is pending. Its result supplies this row. | Security verifier | Import candidate result. |
| SEC-02 | NOT TESTED | blocker | The exact-candidate security assessment is pending. Its result supplies this row. | Security verifier | Import candidate result. |
| SEC-03 | NOT TESTED | blocker | The exact-candidate security assessment is pending. Its result supplies this row. | Security verifier | Import candidate result. |
| SEC-04 | NOT TESTED | contract | The exact-candidate security assessment is pending. Its result supplies this row. | Security verifier | Import candidate result. |
| SEC-05 | NOT TESTED | contract | The exact-candidate security assessment is pending. Its result supplies this row. | Security verifier | Import candidate result. |
| SEC-06 | NOT TESTED | blocker | The exact-candidate security assessment is pending. Its result supplies this row. | Security verifier | Import candidate result. |
| SEC-07 | NOT TESTED | blocker | The exact-candidate security assessment is pending. Its result supplies this row. | Security verifier | Import candidate result. |
| SEC-08 | NOT TESTED | blocker | The exact-candidate security assessment is pending. Its result supplies this row. | Security verifier | Import candidate result. |
| SEC-09 | NOT TESTED | advisory | The exact-candidate security assessment is pending. Its result supplies this row. | Security verifier | Import candidate result. |
| SEC-10 | NOT TESTED | blocker | The exact-candidate security assessment is pending. Its result supplies this row. | Security verifier | Import candidate result. |
| SEC-11 | NOT TESTED | blocker | The exact-candidate security assessment is pending. Its result supplies this row. | Security verifier | Import candidate result. |
| SEC-12 | NOT TESTED | blocker | The exact-candidate security assessment is pending. Its result supplies this row. | Security verifier | Import candidate result. |
| SEC-13 | NOT TESTED | blocker | The exact-candidate security assessment is pending. Its result supplies this row. | Security verifier | Import candidate result. |
| SEC-14 | NOT TESTED | blocker | The exact-candidate security assessment is pending. Its result supplies this row. | Security verifier | Import candidate result. |
| SEC-15 | NOT TESTED | blocker | The exact-candidate security assessment is pending. Its result supplies this row. | Security verifier | Import candidate result. |
| SEC-16 | NOT TESTED | blocker | The exact-candidate security assessment is pending. Its result supplies this row. | Security verifier | Import candidate result. |
| SEC-17 | NOT TESTED | blocker | The exact-candidate security assessment is pending. Its result supplies this row. | Security verifier | Import candidate result. |
| SEC-18 | NOT TESTED | blocker | The exact-candidate security assessment is pending. Its result supplies this row. | Security verifier | Import candidate result. |
| SEC-19 | NOT TESTED | contract | The exact-candidate security assessment is pending. Its result supplies this row. | Security verifier | Import candidate result. |
| SEC-20 | NOT TESTED | advisory | The exact-candidate security assessment is pending. Its result supplies this row. | Security verifier | Import candidate result. |
| SEC-21 | NOT TESTED | advisory | The exact-candidate security assessment is pending. Its result supplies this row. | Security verifier | Import candidate result. |
| SEC-22 | NOT TESTED | blocker | The exact-candidate security assessment is pending. Its result supplies this row. | Security verifier | Import candidate result. |
| SEC-23 | NOT TESTED | blocker | The exact-candidate security assessment is pending. Its result supplies this row. | Security verifier | Import candidate result. |
| CMP-01 | NOT TESTED | contract | The exact-candidate security assessment is pending. Its result supplies this row. | Security verifier | Import candidate result. |
| CMP-02 | NOT TESTED | contract | The exact-candidate security assessment is pending. Its result supplies this row. | Security verifier | Import candidate result. |
| CMP-03 | NOT TESTED | blocker | The exact-candidate security assessment is pending. Its result supplies this row. | Security verifier | Import candidate result. |
| CMP-04 | NOT TESTED | contract | The exact-candidate security assessment is pending. Its result supplies this row. | Security verifier | Import candidate result. |
| CMP-05 | NOT TESTED | blocker | The exact-candidate security assessment is pending. Its result supplies this row. | Security verifier | Import candidate result. |
| CMP-06 | NOT TESTED | blocker | The exact-candidate security assessment is pending. Its result supplies this row. | Security verifier | Import candidate result. |
| CMP-07 | NOT TESTED | contract | The exact-candidate security assessment is pending. Its result supplies this row. | Security verifier | Import candidate result. |
| CMP-08 | NOT TESTED | contract | The exact-candidate security assessment is pending. Its result supplies this row. | Security verifier | Import candidate result. |
| CMP-09 | NOT TESTED | blocker | The exact-candidate security assessment is pending. Its result supplies this row. | Security verifier | Import candidate result. |

## Release evidence to complete

- **Before the production decision.** The release operator records the source and check results for the exact pushed candidate (DEL-03) and carries in the same-candidate security result. Each check must cite its command or receipt and outcome.
- **Rollback.** The release operator lists staging deployments and records the baseline version. After the staging gate permits it, exercise `pnpm exec wrangler rollback PREVIOUS_VERSION --env staging`, confirm traffic and served content match the selected version, then return staging to the authorized state. Keep version identifiers in the private release evidence. Capture the corresponding rollback command for production and rerun `pnpm verify:live --target production` if recovery is needed. (DEL-04)
- **Owner evidence.** Confirm registrar payment and expiry monitoring (DEL-09), along with strong authentication and recovery arrangements for administrative assets (OPS-04). Use a dated private attestation. If a control is unmet, record its own waiver and expiry only when authorized by the owner.
- **Acceptance.** A verifier who did not assess the baseline checks each applicable blocker and every applicability decision against the frozen candidate. Capture separate staging and production decisions. After a production deploy, record the served asset checks and staging idle state (CST-03).

## Gate history

| Date | Target | Commit | Verdict | Open blockers | Waivers |
|---|---|---|---|---|---|
| — | — | — | Awaiting binding assessment | — | — |
