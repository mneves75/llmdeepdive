/**
 * The figure system's data model.
 *
 * A figure is DATA, not markup. One definition serves both locales, which is
 * what makes bilingual parity structural rather than a promise: the MDX call is
 * byte-identical in `en` and `pt-br`, and a missing translation is a *compile*
 * error here rather than a gate failure later.
 *
 * Figures render as HTML plus, where real geometry is involved, inline SVG.
 * The rule that decides which is per-CONTENT, not per-kind:
 *
 *   SVG draws geometry. HTML holds every string. Always.
 *
 * pt-BR labels run 15–25% longer than English and SVG <text> does not wrap, so a
 * label in an <svg> is a clipped label. HTML labels also translate, select,
 * inherit the page font, respond to browser zoom, and get indexed by Pagefind.
 */
import type { Locale } from '~/lib/i18n'

/** A string that must exist in both locales. Missing one fails typecheck. */
export type Localised = Readonly<Record<Locale, string>>

export type FigureKind = 'flow' | 'stack' | 'grid' | 'plot'

/** One stage in a `flow`, or one layer in a `stack`. */
export interface FigureStep {
  readonly label: Localised
  /** Short annotation under the label — a shape, a size, a count. */
  readonly detail?: Localised
  /**
   * Which pigment names this step. Semantic, never decorative: the same token
   * must mean the same thing across every figure in the course.
   */
  readonly pigment?: FigurePigment
  /** `stack` only: relative weight of this band. Bare number, formatted at render. */
  readonly weight?: number
}

/**
 * Pigments are the design system's encoded colours, referenced by name so a
 * figure can never ship a raw hex. `a11y-contrast.mjs` cannot see a hex inside a
 * component, which is exactly how the explorer's twelve raw colours escaped it.
 */
export type FigurePigment = 'accent' | 'sonar' | 'coral' | 'kelp' | 'muted'

export interface FlowFigure {
  readonly kind: 'flow'
  readonly steps: readonly FigureStep[]
}

export interface StackFigure {
  readonly kind: 'stack'
  /** Rendered bottom-to-top when `direction` is 'up', matching the Observatory. */
  readonly direction: 'up' | 'down'
  readonly steps: readonly FigureStep[]
}

export interface GridFigure {
  readonly kind: 'grid'
  readonly columns: readonly Localised[]
  readonly rows: readonly Localised[]
  /**
   * Row-major cells. `null` is a masked cell — rendered as an explicit absence,
   * not an empty box, because "this position cannot be attended to" is the
   * teaching point in every lesson that uses one.
   */
  readonly cells: readonly (readonly (number | null)[])[]
  /** Cells are binned, never continuously ramped: a ramp escapes the contrast gate. */
  readonly bins: 4
}

export interface PlotSeries {
  readonly label: Localised
  readonly pigment: FigurePigment
  readonly points: readonly (readonly [x: number, y: number])[]
  /** A single highlighted point, e.g. the roofline ridge. */
  readonly marks?: readonly { readonly at: readonly [number, number]; readonly label: Localised }[]
}

export interface PlotFigure {
  readonly kind: 'plot'
  readonly xAxis: FigureAxis
  readonly yAxis: FigureAxis
  readonly series: readonly PlotSeries[]
}

export interface FigureAxis {
  readonly label: Localised
  readonly scale: 'linear' | 'log'
  readonly min: number
  readonly max: number
  /** Unit suffix for tick labels, e.g. 'GiB'. Not localised — units are notation. */
  readonly unit?: string
}

export type FigureBody = FlowFigure | StackFigure | GridFigure | PlotFigure

/**
 * A stepped figure server-renders every step and switches between them with
 * native radio inputs plus sibling selectors — no JavaScript, no CSP hash, no
 * bundle budget, and keyboard operation comes free from the radio group.
 */
export interface FigureStepFrame {
  readonly label: Localised
  readonly caption: Localised
  readonly body: FigureBody
}

export interface Figure {
  /** Lesson id this figure belongs to. Checked against the real corpus. */
  readonly lesson: string
  readonly title: Localised
  /** The <figcaption>. Says what the reader should take from the figure. */
  readonly caption: Localised
  /**
   * Set when the figure restates a number another lesson owns (7.2 owns the
   * KV arithmetic, 9.3 owns the memory budget). Renders as a link back.
   */
  readonly derivedFrom?: string
  /** A single view, or an ordered set of steps the reader moves through. */
  readonly body?: FigureBody
  readonly steps?: readonly FigureStepFrame[]
}

export type FigureRegistry = Readonly<Record<string, Figure>>
