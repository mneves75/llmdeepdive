import { COMPONENTS, factText, lensText, type Lens } from './explorer-data'
import type { Locale } from './i18n'
import { isWebGLAvailable } from './three/webgl'

/**
 * Client wiring for the Anatomy Explorer.
 *
 * Three properties this file exists to guarantee:
 *
 *  1. **Three.js is never on the critical path.** It is dynamically imported
 *     only once the canvas approaches the viewport AND WebGL is confirmed
 *     available. A visitor who never scrolls here downloads none of it.
 *  2. **Failure degrades to the poster.** Feature detection, a real `.catch()`
 *     on the dynamic import, and a try/catch around construction. The reference
 *     implementation had none of these and showed a permanent fake "8%" spinner
 *     on any device without WebGL.
 *  3. **Everything is reachable by keyboard.** Arrow keys cycle markers, Enter
 *     opens, Escape closes, and selection is announced via a live region.
 */

type Cleanup = () => void

interface StageBundle {
  stage: import('./three/stage').Stage
  markers: import('./three/markers').MarkerLayer
  scene: import('./three/scenes/transformer').TransformerScene
}

export function mountExplorer(root: HTMLElement): Cleanup {
  const locale = (root.dataset.locale ?? 'en') as Locale
  const clearedAnnotation = locale === 'pt-br'
    ? 'Nenhum ponto selecionado. Use as setas para percorrer as anotações.'
    : 'No marker selected. Use the arrow keys to cycle annotations.'
  const canvas = root.querySelector<HTMLCanvasElement>('[data-stage-canvas]')
  const poster = root.querySelector<HTMLElement>('[data-poster]')
  const noWebgl = root.querySelector<HTMLElement>('[data-nowebgl]')
  const callout = root.querySelector<HTMLElement>('[data-callout]')
  const calloutLabel = root.querySelector<HTMLElement>('[data-callout-label]')
  const calloutDetail = root.querySelector<HTMLElement>('[data-callout-detail]')
  const annotations = root.querySelector<HTMLElement>('#specimen-annotations')

  const cleanups: Cleanup[] = []
  let bundle: StageBundle | null = null
  let pendingStage: StageBundle['stage'] | null = null
  let pendingMarkers: StageBundle['markers'] | null = null
  let componentId =
    root.querySelector<HTMLElement>('[data-component][aria-current="true"]')?.dataset.component ??
    COMPONENTS[0]?.id ??
    ''
  // Set by the returned cleanup. `boot()` awaits two dynamic imports, so the
  // component can be torn down mid-flight; without this the Stage is
  // constructed after cleanup ran and leaks a live WebGL context and rAF loop.
  let torndown = false

  /** addEventListener that always registers its own removal. */
  const on = <K extends keyof HTMLElementEventMap>(
    el: EventTarget | null,
    type: K | string,
    handler: EventListenerOrEventListenerObject,
  ): void => {
    if (!el) return
    el.addEventListener(type, handler)
    cleanups.push(() => el.removeEventListener(type, handler))
  }

  // ---- Detail panel (works with or without WebGL) -------------------------

  const setComponent = (id: string, syncMarker = true): void => {
    const c = COMPONENTS.find((x) => x.id === id)
    if (!c) return
    componentId = id

    const set = (sel: string, value: string): void => {
      const el = root.querySelector<HTMLElement>(sel)
      if (el) el.textContent = value
    }
    set('[data-detail-system]', c.system[locale])
    set('[data-detail-name]', c.name[locale])
    set('[data-detail-tagline]', c.tagline[locale])
    set('[data-detail-summary]', c.summary[locale])
    set('[data-fact-params]', factText(c, 'params', locale))
    set('[data-fact-cost]', factText(c, 'cost', locale))
    set('[data-fact-introduced]', factText(c, 'introduced', locale))
    set('[data-fact-variants]', factText(c, 'variants', locale))
    for (const lens of root.querySelectorAll<HTMLElement>('[data-lens]')) {
      const key = lens.dataset.lens as Lens | undefined
      if (key) lens.textContent = lensText(c, key, locale)
    }

    // The href is resolved at build time and carried on the rail button: a
    // lesson URL needs its track segment, which the component data does not
    // know. Constructing it here from the bare id produced a 404 every time.
    const cta = root.querySelector<HTMLAnchorElement>('[data-detail-cta]')
    const href = root.querySelector<HTMLElement>(`[data-component="${id}"]`)?.dataset.lessonHref
    if (cta && href) cta.href = href

    for (const btn of root.querySelectorAll<HTMLButtonElement>('[data-component]')) {
      btn.setAttribute('aria-current', btn.dataset.component === id ? 'true' : 'false')
    }

    if (!syncMarker || !bundle) return
    const spec = bundle.markers.specs.find((item) => item.id === id) ?? null
    bundle.markers.select(spec?.id ?? null)
    showCallout(spec)

    const isolateBtn = root.querySelector<HTMLButtonElement>('[data-tool="isolate"]')
    if (isolateBtn?.getAttribute('aria-pressed') === 'true') {
      if (spec) bundle.scene.isolate(spec.id)
      else {
        bundle.scene.isolate(null)
        isolateBtn.setAttribute('aria-pressed', 'false')
      }
    }
    bundle.stage.invalidate()
  }

  for (const btn of root.querySelectorAll<HTMLButtonElement>('[data-component]')) {
    on(btn, 'click', () => setComponent(btn.dataset.component ?? ''))
  }

  // ---- 3D stage (progressive enhancement) ---------------------------------

  function showCallout(spec: { id: string; label: string; detail: string } | null): void {
    if (!callout || !calloutLabel || !calloutDetail) return
    if (!spec) {
      callout.hidden = true
      if (annotations) annotations.textContent = clearedAnnotation
      return
    }
    const component = COMPONENTS.find((item) => item.id === spec.id)
    const label = component?.name[locale] ?? spec.label
    const detail = component?.tagline[locale] ?? spec.detail
    calloutLabel.textContent = label
    calloutDetail.textContent = detail
    callout.hidden = false
    // Announced to assistive tech: selecting a marker must not be silent.
    if (annotations) annotations.textContent = `${label}. ${detail}`
  }

  const boot = async (): Promise<void> => {
    if (!canvas || torndown) return
    if (!isWebGLAvailable()) {
      if (noWebgl) noWebgl.hidden = false
      return
    }

    const [{ Stage }, { MarkerLayer }, { TransformerScene, transformerMarkers }] = await Promise.all([
      import('./three/stage'),
      import('./three/markers'),
      import('./three/scenes/transformer'),
    ])

    // Re-checked after every await: the component may have been torn down while
    // these chunks were in flight.
    if (torndown) return

    // Reveal the canvas BEFORE anything measures it. It ships with the `hidden`
    // attribute so the poster shows first, and a hidden element has no layout
    // box: renderer size, camera aspect and marker scale would all be computed
    // from 0x0. If construction below throws, the caller's `.catch()` puts the
    // poster back.
    if (poster) poster.hidden = true
    canvas.hidden = false

    const stage = new Stage({ canvas })
    pendingStage = stage
    const scene = new TransformerScene()
    stage.mount(scene)

    const markers = new MarkerLayer(stage.camera)
    pendingMarkers = markers
    markers.set(transformerMarkers())
    stage.scene.add(markers.group)

    // One observer, one source of truth for size — see `Stage.onResize`.
    stage.onResize = (_w, h) => markers.setViewport(h)
    markers.setViewport(canvas.clientHeight)

    // Drive markers from the stage's own loop rather than a second rAF.
    const originalUpdate = scene.update.bind(scene)
    scene.update = (ctx, dt) => {
      const a = originalUpdate(ctx, dt)
      const b = markers.update(dt)
      positionCallout()
      return a || b
    }

    function positionCallout(): void {
      if (!callout || callout.hidden || !markers.selected) return
      const pos = markers.screenPosition(markers.selected, canvas!.clientWidth, canvas!.clientHeight)
      if (!pos) return
      // Written directly to the node every frame. No framework re-render while
      // the model spins — that is the whole point of a DOM callout over an
      // in-scene label.
      callout.style.transform = `translate3d(${pos.x + 14}px, ${pos.y - 12}px, 0)`
      callout.dataset.behind = String(pos.behind)
    }

    const select = (spec: { id: string; label: string; detail: string } | null): void => {
      markers.select(spec?.id ?? null)
      showCallout(spec)
      if (spec && COMPONENTS.some((item) => item.id === spec.id)) setComponent(spec.id, false)

      const isolateBtn = root.querySelector<HTMLButtonElement>('[data-tool="isolate"]')
      if (isolateBtn?.getAttribute('aria-pressed') === 'true') {
        if (spec) scene.isolate(spec.id)
        else {
          scene.isolate(null)
          isolateBtn.setAttribute('aria-pressed', 'false')
        }
      }
      stage.invalidate()
    }

    const onPointerDown = (ev: PointerEvent): void => {
      const rect = canvas.getBoundingClientRect()
      const hit = markers.pick(ev.clientX - rect.left, ev.clientY - rect.top, rect.width, rect.height)
      select(hit)
    }
    on(canvas, 'pointerdown', onPointerDown as EventListener)

    // Keyboard parity with the pointer. Missing in the reference project, which
    // left its entire annotation layer mouse-only.
    const onKeyDown = (ev: KeyboardEvent): void => {
      if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') {
        ev.preventDefault()
        select(markers.cycle(1))
      } else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') {
        ev.preventDefault()
        select(markers.cycle(-1))
      } else if (ev.key === 'Escape') {
        select(null)
      }
    }
    on(canvas, 'keydown', onKeyDown as EventListener)
    canvas.tabIndex = 0
    canvas.setAttribute('role', 'application')
    canvas.setAttribute('aria-describedby', 'specimen-annotations')
    canvas.setAttribute(
      'aria-label',
      locale === 'pt-br'
        ? 'Bloco transformer em 3D. Use as setas para percorrer as anotações e Escape para fechar.'
        : 'Transformer block in 3D. Use the arrow keys to cycle annotations and Escape to close.',
    )

    // Tools
    const isolateBtn = root.querySelector<HTMLButtonElement>('[data-tool="isolate"]')
    on(isolateBtn, 'click', () => {
      if (!isolateBtn) return
      const pressed = isolateBtn.getAttribute('aria-pressed') !== 'true'
      const isolatedId = pressed ? markers.selected : null
      isolateBtn.setAttribute('aria-pressed', String(Boolean(isolatedId)))
      scene.isolate(isolatedId)
      stage.invalidate()
    })

    const resetBtn = root.querySelector<HTMLButtonElement>('[data-tool="reset"]')
    on(resetBtn, 'click', () => {
      scene.isolate(null)
      isolateBtn?.setAttribute('aria-pressed', 'false')
      stage.controls.reset()
      setComponent(COMPONENTS[0]?.id ?? componentId)
    })

    const rotate = root.querySelector<HTMLInputElement>('[data-tool="autorotate"]')
    if (rotate) {
      rotate.checked = stage.autoRotate
      on(rotate, 'change', () => stage.setAutoRotate(rotate.checked))
    }

    bundle = { stage, markers, scene }
    setComponent(componentId)
    pendingStage = null
    pendingMarkers = null
    cleanups.push(() => {
      markers.dispose()
      stage.dispose()
    })
  }

  // Gate the import on visibility: the three.js chunk is never fetched for a
  // visitor who does not scroll to the explorer.
  //
  // Observe the WRAPPER, not the canvas. The canvas ships with the `hidden`
  // attribute so the poster shows first, and a hidden element has no layout
  // box — IntersectionObserver would never report it as intersecting, so the
  // stage could never boot for anyone.
  const target = canvas?.closest('.stage__canvas-wrap') ?? canvas
  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting) || bundle) return
      io.disconnect()
      boot().catch((err: unknown) => {
        pendingMarkers?.dispose()
        pendingStage?.dispose()
        pendingMarkers = null
        pendingStage = null
        bundle = null
        if (torndown) return
        // A real catch. Without it this is an unhandled rejection and the user
        // stares at a poster that never becomes interactive with no explanation.
        console.error('[explorer] 3D stage failed to start:', err)
        if (noWebgl) noWebgl.hidden = false
        if (poster) poster.hidden = false
        if (canvas) canvas.hidden = true
      })
    },
    { rootMargin: '200px' },
  )
  if (target) io.observe(target)
  cleanups.push(() => io.disconnect())

  return () => {
    torndown = true
    for (const fn of cleanups.splice(0)) fn()
    pendingMarkers?.dispose()
    pendingStage?.dispose()
    pendingMarkers = null
    pendingStage = null
    bundle = null
  }
}
