import { isWebGLAvailable } from './three/webgl'

/**
 * Boot for the 3D curriculum sky (`SkyChart.astro`, home and tracks index).
 *
 * This file is the only sky code on the initial page, and it stays tiny: no
 * three.js, no scene. The scene is imported only after
 *  1. an IntersectionObserver sees the chart,
 *  2. WebGL is confirmed,
 *  3. the page has finished loading and the browser is idle — the chart sits
 *     above the fold, so fetching three.js at once would compete with the
 *     page's own first paint.
 * The SVG poster stays until the first WebGL frame exists; then the two
 * cross-fade (they are drawn identically) and the chart lifts onto its sphere.
 * Any failure leaves the poster exactly as it was.
 *
 * Leaving mid-load is handled exactly as `explorer-client.ts` does: WebKit and
 * Firefox reject an in-flight import when navigation starts, and that is the
 * visitor leaving, not a failure.
 */

/** The two Navigation API fields read here; TypeScript's DOM lib lacks the API. */
interface NavigateEventFields extends Event {
  readonly destination: { readonly sameDocument: boolean }
  readonly downloadRequest: string | null
}

type Controller = import('./three/scenes/sky').SkyController

/** Resolves once the page has loaded and the main thread is idle. */
function whenIdle(): Promise<void> {
  const loaded = document.readyState === 'complete'
    ? Promise.resolve()
    : new Promise<void>((resolve) => addEventListener('load', () => resolve(), { once: true }))
  return loaded.then(() => new Promise<void>((resolve) => {
    if ('requestIdleCallback' in window) requestIdleCallback(() => resolve(), { timeout: 1500 })
    else setTimeout(resolve, 200)
  }))
}

/** The poster's own arrival (lines drawing, stars igniting) finishes first. */
async function posterSettled(poster: Element): Promise<void> {
  const finite = poster.getAnimations({ subtree: true }).filter((animation) => {
    const iterations = animation.effect?.getComputedTiming().iterations
    return typeof iterations === 'number' && Number.isFinite(iterations)
  })
  const cap = new Promise<void>((resolve) => setTimeout(resolve, 4000))
  await Promise.race([Promise.all(finite.map((animation) => animation.finished.catch(() => undefined))), cap])
}

function mountSkyStage(figure: HTMLElement): () => void {
  const canvas = figure.querySelector<HTMLCanvasElement>('[data-sky-canvas]')
  const poster = figure.querySelector<HTMLElement>('.sky__poster')
  const svg = figure.querySelector<SVGSVGElement>('.sky__chart')
  const toggle = figure.querySelector<HTMLInputElement>('[data-motion-toggle]')
  const labels = [...figure.querySelectorAll<HTMLElement>('[data-constellation-label]')]
  if (!canvas || !poster || !svg) return () => {}

  let controller: Controller | null = null
  let torndown = false
  let leaving = false
  let interrupted = false
  const cleanups: Array<() => void> = []
  const on = (target: EventTarget | null, type: string, handler: EventListener): void => {
    if (!target) return
    target.addEventListener(type, handler)
    cleanups.push(() => target.removeEventListener(type, handler))
  }

  /** Back to the server-rendered chart, as if no script had run. */
  const restorePoster = (): void => {
    controller?.dispose()
    controller = null
    canvas.hidden = true
    poster.hidden = false
    delete figure.dataset.skyState
  }

  const boot = async (): Promise<void> => {
    if (torndown || !isWebGLAvailable()) return
    await whenIdle()
    if (torndown) return
    const { mountSky } = await import('./three/scenes/sky')
    if (torndown) return
    await posterSettled(poster)
    if (torndown) return

    // The canvas must have a layout box before anything measures it; it is
    // transparent until its first frame, so the poster still shows through.
    figure.dataset.skyState = 'booting'
    canvas.hidden = false
    controller = mountSky({
      figure,
      canvas,
      svg,
      labels,
      toggle,
      onLost: restorePoster,
      onFirstFrame: () => {
        // `live` cross-fades the poster out (SkyChart's CSS); hiding it
        // afterwards also stops its CSS animations.
        figure.dataset.skyState = 'live'
        const done = (): void => {
          if (torndown || figure.dataset.skyState !== 'live') return
          poster.hidden = true
          controller?.begin()
        }
        // Always deferred: the first frame is drawn inside mountSky(), before
        // `controller` is assigned, so a synchronous begin() would be lost.
        const duration = Number.parseFloat(getComputedStyle(poster).transitionDuration) || 0
        setTimeout(done, duration * 1000 + 60)
      },
    })
  }

  const io = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting) || controller) return
    io.disconnect()
    boot().catch((error: unknown) => {
      if (torndown) return
      restorePoster()
      if (leaving) {
        interrupted = true
        return
      }
      console.error('[sky] 3D sky failed to start:', error)
    })
  }, { rootMargin: '200px' })
  io.observe(figure)
  cleanups.push(() => io.disconnect())

  const navigation = (window as Window & { navigation?: EventTarget }).navigation ?? null
  on(navigation, 'navigate', (event) => {
    const { destination, downloadRequest } = event as NavigateEventFields
    if (!destination.sameDocument && downloadRequest === null) leaving = true
  })
  on(navigation, 'navigateerror', () => { leaving = false })
  on(window, 'pageshow', (event) => {
    leaving = false
    // A failed module import is never retried in the same document; a page
    // restored from the back/forward cache after one reloads instead.
    if ((event as PageTransitionEvent).persisted && interrupted) location.reload()
  })

  return () => {
    torndown = true
    for (const cleanup of cleanups.splice(0)) cleanup()
    controller?.dispose()
    controller = null
  }
}

// One sky per page: a page has one WebGL context to spare, not one per chart.
const first = document.querySelector<HTMLElement>('[data-sky-stage]')
if (first) mountSkyStage(first)
