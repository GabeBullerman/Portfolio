import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { CylCol } from '../types'
import { CAR_X, CAR_Y, CAR_Z } from '../constants'

export const CAR_COL_R = 1.8   // collision radius while driving

export function createCar(scene: THREE.Scene, cylCols: CylCol[]): { carGrp: THREE.Group; carCol: CylCol; carHitboxGrp: THREE.Group } {
  const carGrp = new THREE.Group()
  carGrp.position.set(CAR_X, CAR_Y, CAR_Z)
  scene.add(carGrp)

  // CylCol — position is updated every frame from carHitboxGrp world position
  const carCol: CylCol = { x: CAR_X, z: CAR_Z, r: CAR_COL_R }
  cylCols.push(carCol)

  // Rotation (-π, π, -π) matches user-tuned orientation and resolves sideways-movement issue
  const modelGrp = new THREE.Group()
  modelGrp.rotation.set(-Math.PI, Math.PI, -Math.PI)
  carGrp.add(modelGrp)

  const loader = new GLTFLoader()
  loader.load('/assets/outdoor/car/Car.glb', gltf => {
    const model = gltf.scene
    model.traverse(c => {
      if ((c as THREE.Mesh).isMesh) { c.castShadow = true; c.receiveShadow = true }
    })
    model.scale.setScalar(1.1)          // scale before bbox so lift accounts for scaled size
    model.updateMatrixWorld(true)
    const bbox = new THREE.Box3().setFromObject(model)
    model.position.y -= bbox.min.y
    modelGrp.add(model)
  }, undefined, err => console.error('[car]', err))

  // Visible hitbox — child of carGrp so it auto-tracks position & rotation
  const carHitboxGrp = new THREE.Group()
  carGrp.add(carHitboxGrp)
  const hMesh = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 1.6, 4.5),
    new THREE.MeshBasicMaterial({ color: 0xff3333, wireframe: true }),
  )
  hMesh.position.y = 0.8   // lift so the box floor sits at carGrp origin
  hMesh.visible = false
  carHitboxGrp.add(hMesh)

  return { carGrp, carCol, carHitboxGrp }
}
