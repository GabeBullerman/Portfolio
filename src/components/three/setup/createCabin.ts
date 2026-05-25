import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { Movable } from '../types'

export interface CabinRefs {
  doorPivotRef:   React.MutableRefObject<THREE.Group | null>
  cabCeilLightRef: React.MutableRefObject<THREE.PointLight | null>
  monLightRef:    React.MutableRefObject<THREE.SpotLight | null>
  switchNodeRef:  React.MutableRefObject<THREE.Object3D | null>
  radioGroupRef:  React.MutableRefObject<THREE.Group | null>
  screenMatRef:   React.MutableRefObject<any>
}

export interface CabinResult {
  cabGrp:        THREE.Group
  rampGrp:       THREE.Group
  cabHitboxEntries: Movable[]
  clockInterval:  ReturnType<typeof setInterval>
  CABIN_X:        number
  CABIN_Z:        number
  CD:             number
  DOOR_W:         number
}

export function createCabin(
  scene: THREE.Scene,
  refs: CabinRefs,
  MONITOR_LOCAL_POS: THREE.Vector3,
): CabinResult {
  const gltfLoader = new GLTFLoader()
  const CD = 5.5
  const DOOR_W = 1.1
  const CABIN_X = -5, CABIN_Z = 15

  const cabGrp = new THREE.Group()
  cabGrp.position.set(CABIN_X, 0, CABIN_Z)
  cabGrp.rotation.y = Math.PI * 1.5
  scene.add(cabGrp)

  // GLB cabin shell — scaled to match CW × CH footprint; interactive elements added separately below
  gltfLoader.load('/assets/cabin/cabin/Untitled.glb', gltf => {
    const cabMesh = gltf.scene
    cabMesh.scale.setScalar(0.600)
    cabMesh.position.set(-1.93, -0.50, 1.21)
    cabGrp.add(cabMesh)

    // Hide any mesh whose world Z is south of the cabin's front wall (world z < 9).
    // This catches the swingset that extends into the road without touching interior meshes.
    cabMesh.updateWorldMatrix(true, true)
    cabMesh.traverse(child => {
      if (!(child as THREE.Mesh).isMesh) return
      child.castShadow = true; child.receiveShadow = true
      const wp = new THREE.Vector3()
      child.getWorldPosition(wp)
      if (wp.z < 8) child.visible = false
    })

  }, undefined, err => console.error('[cabin] GLB failed:', err))

  // Stair ramp — visible orange plane, aligned to cabin stairs
  const rampMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.05, 2.0),
    new THREE.MeshBasicMaterial({ color: 0xff8800, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
  )
  rampMesh.position.set(-7.50, 0.75, -0.25)
  rampMesh.rotation.z = Math.PI / 4
  rampMesh.scale.set(2.0, 0.05, 1.0)
  cabGrp.add(rampMesh)
  const rampGrp = new THREE.Group()
  rampGrp.position.copy(rampMesh.position)
  rampGrp.rotation.copy(rampMesh.rotation)
  cabGrp.add(rampGrp)
  ;(rampGrp as any).__hitMesh = rampMesh

  // ── Visible hitbox planes (semi-transparent, align in debugger) ───────────
  const hitboxMat = (color: number) => new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false,
  })
  const cabHitboxEntries: Movable[] = []
  const addHitboxPlane = (name: string, w: number, h: number, d: number, px: number, py: number, pz: number, color: number, ry = 0, sx = 1, sy = 1, sz = 1) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), hitboxMat(color))
    mesh.position.set(px, py, pz)
    mesh.rotation.y = ry
    mesh.scale.set(sx, sy, sz)
    cabGrp.add(mesh)
    const grp = new THREE.Group(); grp.position.set(px, py, pz); grp.rotation.y = ry; cabGrp.add(grp)
    ;(grp as any).__hitMesh = mesh
    cabHitboxEntries.push({ name, group: grp, isHitbox: true })
  }
  const P2 = Math.PI / 2
  addHitboxPlane('🟥 Wall: Front-L', 2.0, 2.5, 0.2, -4.10, 3.92, -2.25, 0xff3333, P2, 1.25, 1.50, 1.00)
  addHitboxPlane('🟥 Wall: Front-R', 2.0, 2.5, 0.2, -4.10, 3.92,  1.65, 0xff3333, P2, 1.25, 1.50, 1.00)
  addHitboxPlane('🟥 Wall: Back',    5.0, 2.5, 0.2,  2.90, 4.25, -0.25, 0xff3333, P2, 1.25, 1.75, 1.00)
  addHitboxPlane('🟥 Wall: Left',    0.2, 2.5, 5.0, -1.65, 3.70, -3.50, 0xff3333, P2, 1.00, 1.40, 1.75)
  addHitboxPlane('🟥 Wall: Right',   0.2, 2.5, 5.0, -1.45, 3.76,  2.75, 0xff3333, P2, 1.00, 1.45, 1.75)
  addHitboxPlane('🟩 Floor',         9.0, 0.1, 5.0, -1.50, 2.05, -0.40, 0x33ff66,  0, 1.00, 1.00, 1.20)
  // Stairs handled by rampGrp/rampMesh (orange mesh above)

  // ── Interior ceiling — flat plane sized to wall bounds, hides chimney base / roof pitch ──
  const intMat = new THREE.MeshStandardMaterial({ color: 0x3d2e1e, roughness: 1.0, metalness: 0, side: THREE.DoubleSide })
  const intCeil = new THREE.Mesh(new THREE.PlaneGeometry(6.6, 5.85), intMat)
  intCeil.rotation.x = -Math.PI / 2
  intCeil.position.set(-0.60, 5.05, -0.375)
  intCeil.receiveShadow = true
  cabGrp.add(intCeil)

  // Ceiling PointLight — main room illumination, toggled by the wall switch
  const ceilLight = new THREE.PointLight(0xffeedd, 6.0, 11, 1.4)
  ceilLight.position.set(-0.5, 5.05, -0.4)
  ceilLight.castShadow = true
  ceilLight.shadow.mapSize.set(512, 512)
  cabGrp.add(ceilLight)
  refs.cabCeilLightRef.current = ceilLight

  // Small emissive bulb mesh so the fixture is visible
  const bulbGeo = new THREE.SphereGeometry(0.12, 8, 6)
  const bulbMat = new THREE.MeshStandardMaterial({ emissive: 0xffeedd, emissiveIntensity: 3, color: 0x000000 })
  const bulbMesh = new THREE.Mesh(bulbGeo, bulbMat)
  bulbMesh.position.copy(ceilLight.position)
  cabGrp.add(bulbMesh)

  // Lamp dome — semi-gloss opaque hemisphere shade, opens downward
  const domeMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.38, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xece6d8, roughness: 0.25, metalness: 0.05, transparent: true, opacity: 0.45 })
  )
  domeMesh.rotation.x = Math.PI  // flip so curved side faces down into room
  domeMesh.position.copy(ceilLight.position)
  domeMesh.castShadow = true
  cabGrp.add(domeMesh)

  // Black metal rim ring around the dome opening
  const rimMesh = new THREE.Mesh(
    new THREE.TorusGeometry(0.38, 0.028, 8, 64),
    new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4, metalness: 0.8 })
  )
  rimMesh.rotation.x = Math.PI / 2  // lay flat
  rimMesh.position.copy(ceilLight.position)
  rimMesh.castShadow = true
  cabGrp.add(rimMesh)

  // Keep bulb/dome/rim visibility in sync with the light
  ceilLight.userData.bulb = bulbMesh
  ceilLight.userData.dome = domeMesh
  ceilLight.userData.rim  = rimMesh

  // ── Wall clock — analog, shows real time, mounted on back wall ────────────
  const clockCanvas = document.createElement('canvas')
  clockCanvas.width = clockCanvas.height = 512
  const clockCtx = clockCanvas.getContext('2d')!
  const clockTex = new THREE.CanvasTexture(clockCanvas)

  const drawClock = () => {
    const now = new Date()
    const h = now.getHours() % 12
    const m = now.getMinutes()
    const s = now.getSeconds()
    const cx = 256, cy = 256, r = 230

    clockCtx.clearRect(0, 0, 512, 512)

    // Face
    clockCtx.fillStyle = '#f5e6c8'
    clockCtx.beginPath(); clockCtx.arc(cx, cy, r, 0, Math.PI * 2); clockCtx.fill()

    // Hour tick marks
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2
      const isQuarter = i % 3 === 0
      clockCtx.beginPath()
      clockCtx.moveTo(cx + Math.cos(a) * (isQuarter ? r - 36 : r - 22), cy + Math.sin(a) * (isQuarter ? r - 36 : r - 22))
      clockCtx.lineTo(cx + Math.cos(a) * (r - 8),  cy + Math.sin(a) * (r - 8))
      clockCtx.strokeStyle = '#2a1a0a'
      clockCtx.lineWidth = isQuarter ? 8 : 4
      clockCtx.lineCap = 'round'
      clockCtx.stroke()
    }

    // Hour hand
    const hA = ((h + m / 60) / 12) * Math.PI * 2 - Math.PI / 2
    clockCtx.beginPath()
    clockCtx.moveTo(cx - Math.cos(hA) * 28, cy - Math.sin(hA) * 28)
    clockCtx.lineTo(cx + Math.cos(hA) * r * 0.52, cy + Math.sin(hA) * r * 0.52)
    clockCtx.strokeStyle = '#1a0f05'; clockCtx.lineWidth = 18; clockCtx.lineCap = 'round'; clockCtx.stroke()

    // Minute hand
    const mA = ((m + s / 60) / 60) * Math.PI * 2 - Math.PI / 2
    clockCtx.beginPath()
    clockCtx.moveTo(cx - Math.cos(mA) * 32, cy - Math.sin(mA) * 32)
    clockCtx.lineTo(cx + Math.cos(mA) * r * 0.76, cy + Math.sin(mA) * r * 0.76)
    clockCtx.strokeStyle = '#1a0f05'; clockCtx.lineWidth = 11; clockCtx.lineCap = 'round'; clockCtx.stroke()

    // Second hand
    const sA = (s / 60) * Math.PI * 2 - Math.PI / 2
    clockCtx.beginPath()
    clockCtx.moveTo(cx - Math.cos(sA) * 44, cy - Math.sin(sA) * 44)
    clockCtx.lineTo(cx + Math.cos(sA) * r * 0.88, cy + Math.sin(sA) * r * 0.88)
    clockCtx.strokeStyle = '#cc2200'; clockCtx.lineWidth = 5; clockCtx.lineCap = 'round'; clockCtx.stroke()

    // Centre cap
    clockCtx.fillStyle = '#1a0f05'
    clockCtx.beginPath(); clockCtx.arc(cx, cy, 12, 0, Math.PI * 2); clockCtx.fill()
    clockCtx.fillStyle = '#cc2200'
    clockCtx.beginPath(); clockCtx.arc(cx, cy, 6, 0, Math.PI * 2); clockCtx.fill()

    clockTex.needsUpdate = true
  }

  drawClock()
  const clockInterval = setInterval(drawClock, 1000)

  // Clock face plane
  const clockPlane = new THREE.Mesh(
    new THREE.CircleGeometry(0.34, 64),
    new THREE.MeshStandardMaterial({ map: clockTex, emissiveMap: clockTex, emissive: new THREE.Color(1, 1, 1), emissiveIntensity: 0.4, roughness: 0.7, metalness: 0 })
  )
  clockPlane.rotation.y = -Math.PI / 2  // face into room (-X direction)
  clockPlane.position.set(2.6, 3.75, -0.5)
  cabGrp.add(clockPlane)

  // Wooden rim frame
  const clockFrame = new THREE.Mesh(
    new THREE.TorusGeometry(0.36, 0.045, 12, 64),
    new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.8, metalness: 0.05 })
  )
  clockFrame.rotation.y = -Math.PI / 2
  clockFrame.position.set(2.6, 3.75, -0.5)
  cabGrp.add(clockFrame)


  gltfLoader.load('/assets/cabin/light/light.gltf', gltf => {
    const lamp = gltf.scene
    lamp.traverse(child => {
      if ((child as THREE.Mesh).isMesh) { child.castShadow = true; child.receiveShadow = true }
    })
    lamp.scale.setScalar(0.3)
    // Mount on back wall (local +X face), rotated so emitter faces -X into cabin
    lamp.rotation.set(0, Math.PI / 2, -Math.PI / 2)
    lamp.position.set(1.70, 3.80, -3.1)
    cabGrp.add(lamp)
  }, undefined, err => console.error('[cabin] lamp failed:', err))

  gltfLoader.load('/assets/cabin/light/switch.gltf', gltf => {
    const sw = gltf.scene
    const switchMat = new THREE.MeshStandardMaterial({ color: 0xddddcc, roughness: 0.3, metalness: 0.1 })
    sw.traverse(child => {
      if (!(child as THREE.Mesh).isMesh) return
      child.castShadow = true; child.receiveShadow = true
      ;(child as THREE.Mesh).material = switchMat
    })
    sw.scale.setScalar(3.0)
    sw.position.set(-3.90, 3.22, 0.89)
    cabGrp.add(sw)
    refs.switchNodeRef.current = sw
  }, undefined, err => console.error('[cabin] switch failed:', err))

  const cabStep = new THREE.Mesh(new THREE.BoxGeometry(DOOR_W + 0.6, 0.2, 0.6), new THREE.MeshLambertMaterial({ color: 0x999999 }))
  cabStep.position.set(0, 0.1, CD / 2 + 0.35); cabGrp.add(cabStep)

  // ── Gaming setup inside cabin ─────────────────────────────────────────────
  const THEME_TO_SCREEN: Record<string, string> = {
    azure:   'Blue.PNG',
    rose:    'Pink.PNG',
    crimson: 'Red.PNG',
    gold:    'Gold.PNG',
    emerald: 'Green.PNG',
    silver:  'Silver.PNG',
    violet:  'Purple.PNG',
  }

  // Start loading the themed texture immediately — runs in parallel with the GLTF load
  // so it's usually ready by the time the traversal runs, eliminating the flash.
  const theme = localStorage.getItem('theme') ?? 'azure'
  const screenFile = THEME_TO_SCREEN[theme] ?? 'Blue.PNG'
  let themedTex: THREE.Texture | null = null
  let pendingScreenMat: any = null
  new THREE.TextureLoader().load(`/assets/cabin/setup/textures/${screenFile}`, tex => {
    tex.flipY = false; tex.repeat.set(1, -1); tex.offset.set(0, 1)
    themedTex = tex
    if (pendingScreenMat) { pendingScreenMat.map = tex; pendingScreenMat.needsUpdate = true }
  })

  gltfLoader.load('/assets/cabin/setup/gaming setup.gltf', gltf => {
    const desk = gltf.scene

    desk.traverse(child => {
      if (!(child as THREE.Mesh).isMesh) return
      child.castShadow = true; child.receiveShadow = true
      const mats = Array.isArray((child as THREE.Mesh).material)
        ? (child as THREE.Mesh).material as THREE.Material[]
        : [(child as THREE.Mesh).material as THREE.Material]
      mats.forEach(m => {
        const anyM = m as any
        if (anyM.map) {
          anyM.map.flipY = false
          anyM.map.repeat.set(1, -1)
          anyM.map.offset.set(0, 1)
          anyM.map.needsUpdate = true
        }
        if (m.name === '7355608') {
          refs.screenMatRef.current = anyM
          if (themedTex) { anyM.map = themedTex; anyM.needsUpdate = true }
          else pendingScreenMat = anyM
        }
        m.needsUpdate = true
      })
    })

    // Monitor screen glow — SpotLight cone aimed into the room from the screen face.
    const monLight = new THREE.SpotLight(0xd0e8ff, 1.2, 5, Math.PI * 0.38, 0.5, 1.5)
    monLight.position.set(MONITOR_LOCAL_POS.x, MONITOR_LOCAL_POS.y, MONITOR_LOCAL_POS.z)
    const monTarget = new THREE.Object3D()
    monTarget.position.set(MONITOR_LOCAL_POS.x, MONITOR_LOCAL_POS.y - 0.4, MONITOR_LOCAL_POS.z - 1.8)
    cabGrp.add(monLight)
    cabGrp.add(monTarget)
    monLight.target = monTarget
    refs.monLightRef.current = monLight

    desk.position.set(2.0, 2.8, -2.20)
    cabGrp.add(desk)
  }, undefined, err => console.error('[cabin] gaming setup failed:', err))

  // ── Chair inside cabin ─────────────────────────────────────────────
  gltfLoader.load('/assets/cabin/chair/scene.gltf', gltf => {
    const chair = gltf.scene
    chair.traverse(child => {
      if ((child as THREE.Mesh).isMesh) { child.castShadow = true; child.receiveShadow = true }
    })

    chair.position.set(1.8, 2.085, -1.8)
    chair.rotation.set(0, Math.PI, 0)
    chair.scale.set(0.85, 0.85, 0.85)

    cabGrp.add(chair)
  }, undefined, err => console.error('[cabin] gaming setup failed:', err))

  // ── Bed inside cabin ─────────────────────────────────────────────
  gltfLoader.load('/assets/cabin/bed/Untitled.glb', gltf => {
    const bedMesh = gltf.scene
    bedMesh.traverse(child => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true
        child.receiveShadow = true
        ;(child as THREE.Mesh).visible = true
      }
    })

    // Normalize weird Blender/export origins
    const box = new THREE.Box3().setFromObject(bedMesh)
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    box.getSize(size)
    box.getCenter(center)

    bedMesh.position.sub(center)

    const normalizedBed = new THREE.Group()
    normalizedBed.add(bedMesh)

    const maxDim = Math.max(size.x, size.y, size.z)
    normalizedBed.scale.setScalar(2.85 / maxDim)

    normalizedBed.position.set(1.00, 2.625, 1.65)
    normalizedBed.rotation.set(0, Math.PI / 2, 0)

    cabGrp.add(normalizedBed)

  }, undefined, err => console.error('[bed] GLB failed:', err))

  // ── Radio / jukebox ───────────────────────────────────────────────────────
  gltfLoader.load('/assets/cabin/radio/scene.gltf', gltf => {
    const radioMesh = gltf.scene
    radioMesh.traverse(child => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })

    const radioBox = new THREE.Box3().setFromObject(radioMesh)
    const radioSize = new THREE.Vector3()
    const radioCenter = new THREE.Vector3()
    radioBox.getSize(radioSize)
    radioBox.getCenter(radioCenter)
    radioMesh.position.sub(radioCenter)

    const radioGroup = new THREE.Group()
    radioGroup.add(radioMesh)

    const radioMax = Math.max(radioSize.x, radioSize.y, radioSize.z)
    // Target ~0.5 m tall jukebox radio
    radioGroup.scale.setScalar(0.5 / radioMax)

    radioGroup.position.set(-3.4, 2.9, -2.3)
    radioGroup.rotation.set(0, 82, 0)
    cabGrp.add(radioGroup)
    refs.radioGroupRef.current = radioGroup

  }, undefined, err => console.error('[radio] GLTF failed:', err))

  // ── Table ─────────────────────────────────────────────────────────────────
  gltfLoader.load('/assets/cabin/table/scene.gltf', gltf => {
    const tableMesh = gltf.scene
    tableMesh.traverse(child => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })

    const tableBox = new THREE.Box3().setFromObject(tableMesh)
    const tableSize = new THREE.Vector3()
    const tableCenter = new THREE.Vector3()
    tableBox.getSize(tableSize)
    tableBox.getCenter(tableCenter)
    tableMesh.position.sub(tableCenter)

    const tableGroup = new THREE.Group()
    tableGroup.add(tableMesh)

    const tableMax = Math.max(tableSize.x, tableSize.y, tableSize.z)
    // Target ~1.0 m wide table
    tableGroup.scale.setScalar(1.0 / tableMax)

    tableGroup.position.set(-3.5, 2.35, -2.6)
    cabGrp.add(tableGroup)

  }, undefined, err => console.error('[table] GLTF failed:', err))

  // ── Procedural door panel ─────────────────────────────────────────────────
  // Pivot sits at the hinge edge. animate.ts drives pivot.rotation.y to open/close.
  // Position is a rough starting guess — use the debug editor (`) to dial it in.
  const DOOR_H = 2.3
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.85, metalness: 0.02 })

  const doorPivot = new THREE.Group()
  doorPivot.position.set(-4.00, 2.05, 0.45)
  doorPivot.scale.set(1.020, 1.100, 1.377)
  cabGrp.add(doorPivot)
  refs.doorPivotRef.current = doorPivot

  // Panel: x=thickness, y=height, z=width. Offset so pivot is at the hinge (+z) edge.
  const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(0.09, DOOR_H, DOOR_W), woodMat)
  doorPanel.position.set(0, DOOR_H / 2, -DOOR_W / 2)
  doorPanel.castShadow = true
  doorPanel.receiveShadow = true
  doorPivot.add(doorPanel)

  // Raised-panel detail (inner frame inset)
  const panelInset = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, DOOR_H * 0.82, DOOR_W * 0.72),
    new THREE.MeshStandardMaterial({ color: 0x4a2e15, roughness: 0.9, metalness: 0.0 })
  )
  panelInset.position.set(-0.03, DOOR_H / 2, -DOOR_W / 2)
  doorPivot.add(panelInset)

  // Doorknob on free edge (opposite hinge), both sides
  const knobMat = new THREE.MeshStandardMaterial({ color: 0xb8860b, roughness: 0.2, metalness: 0.9 })
  const knobGeo = new THREE.SphereGeometry(0.045, 14, 10)
  const knobOuter = new THREE.Mesh(knobGeo, knobMat)
  const knobInner = new THREE.Mesh(knobGeo, knobMat)
  knobOuter.position.set(-0.07, DOOR_H * 0.42, -DOOR_W + 0.18)
  knobInner.position.set( 0.07, DOOR_H * 0.42, -DOOR_W + 0.18)
  doorPivot.add(knobOuter)
  doorPivot.add(knobInner)

  // Register in debug editor so position can be tuned with backtick overlay
  cabHitboxEntries.push({ name: '🚪 Door pivot', group: doorPivot, scaleObj: doorPivot })

  return { cabGrp, rampGrp, cabHitboxEntries, clockInterval, CABIN_X, CABIN_Z, CD, DOOR_W }
}
