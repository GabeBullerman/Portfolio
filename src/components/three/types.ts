import * as THREE from 'three'
import * as CANNON from 'cannon-es'

// ─── Collision types ─────────────────────────────────────────────────────────
export interface BoxCol  { x0: number; x1: number; z0: number; z1: number; maxY: number }
export interface CeilCol { x0: number; x1: number; z0: number; z1: number; minY: number }
export interface CylCol  { x: number; z: number; r: number; maxY?: number }
export interface MovableExtra { label: string; getValue: () => number; min: number; max: number; step: number; onChange: (v: number) => void }
export interface Movable { name: string; group: THREE.Group; meshes?: THREE.Object3D[]; scaleObj?: THREE.Object3D; isHitbox?: boolean; extra?: MovableExtra }

// ─── Animation / scene objects ───────────────────────────────────────────────
export interface PhysBall { body: CANNON.Body; mesh: THREE.Mesh; idx: number }
export interface DuckData { group: THREE.Group; headG: THREE.Group; x: number; z: number; angle: number; timer: number; phase: number }
export interface FireflyData { bx: number; by: number; bz: number; ph: number; sp: number; am: number }

// ─── Shared world context ─────────────────────────────────────────────────────
export interface WorldCtx {
  scene:     THREE.Scene
  camera:    THREE.PerspectiveCamera
  renderer:  THREE.WebGLRenderer
  physWorld: CANNON.World
  cylCols:   CylCol[]
  boxCols:   BoxCol[]
  movables:  Movable[]
}
