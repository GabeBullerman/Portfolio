import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { BoxCol, Movable } from '../types'
import { mulberry32 } from '../helpers'

// Park boundaries — match world.ts road geometry exactly
const PARK = { W: -37, E: 39, N: -8, S: -91 }

export interface ParkResult {
  addSidewalk: () => void
}

export function createPark(scene: THREE.Scene, movables: Movable[], boxCols: BoxCol[]): ParkResult {
  const gltfLoader = new GLTFLoader()

  const loadGLB = (path: string): Promise<THREE.Group> =>
    new Promise((resolve, reject) => gltfLoader.load(path, g => resolve(g.scene), undefined, reject))

  const prepare = (obj: THREE.Object3D) => {
    obj.traverse(c => {
      if ((c as THREE.Mesh).isMesh) { c.castShadow = true; c.receiveShadow = true }
    })
  }

  const addDebug = (grp: THREE.Group, name: string) => {
    prepare(grp)
    movables.push({ name, group: grp, scaleObj: grp })
    scene.add(grp)
  }

  // Center mesh X/Z within a wrapper so scaling grows symmetrically from center
  const centerXZ = (mesh: THREE.Group): { wrapper: THREE.Group; center: THREE.Vector3 } => {
    mesh.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(mesh)
    const center = new THREE.Vector3()
    box.getCenter(center)
    mesh.position.x -= center.x
    mesh.position.z -= center.z
    const wrapper = new THREE.Group()
    wrapper.add(mesh)
    return { wrapper, center }
  }

  const addSidewalkMesh = (mesh: THREE.Group, name: string, x: number, z: number) => {
    prepare(mesh)
    const { wrapper, center } = centerXZ(mesh)
    wrapper.position.set(x, center.y > 0.01 ? 0 : 0, z)
    movables.push({ name, group: wrapper, scaleObj: wrapper })
    scene.add(wrapper)
  }

  // ── Skatepark ────────────────────────────────────────────────────────────
  gltfLoader.load('/assets/outdoor/skatepark/Untitled.glb', gltf => {
    const sk = gltf.scene
    sk.scale.setScalar(24)
    sk.position.set(19, 0, -57.5)
    sk.rotation.y = Math.PI / 2
    addDebug(sk, '🛹 Skatepark')
  }, undefined, err => console.error('[skatepark]', err))

  // ── Individual park pieces ─────────────────────────────────────────────
  const singles = [
    { name: '🌿 Bush (sphere)',     path: '/assets/outdoor/park stuff/bushes/short sphere/Untitled.glb',         pos: null as [number,number,number] | null, scale: null as number | null, rot: null as number | null },
    { name: '🌿 Bush (short wide)', path: '/assets/outdoor/park stuff/bushes/short wide/Untitled.glb',           pos: null, scale: null, rot: null },
    { name: '🌿 Bush (tall wide)',  path: '/assets/outdoor/park stuff/bushes/tall wide/Untitled.glb',            pos: null, scale: null, rot: null },
    { name: '🛝 Playground',       path: '/assets/outdoor/park stuff/playground/Untitled.glb',                  pos: [8.47, 0, -77.14] as [number,number,number], scale: null, rot: -Math.PI / 6 },
    { name: '🛤️ Sidewalk (left)',  path: '/assets/outdoor/park stuff/sidewalks/sidewalk left turn/Untitled.glb', pos: null, scale: null, rot: null },
    { name: '🛤️ Sidewalk (right)', path: '/assets/outdoor/park stuff/sidewalks/sidewalk right turn/Untitled.glb', pos: null, scale: null, rot: null },
    { name: '🚩 Street Sign',      path: '/assets/outdoor/park stuff/street sign/Untitled.glb',                 pos: [-2.23, 0, -8.67] as [number,number,number], scale: 2, rot: null },
    { name: '🗑️ Trashcan',        path: '/assets/outdoor/park stuff/trashcan/Untitled.glb',                    pos: null, scale: null, rot: null },
  ]

  const rng = mulberry32(1234)
  let sidewalkBase: THREE.Group | null = null
  let sidewalkCount = 0

  Promise.all(singles.map(s => loadGLB(s.path))).then(loaded => {
    loaded.forEach((mesh, i) => {
      const { name, pos, scale, rot } = singles[i]
      const x = pos ? pos[0] : (rng() - 0.5) * 40
      const z = pos ? pos[2] : -20 - rng() * 50
      if (name.startsWith('🛤️')) {
        addSidewalkMesh(mesh, name, x, z)
      } else {
        mesh.position.set(x, 0, z)
        if (scale) mesh.scale.setScalar(scale)
        if (rot != null) mesh.rotation.y = rot
        addDebug(mesh, name)
      }
      // Consume rng slots for non-pinned items to keep other items' positions stable
      if (pos) { rng(); rng() }
    })
  }).catch(err => console.error('[park-singles]', err))

  // ── Pre-placed sidewalks: 4 straight arms + 1 4-way connector ─────────────
  Promise.all([
    loadGLB('/assets/outdoor/park stuff/sidewalks/sidewalk straight/Untitled.glb'),
    loadGLB('/assets/outdoor/park stuff/sidewalks/sidewalk 4 way intersection/Untitled.glb'),
  ]).then(([straightBase, fourwayBase]) => {
    sidewalkBase = straightBase.clone(true)

    const straights = [
      { name: '🛤️ Straight 1', pos: [1.00,   0, -27.40] as [number,number,number], rot: 0,            scale: [1.772, 1.000, 38.720] as [number,number,number] },
      { name: '🛤️ Straight 2', pos: [-18.40, 0, -47.85] as [number,number,number], rot: Math.PI / 2,  scale: [2.122, 1.000, 37.209] as [number,number,number] },
      { name: '🛤️ Straight 3', pos: [20.40,  0, -47.80] as [number,number,number], rot: Math.PI / 2,  scale: [2.144, 1.006, 37.139] as [number,number,number] },
      { name: '🛤️ Straight 4', pos: [1.00,   0, -61.50] as [number,number,number], rot: 0,            scale: [1.754, 1.000, 25.273] as [number,number,number] },
    ]
    straights.forEach(({ name, pos, rot, scale }) => {
      const mesh = straightBase.clone(true)
      prepare(mesh)
      const { wrapper } = centerXZ(mesh)
      wrapper.position.set(...pos)
      wrapper.rotation.y = rot
      wrapper.scale.set(...scale)
      movables.push({ name, group: wrapper, scaleObj: wrapper })
      scene.add(wrapper)
    })

    const fwMesh = fourwayBase
    prepare(fwMesh)
    const { wrapper: fw } = centerXZ(fwMesh)
    fw.position.set(1, 0, -47.80)
    fw.scale.set(1.772, 1.000, 2.144)
    movables.push({ name: '🛤️ 4-Way', group: fw, scaleObj: fw })
    scene.add(fw)

  }).catch(err => console.error('[park-sidewalks]', err))

  // ── Trees + Fences — loaded together so fences can measure themselves ──
  Promise.all([
    loadGLB('/assets/outdoor/park stuff/tree/Untitled.glb'),
    loadGLB('/assets/outdoor/park stuff/border fence/plain/Untitled.glb'),
    loadGLB('/assets/outdoor/park stuff/border fence/end/Untitled.glb'),
  ]).then(([treeBase, plainBase, endBase]) => {

    // ── Trees ─────────────────────────────────────────────────────────────
    const FENCE_BUF = 4
    const innerW = PARK.W + 7.40 + FENCE_BUF   // -25.6
    const innerE = PARK.E + 6.50 - FENCE_BUF   //  41.5
    const innerN = PARK.N + 6.00 - FENCE_BUF   //  -6

    const treeRng = mulberry32(7777)
    ;[
      { name: '🌳 Trees (NW)', xr: [innerW, -8]        as [number,number], zr: [innerN, -44]      as [number,number] },
      { name: '🌳 Trees (NE)', xr: [8,  innerE]         as [number,number], zr: [innerN, -44]      as [number,number] },
      { name: '🌳 Trees (SW)', xr: [innerW, -8]         as [number,number], zr: [-56, PARK.S + 5] as [number,number] },
      { name: '🌳 Trees (SE)', xr: [8,  innerE]         as [number,number], zr: [-56, PARK.S + 5] as [number,number] },
    ].forEach(({ name, xr, zr }) => {
      const grp = new THREE.Group()
      for (let i = 0; i < 12; i++) {
        const t = treeBase.clone(true)
        t.position.set(
          xr[0] + treeRng() * (xr[1] - xr[0]),
          0,
          zr[0] + treeRng() * (zr[1] - zr[0])
        )
        t.scale.setScalar(0.8 + treeRng() * 0.5)
        t.rotation.y = treeRng() * Math.PI * 2
        t.traverse(c => { if ((c as THREE.Mesh).isMesh) { c.castShadow = true; c.receiveShadow = true } })
        grp.add(t)
      }
      movables.push({ name, group: grp, scaleObj: grp })
      scene.add(grp)
    })

    // ── Fence walls ──────────────────────────────────────────────────────
    const fBox = new THREE.Box3().setFromObject(plainBase)
    const fSz = new THREE.Vector3(); fBox.getSize(fSz)
    const measuredSP = Math.max(fSz.x, fSz.z)

    // Mutable spacing shared by all three walls
    let fenceSpacing = measuredSP - 0.08

    function clonePiece(isEnd: boolean, x: number, z: number, rotY: number, parent: THREE.Group) {
      const p = (isEnd ? endBase : plainBase).clone(true)
      p.position.set(x, 0, z)
      p.rotation.y = rotY
      p.traverse(c => { if ((c as THREE.Mesh).isMesh) { c.castShadow = true; c.receiveShadow = true } })
      parent.add(p)
    }

    type WallDef = {
      grp: THREE.Group
      axis: 'x' | 'z'
      fixed: number
      rangeMin: number
      rangeMax: number
      gapMin: number
      gapMax: number
      rotY: number
    }

    function buildPieces(w: WallDef) {
      while (w.grp.children.length > 0) w.grp.remove(w.grp.children[0])
      const sp = fenceSpacing
      for (let p = w.rangeMin; p <= w.rangeMax; p += sp) {
        if (p > w.gapMin - sp / 2 && p < w.gapMax + sp / 2) continue
        const isEnd =
          p <= w.rangeMin + sp / 2 || p >= w.rangeMax - sp / 2 ||
          (p > w.gapMin - sp * 1.5 && p <= w.gapMin) ||
          (p >= w.gapMax && p < w.gapMax + sp * 1.5)
        clonePiece(isEnd,
          w.axis === 'x' ? p : w.fixed,
          w.axis === 'x' ? w.fixed : p,
          w.rotY, w.grp
        )
      }
    }

    const wallDefs: WallDef[] = [
      { grp: new THREE.Group(), axis: 'x', fixed: PARK.N, rangeMin: PARK.W, rangeMax: PARK.E, gapMin: -6,  gapMax: 6,   rotY: 0            },
      { grp: new THREE.Group(), axis: 'z', fixed: PARK.W, rangeMin: PARK.S, rangeMax: PARK.N, gapMin: -54, gapMax: -46, rotY: Math.PI / 2 },
      { grp: new THREE.Group(), axis: 'z', fixed: PARK.E, rangeMin: PARK.S, rangeMax: PARK.N, gapMin: -54, gapMax: -46, rotY: Math.PI / 2 },
    ]

    const wallConfigs = [
      { name: '🧱 Fence (North)', pos: [3.70, 0, 6.60]  as [number,number,number], scale: [1.004, 0.65, 1.0  ] as [number,number,number] },
      { name: '🧱 Fence (West)',  pos: [7.40, 0, -2.70] as [number,number,number], scale: [1.0,   0.65, 1.020] as [number,number,number] },
      { name: '🧱 Fence (East)',  pos: [6.50, 0, -2.75] as [number,number,number], scale: [1.0,   0.65, 1.020] as [number,number,number] },
    ]

    wallDefs.forEach((w, i) => {
      buildPieces(w)
      w.grp.position.set(...wallConfigs[i].pos)
      w.grp.scale.set(...wallConfigs[i].scale)
      movables.push({
        name: wallConfigs[i].name,
        group: w.grp,
        scaleObj: w.grp,
        extra: {
          label: 'Fence Spacing',
          getValue: () => fenceSpacing,
          min: measuredSP * 0.6,
          max: measuredSP * 1.4,
          step: 0.005,
          onChange: v => {
            fenceSpacing = v
            wallDefs.forEach(buildPieces)
          },
        },
      })
      scene.add(w.grp)
    })

    // ── Fence collision hitboxes (visible, debug-tunable) ──────────────────
    // North fence: world z ≈ -1.4, gap at x ≈ [-2.3, 9.7]
    // West fence:  world x ≈ -29.6, gap at z ≈ [-57.8, -49.6]
    // East fence:  world x ≈ 45.5,  gap at z ≈ [-57.8, -49.7]
    const fHitMat = new THREE.MeshBasicMaterial({
      color: 0xff4422, transparent: true, opacity: 0,
      side: THREE.DoubleSide, depthWrite: false,
    })
    const fenceHitboxes: { name: string; cx: number; cy: number; cz: number; w: number; h: number; d: number }[] = [
      { name: '🟥 Fence Col: North W', cx: -23.10, cy: 0.75, cz:  -8.40, w: 27.20, h: 1.5, d: 0.30 },
      { name: '🟥 Fence Col: North E', cx:  23.30, cy: 0.75, cz:  -8.45, w: 30.70, h: 1.5, d: 0.30 },
      { name: '🟥 Fence Col: West S',  cx: -36.60, cy: 0.75, cz: -73.85, w:  0.40, h: 1.5, d: 33.20 },
      { name: '🟥 Fence Col: West N',  cx: -36.60, cy: 0.75, cz: -26.00, w:  0.35, h: 1.5, d: 34.80 },
      { name: '🟥 Fence Col: East S',  cx:  38.50, cy: 0.75, cz: -73.90, w:  0.40, h: 1.5, d: 33.35 },
      { name: '🟥 Fence Col: East N',  cx:  38.55, cy: 0.75, cz: -25.95, w:  0.30, h: 1.5, d: 35.35 },
    ]
    fenceHitboxes.forEach(({ name, cx, cy, cz, w, h, d }) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), fHitMat)
      mesh.position.set(cx, cy, cz)
      mesh.scale.set(w, h, d)
      scene.add(mesh)
      const grp = new THREE.Group()
      grp.position.set(cx, cy, cz)
      scene.add(grp)
      ;(grp as any).__hitMesh = mesh
      movables.push({ name, group: grp, isHitbox: true })
      // Seed boxCols to match initial hitbox position/size
      boxCols.push({
        x0: cx - w / 2, x1: cx + w / 2,
        z0: cz - d / 2, z1: cz + d / 2,
        maxY: cy + h / 2,
      })
    })

  }).catch(err => console.error('[park-trees-fences]', err))

  // ── Add Sidewalk (button in debug overlay) ───────────────────────────────
  const addSidewalk = () => {
    if (!sidewalkBase) { console.warn('[park] sidewalk template not loaded yet'); return }
    sidewalkCount++
    addSidewalkMesh(sidewalkBase.clone(true), `🛤️ Sidewalk #${sidewalkCount}`, 1, -32)
  }

  return { addSidewalk }
}
