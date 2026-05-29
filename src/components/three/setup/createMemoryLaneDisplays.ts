import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import type { InteractZone } from './createProjectDisplays'
import type { Movable } from '../types'

// Building bounds (from animate.ts):
// Bldg 1: x[54.95,58.55] z[-13.10,-8.30]   center z=-10.70
// Bldg 2: x[55.00,58.60] z[-18.90,-14.10]  center z=-16.50
// Bldg 3: x[54.90,58.50] z[-25.90,-21.10]  center z=-23.50
// Bldg 4: x[54.90,58.50] z[-31.75,-26.95]  center z=-29.35
// Buildings open on west face → screen on east (back) wall → faces -X (west)

export interface MemoryLaneResult {
  interactZones: InteractZone[]
}

interface MLConfig {
  makeTexture: () => THREE.CanvasTexture
  pos: { x: number; y: number; z: number }
  rotY: number
  scale: number
  zone: { x: number; z: number; r: number }
  label: string
  url: string
}

// ── Canvas texture helpers ────────────────────────────────────────────────────

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, maxW: number, lineH: number, startY: number): number {
  const words = text.split(' ')
  let line = ''
  let y = startY
  for (const word of words) {
    const test = line + word + ' '
    if (ctx.measureText(test).width > maxW && line !== '') {
      ctx.fillText(line.trimEnd(), x, y)
      y += lineH
      line = word + ' '
    } else {
      line = test
    }
  }
  if (line.trim()) { ctx.fillText(line.trimEnd(), x, y); y += lineH }
  return y
}

function makeExperienceTexture(
  company: string,
  role: string,
  period: string,
  bullets: string[],
): THREE.CanvasTexture {
  const W = 1024, H = 640
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')!

  // Background
  ctx.fillStyle = '#0d1117'
  ctx.fillRect(0, 0, W, H)

  // Top accent stripe
  const grad = ctx.createLinearGradient(0, 0, W, 0)
  grad.addColorStop(0, '#238636')
  grad.addColorStop(1, '#1f6feb')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, 7)

  const PAD = 44
  let y = 56

  // Company
  ctx.fillStyle = '#58a6ff'
  ctx.font = 'bold 34px Arial, sans-serif'
  ctx.fillText(company, PAD, y)
  y += 44

  // Role
  ctx.fillStyle = '#e6edf3'
  ctx.font = 'bold 26px Arial, sans-serif'
  ctx.fillText(role, PAD, y)
  y += 36

  // Period
  ctx.fillStyle = '#8b949e'
  ctx.font = '21px Arial, sans-serif'
  ctx.fillText(period, PAD, y)
  y += 28

  // Divider
  ctx.strokeStyle = '#21262d'
  ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke()
  y += 22

  // Bullets
  ctx.font = '19px Arial, sans-serif'
  for (const bullet of bullets.slice(0, 4)) {
    ctx.fillStyle = '#3fb950'
    ctx.fillText('▸', PAD, y)
    ctx.fillStyle = '#c9d1d9'
    y = wrapText(ctx, bullet, PAD + 20, W - PAD - 20, 26, y)
    y += 6
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function makePersonalTexture(
  icon: string,
  title: string,
  body: string,
): THREE.CanvasTexture {
  const W = 1024, H = 640
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')!

  // Warm dark background
  ctx.fillStyle = '#12100a'
  ctx.fillRect(0, 0, W, H)

  // Top accent stripe
  const grad = ctx.createLinearGradient(0, 0, W, 0)
  grad.addColorStop(0, '#d4a017')
  grad.addColorStop(1, '#e06c1a')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, 7)

  const PAD = 44

  // Icon
  ctx.font = '52px Arial, sans-serif'
  ctx.fillText(icon, PAD, 68)

  // Title
  ctx.fillStyle = '#ffe0a0'
  ctx.font = 'bold 36px Arial, sans-serif'
  ctx.fillText(title, PAD + 66, 68)

  // Divider
  ctx.strokeStyle = '#2e2510'
  ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.moveTo(PAD, 88); ctx.lineTo(W - PAD, 88); ctx.stroke()

  // Body
  ctx.fillStyle = '#d4c5a0'
  ctx.font = '22px Arial, sans-serif'
  wrapText(ctx, body, PAD, W - PAD * 2, 34, 130)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// ── Screen configs ────────────────────────────────────────────────────────────

const ML_CONFIGS: MLConfig[] = [
  {
    // Bldg 1 — Iowa State Full-Stack Dev
    makeTexture: () => makeExperienceTexture(
      'Iowa State University',
      'Full-Stack Software Developer',
      'Aug. 2025 – May 2026',
      [
        'Engineered classroom management system for 200+ students with JWT & OAuth2.',
        'Built Spring Boot REST APIs securing 15+ endpoints with Google OAuth2 integration.',
        'Developed React Native + TypeScript mobile app with real-time WebSocket comms.',
        'Containerized with Docker, CI/CD via GitLab, PostgreSQL migrations via Flyway.',
      ],
    ),
    pos:   { x: 58.40, y: 1.30, z: -10.70 },
    rotY:  Math.PI,
    scale: 0.0311,
    zone:  { x: 55.5, z: -10.70, r: 2.5 },
    label: 'Iowa State — Full-Stack Dev',
    url:   'https://github.com/GabeBullerman',
  },
  {
    // Bldg 2 — ICS Advanced Technologies IT Ops
    makeTexture: () => makeExperienceTexture(
      'ICS Advanced Technologies',
      'IT Operations Specialist & Support',
      'June 2024 – Sep. 2024',
      [
        'Automated workflows with TypeMonkey scripts, cutting avg call time by 20 seconds.',
        'Configured DNS, routing & DHCP for 100,000+ user network; 99% first-call resolution.',
        'Implemented Dynamic PSK for 300+ wireless users, reducing unauthorized access by 75%.',
        'Managed 200+ VLANs to segment traffic and reduce broadcast load by 30%.',
      ],
    ),
    pos:   { x: 58.40, y: 1.30, z: -16.50 },
    rotY:  Math.PI,
    scale: 0.0311,
    zone:  { x: 55.5, z: -16.50, r: 2.5 },
    label: 'ICS Advanced Technologies — IT Ops',
    url:   'https://github.com/GabeBullerman',
  },
  {
    // Bldg 3 — Hobbies
    makeTexture: () => makePersonalTexture(
      '\u{1F3B9}',
      'Hobbies',
      'Self-teaching piano, rebuilding motorcycles, and studying film keep me grounded outside of work. ' +
      'I picked up music theory after inheriting a grand piano, spent a year modifying a Kawasaki sports bike from the ground up, ' +
      'and am steadily working through the IMDB Top 250 — Interstellar remains my favorite.',
    ),
    pos:   { x: 58.40, y: 1.30, z: -23.50 },
    rotY:  Math.PI,
    scale: 0.0311,
    zone:  { x: 55.5, z: -23.50, r: 2.5 },
    label: 'More About Me',
    url:   'https://github.com/GabeBullerman',
  },
  {
    // Bldg 4 — Journeys
    makeTexture: () => makePersonalTexture(
      '\u{1F30D}',
      'Journeys',
      "Visited 49 of 50 U.S. states and traveled extensively abroad — hiking and photographing Greece, " +
      "exploring Italy's culinary and Renaissance arts, and immersing myself in Japan's culture and cities.",
    ),
    pos:   { x: 58.40, y: 1.30, z: -29.35 },
    rotY:  Math.PI,
    scale: 0.0311,
    zone:  { x: 55.5, z: -29.35, r: 2.5 },
    label: 'More About Me',
    url:   'https://github.com/GabeBullerman',
  },
]

// ── Place one TV with a canvas texture on its screen material ─────────────────

function placeTV(
  scene: THREE.Scene,
  gltfScene: THREE.Group,
  cfg: MLConfig,
  movables: Movable[],
  idx: number,
) {
  const tv = gltfScene.clone(true)
  tv.scale.setScalar(cfg.scale)
  tv.position.set(cfg.pos.x, cfg.pos.y, cfg.pos.z)
  tv.rotation.set(0, cfg.rotY, 0)
  tv.traverse(c => {
    if ((c as THREE.Mesh).isMesh) { c.castShadow = true; c.receiveShadow = true }
  })
  scene.add(tv)
  movables.push({ name: `📺 Mem Ln: TV ${idx + 1}`, group: tv, scaleObj: tv })

  const tex = cfg.makeTexture()
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
}

// ── Main export ───────────────────────────────────────────────────────────────

export function createMemoryLaneDisplays(scene: THREE.Scene, movables: Movable[]): MemoryLaneResult {
  const interactZones: InteractZone[] = []

  new GLTFLoader().load(
    '/assets/outdoor/buildings/Project Screens/scene.gltf',
    gltf => {
      ML_CONFIGS.forEach((cfg, i) => placeTV(scene, gltf.scene, cfg, movables, i))
    },
    undefined,
    err => console.error('[memoryLane] TV load failed:', err),
  )

  for (const cfg of ML_CONFIGS) {
    interactZones.push({ pos: { x: cfg.zone.x, z: cfg.zone.z }, radius: cfg.zone.r, label: cfg.label, url: cfg.url })
  }

  return { interactZones }
}
