import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import {
  RTOSS_CX, RTOSS_START_Z, RTOSS_POST_Z,
  RTOSS_RING_R, RTOSS_RING_TUBE, RTOSS_RINGS,
  RTOSS_POST_H, RTOSS_POST_R,
} from '../constants'

export interface RingTossResult {
  rtossMeshes:   THREE.Object3D[]
  ringMeshes:    THREE.Mesh[]
  ringBodies:    CANNON.Body[]
  resetRingToss: () => void
  throwRing:     (ringIdx: number, aim: number, power: number) => void
  countRingers:  () => number
}

export function createRingToss(
  scene: THREE.Scene,
  physWorld: CANNON.World,
  rtossAimRef: React.MutableRefObject<number>,
  rPowerRef: React.MutableRefObject<number>,
): RingTossResult {
  const rtossMeshes: THREE.Object3D[] = []

  // Ground platform
  const rtossPlatMesh = new THREE.Mesh(
    new THREE.BoxGeometry(3.0, 0.06, 14.0),
    new THREE.MeshPhongMaterial({ color: 0xc8a050, shininess: 20 })
  )
  rtossPlatMesh.position.set(RTOSS_CX, 0.03, (RTOSS_START_Z + RTOSS_POST_Z) / 2)
  rtossPlatMesh.receiveShadow = true; scene.add(rtossPlatMesh); rtossMeshes.push(rtossPlatMesh)
  // Physics for platform
  const rtossPlatBody = new CANNON.Body({ mass: 0 })
  rtossPlatBody.addShape(new CANNON.Box(new CANNON.Vec3(1.5, 0.03, 7.0)))
  rtossPlatBody.position.set(RTOSS_CX, 0.03, (RTOSS_START_Z + RTOSS_POST_Z) / 2)
  physWorld.addBody(rtossPlatBody)

  // Post / pole
  const rtossPostMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(RTOSS_POST_R, RTOSS_POST_R * 1.3, RTOSS_POST_H, 10),
    new THREE.MeshLambertMaterial({ color: 0x5a3010 })
  )
  rtossPostMesh.position.set(RTOSS_CX, RTOSS_POST_H / 2, RTOSS_POST_Z)
  rtossPostMesh.castShadow = true; scene.add(rtossPostMesh); rtossMeshes.push(rtossPostMesh)
  // Post physics body
  const rtossPostBody = new CANNON.Body({ mass: 0 })
  rtossPostBody.addShape(new CANNON.Cylinder(RTOSS_POST_R, RTOSS_POST_R, RTOSS_POST_H, 8))
  rtossPostBody.position.set(RTOSS_CX, RTOSS_POST_H / 2, RTOSS_POST_Z)
  physWorld.addBody(rtossPostBody)

  // 3 rings (torus visual, compound sphere physics)
  const RING_COLORS = [0xff3333, 0x3388ff, 0xffcc00]
  const ringMeshes: THREE.Mesh[] = []
  const ringBodies: CANNON.Body[] = []
  for (let ri = 0; ri < RTOSS_RINGS; ri++) {
    const m = new THREE.Mesh(
      new THREE.TorusGeometry(RTOSS_RING_R, RTOSS_RING_TUBE, 10, 28),
      new THREE.MeshPhongMaterial({ color: RING_COLORS[ri], shininess: 60 })
    )
    m.castShadow = true; m.visible = false; scene.add(m); ringMeshes.push(m); rtossMeshes.push(m)
    const rb = new CANNON.Body({ mass: 0.08, linearDamping: 0.15, angularDamping: 0.5 })
    for (let si = 0; si < 8; si++) {
      const a = (si / 8) * Math.PI * 2
      rb.addShape(
        new CANNON.Sphere(RTOSS_RING_TUBE),
        new CANNON.Vec3(Math.cos(a) * RTOSS_RING_R, 0, Math.sin(a) * RTOSS_RING_R)
      )
    }
    rb.sleep()
    physWorld.addBody(rb); ringBodies.push(rb)
  }

  // Ring toss helpers
  function resetRingToss() {
    ringMeshes.forEach((m, i) => {
      m.visible = false
      ringBodies[i].position.set(RTOSS_CX - 0.5 + i * 0.5, 0.5 + i * 0.12, RTOSS_START_Z + 0.5)
      ringBodies[i].velocity.setZero(); ringBodies[i].angularVelocity.setZero()
      ringBodies[i].quaternion.set(0, 0, 0, 1); ringBodies[i].sleep()
    })
    rtossAimRef.current   = 0
    rPowerRef.current     = 0
  }
  function throwRing(ringIdx: number, aim: number, power: number) {
    const spd = 7 + power * 9
    ringBodies[ringIdx].position.set(RTOSS_CX + Math.sin(aim) * 0.3, 1.3, RTOSS_START_Z - 0.3)
    ringBodies[ringIdx].velocity.set(Math.sin(aim) * spd * 0.3, 5.0, -spd)
    // Orient ring for flight — flat/horizontal initially
    ringBodies[ringIdx].quaternion.setFromEuler(Math.PI / 2, 0, 0)
    ringBodies[ringIdx].wakeUp()
    ringMeshes[ringIdx].visible = true
  }
  function countRingers() {
    let ringers = 0
    ringBodies.forEach(rb => {
      const dx = rb.position.x - RTOSS_CX
      const dz = rb.position.z - RTOSS_POST_Z
      const dist = Math.sqrt(dx * dx + dz * dz)
      if (dist < RTOSS_RING_R + 0.08 && rb.position.y < RTOSS_POST_H + 0.1) ringers++
    })
    return ringers
  }

  return {
    rtossMeshes, ringMeshes, ringBodies,
    resetRingToss, throwRing, countRingers,
  }
}
