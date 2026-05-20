import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import {
  BOWL_CX, BOWL_START_Z, BOWL_PINS_Z, BOWL_LANE_Z,
  PIN_H, PIN_R_BOT, PIN_R_TOP, BOWL_BALL_R, PIN_ROW_D, PIN_POSITIONS,
} from '../constants'

export interface BowlingResult {
  bowlMeshes:   THREE.Object3D[]
  pinMeshes:    THREE.Mesh[]
  pinBodies:    CANNON.Body[]
  bowlBallMesh: THREE.Mesh
  bowlBallBody: CANNON.Body
  aimArrow:     THREE.Group
  resetBowling: () => void
  throwBowl:    (aim: number, power: number) => void
  countKnockedPins: () => number
}

export function createBowling(
  scene: THREE.Scene,
  physWorld: CANNON.World,
  bowlAimRef: React.MutableRefObject<number>,
  bowlPowerRef: React.MutableRefObject<number>,
): BowlingResult {
  const bowlMeshes: THREE.Object3D[] = []

  const laneLen = Math.abs(BOWL_PINS_Z - BOWL_START_Z) + 4
  const laneW   = 2.6

  // Wood canvas texture
  const laneCv = document.createElement('canvas'); laneCv.width = 128; laneCv.height = 512
  const lc = laneCv.getContext('2d')!
  lc.fillStyle = '#c8913a'; lc.fillRect(0, 0, 128, 512)
  // Board lines
  for (let bx = 16; bx < 128; bx += 16) {
    lc.strokeStyle = '#9a6a22'; lc.lineWidth = 1.5
    lc.beginPath(); lc.moveTo(bx, 0); lc.lineTo(bx, 512); lc.stroke()
  }
  // Approach dots (7 dots across, repeated rows)
  lc.fillStyle = '#7a4e10'
  for (let row = 0; row < 3; row++) {
    const dy = 80 + row * 50
    for (let col = 0; col < 7; col++) {
      lc.beginPath(); lc.arc(9 + col * 18, dy, 3, 0, Math.PI * 2); lc.fill()
    }
  }
  const laneTex = new THREE.CanvasTexture(laneCv)
  laneTex.wrapS = THREE.RepeatWrapping; laneTex.wrapT = THREE.RepeatWrapping
  laneTex.repeat.set(1, 1)

  const laneMat = new THREE.MeshPhongMaterial({ map: laneTex, shininess: 60 })
  const laneMesh = new THREE.Mesh(new THREE.BoxGeometry(laneW, 0.04, laneLen), laneMat)
  laneMesh.receiveShadow = true
  laneMesh.position.set(BOWL_CX, 0.02, BOWL_LANE_Z); scene.add(laneMesh); bowlMeshes.push(laneMesh)

  // Gutters
  ;[-(laneW / 2 + 0.12), (laneW / 2 + 0.12)].forEach(ox => {
    const gutter = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, laneLen), new THREE.MeshLambertMaterial({ color: 0x6b4a1a }))
    gutter.position.set(BOWL_CX + ox, 0.02, BOWL_LANE_Z); scene.add(gutter); bowlMeshes.push(gutter)
  })

  // Static lane body so balls roll on it
  const laneBody = new CANNON.Body({ mass: 0 })
  laneBody.addShape(new CANNON.Box(new CANNON.Vec3(laneW / 2, 0.02, laneLen / 2)))
  laneBody.position.set(BOWL_CX, 0.02, BOWL_LANE_Z)
  physWorld.addBody(laneBody)

  // ── Pin-deck bumpers ──────────────────────────────────────────────────
  const bumperMat = new THREE.MeshLambertMaterial({ color: 0xb09a78 })
  const bumperH   = 0.42
  const bumperThk = 0.18
  const deckFront = BOWL_PINS_Z + 0.55
  const deckBack  = BOWL_PINS_Z - PIN_ROW_D * 3 - 0.65
  const deckLen   = Math.abs(deckBack - deckFront)
  const deckCtrZ  = (deckFront + deckBack) / 2

  // Left and right side walls
  ;[-1, 1].forEach(side => {
    const wx = BOWL_CX + side * (laneW / 2 + bumperThk / 2)
    const wallMesh = new THREE.Mesh(new THREE.BoxGeometry(bumperThk, bumperH, deckLen), bumperMat)
    wallMesh.position.set(wx, bumperH / 2, deckCtrZ); scene.add(wallMesh); bowlMeshes.push(wallMesh)
    const wallBody = new CANNON.Body({ mass: 0 })
    wallBody.addShape(new CANNON.Box(new CANNON.Vec3(bumperThk / 2, bumperH / 2, deckLen / 2)))
    wallBody.position.set(wx, bumperH / 2, deckCtrZ)
    physWorld.addBody(wallBody)
  })

  // Back wall
  const backMesh = new THREE.Mesh(new THREE.BoxGeometry(laneW + bumperThk * 2, bumperH, bumperThk), bumperMat)
  backMesh.position.set(BOWL_CX, bumperH / 2, deckBack - bumperThk / 2); scene.add(backMesh); bowlMeshes.push(backMesh)
  const backBody = new CANNON.Body({ mass: 0 })
  backBody.addShape(new CANNON.Box(new CANNON.Vec3((laneW + bumperThk * 2) / 2, bumperH / 2, bumperThk / 2)))
  backBody.position.set(BOWL_CX, bumperH / 2, deckBack - bumperThk / 2)
  physWorld.addBody(backBody)

  // ── Bowling pins ──────────────────────────────────────────────────────
  const pinCv = document.createElement('canvas'); pinCv.width = 64; pinCv.height = 128
  const pctx = pinCv.getContext('2d')!
  pctx.fillStyle = '#f5f0e8'; pctx.fillRect(0, 0, 64, 128)
  pctx.fillStyle = '#cc1111'; pctx.fillRect(0, 28, 64, 9)
  pctx.fillStyle = '#cc1111'; pctx.fillRect(0, 42, 64, 9)
  const pinTex = new THREE.CanvasTexture(pinCv)
  const pinMat = new THREE.MeshPhongMaterial({ map: pinTex, shininess: 90 })

  const pinMeshes: THREE.Mesh[] = []
  const pinBodies: CANNON.Body[] = []
  PIN_POSITIONS.forEach(([px, py, pz]) => {
    const pinGeo = new THREE.CylinderGeometry(PIN_R_TOP, PIN_R_BOT, PIN_H, 12)
    const m = new THREE.Mesh(pinGeo, pinMat); m.castShadow = true; scene.add(m)
    m.position.set(px, py, pz); pinMeshes.push(m); bowlMeshes.push(m)
    const b = new CANNON.Body({ mass: 0.15 })
    b.addShape(new CANNON.Cylinder(PIN_R_TOP, PIN_R_BOT, PIN_H, 8))
    b.position.set(px, py, pz)
    b.linearDamping  = 0.3
    b.angularDamping = 0.4
    b.sleep()
    physWorld.addBody(b); pinBodies.push(b)
  })

  // ── Bowling ball ──────────────────────────────────────────────────────
  const bowlBallMesh = new THREE.Mesh(
    new THREE.SphereGeometry(BOWL_BALL_R, 18, 14),
    new THREE.MeshPhongMaterial({ color: 0x1a1a3a, shininess: 180, specular: 0x6688cc }),
  )
  bowlBallMesh.castShadow = true; bowlBallMesh.visible = false; scene.add(bowlBallMesh); bowlMeshes.push(bowlBallMesh)
  const bowlBallBody = new CANNON.Body({ mass: 8 })
  bowlBallBody.addShape(new CANNON.Sphere(BOWL_BALL_R))
  bowlBallBody.position.set(BOWL_CX, BOWL_BALL_R, BOWL_START_Z)
  bowlBallBody.linearDamping  = 0.12
  bowlBallBody.angularDamping = 0.25
  bowlBallBody.sleep()
  physWorld.addBody(bowlBallBody)

  // ── Aim arrow ─────────────────────────────────────────────────────────
  const aimArrowMat = new THREE.MeshBasicMaterial({ color: 0xffdd00 })
  const aimShaft = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.025, 1.1), aimArrowMat)
  aimShaft.position.z = -0.55
  const aimHead = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.24, 6), aimArrowMat)
  aimHead.rotation.x = -Math.PI / 2; aimHead.position.z = -1.23
  const aimArrow = new THREE.Group()
  aimArrow.add(aimShaft, aimHead)
  aimArrow.position.set(BOWL_CX, 0.055, BOWL_START_Z - 0.4)
  aimArrow.visible = false
  scene.add(aimArrow); bowlMeshes.push(aimArrow)

  // ── Bowling helpers ───────────────────────────────────────────────────
  function resetBowling() {
    bowlBallBody.position.set(BOWL_CX, BOWL_BALL_R, BOWL_START_Z)
    bowlBallBody.velocity.setZero(); bowlBallBody.angularVelocity.setZero()
    bowlBallBody.sleep(); bowlBallMesh.visible = false
    PIN_POSITIONS.forEach(([px, py, pz], i) => {
      pinBodies[i].position.set(px, py, pz)
      pinBodies[i].velocity.setZero(); pinBodies[i].angularVelocity.setZero()
      pinBodies[i].quaternion.set(0, 0, 0, 1)
      pinBodies[i].sleep(); pinMeshes[i].visible = true
    })
    bowlAimRef.current      = 0
    bowlPowerRef.current    = 0
  }
  function throwBowl(aim: number, power: number) {
    const spd = 8 + power * 14   // 8–22 units/s
    bowlBallBody.position.set(BOWL_CX + Math.sin(aim) * 0.5, BOWL_BALL_R, BOWL_START_Z)
    bowlBallBody.velocity.set(Math.sin(aim) * spd * 0.22, 0.15, -spd)
    bowlBallBody.wakeUp()
    PIN_POSITIONS.forEach((_, i) => pinBodies[i].wakeUp())
    bowlBallMesh.visible = true
  }
  function countKnockedPins() {
    let knocked = 0
    pinBodies.forEach(b => {
      const q = b.quaternion
      const upY = 1 - 2 * (q.x * q.x + q.z * q.z)
      if (upY < 0.5) knocked++
    })
    return knocked
  }

  return {
    bowlMeshes, pinMeshes, pinBodies,
    bowlBallMesh, bowlBallBody,
    aimArrow,
    resetBowling, throwBowl, countKnockedPins,
  }
}
