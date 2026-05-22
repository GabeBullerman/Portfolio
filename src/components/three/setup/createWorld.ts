import * as THREE from 'three'
import { mulberry32 } from '../helpers'

export function createWorld(
  scene: THREE.Scene
): {
  swBaseTex: THREE.CanvasTexture
  TILE: number
  BLVD_X: number; MEML_X: number; VERT_W: number; VERT_D: number; VERT_CZ: number
  CONN_Z: number; CONN_D: number
  DRIV_CX: number; DRIV_W: number; DRIV_CZ: number; DRIV_D: number
  blvdOuter: number; blvdInner: number; memOuter: number; memInner: number
  connNorth: number; connSouth: number; vertSouth: number
  drivLeft: number; drivRight: number; drivNorth: number
} {
  // ── Ground ───────────────────────────────────────────────────────────
  const grassCv = document.createElement('canvas'); grassCv.width = 256; grassCv.height = 256
  const gc = grassCv.getContext('2d')!
  gc.fillStyle = '#3d7a2a'; gc.fillRect(0, 0, 256, 256)
  const gRng = mulberry32(999)
  for (let i = 0; i < 5000; i++) {
    const gx = gRng() * 256, gy = gRng() * 256
    const v = gRng()
    gc.fillStyle = v > 0.65 ? '#4a9034' : v > 0.35 ? '#357828' : '#2d6820'
    gc.fillRect(gx, gy, 1 + gRng() * 1.8, 1 + gRng() * 1.8)
  }
  const grassTex = new THREE.CanvasTexture(grassCv)
  grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping
  grassTex.repeat.set(24, 24)
  // Fence footprint: x[-78,78], z[-95,22] → center (0,-36.5), size 156×117
  // Ground matches fence footprint exactly — rim strips outside handle the border visuals
  const fN = 22, fS = -95, fW = -78, fE = 78
  const fCZ = (fN + fS) / 2  // -36.5
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(fE - fW, fN - fS),  // 156 × 117
    new THREE.MeshLambertMaterial({ map: grassTex }),
  )
  ground.rotation.x = -Math.PI / 2
  ground.position.set(0, 0, fCZ)
  scene.add(ground)

  // Rectangular border strips (dark tree-line) at y=0, just outside the fence
  const rimMat = new THREE.MeshLambertMaterial({ color: 0x3a6030 })
  const rimW = 14  // width of each border strip
  const rimGrpW = (fE - fW) + rimW * 2  // 156 + 28 = 184 — covers full width incl corners
  ;[
    // South strip
    { cx: 0,             cz: fS - rimW / 2, w: rimGrpW, d: rimW },
    // West strip (between N and S strips, no corner overlap)
    { cx: fW - rimW / 2, cz: fCZ,           w: rimW,    d: fN - fS },
    // East strip
    { cx: fE + rimW / 2, cz: fCZ,           w: rimW,    d: fN - fS },
  ].forEach(({ cx, cz, w, d }) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), rimMat)
    m.rotation.x = -Math.PI / 2
    m.position.set(cx, 0, cz)
    scene.add(m)
  })

  // ── World border fence ──────────────────────────────────────────────────────
  const fPostMat = new THREE.MeshLambertMaterial({ color: 0x7a5c2e })
  const fPostGeo = new THREE.CylinderGeometry(0.06, 0.09, 1.5, 6)
  const fRailGeoX = new THREE.BoxGeometry(3.3, 0.07, 0.07)
  const fRailGeoZ = new THREE.BoxGeometry(0.07, 0.07, 3.3)

  function addFenceSide(fixedAxis: 'x' | 'z', fixedVal: number, from: number, to: number, count: number) {
    const step = (to - from) / count
    for (let i = 0; i <= count; i++) {
      const v = from + step * i
      const px = fixedAxis === 'z' ? v : fixedVal
      const pz = fixedAxis === 'x' ? v : fixedVal
      const post = new THREE.Mesh(fPostGeo, fPostMat)
      post.position.set(px, 0.75, pz); post.castShadow = true; scene.add(post)
      if (i < count) {
        const mx = fixedAxis === 'z' ? v + step / 2 : fixedVal
        const mz = fixedAxis === 'x' ? v + step / 2 : fixedVal
        const rg = fixedAxis === 'z' ? fRailGeoX : fRailGeoZ
        ;[0.42, 0.92].forEach(h => {
          const rail = new THREE.Mesh(rg, fPostMat)
          rail.position.set(mx, h, mz); scene.add(rail)
        })
      }
    }
  }
  addFenceSide('z',  22, -78,  78, 47)   // North
  addFenceSide('z', -95, -78,  78, 47)   // South
  addFenceSide('x', -78, -95,  22, 36)   // West
  addFenceSide('x',  78, -95,  22, 36)   // East

  // ── Roads ────────────────────────────────────────────────────────────────
  const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.95, metalness: 0 })

  let roadIdx = 0
  const addRoad = (cx: number, cz: number, w: number, d: number, _label?: string) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), asphaltMat)
    mesh.rotation.x = -Math.PI / 2
    mesh.receiveShadow = true
    const grp = new THREE.Group()
    grp.position.set(cx, 0.02, cz)
    grp.add(mesh)
    scene.add(grp)
    roadIdx++
  }

  // Road geometry constants — all edge math derived from these
  const BLVD_X = -41, MEML_X = 43, VERT_W = 8, VERT_D = 86, VERT_CZ = -48
  const CONN_Z = -4, CONN_D = 8
  const DRIV_CX = 6, DRIV_W = 6, DRIV_CZ = 5, DRIV_D = 13
  const blvdOuter = BLVD_X - VERT_W / 2   // -45
  const blvdInner = BLVD_X + VERT_W / 2   // -37
  const memOuter  = MEML_X + VERT_W / 2   //  47
  const memInner  = MEML_X - VERT_W / 2   //  39
  const connLeft  = blvdOuter              // connector spans outer-to-outer
  const connRight = memOuter
  const connCX    = (connLeft + connRight) / 2
  const connW     = connRight - connLeft
  const connNorth = CONN_Z + CONN_D / 2   //  0
  const connSouth = CONN_Z - CONN_D / 2   // -8
  const vertSouth = VERT_CZ - VERT_D / 2  // -91
  // Vertical road lines span from connector south edge downward
  const vertLineLen = Math.abs(vertSouth - connSouth)        // 83
  const vertLineCZ  = (connSouth + vertSouth) / 2            // -49.5
  // Driveway edges
  const drivLeft  = DRIV_CX - DRIV_W / 2  //  3
  const drivRight = DRIV_CX + DRIV_W / 2  //  9
  const drivNorth = DRIV_CZ + DRIV_D / 2  // 11.5

  // Driveway — cabin front (~z=11) to road junction (z=-4)
  addRoad(DRIV_CX, DRIV_CZ, DRIV_W, DRIV_D, 'Driveway')
  // Bottom connector — width clamped to outer edges of both side roads
  addRoad(connCX, CONN_Z, connW, CONN_D, 'Bottom Connector')
  // Project Blvd — left vertical
  addRoad(BLVD_X, VERT_CZ, VERT_W, VERT_D, 'Project Blvd')
  // Memory Ln — right vertical
  addRoad(MEML_X, VERT_CZ, VERT_W, VERT_D, 'Memory Ln')

  // Road edge lines (white, thin planes slightly above road)
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
  const addRoadLine = (cx: number, cz: number, w: number, d: number) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), lineMat)
    mesh.rotation.x = -Math.PI / 2
    mesh.position.set(cx, 0.03, cz)
    scene.add(mesh)
  }
  // Complete perimeter outline of the entire road network
  // Outer vertical walls — full height from connector north edge to road south end
  const fullH  = connNorth - vertSouth                    // 91
  const fullCZ = (connNorth + vertSouth) / 2              // -45.5
  addRoadLine(blvdOuter + 0.2, fullCZ, 0.25, fullH)
  addRoadLine(memOuter  - 0.2, fullCZ, 0.25, fullH)
  // Inner vertical walls — from connector south edge down to road south end
  addRoadLine(blvdInner - 0.2, vertLineCZ, 0.25, vertLineLen)
  addRoadLine(memInner  + 0.2, vertLineCZ, 0.25, vertLineLen)
  // Connector north edge — split around driveway opening
  addRoadLine((connLeft + drivLeft) / 2,  connNorth - 0.1, drivLeft - connLeft,  0.25)  // west of driveway
  addRoadLine((drivRight + connRight) / 2, connNorth - 0.1, connRight - drivRight, 0.25)  // east of driveway
  // Driveway sides — from connector north edge up to driveway north end
  const drivSideLen = drivNorth - connNorth
  const drivSideCZ  = (connNorth + drivNorth) / 2
  addRoadLine(drivLeft  - 0.2, drivSideCZ, 0.25, drivSideLen)
  addRoadLine(drivRight + 0.2, drivSideCZ, 0.25, drivSideLen)
  // Driveway north cap
  addRoadLine(DRIV_CX, drivNorth - 0.1, DRIV_W, 0.25)
  // Connector south edge — middle only (grass here, road continues south in intersection zones)
  const midW  = memInner - blvdInner                      // 76
  const midCX = (blvdInner + memInner) / 2               // 1
  addRoadLine(midCX, connSouth + 0.1, midW, 0.25)
  // South end caps for each vertical road
  addRoadLine(BLVD_X, vertSouth + 0.1, VERT_W, 0.25)
  addRoadLine(MEML_X, vertSouth + 0.1, VERT_W, 0.25)

  // ── Sidewalks ─────────────────────────────────────────────────────────────
  const SW   = 1.5   // sidewalk strip width (world units)
  const TILE = 2.5   // paving-slab size (world units)

  // Tiled paving-slab canvas: light grey fill + darker joint lines along each edge
  const swCanvas = document.createElement('canvas')
  swCanvas.width = 64; swCanvas.height = 64
  const swCtx = swCanvas.getContext('2d')!
  swCtx.fillStyle = '#9e9d8e'
  swCtx.fillRect(0, 0, 64, 64)
  swCtx.strokeStyle = '#6b6a5b'
  swCtx.lineWidth = 2
  swCtx.beginPath(); swCtx.moveTo(0, 0); swCtx.lineTo(64, 0); swCtx.stroke()
  swCtx.beginPath(); swCtx.moveTo(0, 0); swCtx.lineTo(0, 64); swCtx.stroke()
  const swBaseTex = new THREE.CanvasTexture(swCanvas)
  swBaseTex.wrapS = THREE.RepeatWrapping
  swBaseTex.wrapT = THREE.RepeatWrapping

  const addSidewalk = (cx: number, cz: number, w: number, d: number, _label?: string) => {
    const tex = swBaseTex.clone()
    tex.needsUpdate = true
    tex.repeat.set(Math.max(1, w / TILE), Math.max(1, d / TILE))
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, metalness: 0 })
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat)
    mesh.rotation.x = -Math.PI / 2
    mesh.receiveShadow = true
    const grp = new THREE.Group()
    grp.position.set(cx, 0.03, cz)
    grp.add(mesh)
    scene.add(grp)
  }

  // ── Connector north edge, west of driveway ──  blvdOuter → drivLeft
  const cnW = drivLeft - blvdOuter                                     // 3 − (−45) = 48
  addSidewalk((blvdOuter + drivLeft) / 2, connNorth + SW / 2, cnW, SW, 'SW: Connector North W')

  // ── Driveway west side ──  z: connNorth → drivNorth
  const dvD = drivNorth - connNorth                                    // 11.5
  addSidewalk(drivLeft - SW / 2, (connNorth + drivNorth) / 2, SW, dvD, 'SW: Driveway West')

  // ── Driveway north cap ──
  addSidewalk(DRIV_CX, drivNorth + SW / 2, DRIV_W, SW, 'SW: Driveway North')

  // ── Driveway east side ──  z: connNorth → drivNorth
  addSidewalk(drivRight + SW / 2, (connNorth + drivNorth) / 2, SW, dvD, 'SW: Driveway East')

  // ── Connector north edge, east of driveway ──  drivRight → memOuter
  const cnE = memOuter - drivRight                                     // 47 − 9 = 38
  addSidewalk((drivRight + memOuter) / 2, connNorth + SW / 2, cnE, SW, 'SW: Connector North E')

  // ── Memory Lane east outer, full vertical ──
  const swVD = connNorth - vertSouth                                   // 91
  const swVC = (connNorth + vertSouth) / 2                            // −45.5
  addSidewalk(memOuter + SW / 2, swVC, SW, swVD, 'SW: MemLn East')

  // ── Memory Lane south cap ──  memInner → memOuter+SW (wraps outer corner)
  addSidewalk(memOuter, vertSouth - SW / 2, VERT_W + SW, SW, 'SW: MemLn South')

  // ── Project Blvd south cap ──  blvdOuter-SW → blvdInner (wraps outer corner)
  addSidewalk(blvdOuter - SW / 2, vertSouth - SW / 2, VERT_W + SW, SW, 'SW: Blvd South')

  // ── Project Blvd west outer, full vertical ──
  addSidewalk(blvdOuter - SW / 2, swVC, SW, swVD, 'SW: Blvd West')

  // ── Corner fills — road outer corners ──
  addSidewalk(blvdOuter - SW / 2, connNorth + SW / 2, SW, SW, 'SW: Corner NW')
  addSidewalk(memOuter  + SW / 2, connNorth + SW / 2, SW, SW, 'SW: Corner NE')
  addSidewalk(blvdOuter - SW / 2, vertSouth - SW / 2, SW, SW, 'SW: Corner SW')
  addSidewalk(memOuter  + SW / 2, vertSouth - SW / 2, SW, SW, 'SW: Corner SE')

  // ── Corner fills — driveway junctions with connector ──
  addSidewalk(drivLeft  - SW / 2, connNorth + SW / 2, SW, SW, 'SW: Corner Driv SW')
  addSidewalk(drivRight + SW / 2, connNorth + SW / 2, SW, SW, 'SW: Corner Driv SE')
  // ── Corner fills — driveway north corners ──
  addSidewalk(drivLeft  - SW / 2, drivNorth + SW / 2, SW, SW, 'SW: Corner Driv NW')
  addSidewalk(drivRight + SW / 2, drivNorth + SW / 2, SW, SW, 'SW: Corner Driv NE')

  return {
    swBaseTex, TILE,
    BLVD_X, MEML_X, VERT_W, VERT_D, VERT_CZ,
    CONN_Z, CONN_D,
    DRIV_CX, DRIV_W, DRIV_CZ, DRIV_D,
    blvdOuter, blvdInner, memOuter, memInner,
    connNorth, connSouth, vertSouth,
    drivLeft, drivRight, drivNorth,
  }
}
