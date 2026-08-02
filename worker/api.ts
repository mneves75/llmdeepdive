/**
 * The only server-side surface on the site.
 *
 * Scoped to `/api/*` by `run_worker_first` in wrangler.jsonc, so no HTML, CSS,
 * font or JS request ever starts this isolate.
 *
 * Design rules, all load-bearing:
 *  - **No HTML is produced here.** Every page is static and identical for every
 *    visitor; nothing in this file can make a page vary per user.
 *  - **No free text is accepted or stored.** Teach-back prose stays in the
 *    browser. The schema has no column for it and neither does any handler.
 *  - **Progress sync is optional.** The site is fully usable with this Worker
 *    unreachable; the client is localStorage-first and treats sync as a bonus.
 */

export interface Env {
  ASSETS: Fetcher
  DB: D1Database
  APP_BASE_URL: string
}

const TOKEN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const LESSON_RE = /^\d+\.\d+-[a-z0-9]+(?:-[a-z0-9]+)*$/
const LOCALES = new Set(['en', 'pt-br'])
const SIGNALS = new Set(['too_easy', 'about_right', 'too_hard', 'unclear'])

const MAX_BODY_BYTES = 4096
const RATE_LIMIT_PER_MIN = 60

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // Nothing here is ever shared-cacheable: it is either per-token or a write.
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer',
    },
  })
}

const bad = (msg: string): Response => json({ error: msg }, 400)

/**
 * In-isolate sliding-window limiter. Deliberately modest: it blunts accidental
 * loops and casual abuse. It is per-isolate, so it is not a hard security
 * control — the real protection is that every endpoint is cheap, anonymous by
 * design, and stores nothing sensitive.
 */
const hits = new Map<string, number[]>()
function rateLimited(key: string, now: number): boolean {
  const windowStart = now - 60_000
  const recent = (hits.get(key) ?? []).filter((t) => t > windowStart)
  recent.push(now)
  hits.set(key, recent)
  if (hits.size > 5000) hits.clear() // bound memory; correctness does not depend on it
  return recent.length > RATE_LIMIT_PER_MIN
}

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  const raw = await request.text()
  if (raw.length > MAX_BODY_BYTES) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null
    return parsed as Record<string, unknown>
  } catch {
    return null
  }
}

const str = (v: unknown): string | null => (typeof v === 'string' ? v : null)
const bool = (v: unknown): boolean => v === true
const int = (v: unknown): number | null =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0 ? v : null

function learnerUpsert(env: Env, token: string, locale: string, now: number): D1PreparedStatement {
  return env.DB.prepare(
    `INSERT INTO learners (token, created_at, last_seen_at, locale)
     VALUES (?1, ?2, ?2, ?3)
     ON CONFLICT(token) DO UPDATE SET last_seen_at = ?2, locale = ?3, deleted_at = NULL`,
  ).bind(token, now, locale)
}

async function handleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const path = url.pathname
  const now = Date.now()

  if (path === '/api/health') {
    return json({ ok: true, service: 'llmdeepdive' })
  }

  // Everything below is per-token.
  const token = str(request.headers.get('x-ldd-token'))
  if (!token || !TOKEN_RE.test(token)) return json({ error: 'invalid_token' }, 401)
  if (rateLimited(token, now)) return json({ error: 'rate_limited' }, 429)

  // ---- GET /api/progress -------------------------------------------------
  if (path === '/api/progress' && request.method === 'GET') {
    // 'first-unconstrained' is correct here: progress is per-token and a few
    // seconds of replica lag is immaterial. Without a session, replication
    // would be inert and every read would hit the primary.
    const session = env.DB.withSession('first-unconstrained')
    const rows = await session
      .prepare(
        `SELECT lesson_id, teachback_ok, quiz_ok, completed_at
           FROM lesson_progress
          WHERE token = ?1 AND deleted_at IS NULL`,
      )
      .bind(token)
      .all<{
        lesson_id: string
        teachback_ok: number
        quiz_ok: number
        completed_at: number | null
      }>()

    return json({
      lessons: rows.results.map((r) => ({
        id: r.lesson_id,
        teachBackOk: r.teachback_ok === 1,
        quizOk: r.quiz_ok === 1,
        completedAt: r.completed_at,
      })),
    })
  }

  // ---- PUT /api/progress -------------------------------------------------
  if (path === '/api/progress' && request.method === 'PUT') {
    const body = await readJson(request)
    if (!body) return bad('malformed_body')

    const lessonId = str(body['lessonId'])
    const locale = str(body['locale']) ?? 'en'
    if (!lessonId || !LESSON_RE.test(lessonId)) return bad('invalid_lesson_id')
    if (!LOCALES.has(locale)) return bad('invalid_locale')

    // Note what is absent: there is no field for the teach-back text, and
    // adding one would need a schema change the privacy note forbids.
    const teachBackOk = bool(body['teachBackOk'])
    const quizOk = bool(body['quizOk'])
    const completed = teachBackOk && quizOk

    await env.DB.batch([
      learnerUpsert(env, token, locale, now),
      env.DB.prepare(
        `INSERT INTO lesson_progress (token, lesson_id, teachback_ok, quiz_ok, completed_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)
         ON CONFLICT(token, lesson_id) DO UPDATE SET
           teachback_ok = ?3,
           quiz_ok      = ?4,
           completed_at = COALESCE(lesson_progress.completed_at, ?5),
           updated_at   = ?6,
           deleted_at   = NULL`,
      ).bind(token, lessonId, teachBackOk ? 1 : 0, quizOk ? 1 : 0, completed ? now : null, now),
    ])

    return json({ ok: true, completed })
  }

  // ---- DELETE /api/progress — erase everything for this token ------------
  if (path === '/api/progress' && request.method === 'DELETE') {
    // Soft delete, per the repo-wide rule. The token is opaque and unlinkable
    // to any person, so this is erasure in every sense that matters here.
    await env.DB.batch([
      env.DB.prepare(
        `UPDATE lesson_progress SET deleted_at = ?2 WHERE token = ?1 AND deleted_at IS NULL`,
      ).bind(token, now),
      env.DB.prepare(
        `UPDATE quiz_attempts SET deleted_at = ?2 WHERE token = ?1 AND deleted_at IS NULL`,
      ).bind(token, now),
      env.DB.prepare(
        `UPDATE lesson_signal SET deleted_at = ?2 WHERE token = ?1 AND deleted_at IS NULL`,
      ).bind(token, now),
      env.DB.prepare(
        `UPDATE learners SET deleted_at = ?2 WHERE token = ?1 AND deleted_at IS NULL`,
      ).bind(token, now),
    ])
    return json({ ok: true, erased: true })
  }

  // ---- POST /api/quiz/attempt -------------------------------------------
  if (path === '/api/quiz/attempt' && request.method === 'POST') {
    const body = await readJson(request)
    if (!body) return bad('malformed_body')

    const lessonId = str(body['lessonId'])
    const questionIndex = int(body['questionIndex'])
    const chosenIndex = int(body['chosenIndex'])
    const locale = str(body['locale']) ?? 'en'
    if (!lessonId || !LESSON_RE.test(lessonId)) return bad('invalid_lesson_id')
    if (questionIndex === null || chosenIndex === null) return bad('invalid_index')
    if (!LOCALES.has(locale)) return bad('invalid_locale')

    await env.DB.batch([
      learnerUpsert(env, token, locale, now),
      env.DB.prepare(
        `INSERT INTO quiz_attempts (token, lesson_id, question_index, chosen_index, correct, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
      ).bind(token, lessonId, questionIndex, chosenIndex, bool(body['correct']) ? 1 : 0, now),
    ])

    return json({ ok: true })
  }

  // ---- POST /api/signal --------------------------------------------------
  if (path === '/api/signal' && request.method === 'POST') {
    const body = await readJson(request)
    if (!body) return bad('malformed_body')

    const lessonId = str(body['lessonId'])
    const signal = str(body['signal'])
    const locale = str(body['locale']) ?? 'en'
    if (!lessonId || !LESSON_RE.test(lessonId)) return bad('invalid_lesson_id')
    // An enum, not a text box — this cannot become a free-text channel.
    if (!signal || !SIGNALS.has(signal)) return bad('invalid_signal')
    if (!LOCALES.has(locale)) return bad('invalid_locale')

    await env.DB.batch([
      learnerUpsert(env, token, locale, now),
      env.DB.prepare(
        `INSERT INTO lesson_signal (token, lesson_id, signal, created_at)
         VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(token, lesson_id) DO UPDATE SET signal = ?3, created_at = ?4, deleted_at = NULL`,
      ).bind(token, lessonId, signal, now),
    ])

    return json({ ok: true })
  }

  return json({ error: 'not_found' }, 404)
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname.startsWith('/api/')) {
      try {
        return await handleApi(request, env)
      } catch (err) {
        // Never leak an internal error message or stack to the client.
        console.error('[api]', err)
        return json({ error: 'internal_error' }, 500)
      }
    }

    // Unreachable while run_worker_first is scoped to /api/*, but correct if
    // that scope is ever widened.
    return env.ASSETS.fetch(request)
  },
}
