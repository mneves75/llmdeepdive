/**
 * Left edge of the floating callout card, hung past the instrument's
 * silhouette on the `outward` side, or null when the card would have to be
 * pushed back over the instrument to stay inside the stage. Null means dock.
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
    const left = Math.max(elbowX + run, span.right + run) + 6
    return left + cardWidth <= stageWidth - edge ? left : null
  }
  const left = Math.min(elbowX - run, span.left - run) - 6 - cardWidth
  return left >= edge ? left : null
}
