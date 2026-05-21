import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { lerpAngle } from '../helpers'
import { DuckData } from '../types'
import {
  BOWL_CX, BOWL_START_Z, BOWL_PINS_Z,
  RTOSS_CX, RTOSS_START_Z, RTOSS_POST_Z, RTOSS_PROX, RTOSS_RINGS,
  TRAMP_CX, TRAMP_CZ, TRAMP_R, TRAMP_Y,
  LADDER_X, LADDER_Z, LADDER_PROX,
  BENCH_POSITIONS, BENCH_PROX,
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
  BED_LOCAL_POS: THREE.Vector3
  BED_PROX: number
  // Input
  keys: Set<string>
  touchMoveRef: React.MutableRefObject<{ x: number; y: number }>
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
  sleepStateRef:    React.MutableRefObject<'awake' | 'closing' | 'opening'>
  sleepFadeRef:     React.MutableRefObject<number>
  sleepOverlayRef:  React.MutableRefObject<HTMLDivElement | null>
  isNightRef:       React.MutableRefObject<boolean>
  dayEnvRef:        React.MutableRefObject<THREE.Texture | null>
  nightEnvRef:      React.MutableRefObject<THREE.Texture | null>
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
  nearBedRef:       React.MutableRefObject<boolean>
  nearLadderRef:    React.MutableRefObject<boolean>
  nearRadioRef:     React.MutableRefObject<boolean>
  radioGroupRef:    React.MutableRefObject<THREE.Group | null>
  focusPosRef:      React.MutableRefObject<THREE.Vector3>
  focusLookRef:     React.MutableRefObject<THREE.Vector3>
  movablesRef:      React.MutableRefObject<{ name: string; group: THREE.Group; meshes?: THREE.Object3D[]; scaleObj?: THREE.Object3D; isHitbox?: boolean }[]>
  debugModeRef:     React.MutableRefObject<boolean>
  debugPanelRef:    React.MutableRefObject<HTMLPreElement | null>
  // React state setters
  setIsNight:       (v: boolean) => void
  setNearBowl:      (v: boolean) => void
  setNearRToss:     (v: boolean) => void
  setNearBench:     (v: boolean) => void
  setNearChair:     (v: boolean) => void
  setNearBed:       (v: boolean) => void
  setNearLadder:    (v: boolean) => void
  setNearSwitch:    (v: boolean) => void
  setNearRadio:     (v: boolean) => void
  setClimbing:      (v: boolean) => void
  setMonitorMode:   (v: boolean) => void
  setBowlDisplay:   (fn: (p: { state: BowlState; score: number; hs: number }) => { state: BowlState; score: number; hs: number }) => void
  setRTossDisplay:  (v: { state: RTossState; thrown: number; score: number; hs: number } | ((p: { state: RTossState; thrown: number; score: number; hs: number }) => { state: RTossState; thrown: number; score: number; hs: number })) => void
}

export function createAnimateLoop(p: AnimateParams): { start: () => void; stop: () => void } {
  const PLAYER_R = 0.38, DUCK_Y = 0.13
  const _tmpCam = p.camera.clone()
  const _mat4   = new THREE.Matrix4()
  let animId: number

  const st: AnimateState = {
    camYaw: 0, camPitch: 0.3, playerVelY: 0, fpvBlend: 0,
    walkPhase: 0, swingAmt: 0, elapsed: 0, lastTime: performance.now(), nearBowl: false,
  }

  // Expose camYaw/camPitch for external writers (mouse-move handler, cinematics)
  ;(p as any).__animState = st

  function animate() {
    animId = requestAnimationFrame(animate)
    const now = performance.now()
    const delta = Math.min((now - st.lastTime) / 1000, 0.05)
    st.lastTime = now; st.elapsed += delta

    // Bone animation
    const bones = p.playerBonesRef.current
    if (bones) {
      const blend = THREE.MathUtils.lerp(p.playerWalkBlendRef.current === 1 ? 1 : 0, p.playerWalkBlendRef.current, Math.min(1, delta * 8))
      const t = st.elapsed * Math.PI * 2, sw = 0.30, kb = 0.28, as2 = 0.20
      if (bones.lUpLeg) bones.lUpLeg.rotation.x = Math.sin(t) * sw * blend
      if (bones.rUpLeg) bones.rUpLeg.rotation.x = Math.sin(t + Math.PI) * sw * blend
      if (bones.lLoLeg) bones.lLoLeg.rotation.x = Math.max(0, Math.sin(t + Math.PI * 0.5)) * kb * blend
      if (bones.rLoLeg) bones.rLoLeg.rotation.x = Math.max(0, Math.sin(t + Math.PI * 1.5)) * kb * blend
      if (bones.lUpArm) { bones.lUpArm.rotation.x = -Math.PI / 2; bones.lUpArm.rotation.y = 0; bones.lUpArm.rotation.z = -Math.sin(t + Math.PI) * as2 * blend }
      if (bones.rUpArm) { bones.rUpArm.rotation.x =  Math.PI / 2; bones.rUpArm.rotation.y = 0; bones.rUpArm.rotation.z =  Math.sin(t) * as2 * blend }
      if (bones.spine)  bones.spine.rotation.x = Math.sin(st.elapsed * Math.PI) * 0.015
    }

    // Go Outside / Use Computer cinematics
    if (p.goOutsideRef.current) {
      p.goOutsideRef.current = false; p.player.position.set(-4.0, 2.1, 14.0); st.playerVelY = 0; st.camYaw = 1.5
      const cs = p.cinematicRef.current; cs.active = true; cs.t = 0; cs.duration = 2.8
      cs.fromPos.copy(p.cabGrp.localToWorld(new THREE.Vector3(p.CHAIR_LOCAL_POS.x, p.CHAIR_LOCAL_POS.y + 1.15, p.CHAIR_LOCAL_POS.z)))
      cs.fromLook.copy(p.cabGrp.localToWorld(p.MONITOR_LOCAL_POS.clone()))
      cs.toPos.set(-4.0, 2.1 + 1.65, 14.0); cs.toLook.set(-7.5, 3.2, 14.5); cs.onDone = null
      p.camera.position.copy(cs.fromPos); p.camera.lookAt(cs.fromLook)
    }
    if (p.goToComputerRef.current) {
      p.goToComputerRef.current = false
      const cs = p.cinematicRef.current; cs.active = true; cs.t = 0; cs.duration = 2.0
      cs.fromPos.set(p.player.position.x, p.player.position.y + 1.65, p.player.position.z)
      cs.fromLook.set(p.player.position.x - Math.sin(st.camYaw) * 8, p.player.position.y + 1.65 + Math.sin(st.camPitch) * 3, p.player.position.z - Math.cos(st.camYaw) * 8)
      cs.toPos.copy(p.cabGrp.localToWorld(new THREE.Vector3(p.CHAIR_LOCAL_POS.x, p.CHAIR_LOCAL_POS.y + 1.15, p.CHAIR_LOCAL_POS.z)))
      cs.toLook.copy(p.cabGrp.localToWorld(p.MONITOR_LOCAL_POS.clone()))
      cs.onDone = () => { document.exitPointerLock(); p.setMonitorMode(true) }
    }

    p.physWorld.step(1 / 60, delta, 3)

    // Sync physics meshes
    p.balls.forEach(b => { b.mesh.position.set(b.body.position.x, b.body.position.y, b.body.position.z); b.mesh.quaternion.set(b.body.quaternion.x, b.body.quaternion.y, b.body.quaternion.z, b.body.quaternion.w) })
    p.bowlBallMesh.position.set(p.bowlBallBody.position.x, p.bowlBallBody.position.y, p.bowlBallBody.position.z)
    p.bowlBallMesh.quaternion.set(p.bowlBallBody.quaternion.x, p.bowlBallBody.quaternion.y, p.bowlBallBody.quaternion.z, p.bowlBallBody.quaternion.w)
    p.pinMeshes.forEach((m, i) => { m.position.set(p.pinBodies[i].position.x, p.pinBodies[i].position.y, p.pinBodies[i].position.z); m.quaternion.set(p.pinBodies[i].quaternion.x, p.pinBodies[i].quaternion.y, p.pinBodies[i].quaternion.z, p.pinBodies[i].quaternion.w) })
    p.ringMeshes.forEach((m, i) => { if (m.visible) { m.position.set(p.ringBodies[i].position.x, p.ringBodies[i].position.y, p.ringBodies[i].position.z); m.quaternion.set(p.ringBodies[i].quaternion.x, p.ringBodies[i].quaternion.y, p.ringBodies[i].quaternion.z, p.ringBodies[i].quaternion.w) } })

    p.player.visible = !p.focusActiveRef.current && p.bowlStateRef.current === 'idle' && p.rtossStateRef.current === 'idle'

    // Sleep fade
    if (p.sleepStateRef.current !== 'awake') {
      const SPEED = 0.55
      if (p.sleepStateRef.current === 'closing') {
        p.sleepFadeRef.current = Math.min(p.sleepFadeRef.current + delta / SPEED, 1)
        if (p.sleepFadeRef.current >= 1) {
          p.isNightRef.current = !p.isNightRef.current; p.setIsNight(p.isNightRef.current)
          const nextEnv = p.isNightRef.current ? p.nightEnvRef.current : p.dayEnvRef.current
          if (nextEnv) { p.scene.background = nextEnv; if (!p.inCabinPrevRef.current) p.scene.environment = nextEnv }
          p.sleepStateRef.current = 'opening'
        }
      } else {
        p.sleepFadeRef.current = Math.max(p.sleepFadeRef.current - delta / SPEED, 0)
        if (p.sleepFadeRef.current <= 0) p.sleepStateRef.current = 'awake'
      }
      if (p.sleepOverlayRef.current) p.sleepOverlayRef.current.style.opacity = String(p.sleepFadeRef.current)
    }

    // Cinematic
    if (p.cinematicRef.current.active) {
      const cs = p.cinematicRef.current; cs.t = Math.min(cs.t + delta / cs.duration, 1)
      const e3 = cs.t < 0.5 ? 4 * cs.t * cs.t * cs.t : 1 - Math.pow(-2 * cs.t + 2, 3) / 2
      p.camera.position.lerpVectors(cs.fromPos, cs.toPos, e3); p.camera.lookAt(new THREE.Vector3().lerpVectors(cs.fromLook, cs.toLook, e3))
      p.player.visible = false
      if (cs.t >= 1) { cs.active = false; const fwd = new THREE.Vector3(); p.camera.getWorldDirection(fwd); st.camYaw = Math.atan2(-fwd.x, -fwd.z); cs.onDone?.() }
    } else if (!p.focusActiveRef.current) {
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
      if (isMoving && p.bowlStateRef.current === 'idle' && p.rtossStateRef.current === 'idle' && !p.sittingRef.current) { rawVel.normalize().multiplyScalar(8.5 * delta); p.player.position.x += rawVel.x; p.player.position.z += rawVel.z }
      p.player.rotation.y = lerpAngle(p.player.rotation.y, st.camYaw + Math.PI, 0.14)
      p.player.position.x = THREE.MathUtils.clamp(p.player.position.x, -77, 77)
      p.player.position.z = THREE.MathUtils.clamp(p.player.position.z, -94, 20)

      // Jump / gravity
      if (p.bowlStateRef.current === 'idle' && p.rtossStateRef.current === 'idle' && !p.sittingRef.current && !p.climbingRef.current) {
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
        (px > -56.90 && px < -50.90 && pz > -59.00 && pz < -51.40)    // Slant store
      )
      st.fpvBlend = THREE.MathUtils.lerp(st.fpvBlend, (inCabinOrBalcony || inStore) ? 1 : 0, delta * 5)
      if (inCabin !== p.inCabinPrevRef.current) { p.inCabinPrevRef.current = inCabin; p.scene.environment = inCabin ? null : (p.isNightRef.current ? p.nightEnvRef.current : p.dayEnvRef.current) }
      const tgtAmbient = inCabin ? 0.06 : (p.isNightRef.current ? 0.12 : 1.2)
      const tgtSun     = inCabin ? 0.0  : (p.isNightRef.current ? 0.04 : 1.4)
      const tgtExp     = inCabin ? 0.65 : (p.isNightRef.current ? 0.32 : 0.65)
      if (p.ambientLightRef.current) p.ambientLightRef.current.intensity = THREE.MathUtils.lerp(p.ambientLightRef.current.intensity, tgtAmbient, delta * 3)
      if (p.sunLightRef.current)     p.sunLightRef.current.intensity     = THREE.MathUtils.lerp(p.sunLightRef.current.intensity,     tgtSun,     delta * 3)
      p.renderer.toneMappingExposure = THREE.MathUtils.lerp(p.renderer.toneMappingExposure, tgtExp, delta * 3)
      p.player.visible = st.fpvBlend < 0.5
      const HEAD_H = 1.65, camDist = 5.2
      st.camPitch = Math.max(st.camPitch, Math.asin(Math.max(-1, (0.3 - p.player.position.y - 1.2) / camDist)))
      const tpTarget = new THREE.Vector3(p.player.position.x + Math.sin(st.camYaw) * Math.cos(st.camPitch) * camDist, p.player.position.y + Math.sin(st.camPitch) * camDist + 1.2, p.player.position.z + Math.cos(st.camYaw) * Math.cos(st.camPitch) * camDist)
      const fpTarget = new THREE.Vector3(p.player.position.x, p.player.position.y + HEAD_H, p.player.position.z)
      p.camera.position.lerp(tpTarget.lerp(fpTarget, st.fpvBlend), st.fpvBlend > 0.5 ? 0.25 : 0.15)
      if (st.fpvBlend < 0.8) { p.camera.lookAt(p.player.position.x, p.player.position.y + 1.0, p.player.position.z) }
      else { const invP = -st.camPitch, cosP = Math.cos(invP); p.camera.lookAt(p.player.position.x - Math.sin(st.camYaw) * cosP * 10, p.player.position.y + HEAD_H + Math.sin(invP) * 10, p.player.position.z - Math.cos(st.camYaw) * cosP * 10) }
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
      if (!p.sittingRef.current) {
        let nearB = false
        BENCH_POSITIONS.forEach((b, i) => { if (Math.hypot(p.player.position.x - b.x, p.player.position.z - b.z) < BENCH_PROX) { nearB = true; p.seatIdxRef.current = i } })
        const chairWorld = p.CHAIR_LOCAL_POS.clone(); p.cabGrp.localToWorld(chairWorld)
        const nearC = Math.hypot(p.player.position.x - chairWorld.x, p.player.position.z - chairWorld.z) < p.CHAIR_PROX
        if (nearB !== p.nearBenchRef.current) { p.nearBenchRef.current = nearB; p.setNearBench(nearB) }
        if (nearC !== p.nearChairRef.current) { p.nearChairRef.current = nearC; p.setNearChair(nearC) }
        const bedWorld = p.BED_LOCAL_POS.clone(); p.cabGrp.localToWorld(bedWorld)
        const nearBedVal = Math.hypot(p.player.position.x - bedWorld.x, p.player.position.z - bedWorld.z) < p.BED_PROX
        if (nearBedVal !== p.nearBedRef.current) { p.nearBedRef.current = nearBedVal; p.setNearBed(nearBedVal) }
        if (p.radioGroupRef.current) {
          const rw = new THREE.Vector3(); p.radioGroupRef.current.getWorldPosition(rw)
          const nrv = Math.hypot(p.player.position.x - rw.x, p.player.position.z - rw.z) < p.RADIO_PROX
          if (nrv !== p.nearRadioRef.current) { p.nearRadioRef.current = nrv; p.setNearRadio(nrv) }
        }
      } else if (p.sittingAtRef.current === 'bench') {
        const s = BENCH_POSITIONS[p.seatIdxRef.current]
        p.player.position.set(s.x, -0.46, s.z); p.player.rotation.y = Math.atan2(p.FIRE_POS.x - s.x, p.FIRE_POS.z - s.z)
        p.lLegPivot.rotation.x = -Math.PI / 2.8; p.rLegPivot.rotation.x = -Math.PI / 2.8; p.lKnee.rotation.x = Math.PI / 2.0; p.rKnee.rotation.x = Math.PI / 2.0; p.lArmPivot.rotation.x = 0.1; p.rArmPivot.rotation.x = 0.1
        p.camera.position.lerp(new THREE.Vector3(s.x - (p.FIRE_POS.x - s.x) * 0.5, 1.8, s.z - (p.FIRE_POS.z - s.z) * 0.5), 0.07); p.camera.lookAt(new THREE.Vector3(p.FIRE_POS.x, 0.7, p.FIRE_POS.z))
      } else if (p.sittingAtRef.current === 'chair') {
        const chairWorld = p.CHAIR_LOCAL_POS.clone(); p.cabGrp.localToWorld(chairWorld)
        const monitorWorld = p.MONITOR_LOCAL_POS.clone(); p.cabGrp.localToWorld(monitorWorld)
        p.player.position.set(chairWorld.x + 0.075, chairWorld.y - 0.15, chairWorld.z); p.player.rotation.y = Math.atan2(monitorWorld.x - chairWorld.x, monitorWorld.z - chairWorld.z)
        p.lLegPivot.rotation.x = -Math.PI / 2.8; p.rLegPivot.rotation.x = -Math.PI / 2.8; p.lKnee.rotation.x = Math.PI / 2.0; p.rKnee.rotation.x = Math.PI / 2.0; p.lArmPivot.rotation.x = 0.25; p.rArmPivot.rotation.x = 0.25
        const chairHead = chairWorld.clone(); chairHead.y += 1.15; p.camera.position.lerp(chairHead, 0.15); p.camera.lookAt(monitorWorld)
      }

      // Ladder
      if (!p.climbingRef.current) {
        const nearL = Math.hypot(p.player.position.x - LADDER_X, p.player.position.z - LADDER_Z) < LADDER_PROX && p.bowlStateRef.current === 'idle' && p.rtossStateRef.current === 'idle' && !p.sittingRef.current
        if (nearL !== p.nearLadderRef.current) { p.nearLadderRef.current = nearL; p.setNearLadder(nearL) }
      } else {
        p.player.position.x = THREE.MathUtils.lerp(p.player.position.x, LADDER_X, 0.2); p.player.position.z = THREE.MathUtils.lerp(p.player.position.z, LADDER_Z, 0.2); st.playerVelY = 0
        if (p.keys.has('w')) p.player.position.y = Math.min(TRAMP_Y + 0.1, p.player.position.y + 3.0 * delta)
        if (p.keys.has('s')) p.player.position.y = Math.max(0, p.player.position.y - 3.0 * delta)
        if (p.player.position.y >= TRAMP_Y) { p.climbingRef.current = false; p.setClimbing(false); p.player.position.x = TRAMP_CX; p.player.position.z = TRAMP_CZ }
        if (p.player.position.y <= 0) { p.climbingRef.current = false; p.setClimbing(false) }
      }

      // Collision
      if (!p.sittingRef.current && !p.climbingRef.current) {
        const PR = PLAYER_R
        p.cylCols.forEach(c => {
          if (c.maxY !== undefined && p.player.position.y >= c.maxY) return
          const dx = p.player.position.x - c.x, dz = p.player.position.z - c.z, dist = Math.sqrt(dx * dx + dz * dz), minD = PR + c.r
          if (dist < minD && dist > 0.001) { const nx = dx / dist, nz = dz / dist; p.player.position.x = c.x + nx * minD; p.player.position.z = c.z + nz * minD }
        })
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
          p.bowlPowerRef.current += delta * p.bowlPowerDirRef.current * 1.4
          if (p.bowlPowerRef.current >= 1) { p.bowlPowerRef.current = 1; p.bowlPowerDirRef.current = -1 } if (p.bowlPowerRef.current <= 0) { p.bowlPowerRef.current = 0; p.bowlPowerDirRef.current = 1 }
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
      p.debugPanelRef.current.textContent = [
        '=== DEBUG (` to close) ===',
        `Player: (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)})  yaw: ${((st.camYaw * 180 / Math.PI) % 360).toFixed(1)}°`,
      ].join('\n')
    }

    p.renderer.render(p.scene, p.camera)
  }

  const loop = {
    start: () => { animate() },
    stop:  () => { cancelAnimationFrame(animId) },
  };
  (loop as any).__animState = st
  return loop
}
