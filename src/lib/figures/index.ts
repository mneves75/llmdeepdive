/**
 * The figure registry.
 *
 * One file per track, merged here. That layout is not cosmetic: content work on
 * this repo runs as concurrent lanes over disjoint track directories, and a
 * single large registry file would put every lane in conflict with every other.
 *
 * `satisfies FigureRegistry` is doing real work — it makes a missing pt-BR label
 * a TYPE error rather than something a gate has to catch later, which is the
 * cheapest place in the pipeline to catch it.
 */
import type { Figure, FigureRegistry } from './types'
import { TRACK_1_FIGURES } from './1-text-to-tensors'
import { TRACK_4_FIGURES } from './4-transformer'
import { TRACK_7_FIGURES } from './7-inference-and-efficiency'
import { TRACK_9_FIGURES } from './9-hardware-and-infrastructure'

export const FIGURES = {
  ...TRACK_1_FIGURES,
  ...TRACK_4_FIGURES,
  ...TRACK_7_FIGURES,
  ...TRACK_9_FIGURES,
} as const satisfies FigureRegistry

export type FigureId = keyof typeof FIGURES

/** Every id in the registry, for gates and error messages. */
export const FIGURE_IDS: readonly string[] = Object.keys(FIGURES)

/**
 * Look a figure up by an id that is only known at runtime — an MDX author
 * writes `<Figure id="…" />` as a plain string, so the literal key type cannot
 * help there.
 *
 * `FIGURES` deliberately keeps its literal type rather than being declared as
 * `FigureRegistry`: that is what makes a missing pt-BR label a compile error at
 * the point it is authored. The widening happens here, once, instead of
 * throwing the guarantee away at the definition site.
 */
export function getFigure(id: string): Figure | undefined {
  return (FIGURES as FigureRegistry)[id]
}
