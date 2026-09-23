// Deploy targets shared by the bench and verify:live. Staging lives on an
// account-specific *.workers.dev subdomain, so it comes from the environment
// rather than being baked into the repo.
export const TARGETS = {
  production: 'https://llmdeepdive.com',
  staging: process.env.BENCH_STAGING_URL ?? null,
  local: 'http://127.0.0.1:8787',
}

/** The base URL for `--target` or `--base`, without a trailing slash. */
export function resolveBase(target, base) {
  const url = base ?? TARGETS[target]
  if (!url) {
    throw new Error(
      target in TARGETS
        ? `--target ${target} has no URL configured. Set BENCH_STAGING_URL, or pass --base <url>.`
        : `Unknown --target ${target}. Use one of: ${Object.keys(TARGETS).join(', ')}`,
    )
  }
  return url.replace(/\/$/, '')
}
