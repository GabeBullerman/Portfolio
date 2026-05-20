import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'

export interface SceneRefs {
  dayEnvRef:      React.MutableRefObject<THREE.Texture | null>
  nightEnvRef:    React.MutableRefObject<THREE.Texture | null>
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

  const camera = new THREE.PerspectiveCamera(65, W / H, 0.1, 300)
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
    refs.dayEnvRef.current = envMap
    scene.background = envMap
    if (!refs.inCabinPrevRef.current) scene.environment = envMap
    hdrTex.dispose()
    new RGBELoader().load('/images/qwantani_moon_noon_puresky_1k.hdr', (nightTex) => {
      refs.nightEnvRef.current = pmremGen.fromEquirectangular(nightTex).texture
      nightTex.dispose()
      pmremGen.dispose()
    })
  })

  const ambientLight = new THREE.AmbientLight(0xffeedd, 1.2)
  scene.add(ambientLight)
  refs.ambientLightRef.current = ambientLight

  const sun = new THREE.DirectionalLight(0xfff0d0, 1.4)
  refs.sunLightRef.current = sun
  sun.position.set(20, 40, 15); sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.camera.left = -80; sun.shadow.camera.right = 80
  sun.shadow.camera.top = 80; sun.shadow.camera.bottom = -80; sun.shadow.camera.far = 160
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
