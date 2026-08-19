import * as THREE from 'three'

/**
 * Three.js cannot garbage-collect GPU resources; every geometry, material and
 * texture must be released explicitly. This walks a subtree and disposes all
 * three, including textures reachable through arbitrary material slots
 * (`map`, `normalMap`, `envMap`, custom uniforms, …) rather than a hardcoded list.
 */
export function disposeSubtree(root: THREE.Object3D): void {
  const seenMaterials = new Set<THREE.Material>()

  root.traverse((obj) => {
    const mesh = obj as Partial<THREE.Mesh> & Partial<THREE.Points> & Partial<THREE.Line>
    mesh.geometry?.dispose()

    const material = (obj as Partial<THREE.Mesh>).material
    if (!material) return
    const list = Array.isArray(material) ? material : [material]
    for (const mat of list) {
      if (seenMaterials.has(mat)) continue
      seenMaterials.add(mat)
      disposeMaterial(mat)
    }
  })
}

function disposeMaterial(material: THREE.Material): void {
  for (const value of Object.values(material)) {
    if (value instanceof THREE.Texture) value.dispose()
  }
  // Shader materials hide textures inside uniforms, where Object.values misses them.
  const uniforms = (material as Partial<THREE.ShaderMaterial>).uniforms
  if (uniforms) {
    for (const uniform of Object.values(uniforms)) {
      if (uniform?.value instanceof THREE.Texture) uniform.value.dispose()
    }
  }
  material.dispose()
}
