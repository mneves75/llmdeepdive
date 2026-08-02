/**
 * Learner progress: localStorage is the source of truth, D1 is a mirror.
 *
 * The ordering matters. Every write lands locally and synchronously first, then
 * a sync is attempted and allowed to fail silently. The consequence is that the
 * entire site works with the API unreachable, offline, or blocked — which is
 * also why no content page ever renders an error about sync.
 *
 * Teach-back prose is stored **only** here, under `ldd:teachback:*`, and is
 * never included in any request body. The server has no column for it.
 */

const KEY_TOKEN = 'ldd:token'
const KEY_PROGRESS = 'ldd:progress'
const KEY_TEACHBACK = 'ldd:teachback:'

/** Completion gate: a substantive teach-back, not a keystroke. */
export const MIN_TEACHBACK_CHARS = 80
export const MIN_TEACHBACK_WORDS = 15

export interface LessonState {
  teachBackOk: boolean
  quizOk: boolean
  completedAt: number | null
}

type ProgressMap = Record<string, LessonState>

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    // Private mode, sandboxed iframe, storage disabled. Progress simply does
    // not persist; nothing else changes.
    return null
  }
}

function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* non-fatal */
  }
}

/** Opaque, client-generated, unlinkable to any person. */
export function getToken(): string {
  const existing = safeGet(KEY_TOKEN)
  if (existing) return existing
  const token = crypto.randomUUID()
  safeSet(KEY_TOKEN, token)
  return token
}

export function readProgress(): ProgressMap {
  const raw = safeGet(KEY_PROGRESS)
  if (!raw) return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}
    return parsed as ProgressMap
  } catch {
    return {}
  }
}

function writeProgress(map: ProgressMap): void {
  safeSet(KEY_PROGRESS, JSON.stringify(map))
}

export function lessonState(lessonId: string): LessonState {
  return readProgress()[lessonId] ?? { teachBackOk: false, quizOk: false, completedAt: null }
}

export function isComplete(lessonId: string): boolean {
  const s = lessonState(lessonId)
  return s.teachBackOk && s.quizOk
}

/** Does this teach-back clear the substance gate? */
export function teachBackQualifies(text: string): boolean {
  const trimmed = text.trim()
  const words = trimmed.split(/\s+/).filter(Boolean).length
  return trimmed.length >= MIN_TEACHBACK_CHARS && words >= MIN_TEACHBACK_WORDS
}

export function readTeachBack(lessonId: string): string {
  return safeGet(KEY_TEACHBACK + lessonId) ?? ''
}

/** Stays on this device. Never sent anywhere. */
export function writeTeachBack(lessonId: string, text: string): void {
  safeSet(KEY_TEACHBACK + lessonId, text)
}

export function setLessonState(
  lessonId: string,
  patch: Partial<LessonState>,
  locale: string,
): LessonState {
  const map = readProgress()
  const prev = map[lessonId] ?? { teachBackOk: false, quizOk: false, completedAt: null }
  const next: LessonState = { ...prev, ...patch }
  // Once complete, always complete — re-reading a lesson must not undo it.
  if (next.teachBackOk && next.quizOk && next.completedAt === null) next.completedAt = Date.now()
  map[lessonId] = next
  writeProgress(map)

  void syncLesson(lessonId, next, locale)
  return next
}

/** Fire-and-forget. A failure here is invisible by design. */
async function syncLesson(lessonId: string, state: LessonState, locale: string): Promise<void> {
  try {
    await fetch('/api/progress', {
      method: 'PUT',
      headers: { 'content-type': 'application/json', 'x-ldd-token': getToken() },
      body: JSON.stringify({
        lessonId,
        locale,
        teachBackOk: state.teachBackOk,
        quizOk: state.quizOk,
        // Deliberately absent: the teach-back text itself.
      }),
      keepalive: true,
    })
  } catch {
    /* offline or blocked — local state already holds the truth */
  }
}

export async function recordQuizAttempt(
  lessonId: string,
  questionIndex: number,
  chosenIndex: number,
  correct: boolean,
  locale: string,
): Promise<void> {
  try {
    await fetch('/api/quiz/attempt', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-ldd-token': getToken() },
      body: JSON.stringify({ lessonId, questionIndex, chosenIndex, correct, locale }),
      keepalive: true,
    })
  } catch {
    /* analytics-grade signal; losing one is fine */
  }
}

/** Erase everything, locally and server-side. */
export async function eraseAll(): Promise<void> {
  const token = safeGet(KEY_TOKEN)
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('ldd:')) localStorage.removeItem(key)
    }
  } catch {
    /* nothing to clear */
  }
  if (!token) return
  try {
    await fetch('/api/progress', { method: 'DELETE', headers: { 'x-ldd-token': token } })
  } catch {
    /* local erasure already happened, which is what the learner sees */
  }
}
