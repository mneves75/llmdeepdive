export interface Env {
  ASSETS: Fetcher
  APP_BASE_URL: string
}

/** Every JSON response is uncacheable by default; nothing here is personalised. */
function json(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...(init.headers ?? {}),
    },
  })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/api/health') {
      return json({ ok: true, service: 'llmdeepdive', base: env.APP_BASE_URL })
    }

    if (url.pathname.startsWith('/api/')) {
      return json({ error: 'not_found' }, { status: 404 })
    }

    // Unreachable while run_worker_first is scoped to /api/*, but a correct
    // fallback if that scope is ever widened.
    return env.ASSETS.fetch(request)
  },
}
