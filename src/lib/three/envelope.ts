/**
 * The world-space box every scene has to live in.
 *
 * The stage's camera position, FOV, fog range, contact shadow and floor plane
 * are all fixed constants — nothing auto-frames the model. A scene that grows
 * past this envelope is not merely off-centre: it sinks through the floor and
 * clips the canvas, silently, at the size the author happened to be looking at.
 *
 * These live in their own module so the scene tests can import them. `stage.ts`
 * pulls in `OrbitControls`, which does not load outside a browser.
 */

/** Largest dimension a mounted scene may occupy. */
export const FIT_SIZE = 3.8

/** Y of the graphite floor, contact shadow and reference grid. */
export const STAGE_FLOOR_Y = -2.1
