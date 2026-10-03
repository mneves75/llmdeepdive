/**
 * Learner progress, on this device only.
 *
 * Every page ships identical HTML; progress is applied after render from
 * `localStorage` and never leaves the browser (AGENTS.md invariants 1 and 2).
 * The lesson page owns the completion rule and is the only writer of the
 * `complete` record; everything here reads.
 *
 * Plain functions with no DOM, so the rules are unit-tested directly.
 */

export type ProgressLocale = 'en' | 'pt-br'

export interface LastVisit {
  id: string
  /** Site path of the lesson, always this locale's own lesson route. */
  path: string
  title: string
  /** Course position, e.g. "4.2". */
  position: string
}

export interface ReadableStorage {
  getItem(key: string): string | null
}

export const completeKey = (locale: ProgressLocale, lessonId: string): string => `ldd:complete:${locale}:${lessonId}`
export const lastVisitKey = (locale: ProgressLocale): string => `ldd:last:${locale}`

const ID = /^\d+\.\d+-[a-z0-9]+(?:-[a-z0-9]+)*$/u
const POSITION = /^\d+\.\d+$/u
const MAX_TITLE = 160

/** The only shape a stored path may take: this locale's lesson route, no traversal. */
function lessonPathPattern(locale: ProgressLocale): RegExp {
  const prefix = locale === 'pt-br' ? '/pt-br' : ''
  return new RegExp(`^${prefix}/lessons/\\d+-[a-z0-9-]+/\\d+\\.\\d+-[a-z0-9-]+/$`, 'u')
}

/**
 * Storage is untrusted input: another script, an old build or a hand edit may
 * have written anything. A record becomes a link only when it is a lesson
 * route of this locale with a sane title.
 */
export function parseLastVisit(raw: string | null, locale: ProgressLocale): LastVisit | null {
  if (!raw) return null
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  const id = 'id' in value ? value.id : undefined
  const path = 'path' in value ? value.path : undefined
  const title = 'title' in value ? value.title : undefined
  const position = 'position' in value ? value.position : undefined
  if (typeof id !== 'string' || !ID.test(id)) return null
  if (typeof path !== 'string' || !lessonPathPattern(locale).test(path)) return null
  if (typeof title !== 'string' || title.trim() === '' || title.length > MAX_TITLE) return null
  if (typeof position !== 'string' || !POSITION.test(position)) return null
  return { id, path, title, position }
}

export function isComplete(storage: ReadableStorage, locale: ProgressLocale, lessonId: string): boolean {
  try {
    return storage.getItem(completeKey(locale, lessonId)) === 'true'
  } catch {
    return false
  }
}

export function countComplete(storage: ReadableStorage, locale: ProgressLocale, lessonIds: readonly string[]): number {
  return lessonIds.reduce((total, id) => total + (isComplete(storage, locale, id) ? 1 : 0), 0)
}

/** "{n} of {m}" → "3 of 110". Unknown slots stay as written. */
export function fillTemplate(template: string, values: Readonly<Record<string, number | string>>): string {
  return template.replace(/\{([a-z]+)\}/gu, (slot, name: string) => (name in values ? String(values[name]) : slot))
}

export interface EnumerableStorage extends ReadableStorage {
  readonly length: number
  key(index: number): string | null
}

/**
 * Every lesson completed in one locale, read from the records themselves, so
 * the header needs no list of lesson ids in every page's HTML.
 */
export function countStoredComplete(storage: EnumerableStorage, locale: ProgressLocale): number {
  const prefix = completeKey(locale, '')
  try {
    let total = 0
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index)
      if (key?.startsWith(prefix) && storage.getItem(key) === 'true') total += 1
    }
    return total
  } catch {
    return 0
  }
}

/** The few element members the progress pass touches, so it runs on fakes in tests. */
export interface DatasetElement {
  dataset: Record<string, string | undefined>
}

export interface CountElement extends DatasetElement {
  hidden: boolean
  textContent: string | null
  style: { setProperty(name: string, value: string): void }
  querySelector(selector: string): { textContent: string | null } | null
}

/** `data-lesson-key="<locale>:<id>"` → `data-complete="true"` when this device completed it. */
export function markCompleted(elements: Iterable<DatasetElement>, storage: ReadableStorage): void {
  for (const element of elements) {
    const [keyLocale, id] = (element.dataset.lessonKey ?? '').split(':')
    if ((keyLocale !== 'en' && keyLocale !== 'pt-br') || !id) continue
    if (isComplete(storage, keyLocale, id)) element.dataset.complete = 'true'
    else delete element.dataset.complete
  }
}

/**
 * Fills `[data-course-progress]`: over `data-lesson-ids` when present (a
 * track), otherwise the whole course of this locale out of `data-total`.
 * Hidden while nothing is complete, so a first visit shows no zeroes.
 */
export function showProgressCounts(elements: Iterable<CountElement>, storage: EnumerableStorage, locale: ProgressLocale): void {
  for (const element of elements) {
    const ids = (element.dataset.lessonIds ?? '').split(' ').filter(Boolean)
    const total = ids.length > 0 ? ids.length : Number(element.dataset.total ?? 0)
    const done = ids.length > 0 ? countComplete(storage, locale, ids) : Math.min(countStoredComplete(storage, locale), total)
    const output = element.querySelector('[data-count]') ?? element
    output.textContent = fillTemplate(element.dataset.template ?? '{n}/{m}', { n: done, m: total })
    element.style.setProperty('--share', String(total > 0 ? done / total : 0))
    element.hidden = done === 0
  }
}
