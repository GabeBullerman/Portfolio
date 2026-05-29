import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import type { Movable } from '../types'

const BASE = '/assets/outdoor/buildings/Project Objects'

export interface ProjectObjectsResult {
  update: (elapsed: number) => void
}

interface ObjConfig {
  name:     string
  path:     string
  pos:      { x: number; y: number; z: number }
  scale:    { x: number; y: number; z: number }
  color:    number    // spotlight colour (hex)
  rotSpeed: number    // radians / second
}

const CONFIGS: ObjConfig[] = [
  {
    name:     '🎵 Music Notes (MusiQuest)',
    path:     `${BASE}/Music Notes/Untitled.glb`,
    pos:      { x: -55.05, y: 1.00, z: -17.00 },
    scale:    { x: 0.600, y: 0.729, z: 0.729 },
    color:    0x9966ff,
    rotSpeed: 0.5,
  },
  {
    name:     '🏨 Hotel (Hotellity)',
    path:     `${BASE}/Hotel/Untitled.glb`,
    pos:      { x: -55.20, y: 1.00, z: -19.85 },
    scale:    { x: 0.729, y: 0.729, z: 0.729 },
    color:    0xffcc44,
    rotSpeed: 0.4,
  },
  {
    name:     '🌸 Flower (Lusiant)',
    path:     `${BASE}/Lusiant Flower/Untitled.glb`,
    pos:      { x: -55.40, y: 1.00, z: -38.00 },
    scale:    { x: 1.000, y: 1.000, z: 1.000 },
    color:    0x44ff88,
    rotSpeed: 0.45,
  },
  {
    name:     '🌧 Rain Cloud (Rainfall)',
    path:     `${BASE}/Rain Cloud/Untitled.glb`,
    pos:      { x: -55.90, y: 0.88, z: -57.80 },
    scale:    { x: 1.331, y: 1.464, z: 1.949 },
    color:    0x44ccff,
    rotSpeed: 0.35,
  },
  {
    name:     '🌍 Earth (Wayfarer)',
    path:     `${BASE}/Earth/scene.gltf`,
    pos:      { x: -54.00, y: 1.00, z: -6.50 },
    scale:    { x: 0.794, y: 0.794, z: 0.794 },
    color:    0x3399ff,
    rotSpeed: 0.25,
  },
]

export function createProjectObjects(
  scene:    THREE.Scene,
  movables: Movable[],
): ProjectObjectsResult {
  const loader     = new GLTFLoader()
  const spinGroups: Array<{ grp: THREE.Group; speed: number }> = []

  for (const cfg of CONFIGS) {
    // Root group — moving this in the debugger moves the whole assembly
    const rootGrp = new THREE.Group()
    rootGrp.position.set(cfg.pos.x, cfg.pos.y, cfg.pos.z)
    scene.add(rootGrp)

    // Coloured spotlight
    const spot = new THREE.SpotLight(cfg.color, 6, 9, Math.PI / 7, 0.35, 1.4)
    spot.position.set(0, 4.5, 0)
    spot.target.position.set(0, 0, 0)
    spot.castShadow = false
    rootGrp.add(spot)
    rootGrp.add(spot.target)

    // Spinning group — scaleObj in the debugger targets this
    const spinGrp = new THREE.Group()
    spinGrp.scale.set(cfg.scale.x, cfg.scale.y, cfg.scale.z)
    rootGrp.add(spinGrp)
    spinGroups.push({ grp: spinGrp, speed: cfg.rotSpeed })

    // Load object GLB
    loader.load(cfg.path, gltf => {
      const model = gltf.scene
      model.traverse(c => {
        if ((c as THREE.Mesh).isMesh) { c.castShadow = true; c.receiveShadow = true }
      })
      // Normalise every GLB to 1.2 units tall so spinGrp scale values are
      // consistent across models regardless of each GLB's native size
      const box = new THREE.Box3().setFromObject(model)
      const mh  = box.max.y - box.min.y
      if (mh > 0) {
        const s = 1.2 / mh
        model.scale.setScalar(s)
        model.position.y = -box.min.y * s
      }
      spinGrp.add(model)
    }, undefined, err => console.error(`[projectObjects] failed: ${cfg.path}`, err))

    movables.push({ name: cfg.name, group: rootGrp, scaleObj: spinGrp })
  }

  function update(elapsed: number) {
    for (const { grp, speed } of spinGroups) {
      grp.rotation.y = elapsed * speed
    }
  }

  return { update }
}
