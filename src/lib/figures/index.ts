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
import { TRACK_10_FIGURES } from './10-video-and-world-models'
import { TRACK_14_FIGURES } from './14-agent-architecture-and-state'
import { TRACK_15_FIGURES } from './15-tool-contracts-and-mcp'
import { TRACK_16_FIGURES } from './16-agent-security-and-guardrails'
import { TRACK_17_FIGURES } from './17-sandboxed-agent-execution'
import { TRACK_18_FIGURES } from './18-computer-use-and-gui-automation'
import { TRACK_19_FIGURES } from './19-agent-memory-and-context'
import { TRACK_20_FIGURES } from './20-human-approval-and-durable-pauses'
import { TRACK_21_FIGURES } from './21-bounded-agent-self-correction'
import { TRACK_22_FIGURES } from './22-multi-agent-systems-and-a2a'
import { TRACK_23_FIGURES } from './23-agent-evaluation-and-ci'
import { TRACK_24_FIGURES } from './24-agent-resilience-and-fallbacks'
import { TRACK_25_FIGURES } from './25-agent-capstone-and-portfolio'

export const FIGURES = {
  ...TRACK_1_FIGURES,
  ...TRACK_4_FIGURES,
  ...TRACK_7_FIGURES,
  ...TRACK_9_FIGURES,
  ...TRACK_10_FIGURES,
  ...TRACK_14_FIGURES,
  ...TRACK_15_FIGURES,
  ...TRACK_16_FIGURES,
  ...TRACK_17_FIGURES,
  ...TRACK_18_FIGURES,
  ...TRACK_19_FIGURES,
  ...TRACK_20_FIGURES,
  ...TRACK_21_FIGURES,
  ...TRACK_22_FIGURES,
  ...TRACK_23_FIGURES,
  ...TRACK_24_FIGURES,
  ...TRACK_25_FIGURES,
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
