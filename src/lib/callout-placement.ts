/**
 * Left edge of the floating callout card, hung past the instrument's
 * silhouette on the `outward` side and kept inside the stage. Null when
 * keeping it inside would leave less than `run` between card and instrument:
 * the caller docks the card instead.
 */
export function floatingCalloutLeft(opts: {
  outward: 1 | -1
  elbowX: number
  span: { left: number; right: number }
  run: number
  cardWidth: number
  stageWidth: number
  edge: number
}): number | null {
  const { outward, elbowX, span, run, cardWidth, stageWidth, edge } = opts
  if (outward > 0) {
    const ideal = Math.max(elbowX + run, span.right + run) + 6
    const left = Math.min(ideal, stageWidth - edge - cardWidth)
    return left >= span.right + run ? left : null
  }
  const ideal = Math.min(elbowX - run, span.left - run) - 6 - cardWidth
  const left = Math.max(ideal, edge)
  return left + cardWidth <= span.left - run ? left : null
}
