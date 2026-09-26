// Captures the real /explore/ WebGL scene frame by frame under Playwright's
// fake clock, so the rotation advances exactly 1/30 s per saved frame.
import { chromium } from 'playwright'

const FRAMES = Number(process.argv[2] ?? 1)
const OUT = process.env.OUT ?? new URL('./explorer/', import.meta.url).pathname
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1.5 })
page.setDefaultTimeout(180000)
await page.clock.install()
await page.goto('http://127.0.0.1:4417/explore/', { waitUntil: 'domcontentloaded' })
// Locator actions wait for rAF-based stability, which the fake clock freezes.
await page.evaluate(() => document.querySelector('canvas')?.scrollIntoView({ block: 'center' }))
// Let the lazy import and first frames run: real time for the network, fake time for the scene.
for (let i = 0; i < 40; i += 1) {
  await page.clock.runFor(100)
  if (await page.evaluate(() => [...document.querySelectorAll('canvas')].some((c) => !c.hidden && c.width > 0))) break
  await page.waitForTimeout(250)
}
await page.clock.runFor(1500)
const box = await page.evaluate(() => {
  const c = [...document.querySelectorAll('canvas')].find((x) => !x.hidden && x.width > 0)
  const host = c?.closest('section, figure, div') ?? c
  const r = (c ?? document.body).getBoundingClientRect()
  return { x: r.x, y: r.y, width: r.width, height: r.height, hostTag: host?.tagName, found: Boolean(c) }
})
console.log('canvas box', JSON.stringify(box))
// Hold the stage + evidence drawer at a fixed place below the sticky header on
// every frame (selecting a component scrolls the page), and clip to it.
const pin = () => page.evaluate(() => {
  const stage = document.querySelector('.stage.panel')
  const detail = document.querySelector('.detail.panel')
  window.scrollTo({ top: stage.getBoundingClientRect().top + window.scrollY - 110, behavior: 'instant' })
  const a = stage.getBoundingClientRect(), b = detail.getBoundingClientRect()
  const x = Math.min(a.left, b.left), y = Math.min(a.top, b.top)
  return { x, y, width: Math.max(a.right, b.right) - x, height: Math.max(a.bottom, b.bottom) - y }
})
await page.clock.runFor(200)
const CLICK_AT = Number(process.argv[3] ?? -1)
let clip = await pin()
console.log('clip', JSON.stringify(clip))
for (let f = 0; f < FRAMES; f += 1) {
  if (f === CLICK_AT) {
    await page.evaluate(() => [...document.querySelectorAll('button')].find((el) => /^Self-attention/.test(el.textContent?.trim() ?? ''))?.click())
  }
  clip = await pin()
  await page.screenshot({ path: `${OUT}f${String(f).padStart(3, '0')}.jpg`, type: 'jpeg', quality: 92, clip })
  await page.clock.runFor(1000 / 30)
}
await browser.close()
