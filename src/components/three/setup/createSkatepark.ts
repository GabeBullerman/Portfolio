import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { Movable } from '../types'

interface ParkPiece {
  name: string
  path: string
}

export function createSkatepark(scene: THREE.Scene, movables: Movable[]): void {
  const gltfLoader = new GLTFLoader()

  const loadGLB = (path: string): Promise<THREE.Group> => {
    return new Promise((resolve, reject) => {
      gltfLoader.load(
        path,
        (gltf) => resolve(gltf.scene),
        undefined,
        reject
      )
    })
  }

  const setupMesh = (mesh: THREE.Group, name: string) => {
    mesh.traverse((child) => {
      const childMesh = child as THREE.Mesh
      if (childMesh.isMesh) {
        childMesh.castShadow = true
        childMesh.receiveShadow = true
      }
    })
    movables.push({
      name,
      group: mesh,
      scaleObj: mesh,
    })
    scene.add(mesh)
  }

  // ── Skatepark GLB ────────────────────────────────────────────────────────
  gltfLoader.load(
    '/assets/outdoor/skatepark/Untitled.glb',
    (gltf) => {
      const skatepark = gltf.scene
      skatepark.scale.setScalar(24)
      skatepark.position.set(19, 0, -80)
      skatepark.rotation.y = Math.PI / 2
      setupMesh(skatepark, '🛹 Skatepark')
    },
    undefined,
    (err) => console.error('[skatepark] Load failed:', err)
  )

  // ── Park pieces ──────────────────────────────────────────────────────────
  const parkPieces: ParkPiece[] = [
    { name: '🪑 Bench', path: '/assets/outdoor/park stuff/bench/Untitled.glb' },
    { name: '🪣 Border Fence (plain)', path: '/assets/outdoor/park stuff/border fence/plain/Untitled.glb' },
    { name: '🪣 Border Fence (end)', path: '/assets/outdoor/park stuff/border fence/end/Untitled.glb' },
    { name: '🌿 Bush (sphere)', path: '/assets/outdoor/park stuff/bushes/short sphere/Untitled.glb' },
    { name: '🌿 Bush (short wide)', path: '/assets/outdoor/park stuff/bushes/short wide/Untitled.glb' },
    { name: '🌿 Bush (tall wide)', path: '/assets/outdoor/park stuff/bushes/tall wide/Untitled.glb' },
    { name: '🍽️ Picnic Table', path: '/assets/outdoor/park stuff/picnic/Untitled.glb' },
    { name: '🛝 Playground', path: '/assets/outdoor/park stuff/playground/Untitled.glb' },
    { name: '🛣️ Sidewalk (straight)', path: '/assets/outdoor/park stuff/sidewalks/sidewalk straight/Untitled.glb' },
    { name: '🛣️ Sidewalk (left turn)', path: '/assets/outdoor/park stuff/sidewalks/sidewalk left turn/Untitled.glb' },
    { name: '🛣️ Sidewalk (right turn)', path: '/assets/outdoor/park stuff/sidewalks/sidewalk right turn/Untitled.glb' },
    { name: '🛣️ Sidewalk (4-way)', path: '/assets/outdoor/park stuff/sidewalks/sidewalk 4 way intersection/Untitled.glb' },
    { name: '🚩 Street Sign', path: '/assets/outdoor/park stuff/street sign/Untitled.glb' },
    { name: '🗑️ Trashcan', path: '/assets/outdoor/park stuff/trashcan/Untitled.glb' },
    { name: '🌳 Tree', path: '/assets/outdoor/park stuff/tree/Untitled.glb' },
  ]

  Promise.all(parkPieces.map(p => loadGLB(p.path))).then(pieces => {
    pieces.forEach((mesh, i) => {
      const piece = parkPieces[i]
      mesh.position.set(Math.random() * 40 - 20, 0, Math.random() * 30 - 60)
      setupMesh(mesh, piece.name)
    })
  }).catch(err => console.error('[park-pieces] Load failed:', err))
}
