import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'

export interface SceneRefs {
  dayEnvRef:      React.MutableRefObject<THREE.Texture | null>
  ambientLightRef: React.MutableRefObject<THREE.AmbientLight | null>
  sunLightRef:    React.MutableRefObject<THREE.DirectionalLight | null>
  inCabinPrevRef: React.MutableRefObject<boolean>
}

export interface SceneResult {
  scene:     THREE.Scene
  camera:    THREE.PerspectiveCamera
  renderer:  THREE.WebGLRenderer
  physWorld: CANNON.World
}

export function createScene(mount: HTMLDivElement, refs: SceneRefs): SceneResult {
  const W = mount.clientWidth, H = mount.clientHeight

  // ── Scene ────────────────────────────────────────────────────────────
  const scene = new THREE.Scene()
  scene.fog = new THREE.FogExp2(0xb8d4f0, 0.010)

  const camera = new THREE.PerspectiveCamera(65, W / H, 0.1, 200)
  camera.position.set(0, 2.2, 11)

  // Disable MSAA on high-DPI screens — supersampling at 2× DPR already smooths edges
  const renderer = new THREE.WebGLRenderer({ antialias: window.devicePixelRatio <= 1 })
  renderer.setSize(W, H); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.65
  mount.appendChild(renderer.domElement)

  // ── HDR Skybox ───────────────────────────────────────────────────────
  const pmremGen = new THREE.PMREMGenerator(renderer)
  pmremGen.compileEquirectangularShader()
  new RGBELoader().load('/images/citrus_orchard_road_puresky_1k.hdr', (hdrTex) => {
    const envMap = pmremGen.fromEquirectangular(hdrTex).texture
    refs.dayEnvRef.current = envMap
    scene.background = envMap
    if (!refs.inCabinPrevRef.current) scene.environment = envMap
    hdrTex.dispose()
    pmremGen.dispose()
  })

  const ambientLight = new THREE.AmbientLight(0xffeedd, 1.2)
  scene.add(ambientLight)
  refs.ambientLightRef.current = ambientLight

  const sun = new THREE.DirectionalLight(0xfff0d0, 1.4)
  refs.sunLightRef.current = sun
  sun.position.set(20, 40, 15); sun.castShadow = true
  // Small frustum — animate loop moves the light to follow player each frame
  sun.shadow.mapSize.set(1024, 1024)
  sun.shadow.camera.left = -40; sun.shadow.camera.right = 40
  sun.shadow.camera.top = 40; sun.shadow.camera.bottom = -40
  sun.shadow.camera.near = 0.5; sun.shadow.camera.far = 100
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
  fireObstacle.position.set(0, 0.15, -14)
  physWorld.addBody(fireObstacle)

  return { scene, camera, renderer, physWorld }
}
