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

  // 3-step toon gradient: shadow / mid-tone / highlight
  const gradData = new Uint8Array([0, 90, 255])
  const gradTex  = new THREE.DataTexture(gradData, 3, 1, THREE.RedFormat)
  gradTex.needsUpdate = true
  gradTex.minFilter = gradTex.magFilter = THREE.NearestFilter

  const outlineMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide })

  const loader = new GLTFLoader()
  loader.load('/assets/outdoor/car/Car.glb', gltf => {
    const model = gltf.scene
    model.scale.setScalar(1.1)
    model.updateMatrixWorld(true)
    const bbox = new THREE.Box3().setFromObject(model)
    model.position.y -= bbox.min.y

    model.traverse(c => {
      const mesh = c as THREE.Mesh
      if (!mesh.isMesh) return
      mesh.castShadow = true; mesh.receiveShadow = true
      const src = mesh.material as THREE.MeshStandardMaterial
      mesh.material = new THREE.MeshToonMaterial({
        color:       src.color   ?? new THREE.Color(0xffffff),
        map:         src.map     ?? null,
        gradientMap: gradTex,
      })
      // Backface outline — child inherits transform so scale pushes faces outward
      const outline = new THREE.Mesh(mesh.geometry, outlineMat)
      outline.scale.setScalar(1.05)
      mesh.add(outline)
    })

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
