import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import satori from 'satori'
import sharp, { type Sharp } from 'sharp'
import { BRAND, LOGO, OG_IMAGE, type Card } from './seo'
import { TIERS, type Tier } from './content'

/**
 * Build-time rasteriser for the social cards and the organisation logo.
 * Imported only by endpoints under `src/pages/og/`; nothing here reaches a
 * browser.
 *
 * satori converts text to vector paths using the fonts passed in, so the PNG
 * does not depend on which fonts the build machine has — unlike an SVG
 * `<text>` handed to librsvg, which would render in whatever sans-serif the OS
 * resolves. That is what keeps a rebuild byte-identical.
 */

const resolvePackage = createRequire(join(process.cwd(), 'package.json')).resolve
const fontFile = (specifier: string): Buffer => readFileSync(resolvePackage(specifier))

// Roboto Condensed is the display face's own fallback in tokens.css. It has no
// √ (lesson 4.3's title) or ≈, so Roboto's math subset — same design — follows it.
const FONTS = [
  { name: 'Roboto Condensed', weight: 400, data: fontFile('@fontsource/roboto-condensed/files/roboto-condensed-latin-400-normal.woff') },
  { name: 'Roboto Condensed', weight: 500, data: fontFile('@fontsource/roboto-condensed/files/roboto-condensed-latin-500-normal.woff') },
  { name: 'Roboto Condensed', weight: 700, data: fontFile('@fontsource/roboto-condensed/files/roboto-condensed-latin-700-normal.woff') },
  { name: 'Roboto', weight: 700, data: fontFile('@fontsource/roboto/files/roboto-math-700-normal.woff') },
] as const satisfies ReadonlyArray<{ name: string; weight: 400 | 500 | 700; data: Buffer }>

/**
 * satori asks for more fonts only when none of the bundled ones has a glyph.
 * Failing here turns a silently blank character in a title into a build error
 * that names it.
 */
async function missingGlyph(languageCode: string, segment: string): Promise<never> {
  throw new Error(`social card: no bundled font draws "${segment}" (${languageCode}); add a font subset in src/lib/og-render.ts`)
}

// DESIGN.md: abyss ground, on-abyss inks, cyan reserved for signal. Idle strata
// use muted-ink: abyss-raised all but vanished at thumbnail size.
const COLOR = {
  abyss: '#061a2b',
  stratum: '#3f5a66',
  ink: '#f2f7f5',
  muted: '#b9cdcf',
  signal: '#5de7ee',
  rule: 'rgba(255, 255, 255, 0.16)',
} as const

type Style = Record<string, string | number>
interface Node {
  type: 'div'
  props: { style: Style; children?: string | Node | Node[] }
}

// satori requires an explicit `display` on every element with children.
const div = (style: Style, children?: string | Node | Node[]): Node => ({ type: 'div', props: { style: { display: 'flex', ...style }, children } })

/** Longer headlines step down so the longest title in the corpus fits three lines. */
function headlineSize(text: string): number {
  if (text.length <= 22) return 112
  if (text.length <= 40) return 92
  if (text.length <= 60) return 78
  return 66
}

function mark(): Node {
  const line = { position: 'absolute', background: COLOR.signal }
  return div({ position: 'relative', width: 40, height: 40, border: `3px solid ${COLOR.signal}`, borderRadius: '50%' }, [
    div({ ...line, left: -5, top: 16, width: 44, height: 2 }),
    div({ ...line, left: 16, top: -5, width: 2, height: 44 }),
    div({ ...line, left: 12, top: 12, width: 10, height: 10, borderRadius: '50%' }),
  ])
}

function strata(tier: Tier): Node {
  return div({ gap: 8 }, TIERS.map((candidate) =>
    div({ width: 64, height: 12, borderRadius: 2, background: candidate === tier ? COLOR.signal : COLOR.stratum }),
  ))
}

function cardTree(card: Card): Node {
  return div({
    flexDirection: 'column',
    width: OG_IMAGE.width,
    height: OG_IMAGE.height,
    padding: '0 72px',
    background: COLOR.abyss,
    borderTop: `8px solid ${COLOR.signal}`,
    color: COLOR.ink,
    fontFamily: 'Roboto Condensed',
  }, [
    div({ alignItems: 'center', gap: 18, paddingTop: 48 }, [
      mark(),
      div({ fontSize: 40, fontWeight: 700, letterSpacing: -1 }, BRAND),
    ]),
    div({ flexDirection: 'column', justifyContent: 'center', flexGrow: 1 }, [
      div({ fontSize: 28, fontWeight: 500, letterSpacing: 2, textTransform: 'uppercase', color: COLOR.signal }, card.kicker),
      div({ marginTop: 20, maxWidth: 1056, fontSize: headlineSize(card.headline), fontWeight: 700, lineHeight: 1.04, letterSpacing: -1 }, card.headline),
    ]),
    div({ alignItems: 'center', justifyContent: 'space-between', gap: 32, padding: '24px 0 44px', borderTop: `1px solid ${COLOR.rule}` }, [
      div({ fontSize: 28, fontWeight: 400, color: COLOR.muted }, card.footer),
      ...(card.tier ? [strata(card.tier)] : []),
    ]),
  ])
}

const png = (image: Sharp): Promise<Buffer> => image.png({ compressionLevel: 9, palette: true, effort: 10 }).toBuffer()

export async function renderCard(card: Card): Promise<Buffer> {
  const svg = await satori(cardTree(card), {
    width: OG_IMAGE.width,
    height: OG_IMAGE.height,
    fonts: [...FONTS],
    loadAdditionalAsset: missingGlyph,
  })
  return png(sharp(Buffer.from(svg)))
}

/** The favicon (the header's wordmark mark), square and ≥112px as Google's logo rule asks. */
export function renderLogo(): Promise<Buffer> {
  const svg = readFileSync(join(process.cwd(), 'public', 'favicon.svg'))
  // The favicon's viewBox is 32 units; 72 dpi × 16 draws it at 512px.
  return png(sharp(svg, { density: 72 * (LOGO.size / 32) }).resize(LOGO.size, LOGO.size))
}
