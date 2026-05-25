import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { lerpAngle } from '../helpers'
import { DuckData, CylCol } from '../types'
import { CAR_COL_R } from '../setup/createCar'
import { CRADLE_X, CRADLE_Z, CRADLE_PROX } from '../setup/createExhibit'
import type { InteractZone } from '../setup/createProjectDisplays'
import {
  BOWL_CX, BOWL_START_Z, BOWL_PINS_Z,
  RTOSS_CX, RTOSS_START_Z, RTOSS_POST_Z, RTOSS_PROX, RTOSS_RINGS,
  TRAMP_CX, TRAMP_CZ, TRAMP_R, TRAMP_Y,
  LADDER_X, LADDER_Z,
  BENCH_POSITIONS, BENCH_PROX,
  PIT_CX, PIT_CZ, PIT_R,
  CAR_PROX, CAR_INITIAL_ANGLE,
  PIN_ROW_D,
  BowlState, RTossState,
} from '../constants'

// ─── All mutable scalars that must survive between frames ─────────────────────
export interface AnimateState {
  camYaw:      number
  camPitch:    number
  playerVelY:  number
  fpvBlend:    number
  walkPhase:   number
  swingAmt:    number
  elapsed:     number
  lastTime:    number
  nearBowl:    boolean   // local mirror of nearBowl state for change-detection
  carAngle:    number
}

// ─── Everything the loop reads/writes but doesn't own ─────────────────────────
export interface AnimateParams {
  // Three.js / Cannon
  scene:        THREE.Scene
  camera:       THREE.PerspectiveCamera
  renderer:     THREE.WebGLRenderer
  physWorld:    CANNON.World
  // Scene objects
  player:       THREE.Group
  cabGrp:       THREE.Group
  rampGrp:      THREE.Group
  aimArrow:     THREE.Group
  flameMat:     THREE.MeshBasicMaterial
  flameMesh:    THREE.Mesh
  innerFlameMesh: THREE.Mesh
  fireLight:    THREE.PointLight
  ffMesh:       THREE.InstancedMesh
  ffData:       { bx: number; by: number; bz: number; ph: number; sp: number; am: number }[]
  ducks:        DuckData[]
  pondGrp:      THREE.Group
  balls:        { mesh: THREE.Mesh; body: CANNON.Body }[]
  pinMeshes:    THREE.Mesh[]
  pinBodies:    CANNON.Body[]
  bowlBallMesh: THREE.Mesh
  bowlBallBody: CANNON.Body
  ringMeshes:   THREE.Mesh[]
  ringBodies:   CANNON.Body[]
  ringLine:     THREE.Line
  ringGeo:      THREE.BufferGeometry
  // Player limbs
  lArmPivot: THREE.Group; rArmPivot: THREE.Group
  lLegPivot: THREE.Group; rLegPivot: THREE.Group
  lKnee:     THREE.Group; rKnee:     THREE.Group
  lElbow:    THREE.Group; rElbow:    THREE.Group
  // Collision arrays
  cylCols:  { x: number; z: number; r: number; maxY?: number }[]
  boxCols:  { x0: number; x1: number; z0: number; z1: number; maxY: number }[]
  ceilCols: { x0: number; x1: number; z0: number; z1: number; minY: number }[]
  // World constants
  CABIN_X: number; CABIN_Z: number
  POND_X: number; POND_Z: number; POND_R: number
  FIRE_POS: THREE.Vector3
  CHAIR_LOCAL_POS: THREE.Vector3
  MONITOR_LOCAL_POS: THREE.Vector3
  CHAIR_PROX: number
  RADIO_PROX: number
  // Input
  keys: Set<string>
  touchMoveRef: React.MutableRefObject<{ x: number; y: number }>
  lookMoveRef:  React.MutableRefObject<{ x: number; y: number }>
  isMobileRef:  React.MutableRefObject<boolean>
  // React refs — state mirrors
  bowlStateRef:     React.MutableRefObject<BowlState>
  rtossStateRef:    React.MutableRefObject<RTossState>
  focusActiveRef:   React.MutableRefObject<boolean>
  overlayShownRef:  React.MutableRefObject<boolean>
  sittingRef:       React.MutableRefObject<boolean>
  sittingAtRef:     React.MutableRefObject<'bench' | 'chair' | null>
  seatIdxRef:       React.MutableRefObject<number>
  climbingRef:      React.MutableRefObject<boolean>
  jumpPressedRef:   React.MutableRefObject<boolean>
  onRampRef:        React.MutableRefObject<boolean>
  onFloorRef:       React.MutableRefObject<boolean>
  doorPivotRef:     React.MutableRefObject<THREE.Group | null>
  doorOpenRef:      React.MutableRefObject<boolean>
  doorRotRef:       React.MutableRefObject<number>
  cabLightOnRef:    React.MutableRefObject<boolean>
  nearSwitchRef:    React.MutableRefObject<boolean>
  switchNodeRef:    React.MutableRefObject<THREE.Object3D | null>
  cabCeilLightRef:  React.MutableRefObject<THREE.PointLight | null>
  monLightRef:      React.MutableRefObject<THREE.SpotLight | null>
  inCabinPrevRef:   React.MutableRefObject<boolean>
  goOutsideRef:     React.MutableRefObject<boolean>
  goToComputerRef:  React.MutableRefObject<boolean>
  dayEnvRef:        React.MutableRefObject<THREE.Texture | null>
  ambientLightRef:  React.MutableRefObject<THREE.AmbientLight | null>
  sunLightRef:      React.MutableRefObject<THREE.DirectionalLight | null>
  cinematicRef:     React.MutableRefObject<{ active: boolean; t: number; duration: number; fromPos: THREE.Vector3; toPos: THREE.Vector3; fromLook: THREE.Vector3; toLook: THREE.Vector3; onDone: (() => void) | null }>
  playerBonesRef:   React.MutableRefObject<{ lUpLeg?: THREE.Bone; rUpLeg?: THREE.Bone; lLoLeg?: THREE.Bone; rLoLeg?: THREE.Bone; lUpArm?: THREE.Bone; rUpArm?: THREE.Bone; spine?: THREE.Bone } | null>
  playerWalkBlendRef: React.MutableRefObject<number>
  bowlAimRef:       React.MutableRefObject<number>
  bowlPowerRef:     React.MutableRefObject<number>
  bowlPowerDirRef:  React.MutableRefObject<number>
  bowlTimerRef:     React.MutableRefObject<number>
  bowlHSRef:        React.MutableRefObject<number>
  bowlThrowKeyRef:  React.MutableRefObject<boolean>
  powerBarRef:      React.MutableRefObject<HTMLDivElement | null>
  rtossAimRef:      React.MutableRefObject<number>
  rPowerRef:        React.MutableRefObject<number>
  rPowerDirRef:     React.MutableRefObject<number>
  rtossTimerRef:    React.MutableRefObject<number>
  rtossThrownRef:   React.MutableRefObject<number>
  rtossThrowKeyRef: React.MutableRefObject<boolean>
  rPowerBarRef:     React.MutableRefObject<HTMLDivElement | null>
  nearBowlRef:      React.MutableRefObject<boolean>
  nearRTossRef:     React.MutableRefObject<boolean>
  nearBenchRef:     React.MutableRefObject<boolean>
  nearChairRef:     React.MutableRefObject<boolean>
  nearLadderRef:    React.MutableRefObject<boolean>
  nearRadioRef:     React.MutableRefObject<boolean>
  radioGroupRef:    React.MutableRefObject<THREE.Group | null>
  focusPosRef:      React.MutableRefObject<THREE.Vector3>
  focusLookRef:     React.MutableRefObject<THREE.Vector3>
  movablesRef:      React.MutableRefObject<{ name: string; group: THREE.Group; meshes?: THREE.Object3D[]; scaleObj?: THREE.Object3D; isHitbox?: boolean }[]>
  debugModeRef:     React.MutableRefObject<boolean>
  debugPanelRef:    React.MutableRefObject<HTMLPreElement | null>
  // React state setters
  setNearBowl:      (v: boolean) => void
  setNearRToss:     (v: boolean) => void
  setNearBench:     (v: boolean) => void
  setNearChair:     (v: boolean) => void
  setNearLadder:    (v: boolean) => void
  setNearSwitch:    (v: boolean) => void
  setNearRadio:     (v: boolean) => void
  cliffUpdate:         (elapsed: number) => void
  projectDisplayUpdate:(elapsed: number) => void
  exhibitUpdate:       (elapsed: number, delta: number) => void
  interactZones:       InteractZone[]
  nearProjectRef:      React.MutableRefObject<boolean>
  nearProjectLabelRef: React.MutableRefObject<string>
  nearProjectUrlRef:   React.MutableRefObject<string>
  setNearProject:      (v: boolean) => void
  setClimbing:         (v: boolean) => void
  setMonitorMode:   (v: boolean) => void
  carGrp:       THREE.Group
  carCol:       CylCol
  carHitboxGrp: THREE.Group
  drivingRef:      React.MutableRefObject<boolean>
  nearCarRef:      React.MutableRefObject<boolean>
  setNearCar:      (v: boolean) => void
  setDriving:      (v: boolean) => void
  nearCradleRef:   React.MutableRefObject<boolean>
  setNearCradle:   (v: boolean) => void
  setBowlDisplay:   (fn: (p: { state: BowlState; score: number; hs: number }) => { state: BowlState; score: number; hs: number }) => void
  setRTossDisplay:  (v: { state: RTossState; thrown: number; score: number; hs: number } | ((p: { state: RTossState; thrown: number; score: number; hs: number }) => { state: RTossState; thrown: number; score: number; hs: number })) => void
}

export function createAnimateLoop(p: AnimateParams): { start: () => void; stop: () => void } {
  const PLAYER_R = 0.38, DUCK_Y = 0.13
  const _tmpCam = p.camera.clone()
  const _mat4   = new THREE.Matrix4()
  const _gizmoSz = new THREE.Vector2()
  let animId: number
  let wasDriving = false

  // ── Axis gizmo (shown bottom-left in debug mode) ─────────────────────────
  const gizmoScene = new THREE.Scene()
  const gizmoAxes = new THREE.AxesHelper(1)
  gizmoScene.add(gizmoAxes)
  const gizmoCam = new THREE.PerspectiveCamera(50, 1, 0.1, 10)
  gizmoCam.position.set(0, 0, 3)


  const st: AnimateState = {
    camYaw: 0, camPitch: -0.165, playerVelY: 0, fpvBlend: 0,
    walkPhase: 0, swingAmt: 0, elapsed: 0, lastTime: performance.now(), nearBowl: false, carAngle: CAR_INITIAL_ANGLE,
  }

  // Expose camYaw/camPitch for external writers (mouse-move handler, cinematics)
  ;(p as any).__animState = st

  function animate() {
    animId = requestAnimationFrame(animate)
    const now = performance.now()
    const delta = Math.min((now - st.lastTime) / 1000, 0.05)
    st.lastTime = now; st.elapsed += delta
    p.cliffUpdate(st.elapsed)
    p.projectDisplayUpdate(st.elapsed)
    p.exhibitUpdate(st.elapsed, delta)

    // Bone animation
    const bones = p.playerBonesRef.current
    if (bones) {
      // Register bones in movablesRef once so they appear in debug panel
      if (!p.movablesRef.current.find(m => m.name === '🦴 L Arm')) {
        if (bones.lUpArm) p.movablesRef.current.push({ name: '🦴 L Arm',   group: bones.lUpArm as unknown as THREE.Group })
        if (bones.rUpArm) p.movablesRef.current.push({ name: '🦴 R Arm',   group: bones.rUpArm as unknown as THREE.Group })
        if (bones.lUpLeg) p.movablesRef.current.push({ name: '🦴 L UpLeg', group: bones.lUpLeg as unknown as THREE.Group })
        if (bones.rUpLeg) p.movablesRef.current.push({ name: '🦴 R UpLeg', group: bones.rUpLeg as unknown as THREE.Group })
        if (bones.lLoLeg) p.movablesRef.current.push({ name: '🦴 L LoLeg', group: bones.lLoLeg as unknown as THREE.Group })
        if (bones.rLoLeg) p.movablesRef.current.push({ name: '🦴 R LoLeg', group: bones.rLoLeg as unknown as THREE.Group })
      }

      // Skip bone override when debug is open so user can adjust freely
      if (!p.debugModeRef.current) {
        if (p.sittingRef.current || p.drivingRef.current) {
          // Sitting pose (tuned via debug panel)
          const d = Math.PI / 180
          if (bones.lUpLeg) bones.lUpLeg.rotation.set(-86.6 * d,  1.2 * d, -156.3 * d)
          if (bones.rUpLeg) bones.rUpLeg.rotation.set(-86.4 * d,  5.0 * d,  176.0 * d)
          if (bones.lLoLeg) bones.lLoLeg.rotation.set(-108.0 * d,  0.1 * d, -0.8 * d)
          if (bones.rLoLeg) bones.rLoLeg.rotation.set(-108.0 * d, -0.1 * d,  0.8 * d)
          if (bones.lUpArm) bones.lUpArm.rotation.set( 56.5 * d, -17.9 * d,  30.8 * d)
          if (bones.rUpArm) bones.rUpArm.rotation.set( 72.1 * d,  19.0 * d, -31.8 * d)
          if (bones.spine)  bones.spine.rotation.x = 0
        } else {
          // Walk / idle animation
          const blend = THREE.MathUtils.lerp(p.playerWalkBlendRef.current === 1 ? 1 : 0, p.playerWalkBlendRef.current, Math.min(1, delta * 8))
          const t = st.elapsed * Math.PI * 2, sw = 0.30, kb = 0.28
          if (bones.lUpLeg) bones.lUpLeg.rotation.set(Math.sin(t) * sw * blend,            0,    -176.3 * Math.PI / 180)
          if (bones.rUpLeg) bones.rUpLeg.rotation.set(Math.sin(t + Math.PI) * sw * blend,  0,     176.3 * Math.PI / 180)
          if (bones.lLoLeg) bones.lLoLeg.rotation.set(Math.max(0, Math.sin(t + Math.PI * 0.5)) * kb * blend,  0.1 * Math.PI / 180, -0.8 * Math.PI / 180)
          if (bones.rLoLeg) bones.rLoLeg.rotation.set(Math.max(0, Math.sin(t + Math.PI * 1.5)) * kb * blend, -0.1 * Math.PI / 180,  0.8 * Math.PI / 180)
          const asw = 0.20, ta = t + Math.PI + 0.4
          if (bones.lUpArm) bones.lUpArm.rotation.set(53.4 * Math.PI / 180,  8.9 * Math.PI / 180, -5.8 * Math.PI / 180 + Math.sin(ta) * asw * blend)
          if (bones.rUpArm) bones.rUpArm.rotation.set(53.2 * Math.PI / 180, -7.6 * Math.PI / 180,  5.0 * Math.PI / 180 + Math.sin(ta) * asw * blend)
          if (bones.spine)  bones.spine.rotation.x = Math.sin(st.elapsed * Math.PI) * 0.015
        }
      }
    }

    // Go Outside / Use Computer cinematics
    if (p.goOutsideRef.current) {
      p.goOutsideRef.current = false; p.player.position.set(-4.0, 2.1, 14.0); st.playerVelY = 0; st.camYaw = 1.5
      const cs = p.cinematicRef.current; cs.active = true; cs.t = 0; cs.duration = 2.8
      cs.fromPos.copy(p.cabGrp.localToWorld(new THREE.Vector3(p.CHAIR_LOCAL_POS.x, p.CHAIR_LOCAL_POS.y + 1.15, p.CHAIR_LOCAL_POS.z)))
      cs.fromLook.copy(p.cabGrp.localToWorld(p.MONITOR_LOCAL_POS.clone()))
      cs.toPos.set(-4.0, 2.1 + 1.65, 14.0); cs.toLook.set(-7.5, 2.1 + 1.65, 14.5)
      cs.onDone = () => {
        // Snap camera to third-person target so it doesn't lerp through a downward arc
        p.camera.position.set(-4.0 + Math.sin(1.5) * 5.2, 2.1 + 1.2, 14.0 + Math.cos(1.5) * 5.2)
        st.camPitch = 0
      }
      p.camera.position.copy(cs.fromPos); p.camera.lookAt(cs.fromLook)
    }
    if (p.goToComputerRef.current) {
      p.goToComputerRef.current = false
      const cs = p.cinematicRef.current; cs.active = true; cs.t = 0; cs.duration = 2.0
      cs.fromPos.set(p.player.position.x, p.player.position.y + 1.65, p.player.position.z)
      cs.fromLook.set(p.player.position.x - Math.sin(st.camYaw) * 8, p.player.position.y + 1.65 + Math.sin(st.camPitch) * 3, p.player.position.z - Math.cos(st.camYaw) * 8)
      cs.toPos.copy(p.cabGrp.localToWorld(new THREE.Vector3(p.CHAIR_LOCAL_POS.x, p.CHAIR_LOCAL_POS.y + 1.15, p.CHAIR_LOCAL_POS.z)))
      cs.toLook.copy(p.cabGrp.localToWorld(new THREE.Vector3(p.CHAIR_LOCAL_POS.x, p.CHAIR_LOCAL_POS.y + 1.15, p.CHAIR_LOCAL_POS.z - 8)))
      cs.onDone = () => { document.exitPointerLock(); p.setMonitorMode(true) }
    }

    p.physWorld.step(1 / 60, delta, 3)

    // Sync physics meshes + clamp pit balls inside pit walls
    const PIT_CLAMP = PIT_R - 0.16  // ball radius 0.14 + small gap
    p.balls.forEach(b => {
      // Clamp position to pit square to prevent tunneling through walls
      const bx = Math.max(PIT_CX - PIT_CLAMP, Math.min(PIT_CX + PIT_CLAMP, b.body.position.x))
      const bz = Math.max(PIT_CZ - PIT_CLAMP, Math.min(PIT_CZ + PIT_CLAMP, b.body.position.z))
      if (bx !== b.body.position.x) { b.body.position.x = bx; b.body.velocity.x *= -0.3 }
      if (bz !== b.body.position.z) { b.body.position.z = bz; b.body.velocity.z *= -0.3 }
      b.mesh.position.set(b.body.position.x, b.body.position.y, b.body.position.z)
      b.mesh.quaternion.set(b.body.quaternion.x, b.body.quaternion.y, b.body.quaternion.z, b.body.quaternion.w)
    })
    p.bowlBallMesh.position.set(p.bowlBallBody.position.x, p.bowlBallBody.position.y, p.bowlBallBody.position.z)
    p.bowlBallMesh.quaternion.set(p.bowlBallBody.quaternion.x, p.bowlBallBody.quaternion.y, p.bowlBallBody.quaternion.z, p.bowlBallBody.quaternion.w)
    p.pinMeshes.forEach((m, i) => { m.position.set(p.pinBodies[i].position.x, p.pinBodies[i].position.y, p.pinBodies[i].position.z); m.quaternion.set(p.pinBodies[i].quaternion.x, p.pinBodies[i].quaternion.y, p.pinBodies[i].quaternion.z, p.pinBodies[i].quaternion.w) })
    p.ringMeshes.forEach((m, i) => { if (m.visible) { m.position.set(p.ringBodies[i].position.x, p.ringBodies[i].position.y, p.ringBodies[i].position.z); m.quaternion.set(p.ringBodies[i].quaternion.x, p.ringBodies[i].quaternion.y, p.ringBodies[i].quaternion.z, p.ringBodies[i].quaternion.w) } })

    p.player.visible = !p.focusActiveRef.current && p.bowlStateRef.current === 'idle' && p.rtossStateRef.current === 'idle' && !p.drivingRef.current



    // Cinematic
    if (p.cinematicRef.current.active) {
      const cs = p.cinematicRef.current; cs.t = Math.min(cs.t + delta / cs.duration, 1)
      const e3 = cs.t < 0.5 ? 4 * cs.t * cs.t * cs.t : 1 - Math.pow(-2 * cs.t + 2, 3) / 2
      p.camera.position.lerpVectors(cs.fromPos, cs.toPos, e3); p.camera.lookAt(new THREE.Vector3().lerpVectors(cs.fromLook, cs.toLook, e3))
      p.player.visible = false
      if (cs.t >= 1) { cs.active = false; const fwd = new THREE.Vector3(); p.camera.getWorldDirection(fwd); st.camYaw = Math.atan2(-fwd.x, -fwd.z); cs.onDone?.() }
    } else if (!p.focusActiveRef.current) {
      // Look joystick (mobile right-side joystick)
      const lookX = p.lookMoveRef.current.x, lookY = p.lookMoveRef.current.y
      if (!p.drivingRef.current && (Math.abs(lookX) > 0.08 || Math.abs(lookY) > 0.08)) {
        st.camYaw -= lookX * 2.5 * delta
        st.camPitch = THREE.MathUtils.clamp(st.camPitch + lookY * 2.0 * delta, -1.3, 1.3)
      }

      // Snap to ground on the exact frame driving stops (y was 0.65 in seat)
      if (wasDriving && !p.drivingRef.current) { p.player.position.y = 0; st.playerVelY = 0 }
      wasDriving = p.drivingRef.current

      // WASD movement
      const fw_x = -Math.sin(st.camYaw), fw_z = -Math.cos(st.camYaw), rt_x = Math.cos(st.camYaw), rt_z = -Math.sin(st.camYaw)
      const joyX = p.touchMoveRef.current.x, joyY = p.touchMoveRef.current.y
      const hasW = p.keys.has('w') || joyY < -0.2, hasS = p.keys.has('s') || joyY > 0.2
      const hasA = p.keys.has('a') || joyX < -0.2, hasD = p.keys.has('d') || joyX > 0.2
      const rawVel = new THREE.Vector3()
      if (hasW) { rawVel.x += fw_x; rawVel.z += fw_z } if (hasS) { rawVel.x -= fw_x; rawVel.z -= fw_z }
      if (hasA) { rawVel.x -= rt_x; rawVel.z -= rt_z } if (hasD) { rawVel.x += rt_x; rawVel.z += rt_z }
      const isMoving = rawVel.lengthSq() > 0
      p.playerWalkBlendRef.current = isMoving ? 1 : 0
      if (isMoving && p.bowlStateRef.current === 'idle' && p.rtossStateRef.current === 'idle' && !p.sittingRef.current && !p.drivingRef.current) { rawVel.normalize().multiplyScalar(8.5 * delta); p.player.position.x += rawVel.x; p.player.position.z += rawVel.z }
      if (!p.drivingRef.current) {
        p.player.rotation.y = lerpAngle(p.player.rotation.y, st.camYaw + Math.PI, 0.14)
        p.player.position.x = THREE.MathUtils.clamp(p.player.position.x, -77.5, 77.5)
        p.player.position.z = THREE.MathUtils.clamp(p.player.position.z, -94.5, 21.5)
      }

      // Jump / gravity
      if (p.bowlStateRef.current === 'idle' && p.rtossStateRef.current === 'idle' && !p.sittingRef.current && !p.climbingRef.current && !p.drivingRef.current) {
        const td = Math.hypot(p.player.position.x - TRAMP_CX, p.player.position.z - TRAMP_CZ)
        const onTrampSurface = td < TRAMP_R - 0.2 && p.player.position.y >= TRAMP_Y - 0.15 && p.player.position.y <= TRAMP_Y + 0.3
        if (p.jumpPressedRef.current) { p.jumpPressedRef.current = false; if (p.player.position.y <= 0.15 || p.onRampRef.current || p.onFloorRef.current) st.playerVelY = 6.5 }
        st.playerVelY -= 18 * delta; p.player.position.y += st.playerVelY * delta
        if (onTrampSurface && st.playerVelY < 0) { p.player.position.y = TRAMP_Y; st.playerVelY = 10.0 }
        if (onTrampSurface && st.playerVelY >= 0 && p.player.position.y < TRAMP_Y + 0.05) p.player.position.y = TRAMP_Y
        // Ramp
        p.onRampRef.current = false
        const rMesh = (p.rampGrp as any).__hitMesh as THREE.Mesh | undefined
        if (rMesh) {
          const rc = new THREE.Vector3(); p.rampGrp.getWorldPosition(rc)
          const halfLen = 0.9 * rMesh.scale.x, halfW = 1.0 * rMesh.scale.z
          const slope = Math.tan(Math.abs(p.rampGrp.rotation.z)), zNear = rc.z - halfLen, zFar = rc.z + halfLen
          const yLow = rc.y - halfLen * slope, yHigh = rc.y + halfLen * slope
          if (p.player.position.x > rc.x - halfW && p.player.position.x < rc.x + halfW && p.player.position.z > zNear && p.player.position.z < zFar) {
            const t = (p.player.position.z - zNear) / (zFar - zNear), surfaceY = yLow + t * (yHigh - yLow)
            if (surfaceY > -0.1 && p.player.position.y < surfaceY) { p.player.position.y = surfaceY; if (st.playerVelY < 0) st.playerVelY = 0; p.onRampRef.current = true }
          }
        }
        // Floor hitboxes
        p.onFloorRef.current = false
        p.movablesRef.current.forEach(m => {
          if (!m.isHitbox || !m.name.includes('Floor')) return
          const mesh = (m.group as any).__hitMesh as THREE.Mesh | undefined; if (!mesh) return
          mesh.updateMatrixWorld(true); const wb = new THREE.Box3().setFromObject(mesh)
          const inXZ = p.player.position.x > wb.min.x && p.player.position.x < wb.max.x && p.player.position.z > wb.min.z && p.player.position.z < wb.max.z
          if (inXZ && p.player.position.y <= wb.max.y && p.player.position.y > wb.max.y - 1.2) { p.player.position.y = wb.max.y; if (st.playerVelY < 0) st.playerVelY = 0; p.onFloorRef.current = true }
        })
        if (p.player.position.y <= 0 && !onTrampSurface) { p.player.position.y = 0; if (st.playerVelY < 0) st.playerVelY = 0 }
      } else if (!p.climbingRef.current) { st.playerVelY = 0 }

      // Walk animation
      st.swingAmt = THREE.MathUtils.clamp(st.swingAmt + (isMoving ? 1 : -1) * delta * 8, 0, 1)
      if (isMoving) st.walkPhase += delta * 6.5
      const sw2 = Math.sin(st.walkPhase) * st.swingAmt * 0.55
      p.lArmPivot.rotation.x = sw2; p.rArmPivot.rotation.x = -sw2; p.lLegPivot.rotation.x = -sw2; p.rLegPivot.rotation.x = sw2
      p.lKnee.rotation.x = Math.max(0, -Math.sin(st.walkPhase)) * st.swingAmt * 0.40; p.rKnee.rotation.x = Math.max(0, Math.sin(st.walkPhase)) * st.swingAmt * 0.40
      p.lElbow.rotation.x = st.swingAmt * 0.15; p.rElbow.rotation.x = st.swingAmt * 0.15

      // FPV / cabin
      const inCabin = p.player.position.x > -8.2 && p.player.position.x < -1.5 && p.player.position.z > 11.0 && p.player.position.z < 18.5 && p.player.position.y > 0.8
      const inCabinOrBalcony = p.player.position.x > -8.2 && p.player.position.x < -1.5 && p.player.position.z > 9.0 && p.player.position.z < 18.5 && p.player.position.y > 1.0
      const px = p.player.position.x, pz = p.player.position.z
      const inStore = (
        (px > -55.90 && px < -50.70 && pz > -17.50 && pz < -12.30) || // Store A
        (px > -56.00 && px < -50.40 && pz > -24.00 && pz < -19.20) || // Store B
        (px > -56.10 && px < -50.90 && pz > -39.10 && pz < -31.90) || // Orange store
        (px > -56.90 && px < -50.90 && pz > -59.00 && pz < -51.40) || // Slant store
        (px > 54.95  && px < 58.55  && pz > -13.10 && pz < -8.30)  || // Mem Ln Bldg 1
        (px > 55.00  && px < 58.60  && pz > -18.90 && pz < -14.10) || // Mem Ln Bldg 2
        (px > 54.90  && px < 58.50  && pz > -25.90 && pz < -21.10) || // Mem Ln Bldg 3
        (px > 54.90  && px < 58.50  && pz > -31.75 && pz < -26.95)    // Mem Ln Bldg 4
      )
      st.fpvBlend = THREE.MathUtils.lerp(st.fpvBlend, (inCabinOrBalcony || inStore) ? 1 : 0, delta * 5)
      if (inCabin !== p.inCabinPrevRef.current) { p.inCabinPrevRef.current = inCabin; p.scene.environment = inCabin ? null : p.dayEnvRef.current }
      const tgtAmbient = inCabin ? 0.5  : 1.2
      const tgtSun     = inCabin ? 0.25 : 1.4
      const tgtExp     = inCabin ? 0.65 : 0.65
      if (p.ambientLightRef.current) p.ambientLightRef.current.intensity = THREE.MathUtils.lerp(p.ambientLightRef.current.intensity, tgtAmbient, delta * 3)
      if (p.sunLightRef.current)     p.sunLightRef.current.intensity     = THREE.MathUtils.lerp(p.sunLightRef.current.intensity,     tgtSun,     delta * 3)
      p.renderer.toneMappingExposure = THREE.MathUtils.lerp(p.renderer.toneMappingExposure, tgtExp, delta * 3)
      const HEAD_H = 1.65
      if (!p.drivingRef.current) {
        p.player.visible = st.fpvBlend < 0.5
        const camDist = 5.2
        st.camPitch = Math.max(st.camPitch, Math.asin(Math.max(-1, (0.3 - p.player.position.y - 1.2) / camDist)))
        const tpTarget = new THREE.Vector3(p.player.position.x + Math.sin(st.camYaw) * Math.cos(st.camPitch) * camDist, p.player.position.y + Math.sin(st.camPitch) * camDist + 1.2, p.player.position.z + Math.cos(st.camYaw) * Math.cos(st.camPitch) * camDist)
        const fpTarget = new THREE.Vector3(p.player.position.x, p.player.position.y + HEAD_H, p.player.position.z)
        p.camera.position.lerp(tpTarget.lerp(fpTarget, st.fpvBlend), st.fpvBlend > 0.5 ? 0.25 : 0.15)
        if (st.fpvBlend < 0.8) { p.camera.lookAt(p.player.position.x, p.player.position.y + 1.0, p.player.position.z) }
        else { const invP = -st.camPitch, cosP = Math.cos(invP); p.camera.lookAt(p.player.position.x - Math.sin(st.camYaw) * cosP * 10, p.player.position.y + HEAD_H + Math.sin(invP) * 10, p.player.position.z - Math.cos(st.camYaw) * cosP * 10) }
      }
      p.ringLine.visible = false; p.ringGeo.setDrawRange(0, 0)

      // Ball pit nudge
      p.balls.forEach(b => {
        const pdx = b.body.position.x - p.player.position.x, pdz = b.body.position.z - p.player.position.z, pd = Math.sqrt(pdx * pdx + pdz * pdz)
        if (pd < PLAYER_R + 0.14 + 0.02 && pd > 0.01) {
          const nx = pdx / pd, nz = pdz / pd
          b.body.velocity.x = nx * 3.5; b.body.velocity.z = nz * 3.5; b.body.velocity.y = 0.3
          b.body.position.x = p.player.position.x + nx * (PLAYER_R + 0.14 + 0.04); b.body.position.z = p.player.position.z + nz * (PLAYER_R + 0.14 + 0.04); b.body.wakeUp()
        }
      })

      // Bench / Chair / Bed proximity
      if (!p.sittingRef.current && !p.drivingRef.current) {
        let nearB = false
        BENCH_POSITIONS.forEach((b, i) => { if (Math.hypot(p.player.position.x - b.x, p.player.position.z - b.z) < BENCH_PROX) { nearB = true; p.seatIdxRef.current = i } })
        const chairWorld = p.CHAIR_LOCAL_POS.clone(); p.cabGrp.localToWorld(chairWorld)
        const nearC = Math.hypot(p.player.position.x - chairWorld.x, p.player.position.z - chairWorld.z) < p.CHAIR_PROX
        if (nearB !== p.nearBenchRef.current) { p.nearBenchRef.current = nearB; p.setNearBench(nearB) }
        if (nearC !== p.nearChairRef.current) { p.nearChairRef.current = nearC; p.setNearChair(nearC) }
        if (p.radioGroupRef.current) {
          const rw = new THREE.Vector3(); p.radioGroupRef.current.getWorldPosition(rw)
          const nrv = Math.hypot(p.player.position.x - rw.x, p.player.position.z - rw.z) < p.RADIO_PROX
          if (nrv !== p.nearRadioRef.current) { p.nearRadioRef.current = nrv; p.setNearRadio(nrv) }
        }
        // Project screen interact zones
        let nearAnyProject = false, projectLabel = '', projectUrl = ''
        for (const zone of p.interactZones) {
          if (Math.hypot(p.player.position.x - zone.pos.x, p.player.position.z - zone.pos.z) < zone.radius) {
            nearAnyProject = true; projectLabel = zone.label; projectUrl = zone.url; break
          }
        }
        if (nearAnyProject !== p.nearProjectRef.current) {
          p.nearProjectRef.current = nearAnyProject; p.setNearProject(nearAnyProject)
        }
        if (nearAnyProject) { p.nearProjectLabelRef.current = projectLabel; p.nearProjectUrlRef.current = projectUrl }
        // Keep parked hitbox in sync with any debug-panel repositioning
        const _hbWP2 = new THREE.Vector3(); p.carHitboxGrp.getWorldPosition(_hbWP2)
        p.carCol.x = _hbWP2.x; p.carCol.z = _hbWP2.z
        // Car proximity
        const nearCarNow = Math.hypot(p.player.position.x - p.carGrp.position.x, p.player.position.z - p.carGrp.position.z) < CAR_PROX
        if (nearCarNow !== p.nearCarRef.current) { p.nearCarRef.current = nearCarNow; p.setNearCar(nearCarNow) }
        // Cradle proximity
        const nearCradleNow = Math.hypot(p.player.position.x - CRADLE_X, p.player.position.z - CRADLE_Z) < CRADLE_PROX
        if (nearCradleNow !== p.nearCradleRef.current) { p.nearCradleRef.current = nearCradleNow; p.setNearCradle(nearCradleNow) }
      } else if (p.sittingAtRef.current === 'bench') {
        const s = BENCH_POSITIONS[p.seatIdxRef.current]
        p.player.position.set(s.x, -0.46, s.z); p.player.rotation.y = Math.atan2(p.FIRE_POS.x - s.x, p.FIRE_POS.z - s.z)
        p.lLegPivot.rotation.x = -Math.PI / 2.8; p.rLegPivot.rotation.x = -Math.PI / 2.8; p.lKnee.rotation.x = Math.PI / 2.0; p.rKnee.rotation.x = Math.PI / 2.0; p.lArmPivot.rotation.x = 0.1; p.rArmPivot.rotation.x = 0.1
        // Camera handled by general tpTarget code — look joystick can freely orbit while seated
      } else if (p.sittingAtRef.current === 'chair') {
        const chairWorld = p.CHAIR_LOCAL_POS.clone(); p.cabGrp.localToWorld(chairWorld)
        const monitorWorld = p.MONITOR_LOCAL_POS.clone(); p.cabGrp.localToWorld(monitorWorld)
        p.player.position.set(chairWorld.x + 0.075, chairWorld.y - 0.15, chairWorld.z); p.player.rotation.y = Math.atan2(monitorWorld.x - chairWorld.x, monitorWorld.z - chairWorld.z)
        p.lLegPivot.rotation.x = -Math.PI / 2.8; p.rLegPivot.rotation.x = -Math.PI / 2.8; p.lKnee.rotation.x = Math.PI / 2.0; p.rKnee.rotation.x = Math.PI / 2.0; p.lArmPivot.rotation.x = 0.25; p.rArmPivot.rotation.x = 0.25
        const chairHead = chairWorld.clone(); chairHead.y += 1.15; p.camera.position.lerp(chairHead, 0.15); p.camera.lookAt(monitorWorld)
      }

      // Car driving
      if (p.drivingRef.current) {
        const CAR_SPEED = 22, CAR_TURN = 3.2
        const jx = p.touchMoveRef.current.x, jy = p.touchMoveRef.current.y
        const fwd  = p.keys.has('w') || jy < -0.2
        const back = p.keys.has('s') || jy >  0.2
        const moving = fwd || back
        if (moving) {
          if (p.keys.has('a') || jx < -0.2) st.carAngle += CAR_TURN * delta
          if (p.keys.has('d') || jx >  0.2) st.carAngle -= CAR_TURN * delta
        }
        const sinA = Math.sin(st.carAngle), cosA = Math.cos(st.carAngle)
        const mvDir = fwd ? 1 : back ? -1 : 0
        const spd = fwd ? CAR_SPEED : back ? CAR_SPEED * 0.4 : 0
        // Model faces +Z at angle=0, so forward is (+sinA, +cosA)
        let nx = p.carGrp.position.x + sinA * spd * mvDir * delta
        let nz = p.carGrp.position.z + cosA * spd * mvDir * delta
        nx = THREE.MathUtils.clamp(nx, -77, 77); nz = THREE.MathUtils.clamp(nz, -94, 21)
        let blocked = false
        // Skip the car's own hitbox when checking collision
        p.cylCols.forEach(c => {
          if (c === p.carCol) return
          const dx = nx - c.x, dz = nz - c.z
          if (dx*dx+dz*dz < (CAR_COL_R+c.r)*(CAR_COL_R+c.r)) blocked = true
        })
        if (!blocked) p.boxCols.forEach(b => { const cx = THREE.MathUtils.clamp(nx,b.x0,b.x1), cz = THREE.MathUtils.clamp(nz,b.z0,b.z1); const dx=nx-cx,dz=nz-cz; if(dx*dx+dz*dz < CAR_COL_R*CAR_COL_R) blocked=true })
        if (!blocked) { p.carGrp.position.x = nx; p.carGrp.position.z = nz }
        p.carGrp.rotation.y = st.carAngle
        // Sync collision circle to hitbox mesh's actual world position
        const _hbWP = new THREE.Vector3(); p.carHitboxGrp.getWorldPosition(_hbWP)
        p.carCol.x = _hbWP.x; p.carCol.z = _hbWP.z
        // Lock player exactly into driver's seat using carGrp local→world transform
        const seatWorld = p.carGrp.localToWorld(new THREE.Vector3(0.40, 0.65, 0.10))
        p.player.position.copy(seatWorld)
        p.player.rotation.y = st.carAngle
        // FPV camera: driver's side eye position
        const eyeLocal = p.carGrp.localToWorld(new THREE.Vector3(0.55, 1.10, 0.10))
        const eyePos = eyeLocal
        p.camera.position.lerp(eyePos, 0.18)
        p.camera.lookAt(eyePos.x + sinA * 20, eyePos.y, eyePos.z + cosA * 20)
      }

      // Ladder — detection zone offset 1.5 units south (approach side), ground-only
      if (!p.climbingRef.current) {
        const nearL = Math.hypot(p.player.position.x - LADDER_X, p.player.position.z - (LADDER_Z + 1.5)) < 1.5
          && p.player.position.y < 0.5
          && p.bowlStateRef.current === 'idle' && p.rtossStateRef.current === 'idle' && !p.sittingRef.current
        if (nearL !== p.nearLadderRef.current) { p.nearLadderRef.current = nearL; p.setNearLadder(nearL) }
      } else {
        p.player.position.x = THREE.MathUtils.lerp(p.player.position.x, LADDER_X, 0.2); p.player.position.z = THREE.MathUtils.lerp(p.player.position.z, LADDER_Z, 0.2); st.playerVelY = 0
        if (p.keys.has('w')) p.player.position.y = Math.min(TRAMP_Y + 0.1, p.player.position.y + 3.0 * delta)
        if (p.keys.has('s')) p.player.position.y = Math.max(0, p.player.position.y - 3.0 * delta)
        if (p.player.position.y >= TRAMP_Y) { p.climbingRef.current = false; p.setClimbing(false); p.player.position.x = TRAMP_CX; p.player.position.z = TRAMP_CZ }
        if (p.player.position.y <= 0) { p.climbingRef.current = false; p.setClimbing(false) }
      }

      // Collision
      if (!p.sittingRef.current && !p.climbingRef.current && !p.drivingRef.current) {
        const PR = PLAYER_R
        p.cylCols.forEach(c => {
          if (c === p.carCol) return  // car uses OBB check below
          if (c.maxY !== undefined && p.player.position.y >= c.maxY) return
          const dx = p.player.position.x - c.x, dz = p.player.position.z - c.z, dist = Math.sqrt(dx * dx + dz * dz), minD = PR + c.r
          if (dist < minD && dist > 0.001) { const nx = dx / dist, nz = dz / dist; p.player.position.x = c.x + nx * minD; p.player.position.z = c.z + nz * minD }
        })
        // OBB collision for car — rotated box matching the visual hitbox
        {
          const hbWP = new THREE.Vector3(); p.carHitboxGrp.getWorldPosition(hbWP)
          const cosC = Math.cos(st.carAngle), sinC = Math.sin(st.carAngle)
          const rx = p.player.position.x - hbWP.x, rz = p.player.position.z - hbWP.z
          // Player in car-local space (inverse Ry)
          const lx = cosC * rx - sinC * rz, lz = sinC * rx + cosC * rz
          // Car length runs along carGrp X axis: hw=half-length(X)=2.25, hl=half-width(Z)=1.0
          const hw = 2.25, hl = 1.0
          if (Math.abs(lx) < hw + PR && Math.abs(lz) < hl + PR) {
            const cx = THREE.MathUtils.clamp(lx, -hw, hw), cz = THREE.MathUtils.clamp(lz, -hl, hl)
            const dx = lx - cx, dz = lz - cz, dist = Math.sqrt(dx * dx + dz * dz)
            if (dist < PR && dist > 0.001) {
              const nx = dx / dist, nz = dz / dist
              const nlx = cx + nx * PR, nlz = cz + nz * PR
              // Back to world space (forward Ry)
              p.player.position.x = hbWP.x + cosC * nlx + sinC * nlz
              p.player.position.z = hbWP.z - sinC * nlx + cosC * nlz
            } else if (dist <= 0.001) {
              // Inside box — push out via nearest face
              const dists = [hw - lx, hw + lx, hl - lz, hl + lz]
              const mi = dists.indexOf(Math.min(...dists))
              let nlx = lx, nlz = lz
              if      (mi === 0) nlx =  hw + PR
              else if (mi === 1) nlx = -hw - PR
              else if (mi === 2) nlz =  hl + PR
              else               nlz = -hl - PR
              p.player.position.x = hbWP.x + cosC * nlx + sinC * nlz
              p.player.position.z = hbWP.z - sinC * nlx + cosC * nlz
            }
          }
        }
        p.boxCols.forEach(b => {
          if (p.player.position.y >= b.maxY) return
          const cx = THREE.MathUtils.clamp(p.player.position.x, b.x0, b.x1), cz = THREE.MathUtils.clamp(p.player.position.z, b.z0, b.z1)
          const dx = p.player.position.x - cx, dz = p.player.position.z - cz, dist = Math.sqrt(dx * dx + dz * dz)
          if (dist < PR && dist > 0.001) { const nx = dx / dist, nz = dz / dist; p.player.position.x = cx + nx * PR; p.player.position.z = cz + nz * PR }
          else if (dist === 0) p.player.position.x += PR
        })
        p.ceilCols.forEach(c => {
          const px = p.player.position.x, pz = p.player.position.z
          if (px < c.x0 || px > c.x1 || pz < c.z0 || pz > c.z1) return
          if (p.player.position.y + HEAD_H > c.minY && st.playerVelY > 0) {
            p.player.position.y = c.minY - HEAD_H; st.playerVelY = 0
          }
        })
        p.movablesRef.current.forEach(m => {
          if (!m.isHitbox || m.name.includes('Ramp') || m.name.includes('Floor')) return
          const mesh = (m.group as any).__hitMesh as THREE.Mesh | undefined; if (!mesh) return
          mesh.updateMatrixWorld(true); const wb = new THREE.Box3().setFromObject(mesh)
          if (p.player.position.y >= wb.max.y) return
          const cx = THREE.MathUtils.clamp(p.player.position.x, wb.min.x, wb.max.x), cz = THREE.MathUtils.clamp(p.player.position.z, wb.min.z, wb.max.z)
          const dx = p.player.position.x - cx, dz = p.player.position.z - cz, dist = Math.sqrt(dx * dx + dz * dz)
          if (dist < PR && dist > 0.001) { const nx = dx / dist, nz = dz / dist; p.player.position.x = cx + nx * PR; p.player.position.z = cz + nz * PR }
          else if (dist === 0) p.player.position.x += PR
        })
      }

      // Ring toss
      const rDist = Math.hypot(p.player.position.x - RTOSS_CX, p.player.position.z - RTOSS_START_Z)
      const newNearRToss = p.rtossStateRef.current === 'idle' && rDist < RTOSS_PROX
      if (newNearRToss !== p.nearRTossRef.current) { p.nearRTossRef.current = newNearRToss; p.setNearRToss(newNearRToss) }
      if (p.rtossStateRef.current === 'aiming' || p.rtossStateRef.current === 'thrown' || p.rtossStateRef.current === 'result') {
        const rAim = p.rtossAimRef.current
        if (p.rtossStateRef.current === 'aiming') {
          if (p.keys.has('a') || p.touchMoveRef.current.x < -0.2) p.rtossAimRef.current = THREE.MathUtils.clamp(p.rtossAimRef.current - delta * 1.2, -0.4, 0.4)
          if (p.keys.has('d') || p.touchMoveRef.current.x > 0.2)  p.rtossAimRef.current = THREE.MathUtils.clamp(p.rtossAimRef.current + delta * 1.2, -0.4, 0.4)
          p.rPowerRef.current += delta * p.rPowerDirRef.current * 1.4
          if (p.rPowerRef.current >= 1) { p.rPowerRef.current = 1; p.rPowerDirRef.current = -1 } if (p.rPowerRef.current <= 0) { p.rPowerRef.current = 0; p.rPowerDirRef.current = 1 }
          if (p.rPowerBarRef.current) p.rPowerBarRef.current.style.width = `${p.rPowerRef.current * 100}%`
        }
        if (p.rtossStateRef.current === 'thrown') {
          p.rtossTimerRef.current += delta
          if (p.rtossTimerRef.current > 3.0) {
            if (p.rtossThrownRef.current >= RTOSS_RINGS) {
              let sc = 0
              p.ringBodies.forEach(rb => { const dx = rb.position.x - RTOSS_CX, dz = rb.position.z - RTOSS_POST_Z; if (Math.sqrt(dx*dx+dz*dz) < 0.44 && rb.position.y < 1.6) sc++ })
              const hs = Math.max(sc, parseInt(localStorage.getItem('gabe-rtoss-hs') || '0'))
              localStorage.setItem('gabe-rtoss-hs', String(hs)); p.rtossStateRef.current = 'result'; p.setRTossDisplay({ state: 'result', thrown: p.rtossThrownRef.current, score: sc, hs })
            } else { p.rtossStateRef.current = 'aiming'; p.rtossTimerRef.current = 0; p.rPowerRef.current = 0; p.rPowerDirRef.current = 1; p.rtossThrowKeyRef.current = false; p.setRTossDisplay(prev => ({ ...prev, state: 'aiming' })) }
          }
        }
        if (p.rtossStateRef.current === 'result') { p.camera.position.lerp(new THREE.Vector3(RTOSS_CX, 2.2, RTOSS_START_Z + 2.0), 0.07); p.camera.lookAt(RTOSS_CX, 0.4, RTOSS_POST_Z) }
        else { p.camera.position.lerp(new THREE.Vector3(RTOSS_CX, 1.55, RTOSS_START_Z + 0.2), 0.18); p.camera.lookAt(RTOSS_CX + Math.sin(rAim) * 8, 0.5, RTOSS_POST_Z) }
        p.player.position.set(RTOSS_CX, 0, RTOSS_START_Z + 1.5); p.player.rotation.y = Math.PI
      }

      // Light switch
      if (p.switchNodeRef.current) {
        const swWorld = new THREE.Vector3(); p.switchNodeRef.current.getWorldPosition(swWorld)
        const newNear = Math.hypot(p.player.position.x - swWorld.x, p.player.position.z - swWorld.z) < 1.6
        if (newNear !== p.nearSwitchRef.current) { p.nearSwitchRef.current = newNear; p.setNearSwitch(newNear) }
      }

      // Bowling
      const newNearBowl = p.bowlStateRef.current === 'idle' && Math.hypot(p.player.position.x - BOWL_CX, p.player.position.z - BOWL_START_Z) < 5.5
      if (newNearBowl !== st.nearBowl) { st.nearBowl = newNearBowl; p.nearBowlRef.current = newNearBowl; p.setNearBowl(newNearBowl) }
      if (p.bowlStateRef.current === 'thrown') {
        p.bowlTimerRef.current += delta
        if (p.bowlTimerRef.current > 4.5) {
          let knocked = 0
          p.pinBodies.forEach(b => { const q = b.quaternion, upY = 1 - 2 * (q.x * q.x + q.z * q.z); if (upY < 0.5) knocked++ })
          const newHS = Math.max(knocked, p.bowlHSRef.current)
          if (newHS > p.bowlHSRef.current) { p.bowlHSRef.current = newHS; localStorage.setItem('gabe-bowl-hs', String(newHS)) }
          p.bowlStateRef.current = 'result'; p.setBowlDisplay(_ => ({ state: 'result', score: knocked, hs: newHS }))
        }
      }
      if (p.bowlStateRef.current === 'aiming' || p.bowlStateRef.current === 'thrown' || p.bowlStateRef.current === 'result') {
        const aim = p.bowlAimRef.current
        if (p.bowlStateRef.current === 'aiming') {
          if (p.keys.has('a') || p.touchMoveRef.current.x < -0.2) p.bowlAimRef.current = THREE.MathUtils.clamp(p.bowlAimRef.current - delta * 1.2, -0.45, 0.45)
          if (p.keys.has('d') || p.touchMoveRef.current.x > 0.2)  p.bowlAimRef.current = THREE.MathUtils.clamp(p.bowlAimRef.current + delta * 1.2, -0.45, 0.45)
          if (p.bowlThrowKeyRef.current) p.bowlPowerRef.current = Math.min(p.bowlPowerRef.current + delta * 1.4, 1)
          if (p.powerBarRef.current) p.powerBarRef.current.style.width = `${p.bowlPowerRef.current * 100}%`
        }
        p.aimArrow.visible = p.bowlStateRef.current === 'aiming'; p.aimArrow.rotation.y = -p.bowlAimRef.current
        if (p.bowlStateRef.current === 'result') { p.camera.position.lerp(new THREE.Vector3(BOWL_CX, 2.4, BOWL_START_Z + 2.2), 0.07); p.camera.lookAt(BOWL_CX, 0.3, BOWL_PINS_Z - PIN_ROW_D * 1.5) }
        else { p.camera.position.lerp(new THREE.Vector3(BOWL_CX, 1.55, BOWL_START_Z + 0.2), 0.18); p.camera.lookAt(BOWL_CX + Math.sin(aim) * 10, 0.35, BOWL_PINS_Z - PIN_ROW_D) }
        p.player.position.set(BOWL_CX, 0, BOWL_START_Z + 1.5); p.player.rotation.y = Math.PI
      }
    } else {
      // Focus: glide camera to sign
      p.camera.position.lerp(p.focusPosRef.current, 0.042)
      _tmpCam.position.copy(p.camera.position); _tmpCam.lookAt(p.focusLookRef.current); p.camera.quaternion.slerp(_tmpCam.quaternion, 0.062)
      if (!p.overlayShownRef.current && p.camera.position.distanceTo(p.focusPosRef.current) < 0.6) p.overlayShownRef.current = true
    }

    // Campfire
    const flameG = 0.32 + Math.sin(st.elapsed * 7) * 0.10 + Math.sin(st.elapsed * 13) * 0.06
    p.flameMat.color.setRGB(1, flameG, 0); p.flameMesh.rotation.y = st.elapsed * 2.5; p.flameMesh.scale.y = 1 + Math.sin(st.elapsed * 9) * 0.08 + Math.sin(st.elapsed * 14) * 0.04
    p.innerFlameMesh.rotation.y = -st.elapsed * 3.5; p.innerFlameMesh.scale.y = 1 + Math.sin(st.elapsed * 11 + 1) * 0.12
    p.fireLight.intensity = 1.4 + Math.sin(st.elapsed * 7) * 0.35 + Math.sin(st.elapsed * 17) * 0.18

    // Fireflies
    p.ffData.forEach((f, i) => { _mat4.makeTranslation(f.bx + Math.sin(st.elapsed * f.sp + f.ph) * f.am, f.by + Math.sin(st.elapsed * f.sp * 1.3 + f.ph) * 0.5, f.bz + Math.cos(st.elapsed * f.sp * 0.8 + f.ph) * f.am * 0.7); p.ffMesh.setMatrixAt(i, _mat4) })
    p.ffMesh.instanceMatrix.needsUpdate = true

    // Ducks
    p.ducks.forEach(duck => {
      duck.timer -= delta
      if (duck.timer <= 0) {
        const ddx = p.pondGrp.position.x - duck.x, ddz = p.pondGrp.position.z - duck.z
        duck.angle = Math.hypot(ddx, ddz) > 4.8 ? Math.atan2(ddz, ddx) + (Math.random() - 0.5) * 0.7 : duck.angle + (Math.random() - 0.5) * Math.PI * 0.75
        duck.timer = 1.8 + Math.random() * 3.0
      }
      duck.x += Math.cos(duck.angle) * 0.7 * delta; duck.z += Math.sin(duck.angle) * 0.7 * delta
      duck.group.position.set(duck.x, DUCK_Y + Math.abs(Math.sin(st.elapsed * 5.5 + duck.phase)) * 0.022, duck.z)
      duck.group.rotation.y = Math.PI / 2 - duck.angle; duck.headG.rotation.x = Math.sin(st.elapsed * 5.5 + duck.phase) * 0.13
    })

    // Cabin door
    if (p.doorPivotRef.current) {
      const cx = p.cabGrp.position.x, cz = p.cabGrp.position.z, doorWorldZ = cz - 5.5 / 2
      const nearDoor = Math.hypot(p.player.position.x - cx, p.player.position.z - doorWorldZ) < 2.8
      p.doorOpenRef.current = nearDoor
      p.doorRotRef.current = THREE.MathUtils.lerp(p.doorRotRef.current, nearDoor ? -Math.PI * 0.72 : 0, delta * 4)
      p.doorPivotRef.current.rotation.y = p.doorRotRef.current
    }

    // Debug
    if (p.debugModeRef.current && p.debugPanelRef.current) {
      const pos = p.player.position
      const bones = p.playerBonesRef.current
      const f = (n: number) => (n / Math.PI * 180).toFixed(1) + '°'
      p.debugPanelRef.current.textContent = [
        '=== DEBUG (` to close) ===',
        `Player: (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)})  yaw: ${((st.camYaw * 180 / Math.PI) % 360).toFixed(1)}°`,
        '',
        '--- Arm Bones (degrees) ---',
        bones?.lUpArm ? `lUpArm  x:${f(bones.lUpArm.rotation.x)}  y:${f(bones.lUpArm.rotation.y)}  z:${f(bones.lUpArm.rotation.z)}\n         q(${bones.lUpArm.quaternion.x.toFixed(4)}, ${bones.lUpArm.quaternion.y.toFixed(4)}, ${bones.lUpArm.quaternion.z.toFixed(4)}, ${bones.lUpArm.quaternion.w.toFixed(4)})` : 'lUpArm: not found',
        bones?.rUpArm ? `rUpArm  x:${f(bones.rUpArm.rotation.x)}  y:${f(bones.rUpArm.rotation.y)}  z:${f(bones.rUpArm.rotation.z)}\n         q(${bones.rUpArm.quaternion.x.toFixed(4)}, ${bones.rUpArm.quaternion.y.toFixed(4)}, ${bones.rUpArm.quaternion.z.toFixed(4)}, ${bones.rUpArm.quaternion.w.toFixed(4)})` : 'rUpArm: not found',
        '',
        '--- Leg Bones (degrees) ---',
        bones?.lUpLeg ? `lUpLeg  x:${f(bones.lUpLeg.rotation.x)}  y:${f(bones.lUpLeg.rotation.y)}  z:${f(bones.lUpLeg.rotation.z)}` : 'lUpLeg: not found',
        bones?.rUpLeg ? `rUpLeg  x:${f(bones.rUpLeg.rotation.x)}  y:${f(bones.rUpLeg.rotation.y)}  z:${f(bones.rUpLeg.rotation.z)}` : 'rUpLeg: not found',
        bones?.lLoLeg ? `lLoLeg  x:${f(bones.lLoLeg.rotation.x)}  y:${f(bones.lLoLeg.rotation.y)}  z:${f(bones.lLoLeg.rotation.z)}` : 'lLoLeg: not found',
        bones?.rLoLeg ? `rLoLeg  x:${f(bones.rLoLeg.rotation.x)}  y:${f(bones.rLoLeg.rotation.y)}  z:${f(bones.rLoLeg.rotation.z)}` : 'rLoLeg: not found',
      ].join('\n')
    }

    p.renderer.render(p.scene, p.camera)

    if (p.debugModeRef.current) {
      p.renderer.getSize(_gizmoSz)
      const GS = 90
      // Place gizmo to the right of the info panel (left-4 + panelWidth + 8px gap, bottom-4)
      const panelW = p.debugPanelRef.current?.offsetWidth ?? 0
      const GX = 16 + panelW + 8
      const GY = 16
      gizmoAxes.quaternion.copy(p.camera.quaternion).invert()
      p.renderer.autoClear = false
      p.renderer.setViewport(GX, GY, GS, GS)
      p.renderer.setScissor(GX, GY, GS, GS)
      p.renderer.setScissorTest(true)
      p.renderer.clearDepth()
      p.renderer.render(gizmoScene, gizmoCam)
      p.renderer.setScissorTest(false)
      p.renderer.setViewport(0, 0, _gizmoSz.x, _gizmoSz.y)
      p.renderer.autoClear = true
    }
  }

  const loop = {
    start: () => { animate() },
    stop:  () => { cancelAnimationFrame(animId) },
  };
  (loop as any).__animState = st
  return loop
}
