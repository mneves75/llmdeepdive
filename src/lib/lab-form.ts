export type NumberLocale = 'en' | 'pt-br'

const SEPARATORS = /[.,]/gu

/**
 * Parse a non-negative decimal typed into a lab input.
 *
 * The labs use text inputs with `inputmode="decimal"` rather than
 * `type="number"`: Chrome parses a number input in the browser's UI language
 * rather than the page's, and Safari rewrites a typed comma to a dot, so "1,5"
 * on a pt-BR page is not reliably 1.5. Both separators are accepted; the
 * locale only decides the one ambiguous shape — a separator in thousands
 * position ("1.024" in pt-BR, "1,024" in English) is grouping. A sign, an
 * exponent or any other character is rejected rather than guessed at.
 */
export function parseDecimal(raw: string, locale: NumberLocale): number | null {
  const text = raw.replace(/\s/gu, '')
  if (!/^[\d.,]+$/u.test(text) || !/\d/u.test(text)) return null

  const separators = text.match(SEPARATORS) ?? []
  const kinds = new Set(separators)
  let normalized = text
  if (kinds.size === 2) {
    const decimal = text.lastIndexOf('.') > text.lastIndexOf(',') ? '.' : ','
    const grouping = decimal === '.' ? ',' : '.'
    const at = text.lastIndexOf(decimal)
    const whole = text.slice(0, at)
    const fraction = text.slice(at + 1)
    if (fraction.includes(grouping) || !groupedInteger(whole, grouping)) return null
    normalized = whole.replaceAll(grouping, '') + '.' + fraction
  } else if (kinds.size === 1) {
    const separator = separators[0] ?? ''
    const grouping = locale === 'pt-br' ? '.' : ','
    if (separator === grouping && groupedInteger(text, separator)) {
      normalized = text.replaceAll(separator, '')
    } else if (separators.length === 1) {
      normalized = text.replace(separator, '.')
    } else {
      return null
    }
  }

  if (!/^(?:\d+\.?\d*|\.\d+)$/u.test(normalized)) return null
  const value = Number(normalized)
  return Number.isFinite(value) ? value : null
}

function groupedInteger(text: string, grouping: string): boolean {
  const escaped = grouping === '.' ? '\\.' : ','
  // A leading zero is never grouped: "0.125" is a price, not 125.
  return new RegExp(`^[1-9]\\d{0,2}(?:${escaped}\\d{3})+$`, 'u').test(text)
}

/** The value attribute a lab input is server-rendered with, in the page's convention. */
export function formatInputValue(value: number, locale: NumberLocale): string {
  return new Intl.NumberFormat(locale === 'pt-br' ? 'pt-BR' : 'en-US', {
    useGrouping: false,
    maximumFractionDigits: 20,
  }).format(value)
}

/** The locale a lab runs in, from the nearest page language. */
export function pageLocale(element: Element): NumberLocale {
  return element.closest('[lang="pt-BR"]') === null ? 'en' : 'pt-br'
}

/**
 * Read one lab control. Selects hold trusted option values; text inputs are
 * parsed with `parseDecimal` and bounded by `data-min`/`data-max`, and an
 * input that yields no number is marked `aria-invalid`.
 */
export function readLabControl(form: HTMLFormElement, name: string, locale: NumberLocale): number | null {
  const control = form.elements.namedItem(name)
  if (control === null || !('tagName' in control)) return null
  if (control.tagName === 'SELECT') {
    const value = Number((control as HTMLSelectElement).value)
    return Number.isFinite(value) ? value : null
  }
  if (control.tagName !== 'INPUT') return null
  const input = control as HTMLInputElement
  let value = parseDecimal(input.value, locale)
  const min = Number(input.dataset.min ?? Number.NEGATIVE_INFINITY)
  const max = Number(input.dataset.max ?? Number.POSITIVE_INFINITY)
  if (value !== null && (value < min || value > max)) value = null
  if (value === null) input.setAttribute('aria-invalid', 'true')
  else input.removeAttribute('aria-invalid')
  return value
}

/**
 * Write every `[data-out]` result and the validation message together, so a
 * lab can never show the last valid answer beside an input that has none.
 */
export function showLabOutputs(form: HTMLFormElement, values: Record<string, string>, message: string): void {
  for (const [name, value] of Object.entries(values)) {
    const element = form.querySelector<HTMLElement>(`[data-out="${name}"]`)
    if (element) element.textContent = value
  }
  const validation = form.querySelector<HTMLElement>('[data-out="validation"]')
  if (validation) validation.textContent = message
}
