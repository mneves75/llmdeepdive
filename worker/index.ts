/**
 * Thin entrypoint. Only /api/* reaches this Worker — `run_worker_first` in
 * wrangler.jsonc scopes it — so HTML, CSS, fonts and JS are served by the asset
 * layer without ever starting an isolate.
 *
 * Re-exports from a plain module so tests can import the handler without
 * pulling in `cloudflare:workers`.
 */
export { default } from './api'
