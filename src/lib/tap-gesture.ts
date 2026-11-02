/** How far (px) a pointer may wander and still count as a tap. */
export const TAP_SLOP = 6

/**
 * Tells a tap from a drag or a pinch. A press is a tap only when it was the
 * sole pointer down and never moved past the slop at any point, so an
 * out-and-back drag and the fingers of a pinch never select.
 */
export class TapGesture {
  private readonly starts = new Map<number, { x: number; y: number }>()
  private clean = false
  private readonly slop: number

  constructor(slop: number = TAP_SLOP) {
    this.slop = slop
  }

  down(pointer: number, x: number, y: number): void {
    this.starts.set(pointer, { x, y })
    this.clean = this.starts.size === 1
  }

  move(pointer: number, x: number, y: number): void {
    const start = this.starts.get(pointer)
    if (start && Math.hypot(x - start.x, y - start.y) > this.slop) this.clean = false
  }

  /** True when this release completes a tap. */
  up(pointer: number, x: number, y: number): boolean {
    if (!this.starts.has(pointer)) return false
    this.move(pointer, x, y)
    this.starts.delete(pointer)
    const tap = this.clean
    // The other fingers of a pinch lift later; none of them is a tap.
    this.clean = false
    return tap
  }

  cancel(pointer: number): void {
    this.starts.delete(pointer)
    this.clean = false
  }
}
