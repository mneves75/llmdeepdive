/**
 * Applies this device's progress to a page that shipped identical to everyone.
 *
 * Hooks (all server-rendered; this only fills and unhides them):
 * - `[data-lesson-key="<locale>:<id>"]` gains `data-complete="true"` when done;
 * - `[data-course-progress]` shows "{n} of {m}" (see `showProgressCounts`);
 * - `[data-continue]` links to the last lesson opened in this locale.
 *
 * Runs once on load and again whenever a lesson reports progress
 * (`ldd:progress`), so a completed lesson's star fills without a reload.
 */
import { lastVisitKey, markCompleted, parseLastVisit, showProgressCounts, type ProgressLocale } from '~/lib/progress'

const locale: ProgressLocale = document.documentElement.lang === 'pt-BR' ? 'pt-br' : 'en'

function storage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function showContinue(store: Storage): void {
  let raw: string | null = null
  try {
    raw = store.getItem(lastVisitKey(locale))
  } catch {
    raw = null
  }
  const visit = parseLastVisit(raw, locale)
  for (const slot of document.querySelectorAll<HTMLElement>('[data-continue]')) {
    // Never offer to continue to the page the reader is already on.
    if (!visit || visit.path === window.location.pathname) {
      slot.hidden = true
      continue
    }
    const link = slot.querySelector<HTMLAnchorElement>('[data-continue-link]')
    if (!link) continue
    link.href = visit.path
    const title = slot.querySelector<HTMLElement>('[data-continue-title]')
    const position = slot.querySelector<HTMLElement>('[data-continue-position]')
    if (title) title.textContent = visit.title
    if (position) position.textContent = visit.position
    slot.hidden = false
  }
}

function apply(): void {
  const store = storage()
  if (!store) return
  markCompleted(document.querySelectorAll<HTMLElement | SVGElement>('[data-lesson-key]'), store)
  showProgressCounts(document.querySelectorAll<HTMLElement>('[data-course-progress]'), store, locale)
  showContinue(store)
}

apply()
document.addEventListener('ldd:progress', apply)
// A page restored from the back/forward cache keeps its old DOM; the reader
// may have finished a lesson since.
window.addEventListener('pageshow', (event) => {
  if (event.persisted) apply()
})
