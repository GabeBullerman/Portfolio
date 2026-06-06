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

  // 3-step toon gradient via canvas — shadow / mid / highlight
  const gradCanvas = document.createElement('canvas')
  gradCanvas.width = 3; gradCanvas.height = 1
  const gradCtx = gradCanvas.getContext('2d')!
  ;([['#555', 0], ['#bbb', 1], ['#fff', 2]] as const).forEach(([col, x]) => {
    gradCtx.fillStyle = col as string; gradCtx.fillRect(x as number, 0, 1, 1)
  })
  const gradTex = new THREE.CanvasTexture(gradCanvas)
  gradTex.minFilter = gradTex.magFilter = THREE.NearestFilter

  const outlineMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide })

  const loader = new GLTFLoader()
  loader.load('/assets/outdoor/car/Car.glb', gltf => {
    const model = gltf.scene
    model.scale.setScalar(1.1)
    model.updateMatrixWorld(true)
    const bbox = new THREE.Box3().setFromObject(model)
    model.position.y -= bbox.min.y

    // Collect meshes first — adding outline children during traverse
    // causes traverse to visit them and corrupt their materials
    const carMeshes: THREE.Mesh[] = []
    model.traverse(c => {
      const mesh = c as THREE.Mesh
      if (!mesh.isMesh) return
      mesh.castShadow = true; mesh.receiveShadow = true
      const src = mesh.material as THREE.MeshStandardMaterial
      // Exporters often flag opaque body panels as transparent (opacity 1),
      // which dumps them into the depth-sorted transparent pass — that's the
      // "floor goes clear at certain angles" artifact. Treat as glass only when
      // genuinely see-through; everything else is forced opaque + double-sided.
      const isGlass = src.transparent && src.opacity < 0.95
      mesh.material = new THREE.MeshToonMaterial({
        color:       src.color ?? new THREE.Color(0xffffff),
        map:         (src as any).map ?? null,
        gradientMap: gradTex,
        transparent: isGlass,
        opacity:     isGlass ? src.opacity : 1,
        side:        isGlass ? src.side : THREE.DoubleSide,
        depthWrite:  !isGlass,
      })
      // Skip outline on glass — a thick black line around windows looks wrong
      if (!isGlass) carMeshes.push(mesh)
    })

    carMeshes.forEach(mesh => {
      const outline = new THREE.Mesh(mesh.geometry, outlineMat)
      outline.scale.setScalar(1.02)
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
