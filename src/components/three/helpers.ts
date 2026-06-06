import * as THREE from 'three'

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Convert alpha-blended foliage materials (leaves, grass cards) to alpha-tested
 * cutouts. Blended transparency doesn't write to the depth buffer and is sorted
 * per-object by distance, which makes leaves pop through each other or vanish at
 * grazing angles. Alpha testing renders them as opaque cutouts — depth-correct,
 * no sorting. Safe on solid textures too (alpha defaults to 1 ≥ threshold).
 * Materials are shared across GLB clones, so call this once on the base.
 */
export function fixFoliageMaterials(obj: THREE.Object3D) {
  obj.traverse(c => {
    const mesh = c as THREE.Mesh
    if (!mesh.isMesh) return
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    mats.forEach(mat => {
      const m = mat as THREE.MeshStandardMaterial
      m.transparent = false
      m.alphaTest = 0.5
      m.depthWrite = true
      m.side = THREE.DoubleSide   // leaf cards must show from both faces
      m.needsUpdate = true
    })
  })
}

/**
 * Fix the common exporter bug where fully-opaque materials are flagged
 * `transparent: true`. That pushes them into the depth-sorted transparent pass
 * where they z-fight, pop through, or disappear at certain angles. If a material
 * is effectively opaque (opacity ≥ 0.99) and has no alpha cutout map, make it
 * truly opaque. Genuine glass/water (opacity < 1) is left untouched.
 */
export function normalizeOpaqueMaterials(obj: THREE.Object3D) {
  obj.traverse(c => {
    const mesh = c as THREE.Mesh
    if (!mesh.isMesh) return
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    mats.forEach(mat => {
      const m = mat as THREE.MeshStandardMaterial
      if (m.transparent && (m.opacity ?? 1) >= 0.99 && !m.alphaMap) {
        m.transparent = false
        m.depthWrite = true
        m.needsUpdate = true
      }
    })
  })
}

export function mulberry32(seed: number) {
  return () => {
    seed += 0x6d2b79f5
    let t = seed
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Shortest-path angle interpolation — avoids 350°→10° spinning the long way
export function lerpAngle(from: number, to: number, t: number): number {
  const twoPi = Math.PI * 2
  const delta = ((to - from) % twoPi + twoPi * 1.5) % twoPi - Math.PI
  return from + delta * t
}
