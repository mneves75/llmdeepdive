/** Feature detection kept separate so checking WebGL never imports Three.js. */
export function isWebGLAvailable(): boolean {
  try {
    if (!window.WebGL2RenderingContext) return false
    const gl = document.createElement('canvas').getContext('webgl2') ?? document.createElement('canvas').getContext('webgl')
    if (!gl) return false
    // The probe's context is released at once: browsers cap live contexts per
    // page, and the stage that follows must not share the budget with it.
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return true
  } catch {
    return false
  }
}
