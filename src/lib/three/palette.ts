/**
 * Scene colours come from the design tokens, never from literals in a scene.
 *
 * `getPropertyValue('--accent')` returns the raw `light-dark(…)` text, not a
 * colour, so each token is resolved by painting it: a probe element inside the
 * surface takes `color: var(--token)` and the computed `color` is read back.
 * That resolves `light-dark()` under the probe's own `color-scheme`, which is
 * how a night plate gets night pigments while the page is in the desk edition.
 *
 * No Three.js import: the boot modules that call `readPalette` stay small
 * enough for the critical path. Scenes convert the hex numbers themselves.
 */

export interface ScenePalette {
  /** The plate the scene is drawn on. */
  plate: number
  /** Primary ink: stars, porcelain, numerals. */
  ink: number
  inkMuted: number
  inkFaint: number
  /** Graticule hairlines. */
  grid: number
  /** Chart blue: paths and active state. */
  accent: number
  /** Where you are; also focus. */
  reticle: number
  tierFoundations: number
  tierCore: number
  tierAdvanced: number
  tierFrontier: number
}

export type PaletteToken = keyof ScenePalette

const TOKENS: Record<PaletteToken, string> = {
  plate: '--plate',
  ink: '--ink',
  inkMuted: '--ink-muted',
  inkFaint: '--ink-faint',
  grid: '--grid',
  accent: '--accent',
  reticle: '--reticle',
  tierFoundations: '--tier-foundations',
  tierCore: '--tier-core',
  tierAdvanced: '--tier-advanced',
  tierFrontier: '--tier-frontier',
}

/**
 * The field edition (night plate), as published in tokens.css. Used when no
 * document exists (tests) and as the fallback for any token that fails to
 * resolve.
 */
export const FIELD_PALETTE: Readonly<ScenePalette> = {
  plate: 0x070c1d,
  ink: 0xe9eefb,
  inkMuted: 0xb1bbd6,
  inkFaint: 0x8f9aba,
  grid: 0x9db0ff,
  accent: 0x9db0ff,
  reticle: 0xff6b81,
  tierFoundations: 0x72c8f2,
  tierCore: 0xf1cd6b,
  tierAdvanced: 0xff9b57,
  tierFrontier: 0xff7aa0,
}

/** `rgb(…)`/`rgba(…)` or `#rrggbb` to a 24-bit number; null when unparseable. */
export function parseCssColor(value: string): number | null {
  const text = value.trim()
  const hex = /^#([0-9a-f]{6})$/iu.exec(text)
  if (hex?.[1]) return Number.parseInt(hex[1], 16)
  const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/iu.exec(text)
  if (rgb) {
    const channel = (part: string | undefined): number => Math.max(0, Math.min(255, Math.round(Number(part))))
    return (channel(rgb[1]) << 16) | (channel(rgb[2]) << 8) | channel(rgb[3])
  }
  // `color(srgb r g b)`, which some engines report for computed colours.
  const srgb = /^color\(\s*srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/iu.exec(text)
  if (srgb) {
    const channel = (part: string | undefined): number => Math.max(0, Math.min(255, Math.round(Number(part) * 255)))
    return (channel(srgb[1]) << 16) | (channel(srgb[2]) << 8) | channel(srgb[3])
  }
  return null
}

/**
 * Resolve every token as it paints inside `surface`. The probe is appended,
 * read and removed synchronously, so it never renders.
 */
export function readPalette(surface: Element, fallback: Readonly<ScenePalette> = FIELD_PALETTE): ScenePalette {
  const probe = document.createElement('span')
  probe.setAttribute('aria-hidden', 'true')
  probe.style.position = 'absolute'
  probe.style.visibility = 'hidden'
  surface.append(probe)
  const palette = { ...fallback }
  try {
    for (const key of Object.keys(TOKENS) as PaletteToken[]) {
      probe.style.color = `var(${TOKENS[key]})`
      const resolved = parseCssColor(getComputedStyle(probe).color)
      if (resolved !== null) palette[key] = resolved
    }
  } finally {
    probe.remove()
  }
  return palette
}

/** A token that carries its own alpha (hairlines: `--grid`, `--rule-strong`). */
export interface TokenColor {
  color: number
  alpha: number
}

/** `rgba(…)` alpha, 1 when absent. */
function parseCssAlpha(value: string): number {
  const rgba = /^rgba\(\s*[\d.]+[\s,]+[\d.]+[\s,]+[\d.]+[\s,/]+([\d.]+)/iu.exec(value.trim())
  const srgb = /^color\(\s*srgb\s+[\d.]+\s+[\d.]+\s+[\d.]+\s*\/\s*([\d.]+)/iu.exec(value.trim())
  const alpha = Number(rgba?.[1] ?? srgb?.[1] ?? 1)
  return Number.isFinite(alpha) ? Math.max(0, Math.min(1, alpha)) : 1
}

/**
 * Resolve several tokens, alpha included, as they paint inside `surface`.
 * Tokens that do not resolve are left out of the result.
 */
export function readTokens(surface: Element, tokens: readonly string[]): Map<string, TokenColor> {
  const probe = document.createElement('span')
  probe.setAttribute('aria-hidden', 'true')
  probe.style.position = 'absolute'
  probe.style.visibility = 'hidden'
  surface.append(probe)
  const out = new Map<string, TokenColor>()
  try {
    for (const token of tokens) {
      probe.style.color = `var(${token})`
      const value = getComputedStyle(probe).color
      const color = parseCssColor(value)
      if (color !== null) out.set(token, { color, alpha: parseCssAlpha(value) })
    }
  } finally {
    probe.remove()
  }
  return out
}

/** The font a scene should draw numerals with: the display face, as resolved. */
export function readDisplayFont(surface: Element): string {
  const family = getComputedStyle(surface).getPropertyValue('--font-display').trim()
  return family || 'system-ui, sans-serif'
}
