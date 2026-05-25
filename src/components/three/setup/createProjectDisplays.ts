import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

export interface InteractZone {
  pos:    { x: number; z: number }
  radius: number
  label:  string
  url:    string
}

export interface ProjectDisplayResult {
  update:        (elapsed: number) => void
  interactZones: InteractZone[]
}

const SCREENS_BASE = '/assets/outdoor/buildings/Project Screens'

interface TVConfig {
  screenTex: string
  pos:   { x: number; y: number; z: number }
  rotY:  number
  scale: number
  zone:  { x: number; z: number; r: number }
  label: string
  url:   string
}

// Project Blvd buildings open on their east face → back wall is the west wall → screen faces east (+X)
// Memory Lane 2Story opens on its west face → back wall is east wall → screen faces west (-X)
const TV_CONFIGS: TVConfig[] = [
  {
    // Duo Store A — MusiQuest   bounds x[-55.90,-50.70]  z[-17.50,-12.30]
    screenTex: `${SCREENS_BASE}/textures/MusiQuest.png`,
    pos:   { x: -55.80, y: 1.12, z: -15.00 },
    rotY:  -Math.PI / 4,
    scale: 0.0324,
    zone:  { x: -53.5, z: -14.9, r: 2.5 },
    label: 'MusiQuest GitHub',
    url:   'https://github.com/GabeBullerman/MusiQuest',
  },
  {
    // Duo Store B — Hotellity   bounds x[-56.00,-50.40]  z[-24.00,-19.20]
    screenTex: `${SCREENS_BASE}/textures/Hotellity.png`,
    pos:   { x: -55.70, y: 1.20, z: -21.60 },
    rotY:  -Math.PI / 4,
    scale: 0.0283,
    zone:  { x: -53.0, z: -21.6, r: 2.5 },
    label: 'Hotel ERP GitHub',
    url:   'https://github.com/GabeBullerman/Hotel-ERP',
  },
  {
    // Orange Store — Lusiant    bounds x[-56.10,-50.90]  z[-39.10,-31.90]
    screenTex: `${SCREENS_BASE}/textures/Lusiant.png`,
    pos:   { x: -56.00, y: 1.48, z: -35.50 },
    rotY:  -Math.PI / 4,
    scale: 0.0311,
    zone:  { x: -53.5, z: -35.5, r: 2.5 },
    label: 'Lusiant GitHub',
    url:   'https://github.com/GabeBullerman/Lusiant',
  },
  {
    // Slant Store — Rainfall Simulation   bounds x[-56.90,-50.90]  z[-59.00,-51.40]
    screenTex: `${SCREENS_BASE}/textures/RainFalls.png`,
    pos:   { x: -56.50, y: 1.53, z: -55.20 },
    rotY:  -Math.PI / 4,
    scale: 0.0311,
    zone:  { x: -54.0, z: -55.2, r: 2.5 },
    label: 'Rainfall Simulation GitHub',
    url:   'https://github.com/GabeBullerman/Watershed-Simulation',
  },
]

// ── Load and place one TV, swapping the screen texture ────────────────────────
function placeTV(
  scene: THREE.Scene,
  gltfScene: THREE.Group,
  cfg: TVConfig,
) {
  const texLoader = new THREE.TextureLoader()

  // Deep-clone the loaded GLTF scene so each TV is independent
  const tv = gltfScene.clone(true)

  tv.scale.setScalar(cfg.scale)

  tv.position.set(cfg.pos.x, cfg.pos.y, cfg.pos.z)
  // Explicitly zero out x/z rotations so the TV stands upright regardless of
  // any baked-in tilt in the GLTF, then apply only the desired y rotation.
  tv.rotation.set(0, cfg.rotY, 0)
  tv.traverse(c => {
    if ((c as THREE.Mesh).isMesh) {
      c.castShadow = true; c.receiveShadow = true
    }
  })
  scene.add(tv)

  // Swap the screen material's texture — clone the material first so it's independent
  texLoader.load(cfg.screenTex, tex => {
    // PNG images need flipY true (default) — do NOT set false here or the image appears upside-down
    tex.colorSpace = THREE.SRGBColorSpace
    tv.traverse(c => {
      const mesh = c as THREE.Mesh
      if (!mesh.isMesh) return
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      mats.forEach((m, i) => {
        if ((m as THREE.MeshBasicMaterial).name === 'screen') {
          const newMat = (m as THREE.MeshBasicMaterial).clone()
          newMat.map = tex
          newMat.needsUpdate = true
          if (Array.isArray(mesh.material)) mesh.material[i] = newMat
          else mesh.material = newMat
        }
      })
    })
  })
}

// ── Main export ───────────────────────────────────────────────────────────────
export function createProjectDisplays(scene: THREE.Scene): ProjectDisplayResult {
  const interactZones: InteractZone[] = []

  // ── Load TV model once, then clone per building ───────────────────────────
  new GLTFLoader().load(`${SCREENS_BASE}/scene.gltf`, gltf => {
    for (const cfg of TV_CONFIGS) {
      placeTV(scene, gltf.scene, cfg)
    }
  }, undefined, err => console.error('[projectDisplays] TV load failed:', err))

  // ── Interact zones (one per project) ─────────────────────────────────────
  for (const cfg of TV_CONFIGS) {
    interactZones.push({ pos: { x: cfg.zone.x, z: cfg.zone.z }, radius: cfg.zone.r, label: cfg.label, url: cfg.url })
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function update(_elapsed: number) {}

  return { update, interactZones }
}
