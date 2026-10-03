import { COMPONENTS, factText, lensText, type Lens } from './explorer-data'
import type { Locale } from './i18n'
import { readDisplayFont, readPalette } from './three/palette'
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
 *
 * Labels are HTML pinned to the instrument by leader lines (an SVG or canvas
 * label does not wrap, and pt-BR runs 15–25% longer than English): the
 * selection label beside its port, and the layer key beside its decks once
 * the stage is wide enough to hold them.
 */

type Cleanup = () => void

/** The two Navigation API fields read here; TypeScript's DOM lib lacks the API. */
interface NavigateEventFields extends Event {
  readonly destination: { readonly sameDocument: boolean }
  readonly downloadRequest: string | null
}

interface StageBundle {
  stage: import('./three/stage').Stage
  markers: import('./three/markers').MarkerLayer
  scene: import('./three/scenes/transformer').TransformerScene
}

/** Below this stage width labels dock instead of floating beside the model. */
const PIN_MIN_WIDTH = 640
/** Leader geometry, in CSS pixels. */
const LEADER_RISE = 26
const LEADER_RUN = 22
const EDGE = 8

/** Waits for the display face so port numerals are not baked in a fallback. */
async function fontReady(font: string): Promise<void> {
  if (!('fonts' in document)) return
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, 1200))
  await Promise.race([document.fonts.load(`700 64px ${font}`).then(() => undefined, () => undefined), timeout])
}

export function mountExplorer(root: HTMLElement): Cleanup {
  const locale = (root.dataset.locale ?? 'en') as Locale
  const clearedAnnotation = locale === 'pt-br'
    ? 'Nenhuma porta selecionada. Use as setas para percorrer as portas.'
    : 'No port selected. Use the arrow keys to move between ports.'
  const canvas = root.querySelector<HTMLCanvasElement>('[data-stage-canvas]')
  const poster = root.querySelector<HTMLElement>('[data-poster]')
  const noWebgl = root.querySelector<HTMLElement>('[data-nowebgl]')
  const callout = root.querySelector<HTMLElement>('[data-callout]')
  const calloutLabel = root.querySelector<HTMLElement>('[data-callout-label]')
  const calloutDetail = root.querySelector<HTMLElement>('[data-callout-detail]')
  const annotations = root.querySelector<HTMLElement>('#specimen-annotations')
  const field = root.querySelector<HTMLElement>('.stage__field') ?? root
  const wrap = root.querySelector<HTMLElement>('.stage__canvas-wrap')
  const key = root.querySelector<HTMLElement>('.stage__key')
  const keyItems = [...root.querySelectorAll<HTMLElement>('[data-layer-anchor]')]
  const leader = (id: string): SVGPathElement | null => root.querySelector<SVGPathElement>(`[data-leader="${id}"]`)
  const selectLeader = leader('select')
  const isolateBtn = root.querySelector<HTMLButtonElement>('[data-tool="isolate"]')
  const resetBtn = root.querySelector<HTMLButtonElement>('[data-tool="reset"]')
  const rotate = root.querySelector<HTMLInputElement>('[data-tool="motion"]')

  const setStageControlsEnabled = (enabled: boolean): void => {
    if (isolateBtn) isolateBtn.disabled = !enabled
    if (resetBtn) resetBtn.disabled = !enabled
    if (rotate) rotate.disabled = !enabled
  }

  // Server markup starts disabled for no-JS. Reset it here too so remounting a
  // previously enhanced explorer cannot expose tools before its new stage is
  // usable.
  setStageControlsEnabled(false)

  const cleanups: Cleanup[] = []
  let bundle: StageBundle | null = null
  let pendingStage: StageBundle['stage'] | null = null
  let pendingMarkers: StageBundle['markers'] | null = null
  // Set once the stage exists: label sizes are re-read when their text changes.
  let remeasure = (): void => {}
  let componentId =
    root.querySelector<HTMLElement>('[data-component][aria-current="true"]')?.dataset.component ??
    COMPONENTS[0]?.id ??
    ''
  // Set by the returned cleanup. `boot()` awaits two dynamic imports, so the
  // component can be torn down mid-flight; without this the Stage is
  // constructed after cleanup ran and leaks a live WebGL context and rAF loop.
  let torndown = false
  // Set when leaving cancelled the boot. Chromium and WebKit keep that failed
  // import in the page's module map, so a page restored from the back/forward
  // cache cannot load the stage again without a fresh document.
  let interrupted = false
  // Set when the page starts navigating away. WebKit and Firefox then cancel
  // the in-flight three.js chunks and reject the import, which is the visitor
  // leaving, not a stage failure. The Navigation API's `navigate` event is the
  // signal at navigation start: `pagehide` comes too late, iOS Safari never
  // fires `beforeunload`, and Firefox keeps no page with a `beforeunload`
  // listener in its back/forward cache. Without the API, the rejection is
  // reported as before.
  let leaving = false

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
    set('[data-detail-port]', String(COMPONENTS.indexOf(c) + 1))
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
      selectLeader?.setAttribute('d', '')
      if (annotations) annotations.textContent = clearedAnnotation
      return
    }
    const component = COMPONENTS.find((item) => item.id === spec.id)
    const label = component?.name[locale] ?? spec.label
    const detail = component?.tagline[locale] ?? spec.detail
    calloutLabel.textContent = label
    calloutDetail.textContent = detail
    callout.hidden = false
    remeasure()
    // Announced to assistive tech: selecting a marker must not be silent.
    if (annotations) annotations.textContent = `${label}. ${detail}`
  }

  const boot = async (): Promise<void> => {
    if (!canvas || torndown) return
    if (!isWebGLAvailable()) {
      if (noWebgl) noWebgl.hidden = false
      return
    }

    const [{ Stage }, { MarkerLayer }, { TransformerScene, transformerMarkers, deckSilhouette }] = await Promise.all([
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
    // Colours are the design tokens as they paint on this night field, and
    // numerals wait for the display face. Both before anything is drawn.
    const palette = readPalette(field)
    const font = readDisplayFont(field)
    await fontReady(font)
    if (torndown) return

    if (poster) poster.hidden = true
    canvas.hidden = false

    const stage = new Stage({ canvas, palette })
    pendingStage = stage
    const scene = new TransformerScene(palette)
    stage.mount(scene)

    const hex = (value: number): string => `#${value.toString(16).padStart(6, '0')}`
    const markers = new MarkerLayer(stage.camera, {
      porcelain: hex(palette.ink),
      ink: hex(palette.plate),
      reticle: hex(palette.reticle),
      font,
    })
    pendingMarkers = markers
    markers.set(transformerMarkers())
    stage.scene.add(markers.group)

    // Label sizes change only with their text and the viewport, so they are
    // measured then rather than every frame.
    let calloutSize = { width: 0, height: 0 }
    let keySizes = keyItems.map(() => ({ width: 0, height: 0 }))
    const measureLabels = (): void => {
      if (callout && !callout.hidden) calloutSize = { width: callout.offsetWidth, height: callout.offsetHeight }
      keySizes = keyItems.map((item) => ({ width: item.offsetWidth, height: item.offsetHeight }))
    }
    remeasure = measureLabels

    // One observer, one source of truth for size — see `Stage.onResize`.
    stage.onResize = (_w, h) => {
      markers.setViewport(h)
      pinKey(canvas.clientWidth >= PIN_MIN_WIDTH)
      measureLabels()
    }
    markers.setViewport(canvas.clientHeight)

    // Drive markers and labels from the stage's own loop rather than a second rAF.
    const originalUpdate = scene.update.bind(scene)
    scene.update = (ctx, dt) => {
      const a = originalUpdate(ctx, dt)
      const b = markers.update(dt)
      positionLabels()
      return a || b
    }


    function pinKey(pinned: boolean): void {
      if (!key) return
      key.toggleAttribute('data-pinned', pinned)
      if (pinned) return
      for (const item of keyItems) item.style.transform = ''
      for (const item of keyItems) leader(item.dataset.layerAnchor ?? '')?.setAttribute('d', '')
    }

    function positionLabels(): void {
      const width = canvas!.clientWidth
      const height = canvas!.clientHeight
      if (!(width > 0 && height > 0)) return

      // Layer key: each entry in the left margin at its deck's height, with a
      // leader to the deck's left silhouette. Written straight to the nodes:
      // no framework re-render while the model turns.
      if (key?.hasAttribute('data-pinned')) {
        let floor = EDGE
        const rows = keyItems
          .map((item, index) => ({ item, index, edge: deckSilhouette(stage.camera, item.dataset.layerAnchor ?? '', width, height) }))
          .sort((left, right) => left.edge.y - right.edge.y)
        for (const { item, index, edge } of rows) {
          const size = keySizes[index] ?? { width: 0, height: 0 }
          // Keep entries in their deck order and never overlapping.
          const top = Math.max(floor, Math.min(edge.y - size.height / 2, height - size.height - EDGE))
          floor = top + size.height + 4
          const x = Math.max(EDGE, Math.min(edge.x - 36 - size.width, width * 0.3 - size.width))
          item.style.transform = `translate3d(${x.toFixed(1)}px, ${top.toFixed(1)}px, 0)`
          const from = x + size.width + 4
          const y = top + size.height / 2
          leader(item.dataset.layerAnchor ?? '')?.setAttribute(
            'd',
            edge.x - from > 6 ? `M${from.toFixed(1)} ${y.toFixed(1)}H${(edge.x - 10).toFixed(1)}L${edge.x.toFixed(1)} ${edge.y.toFixed(1)}` : '',
          )
        }
      }

      if (!callout || callout.hidden || !markers.selected) return
      const pos = markers.screenPosition(markers.selected, width, height)
      if (!pos) return
      callout.dataset.behind = String(pos.behind)
      if (width < PIN_MIN_WIDTH) {
        // Docked: top corner opposite the port, leader straight to it.
        const left = pos.x < width / 2 ? width - calloutSize.width - EDGE : EDGE
        callout.style.transform = `translate3d(${left.toFixed(1)}px, ${EDGE}px, 0)`
        const fromX = left + calloutSize.width / 2
        const fromY = EDGE + calloutSize.height
        selectLeader?.setAttribute('d', `M${fromX.toFixed(1)} ${fromY.toFixed(1)}L${pos.x.toFixed(1)} ${(pos.y - 12).toFixed(1)}`)
        return
      }
      // Floating: an elbow leader rising away from the model's axis, the label
      // hung from its end and kept inside the stage.
      // Always to the right: the layer key owns the left margin.
      const outward = key?.hasAttribute('data-pinned') || pos.x >= width / 2 ? 1 : -1
      const elbowX = pos.x + outward * LEADER_RUN
      const elbowY = pos.y - LEADER_RISE
      const endX = elbowX + outward * LEADER_RUN
      const left = Math.max(EDGE, Math.min(outward > 0 ? endX + 6 : endX - 6 - calloutSize.width, width - calloutSize.width - EDGE))
      const top = Math.max(EDGE, Math.min(elbowY - calloutSize.height / 2, height - calloutSize.height - EDGE))
      callout.style.transform = `translate3d(${left.toFixed(1)}px, ${top.toFixed(1)}px, 0)`
      const startX = pos.x + outward * 13
      const startY = pos.y - 9
      selectLeader?.setAttribute(
        'd',
        `M${startX.toFixed(1)} ${startY.toFixed(1)}L${elbowX.toFixed(1)} ${elbowY.toFixed(1)}H${(outward > 0 ? left : left + calloutSize.width).toFixed(1)}`,
      )
    }

    const onPointerMove = (ev: PointerEvent): void => {
      if (ev.pointerType !== 'mouse') return
      const rect = canvas.getBoundingClientRect()
      const hit = markers.pick(ev.clientX - rect.left, ev.clientY - rect.top, rect.width, rect.height)
      canvas.toggleAttribute('data-over-port', hit !== null)
    }
    on(canvas, 'pointermove', onPointerMove as EventListener)

    const select = (spec: { id: string; label: string; detail: string } | null): void => {
      markers.select(spec?.id ?? null)
      showCallout(spec)
      if (spec && COMPONENTS.some((item) => item.id === spec.id)) setComponent(spec.id, false)

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
        ? 'Bloco transformer em 3D. Use as setas para percorrer as portas e Escape para fechar.'
        : 'Transformer block in 3D. Use the arrow keys to move between ports and Escape to close.',
    )

    // Tools
    on(isolateBtn, 'click', () => {
      if (!isolateBtn) return
      const pressed = isolateBtn.getAttribute('aria-pressed') !== 'true'
      const isolatedId = pressed ? markers.selected : null
      isolateBtn.setAttribute('aria-pressed', String(Boolean(isolatedId)))
      scene.isolate(isolatedId)
      stage.invalidate()
    })

    on(resetBtn, 'click', () => {
      scene.isolate(null)
      isolateBtn?.setAttribute('aria-pressed', 'false')
      stage.controls.reset()
      setComponent(COMPONENTS[0]?.id ?? componentId)
    })

    if (rotate) {
      rotate.checked = stage.motion
      on(rotate, 'change', () => stage.setMotion(rotate.checked))
      stage.onMotionChange = (motion) => { rotate.checked = motion }
    }

    bundle = { stage, markers, scene }
    pinKey(canvas.clientWidth >= PIN_MIN_WIDTH)
    measureLabels()
    setComponent(componentId)
    pendingStage = null
    pendingMarkers = null
    cleanups.push(() => {
      setStageControlsEnabled(false)
      pinKey(false)
      remeasure = () => {}
      markers.dispose()
      stage.dispose()
    })
    // Enabling is the final boot action. Every early return and every rejected
    // import/construction path therefore leaves the native controls disabled.
    setStageControlsEnabled(true)
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
        if (poster) poster.hidden = false
        if (canvas) canvas.hidden = true
        if (leaving) {
          interrupted = true
          return
        }
        // A real catch. Without it this is an unhandled rejection and the user
        // stares at a poster that never becomes interactive with no explanation.
        console.error('[explorer] 3D stage failed to start:', err)
        if (noWebgl) noWebgl.hidden = false
      })
    },
    { rootMargin: '200px' },
  )
  if (target) io.observe(target)
  cleanups.push(() => io.disconnect())

  const navigation = (window as Window & { navigation?: EventTarget }).navigation ?? null
  on(navigation, 'navigate', (event) => {
    const { destination, downloadRequest } = event as NavigateEventFields
    if (!destination.sameDocument && downloadRequest === null) leaving = true
  })
  on(navigation, 'navigateerror', () => { leaving = false })
  on(window, 'pageshow', (event) => {
    leaving = false
    // What the browser would have done had it not cached the page.
    if ((event as PageTransitionEvent).persisted && interrupted) location.reload()
  })

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
