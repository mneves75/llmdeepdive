# Security

## Reporting a vulnerability

Write to **contato@mvneves.dev** with a description, the affected page or file,
and steps to reproduce. Please do not open a public issue for a vulnerability
until it is fixed. The same address is published in
[`/.well-known/security.txt`](https://llmdeepdive.com/.well-known/security.txt)
(RFC 9116).

## Scope

- **The site, llmdeepdive.com.** Static pages served from Cloudflare Workers
  Static Assets, with a hash-pinned Content-Security-Policy. There is no
  server, account, form submission or database: what a learner writes stays in
  their browser (`localStorage`).
- **The exercises in `examples/agent-engineering/`.** Educational code that runs
  on the learner's own machine with synthetic data. A flaw that would mislead a
  learner into an unsafe pattern is in scope; the project is not deployed.

Only the version currently live on llmdeepdive.com is supported.

## Maintainer runbook: leaked credential or lost device

The site deploys with the maintainer's interactive Wrangler login; no deploy
token is stored in this repository or in CI, and CI holds no secret that can
deploy.

1. **Revoke.** Sign out every Cloudflare session and revoke any API token that
   could deploy the Worker; sign out GitHub sessions and remove SSH keys or
   tokens from the lost device.
2. **Check what changed.** Compare `wrangler versions list` and the Worker's
   deployment history with the release tags; review the Cloudflare and GitHub
   audit logs for the exposure window.
3. **Restore.** Redeploy the last release tag whose message records a passing
   security gate, then run `pnpm verify:live --target production`.
4. **Rotate and record.** Create fresh credentials only after revocation, and
   note the incident, its window and the rotation in the project's private
   records.

Devices that can deploy keep full-disk encryption and a screen lock on.
