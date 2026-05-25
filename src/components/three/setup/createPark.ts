import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { BoxCol, CylCol, Movable } from '../types'
import { mulberry32 } from '../helpers'

const TREE_HIT_R = 0.42

// Park boundaries — match world.ts road geometry exactly
const PARK = { W: -37, E: 39, N: -8, S: -91 }

export interface ParkResult {
  addSidewalk: () => void
}

export function createPark(scene: THREE.Scene, movables: Movable[], cylCols: CylCol[], boxCols: BoxCol[]): ParkResult {
  const gltfLoader = new GLTFLoader()

  const loadGLB = (path: string): Promise<THREE.Group> =>
    new Promise((resolve, reject) => gltfLoader.load(path, g => resolve(g.scene), undefined, reject))

  const prepare = (obj: THREE.Object3D) => {
    obj.traverse(c => {
      if ((c as THREE.Mesh).isMesh) { c.castShadow = true; c.receiveShadow = true }
    })
  }

  const addDebug = (grp: THREE.Group, _name: string) => {
    prepare(grp)
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

  const addSidewalkMesh = (mesh: THREE.Group, _name: string, x: number, z: number) => {
    prepare(mesh)
    const { wrapper, center } = centerXZ(mesh)
    wrapper.position.set(x, center.y > 0.01 ? 0 : 0, z)
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

  // ── Skatepark + Playground collision ─────────────────────────────────────
  // Skatepark Col A: center(29.00, 0.63, -58.50) size(7.10 × 1.60 × 7.10) rot 0°
  boxCols.push({ x0: 25.45, x1: 32.55, z0: -62.05, z1: -54.95, maxY: 1.43 })
  // Skatepark Col B: center(12.00, 1.28, -57.20) size(7.50 × 2.55 × 4.90) rot 0°
  boxCols.push({ x0:  8.25, x1: 15.75, z0: -59.65, z1: -54.75, maxY: 2.56 })

  // ── Fence-lining short-wide bushes (baked from debug tuning) ─────────────
  loadGLB('/assets/outdoor/park stuff/bushes/short wide/Untitled.glb').then(bushRef => {
    const SP = 1.5
    const segments: { cx: number; cz: number; sx: number; sz: number; len: number; axis: 'x'|'z'; bushRy: number }[] = [
      { cx: -23.55, cz:  -2.00, sx: 0.984, sz: 1.000, len: 26.5, axis: 'x', bushRy:           0 },
      { cx:  22.10, cz:  -2.00, sx: 0.951, sz: 1.000, len: 30.0, axis: 'x', bushRy:           0 },
      { cx: -29.05, cz: -24.95, sx: 1.000, sz: 0.970, len: 33.9, axis: 'z', bushRy:  Math.PI / 2 },
      { cx: -29.00, cz: -72.55, sx: 1.000, sz: 0.990, len: 32.0, axis: 'z', bushRy:  Math.PI / 2 },
      { cx:  30.90, cz: -26.50, sx: 1.000, sz: 1.000, len: 33.9, axis: 'z', bushRy: -Math.PI / 2 },
      { cx:  30.90, cz: -74.60, sx: 1.000, sz: 0.990, len: 32.0, axis: 'z', bushRy: -Math.PI / 2 },
    ]
    segments.forEach(({ cx, cz, sx, sz, len, axis, bushRy }) => {
      const grp = new THREE.Group()
      grp.position.set(cx, 0, cz)
      grp.scale.set(sx, 1, sz)
      const half = len / 2
      for (let t = -half; t <= half; t += SP) {
        const b = bushRef.clone(true)
        b.position.set(axis === 'x' ? t : 0, 0, axis === 'z' ? t : 0)
        b.rotation.y = bushRy
        grp.add(b)
      }
      scene.add(grp)
    })
  }).catch(err => console.error('[bush-lines]', err))

  // ── Individual park pieces ─────────────────────────────────────────────
  const singles = [
    { name: '🚩 Street Sign', path: '/assets/outdoor/park stuff/street sign/Untitled.glb', pos: [-2.23, 0, -8.67] as [number,number,number], scale: 2, rot: null },
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
        mesh.traverse(c => {
          if ((c as THREE.Mesh).isMesh) {
            const mat = (c as THREE.Mesh).material as THREE.MeshStandardMaterial
            if (mat) {
              mat.side = THREE.DoubleSide
              if (mat.transparent && mat.opacity > 0.9) { mat.alphaTest = 0.4; mat.transparent = false }
            }
          }
        })
        addDebug(mesh, name)
      }
      // Consume rng slots for non-pinned items to keep other items' positions stable
      if (pos) { rng(); rng() }
    })
  }).catch(err => console.error('[park-singles]', err))

  // ── New Blender park props (fountain, picnic table, trashcan) ────────────
  const newProps: { name: string; path: string; pos: [number,number,number]; rot: [number,number,number]; scale: number }[] = [
    { name: '⛲ Fountain',     path: '/assets/outdoor/park stuff/fountain/Park.glb',      pos: [ 1.00, -0.50, -48.00], rot: [0,           0,          0         ], scale: 1 },
    { name: '🪑 Picnic Table', path: '/assets/outdoor/park stuff/picnic table/Park.glb', pos: [-9.00,  0.00, -35.00], rot: [0,           Math.PI/6,  0         ], scale: 0.9 },
    { name: '🗑️ Trashcan',   path: '/assets/outdoor/park stuff/trashcan/Park.glb',      pos: [-1.00, -0.25, -35.00], rot: [-Math.PI,   0,         -Math.PI   ], scale: 1 },
  ]
  newProps.forEach(({ name, path, pos, rot, scale }) => {
    loadGLB(path).then(grp => {
      grp.traverse(c => {
        if ((c as THREE.Mesh).isMesh) { c.castShadow = true; c.receiveShadow = true }
      })
      grp.position.set(...pos)
      grp.rotation.set(...rot)
      grp.scale.setScalar(scale)
      scene.add(grp)
    }).catch(err => console.error(`[${name}]`, err))
  })

  // ── Sphere bushes — scattered randomly, no hitboxes ─────────────────────
  loadGLB('/assets/outdoor/park stuff/bushes/short sphere/Untitled.glb').then(sphereBase => {
    const bushExcl: [number, number, number, number][] = [
      // Campfire seating
      [-20,  0,  -28, -11],
      // Pond
      [-33, -15,  -44, -27],
      // Ball Pit
      [ 22, 34,  -25, -13],
      // Ring Toss
      [  8, 16,  -33, -13],
      // Bowling Alley
      [ 13, 25,  -39, -13],
      // Trampoline
      [ 12, 28,  -80, -64],
      // Skatepark
      [  6, 32,  -71, -44],
      // Sidewalk N-S spine
      [ -3,  5,  -50,  -6],
      // Sidewalk E-W arms + 4-way
      [-37,  2,  -52, -43],
      [  0, 39,  -52, -43],
      // Sidewalk lower spine
      [ -3,  5,  -77, -46],
      // Three.js Exhibit (SW quadrant)
      [-32,  -9,  -82, -58],
      // West fence bush line corridor (x≈-29, full z range)
      [-36, -25,  -87, -13],
      // East fence bush line corridor (x≈31, full z range)
      [ 26,  37,  -87, -13],
    ]
    const inBushExcl = (x: number, z: number) =>
      bushExcl.some(([x0, x1, z0, z1]) => x >= x0 && x <= x1 && z >= z0 && z <= z1)
    const bushRng = mulberry32(8321)
    for (let i = 0; i < 20; i++) {
      const bx = -33 + bushRng() * 68
      const bz = -13 - bushRng() * 74
      const sc = 0.7 + bushRng() * 0.8
      const ry = bushRng() * Math.PI * 2
      if (inBushExcl(bx, bz)) continue
      const b = sphereBase.clone(true)
      b.position.set(bx, 0, bz)
      b.scale.setScalar(sc); b.rotation.y = ry
      scene.add(b)
    }
  }).catch(err => console.error('[park-bushes]', err))

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
    straights.forEach(({ pos, rot, scale }) => {
      const mesh = straightBase.clone(true)
      prepare(mesh)
      const { wrapper } = centerXZ(mesh)
      wrapper.position.set(...pos)
      wrapper.rotation.y = rot
      wrapper.scale.set(...scale)
      scene.add(wrapper)
    })

    const fwMesh = fourwayBase
    prepare(fwMesh)
    const { wrapper: fw } = centerXZ(fwMesh)
    fw.position.set(1, 0, -47.80)
    fw.scale.set(1.772, 1.000, 2.144)
    scene.add(fw)

  }).catch(err => console.error('[park-sidewalks]', err))

  // ── Trees + Fences — loaded together so fences can measure themselves ──
  Promise.all([
    loadGLB('/assets/outdoor/park stuff/tree/Untitled.glb'),
    loadGLB('/assets/outdoor/park stuff/border fence/plain/Untitled.glb'),
    loadGLB('/assets/outdoor/park stuff/border fence/end/Untitled.glb'),
  ]).then(([treeBase, plainBase, endBase]) => {

    // ── Trees ─────────────────────────────────────────────────────────────
    // Bounds derived from fence hitbox inner edges + buffer so trees stay inside:
    //   West fence inner x ≈ -36.4  →  TREE_W = -33
    //   East fence inner x ≈  38.3  →  TREE_E =  35
    //   North fence inner z ≈  -8.6 →  TREE_N = -13  (well south of entrance fence)
    //   South park boundary z = -91 →  TREE_S = -87
    const TREE_W = -33
    const TREE_E =  35
    const TREE_N = -13
    const TREE_S = -87

    // Exclusion zones [xMin, xMax, zMin, zMax] — park features, games, sidewalks.
    // Each entry uses world positions + a comfortable buffer so no tree overlaps anything.
    const excl: [number, number, number, number][] = [
      // Campfire seating (-10, -19.5)
      [-18,  -2,  -28, -11],
      // Pond (-24, -36) r=3.2 — extra buffer so large tree canopies don't reach water
      [-33, -15,  -44, -27],
      // Ball Pit (28, -19) r≈2.5
      [ 22,  34,  -25, -13],
      // Ring Toss (12, -23) platform 3×14
      [  8,  16,  -33, -13],
      // Bowling Alley (19, -26) lane ≈2.6w × 20l
      [ 13,  25,  -39, -13],
      // Trampoline (20, -72) r=4.8
      [ 12,  28,  -80, -64],
      // Skatepark (19, -57.5) rot 90° — generous footprint
      [  6,  32,  -71, -44],
      // Sidewalk 1 (1, -27.4) N-S spine
      [ -3,   5,  -50,  -6],
      // Sidewalk 2 (-18.4, -47.85) E-W cross arm
      [-37,   2,  -52, -43],
      // Sidewalk 3 (20.4, -47.8) E-W cross arm
      [  0,  39,  -52, -43],
      // Sidewalk 4 (1, -61.5) N-S lower spine
      [ -3,   5,  -77, -46],
      // Three.js Exhibit (SW quadrant)
      [-32,  -9,  -82, -58],
      // West fence interior — keep trees away from fence line
      [-33, -26,  -87, -13],
      // East fence interior — keep trees away from fence line
      [ 26,  35,  -87, -13],
    ]
    // Pond gets a circular check — rectangular zones miss trees whose canopies hang over water
    const POND_CX = -24, POND_CZ = -36, POND_EXCL_R2 = 10 * 10
    const inExcl = (x: number, z: number) => {
      const dx = x - POND_CX, dz = z - POND_CZ
      if (dx * dx + dz * dz < POND_EXCL_R2) return true
      return excl.some(([x0, x1, z0, z1]) => x >= x0 && x <= x1 && z >= z0 && z <= z1)
    }

    const treeRng = mulberry32(7777)
    ;[
      { name: '🌳 Trees (NW)', xr: [TREE_W, -8] as [number,number], zr: [TREE_N, -44]    as [number,number] },
      { name: '🌳 Trees (NE)', xr: [8,  TREE_E] as [number,number], zr: [TREE_N, -44]    as [number,number] },
      { name: '🌳 Trees (SW)', xr: [TREE_W, -8] as [number,number], zr: [-58,   TREE_S]  as [number,number] },
      { name: '🌳 Trees (SE)', xr: [8,  TREE_E] as [number,number], zr: [-58,   TREE_S]  as [number,number] },
    ].forEach(({ xr, zr }) => {
      const grp = new THREE.Group()
      for (let i = 0; i < 12; i++) {
        // Always consume all 4 RNG values so later trees are unaffected by exclusions
        const tx = xr[0] + treeRng() * (xr[1] - xr[0])
        const tz = zr[0] + treeRng() * (zr[1] - zr[0])
        const sc = 0.8 + treeRng() * 0.5
        const ry = treeRng() * Math.PI * 2
        if (inExcl(tx, tz)) continue
        const t = treeBase.clone(true)
        t.position.set(tx, 0, tz)
        t.scale.setScalar(sc)
        t.rotation.y = ry
        t.traverse(c => { if ((c as THREE.Mesh).isMesh) { c.castShadow = true; c.receiveShadow = true } })

        // Use bounding box center XZ to find the actual trunk world position
        t.updateWorldMatrix(false, true)
        const bbox = new THREE.Box3().setFromObject(t)
        const center = new THREE.Vector3()
        bbox.getCenter(center)
        const hx = center.x, hz = center.z, hr = TREE_HIT_R * sc

        grp.add(t)
        cylCols.push({ x: hx, z: hz, r: hr })
      }
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
      scene.add(w.grp)
    })

    // ── Fence collision hitboxes (visible, debug-tunable) ──────────────────
    // North fence: world z ≈ -1.4, gap at x ≈ [-2.3, 9.7]
    // West fence:  world x ≈ -29.6, gap at z ≈ [-57.8, -49.6]
    // East fence:  world x ≈ 45.5,  gap at z ≈ [-57.8, -49.7]
    const fHitMat = new THREE.MeshBasicMaterial({
      color: 0xff4422, transparent: true, opacity: 0.18,
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

  // ── Fountain hitbox — tune position in debug editor (`) then hardcode ───────
  const fountainHitMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(1.8, 1.8, 0.9, 32),
    new THREE.MeshBasicMaterial({ color: 0xff3333, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
  )
  const fountainHitGrp = new THREE.Group()
  fountainHitGrp.position.set(1.00, 0.30, -47.80)
  fountainHitGrp.scale.set(2.2, 7, 2.2)
  fountainHitGrp.add(fountainHitMesh)
  scene.add(fountainHitGrp)
  cylCols.push({ x: 1.00, z: -47.80, r: 1.8 * 2.2 })
  movables.push({ name: '⛲ Fountain hitbox', group: fountainHitGrp, isHitbox: true, scaleObj: fountainHitGrp })

  return { addSidewalk }
}
