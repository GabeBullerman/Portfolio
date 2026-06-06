import * as THREE from 'three'
import type { Movable } from '../types'
import { skillsData } from '../../../data/skills'

// ── Skills data ───────────────────────────────────────────────────────────────
const CDN = 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons'

const LANG_SKILLS = [
  { name: 'Java',       icon: `${CDN}/java/java-original.svg` },
  { name: 'TypeScript', icon: `${CDN}/typescript/typescript-original.svg` },
  { name: 'JavaScript', icon: `${CDN}/javascript/javascript-original.svg` },
  { name: 'Python',     icon: `${CDN}/python/python-original.svg` },
  { name: 'C',          icon: `${CDN}/c/c-original.svg` },
  { name: 'C++',        icon: `${CDN}/cplusplus/cplusplus-original.svg` },
  { name: 'SQL',        icon: `${CDN}/azuresqldatabase/azuresqldatabase-original.svg` },
  { name: 'HTML',       icon: `${CDN}/html5/html5-original.svg` },
  { name: 'CSS',        icon: `${CDN}/css3/css3-original.svg` },
]

// Databases + DevOps merged into one "Tools" section
const TOOLS_SKILLS = [...skillsData[2].skills, ...skillsData[3].skills]

const ZONE_SECTIONS = [
  { label: 'Frontend',  skills: skillsData[0].skills, baseZ: -40, accent: 0x61dafb },
  { label: 'Backend',   skills: skillsData[1].skills, baseZ: -55, accent: 0x5fa04e },
  { label: 'Languages', skills: LANG_SKILLS,           baseZ: -70, accent: 0xf7df1e },
  { label: 'Tools',     skills: TOOLS_SKILLS,           baseZ: -86, accent: 0x2496ed },
] as const

// ── Layout constants ──────────────────────────────────────────────────────────
const ZONE_X   = 56.0   // east of Memory Lane road (outer edge x=47), south of buildings
const PER_ROW  = 5
const ICON_SZ  = 0.62
const ICON_GAP = 1.08
const ROW_GAP  = 1.12
const BASE_Y   = 1.25

// ── Builder ───────────────────────────────────────────────────────────────────
export function createSkillsZone(
  scene:    THREE.Scene,
  movables: Movable[],
): { update: (elapsed: number) => void } {

  const texLoader = new THREE.TextureLoader()
  // Shared dark edge material for the box sides
  const sideMat = new THREE.MeshStandardMaterial({
    color: 0x111827, roughness: 0.85, metalness: 0.05,
  })

  type AnimIcon = { mesh: THREE.Mesh; phase: number; baseY: number }
  const animIcons: AnimIcon[] = []

  ZONE_SECTIONS.forEach(({ label, skills, baseZ, accent }) => {
    const grp = new THREE.Group()
    grp.position.set(ZONE_X, 0, baseZ)
    scene.add(grp)
    movables.push({ name: `🛠 Skills · ${label}`, group: grp, scaleObj: grp })

    // ── Header sign (canvas → PlaneGeometry facing west) ─────────────────────
    const cv = document.createElement('canvas')
    cv.width = 512; cv.height = 80
    const cx = cv.getContext('2d')!
    const accentHex = `#${accent.toString(16).padStart(6, '0')}`
    cx.fillStyle = '#0d1117'
    cx.beginPath(); cx.roundRect(0, 0, 512, 80, 10); cx.fill()
    cx.strokeStyle = accentHex; cx.lineWidth = 3.5
    cx.beginPath(); cx.roundRect(2, 2, 508, 76, 8); cx.stroke()
    cx.fillStyle = accentHex
    cx.font = 'bold 44px system-ui, sans-serif'
    cx.textAlign = 'center'; cx.textBaseline = 'middle'
    cx.fillText(label, 256, 40)

    const nRows = Math.ceil(skills.length / PER_ROW)
    const topY  = BASE_Y + (nRows - 1) * ROW_GAP

    const signMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 0.53),
      new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(cv),
        side: THREE.DoubleSide,
        transparent: true,
      }),
    )
    signMesh.position.set(0, topY + 0.82, 0)
    signMesh.rotation.y = -Math.PI / 2  // face west toward road
    grp.add(signMesh)

    // Coloured accent light above the section
    const light = new THREE.PointLight(accent, 1.8, 12)
    light.position.set(0, topY + 1.8, 0)
    grp.add(light)

    // ── Icon tiles ────────────────────────────────────────────────────────────
    skills.forEach((skill, i) => {
      const row     = Math.floor(i / PER_ROW)
      const col     = i % PER_ROW
      const rowSize = Math.min(PER_ROW, skills.length - row * PER_ROW)
      const zOff    = (col - (rowSize - 1) / 2) * ICON_GAP
      const yPos    = BASE_Y + row * ROW_GAP

      const tex = texLoader.load(skill.icon)
      tex.colorSpace      = THREE.SRGBColorSpace
      tex.minFilter       = THREE.LinearFilter
      tex.generateMipmaps = false

      const iconMat = new THREE.MeshStandardMaterial({
        map: tex, transparent: true, roughness: 0.3, metalness: 0.1,
      })

      // BoxGeometry material indices: +X=0, -X=1, +Y=2, -Y=3, +Z=4, -Z=5
      // rotation.y = -π/2 → local +Z faces world -X (west, toward road) ✓
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(ICON_SZ, ICON_SZ, 0.055),
        [sideMat, sideMat, sideMat, sideMat, iconMat, sideMat],
      )
      mesh.position.set(0, yPos, zOff)
      mesh.rotation.y = -Math.PI / 2
      grp.add(mesh)

      animIcons.push({ mesh, phase: i * 0.41 + baseZ * 0.05, baseY: yPos })
    })
  })

  return {
    update: (elapsed: number) => {
      animIcons.forEach(({ mesh, phase, baseY }) => {
        // Gentle bob + subtle yaw wobble so the player occasionally sees the edge
        mesh.position.y = baseY + Math.sin(elapsed * 0.72 + phase) * 0.10
        mesh.rotation.y = -Math.PI / 2 + Math.sin(elapsed * 0.38 + phase) * 0.12
      })
    },
  }
}
