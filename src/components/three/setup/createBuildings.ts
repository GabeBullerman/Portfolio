import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { BoxCol, Movable } from '../types'

export function createBuildings(
  scene: THREE.Scene,
  boxCols: BoxCol[],
  movables: Movable[],
  swBaseTex: THREE.CanvasTexture,
  TILE: number,
  CABIN_X: number,
) {
  const gltfLoader = new GLTFLoader()

  // Ground a building so its lowest mesh vertex sits at y=0
  function groundBldg(bldg: THREE.Object3D) {
    const box = new THREE.Box3().setFromObject(bldg)
    if (box.min.y < 0) bldg.position.y -= box.min.y
  }

  // Duo building — first 2 projects on Project Blvd (west side, facing east)
  gltfLoader.load('/assets/outdoor/buildings/duo/scene.gltf', gltf => {
    const bldg = gltf.scene
    bldg.traverse(child => {
      if ((child as THREE.Mesh).isMesh) { child.castShadow = true; child.receiveShadow = true }
    })
    bldg.scale.setScalar(1.1)
    bldg.position.set(-51.00, 0.01, -15.00)
    bldg.rotation.y = -Math.PI / 2
    groundBldg(bldg)
    scene.add(bldg)
    movables.push({ name: '🏢 Project Blvd 1-2', group: bldg as unknown as THREE.Group, scaleObj: bldg })
  }, undefined, err => console.error('[buildings] duo failed:', err))

  // Orange store — Project Blvd, west side
  gltfLoader.load('/assets/outdoor/buildings/orange store/scene.gltf', gltf => {
    const bldg = gltf.scene
    bldg.traverse(child => {
      if ((child as THREE.Mesh).isMesh) { child.castShadow = true; child.receiveShadow = true }
    })
    bldg.scale.setScalar(0.10)
    bldg.position.set(-53.50, 0.00, -35.50)
    bldg.rotation.y = -Math.PI / 2
    groundBldg(bldg)
    scene.add(bldg)
    movables.push({ name: '🏪 Orange Store (Blvd)', group: bldg as unknown as THREE.Group, scaleObj: bldg })
  }, undefined, err => console.error('[buildings] orange store failed:', err))

  // Purple store — Project Blvd, west side
  gltfLoader.load('/assets/outdoor/buildings/purple store/scene.gltf', gltf => {
    const bldg = gltf.scene
    bldg.traverse(child => {
      if ((child as THREE.Mesh).isMesh) { child.castShadow = true; child.receiveShadow = true }
    })
    bldg.scale.setScalar(0.015)
    bldg.position.set(-53.00, 1.50, -55.00)
    bldg.rotation.y = -Math.PI / 2
    groundBldg(bldg)
    scene.add(bldg)
    movables.push({ name: '🏪 Purple Store (Blvd)', group: bldg as unknown as THREE.Group, scaleObj: bldg })
  }, undefined, err => console.error('[buildings] purple store failed:', err))

  // Other houses — connector road, east of driveway, near cabin
  gltfLoader.load('/assets/outdoor/buildings/other houses/Untitled.glb', gltf => {
    const bldg = gltf.scene
    bldg.traverse(child => {
      if ((child as THREE.Mesh).isMesh) { child.castShadow = true; child.receiveShadow = true }
    })
    bldg.scale.setScalar(2.0)
    bldg.rotation.y = Math.PI / 2   // face south toward the connector road
    // Measure at origin to get half-extents, then position so edges align exactly
    scene.add(bldg)
    const hbb0 = new THREE.Box3().setFromObject(bldg)
    bldg.position.set(
      24.10,
      -hbb0.min.y + 0.04,
      19.6
    )
    const hbb = new THREE.Box3().setFromObject(bldg)
    // Split collision around the cabin gap — two boxes, one per house group
    const gapHalf = 7   // half-width of the gap the user left for the cabin (~14 units)
    boxCols.push({ x0: hbb.min.x,            x1: CABIN_X - gapHalf, z0: hbb.min.z, z1: hbb.max.z, maxY: hbb.max.y })
    boxCols.push({ x0: CABIN_X + gapHalf,    x1: hbb.max.x,         z0: hbb.min.z, z1: hbb.max.z, maxY: hbb.max.y })
    movables.push({ name: '🏘️ Other Houses', group: bldg as unknown as THREE.Group, scaleObj: bldg })

    // Stone paths — one per house. PlaneGeometry(1,1) so group.scale = (width, 1, length).
    // Texture cloned from swBaseTex so they match the sidewalk slab appearance.
    const pathDefs = [
      { name: '🪨 Stone Path 1', x: -28.56, z: 5.80, w: 1.8, l:  8.6 },
      { name: '🪨 Stone Path 2', x: -16.31, z: 5.60, w: 1.8, l:  8.2 },
      { name: '🪨 Stone Path 3', x:  18.09, z: 5.80, w: 1.8, l:  8.6 },
      { name: '🪨 Stone Path 4', x:  29.04, z: 6.80, w: 1.8, l: 10.6 },
      { name: '🪨 Stone Path 5', x:  35.44, z: 5.60, w: 1.8, l:  8.2 },
    ]
    pathDefs.forEach(({ name, x, z, w, l }) => {
      const tex = swBaseTex.clone()
      tex.needsUpdate = true
      tex.repeat.set(Math.max(1, w / TILE), Math.max(1, l / TILE))
      const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, metalness: 0 })
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat)
      mesh.rotation.x = -Math.PI / 2
      mesh.receiveShadow = true
      const grp = new THREE.Group()
      grp.position.set(x, 0.03, z)
      grp.scale.set(w, 1, l)
      grp.add(mesh)
      scene.add(grp)
      movables.push({ name, group: grp, scaleObj: grp })
    })
  }, undefined, err => console.error('[buildings] other houses failed:', err))

  // Single building — About Me (near campfire, in park)
  gltfLoader.load('/assets/outdoor/buildings/scene.gltf', gltf => {
    const bldg = gltf.scene
    bldg.traverse(child => {
      if ((child as THREE.Mesh).isMesh) { child.castShadow = true; child.receiveShadow = true }
    })
    bldg.scale.setScalar(1.0)
    bldg.position.set(20, 0, -8)
    bldg.rotation.y = Math.PI
    groundBldg(bldg)
    scene.add(bldg)
    movables.push({ name: '🏢 About Me', group: bldg as unknown as THREE.Group, scaleObj: bldg })
  }, undefined, err => console.error('[buildings] single failed:', err))

  // Parked car in driveway (centre x=6, driveway z=-1..11.5)
  gltfLoader.load('/assets/outdoor/car/scene.gltf', gltf => {
    const car = gltf.scene
    car.traverse(child => {
      if ((child as THREE.Mesh).isMesh) { child.castShadow = true; child.receiveShadow = true }
    })
    car.rotation.y = Math.PI / 2
    car.scale.setScalar(1.0)
    const carBox = new THREE.Box3().setFromObject(car)
    car.position.set(6, -carBox.min.y + 0.04, 3)
    scene.add(car)
    movables.push({ name: '🚗 Car (driveway)', group: car as unknown as THREE.Group, scaleObj: car })
  }, undefined, err => console.error('[car] failed:', err))

  // Street sign — near campfire, position tunable via debug editor
  gltfLoader.load('/assets/outdoor/street sign/Untitled.glb', gltf => {
    const sign = gltf.scene
    sign.traverse(child => {
      if ((child as THREE.Mesh).isMesh) { child.castShadow = true; child.receiveShadow = true }
    })
    sign.position.set(-5.0, 0, -9)
    sign.scale.set(2, 2, 2)
    scene.add(sign)
    movables.push({ name: '🪧 Street sign', group: sign as unknown as THREE.Group, scaleObj: sign })
  }, undefined, err => console.error('[outdoor] street sign failed:', err))
}
