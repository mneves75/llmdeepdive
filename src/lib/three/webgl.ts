/** Feature detection kept separate so checking WebGL never imports Three.js. */
export function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(
      window.WebGL2RenderingContext &&
        (canvas.getContext('webgl2') ?? canvas.getContext('webgl')),
    )
  } catch {
    return false
  }
}
