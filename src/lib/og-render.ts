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

// Mona Sans, the site's display face, in its static cuts: satori reads woff,
// not the variable woff2 the site serves. It has no √ (lesson 4.3's title) or
// ≈, so Roboto's math subset follows it for those glyphs alone.
const FONTS = [
  { name: 'Mona Sans', weight: 500, data: fontFile('@fontsource/mona-sans/files/mona-sans-latin-500-normal.woff') },
  { name: 'Mona Sans', weight: 700, data: fontFile('@fontsource/mona-sans/files/mona-sans-latin-700-normal.woff') },
  { name: 'Mona Sans', weight: 800, data: fontFile('@fontsource/mona-sans/files/mona-sans-latin-800-normal.woff') },
  { name: 'Roboto', weight: 700, data: fontFile('@fontsource/roboto/files/roboto-math-700-normal.woff') },
] as const satisfies ReadonlyArray<{ name: string; weight: 500 | 700 | 800; data: Buffer }>

/**
 * satori asks for more fonts only when none of the bundled ones has a glyph.
 * Failing here turns a silently blank character in a title into a build error
 * that names it.
 */
async function missingGlyph(languageCode: string, segment: string): Promise<never> {
  throw new Error(`social card: no bundled font draws "${segment}" (${languageCode}); add a font subset in src/lib/og-render.ts`)
}

// DESIGN.md: the field edition — night plate, white ink, the reticle for the
// mark, and the tier's spectral pigment for the line that places the page.
const COLOR = {
  night: '#0a1230',
  ink: '#eef2fc',
  muted: '#b6c0dc',
  idle: '#5a6582',
  reticle: '#ff6b81',
  rule: 'rgba(214, 224, 255, 0.18)',
} as const
const TIER_COLOR: Record<Tier, string> = {
  foundations: '#72c8f2',
  core: '#f1cd6b',
  advanced: '#ff9b57',
  frontier: '#ff7aa0',
}

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

/** The reticle mark: a ring with four ticks and a centre star point. */
function mark(): Node {
  const tick = { position: 'absolute', background: COLOR.ink }
  return div({ position: 'relative', width: 44, height: 44, border: `3px solid ${COLOR.ink}`, borderRadius: '50%' }, [
    div({ ...tick, left: 17, top: -14, width: 3, height: 12 }),
    div({ ...tick, left: 17, top: 40, width: 3, height: 12 }),
    div({ ...tick, left: -14, top: 17, width: 12, height: 3 }),
    div({ ...tick, left: 40, top: 17, width: 12, height: 3 }),
    div({ position: 'absolute', left: 12, top: 12, width: 14, height: 14, borderRadius: '50%', background: COLOR.reticle }),
  ])
}

/** The four tiers as stars: open rings, the page's own filled in its pigment. */
function tierStars(tier: Tier): Node {
  return div({ gap: 14, alignItems: 'center' }, TIERS.map((candidate) =>
    div({
      width: 22,
      height: 22,
      borderRadius: '50%',
      border: `3px solid ${candidate === tier ? TIER_COLOR[candidate] : COLOR.idle}`,
      background: candidate === tier ? TIER_COLOR[candidate] : 'transparent',
    }),
  ))
}

function cardTree(card: Card): Node {
  return div({
    flexDirection: 'column',
    width: OG_IMAGE.width,
    height: OG_IMAGE.height,
    padding: '0 72px',
    background: COLOR.night,
    color: COLOR.ink,
    fontFamily: 'Mona Sans',
  }, [
    div({ alignItems: 'center', gap: 22, paddingTop: 56 }, [
      mark(),
      div({ fontSize: 40, fontWeight: 800, letterSpacing: -1 }, BRAND),
    ]),
    div({ flexDirection: 'column', justifyContent: 'center', flexGrow: 1 }, [
      div({ fontSize: 28, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: card.tier ? TIER_COLOR[card.tier] : COLOR.reticle }, card.kicker),
      div({ marginTop: 22, maxWidth: 1056, fontSize: headlineSize(card.headline), fontWeight: 800, lineHeight: 1.02, letterSpacing: -2 }, card.headline),
    ]),
    div({ alignItems: 'center', justifyContent: 'space-between', gap: 32, padding: '26px 0 46px', borderTop: `1px solid ${COLOR.rule}` }, [
      div({ fontSize: 28, fontWeight: 500, color: COLOR.muted }, card.footer),
      ...(card.tier ? [tierStars(card.tier)] : []),
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
