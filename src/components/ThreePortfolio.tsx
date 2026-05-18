import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'
import {
  BOWL_CX, BOWL_START_Z, BOWL_PINS_Z, BOWL_LANE_Z, BOWL_PROX,
  PIN_H, PIN_R_BOT, PIN_R_TOP, BOWL_BALL_R, PIN_ROW_D, PIN_POSITIONS,
  BENCH_POSITIONS, BENCH_PROX,
  RTOSS_CX, RTOSS_START_Z, RTOSS_POST_Z, RTOSS_PROX, RTOSS_RING_R, RTOSS_RING_TUBE, RTOSS_RINGS, RTOSS_POST_H, RTOSS_POST_R,
  PIT_CX, PIT_CZ, TRAMP_CX, TRAMP_CZ, TRAMP_R, TRAMP_Y, LADDER_X, LADDER_Z, LADDER_PROX,
  SECTIONS, PROX,
  SectionId, BowlState, RTossState,
} from './three/constants'
import { mulberry32, lerpAngle } from './three/helpers'
import { makeSignTexture } from './three/signTextures'
import { SectionOverlay } from './three/SectionOverlay'

// ─── Main component ──────────────────────────────────────────────────────────
export default function ThreePortfolio({ onExit }: { onExit: () => void }) {
  const mountRef          = useRef<HTMLDivElement>(null)
  const [pointerLocked, setPointerLocked] = useState(false)
  const [activeSection, setActiveSection] = useState<SectionId | null>(null)
  const [nearSign, setNearSign]           = useState(false)
  const [joyPos, setJoyPos]               = useState({ x: 0, y: 0 })
  // Background music
  const audioRef      = useRef<HTMLAudioElement | null>(null)
  const [musicMuted, setMusicMuted] = useState(false)
  const musicStarted  = useRef(false)
  const touchMoveRef    = useRef({ x: 0, y: 0 })
  const touchActiveRef  = useRef(false)
  const triggerFocusRef = useRef<((id: SectionId) => void) | null>(null)
  // Bowling mini-game
  const [nearBowl, setNearBowl]           = useState(false)
  const [bowlDisplay, setBowlDisplay]     = useState<{ state: BowlState; score: number; hs: number }>({ state: 'idle', score: 0, hs: 0 })
  const bowlStateRef    = useRef<BowlState>('idle')
  const bowlAimRef      = useRef(0)
  const bowlTimerRef    = useRef(0)
  const bowlHSRef       = useRef(parseInt(localStorage.getItem('gabe-bowl-hs') || '0'))
  const nearBowlRef     = useRef(false)
  const bowlPowerRef    = useRef(0)
  const bowlPowerDirRef  = useRef(1)
  const bowlThrowKeyRef  = useRef(false)  // true only if E/Space went down while already aiming
  const powerBarRef      = useRef<HTMLDivElement>(null)
  // Bench sit
  const [nearBench, setNearBench] = useState(false)
  const [sitting, setSitting]     = useState(false)
  const sittingRef    = useRef(false)
  const nearBenchRef  = useRef(false)
  const seatIdxRef    = useRef(0)
  // Ring toss
  const [nearRToss, setNearRToss]       = useState(false)
  const [rtossDisplay, setRTossDisplay] = useState<{ state: RTossState; thrown: number; score: number; hs: number }>({ state: 'idle', thrown: 0, score: 0, hs: parseInt(localStorage.getItem('gabe-rtoss-hs') || '0') })
  const rtossStateRef    = useRef<RTossState>('idle')
  const rtossAimRef      = useRef(0)
  const rPowerRef        = useRef(0)
  const rPowerDirRef     = useRef(1)
  const rtossThrowKeyRef = useRef(false)
  const rtossTimerRef    = useRef(0)
  const nearRTossRef     = useRef(false)
  const rPowerBarRef     = useRef<HTMLDivElement>(null)
  const rtossThrownRef   = useRef(0)
  const focusPosRef     = useRef(new THREE.Vector3())
  const focusLookRef    = useRef(new THREE.Vector3())
  const focusActiveRef  = useRef(false)
  const overlayShownRef = useRef(false)
  const proxTimerRef    = useRef(0)
  const currentSecRef   = useRef<SectionId | null>(null)
  // Prevents sign from re-triggering immediately after the player presses ESC
  const exitedRef       = useRef(false)
  const relockRef       = useRef<(() => void) | null>(null)
  // Jump
  const jumpPressedRef  = useRef(false)
  const onRampRef       = useRef(false)
  const onFloorRef      = useRef(false)
  // Ladder climb
  const climbingRef     = useRef(false)
  const [climbing, setClimbing] = useState(false)
  const [nearLadder, setNearLadder] = useState(false)
  const nearLadderRef   = useRef(false)
  // Cabin door + smoke
  const doorOpenRef     = useRef(false)
  const doorRotRef      = useRef(0)
  const doorPivotRef    = useRef<THREE.Group | null>(null)
  // Cabin light switch
  const cabLightOnRef   = useRef(true)
  const nearSwitchRef   = useRef(false)
  const switchNodeRef   = useRef<THREE.Object3D | null>(null)
  const [nearSwitch, setNearSwitch] = useState(false)
  const cabSpotRef      = useRef<THREE.SpotLight | null>(null)
  // Debug overlay (backtick to toggle)
  const debugModeRef    = useRef(false)
  const debugPanelRef   = useRef<HTMLPreElement>(null)
  // Object editor
  const movablesRef     = useRef<{ name: string; group: THREE.Group; meshes?: THREE.Object3D[]; scaleObj?: THREE.Object3D; isHitbox?: boolean }[]>([])
  const [debugOpen, setDebugOpen]   = useState(false)
  const [debugSel,  setDebugSel]    = useState(-1)
  const [debugStep, setDebugStep]   = useState(1)
  const [selPos,    setSelPos]      = useState<{ x: number; y: number; z: number } | null>(null)
  const [selRot,    setSelRot]      = useState<{ x: number; y: number; z: number } | null>(null)

  function exitFocus() {
    focusActiveRef.current  = false
    overlayShownRef.current = false
    proxTimerRef.current    = 0
    exitedRef.current       = true
    setActiveSection(null)
    setNearSign(false)
    relockRef.current?.()
  }

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const W = mount.clientWidth, H = mount.clientHeight

    // ── Scene ────────────────────────────────────────────────────────────
    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0xb8d4f0, 0.010)

    const camera = new THREE.PerspectiveCamera(65, W/H, 0.1, 300)
    camera.position.set(0, 2.2, 11)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(W, H); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.65
    mount.appendChild(renderer.domElement)

    // ── HDR Skybox ───────────────────────────────────────────────────────
    const pmremGen = new THREE.PMREMGenerator(renderer)
    pmremGen.compileEquirectangularShader()
    new RGBELoader().load('/images/citrus_orchard_road_puresky_1k.hdr', (hdrTex) => {
      const envMap = pmremGen.fromEquirectangular(hdrTex).texture
      scene.background = envMap
      scene.environment = envMap
      hdrTex.dispose()
      pmremGen.dispose()
    })

    scene.add(new THREE.AmbientLight(0xffeedd, 1.2))
    const sun = new THREE.DirectionalLight(0xfff0d0, 1.4)
    sun.position.set(20, 40, 15); sun.castShadow = true
    sun.shadow.mapSize.set(2048,2048)
    sun.shadow.camera.left=-80; sun.shadow.camera.right=80
    sun.shadow.camera.top=80; sun.shadow.camera.bottom=-80; sun.shadow.camera.far=160
    scene.add(sun)

    // ── Cannon physics world ──────────────────────────────────────────────
    const physWorld = new CANNON.World({ gravity: new CANNON.Vec3(0, -12, 0) })
    physWorld.broadphase = new CANNON.NaiveBroadphase()
    ;(physWorld.solver as CANNON.GSSolver).iterations = 8

    // Static ground plane
    const groundBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() })
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2)
    physWorld.addBody(groundBody)

    // Static campfire obstacle (approximate with short cylinder)
    const fireObstacle = new CANNON.Body({ mass: 0 })
    fireObstacle.addShape(new CANNON.Cylinder(0.75, 0.75, 0.3, 8))
    fireObstacle.position.set(0, 0.15, -6)
    physWorld.addBody(fireObstacle)

    // ── Ground ───────────────────────────────────────────────────────────
    const grassCv = document.createElement('canvas'); grassCv.width = 256; grassCv.height = 256
    const gc = grassCv.getContext('2d')!
    gc.fillStyle = '#3d7a2a'; gc.fillRect(0, 0, 256, 256)
    const gRng = mulberry32(999)
    for (let i = 0; i < 5000; i++) {
      const gx = gRng() * 256, gy = gRng() * 256
      const v = gRng()
      gc.fillStyle = v > 0.65 ? '#4a9034' : v > 0.35 ? '#357828' : '#2d6820'
      gc.fillRect(gx, gy, 1 + gRng() * 1.8, 1 + gRng() * 1.8)
    }
    const grassTex = new THREE.CanvasTexture(grassCv)
    grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping
    grassTex.repeat.set(24, 24)
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(180, 180),
      new THREE.MeshLambertMaterial({ map: grassTex }),
    )
    ground.rotation.x = -Math.PI / 2; scene.add(ground)

    // Map rim (tree-line edge)
    const rim = new THREE.Mesh(new THREE.RingGeometry(72,82,48), new THREE.MeshLambertMaterial({ color:0x3a6030, side:THREE.DoubleSide }))
    rim.rotation.x = -Math.PI/2; rim.position.y = -0.3; scene.add(rim)

    // ── Collision system ──────────────────────────────────────────────────
    interface CylCol { x: number; z: number; r: number; maxY?: number }
    interface BoxCol { x0: number; x1: number; z0: number; z1: number; maxY: number }
    const cylCols: CylCol[] = []
    const boxCols: BoxCol[] = []

    // Define campfire position here so tree spawner can exclude it
    const FIRE_POS = new THREE.Vector3(0, 0, -6)

    // Cabin and pond positions (defined early for tree exclusion)
    const CABIN_X = -5, CABIN_Z = 15
    const POND_X = -28, POND_Z = -35, POND_R = 3.2

    // ── Nature assets (GLB + FBX) ─────────────────────────────────────────
    const gltfLoader = new GLTFLoader()
    const fbxLoader  = new FBXLoader()

    function logSize(label: string, grp: THREE.Group) {
      const box = new THREE.Box3().setFromObject(grp)
      const size = new THREE.Vector3(); box.getSize(size)
      console.log(`[nature] ${label}  size: x=${size.x.toFixed(2)} y=${size.y.toFixed(2)} z=${size.z.toFixed(2)}`)
    }
    function loadGLB(path: string): Promise<THREE.Group> {
      return new Promise((resolve, reject) => {
        gltfLoader.load(
          path,
          gltf => {
            gltf.scene.traverse(child => {
              if ((child as THREE.Mesh).isMesh) { child.castShadow = true; child.receiveShadow = true }
            })
            logSize(path.split('/').pop()!, gltf.scene)
            resolve(gltf.scene)
          },
          undefined,
          err => { console.error('[nature] GLB FAILED:', path, err); reject(err) }
        )
      })
    }
    function loadFBX(path: string, normalizeHeight = 6): Promise<THREE.Group> {
      return new Promise((resolve, reject) => {
        fbxLoader.load(
          path,
          grp => {
            grp.traverse(child => {
              if ((child as THREE.Mesh).isMesh) { child.castShadow = true; child.receiveShadow = true }
            })
            // Normalize oversized FBX models (Blender often exports in cm = 100× scale)
            const box = new THREE.Box3().setFromObject(grp)
            const h = new THREE.Vector3(); box.getSize(h)
            if (h.y > 10) grp.scale.setScalar(normalizeHeight / h.y)
            logSize(path.split('/').pop()!, grp)
            resolve(grp)
          },
          undefined,
          err => { console.error('[nature] FBX FAILED:', path, err); reject(err) }
        )
      })
    }

    // GLBs first — all confirmed working
    Promise.all([
      '/assets/nature/Tree1.3.glb',
      '/assets/nature/Tree2.3.glb',
      '/assets/nature/Tree3.3.glb',
      '/assets/nature/Bush1.3.glb',
      '/assets/nature/Bush2.3.glb',
      '/assets/nature/Bush3.3.glb',
      '/assets/nature/Stone1.3.glb',
      '/assets/nature/Stone2.3.glb',
      '/assets/nature/Stone3.3.glb',
      '/assets/nature/Flower1.3.glb',
      '/assets/nature/Flower2.3.glb',
      '/assets/nature/Flower3.3.glb',
      '/assets/nature/Mushroom1.2.glb',
      '/assets/nature/Mushroom2.2.glb',
    ].map(loadGLB)).then(([t1, t2, t3, b1, b2, b3, s1, s2, s3, fl1, fl2, fl3, m1, m2]) => {
      const bushes  = [b1, b2, b3]
      const stones  = [s1, s2, s3]
      const flowers = [fl1, fl2, fl3]
      const mushs   = [m1, m2]

      // FBX trees — non-fatal if any fail
      Promise.allSettled([
        loadFBX('/assets/nature/Tree low.FBX'),
      ]).then(fbxResults => {
        const fbxTrees = fbxResults
          .filter((r): r is PromiseFulfilledResult<THREE.Group> => r.status === 'fulfilled')
          .map(r => r.value)
        const trees = [t1, t2, t3, ...fbxTrees]
        const treeNames = ['Tree1.3.glb', 'Tree2.3.glb', 'Tree3.3.glb', 'Tree low.FBX']
        // Per-model base scale (user-tuned) + ground Y offset computed from bounding box
        const baseScales = [0.950, 0.725, 0.625, 0.050]
        const treeConfigs = trees.map((t, i) => {
          const box = new THREE.Box3().setFromObject(t)
          const yOff = box.min.y < -0.05 ? -box.min.y : 0  // lift model so base sits at y=0
          const scale = baseScales[i] ?? 0.6
          console.log(`[trees] variant ${i} (${treeNames[i] ?? 'FBX'}): baseScale=${scale}  yOff=${yOff.toFixed(3)}  raw min.y=${box.min.y.toFixed(3)}`)
          return { scale, yOff }
        })
        console.log(`[nature] Tree pool: ${trees.length} variants (${fbxTrees.length} FBX loaded)`)

        // Showcase — one of each tree at x=-24..x=-24+n*7, z=8 for debug scaling
        trees.forEach((template, i) => {
          const cfg = treeConfigs[i]
          const showcase = template.clone(true)
          showcase.scale.setScalar(cfg.scale)
          showcase.position.set(-24 + i * 7, cfg.yOff * cfg.scale, 8)
          scene.add(showcase)
          const g = new THREE.Group()
          g.position.set(showcase.position.x, 0, showcase.position.z)
          scene.add(g)
        })

        // Path corridor exclusion — keeps nature off the stone path between signs
        const PATH_WP: [number, number][] = [
          [FIRE_POS.x, FIRE_POS.z],
          ...SECTIONS.map(s => [s.wx, s.wz] as [number, number]),
        ]
        function nearPath(px: number, pz: number, halfW = 1.6): boolean {
          for (let i = 0; i < PATH_WP.length - 1; i++) {
            const [x1, z1] = PATH_WP[i], [x2, z2] = PATH_WP[i + 1]
            const dx = x2 - x1, dz = z2 - z1
            const len2 = dx * dx + dz * dz
            const t = len2 < 0.001 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (pz - z1) * dz) / len2))
            if (Math.hypot(px - (x1 + t * dx), pz - (z1 + t * dz)) < halfW) return true
          }
          return false
        }

        // Pre-compute ground Y offsets for each pool variant
        function getYOffs(pool: THREE.Group[]): number[] {
          return pool.map(g => {
            const box = new THREE.Box3().setFromObject(g)
            return box.min.y < -0.05 ? -box.min.y : 0
          })
        }
        const bushYOffs   = getYOffs(bushes)
        const stoneYOffs  = getYOffs(stones)
        const flowerYOffs = getYOffs(flowers)
        const mushYOffs   = getYOffs(mushs)

        function scatter(
          pool: THREE.Group[], seed: number, count: number,
          scMin: number, scMax: number, clearR: number,
          extraChecks?: (x: number, z: number) => boolean,
          yOffs?: number[]
        ) {
          const r = mulberry32(seed)
          for (let i = 0; i < count; i++) {
            const x = (r() - 0.5) * 160, z = r() * 130 - 95
            const sc = scMin + r() * (scMax - scMin)
            const yr = r() * Math.PI * 2
            const vi = Math.floor(r() * pool.length)
            if (Math.hypot(x, z) > 88) continue
            if (Math.hypot(x, z) < SPAWN_CLEAR - 4) continue
            if (SECTIONS.some(s => Math.hypot(x - s.wx, z - s.wz) < clearR)) continue
            if (Math.hypot(x - FIRE_POS.x, z - FIRE_POS.z) < 4.0) continue
            if (Math.hypot(x - CABIN_X, z - CABIN_Z) < 6) continue
            if (Math.abs(x - BOWL_CX) < 4.0 && z > BOWL_PINS_Z - 3 && z < BOWL_START_Z + 4) continue
            if (Math.abs(x - RTOSS_CX) < 3.5 && z > RTOSS_POST_Z - 2 && z < RTOSS_START_Z + 4) continue
            if (extraChecks && extraChecks(x, z)) continue
            const obj = pool[vi].clone(true)
            const yOff = (yOffs?.[vi] ?? 0) * sc
            obj.position.set(x, yOff, z); obj.scale.setScalar(sc); obj.rotation.y = yr
            scene.add(obj)
          }
        }

        const SPAWN_CLEAR = 12  // keep trees away from player spawn (0, 0)

        // Trees — also push cylinder colliders
        const tRng = mulberry32(42)
        for (let i = 0; i < 220; i++) {
          const x = (tRng() - 0.5) * 160, z = tRng() * 130 - 95
          const variation = 0.85 + tRng() * 0.30   // ±15% random size variation
          const yr = tRng() * Math.PI * 2
          const vi = Math.floor(tRng() * trees.length)
          if (Math.hypot(x, z) > 90) continue
          if (Math.hypot(x, z) < SPAWN_CLEAR) continue
          if (SECTIONS.some(s => Math.hypot(x - s.wx, z - s.wz) < 6.5)) continue
          if (Math.hypot(x - FIRE_POS.x, z - FIRE_POS.z) < 5.0) continue
          if (Math.abs(x - BOWL_CX) < 3.5 && z > BOWL_PINS_Z - 3 && z < BOWL_START_Z + 4) continue
          if (Math.abs(x - RTOSS_CX) < 3.0 && z > RTOSS_POST_Z - 2 && z < RTOSS_START_Z + 4) continue
          if (Math.hypot(x - PIT_CX, z - PIT_CZ) < 4.0) continue
          if (Math.hypot(x - TRAMP_CX, z - TRAMP_CZ) < TRAMP_R + 2.5) continue
          if (Math.hypot(x - CABIN_X, z - CABIN_Z) < 7) continue
          if (Math.hypot(x - POND_X, z - POND_Z) < POND_R + 2.5) continue
          const cfg = treeConfigs[vi] ?? { scale: 0.6, yOff: 0 }
          const sc = cfg.scale * variation
          cylCols.push({ x, z, r: 0.3 * sc })
          const obj = trees[vi].clone(true)
          obj.position.set(x, cfg.yOff * sc, z); obj.scale.setScalar(sc); obj.rotation.y = yr
          scene.add(obj)
        }

        scatter(bushes,  77,  120, 0.8, 1.4, 5.0, (x, z) =>
          nearPath(x, z) ||
          Math.hypot(x, z) < SPAWN_CLEAR - 2 ||
          Math.hypot(x - POND_X, z - POND_Z) < POND_R + 1.5 ||
          Math.hypot(x - PIT_CX, z - PIT_CZ) < 3.5 ||
          Math.hypot(x - TRAMP_CX, z - TRAMP_CZ) < TRAMP_R + 2,
          bushYOffs
        )
        scatter(stones,  99,   80, 0.5, 1.2, 4.5, (x, z) =>
          nearPath(x, z) ||
          Math.hypot(x - POND_X, z - POND_Z) < POND_R + 1.0,
          stoneYOffs
        )
        scatter(flowers, 123, 160, 2.0, 3.5, 3.5, (x, z) => nearPath(x, z), flowerYOffs)
        scatter(mushs,    55,  60, 1.2, 2.2, 4.0, (x, z) => nearPath(x, z), mushYOffs)
        console.log('[nature] All assets scattered successfully')
      })
    }).catch(err => {
      console.error('[nature] GLB load failed:', err)
    })

    // ── World border fence ──────────────────────────────────────────────────────
    const fPostMat = new THREE.MeshLambertMaterial({ color: 0x7a5c2e })
    const fPostGeo = new THREE.CylinderGeometry(0.06, 0.09, 1.5, 6)
    const fRailGeoX = new THREE.BoxGeometry(3.3, 0.07, 0.07)
    const fRailGeoZ = new THREE.BoxGeometry(0.07, 0.07, 3.3)

    function addFenceSide(fixedAxis: 'x'|'z', fixedVal: number, from: number, to: number, count: number) {
      const step = (to - from) / count
      for (let i = 0; i <= count; i++) {
        const v = from + step * i
        const px = fixedAxis === 'z' ? v : fixedVal
        const pz = fixedAxis === 'x' ? v : fixedVal
        const post = new THREE.Mesh(fPostGeo, fPostMat)
        post.position.set(px, 0.75, pz); post.castShadow = true; scene.add(post)
        if (i < count) {
          const mx = fixedAxis === 'z' ? v + step / 2 : fixedVal
          const mz = fixedAxis === 'x' ? v + step / 2 : fixedVal
          const rg = fixedAxis === 'z' ? fRailGeoX : fRailGeoZ
          ;[0.42, 0.92].forEach(h => {
            const rail = new THREE.Mesh(rg, fPostMat)
            rail.position.set(mx, h, mz); scene.add(rail)
          })
        }
      }
    }
    addFenceSide('z',  18, -42,  42, 28)   // North
    addFenceSide('z', -92, -42,  42, 28)   // South
    addFenceSide('x', -42, -92,  18, 37)   // West
    addFenceSide('x',  42, -92,  18, 37)   // East

    // ── Signs ────────────────────────────────────────────────────────────
    const signGroups: THREE.Group[] = []
    SECTIONS.forEach(({ id, label, wx, wz }) => {
      const g = new THREE.Group(); g.position.set(wx, 0, wz); scene.add(g)
      signGroups.push(g)
      cylCols.push({ x: wx, z: wz, r: 0.22 })
      const clear = new THREE.Mesh(new THREE.CircleGeometry(4.5,20), new THREE.MeshLambertMaterial({color:0x5a9c5a}))
      clear.rotation.x=-Math.PI/2; clear.position.set(0,0.01,0); g.add(clear)
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.10,0.15,3.2,7), new THREE.MeshLambertMaterial({ color: 0x7a4f2d }))
      post.position.set(0,1.6,0); post.castShadow=true; g.add(post)
      const sign = new THREE.Mesh(new THREE.BoxGeometry(5.0,2.5,0.22), new THREE.MeshLambertMaterial({map:makeSignTexture(label,id)}))
      sign.position.set(0,3.8,0); sign.castShadow=true; g.add(sign)
    })

    // ── Stone paths between signs ─────────────────────────────────────────
    {
      const pathStoneMat = new THREE.MeshLambertMaterial({ color: 0x8a8a7e })
      const pathStoneGeo = new THREE.SphereGeometry(1, 5, 4)
      const pathStoneInst = new THREE.InstancedMesh(pathStoneGeo, pathStoneMat, 1200)
      pathStoneInst.receiveShadow = true; scene.add(pathStoneInst)
      const dummy = new THREE.Object3D()
      const pathRng = mulberry32(888)
      let idx = 0

      function addStonePath(x1: number, z1: number, x2: number, z2: number) {
        const dx = x2 - x1, dz = z2 - z1
        const len = Math.hypot(dx, dz)
        const ux = dx / len, uz = dz / len
        const count = Math.ceil(len * 5.5)
        for (let i = 0; i < count && idx < 1200; i++) {
          const t   = (i + pathRng() * 0.7) / count
          const perp = (pathRng() - 0.5) * 1.4
          const sx  = x1 + ux * t * len + (-uz) * perp
          const sz  = z1 + uz * t * len +  ux  * perp
          const r   = 0.055 + pathRng() * 0.085
          dummy.position.set(sx, r * 0.25, sz)
          dummy.scale.set(r, r * (0.22 + pathRng() * 0.18), r * (0.85 + pathRng() * 0.3))
          dummy.rotation.y = pathRng() * Math.PI * 2
          dummy.updateMatrix()
          pathStoneInst.setMatrixAt(idx++, dummy.matrix)
        }
      }

      // Path from campfire area to first sign, then sign→sign
      const waypoints: [number, number][] = [
        [FIRE_POS.x, FIRE_POS.z],
        ...SECTIONS.map(s => [s.wx, s.wz] as [number, number]),
      ]
      for (let i = 0; i < waypoints.length - 1; i++) {
        addStonePath(waypoints[i][0], waypoints[i][1], waypoints[i+1][0], waypoints[i+1][1])
      }
      pathStoneInst.instanceMatrix.needsUpdate = true
      pathStoneInst.count = idx
    }

    // ── Proximity progress ring ───────────────────────────────────────────
    const RING_SEGS = 80
    const RING_R    = 4.5
    const ringPts   = new Float32Array((RING_SEGS + 1) * 3)
    for (let i = 0; i <= RING_SEGS; i++) {
      const a = (i / RING_SEGS) * Math.PI * 2 - Math.PI / 2  // start at top, go CCW
      ringPts[i * 3]     = Math.cos(a) * RING_R
      ringPts[i * 3 + 1] = 0.04
      ringPts[i * 3 + 2] = Math.sin(a) * RING_R
    }
    const ringGeo = new THREE.BufferGeometry()
    ringGeo.setAttribute('position', new THREE.BufferAttribute(ringPts, 3))
    ringGeo.setDrawRange(0, 0)
    const ringLine = new THREE.Line(ringGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 }))
    ringLine.visible = false
    scene.add(ringLine)

    // ── Campfire ─────────────────────────────────────────────────────────
    const logMat = new THREE.MeshLambertMaterial({ color:0x5a3010 })
    const logGeo = new THREE.CylinderGeometry(0.08,0.11,1.6,6)
    ;[0, Math.PI/3, -Math.PI/3].forEach(ry => {
      const log = new THREE.Mesh(logGeo, logMat)
      log.position.copy(FIRE_POS); log.position.y=0.09
      log.rotation.z=Math.PI/2; log.rotation.y=ry; scene.add(log)
    })
    for (let i=0; i<9; i++) {
      const stone = new THREE.Mesh(new THREE.SphereGeometry(0.13,5,4), new THREE.MeshLambertMaterial({color:0x888888}))
      stone.position.set(FIRE_POS.x+Math.sin(i*Math.PI*2/9)*0.68,0.09,FIRE_POS.z+Math.cos(i*Math.PI*2/9)*0.68)
      scene.add(stone)
    }

    // ── Benches ──────────────────────────────────────────────────────────────
    const benchLogMat = new THREE.MeshLambertMaterial({ color: 0x5a3010 })
    const benchPlankMat = new THREE.MeshLambertMaterial({ color: 0x8b5e2a })
    BENCH_POSITIONS.forEach(({ x, z, ry }) => {
      cylCols.push({ x, z, r: 0.9 })
      const g = new THREE.Group()
      // Seat plank
      const seat = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 0.42), benchPlankMat)
      seat.position.y = 0.48; g.add(seat)
      // Legs
      ;[-0.55, 0.55].forEach(ox => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.48, 6), benchLogMat)
        leg.position.set(ox, 0.24, 0); g.add(leg)
      })
      g.position.set(x, 0, z); g.rotation.y = ry
      g.castShadow = true; scene.add(g)
    })

    const flameMat  = new THREE.MeshBasicMaterial({ color:0xff6600 })
    const flameMesh = new THREE.Mesh(new THREE.ConeGeometry(0.32,0.85,8), flameMat)
    flameMesh.position.set(FIRE_POS.x,0.52,FIRE_POS.z); scene.add(flameMesh)
    const innerFlameMat  = new THREE.MeshBasicMaterial({ color:0xffee00 })
    const innerFlameMesh = new THREE.Mesh(new THREE.ConeGeometry(0.16,0.54,8), innerFlameMat)
    innerFlameMesh.position.set(FIRE_POS.x,0.52,FIRE_POS.z); scene.add(innerFlameMesh)
    const fireLight = new THREE.PointLight(0xff7700, 1.6, 9)
    fireLight.position.set(FIRE_POS.x,1.0,FIRE_POS.z); scene.add(fireLight)

    // ── Fireflies ─────────────────────────────────────────────────────────
    const FF_COUNT = 40
    const ffGeo = new THREE.SphereGeometry(0.055, 4, 3)
    const ffMat = new THREE.MeshBasicMaterial({ color:0xffff55 })
    const ffMesh = new THREE.InstancedMesh(ffGeo, ffMat, FF_COUNT)
    ffMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(ffMesh)
    const ffRng = mulberry32(1337)
    const ffData = Array.from({ length:FF_COUNT }, () => ({
      bx: (ffRng()-0.5)*120, by: 0.7+ffRng()*4, bz: ffRng()*95-80,
      ph: ffRng()*Math.PI*2, sp: 0.35+ffRng()*0.75, am: 1.0+ffRng()*2.8,
    }))

    // ── Cabin (behind spawn) ──────────────────────────────────────────────────
    const CD = 5.5, CH = 3.2
    const DOOR_W = 1.1

    const cabGrp = new THREE.Group(); cabGrp.position.set(CABIN_X, 0, CABIN_Z); cabGrp.rotation.y = Math.PI * 1.5; scene.add(cabGrp)

    // GLB cabin shell — scaled to match CW × CH footprint; interactive elements added separately below
    gltfLoader.load('/assets/cabin/cabin/Untitled.glb', gltf => {
      const cabMesh = gltf.scene
      cabMesh.traverse(child => {
        if ((child as THREE.Mesh).isMesh) { child.castShadow = true; child.receiveShadow = true }
      })
      cabMesh.scale.setScalar(0.600)
      cabMesh.position.set(-1.93, -0.50, 1.21)

      cabGrp.add(cabMesh)
      movablesRef.current.push({ name: '🏠 Cabin shell (cabin local)', group: cabMesh as unknown as THREE.Group, scaleObj: cabMesh })
    }, undefined, err => console.error('[cabin] GLB failed:', err))

    // Stair ramp — visible orange plane, aligned to cabin stairs
    const rampMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.05, 2.0),
      new THREE.MeshBasicMaterial({ color: 0xff8800, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false })
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
      color, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false,
    })
    const cabHitboxEntries: typeof movablesRef.current = []
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

    // Interior ceiling light — SpotLight + lamp model at ceiling centre
    const cabLight = new THREE.SpotLight(0xffd080, 2.2, 10, Math.PI * 0.38, 0.45, 1.5)
    cabLight.position.set(0, CH - 0.05, 0)
    cabLight.target.position.set(0, 0, 0)
    cabGrp.add(cabLight); cabGrp.add(cabLight.target)
    cabSpotRef.current = cabLight

    gltfLoader.load('/assets/cabin/light/light.gltf', gltf => {
      const lamp = gltf.scene
      lamp.traverse(child => {
        if ((child as THREE.Mesh).isMesh) { child.castShadow = true; child.receiveShadow = true }
      })
      lamp.scale.setScalar(0.3)
      lamp.position.set(0, CH, 0)
      cabGrp.add(lamp)
      movablesRef.current.push({ name: '💡 Lamp (cabin local)', group: lamp as unknown as THREE.Group, scaleObj: lamp })
    }, undefined, err => console.error('[cabin] lamp failed:', err))

    gltfLoader.load('/assets/cabin/light/switch.gltf', gltf => {
      const sw = gltf.scene
      sw.traverse(child => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = true; child.receiveShadow = true
          ;(child as THREE.Mesh).visible = false
        }
      })
      sw.scale.setScalar(3.0)
      sw.position.set(-3.90, 3.22, 0.89)
      cabGrp.add(sw)
      switchNodeRef.current = sw
      movablesRef.current.push({ name: '🔘 Switch (cabin local)', group: sw as unknown as THREE.Group, scaleObj: sw })
    }, undefined, err => console.error('[cabin] switch failed:', err))

    const cabStep = new THREE.Mesh(new THREE.BoxGeometry(DOOR_W+0.6, 0.2, 0.6), new THREE.MeshLambertMaterial({ color: 0x999999 }))
    cabStep.position.set(0, 0.1, CD/2+0.35); cabGrp.add(cabStep)

    // ── Gaming setup inside cabin ─────────────────────────────────────────────
    gltfLoader.load('/assets/cabin/setup/gaming setup.gltf', gltf => {
      const desk = gltf.scene
      desk.traverse(child => {
        if ((child as THREE.Mesh).isMesh) { child.castShadow = true; child.receiveShadow = true }
      })

      desk.position.set(1.6, 2.93, 0.1)
      desk.rotation.y = Math.PI/2

      cabGrp.add(desk)
      movablesRef.current.push({ name: '🖥 Desk (cabin local)', group: desk as unknown as THREE.Group, scaleObj: desk })
    }, undefined, err => console.error('[cabin] gaming setup failed:', err))

    // ── Pond ─────────────────────────────────────────────────────────────────
    const pondGrp = new THREE.Group(); pondGrp.position.set(POND_X, 0, POND_Z); scene.add(pondGrp)

    // All pond geometry is relative to pondGrp origin = (POND_X, 0, POND_Z)
    const pondMesh = new THREE.Mesh(
      new THREE.CircleGeometry(POND_R, 28),
      new THREE.MeshLambertMaterial({ color: 0x2255aa, transparent: true, opacity: 0.88 })
    )
    pondMesh.rotation.x = -Math.PI/2; pondMesh.position.set(0, 0.02, 0); pondGrp.add(pondMesh)
    const pondRim = new THREE.Mesh(
      new THREE.RingGeometry(POND_R, POND_R+0.55, 28),
      new THREE.MeshLambertMaterial({ color: 0x4a6b30, side: THREE.DoubleSide })
    )
    pondRim.rotation.x = -Math.PI/2; pondRim.position.set(0, 0.01, 0); pondGrp.add(pondRim)
    const reedMat  = new THREE.MeshLambertMaterial({ color: 0x5a7a2a })
    const reedTopMat = new THREE.MeshLambertMaterial({ color: 0x5a3a10 })
    const reedRng  = mulberry32(555)
    for (let r = 0; r < 16; r++) {
      const ra = reedRng()*Math.PI*2, rr = POND_R*0.78 + reedRng()*POND_R*0.38
      const rx = Math.cos(ra)*rr, rz2 = Math.sin(ra)*rr  // relative to pond center
      const rh = 0.75+reedRng()*0.65
      const reed = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, rh, 4), reedMat)
      reed.position.set(rx, rh/2, rz2); pondGrp.add(reed)
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.06, 0.18, 6), reedTopMat)
      tip.position.set(rx, rh+0.09, rz2); pondGrp.add(tip)
    }
    const lilyMat = new THREE.MeshLambertMaterial({ color: 0x2d6622 })
    for (let l = 0; l < 6; l++) {
      const la = (l/6)*Math.PI*2+0.5, lr = POND_R*0.45
      const lily = new THREE.Mesh(new THREE.CircleGeometry(0.26, 8), lilyMat)
      lily.rotation.x = -Math.PI/2; lily.position.set(Math.cos(la)*lr, 0.03, Math.sin(la)*lr)
      pondGrp.add(lily)
    }

    // ── Ducks ─────────────────────────────────────────────────────────────────
    const duckBodyMat = new THREE.MeshLambertMaterial({ color: 0xfafafa })
    const duckHeadMat = new THREE.MeshLambertMaterial({ color: 0x226622 })
    const duckBillMat = new THREE.MeshLambertMaterial({ color: 0xffaa00 })
    const DUCK_Y = 0.13
    interface DuckData { group: THREE.Group; headG: THREE.Group; x: number; z: number; angle: number; timer: number; phase: number }
    const ducks: DuckData[] = []
    const duckRng = mulberry32(999)
    for (let d = 0; d < 5; d++) {
      const g = new THREE.Group()
      // Body
      g.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.26, 0.58), duckBodyMat), { castShadow: true }))
      // Tail tuft
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.13), duckBodyMat)
      tail.position.set(0, 0.09, -0.33); tail.rotation.x = -0.38; g.add(tail)
      // Head group (for nod animation)
      const headG = new THREE.Group(); headG.position.set(0, 0.21, 0.22); g.add(headG)
      headG.add(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.20, 0.20), duckHeadMat))
      const bill = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.06, 0.16), duckBillMat)
      bill.position.set(0, -0.04, 0.16); headG.add(bill)
      const sa = (d/5)*Math.PI*2, sr = 1.0+duckRng()*1.8
      const sx = pondGrp.position.x+Math.cos(sa)*sr, sz = pondGrp.position.z+Math.sin(sa)*sr
      g.position.set(sx, DUCK_Y, sz)
      scene.add(g)
      ducks.push({ group: g, headG, x: sx, z: sz, angle: duckRng()*Math.PI*2, timer: duckRng()*2.5, phase: d*1.26 })
    }

    // ── Ball pit ──────────────────────────────────────────────────────────
    const PIT_R  = 2.2, PIT_WALL_H = 0.55
    const BALL_R = 0.14, PLAYER_R = 0.38
    interface PhysBall { mesh: THREE.Mesh; body: CANNON.Body }
    const balls: PhysBall[] = []

    // Pit walls (4 sides, low box barriers)
    const pitWallMat = new THREE.MeshLambertMaterial({ color: 0x3a5faa })
    const pitMeshes: THREE.Object3D[] = []
    const pitGrp = new THREE.Group(); pitGrp.position.set(PIT_CX, 0, PIT_CZ)
    ;[
      { w: PIT_R*2+0.18, d: 0.18, px: PIT_CX,         pz: PIT_CZ - PIT_R },
      { w: PIT_R*2+0.18, d: 0.18, px: PIT_CX,         pz: PIT_CZ + PIT_R },
      { w: 0.18, d: PIT_R*2,      px: PIT_CX - PIT_R, pz: PIT_CZ         },
      { w: 0.18, d: PIT_R*2,      px: PIT_CX + PIT_R, pz: PIT_CZ         },
    ].forEach(({ w, d, px, pz }) => {
      // Box collider for player
      boxCols.push({ x0: px - w/2, x1: px + w/2, z0: pz - d/2, z1: pz + d/2, maxY: PIT_WALL_H })
      const wm = new THREE.Mesh(new THREE.BoxGeometry(w, PIT_WALL_H, d), pitWallMat)
      wm.position.set(px, PIT_WALL_H / 2, pz); wm.castShadow = true; scene.add(wm); pitMeshes.push(wm)
      const wb = new CANNON.Body({ mass: 0 })
      wb.addShape(new CANNON.Box(new CANNON.Vec3(w/2, PIT_WALL_H/2, d/2)))
      wb.position.set(px, PIT_WALL_H / 2, pz); physWorld.addBody(wb)
    })
    // Pit floor
    const pitFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(PIT_R * 2, PIT_R * 2),
      new THREE.MeshLambertMaterial({ color: 0x4a80ee })
    )
    pitFloor.rotation.x = -Math.PI / 2
    pitFloor.position.set(PIT_CX, 0.005, PIT_CZ)
    scene.add(pitFloor); pitMeshes.push(pitFloor)

    // Fill pit with 80 physics-backed balls using InstancedMesh for visuals
    const pitBallColors = [0xff4444, 0x44cc44, 0x4488ff, 0xffcc22, 0xff44dd, 0x44ffee, 0xff8800, 0xaa44ff, 0xff9999, 0x99ff99]
    const pitBallGeo = new THREE.SphereGeometry(BALL_R, 8, 6)
    const pitRng = mulberry32(321)
    const BALL_COUNT = 80
    for (let i = 0; i < BALL_COUNT; i++) {
      const angle = pitRng() * Math.PI * 2
      const rad   = pitRng() * (PIT_R - BALL_R - 0.2)
      const px    = PIT_CX + Math.cos(angle) * rad
      const pz    = PIT_CZ + Math.sin(angle) * rad
      const color = pitBallColors[i % pitBallColors.length]
      const mesh  = new THREE.Mesh(pitBallGeo, new THREE.MeshLambertMaterial({ color }))
      mesh.castShadow = true; scene.add(mesh); pitMeshes.push(mesh)
      const body = new CANNON.Body({ mass: 0.12, linearDamping: 0.6, angularDamping: 0.6 })
      body.addShape(new CANNON.Sphere(BALL_R))
      body.position.set(px, BALL_R + 0.4 + pitRng() * 1.2, pz)
      physWorld.addBody(body)
      balls.push({ mesh, body })
    }

    // ── Trampoline ──────────────────────────────────────────────────────────────
    const TRAMP_SEGMENTS = 32
    const trampFabricMat = new THREE.MeshPhongMaterial({ color: 0x333333, shininess: 20 })
    const frameMat2 = new THREE.MeshLambertMaterial({ color: 0x888888 })
    const netMat = new THREE.MeshBasicMaterial({ color: 0x2255cc, transparent: true, opacity: 0.45, side: THREE.DoubleSide, wireframe: false })
    const trampMeshes: THREE.Object3D[] = []
    const trampGrp = new THREE.Group(); trampGrp.position.set(TRAMP_CX, 0, TRAMP_CZ)

    // Main fabric disc (dark grey)
    const trampFabric = new THREE.Mesh(
      new THREE.CylinderGeometry(TRAMP_R - 0.15, TRAMP_R - 0.15, 0.08, TRAMP_SEGMENTS),
      trampFabricMat
    )
    trampFabric.position.set(TRAMP_CX, TRAMP_Y, TRAMP_CZ)
    trampFabric.castShadow = true; scene.add(trampFabric); trampMeshes.push(trampFabric)

    // Frame ring (grey torus-like cylinder)
    const trampFrame = new THREE.Mesh(
      new THREE.TorusGeometry(TRAMP_R, 0.09, 8, TRAMP_SEGMENTS),
      frameMat2
    )
    trampFrame.rotation.x = Math.PI / 2
    trampFrame.position.set(TRAMP_CX, TRAMP_Y, TRAMP_CZ)
    scene.add(trampFrame); trampMeshes.push(trampFrame)

    // Blue net — gap on south side (+Z) where the ladder is.
    const NET_GAP = Math.PI / 3.6  // ~50° gap
    const netGeo = new THREE.CylinderGeometry(TRAMP_R + 0.05, TRAMP_R + 0.05, 1.2, TRAMP_SEGMENTS, 1, true, NET_GAP / 2, Math.PI * 2 - NET_GAP)
    const netMesh = new THREE.Mesh(netGeo, netMat)
    netMesh.position.set(TRAMP_CX, TRAMP_Y + 0.6, TRAMP_CZ)
    scene.add(netMesh); trampMeshes.push(netMesh)

    // Net support poles — 12 evenly spaced, skip gap at south (+Z, math-angle π/2)
    const LADDER_GAP_HALF = NET_GAP / 2 + 0.18
    const poleGeo = new THREE.CylinderGeometry(0.04, 0.04, TRAMP_Y + 1.2, 6)
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2
      const na = a > Math.PI ? a - Math.PI * 2 : a
      if (Math.abs(na - Math.PI / 2) < LADDER_GAP_HALF) continue
      const px = TRAMP_CX + Math.cos(a) * (TRAMP_R + 0.05)
      const pz = TRAMP_CZ + Math.sin(a) * (TRAMP_R + 0.05)
      const pole = new THREE.Mesh(poleGeo, frameMat2)
      pole.position.set(px, (TRAMP_Y + 1.2) / 2, pz)
      scene.add(pole); trampMeshes.push(pole)
    }

    // Dense rim colliders — prevent walking under trampoline; gap left at ladder (south, a≈π/2)
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2
      const na = a > Math.PI ? a - Math.PI * 2 : a
      if (Math.abs(na - Math.PI / 2) < LADDER_GAP_HALF + 0.1) continue
      const px = TRAMP_CX + Math.cos(a) * TRAMP_R
      const pz = TRAMP_CZ + Math.sin(a) * TRAMP_R
      cylCols.push({ x: px, z: pz, r: 0.42, maxY: TRAMP_Y - 0.1 })
    }

    // Leg supports — 4 legs from ground up to frame
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4
      const lx = TRAMP_CX + Math.cos(a) * TRAMP_R * 0.8
      const lz = TRAMP_CZ + Math.sin(a) * TRAMP_R * 0.8
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, TRAMP_Y, 6), frameMat2)
      leg.position.set(lx, TRAMP_Y / 2, lz)
      scene.add(leg); trampMeshes.push(leg)
    }

    // Trampoline physics platform
    const trampBody = new CANNON.Body({ mass: 0 })
    trampBody.addShape(new CANNON.Cylinder(TRAMP_R, TRAMP_R, 0.1, 16))
    trampBody.position.set(TRAMP_CX, TRAMP_Y, TRAMP_CZ)
    physWorld.addBody(trampBody)

    // ── Ladder (south side of trampoline, flush against rim) ──────────────
    const ladderMat = new THREE.MeshLambertMaterial({ color: 0x8b5e2a })
    const railGeo   = new THREE.BoxGeometry(0.07, TRAMP_Y, 0.07)
    const rungGeo   = new THREE.BoxGeometry(0.54, 0.05, 0.07)

    ;[-0.27, 0.27].forEach(ox => {
      const rail = new THREE.Mesh(railGeo, ladderMat)
      rail.position.set(LADDER_X + ox, TRAMP_Y / 2, LADDER_Z)
      scene.add(rail); trampMeshes.push(rail)
    })
    const rungCount = Math.floor(TRAMP_Y / 0.30)
    for (let i = 0; i < rungCount; i++) {
      const rung = new THREE.Mesh(rungGeo, ladderMat)
      rung.position.set(LADDER_X, 0.28 + i * (TRAMP_Y / rungCount), LADDER_Z)
      scene.add(rung); trampMeshes.push(rung)
    }

    // ── Bowling lane ──────────────────────────────────────────────────────
    const bowlMeshes: THREE.Object3D[] = []
    const bowlGrp = new THREE.Group(); bowlGrp.position.set(BOWL_CX, 0, BOWL_LANE_Z)
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

    // ── Ring toss ─────────────────────────────────────────────────────────────
    const rtossMeshes: THREE.Object3D[] = []
    const rtossGrp = new THREE.Group(); rtossGrp.position.set(RTOSS_CX, 0, (RTOSS_START_Z + RTOSS_POST_Z) / 2)
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

    // ── Register movable objects for debug editor (cabin only) ───────────────
    movablesRef.current = [
      { name: '🏕 Cabin group', group: cabGrp },
      { name: '🪜 Ramp hitbox (cabin local)', group: rampGrp, isHitbox: true },
      ...cabHitboxEntries,
      // Async-loaded items (cabin shell, switch, desk) push themselves below
    ]

    // Ring toss helpers
    function resetRingToss() {
      ringMeshes.forEach((m, i) => {
        m.visible = false
        ringBodies[i].position.set(RTOSS_CX - 0.5 + i * 0.5, 0.5 + i * 0.12, RTOSS_START_Z + 0.5)
        ringBodies[i].velocity.setZero(); ringBodies[i].angularVelocity.setZero()
        ringBodies[i].quaternion.set(0, 0, 0, 1); ringBodies[i].sleep()
      })
      rtossAimRef.current    = 0
      rtossTimerRef.current  = 0
      rPowerRef.current      = 0
      rPowerDirRef.current   = 1
      rtossThrowKeyRef.current = false
      rtossThrownRef.current = 0
    }
    function throwRing(ringIdx: number) {
      const spd = 7 + rPowerRef.current * 9
      const aim = rtossAimRef.current
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
      bowlTimerRef.current    = 0
      bowlPowerRef.current    = 0
      bowlPowerDirRef.current = 1
      bowlThrowKeyRef.current = false
    }
    function throwBowl() {
      const spd = 8 + bowlPowerRef.current * 14   // 8–22 units/s
      const aim = bowlAimRef.current
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

    // ── Player ───────────────────────────────────────────────────────────
    const skinMat  = new THREE.MeshLambertMaterial({ color:0xfcd34d })
    const shirtMat = new THREE.MeshLambertMaterial({ color:0x2563eb })
    const pantsMat = new THREE.MeshLambertMaterial({ color:0x1e3a5f })
    const shoesMat = new THREE.MeshLambertMaterial({ color:0x1a1a1a })
    const hairMat  = new THREE.MeshLambertMaterial({ color:0x3d1f00 })

    const player = new THREE.Group()
    const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.36,0.36,0.36), skinMat)
    headMesh.position.y=1.96; headMesh.castShadow=true; player.add(headMesh)
    const hairTop = new THREE.Mesh(new THREE.BoxGeometry(0.38,0.10,0.38), hairMat)
    hairTop.position.y=2.19; player.add(hairTop)
    const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.36,0.24,0.06), hairMat)
    hairBack.position.set(0,2.10,-0.18); player.add(hairBack)
    const torsoMesh = new THREE.Mesh(new THREE.BoxGeometry(0.52,0.68,0.28), shirtMat)
    torsoMesh.position.y=1.34; torsoMesh.castShadow=true; player.add(torsoMesh)

    function makeArm(side:1|-1) {
      const pivot=new THREE.Group(); pivot.position.set(side*0.37,1.62,0)
      const upper=new THREE.Mesh(new THREE.BoxGeometry(0.18,0.44,0.18), shirtMat)
      upper.position.y=-0.22; upper.castShadow=true; pivot.add(upper)
      const elbow=new THREE.Group(); elbow.position.y=-0.44
      const lower=new THREE.Mesh(new THREE.BoxGeometry(0.15,0.42,0.15), skinMat)
      lower.position.y=-0.21; lower.castShadow=true; elbow.add(lower)
      pivot.add(elbow); return { pivot, elbow }
    }
    function makeLeg(side:1|-1) {
      const pivot=new THREE.Group(); pivot.position.set(side*0.14,1.02,0)
      const thigh=new THREE.Mesh(new THREE.BoxGeometry(0.22,0.48,0.22), pantsMat)
      thigh.position.y=-0.24; thigh.castShadow=true; pivot.add(thigh)
      const knee=new THREE.Group(); knee.position.y=-0.48
      const shin=new THREE.Mesh(new THREE.BoxGeometry(0.20,0.44,0.20), pantsMat)
      shin.position.y=-0.22; shin.castShadow=true; knee.add(shin)
      const foot=new THREE.Mesh(new THREE.BoxGeometry(0.22,0.10,0.30), shoesMat)
      foot.position.set(0,-0.49,0.06); knee.add(foot)
      pivot.add(knee); return { pivot, knee }
    }
    const { pivot:lArmPivot, elbow:lElbow } = makeArm(-1)
    const { pivot:rArmPivot, elbow:rElbow } = makeArm(1)
    player.add(lArmPivot, rArmPivot)
    const { pivot:lLegPivot, knee:lKnee } = makeLeg(-1)
    const { pivot:rLegPivot, knee:rKnee } = makeLeg(1)
    player.add(lLegPivot, rLegPivot)
    player.position.set(0,0,6); scene.add(player)

    // ── Input ────────────────────────────────────────────────────────────
    const keys = new Set<string>()

    relockRef.current = () => renderer.domElement.requestPointerLock()

    function triggerFocus(id: SectionId) {
      const si = SECTIONS.findIndex(sec=>sec.id===id)
      const sg = signGroups[si]
      focusPosRef.current.set(sg.position.x, 3.8, sg.position.z+7.0)
      focusLookRef.current.set(sg.position.x, 3.8, sg.position.z)
      focusActiveRef.current=true; overlayShownRef.current=false; proxTimerRef.current=0
      document.exitPointerLock()
    }
    triggerFocusRef.current = triggerFocus

    function keyToWASD(key: string): string {
      if (key==='arrowup') return 'w'; if (key==='arrowdown') return 's'
      if (key==='arrowleft') return 'a'; if (key==='arrowright') return 'd'
      return key
    }

    const onKeyDown = (e: KeyboardEvent) => {
      // Backtick toggles debug overlay + object editor
      if (e.key === '`') {
        debugModeRef.current = !debugModeRef.current
        if (debugPanelRef.current) debugPanelRef.current.style.display = debugModeRef.current ? 'block' : 'none'
        setDebugOpen(d => !d)
        return
      }

      const mapped = keyToWASD(e.key.toLowerCase())
      keys.add(mapped)

      // Any movement key closes the sign overlay
      if (['w','a','s','d'].includes(mapped) && (focusActiveRef.current || overlayShownRef.current)) {
        exitFocus(); return
      }

      // Bowling controls take priority when active
      const bs = bowlStateRef.current
      if (bs === 'idle' && mapped === 'e' && nearBowlRef.current) {
        e.preventDefault()
        bowlStateRef.current = 'aiming'
        setBowlDisplay(p => ({ ...p, state: 'aiming', score: 0 }))
        return
      }
      if (bs === 'aiming') {
        if (e.key === 'Escape') {
          bowlThrowKeyRef.current = false
          bowlStateRef.current = 'idle'; resetBowling()
          setBowlDisplay(p => ({ ...p, state: 'idle' })); setNearBowl(false)
        }
        if (e.key === ' ' || e.key.toLowerCase() === 'e') {
          bowlThrowKeyRef.current = true  // mark that the key went down while aiming
        }
        return
      }
      if (bs === 'result') {
        if (mapped === 'e' || e.key === ' ') {
          e.preventDefault(); resetBowling(); bowlStateRef.current = 'aiming'
          setBowlDisplay(p => ({ ...p, state: 'aiming', score: 0 }))
        } else if (e.key === 'Escape') {
          resetBowling(); bowlStateRef.current = 'idle'
          setBowlDisplay(p => ({ ...p, state: 'idle' })); setNearBowl(false); nearBowlRef.current = false
        }
        return
      }

      // Bench sit/stand
      if (sittingRef.current && (mapped === 'e' || ['w','a','s','d'].includes(mapped))) {
        sittingRef.current = false; setSitting(false); nearBenchRef.current = false; setNearBench(false)
        relockRef.current?.()
        if (mapped === 'e') return
      }
      if (mapped === 'e' && nearBenchRef.current && !sittingRef.current && bowlStateRef.current === 'idle') {
        sittingRef.current = true; setSitting(true)
        document.exitPointerLock()
        return
      }

      // Ladder dismount
      if (climbingRef.current && (mapped === 'e' || e.key === 'Escape')) {
        climbingRef.current = false; setClimbing(false); nearLadderRef.current = false; setNearLadder(false)
      }
      // Ladder mount — if near ladder and pressing W
      if (!climbingRef.current && nearLadderRef.current && mapped === 'w' && bowlStateRef.current === 'idle' && rtossStateRef.current === 'idle' && !sittingRef.current) {
        climbingRef.current = true; setClimbing(true)
      }

      // Ring toss start
      if (rtossStateRef.current === 'idle' && mapped === 'e' && nearRTossRef.current) {
        e.preventDefault()
        resetRingToss(); rtossStateRef.current = 'aiming'; rtossThrownRef.current = 0
        setRTossDisplay({ state: 'aiming', thrown: 0, score: 0, hs: parseInt(localStorage.getItem('gabe-rtoss-hs') || '0') })
        return
      }
      if (rtossStateRef.current === 'aiming') {
        if (e.key === 'Escape') {
          rtossThrowKeyRef.current = false; rtossStateRef.current = 'idle'; resetRingToss()
          setRTossDisplay(p => ({ ...p, state: 'idle' })); setNearRToss(false); nearRTossRef.current = false
        }
        if (e.key === ' ' || e.key.toLowerCase() === 'e') rtossThrowKeyRef.current = true
        return
      }
      if (rtossStateRef.current === 'result') {
        if (mapped === 'e' || e.key === ' ') {
          e.preventDefault(); resetRingToss(); rtossStateRef.current = 'aiming'; rtossThrownRef.current = 0
          setRTossDisplay(p => ({ ...p, state: 'aiming', thrown: 0, score: 0 }))
        } else if (e.key === 'Escape') {
          resetRingToss(); rtossStateRef.current = 'idle'
          setRTossDisplay(p => ({ ...p, state: 'idle' })); setNearRToss(false); nearRTossRef.current = false
        }
        return
      }

      // Jump — Space when grounded and not in a mini-game
      if (e.key === ' ' && bowlStateRef.current === 'idle' && rtossStateRef.current === 'idle' && !focusActiveRef.current && !sittingRef.current) {
        jumpPressedRef.current = true
        return
      }

      // Light switch toggle
      if (mapped === 'e' && nearSwitchRef.current) {
        cabLightOnRef.current = !cabLightOnRef.current
        if (cabSpotRef.current) cabSpotRef.current.visible = cabLightOnRef.current
        return
      }

      if (mapped==='e' && !focusActiveRef.current && currentSecRef.current) {
        triggerFocus(currentSecRef.current)
      }
      if (e.key==='Escape' && (focusActiveRef.current || overlayShownRef.current)) {
        exitFocus()
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      keys.delete(keyToWASD(e.key.toLowerCase()))
      // Release Space or E while aiming → throw only if key was pressed during aiming
      if (bowlStateRef.current === 'aiming' && bowlThrowKeyRef.current && (e.key === ' ' || e.key.toLowerCase() === 'e')) {
        bowlThrowKeyRef.current = false
        throwBowl(); bowlStateRef.current = 'thrown'; bowlTimerRef.current = 0
        setBowlDisplay(p => ({ ...p, state: 'thrown' }))
      }
      // Ring toss throw on release
      if (rtossStateRef.current === 'aiming' && rtossThrowKeyRef.current && (e.key === ' ' || e.key.toLowerCase() === 'e')) {
        rtossThrowKeyRef.current = false
        throwRing(rtossThrownRef.current)
        rtossThrownRef.current++
        rtossTimerRef.current = 0
        rtossStateRef.current = 'thrown'
        setRTossDisplay(p => ({ ...p, state: 'thrown', thrown: rtossThrownRef.current }))
      }
    }
    // Clear all held keys if window loses focus (prevents stuck-key bug)
    const onBlur = () => keys.clear()

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup',   onKeyUp)
    window.addEventListener('blur',    onBlur)

    // ── Pointer lock (mouse look) ──────────────────────────────────────────
    const MOUSE_SENS = 0.0022
    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== renderer.domElement) return
      if (focusActiveRef.current || bowlStateRef.current !== 'idle') return
      camYaw   -= e.movementX * MOUSE_SENS
      camPitch  = THREE.MathUtils.clamp(camPitch + e.movementY * MOUSE_SENS, -0.55, 1.2)
    }
    const onPointerLockChange = () => {
      setPointerLocked(document.pointerLockElement === renderer.domElement)
      if (document.pointerLockElement === renderer.domElement && !musicStarted.current) {
        musicStarted.current = true
        const audio = new Audio('/audio/Space Aquarium - Lofi Study & Relaxation Music for Deep Focus.mp3')
        audio.loop = true
        audio.volume = 0.35
        audio.play().catch(() => {})
        audioRef.current = audio
      }
    }
    const onCanvasClick = () => {
      if (!focusActiveRef.current && bowlStateRef.current === 'idle') {
        renderer.domElement.requestPointerLock()
      }
    }
    renderer.domElement.addEventListener('click', onCanvasClick)
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('pointerlockchange', onPointerLockChange)

    // ── Animation ─────────────────────────────────────────────────────────
    const _tmpCam = camera.clone()
    const _mat4   = new THREE.Matrix4()
    let _nearBowl = false   // local mirror of nearBowl state for change-detection
    let animId:  number
    let elapsed  = 0
    let lastTime = performance.now()
    let walkPhase    = 0
    let swingAmt     = 0
    let camYaw       = 0    // horizontal orbit angle around player
    let camPitch     = 0.3  // vertical tilt (radians, positive = camera higher)
    let playerVelY   = 0    // vertical velocity for jump/gravity
    let fpvBlend     = 0    // 0 = third-person, 1 = first-person (inside cabin)

    function animate() {
      animId = requestAnimationFrame(animate)
      const now = performance.now()
      const delta = Math.min((now - lastTime) / 1000, 0.05)
      lastTime = now; elapsed += delta

      // ── Cannon physics step ───────────────────────────────────────────
      physWorld.step(1 / 60, delta, 3)

      // Sync pit ball meshes
      balls.forEach(b => {
        b.mesh.position.set(b.body.position.x, b.body.position.y, b.body.position.z)
        b.mesh.quaternion.set(b.body.quaternion.x, b.body.quaternion.y, b.body.quaternion.z, b.body.quaternion.w)
      })
      // Sync bowling objects
      bowlBallMesh.position.set(bowlBallBody.position.x, bowlBallBody.position.y, bowlBallBody.position.z)
      bowlBallMesh.quaternion.set(bowlBallBody.quaternion.x, bowlBallBody.quaternion.y, bowlBallBody.quaternion.z, bowlBallBody.quaternion.w)
      pinMeshes.forEach((m, i) => {
        m.position.set(pinBodies[i].position.x, pinBodies[i].position.y, pinBodies[i].position.z)
        m.quaternion.set(pinBodies[i].quaternion.x, pinBodies[i].quaternion.y, pinBodies[i].quaternion.z, pinBodies[i].quaternion.w)
      })
      ringMeshes.forEach((m, i) => {
        if (m.visible) {
          m.position.set(ringBodies[i].position.x, ringBodies[i].position.y, ringBodies[i].position.z)
          m.quaternion.set(ringBodies[i].quaternion.x, ringBodies[i].quaternion.y, ringBodies[i].quaternion.z, ringBodies[i].quaternion.w)
        }
      })

      player.visible = !focusActiveRef.current && bowlStateRef.current === 'idle' && rtossStateRef.current === 'idle'

      if (!focusActiveRef.current) {
        // ── Camera-relative WASD movement ──────────────────────────────
        const fw_x = -Math.sin(camYaw), fw_z = -Math.cos(camYaw)
        const rt_x =  Math.cos(camYaw), rt_z = -Math.sin(camYaw)
        const joyX = touchMoveRef.current.x
        const joyY = touchMoveRef.current.y
        const hasW = keys.has('w') || joyY < -0.2
        const hasS = keys.has('s') || joyY > 0.2
        const hasA = keys.has('a') || joyX < -0.2
        const hasD = keys.has('d') || joyX > 0.2

        const rawVel = new THREE.Vector3()
        if (hasW) { rawVel.x += fw_x; rawVel.z += fw_z }
        if (hasS) { rawVel.x -= fw_x; rawVel.z -= fw_z }
        if (hasA) { rawVel.x -= rt_x; rawVel.z -= rt_z }
        if (hasD) { rawVel.x += rt_x; rawVel.z += rt_z }

        const isMoving = rawVel.lengthSq() > 0
        if (isMoving && bowlStateRef.current === 'idle' && rtossStateRef.current === 'idle' && !sittingRef.current) {
          rawVel.normalize().multiplyScalar(8.5 * delta)
          player.position.x += rawVel.x
          player.position.z += rawVel.z
        }
        // Player model always faces camera forward direction
        player.rotation.y = lerpAngle(player.rotation.y, camYaw + Math.PI, 0.14)
        player.position.x = THREE.MathUtils.clamp(player.position.x, -41, 41)
        player.position.z = THREE.MathUtils.clamp(player.position.z, -91, 17)

        // ── Jump / gravity ────────────────────────────────────────────
        if (bowlStateRef.current === 'idle' && rtossStateRef.current === 'idle' && !sittingRef.current && !climbingRef.current) {
          // Trampoline surface
          const td = Math.hypot(player.position.x - TRAMP_CX, player.position.z - TRAMP_CZ)
          const onTrampSurface = td < TRAMP_R - 0.2 && player.position.y >= TRAMP_Y - 0.15 && player.position.y <= TRAMP_Y + 0.3

          // Process jump input
          if (jumpPressedRef.current) {
            jumpPressedRef.current = false
            if (player.position.y <= 0.15 || onRampRef.current || onFloorRef.current) {
              playerVelY = 6.5
            }
          }

          // Apply gravity
          playerVelY -= 18 * delta

          // Update vertical position
          player.position.y += playerVelY * delta

          // Trampoline bounce
          if (onTrampSurface && playerVelY < 0) {
            player.position.y = TRAMP_Y
            playerVelY = 10.0  // strong bounce
          }

          // Player standing still on trampoline (not bouncing)
          if (onTrampSurface && playerVelY >= 0 && player.position.y < TRAMP_Y + 0.05) {
            player.position.y = TRAMP_Y
          }

          // Cabin stair ramp — world position via getWorldPosition, slope from rotation.z
          // cabGrp.rotation.y=1.5π maps local+X → world+Z, so high end is at larger world Z
          onRampRef.current = false
          {
            const rMesh = (rampGrp as any).__hitMesh as THREE.Mesh | undefined
            if (rMesh) {
              const rc = new THREE.Vector3(); rampGrp.getWorldPosition(rc)
              const halfLen = 0.9 * rMesh.scale.x   // half of 1.8 width, along world Z
              const halfW   = 1.0 * rMesh.scale.z   // half of 2.0 depth, along world X
              const slope   = Math.tan(Math.abs(rampGrp.rotation.z))
              const zNear   = rc.z - halfLen         // small Z — low end (away from cabin)
              const zFar    = rc.z + halfLen         // large Z — high end (toward cabin floor)
              const yLow    = rc.y - halfLen * slope
              const yHigh   = rc.y + halfLen * slope
              if (
                player.position.x > rc.x - halfW && player.position.x < rc.x + halfW &&
                player.position.z > zNear && player.position.z < zFar
              ) {
                const t = (player.position.z - zNear) / (zFar - zNear)
                const surfaceY = yLow + t * (yHigh - yLow)
                if (surfaceY > -0.1 && player.position.y < surfaceY) {
                  player.position.y = surfaceY
                  if (playerVelY < 0) playerVelY = 0
                  onRampRef.current = true
                }
              }
            }
          }

          // Elevated cabin floor — surface support (like ground clamp but at floor height)
          onFloorRef.current = false
          movablesRef.current.forEach(m => {
            if (!m.isHitbox || !m.name.includes('Floor')) return
            const mesh = (m.group as any).__hitMesh as THREE.Mesh | undefined
            if (!mesh) return
            mesh.updateMatrixWorld(true)
            const wb = new THREE.Box3().setFromObject(mesh)
            const inXZ = player.position.x > wb.min.x && player.position.x < wb.max.x &&
                         player.position.z > wb.min.z && player.position.z < wb.max.z
            if (inXZ && player.position.y <= wb.max.y && player.position.y > wb.max.y - 1.2) {
              player.position.y = wb.max.y
              if (playerVelY < 0) playerVelY = 0
              onFloorRef.current = true
            }
          })

          // Ground clamp (only when not on trampoline)
          if (player.position.y <= 0 && !onTrampSurface) {
            player.position.y = 0
            if (playerVelY < 0) playerVelY = 0
          }
        } else if (!climbingRef.current) {
          // Reset gravity state when in mini-game
          playerVelY = 0
        }

        // Walk animation with smooth ramp
        swingAmt = THREE.MathUtils.clamp(swingAmt + (isMoving ? 1 : -1) * delta * 8, 0, 1)
        if (isMoving) walkPhase += delta * 6.5
        const sw = Math.sin(walkPhase) * swingAmt * 0.55
        lArmPivot.rotation.x =  sw; rArmPivot.rotation.x = -sw
        lLegPivot.rotation.x = -sw; rLegPivot.rotation.x =  sw
        lKnee.rotation.x = Math.max(0, -Math.sin(walkPhase)) * swingAmt * 0.40
        rKnee.rotation.x = Math.max(0,  Math.sin(walkPhase)) * swingAmt * 0.40
        lElbow.rotation.x = swingAmt * 0.15; rElbow.rotation.x = swingAmt * 0.15

        // ── Camera (third-person) ─────────────────────────────────────────
        fpvBlend = 0
        player.visible = true

        const HEAD_H = 1.65
        const camDist = 5.2
        const minPitch = Math.asin(Math.max(-1, (0.3 - player.position.y - 1.2) / camDist))
        camPitch = Math.max(camPitch, minPitch)

        const tpTarget = new THREE.Vector3(
          player.position.x + Math.sin(camYaw) * Math.cos(camPitch) * camDist,
          player.position.y + Math.sin(camPitch) * camDist + 1.2,
          player.position.z + Math.cos(camYaw) * Math.cos(camPitch) * camDist,
        )
        const fpTarget = new THREE.Vector3(player.position.x, player.position.y + HEAD_H, player.position.z)
        camera.position.lerp(tpTarget.lerp(fpTarget, fpvBlend), fpvBlend > 0.5 ? 0.25 : 0.15)

        if (fpvBlend < 0.8) {
          camera.lookAt(player.position.x, player.position.y + 1.0, player.position.z)
        } else {
          camera.lookAt(
            player.position.x - Math.sin(camYaw) * 10,
            player.position.y + HEAD_H + Math.sin(camPitch) * 0.5,
            player.position.z - Math.cos(camYaw) * 10,
          )
        }

        // Proximity to signs (reads live group positions so editor moves work)
        let nearest: SectionId | null = null, nearDist = PROX
        SECTIONS.forEach(({ id }, si) => {
          const sg = signGroups[si]
          const d = Math.hypot(player.position.x - sg.position.x, player.position.z - sg.position.z)
          if (d < nearDist) { nearDist = d; nearest = id }
        })

        if (nearest !== currentSecRef.current) {
          // Player moved to a different area — reset exit cooldown so the new sign can trigger
          currentSecRef.current = nearest
          exitedRef.current = false
          setNearSign(nearest !== null)
          proxTimerRef.current = 0
        }

        // Only auto-trigger if player hasn't just dismissed this sign
        if (nearest && !exitedRef.current) {
          proxTimerRef.current += delta
          if (proxTimerRef.current > 2.2) triggerFocus(nearest)
        }

        // Progress ring — follows current sign, fills over 2.2 s
        if (nearest && !exitedRef.current && proxTimerRef.current > 0) {
          const si = SECTIONS.findIndex(s => s.id === nearest)
          ringLine.position.set(signGroups[si].position.x, 0, signGroups[si].position.z)
          ringLine.visible = true
          ringGeo.setDrawRange(0, Math.ceil((RING_SEGS + 1) * Math.min(proxTimerRef.current / 2.2, 1)))
        } else {
          ringLine.visible = false
          ringGeo.setDrawRange(0, 0)
        }

        // Player nudges pit balls
        balls.forEach(b => {
          const pdx = b.body.position.x - player.position.x
          const pdz = b.body.position.z - player.position.z
          const pd  = Math.sqrt(pdx * pdx + pdz * pdz)
          if (pd < PLAYER_R + BALL_R + 0.02 && pd > 0.01) {
            const nx = pdx / pd, nz = pdz / pd
            b.body.velocity.x = nx * 3.5; b.body.velocity.z = nz * 3.5; b.body.velocity.y = 0.3
            b.body.position.x = player.position.x + nx * (PLAYER_R + BALL_R + 0.04)
            b.body.position.z = player.position.z + nz * (PLAYER_R + BALL_R + 0.04)
            b.body.wakeUp()
          }
        })

        // ── Bench proximity & sit ─────────────────────────────────────────────
        if (!sittingRef.current) {
          let nearB = false
          BENCH_POSITIONS.forEach((b, i) => {
            if (Math.hypot(player.position.x - b.x, player.position.z - b.z) < BENCH_PROX) {
              nearB = true; seatIdxRef.current = i
            }
          })
          if (nearB !== nearBenchRef.current) { nearBenchRef.current = nearB; setNearBench(nearB) }
        } else {
          // Lock player to bench
          const s = BENCH_POSITIONS[seatIdxRef.current]
          // y=-0.46 so hip (local y≈1.0) sits at bench top (y=0.54)
          player.position.set(s.x, -0.46, s.z)
          // Face toward fire
          player.rotation.y = Math.atan2(FIRE_POS.x - s.x, FIRE_POS.z - s.z)
          // Sitting pose
          lLegPivot.rotation.x = -Math.PI / 2.8; rLegPivot.rotation.x = -Math.PI / 2.8
          lKnee.rotation.x = Math.PI / 2.0;      rKnee.rotation.x = Math.PI / 2.0
          lArmPivot.rotation.x = 0.1;            rArmPivot.rotation.x = 0.1
          // Camera: sit behind player looking at fire
          const bFireLook = new THREE.Vector3(FIRE_POS.x, 0.7, FIRE_POS.z)
          const bCamPos   = new THREE.Vector3(s.x - (FIRE_POS.x - s.x) * 0.5, 1.8, s.z - (FIRE_POS.z - s.z) * 0.5)
          camera.position.lerp(bCamPos, 0.07)
          camera.lookAt(bFireLook)
        }

        // ── Ladder proximity & climb ─────────────────────────────────────────
        const ladderDist = Math.hypot(player.position.x - LADDER_X, player.position.z - LADDER_Z)
        if (!climbingRef.current) {
          const nearL = ladderDist < LADDER_PROX && bowlStateRef.current === 'idle' && rtossStateRef.current === 'idle' && !sittingRef.current
          if (nearL !== nearLadderRef.current) { nearLadderRef.current = nearL; setNearLadder(nearL) }
        } else {
          player.position.x = THREE.MathUtils.lerp(player.position.x, LADDER_X, 0.2)
          player.position.z = THREE.MathUtils.lerp(player.position.z, LADDER_Z, 0.2)
          playerVelY = 0
          if (keys.has('w')) player.position.y = Math.min(TRAMP_Y + 0.1, player.position.y + 3.0 * delta)
          if (keys.has('s')) player.position.y = Math.max(0, player.position.y - 3.0 * delta)
          if (player.position.y >= TRAMP_Y) {
            climbingRef.current = false; setClimbing(false)
            player.position.x = TRAMP_CX; player.position.z = TRAMP_CZ
          }
          if (player.position.y <= 0) { climbingRef.current = false; setClimbing(false) }
        }

        // ── Player collision resolution ───────────────────────────────────────
        if (!sittingRef.current && !climbingRef.current) {
          const PR = PLAYER_R
          cylCols.forEach(c => {
            if (c.maxY !== undefined && player.position.y >= c.maxY) return
            const dx = player.position.x - c.x
            const dz = player.position.z - c.z
            const dist = Math.sqrt(dx * dx + dz * dz)
            const minD = PR + c.r
            if (dist < minD && dist > 0.001) {
              const nx = dx / dist, nz = dz / dist
              player.position.x = c.x + nx * minD
              player.position.z = c.z + nz * minD
            }
          })
          boxCols.forEach(b => {
            if (player.position.y >= b.maxY) return  // player jumped over the wall
            const cx = THREE.MathUtils.clamp(player.position.x, b.x0, b.x1)
            const cz = THREE.MathUtils.clamp(player.position.z, b.z0, b.z1)
            const dx = player.position.x - cx
            const dz = player.position.z - cz
            const dist = Math.sqrt(dx * dx + dz * dz)
            if (dist < PR && dist > 0.001) {
              const nx = dx / dist, nz = dz / dist
              player.position.x = cx + nx * PR
              player.position.z = cz + nz * PR
            } else if (dist === 0) {
              player.position.x += PR
            }
          })
          // Dynamic collision from visible hitbox planes (walls only — ramp/floor handled separately)
          movablesRef.current.forEach(m => {
            if (!m.isHitbox) return
            if (m.name.includes('Ramp') || m.name.includes('Floor')) return
            const mesh = (m.group as any).__hitMesh as THREE.Mesh | undefined
            if (!mesh) return
            mesh.updateMatrixWorld(true)
            const wb = new THREE.Box3().setFromObject(mesh)
            if (player.position.y >= wb.max.y) return
            const cx = THREE.MathUtils.clamp(player.position.x, wb.min.x, wb.max.x)
            const cz = THREE.MathUtils.clamp(player.position.z, wb.min.z, wb.max.z)
            const dx = player.position.x - cx
            const dz = player.position.z - cz
            const dist = Math.sqrt(dx * dx + dz * dz)
            if (dist < PR && dist > 0.001) {
              const nx = dx / dist, nz = dz / dist
              player.position.x = cx + nx * PR
              player.position.z = cz + nz * PR
            } else if (dist === 0) {
              player.position.x += PR
            }
          })
        }

        // ── Ring toss proximity & state machine ───────────────────────────────
        const rDist = Math.hypot(player.position.x - RTOSS_CX, player.position.z - RTOSS_START_Z)
        const newNearRToss = rtossStateRef.current === 'idle' && rDist < RTOSS_PROX
        if (newNearRToss !== nearRTossRef.current) { nearRTossRef.current = newNearRToss; setNearRToss(newNearRToss) }

        if (rtossStateRef.current === 'aiming' || rtossStateRef.current === 'thrown' || rtossStateRef.current === 'result') {
          const rAim = rtossAimRef.current
          if (rtossStateRef.current === 'aiming') {
            if (keys.has('a') || touchMoveRef.current.x < -0.2) rtossAimRef.current = THREE.MathUtils.clamp(rtossAimRef.current - delta * 1.2, -0.4, 0.4)
            if (keys.has('d') || touchMoveRef.current.x > 0.2)  rtossAimRef.current = THREE.MathUtils.clamp(rtossAimRef.current + delta * 1.2, -0.4, 0.4)
            rPowerRef.current += delta * rPowerDirRef.current * 1.4
            if (rPowerRef.current >= 1) { rPowerRef.current = 1; rPowerDirRef.current = -1 }
            if (rPowerRef.current <= 0) { rPowerRef.current = 0; rPowerDirRef.current =  1 }
            if (rPowerBarRef.current) rPowerBarRef.current.style.width = `${rPowerRef.current * 100}%`
          }
          if (rtossStateRef.current === 'thrown') {
            rtossTimerRef.current += delta
            if (rtossTimerRef.current > 3.0) {
              if (rtossThrownRef.current >= RTOSS_RINGS) {
                // All rings thrown — score
                const sc = countRingers()
                const hs = Math.max(sc, parseInt(localStorage.getItem('gabe-rtoss-hs') || '0'))
                localStorage.setItem('gabe-rtoss-hs', String(hs))
                rtossStateRef.current = 'result'
                setRTossDisplay({ state: 'result', thrown: rtossThrownRef.current, score: sc, hs })
              } else {
                // More rings to throw
                rtossStateRef.current = 'aiming'
                rtossTimerRef.current = 0
                rPowerRef.current = 0; rPowerDirRef.current = 1; rtossThrowKeyRef.current = false
                setRTossDisplay(p => ({ ...p, state: 'aiming' }))
              }
            }
          }
          // Camera toward post
          if (rtossStateRef.current === 'result') {
            camera.position.lerp(new THREE.Vector3(RTOSS_CX, 2.2, RTOSS_START_Z + 2.0), 0.07)
            camera.lookAt(RTOSS_CX, 0.4, RTOSS_POST_Z)
          } else {
            camera.position.lerp(new THREE.Vector3(RTOSS_CX, 1.55, RTOSS_START_Z + 0.2), 0.18)
            camera.lookAt(RTOSS_CX + Math.sin(rAim) * 8, 0.5, RTOSS_POST_Z)
          }
          player.position.set(RTOSS_CX, 0, RTOSS_START_Z + 1.5)
          player.rotation.y = Math.PI
        }

        // ── Light switch proximity ────────────────────────────────────
        if (switchNodeRef.current) {
          const swWorld = new THREE.Vector3()
          switchNodeRef.current.getWorldPosition(swWorld)
          const swDist = Math.hypot(player.position.x - swWorld.x, player.position.z - swWorld.z)
          const newNear = swDist < 1.6
          if (newNear !== nearSwitchRef.current) { nearSwitchRef.current = newNear; setNearSwitch(newNear) }
        }

        // ── Bowling proximity & state machine ──────────────────────────
        const bowlDist = Math.hypot(player.position.x - BOWL_CX, player.position.z - BOWL_START_Z)
        const newNearBowl = bowlStateRef.current === 'idle' && bowlDist < BOWL_PROX
        if (newNearBowl !== _nearBowl) { _nearBowl = newNearBowl; nearBowlRef.current = newNearBowl; setNearBowl(newNearBowl) }

        if (bowlStateRef.current === 'thrown') {
          bowlTimerRef.current += delta
          if (bowlTimerRef.current > 4.5) {
            const knocked = countKnockedPins()
            const score   = knocked
            const newHS   = Math.max(score, bowlHSRef.current)
            if (newHS > bowlHSRef.current) {
              bowlHSRef.current = newHS
              localStorage.setItem('gabe-bowl-hs', String(newHS))
            }
            bowlStateRef.current = 'result'
            setBowlDisplay({ state: 'result', score, hs: newHS })
          }
        }

        // Bowling — override normal follow when active
        if (bowlStateRef.current === 'aiming' || bowlStateRef.current === 'thrown' || bowlStateRef.current === 'result') {
          const aim = bowlAimRef.current
          if (bowlStateRef.current === 'aiming') {
            if (keys.has('a') || touchMoveRef.current.x < -0.2) bowlAimRef.current = THREE.MathUtils.clamp(bowlAimRef.current - delta * 1.2, -0.45, 0.45)
            if (keys.has('d') || touchMoveRef.current.x > 0.2)  bowlAimRef.current = THREE.MathUtils.clamp(bowlAimRef.current + delta * 1.2, -0.45, 0.45)
            // Power bar oscillation
            bowlPowerRef.current += delta * bowlPowerDirRef.current * 1.4
            if (bowlPowerRef.current >= 1) { bowlPowerRef.current = 1; bowlPowerDirRef.current = -1 }
            if (bowlPowerRef.current <= 0) { bowlPowerRef.current = 0; bowlPowerDirRef.current =  1 }
            if (powerBarRef.current) powerBarRef.current.style.width = `${bowlPowerRef.current * 100}%`
          }
          // Aim arrow — visible only while aiming, rotates with aim
          aimArrow.visible = bowlStateRef.current === 'aiming'
          aimArrow.rotation.y = -bowlAimRef.current

          // First-person camera during aiming/thrown; overview on result
          if (bowlStateRef.current === 'result') {
            camera.position.lerp(new THREE.Vector3(BOWL_CX, 2.4, BOWL_START_Z + 2.2), 0.07)
            camera.lookAt(BOWL_CX, 0.3, BOWL_PINS_Z - PIN_ROW_D * 1.5)
          } else {
            camera.position.lerp(new THREE.Vector3(BOWL_CX, 1.55, BOWL_START_Z + 0.2), 0.18)
            camera.lookAt(BOWL_CX + Math.sin(aim) * 10, 0.35, BOWL_PINS_Z - PIN_ROW_D)
          }
          player.position.set(BOWL_CX, 0, BOWL_START_Z + 1.5)
          player.rotation.y = Math.PI
        }
      } else {
        // ── Cinematic: glide camera to sign ────────────────────────────
        camera.position.lerp(focusPosRef.current, 0.042)
        _tmpCam.position.copy(camera.position); _tmpCam.lookAt(focusLookRef.current)
        camera.quaternion.slerp(_tmpCam.quaternion, 0.062)

        if (!overlayShownRef.current && camera.position.distanceTo(focusPosRef.current) < 0.6) {
          overlayShownRef.current = true
          setActiveSection(currentSecRef.current)
        }
      }

      // ── Campfire animation (always) ───────────────────────────────────
      const flameG = 0.32 + Math.sin(elapsed*7)*0.10 + Math.sin(elapsed*13)*0.06
      flameMat.color.setRGB(1, flameG, 0)
      flameMesh.rotation.y = elapsed * 2.5
      flameMesh.scale.y    = 1 + Math.sin(elapsed*9)*0.08 + Math.sin(elapsed*14)*0.04
      innerFlameMesh.rotation.y = -elapsed * 3.5
      innerFlameMesh.scale.y    = 1 + Math.sin(elapsed*11+1)*0.12
      fireLight.intensity  = 1.4 + Math.sin(elapsed*7)*0.35 + Math.sin(elapsed*17)*0.18

      // ── Fireflies ─────────────────────────────────────────────────────
      ffData.forEach((f, i) => {
        _mat4.makeTranslation(
          f.bx + Math.sin(elapsed*f.sp + f.ph) * f.am,
          f.by + Math.sin(elapsed*f.sp*1.3 + f.ph) * 0.5,
          f.bz + Math.cos(elapsed*f.sp*0.8 + f.ph) * f.am * 0.7,
        )
        ffMesh.setMatrixAt(i, _mat4)
      })
      ffMesh.instanceMatrix.needsUpdate = true

      // ── Duck animation ──────────────────────────────────────────────────
      ducks.forEach(duck => {
        duck.timer -= delta
        if (duck.timer <= 0) {
          const ddx = pondGrp.position.x - duck.x, ddz = pondGrp.position.z - duck.z
          if (Math.hypot(ddx, ddz) > 4.8) {
            // Steer back toward pond
            duck.angle = Math.atan2(ddz, ddx) + (Math.random()-0.5)*0.7
          } else {
            duck.angle += (Math.random()-0.5)*Math.PI*0.75
          }
          duck.timer = 1.8 + Math.random()*3.0
        }
        duck.x += Math.cos(duck.angle) * 0.7 * delta
        duck.z += Math.sin(duck.angle) * 0.7 * delta
        // Waddle bob
        const bob = Math.abs(Math.sin(elapsed*5.5 + duck.phase)) * 0.022
        duck.group.position.set(duck.x, DUCK_Y + bob, duck.z)
        // Face direction of travel (local +Z = forward)
        duck.group.rotation.y = Math.PI/2 - duck.angle
        // Head nod
        duck.headG.rotation.x = Math.sin(elapsed*5.5 + duck.phase) * 0.13
      })

      // ── Cabin door auto-open ──────────────────────────────────────────────
      if (doorPivotRef.current) {
        const cx = cabGrp.position.x, cz = cabGrp.position.z
        const doorWorldZ = cz - CD/2   // door faces south after 180° rotation
        const nearDoor = Math.hypot(player.position.x - cx, player.position.z - doorWorldZ) < 2.8
        doorOpenRef.current = nearDoor
        const targetRot = nearDoor ? -Math.PI * 0.72 : 0
        doorRotRef.current = THREE.MathUtils.lerp(doorRotRef.current, targetRot, delta * 4)
        doorPivotRef.current.rotation.y = doorRotRef.current
      }


      // ── Debug panel live update ─────────────────────────────────────────
      if (debugModeRef.current && debugPanelRef.current) {
        const p = player.position
        const yawDeg = ((camYaw * 180 / Math.PI) % 360).toFixed(1)
        debugPanelRef.current.textContent = [
          '=== DEBUG (` to close) ===',
          `Player:      (${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)})  yaw: ${yawDeg}°`,
          '',
          'GAMES',
          `  Bowling:      center(${BOWL_CX}, 0, ${BOWL_LANE_Z})  z: ${BOWL_START_Z}..${BOWL_PINS_Z}`,
          `  Ring Toss:    center(${RTOSS_CX}, 0, ${(RTOSS_START_Z+RTOSS_POST_Z)/2})  z: ${RTOSS_START_Z}..${RTOSS_POST_Z}`,
          `  Ball Pit:     center(${PIT_CX}, 0, ${PIT_CZ})  r: 2.2  wall h: 0.55`,
          `  Trampoline:   center(${TRAMP_CX}, ${TRAMP_Y}, ${TRAMP_CZ})  r: ${TRAMP_R}  surface y: ${TRAMP_Y}`,
          `  Ladder:       (${LADDER_X.toFixed(2)}, 0, ${LADDER_Z})  prox: ${LADDER_PROX}`,
          '',
          'STRUCTURES',
          `  Cabin:        center(${CABIN_X}, 0, ${CABIN_Z})  w:7 d:5.5 h:3.2`,
          `  Pond:         center(${POND_X}, 0, ${POND_Z})  r: ${POND_R}`,
          `  Campfire:     (${FIRE_POS.x}, 0, ${FIRE_POS.z})`,
          '',
          'SIGNS  (prox: ${PROX})',
          ...SECTIONS.map(s => `  ${s.label.padEnd(14)} (${s.wx}, ${s.wz})`),
          '',
          'WORLD BOUNDS',
          '  x: -42 .. 42   z: -92 .. 18',
        ].join('\n')
      }

      renderer.render(scene, camera)
    }
    animate()

    const onResize = () => {
      const w=mount.clientWidth, h=mount.clientHeight
      camera.aspect=w/h; camera.updateProjectionMatrix(); renderer.setSize(w,h)
    }
    window.addEventListener('resize', onResize)

    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
      cancelAnimationFrame(animId)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup',   onKeyUp)
      window.removeEventListener('blur',    onBlur)
      window.removeEventListener('resize',  onResize)
      renderer.domElement.removeEventListener('click', onCanvasClick)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('pointerlockchange', onPointerLockChange)
      if (document.pointerLockElement === renderer.domElement) document.exitPointerLock()
      audioRef.current?.pause()
      renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
      // Remove all cannon bodies
      while (physWorld.bodies.length > 0) physWorld.removeBody(physWorld.bodies[0])
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="fixed inset-0 w-screen overflow-hidden overscroll-none touch-none"
      style={{ height: '100dvh', paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div ref={mountRef} className="w-full h-full touch-none" />

      {/* Click-to-look prompt — desktop only, idle state */}
      {!pointerLocked && !activeSection && bowlDisplay.state === 'idle' && !sitting && (
        <div className="hidden md:flex absolute inset-0 items-center justify-center pointer-events-none">
          <div className="bg-black/50 backdrop-blur-sm text-white text-sm px-5 py-2 rounded-full opacity-70">
            Click to look around
          </div>
        </div>
      )}

      {/* Back button — always visible */}
      <button
        onClick={onExit}
        className="absolute left-4 z-10 px-4 py-2 bg-black/75 backdrop-blur-sm text-white border border-white/30 rounded-full font-bold text-sm hover:bg-white hover:text-black transition-colors duration-300"
        style={{ top: 'calc(env(safe-area-inset-top) + 1rem)' }}
      >
        ← 2D View
      </button>

      {/* Player-position debug pre — updated directly in animate loop */}
      <pre
        ref={debugPanelRef}
        style={{ display: 'none' }}
        className="absolute z-20 left-4 bottom-4 text-xs text-green-300 bg-black/80 rounded-lg p-3 leading-5 pointer-events-none font-mono whitespace-pre"
      />

      {/* Object editor panel */}
      {debugOpen && (
        <div className="absolute z-20 right-4 top-4 bottom-4 w-64 bg-black/90 backdrop-blur-sm rounded-xl border border-white/20 text-white text-sm flex flex-col overflow-hidden select-none">
          <div className="px-3 py-2 border-b border-white/10 flex justify-between items-center shrink-0">
            <span className="font-bold text-xs tracking-wide">OBJECT EDITOR  <span className="text-white/40 font-normal">(` to close)</span></span>
          </div>

          {/* Object list */}
          <div className="overflow-y-auto flex-1 p-2 flex flex-col gap-1">
            {movablesRef.current.map((m, i) => (
              <button
                key={i}
                onClick={() => { setDebugSel(i); setSelPos({ x: m.group.position.x, y: m.group.position.y, z: m.group.position.z }) }}
                className={`text-left px-2 py-1.5 rounded-lg text-xs transition-colors ${debugSel === i ? 'bg-blue-600' : 'bg-white/10 hover:bg-white/20'}`}
              >
                <span className="font-medium">{m.name}</span>
                <span className="block text-white/50 font-mono">
                  x={m.group.position.x.toFixed(1)}  y={m.group.position.y.toFixed(1)}  z={m.group.position.z.toFixed(1)}
                </span>
              </button>
            ))}
          </div>

          {/* Move controls */}
          {debugSel >= 0 && movablesRef.current[debugSel] && (() => {
            const snap = () => {
              const m = movablesRef.current[debugSel]
              setSelPos({ x: m.group.position.x, y: m.group.position.y, z: m.group.position.z })
              setSelRot({ x: m.group.rotation.x, y: m.group.rotation.y, z: m.group.rotation.z })
            }
            const syncHitMesh = (m: typeof movablesRef.current[0]) => {
              const mesh = (m.group as any).__hitMesh as THREE.Mesh | undefined
              if (mesh) {
                mesh.position.copy(m.group.position)
                mesh.rotation.copy(m.group.rotation)
              }
            }
            const move = (dx: number, dz: number) => {
              const m = movablesRef.current[debugSel]
              m.group.position.x += dx; m.group.position.z += dz
              m.meshes?.forEach(obj => { obj.position.x += dx; obj.position.z += dz })
              syncHitMesh(m); snap()
            }
            const moveY = (dy: number) => {
              const m = movablesRef.current[debugSel]
              m.group.position.y += dy
              m.meshes?.forEach(obj => { obj.position.y += dy })
              syncHitMesh(m); snap()
            }
            const rotate = (axis: 'x' | 'y' | 'z', deg: number) => {
              const m = movablesRef.current[debugSel]
              m.group.rotation[axis] += deg * Math.PI / 180
              syncHitMesh(m); snap()
            }
            return (
              <div className="p-3 border-t border-white/10 shrink-0 overflow-y-auto">
                <div className="text-xs text-white/50 mb-1 font-mono leading-tight">
                  {selPos ? `pos  x=${selPos.x.toFixed(2)} y=${selPos.y.toFixed(2)} z=${selPos.z.toFixed(2)}` : ''}
                </div>
                <div className="text-xs text-white/40 mb-2 font-mono leading-tight">
                  {selRot ? `rot  x=${(selRot.x*180/Math.PI).toFixed(1)}° y=${(selRot.y*180/Math.PI).toFixed(1)}° z=${(selRot.z*180/Math.PI).toFixed(1)}°` : ''}
                </div>
                {/* Step size */}
                <div className="flex gap-1 mb-2">
                  {[0.1, 0.25, 0.5, 1, 2, 5].map(s => (
                    <button key={s} onClick={() => setDebugStep(s)}
                      className={`flex-1 text-xs py-0.5 rounded ${debugStep === s ? 'bg-blue-500' : 'bg-white/15 hover:bg-white/30'}`}>
                      {s}
                    </button>
                  ))}
                </div>
                {/* Y axis */}
                <div className="flex gap-1 mb-1">
                  {[-1, -0.25, +0.25, +1].map(d => (
                    <button key={d} onClick={() => moveY(d * debugStep)}
                      className="flex-1 text-xs py-1 rounded bg-white/15 hover:bg-white/35 active:bg-white/60 font-mono">
                      Y{d > 0 ? `+${d}` : d}
                    </button>
                  ))}
                </div>
                {/* XZ direction grid */}
                <div className="grid grid-cols-3 gap-1 mb-2">
                  {([
                    ['↖',-1,-1],['↑',0,-1],['↗',1,-1],
                    ['←',-1, 0],['·',0, 0],['→',1, 0],
                    ['↙',-1, 1],['↓',0, 1],['↘',1, 1],
                  ] as [string,number,number][]).map(([lbl,dx,dz],i) => (
                    <button key={i} onClick={() => lbl !== '·' && move(dx*debugStep, dz*debugStep)}
                      className={`py-1 text-sm rounded ${lbl==='·' ? 'opacity-0 pointer-events-none' : 'bg-white/15 hover:bg-white/35 active:bg-white/60'}`}>
                      {lbl}
                    </button>
                  ))}
                </div>

                {/* Rotation controls */}
                <div className="mt-1 pt-2 border-t border-white/10">
                  <div className="text-xs text-white/50 mb-1">Rotation (°)</div>
                  {(['x','y','z'] as const).map(axis => (
                    <div key={axis} className="flex gap-1 mb-1 items-center">
                      <span className="text-xs text-white/50 w-4 font-mono uppercase">{axis}</span>
                      {[-45, -15, -5, +5, +15, +45].map(d => (
                        <button key={d} onClick={() => rotate(axis, d)}
                          className="flex-1 text-xs py-0.5 rounded bg-white/15 hover:bg-white/35 active:bg-white/60 font-mono">
                          {d > 0 ? `+${d}` : d}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>

                {/* Per-axis size controls for hitbox planes */}
                {movablesRef.current[debugSel]?.isHitbox && (() => {
                  const mesh = (movablesRef.current[debugSel].group as any).__hitMesh as THREE.Mesh | undefined
                  if (!mesh) return null
                  const bump = (axis: 'x'|'y'|'z', d: number) => {
                    mesh.scale[axis] = Math.max(0.05, mesh.scale[axis] + d)
                    setSelPos(p => p ? { ...p } : { x: 0, y: 0, z: 0 })
                  }
                  const labels = { x: 'W', y: 'H', z: 'D' } as const
                  return (
                    <div className="mt-2 pt-2 border-t border-white/10">
                      <div className="text-xs text-white/50 mb-1">Size (W / H / D)</div>
                      {(['x','y','z'] as const).map(ax => (
                        <div key={ax} className="flex gap-1 mb-1 items-center">
                          <span className="text-xs text-white/50 w-4 font-mono">{labels[ax]}</span>
                          <span className="text-xs text-white/70 font-mono w-8 text-right">{mesh.scale[ax].toFixed(2)}</span>
                          {[-2, -0.5, -0.25, -0.1, +0.1, +0.25, +0.5, +2].map(d => (
                            <button key={d} onClick={() => bump(ax, d)}
                              className="flex-1 text-xs py-0.5 rounded bg-white/15 hover:bg-white/35 active:bg-white/60 font-mono">
                              {d > 0 ? `+${d}` : d}
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  )
                })()}

                {/* Uniform scale controls for non-hitbox objects */}
                {movablesRef.current[debugSel]?.scaleObj && (() => {
                  const sc = movablesRef.current[debugSel].scaleObj!
                  const applyScale = (delta: number) => {
                    const next = Math.max(0.05, parseFloat((sc.scale.x + delta).toFixed(3)))
                    sc.scale.setScalar(next)
                    setSelPos(p => p ? { ...p } : { x: 0, y: 0, z: 0 })
                  }
                  return (
                    <div className="mt-2 pt-2 border-t border-white/10">
                      <div className="text-xs text-white/50 mb-1">
                        Scale: <span className="text-white font-mono">{sc.scale.x.toFixed(3)}</span>
                      </div>
                      <div className="flex gap-1">
                        {[-0.1, -0.05, +0.05, +0.1].map(d => (
                          <button key={d} onClick={() => applyScale(d)}
                            className="flex-1 text-xs py-1 rounded bg-white/15 hover:bg-white/35 active:bg-white/60 font-mono">
                            {d > 0 ? `+${d}` : d}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })()}
              </div>
            )
          })()}

          {/* Copy button */}
          <div className="p-3 border-t border-white/10 shrink-0">
            <button
              onClick={() => {
                const r2d = (r: number) => (r * 180 / Math.PI).toFixed(1)
                const lines = movablesRef.current.map(m => {
                  const p = m.group.position, rot = m.group.rotation
                  const base = `${m.name}: pos(${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)})`
                  if (!m.isHitbox) return base
                  const rotStr = `rot(${r2d(rot.x)}°, ${r2d(rot.y)}°, ${r2d(rot.z)}°)`
                  const mesh = (m.group as any).__hitMesh as THREE.Mesh | undefined
                  const scStr = mesh ? `  size(${mesh.scale.x.toFixed(2)}, ${mesh.scale.y.toFixed(2)}, ${mesh.scale.z.toFixed(2)})` : ''
                  return `${base}  ${rotStr}${scStr}`
                })
                navigator.clipboard.writeText(lines.join('\n'))
              }}
              className="w-full py-1.5 bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-500 rounded-lg text-xs font-semibold transition-colors"
            >
              📋 Copy All Positions
            </button>
          </div>
        </div>
      )}

      {/* Music mute toggle */}
      <button
        onClick={() => {
          if (audioRef.current) {
            audioRef.current.muted = !audioRef.current.muted
            setMusicMuted(audioRef.current.muted)
          }
        }}
        className="absolute z-10 px-3 py-2 bg-black/75 backdrop-blur-sm text-white border border-white/30 rounded-full text-sm hover:bg-white hover:text-black transition-colors duration-300"
        style={{ top: 'calc(env(safe-area-inset-top) + 1rem)', right: '1rem' }}
        title={musicMuted ? 'Unmute music' : 'Mute music'}
      >
        {musicMuted ? '🔇' : '🎵'}
      </button>

      {/* Bowling overlay — shown when actively bowling */}
      {!activeSection && bowlDisplay.state !== 'idle' && (
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 4rem)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}>
          {/* Score bar at top */}
          <div className="flex gap-8 bg-black/70 backdrop-blur-sm text-white px-8 py-3 rounded-full text-sm font-bold">
            <span>Score: <span className="text-yellow-300">{bowlDisplay.score}</span></span>
            <span className="opacity-40">|</span>
            <span>Best: <span className="text-green-300">{bowlDisplay.hs}</span></span>
          </div>

          {/* State-specific instructions at bottom */}
          <div className="text-center">
            {bowlDisplay.state === 'aiming' && (
              <div className="bg-black/70 backdrop-blur-sm text-white px-6 py-4 rounded-2xl text-sm space-y-3 min-w-64">
                <div className="hidden md:block text-center opacity-70 text-xs">
                  <kbd className="font-bold bg-white/20 px-1.5 rounded">A</kbd> / <kbd className="font-bold bg-white/20 px-1.5 rounded">D</kbd> to aim &nbsp;·&nbsp; <kbd className="font-bold bg-white/20 px-1.5 rounded">Esc</kbd> to cancel
                </div>
                <div className="md:hidden text-center opacity-70 text-xs">Joystick left/right to aim</div>
                {/* Power bar */}
                <div>
                  <div className="flex justify-between text-xs opacity-60 mb-1">
                    <span>POWER</span>
                    <span className="hidden md:inline">hold <kbd className="font-bold bg-white/20 px-1 rounded">Space</kbd> / <kbd className="font-bold bg-white/20 px-1 rounded">E</kbd> — release to throw</span>
                    <span className="md:hidden">hold <strong>Throw</strong> — release to bowl</span>
                  </div>
                  <div className="w-full h-4 bg-white/20 rounded-full overflow-hidden">
                    <div
                      ref={powerBarRef}
                      className="h-full rounded-full transition-none"
                      style={{ width: '0%', background: 'linear-gradient(90deg, #22c55e, #eab308, #ef4444)' }}
                    />
                  </div>
                </div>
              </div>
            )}
            {bowlDisplay.state === 'thrown' && (
              <div className="bg-black/70 backdrop-blur-sm text-white px-6 py-3 rounded-2xl text-sm animate-pulse">
                Ball in motion...
              </div>
            )}
            {bowlDisplay.state === 'result' && (
              <div className="bg-black/70 backdrop-blur-sm text-white px-8 py-4 rounded-2xl text-center space-y-2">
                <div className="text-2xl font-bold">
                  {bowlDisplay.score === 10 ? 'STRIKE! ' : ''}{bowlDisplay.score} / 10 pins
                </div>
                {bowlDisplay.score === bowlDisplay.hs && bowlDisplay.score > 0 && (
                  <div className="text-green-300 text-sm font-bold">New Best!</div>
                )}
                <div className="hidden md:block text-xs opacity-70 mt-1"><kbd className="font-bold bg-white/20 px-1.5 rounded">E</kbd> play again &nbsp;·&nbsp; <kbd className="font-bold bg-white/20 px-1.5 rounded">Esc</kbd> leave lane</div>
                <div className="md:hidden text-xs opacity-70 mt-1">Tap <strong>Play Again</strong> or move away</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile throw/play-again button — only during bowling */}
      {!activeSection && (bowlDisplay.state === 'aiming' || bowlDisplay.state === 'result') && (
        <button
          className="md:hidden absolute right-6 z-30 px-5 py-3 bg-yellow-600/90 backdrop-blur-sm text-white border border-yellow-400/50 rounded-full font-bold text-sm pointer-events-auto"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5.5rem)' }}
          onTouchStart={(e) => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', bubbles: true })) }}
          onTouchEnd={(e) => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keyup', { key: 'e', bubbles: true })) }}
        >
          {bowlDisplay.state === 'aiming' ? 'Throw' : 'Play Again'}
        </button>
      )}

      {/* Ring toss overlay */}
      {!activeSection && rtossDisplay.state !== 'idle' && (
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between"
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 4rem)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}>
          <div className="flex gap-8 bg-black/70 backdrop-blur-sm text-white px-8 py-3 rounded-full text-sm font-bold">
            <span>Ring <span className="text-yellow-300">{rtossDisplay.thrown}</span>/{RTOSS_RINGS}</span>
            <span className="opacity-40">|</span>
            <span>Score: <span className="text-yellow-300">{rtossDisplay.score}</span></span>
            <span className="opacity-40">|</span>
            <span>Best: <span className="text-green-300">{rtossDisplay.hs}</span></span>
          </div>
          <div className="text-center">
            {rtossDisplay.state === 'aiming' && (
              <div className="bg-black/70 backdrop-blur-sm text-white px-6 py-4 rounded-2xl text-sm space-y-3 min-w-64">
                <div className="hidden md:block text-center opacity-70 text-xs">
                  <kbd className="font-bold bg-white/20 px-1.5 rounded">A</kbd> / <kbd className="font-bold bg-white/20 px-1.5 rounded">D</kbd> aim &nbsp;·&nbsp; hold <kbd className="font-bold bg-white/20 px-1.5 rounded">Space</kbd> / <kbd className="font-bold bg-white/20 px-1.5 rounded">E</kbd> — release to throw
                </div>
                <div>
                  <div className="flex justify-between text-xs opacity-60 mb-1"><span>POWER</span></div>
                  <div className="w-full h-4 bg-white/20 rounded-full overflow-hidden">
                    <div ref={rPowerBarRef} className="h-full rounded-full transition-none"
                      style={{ width: '0%', background: 'linear-gradient(90deg, #22c55e, #eab308, #ef4444)' }} />
                  </div>
                </div>
              </div>
            )}
            {rtossDisplay.state === 'thrown' && (
              <div className="bg-black/70 backdrop-blur-sm text-white px-6 py-3 rounded-2xl text-sm animate-pulse">
                {rtossDisplay.thrown < RTOSS_RINGS ? 'Ring in flight...' : 'Settling...'}
              </div>
            )}
            {rtossDisplay.state === 'result' && (
              <div className="bg-black/70 backdrop-blur-sm text-white px-8 py-4 rounded-2xl text-center space-y-2">
                <div className="text-2xl font-bold">
                  {rtossDisplay.score === RTOSS_RINGS ? 'Perfect! ' : ''}{rtossDisplay.score} / {RTOSS_RINGS} ringers
                </div>
                {rtossDisplay.score === rtossDisplay.hs && rtossDisplay.score > 0 && (
                  <div className="text-green-300 text-sm font-bold">New Best!</div>
                )}
                <div className="hidden md:block text-xs opacity-70 mt-1">
                  <kbd className="font-bold bg-white/20 px-1.5 rounded">E</kbd> play again &nbsp;·&nbsp; <kbd className="font-bold bg-white/20 px-1.5 rounded">Esc</kbd> leave
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* All HUD — hidden when modal is open */}
      {!activeSection && (
        <>
          {/* Near-bowl hint — only when idle near lane */}
          {nearBowl && bowlDisplay.state === 'idle' && rtossDisplay.state === 'idle' && !sitting && (
            <div
              className="absolute left-1/2 -translate-x-1/2 text-white text-xs bg-black/60 backdrop-blur-sm px-5 py-2 rounded-full pointer-events-none animate-pulse"
              style={{ bottom: 'calc(env(safe-area-inset-bottom) + 3.5rem)' }}
            >
              Press <kbd className="font-bold mx-1">E</kbd> to Bowl
            </div>
          )}

          {/* Near ring toss hint */}
          {nearRToss && rtossDisplay.state === 'idle' && bowlDisplay.state === 'idle' && !sitting && (
            <div
              className="absolute left-1/2 -translate-x-1/2 text-white text-xs bg-black/60 backdrop-blur-sm px-5 py-2 rounded-full pointer-events-none animate-pulse"
              style={{ bottom: 'calc(env(safe-area-inset-bottom) + 3.5rem)' }}
            >
              Press <kbd className="font-bold mx-1">E</kbd> for Ring Toss
            </div>
          )}

          {/* Bench sit/stand hints */}
          {nearBench && !sitting && bowlDisplay.state === 'idle' && rtossDisplay.state === 'idle' && (
            <div className="absolute left-1/2 -translate-x-1/2 text-white text-xs bg-black/60 backdrop-blur-sm px-5 py-2 rounded-full pointer-events-none animate-pulse"
              style={{ bottom: 'calc(env(safe-area-inset-bottom) + 3.5rem)' }}>
              Press <kbd className="font-bold mx-1">E</kbd> to sit
            </div>
          )}
          {sitting && (
            <div className="absolute left-1/2 -translate-x-1/2 text-white text-xs bg-black/60 backdrop-blur-sm px-5 py-2 rounded-full pointer-events-none"
              style={{ bottom: 'calc(env(safe-area-inset-bottom) + 3.5rem)' }}>
              <kbd className="font-bold mx-1">E</kbd> or move to stand
            </div>
          )}

          {/* Ladder hints */}
          {nearLadder && !climbing && !sitting && bowlDisplay.state === 'idle' && rtossDisplay.state === 'idle' && (
            <div className="absolute left-1/2 -translate-x-1/2 text-white text-xs bg-black/60 backdrop-blur-sm px-5 py-2 rounded-full pointer-events-none animate-pulse"
              style={{ bottom: 'calc(env(safe-area-inset-bottom) + 3.5rem)' }}>
              Press <kbd className="font-bold mx-1">W</kbd> to climb
            </div>
          )}
          {climbing && (
            <div className="absolute left-1/2 -translate-x-1/2 text-white text-xs bg-black/60 backdrop-blur-sm px-5 py-2 rounded-full pointer-events-none"
              style={{ bottom: 'calc(env(safe-area-inset-bottom) + 3.5rem)' }}>
              <kbd className="font-bold mx-1">W</kbd>/<kbd className="font-bold mx-1">S</kbd> climb &nbsp;·&nbsp; <kbd className="font-bold mx-1">Esc</kbd> dismount
            </div>
          )}

          {/* Light switch hint */}
          {nearSwitch && !nearBowl && !nearRToss && !nearBench && !sitting && (
            <div className="absolute left-1/2 -translate-x-1/2 text-white text-xs bg-black/60 backdrop-blur-sm px-5 py-2 rounded-full pointer-events-none animate-pulse"
              style={{ bottom: 'calc(env(safe-area-inset-bottom) + 3.5rem)' }}>
              Press <kbd className="font-bold mx-1">E</kbd> to toggle light
            </div>
          )}

          {/* Desktop: near-sign hint (above controls bar) */}
          {!nearSwitch && !nearBowl && !nearRToss && !nearBench && !sitting && nearSign && (
            <div
              className="hidden md:flex absolute left-1/2 -translate-x-1/2 text-white text-xs bg-black/60 backdrop-blur-sm px-5 py-2 rounded-full pointer-events-none animate-pulse"
              style={{ bottom: 'calc(env(safe-area-inset-bottom) + 3.5rem)' }}
            >
              Press <kbd className="font-bold mx-1">E</kbd> to inspect · or stand still for 2s
            </div>
          )}

          {/* Desktop: controls bar — hidden during bowling/rtoss/sitting */}
          {bowlDisplay.state === 'idle' && rtossDisplay.state === 'idle' && !sitting && (
          <div
            className="hidden md:flex absolute left-1/2 -translate-x-1/2 text-white text-xs bg-black/50 backdrop-blur-sm px-5 py-2 rounded-full pointer-events-none"
            style={{ bottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
          >
            WASD · Arrows &nbsp;·&nbsp; <kbd className="font-bold mx-1">Space</kbd> jump &nbsp;·&nbsp; <kbd className="font-bold mx-1">E</kbd> inspect &nbsp;·&nbsp; <kbd className="font-bold mx-1">Esc</kbd> or move to close
          </div>
          )}

          {/* Mobile: controls hint — hidden during bowling/rtoss/sitting */}
          {bowlDisplay.state === 'idle' && rtossDisplay.state === 'idle' && !sitting && (
          <div
            className="md:hidden absolute left-1/2 -translate-x-1/2 text-white text-xs bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full pointer-events-none whitespace-nowrap"
            style={{ bottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
          >
            Joystick to move &nbsp;·&nbsp; Tap <strong>Inspect</strong> near signs
          </div>
          )}

          {/* Mobile: Inspect button — right side, same height as joystick */}
          {bowlDisplay.state === 'idle' && rtossDisplay.state === 'idle' && !sitting && nearSign && (
            <button
              className="md:hidden absolute right-6 z-30 px-5 py-3 bg-amber-800/90 backdrop-blur-sm text-white border border-amber-500/50 rounded-full font-bold text-sm animate-pulse"
              style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5.5rem)' }}
              onTouchEnd={(e) => {
                e.preventDefault()
                if (currentSecRef.current && triggerFocusRef.current) {
                  triggerFocusRef.current(currentSecRef.current)
                }
              }}
            >
              Inspect
            </button>
          )}

          {/* Mobile: Joystick — left side, hidden during bowling/rtoss/sitting */}
          {bowlDisplay.state === 'idle' && rtossDisplay.state === 'idle' && !sitting && <div
            className="absolute left-6 z-30 w-28 h-28 md:hidden touch-none select-none"
            style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5.5rem)' }}
            onTouchStart={(e) => { e.preventDefault(); touchActiveRef.current = true }}
            onTouchMove={(e) => {
              e.preventDefault()
              const rect = e.currentTarget.getBoundingClientRect()
              const touch = e.touches[0]
              const x = Math.max(-1, Math.min(1, ((touch.clientX - rect.left) / rect.width) * 2 - 1))
              const y = Math.max(-1, Math.min(1, ((touch.clientY - rect.top) / rect.height) * 2 - 1))
              touchMoveRef.current = { x, y }
              setJoyPos({ x, y })
            }}
            onTouchEnd={(e) => {
              e.preventDefault()
              touchActiveRef.current = false
              touchMoveRef.current = { x: 0, y: 0 }
              setJoyPos({ x: 0, y: 0 })
            }}
          >
            <div className="relative w-full h-full rounded-full bg-black/40 border border-white/30">
              <div
                className="absolute w-10 h-10 rounded-full bg-white/70"
                style={{
                  left: `calc(50% + ${joyPos.x * 35}px - 20px)`,
                  top:  `calc(50% + ${joyPos.y * 35}px - 20px)`,
                }}
              />
            </div>
          </div>}
        </>
      )}

      {activeSection && <SectionOverlay id={activeSection} onClose={exitFocus} />}

    </div>
  )
}
