import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'
import { mulberry32 } from '../helpers'
import { CylCol } from '../types'
import {
  BOWL_CX, BOWL_PINS_Z, BOWL_START_Z,
  RTOSS_CX, RTOSS_POST_Z, RTOSS_START_Z,
  PIT_CX, PIT_CZ, TRAMP_CX, TRAMP_CZ, TRAMP_R,
} from '../constants'

export function createNature(
  scene: THREE.Scene,
  cylCols: CylCol[],
  FIRE_POS: THREE.Vector3,
  POND_X: number,
  POND_Z: number,
  POND_R: number,
) {
  const gltfLoader = new GLTFLoader()
  const fbxLoader  = new FBXLoader()

  function logSize(label: string, grp: THREE.Group) {
    const box = new THREE.Box3().setFromObject(grp)
    const size = new THREE.Vector3(); box.getSize(size)
    console.log(`[nature] ${label}  size: x=${size.x.toFixed(2)} y=${size.y.toFixed(2)} z=${size.z.toFixed(2)}`)
  }
  function loadGLB(path: string): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      gltfLoader.load(
        path,
        gltf => {
          gltf.scene.traverse(child => {
            if ((child as THREE.Mesh).isMesh) { child.castShadow = true; child.receiveShadow = true }
          })
          logSize(path.split('/').pop()!, gltf.scene)
          resolve(gltf.scene)
        },
        undefined,
        err => { console.error('[nature] GLB FAILED:', path, err); reject(err) }
      )
    })
  }
  function loadFBX(path: string, normalizeHeight = 6): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      fbxLoader.load(
        path,
        grp => {
          grp.traverse(child => {
            if ((child as THREE.Mesh).isMesh) { child.castShadow = true; child.receiveShadow = true }
          })
          // Normalize oversized FBX models (Blender often exports in cm = 100× scale)
          const box = new THREE.Box3().setFromObject(grp)
          const h = new THREE.Vector3(); box.getSize(h)
          if (h.y > 10) grp.scale.setScalar(normalizeHeight / h.y)
          logSize(path.split('/').pop()!, grp)
          resolve(grp)
        },
        undefined,
        err => { console.error('[nature] FBX FAILED:', path, err); reject(err) }
      )
    })
  }

  // GLBs first — all confirmed working
  Promise.all([
    '/assets/nature/Tree1.3.glb',
    '/assets/nature/Tree2.3.glb',
    '/assets/nature/Tree3.3.glb',
    '/assets/nature/Bush1.3.glb',
    '/assets/nature/Bush2.3.glb',
    '/assets/nature/Bush3.3.glb',
    '/assets/nature/Stone1.3.glb',
    '/assets/nature/Stone2.3.glb',
    '/assets/nature/Stone3.3.glb',
    '/assets/nature/Flower1.3.glb',
    '/assets/nature/Flower2.3.glb',
    '/assets/nature/Flower3.3.glb',
    '/assets/nature/Mushroom1.2.glb',
    '/assets/nature/Mushroom2.2.glb',
  ].map(loadGLB)).then(([t1, t2, t3, b1, b2, b3, s1, s2, s3, fl1, fl2, fl3, m1, m2]) => {
    const bushes  = [b1, b2, b3]
    const stones  = [s1, s2, s3]
    const flowers = [fl1, fl2, fl3]
    const mushs   = [m1, m2]

    // FBX trees — non-fatal if any fail
    Promise.allSettled([
      loadFBX('/assets/nature/Tree low.FBX'),
    ]).then(fbxResults => {
      const fbxTrees = fbxResults
        .filter((r): r is PromiseFulfilledResult<THREE.Group> => r.status === 'fulfilled')
        .map(r => r.value)
      const trees = [t1, t2, t3, ...fbxTrees]
      const treeNames = ['Tree1.3.glb', 'Tree2.3.glb', 'Tree3.3.glb', 'Tree low.FBX']

      // Normalize environment map contribution across all nature models so they
      // have consistent brightness regardless of what's baked into each asset.
      const normalizeNature = (obj: THREE.Object3D) => {
        obj.traverse(child => {
          const mesh = child as THREE.Mesh
          if (!mesh.isMesh) return
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
          mats.forEach(m => {
            const std = m as THREE.MeshStandardMaterial
            if (std.isMeshStandardMaterial) {
              std.envMapIntensity = 0.35
            } else {
              // Unlit materials (MeshBasicMaterial, MeshLambertMaterial) — darken color directly
              const basic = m as THREE.MeshBasicMaterial
              if (basic.color) basic.color.multiplyScalar(0.45)
            }
          })
        })
      }
      ;[...trees, ...bushes, ...stones, ...flowers, ...mushs].forEach(normalizeNature)
      // Per-model base scale (user-tuned) + ground Y offset computed from bounding box
      const baseScales = [0.950, 0.725, 0.625, 0.050]
      const treeConfigs = trees.map((t, i) => {
        const box = new THREE.Box3().setFromObject(t)
        const yOff = box.min.y < -0.05 ? -box.min.y : 0  // lift model so base sits at y=0
        const scale = baseScales[i] ?? 0.6
        console.log(`[trees] variant ${i} (${treeNames[i] ?? 'FBX'}): baseScale=${scale}  yOff=${yOff.toFixed(3)}  raw min.y=${box.min.y.toFixed(3)}`)
        return { scale, yOff }
      })
      console.log(`[nature] Tree pool: ${trees.length} variants (${fbxTrees.length} FBX loaded)`)

      // Building exclusion — keeps nature clear of building footprints
      function nearBuilding(x: number, z: number): boolean {
        if (Math.hypot(x - (-51),   z - (-15))   < 14) return true  // Duo
        if (Math.hypot(x - (-53.5), z - (-35.5)) < 8)  return true  // Orange store
        if (Math.hypot(x - (-53),   z - (-55))   < 8)  return true  // Purple store
        if (Math.hypot(x - 20,    z - (-8))  < 12) return true  // About Me
        return false
      }

      // AABB road exclusion — keeps nature off all road surfaces
      function onRoad(x: number, z: number, pad = 1.5): boolean {
        // Driveway: center (6, 5), w=6, d=13
        if (x >= 3 - pad && x <= 9 + pad && z >= -1.5 - pad && z <= 11.5 + pad) return true
        // Bottom connector: outer edge of Project Blvd to outer edge of Memory Ln
        if (x >= -45 - pad && x <= 47 + pad && z >= -8 - pad && z <= 0 + pad) return true
        // Project Blvd: center (-41, -48), w=8, d=86
        if (x >= -45 - pad && x <= -37 + pad && z >= -91 - pad && z <= -5 + pad) return true
        // Memory Ln: center (43, -48), w=8, d=86
        if (x >= 39 - pad && x <= 47 + pad && z >= -91 - pad && z <= -5 + pad) return true
        return false
      }

      // Pre-compute ground Y offsets for each pool variant
      function getYOffs(pool: THREE.Group[]): number[] {
        return pool.map(g => {
          const box = new THREE.Box3().setFromObject(g)
          return -box.min.y  // always ground the object regardless of where its origin is
        })
      }
      const bushYOffs   = getYOffs(bushes)
      const stoneYOffs  = getYOffs(stones)
      const flowerYOffs = getYOffs(flowers)
      const mushYOffs   = getYOffs(mushs)

      function scatter(
        pool: THREE.Group[], seed: number, count: number,
        scMin: number, scMax: number,
        extraChecks?: (x: number, z: number) => boolean,
        yOffs?: number[]
      ) {
        const r = mulberry32(seed)
        for (let i = 0; i < count; i++) {
          const x = (r() - 0.5) * 160, z = r() * 130 - 95
          const sc = scMin + r() * (scMax - scMin)
          const yr = r() * Math.PI * 2
          const vi = Math.floor(r() * pool.length)
          if (Math.hypot(x, z) > 88) continue
          if (Math.hypot(x, z) < SPAWN_CLEAR - 4) continue
          if (onRoad(x, z, 3.0) || nearBuilding(x, z)) continue   // pad 3.0 = road + sidewalk width
          if (x >= -45 && x <= 55 && z >= 0 && z <= 35) continue  // full house/cabin strip north of road
          if (Math.hypot(x - FIRE_POS.x, z - FIRE_POS.z) < 4.0) continue
          if (Math.abs(x - BOWL_CX) < 4.0 && z > BOWL_PINS_Z - 3 && z < BOWL_START_Z + 4) continue
          if (Math.abs(x - RTOSS_CX) < 3.5 && z > RTOSS_POST_Z - 2 && z < RTOSS_START_Z + 4) continue
          if (Math.hypot(x - PIT_CX, z - PIT_CZ) < 5.0) continue
          if (Math.hypot(x - TRAMP_CX, z - TRAMP_CZ) < TRAMP_R + 2) continue
          if (extraChecks && extraChecks(x, z)) continue
          const obj = pool[vi].clone(true)
          const yOff = (yOffs?.[vi] ?? 0) * sc
          obj.position.set(x, yOff, z); obj.scale.setScalar(sc); obj.rotation.y = yr
          scene.add(obj)
        }
      }

      const SPAWN_CLEAR = 12  // keep trees away from player spawn (0, 0)
      // Per-load random offset so plants differ each visit
      const spawnSeed = Date.now() & 0xffffffff

      // Trees — also push cylinder colliders
      const tRng = mulberry32(42 + spawnSeed)
      for (let i = 0; i < 220; i++) {
        const x = (tRng() - 0.5) * 160, z = tRng() * 130 - 95
        const variation = 0.85 + tRng() * 0.30   // ±15% random size variation
        const yr = tRng() * Math.PI * 2
        const vi = Math.floor(tRng() * trees.length)
        if (Math.hypot(x, z) > 90) continue
        if (Math.hypot(x, z) < SPAWN_CLEAR) continue
        if (onRoad(x, z, 3.0) || nearBuilding(x, z)) continue   // pad 3.0 = road + sidewalk width
        if (x >= -45 && x <= 55 && z >= 0 && z <= 35) continue  // full house/cabin strip north of road
        if (Math.hypot(x - FIRE_POS.x, z - FIRE_POS.z) < 5.0) continue
        if (Math.abs(x - BOWL_CX) < 3.5 && z > BOWL_PINS_Z - 3 && z < BOWL_START_Z + 4) continue
        if (Math.abs(x - RTOSS_CX) < 3.0 && z > RTOSS_POST_Z - 2 && z < RTOSS_START_Z + 4) continue
        if (Math.hypot(x - PIT_CX, z - PIT_CZ) < 4.0) continue
        if (Math.hypot(x - TRAMP_CX, z - TRAMP_CZ) < TRAMP_R + 2.5) continue
        if (Math.hypot(x - POND_X, z - POND_Z) < POND_R + 2.5) continue
        const cfg = treeConfigs[vi] ?? { scale: 0.6, yOff: 0 }
        const sc = cfg.scale * variation
        cylCols.push({ x, z, r: 0.3 * sc })
        const obj = trees[vi].clone(true)
        obj.position.set(x, cfg.yOff * sc, z); obj.scale.setScalar(sc); obj.rotation.y = yr
        scene.add(obj)
      }

      const northStrip = (x: number, z: number) => x >= -45 && x <= 55 && z >= 0 && z <= 35
      scatter(bushes,  77  + spawnSeed, 120, 0.8, 1.4, (x: number, z: number) =>
        onRoad(x, z, 3.0) || nearBuilding(x, z) || northStrip(x, z) ||
        Math.hypot(x, z) < SPAWN_CLEAR - 2 ||
        Math.hypot(x - POND_X, z - POND_Z) < POND_R + 1.5,
        bushYOffs
      )
      scatter(stones,  99  + spawnSeed,  80, 0.5, 1.2, (x: number, z: number) =>
        onRoad(x, z, 3.0) || nearBuilding(x, z) || northStrip(x, z) ||
        Math.hypot(x - POND_X, z - POND_Z) < POND_R + 1.0,
        stoneYOffs
      )
      scatter(flowers, 123 + spawnSeed, 160, 2.0, 3.5, (x: number, z: number) =>
        onRoad(x, z, 3.0) || nearBuilding(x, z) || northStrip(x, z), flowerYOffs)
      scatter(mushs,    55 + spawnSeed,  60, 1.2, 2.2, (x: number, z: number) =>
        onRoad(x, z, 3.0) || nearBuilding(x, z) || northStrip(x, z), mushYOffs)
      console.log('[nature] All assets scattered successfully')
    })
  }).catch(err => {
    console.error('[nature] GLB load failed:', err)
  })
}
