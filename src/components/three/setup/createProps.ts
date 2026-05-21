import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { mulberry32 } from '../helpers'
import { CylCol, BoxCol, DuckData } from '../types'
import {
  BENCH_POSITIONS,
  PIT_CX, PIT_CZ,
  TRAMP_CX, TRAMP_CZ, TRAMP_R, TRAMP_Y,
  LADDER_X, LADDER_Z,
} from '../constants'

export interface PropsResult {
  FIRE_POS:      THREE.Vector3
  flameMat:      THREE.MeshBasicMaterial
  flameMesh:     THREE.Mesh
  innerFlameMesh: THREE.Mesh
  fireLight:     THREE.PointLight
  ffMesh:        THREE.InstancedMesh
  ffData:        { bx: number; by: number; bz: number; ph: number; sp: number; am: number }[]
  ducks:         DuckData[]
  pondGrp:       THREE.Group
  balls:         { mesh: THREE.Mesh; body: CANNON.Body }[]
  ringLine:      THREE.Line
  ringGeo:       THREE.BufferGeometry
}

export function createProps(
  scene: THREE.Scene,
  physWorld: CANNON.World,
  cylCols: CylCol[],
  boxCols: BoxCol[],
  POND_X: number,
  POND_Z: number,
  POND_R: number,
): PropsResult {
  const FIRE_POS = new THREE.Vector3(0, 0, -14)

  // ── Proximity progress ring ───────────────────────────────────────────
  const RING_SEGS = 80
  const RING_R    = 4.5
  const ringPts   = new Float32Array((RING_SEGS + 1) * 3)
  for (let i = 0; i <= RING_SEGS; i++) {
    const a = (i / RING_SEGS) * Math.PI * 2 - Math.PI / 2  // start at top, go CCW
    ringPts[i * 3]     = Math.cos(a) * RING_R
    ringPts[i * 3 + 1] = 0.04
    ringPts[i * 3 + 2] = Math.sin(a) * RING_R
  }
  const ringGeo = new THREE.BufferGeometry()
  ringGeo.setAttribute('position', new THREE.BufferAttribute(ringPts, 3))
  ringGeo.setDrawRange(0, 0)
  const ringLine = new THREE.Line(ringGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 }))
  ringLine.visible = false
  scene.add(ringLine)

  // ── Campfire ─────────────────────────────────────────────────────────
  const logMat = new THREE.MeshLambertMaterial({ color: 0x5a3010 })
  const logGeo = new THREE.CylinderGeometry(0.08, 0.11, 1.6, 6)
  ;[0, Math.PI / 3, -Math.PI / 3].forEach(ry => {
    const log = new THREE.Mesh(logGeo, logMat)
    log.position.copy(FIRE_POS); log.position.y = 0.09
    log.rotation.z = Math.PI / 2; log.rotation.y = ry; scene.add(log)
  })
  for (let i = 0; i < 9; i++) {
    const stone = new THREE.Mesh(new THREE.SphereGeometry(0.13, 5, 4), new THREE.MeshLambertMaterial({ color: 0x888888 }))
    stone.position.set(FIRE_POS.x + Math.sin(i * Math.PI * 2 / 9) * 0.68, 0.09, FIRE_POS.z + Math.cos(i * Math.PI * 2 / 9) * 0.68)
    scene.add(stone)
  }

  // ── Benches ──────────────────────────────────────────────────────────────
  const benchLogMat = new THREE.MeshLambertMaterial({ color: 0x5a3010 })
  const benchPlankMat = new THREE.MeshLambertMaterial({ color: 0x8b5e2a })
  BENCH_POSITIONS.forEach(({ x, z, ry }) => {
    cylCols.push({ x, z, r: 0.9 })
    const g = new THREE.Group()
    // Seat plank
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 0.42), benchPlankMat)
    seat.position.y = 0.48; g.add(seat)
    // Legs
    ;[-0.55, 0.55].forEach(ox => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.48, 6), benchLogMat)
      leg.position.set(ox, 0.24, 0); g.add(leg)
    })
    g.position.set(x, 0, z); g.rotation.y = ry
    g.castShadow = true; scene.add(g)
  })

  const flameMat  = new THREE.MeshBasicMaterial({ color: 0xff6600 })
  const flameMesh = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.85, 8), flameMat)
  flameMesh.position.set(FIRE_POS.x, 0.52, FIRE_POS.z); scene.add(flameMesh)
  const innerFlameMat  = new THREE.MeshBasicMaterial({ color: 0xffee00 })
  const innerFlameMesh = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.54, 8), innerFlameMat)
  innerFlameMesh.position.set(FIRE_POS.x, 0.52, FIRE_POS.z); scene.add(innerFlameMesh)
  const fireLight = new THREE.PointLight(0xff7700, 1.6, 9)
  fireLight.position.set(FIRE_POS.x, 1.0, FIRE_POS.z); scene.add(fireLight)

  // ── Fireflies ─────────────────────────────────────────────────────────
  const FF_COUNT = 40
  const ffGeo = new THREE.SphereGeometry(0.055, 4, 3)
  const ffMat = new THREE.MeshBasicMaterial({ color: 0xffff55 })
  const ffMesh = new THREE.InstancedMesh(ffGeo, ffMat, FF_COUNT)
  ffMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(ffMesh)
  const ffRng = mulberry32(1337)
  const ffData = Array.from({ length: FF_COUNT }, () => ({
    bx: (ffRng() - 0.5) * 120, by: 0.7 + ffRng() * 4, bz: ffRng() * 95 - 80,
    ph: ffRng() * Math.PI * 2, sp: 0.35 + ffRng() * 0.75, am: 1.0 + ffRng() * 2.8,
  }))

  // ── Pond ─────────────────────────────────────────────────────────────────
  const pondGrp = new THREE.Group(); pondGrp.position.set(POND_X, 0, POND_Z); scene.add(pondGrp)

  const pondMesh = new THREE.Mesh(
    new THREE.CircleGeometry(POND_R, 28),
    new THREE.MeshLambertMaterial({ color: 0x2255aa, transparent: true, opacity: 0.88 })
  )
  pondMesh.rotation.x = -Math.PI / 2; pondMesh.position.set(0, 0.02, 0); pondGrp.add(pondMesh)
  const pondRim = new THREE.Mesh(
    new THREE.RingGeometry(POND_R, POND_R + 0.55, 28),
    new THREE.MeshLambertMaterial({ color: 0x4a6b30, side: THREE.DoubleSide })
  )
  pondRim.rotation.x = -Math.PI / 2; pondRim.position.set(0, 0.01, 0); pondGrp.add(pondRim)
  const reedMat  = new THREE.MeshLambertMaterial({ color: 0x5a7a2a })
  const reedTopMat = new THREE.MeshLambertMaterial({ color: 0x5a3a10 })
  const reedRng  = mulberry32(555)
  for (let r = 0; r < 16; r++) {
    const ra = reedRng() * Math.PI * 2, rr = POND_R * 0.78 + reedRng() * POND_R * 0.38
    const rx = Math.cos(ra) * rr, rz2 = Math.sin(ra) * rr  // relative to pond center
    const rh = 0.75 + reedRng() * 0.65
    const reed = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, rh, 4), reedMat)
    reed.position.set(rx, rh / 2, rz2); pondGrp.add(reed)
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.06, 0.18, 6), reedTopMat)
    tip.position.set(rx, rh + 0.09, rz2); pondGrp.add(tip)
  }
  const lilyMat = new THREE.MeshLambertMaterial({ color: 0x2d6622 })
  for (let l = 0; l < 6; l++) {
    const la = (l / 6) * Math.PI * 2 + 0.5, lr = POND_R * 0.45
    const lily = new THREE.Mesh(new THREE.CircleGeometry(0.26, 8), lilyMat)
    lily.rotation.x = -Math.PI / 2; lily.position.set(Math.cos(la) * lr, 0.03, Math.sin(la) * lr)
    pondGrp.add(lily)
  }

  // ── Ducks ─────────────────────────────────────────────────────────────────
  const duckBodyMat = new THREE.MeshLambertMaterial({ color: 0xfafafa })
  const duckHeadMat = new THREE.MeshLambertMaterial({ color: 0x226622 })
  const duckBillMat = new THREE.MeshLambertMaterial({ color: 0xffaa00 })
  const DUCK_Y = 0.13
  const ducks: DuckData[] = []
  const duckRng = mulberry32(999)
  for (let d = 0; d < 5; d++) {
    const g = new THREE.Group()
    // Body
    g.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.26, 0.58), duckBodyMat), { castShadow: true }))
    // Tail tuft
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.13), duckBodyMat)
    tail.position.set(0, 0.09, -0.33); tail.rotation.x = -0.38; g.add(tail)
    // Head group (for nod animation)
    const headG = new THREE.Group(); headG.position.set(0, 0.21, 0.22); g.add(headG)
    headG.add(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.20, 0.20), duckHeadMat))
    const bill = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.06, 0.16), duckBillMat)
    bill.position.set(0, -0.04, 0.16); headG.add(bill)
    const sa = (d / 5) * Math.PI * 2, sr = 1.0 + duckRng() * 1.8
    const sx = pondGrp.position.x + Math.cos(sa) * sr, sz = pondGrp.position.z + Math.sin(sa) * sr
    g.position.set(sx, DUCK_Y, sz)
    scene.add(g)
    ducks.push({ group: g, headG, x: sx, z: sz, angle: duckRng() * Math.PI * 2, timer: duckRng() * 2.5, phase: d * 1.26 })
  }

  // ── Ball pit ──────────────────────────────────────────────────────────
  const PIT_R  = 2.2, PIT_WALL_H = 0.55
  const BALL_R = 0.14

  const balls: { mesh: THREE.Mesh; body: CANNON.Body }[] = []

  // Pit walls (4 sides, low box barriers)
  const pitWallMat = new THREE.MeshLambertMaterial({ color: 0x3a5faa })
  ;[
    { w: PIT_R * 2 + 0.18, d: 0.18, px: PIT_CX,         pz: PIT_CZ - PIT_R },
    { w: PIT_R * 2 + 0.18, d: 0.18, px: PIT_CX,         pz: PIT_CZ + PIT_R },
    { w: 0.18, d: PIT_R * 2,        px: PIT_CX - PIT_R, pz: PIT_CZ         },
    { w: 0.18, d: PIT_R * 2,        px: PIT_CX + PIT_R, pz: PIT_CZ         },
  ].forEach(({ w, d, px, pz }) => {
    // Box collider for player
    boxCols.push({ x0: px - w / 2, x1: px + w / 2, z0: pz - d / 2, z1: pz + d / 2, maxY: PIT_WALL_H })
    const wm = new THREE.Mesh(new THREE.BoxGeometry(w, PIT_WALL_H, d), pitWallMat)
    wm.position.set(px, PIT_WALL_H / 2, pz); wm.castShadow = true; scene.add(wm)
    const wb = new CANNON.Body({ mass: 0 })
    wb.addShape(new CANNON.Box(new CANNON.Vec3(w / 2, PIT_WALL_H / 2, d / 2)))
    wb.position.set(px, PIT_WALL_H / 2, pz); physWorld.addBody(wb)
  })
  // Pit floor
  const pitFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(PIT_R * 2, PIT_R * 2),
    new THREE.MeshLambertMaterial({ color: 0x4a80ee })
  )
  pitFloor.rotation.x = -Math.PI / 2
  pitFloor.position.set(PIT_CX, 0.005, PIT_CZ)
  scene.add(pitFloor)

  // Fill pit with 80 physics-backed balls using InstancedMesh for visuals
  const pitBallColors = [0xff4444, 0x44cc44, 0x4488ff, 0xffcc22, 0xff44dd, 0x44ffee, 0xff8800, 0xaa44ff, 0xff9999, 0x99ff99]
  const pitBallGeo = new THREE.SphereGeometry(BALL_R, 8, 6)
  const pitRng = mulberry32(321)
  const BALL_COUNT = 80
  for (let i = 0; i < BALL_COUNT; i++) {
    const angle = pitRng() * Math.PI * 2
    const rad   = pitRng() * (PIT_R - BALL_R - 0.2)
    const px    = PIT_CX + Math.cos(angle) * rad
    const pz    = PIT_CZ + Math.sin(angle) * rad
    const color = pitBallColors[i % pitBallColors.length]
    const mesh  = new THREE.Mesh(pitBallGeo, new THREE.MeshLambertMaterial({ color }))
    mesh.castShadow = true; scene.add(mesh)
    const body = new CANNON.Body({ mass: 0.12, linearDamping: 0.6, angularDamping: 0.6 })
    body.addShape(new CANNON.Sphere(BALL_R))
    body.position.set(px, BALL_R + 0.4 + pitRng() * 1.2, pz)
    physWorld.addBody(body)
    balls.push({ mesh, body })
  }

  // ── Trampoline ──────────────────────────────────────────────────────────────
  const TRAMP_SEGMENTS = 32
  const trampFabricMat = new THREE.MeshPhongMaterial({ color: 0x333333, shininess: 20 })
  const frameMat2 = new THREE.MeshLambertMaterial({ color: 0x888888 })
  const netMat = new THREE.MeshBasicMaterial({ color: 0x2255cc, transparent: true, opacity: 0.55, side: THREE.DoubleSide, wireframe: false })

  // Main fabric disc (dark grey)
  const trampFabric = new THREE.Mesh(
    new THREE.CylinderGeometry(TRAMP_R - 0.15, TRAMP_R - 0.15, 0.08, TRAMP_SEGMENTS),
    trampFabricMat
  )
  trampFabric.position.set(TRAMP_CX, TRAMP_Y, TRAMP_CZ)
  trampFabric.castShadow = true; scene.add(trampFabric)

  // Frame ring (grey torus-like cylinder)
  const trampFrame = new THREE.Mesh(
    new THREE.TorusGeometry(TRAMP_R, 0.09, 8, TRAMP_SEGMENTS),
    frameMat2
  )
  trampFrame.rotation.x = Math.PI / 2
  trampFrame.position.set(TRAMP_CX, TRAMP_Y, TRAMP_CZ)
  scene.add(trampFrame)

  // Blue net — gap on south side (+Z) where the ladder is.
  // Gap width = ladder rung width (0.54) × 1.5 ÷ radius ≈ 0.17 rad; use 0.20 for comfort.
  const NET_GAP = 0.20
  const netGeo = new THREE.CylinderGeometry(TRAMP_R + 0.05, TRAMP_R + 0.05, 1.2, TRAMP_SEGMENTS, 1, true, NET_GAP / 2, Math.PI * 2 - NET_GAP)
  const netMesh = new THREE.Mesh(netGeo, netMat)
  netMesh.position.set(TRAMP_CX, TRAMP_Y + 0.6, TRAMP_CZ)
  scene.add(netMesh)

  // Net support poles — 12 evenly spaced, skip gap at south (+Z, math-angle π/2)
  const LADDER_GAP_HALF = NET_GAP / 2 + 0.06
  const poleGeo = new THREE.CylinderGeometry(0.04, 0.04, TRAMP_Y + 1.2, 6)
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    const na = a > Math.PI ? a - Math.PI * 2 : a
    if (Math.abs(na - Math.PI / 2) < LADDER_GAP_HALF) continue
    const px = TRAMP_CX + Math.cos(a) * (TRAMP_R + 0.05)
    const pz = TRAMP_CZ + Math.sin(a) * (TRAMP_R + 0.05)
    const pole = new THREE.Mesh(poleGeo, frameMat2)
    pole.position.set(px, (TRAMP_Y + 1.2) / 2, pz)
    scene.add(pole)
  }

  // Dense rim colliders — prevent walking under trampoline; gap left at ladder (south, a≈π/2)
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2
    const na = a > Math.PI ? a - Math.PI * 2 : a
    if (Math.abs(na - Math.PI / 2) < LADDER_GAP_HALF + 0.1) continue
    const px = TRAMP_CX + Math.cos(a) * TRAMP_R
    const pz = TRAMP_CZ + Math.sin(a) * TRAMP_R
    cylCols.push({ x: px, z: pz, r: 0.42, maxY: TRAMP_Y - 0.1 })
  }

  // Leg supports — 4 legs from ground up to frame
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4
    const lx = TRAMP_CX + Math.cos(a) * TRAMP_R * 0.8
    const lz = TRAMP_CZ + Math.sin(a) * TRAMP_R * 0.8
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, TRAMP_Y, 6), frameMat2)
    leg.position.set(lx, TRAMP_Y / 2, lz)
    scene.add(leg)
  }

  // Trampoline physics platform
  const trampBody = new CANNON.Body({ mass: 0 })
  trampBody.addShape(new CANNON.Cylinder(TRAMP_R, TRAMP_R, 0.1, 16))
  trampBody.position.set(TRAMP_CX, TRAMP_Y, TRAMP_CZ)
  physWorld.addBody(trampBody)

  // ── Ladder (south side of trampoline, flush against rim) ──────────────
  const ladderMat = new THREE.MeshLambertMaterial({ color: 0x8b5e2a })
  const railGeo   = new THREE.BoxGeometry(0.07, TRAMP_Y, 0.07)
  const rungGeo   = new THREE.BoxGeometry(0.54, 0.05, 0.07)

  ;[-0.27, 0.27].forEach(ox => {
    const rail = new THREE.Mesh(railGeo, ladderMat)
    rail.position.set(LADDER_X + ox, TRAMP_Y / 2, LADDER_Z)
    scene.add(rail)
  })
  const rungCount = Math.floor(TRAMP_Y / 0.30)
  for (let i = 0; i < rungCount; i++) {
    const rung = new THREE.Mesh(rungGeo, ladderMat)
    rung.position.set(LADDER_X, 0.28 + i * (TRAMP_Y / rungCount), LADDER_Z)
    scene.add(rung)
  }

  // Box collider for ladder — prevents clipping through while jumping
  // Skipped while climbing (collision block is bypassed when climbingRef is true)
  boxCols.push({ x0: LADDER_X - 0.45, x1: LADDER_X + 0.45, z0: LADDER_Z - 0.18, z1: LADDER_Z + 0.18, maxY: TRAMP_Y + 0.2 })

  return {
    FIRE_POS,
    flameMat, flameMesh, innerFlameMesh, fireLight,
    ffMesh, ffData,
    ducks, pondGrp,
    balls,
    ringLine, ringGeo,
  }
}
