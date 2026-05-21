import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { BoxCol, Movable } from '../types'

export function createBuildings(
  scene: THREE.Scene,
  boxCols: BoxCol[],
  ceilCols: { x0: number; x1: number; z0: number; z1: number; minY: number }[],
  movables: Movable[],
  swBaseTex: THREE.CanvasTexture,
  TILE: number,
  CABIN_X: number,
) {
  const gltfLoader = new GLTFLoader()
  void CABIN_X

  // Ground a building so its lowest mesh vertex sits at y=0
  function groundBldg(bldg: THREE.Object3D) {
    const box = new THREE.Box3().setFromObject(bldg)
    if (box.min.y < 0) bldg.position.y -= box.min.y
  }

  // Visible box hitbox — semi-transparent, positionable via debug editor.
  // Set opacity to 0 and add boxCols entries once positions are finalised.
  const hitboxMat = new THREE.MeshBasicMaterial({
    color: 0xff4422, transparent: true, opacity: 0,
    side: THREE.DoubleSide, depthWrite: false,
  })
  const doorMat = new THREE.MeshBasicMaterial({
    color: 0x22ff66, transparent: true, opacity: 0,
    side: THREE.DoubleSide, depthWrite: false,
  })
  // collidable=true  → mesh bounding box used for collision (house hitboxes, not yet converted to boxCols)
  // collidable=false → visual/debug only; collision handled by boxCols instead
  function addVisibleHitbox(name: string, px: number, py: number, pz: number, w: number, h: number, d: number, sx = 1, sy = 1, sz = 1, mat = hitboxMat, collidable = false, ry = 0, rx = 0, rz = 0) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
    mesh.position.set(px, py, pz)
    mesh.scale.set(sx, sy, sz)
    mesh.rotation.set(rx, ry, rz)
    scene.add(mesh)
    const grp = new THREE.Group()
    grp.position.set(px, py, pz)
    grp.rotation.set(rx, ry, rz)
    scene.add(grp)
    ;(grp as any).__hitMesh = mesh
    movables.push({ name, group: grp, isHitbox: collidable, scaleObj: collidable ? undefined : mesh })
  }
  const addDoor = (name: string, px: number, py: number, pz: number, ry = 0) =>
    addVisibleHitbox(name, px, py, pz, 3, 4, 1, 1, 1, 1, doorMat, false, ry)

  // Duo building — first 2 projects on Project Blvd (west side, facing east)
  gltfLoader.load('/assets/outdoor/buildings/duo/scene.gltf', gltf => {
    const bldg = gltf.scene
    bldg.traverse(child => {
      if ((child as THREE.Mesh).isMesh) { child.castShadow = true; child.receiveShadow = true }
    })
    bldg.scale.setScalar(1.1)
    bldg.position.set(-51.00, 0.01, -15.00)
    bldg.quaternion.setFromEuler(new THREE.Euler(0, 0, 0))
    bldg.updateMatrix()
    bldg.updateMatrixWorld(true)
    groundBldg(bldg)
    scene.add(bldg)
    movables.push({ name: '🏢 Project Blvd 1-2', group: bldg as unknown as THREE.Group, scaleObj: bldg })
    addVisibleHitbox('🟥 Duo: Store A', -53.30, 1.28, -14.90, 8, 6, 8, 0.65, 0.50, 0.65)
    addDoor('🟩 Duo: Door A', -50.60, 1.0, -13.40)
    addVisibleHitbox('🟥 Duo: Store B', -53.20, 1.50, -21.60, 8, 6, 8, 0.70, 0.50, 0.60)
    addDoor('🟩 Duo: Door B', -50.80, 1.0, -23.50)
    // Store A — hollow box, door opening on east face at z=-13.40
    // Bounds: x[-55.90,-50.70]  z[-17.50,-12.30]
    // Door opening: z[-14.20,-12.60] (door at -13.40, opening goes up to north strip inner)
    boxCols.push({ x0: -55.90, x1: -55.10, z0: -17.50, z1: -12.30, maxY: 3.0 }) // west wall
    boxCols.push({ x0: -55.90, x1: -50.70, z0: -12.60, z1: -12.30, maxY: 3.0 }) // north side strip
    boxCols.push({ x0: -55.90, x1: -50.70, z0: -17.50, z1: -17.20, maxY: 3.0 }) // south side strip
    boxCols.push({ x0: -51.20, x1: -50.70, z0: -17.20, z1: -14.20, maxY: 3.0 }) // east wall south of door
    // (no east wall north of door — door opening extends to north strip inner at -12.60)
    // Ceilings — Store A: center y=1.28, h=6*0.50=3.0, roof=1.28+1.5=2.78; Store B: 1.50+1.5=3.00
    ceilCols.push({ x0: -55.90, x1: -50.70, z0: -17.50, z1: -12.30, minY: 2.78 }) // Store A roof
    ceilCols.push({ x0: -56.00, x1: -50.40, z0: -24.00, z1: -19.20, minY: 3.00 }) // Store B roof
    // Store B — hollow box, diagonal door at SE corner (rot 45°)
    // Bounds: x[-56.00,-50.40]  z[-24.00,-19.20]
    // Door is at the SE corner — leave that corner open on both south and east faces
    boxCols.push({ x0: -56.00, x1: -55.00, z0: -24.00, z1: -19.20, maxY: 3.0 }) // west wall
    boxCols.push({ x0: -56.00, x1: -50.40, z0: -19.70, z1: -19.20, maxY: 3.0 }) // north side strip
    boxCols.push({ x0: -50.90, x1: -50.40, z0: -22.50, z1: -19.70, maxY: 3.0 }) // east wall (north of door)
    boxCols.push({ x0: -56.00, x1: -51.50, z0: -24.00, z1: -23.70, maxY: 3.0 }) // south wall (west of door corner)
  }, undefined, err => console.error('[buildings] duo failed:', err))

  // Orange store — Project Blvd, west side
  gltfLoader.load('/assets/outdoor/buildings/orange store/scene.gltf', gltf => {
    const bldg = gltf.scene
    bldg.traverse(child => {
      if ((child as THREE.Mesh).isMesh) { child.castShadow = true; child.receiveShadow = true }
    })
    bldg.scale.setScalar(0.10)
    bldg.position.set(-53.50, 0.025, -35.50)
    bldg.quaternion.setFromEuler(new THREE.Euler(0, Math.PI / 2, 0))
    bldg.updateMatrix()
    bldg.updateMatrixWorld(true)
    groundBldg(bldg)
    scene.add(bldg)
    movables.push({ name: '🏪 Orange Store (Blvd)', group: bldg as unknown as THREE.Group, scaleObj: bldg })
    addVisibleHitbox('🟥 Orange Store: Box', -53.50, 1.60, -35.50, 8, 6, 8, 0.65, 0.60, 0.90)
    addDoor('🟩 Orange Store: Door', -50.90, 1.17, -35.50)
    // Orange — hollow box, door on east face at z=-35.50 (center)
    // Bounds: x[-56.10,-50.90]  z[-39.10,-31.90]
    // Door opening: z[-36.50,-34.50] (2 units wide, centered at -35.50)
    boxCols.push({ x0: -56.10, x1: -55.10, z0: -39.10, z1: -31.90, maxY: 3.5 }) // west wall
    boxCols.push({ x0: -56.10, x1: -50.90, z0: -32.40, z1: -31.90, maxY: 3.5 }) // north side strip
    boxCols.push({ x0: -56.10, x1: -50.90, z0: -39.10, z1: -38.60, maxY: 3.5 }) // south side strip
    boxCols.push({ x0: -51.40, x1: -50.90, z0: -38.60, z1: -36.50, maxY: 3.5 }) // east wall south of door
    boxCols.push({ x0: -51.40, x1: -50.90, z0: -34.50, z1: -32.40, maxY: 3.5 }) // east wall north of door
    // Orange ceiling: center y=1.60, h=6*0.60=3.6, roof=1.60+1.8=3.40
    ceilCols.push({ x0: -56.10, x1: -50.90, z0: -39.10, z1: -31.90, minY: 3.40 })
  }, undefined, err => console.error('[buildings] orange store failed:', err))

  // Slant store — Project Blvd, west side (replaces purple store)
  gltfLoader.load('/assets/outdoor/buildings/slant store/Untitled.glb', gltf => {
    const bldg = gltf.scene
    bldg.traverse(child => {
      if ((child as THREE.Mesh).isMesh) { child.castShadow = true; child.receiveShadow = true }
    })
    bldg.scale.set(0.700, 0.800, 0.700)
    bldg.position.set(-52.70, -0.01, -53.00)
    bldg.quaternion.setFromEuler(new THREE.Euler(0, Math.PI / 2, 0))
    bldg.updateMatrix()
    bldg.updateMatrixWorld(true)
    groundBldg(bldg)
    scene.add(bldg)
    movables.push({ name: '🏪 Slant Store (Blvd)', group: bldg as unknown as THREE.Group, scaleObj: bldg })
    addVisibleHitbox('🟥 Slant Store: Box', -53.90, 1.40, -55.20, 8, 6, 8, 0.750, 0.700, 0.950)
    addVisibleHitbox('🟩 Slant Store: Door', -51.70, 1.00, -55.50, 3, 4, 1, 0.400, 0.700, 0.050, doorMat, false, 55 * Math.PI / 180, -Math.PI, -Math.PI)
    // Slant store — hollow box, door opening on east face near z=-55.50
    // Bounds: x[-56.90,-50.90]  z[-59.00,-51.40]  (hitbox center -53.90 ± 3.0, -55.20 ± 3.8)
    // Door gap: z[-56.30,-54.70]
    boxCols.push({ x0: -56.90, x1: -55.90, z0: -59.00, z1: -51.40, maxY: 3.5 }) // west wall
    boxCols.push({ x0: -56.90, x1: -50.90, z0: -51.90, z1: -51.40, maxY: 3.5 }) // north strip
    boxCols.push({ x0: -56.90, x1: -50.90, z0: -59.00, z1: -58.50, maxY: 3.5 }) // south strip
    boxCols.push({ x0: -51.40, x1: -50.90, z0: -58.50, z1: -56.30, maxY: 3.5 }) // east wall south of door
    boxCols.push({ x0: -51.40, x1: -50.90, z0: -54.70, z1: -51.90, maxY: 3.5 }) // east wall north of door
    // Slant ceiling: center y=1.40, h=6*0.700=4.2, roof=1.40+2.10=3.50
    ceilCols.push({ x0: -56.90, x1: -50.90, z0: -59.00, z1: -51.40, minY: 3.50 })
  }, undefined, err => console.error('[buildings] slant store failed:', err))

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
    movables.push({ name: '🏘️ Other Houses', group: bldg as unknown as THREE.Group, scaleObj: bldg })
    // Visible hitboxes — one per house, user positions via debug overlay then we convert to boxCols
    addVisibleHitbox('🟥 House 1', -28.60, 3.0, 13.30, 8, 6, 8, 1.20, 1.00, 0.60, hitboxMat, true)
    addVisibleHitbox('🟥 House 2', -16.30, 3.0, 13.00, 8, 6, 8, 0.80, 1.00, 0.90, hitboxMat, true)
    addVisibleHitbox('🟥 House 3',  16.50, 3.0, 13.30, 8, 6, 8, 1.10, 1.00, 0.80, hitboxMat, true)
    addVisibleHitbox('🟥 House 4',  27.00, 3.0, 13.35, 8, 6, 8, 0.90, 1.00, 0.50, hitboxMat, true)
    addVisibleHitbox('🟥 House 5',  38.70, 3.0, 12.50, 8, 6, 8, 1.15, 1.15, 1.00, hitboxMat, true)

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

  // 2-story building — Memory Lane
  gltfLoader.load('/assets/outdoor/buildings/2story/Untitled.glb', gltf => {
    const bldg = gltf.scene
    bldg.traverse(child => {
      if ((child as THREE.Mesh).isMesh) { child.castShadow = true; child.receiveShadow = true }
    })
    bldg.scale.setScalar(4.2)
    bldg.position.set(55.00, -0.40, -16.00)
    bldg.rotation.y = -Math.PI / 2
    groundBldg(bldg)
    scene.add(bldg)
    movables.push({ name: '🏠 2Story (Memory Ln)', group: bldg as unknown as THREE.Group, scaleObj: bldg })
    // Outer shell hitbox — visible red so user can align it
    const twoStoryMat = new THREE.MeshBasicMaterial({ color: 0xff4422, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false })
    addVisibleHitbox('🟥 2Story: Box', 55.00, 3.00, -16.60, 8, 6, 8, 0.700, 1.200, 0.800, twoStoryMat, false)
    addDoor('🟩 2Story: Door', 55.00, 1.00, -11.00)
  }, undefined, err => console.error('[buildings] 2story failed:', err))

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

  // Stone paths — fronts of Project Blvd stores (positions tunable via debug editor)
  const blvdPathDefs = [
    { name: '🪨 Blvd Path: Duo',    x: -48.00, z: -13.40, w: 1.800, sy: 1.000, l: 6.000, ry: Math.PI / 2 },
    { name: '🪨 Blvd Path: Duo 2',  x: -49.50, z: -22.65, w: 1.800, sy: 1.000, l: 6.000, ry: Math.PI / 2 },
    { name: '🪨 Blvd Path: Orange', x: -48.70, z: -35.50, w: 1.800, sy: 0.050, l: 4.500, ry: Math.PI / 2 },
    { name: '🪨 Blvd Path: Slant',  x: -49.40, z: -55.60, w: 1.500, sy: 1.400, l: 5.800, ry: Math.PI / 2 },
  ]
  blvdPathDefs.forEach(({ name, x, z, w, sy, l, ry }) => {
    const tex = swBaseTex.clone()
    tex.needsUpdate = true
    tex.repeat.set(Math.max(1, w / TILE), Math.max(1, l / TILE))
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, metalness: 0 })
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat)
    mesh.rotation.x = -Math.PI / 2
    mesh.receiveShadow = true
    const grp = new THREE.Group()
    grp.position.set(x, 0.03, z)
    grp.scale.set(w, sy, l)
    grp.rotation.y = ry
    grp.add(mesh)
    scene.add(grp)
    movables.push({ name, group: grp, scaleObj: grp })
  })

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
