// node render.mjs stills 1.0 3.6 …   → stills/t-<time>.png for review
// node render.mjs frames              → frames/f0000.jpg … (23 s at 30 fps)
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const [mode, ...rest] = process.argv.slice(2)
const FPS = 30
const DURATION = 23
const here = new URL('./', import.meta.url).pathname
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })
page.setDefaultTimeout(300000)
await page.goto('http://127.0.0.1:4417/__brag/composition/', { waitUntil: 'load' })
console.log('anchors', JSON.stringify(await page.evaluate(() => window.__ready)))

if (mode === 'stills') {
  mkdirSync(`${here}stills`, { recursive: true })
  for (const t of rest.map(Number).sort((a, b) => a - b)) {
    await page.evaluate((time) => window.renderAt(time), t)
    await page.screenshot({ path: `${here}stills/t-${t.toFixed(2)}.png` })
    console.log('still', t)
  }
} else if (mode === 'frames') {
  mkdirSync(`${here}frames`, { recursive: true })
  const total = FPS * DURATION
  const from = Number(rest[0] ?? 0), to = Number(rest[1] ?? total - 1)
  const started = Date.now()
  for (let i = from; i <= to; i += 1) {
    await page.evaluate((time) => window.renderAt(time), i / FPS)
    await page.screenshot({ path: `${here}frames/f${String(i).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 93 })
    if (i % 60 === 0) console.log(`frame ${i}/${total} · ${((Date.now() - started) / 1000).toFixed(0)}s`)
  }
}
await browser.close()
