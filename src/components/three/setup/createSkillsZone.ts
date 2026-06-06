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

const TOOLS_SKILLS = [...skillsData[2].skills, ...skillsData[3].skills]

// ── Layout constants ──────────────────────────────────────────────────────────
const ZONE_X   = 56.0
const ICON_SZ  = 0.62
const ICON_GAP = 1.08
const ROW_GAP  = 1.12
const BASE_Y   = 1.25

// ── Section definitions (perRow overrides the default of 5) ──────────────────
const ZONE_SECTIONS = [
  { label: 'Frontend',  skills: dedupByIcon(skillsData[0].skills), baseZ: -40, accent: 0x61dafb, perRow: 5 },
  { label: 'Backend',   skills: dedupByIcon(skillsData[1].skills), baseZ: -47, accent: 0x5fa04e, perRow: 5 },
  { label: 'Languages', skills: dedupByIcon(LANG_SKILLS),           baseZ: -54, accent: 0xf7df1e, perRow: 5 },
  { label: 'Tools',     skills: dedupByIcon(TOOLS_SKILLS),           baseZ: -62, accent: 0x2496ed, perRow: 6 },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
const DARK_ICON_PATHS = [
  'threejs/threejs-original',
  'express/express-original',
  'github/github-original',
]

function dedupByIcon<T extends { icon: string }>(arr: T[]): T[] {
  const seen = new Set<string>()
  return arr.filter(s => { if (seen.has(s.icon)) return false; seen.add(s.icon); return true })
}

function makeIconTexture(skill: { name: string; icon: string }, accent: number): THREE.CanvasTexture {
  const SZ  = 128
  const cv  = document.createElement('canvas')
  cv.width = SZ; cv.height = SZ
  const cx  = cv.getContext('2d')!
  const col = `#${accent.toString(16).padStart(6, '0')}`
  const isDark = DARK_ICON_PATHS.some(p => skill.icon.includes(p))

  cx.fillStyle = '#1a1f2e'; cx.fillRect(0, 0, SZ, SZ)
  cx.strokeStyle = col; cx.lineWidth = 3; cx.strokeRect(2, 2, SZ - 4, SZ - 4)
  cx.fillStyle = col
  cx.font = 'bold 11px monospace'; cx.textAlign = 'center'; cx.textBaseline = 'middle'
  cx.fillText(skill.name, SZ / 2, SZ / 2)

  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace

  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => {
    cx.clearRect(0, 0, SZ, SZ)
    if (isDark) {
      cx.fillStyle = '#e0e0e0'
      cx.beginPath(); cx.roundRect(6, 6, SZ - 12, SZ - 12, 8); cx.fill()
    }
    cx.drawImage(img, 10, 10, SZ - 20, SZ - 20)
    tex.needsUpdate = true
  }
  img.src = skill.icon
  return tex
}

function makeSign(
  text: string, accentHex: string,
  canvasW: number, canvasH: number,
  planeW: number, planeH: number,
  fontSize: number,
): THREE.Mesh {
  const cv = document.createElement('canvas')
  cv.width = canvasW; cv.height = canvasH
  const cx = cv.getContext('2d')!
  cx.fillStyle = '#0d1117'
  cx.beginPath(); cx.roundRect(0, 0, canvasW, canvasH, 12); cx.fill()
  cx.strokeStyle = accentHex; cx.lineWidth = 3.5
  cx.beginPath(); cx.roundRect(2, 2, canvasW - 4, canvasH - 4, 10); cx.stroke()
  cx.fillStyle = accentHex
  cx.font = `bold ${fontSize}px system-ui, sans-serif`
  cx.textAlign = 'center'; cx.textBaseline = 'middle'
  cx.fillText(text, canvasW / 2, canvasH / 2)
  return new THREE.Mesh(
    new THREE.PlaneGeometry(planeW, planeH),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), side: THREE.DoubleSide, transparent: true }),
  )
}

// ── Builder ───────────────────────────────────────────────────────────────────
export function createSkillsZone(
  scene:    THREE.Scene,
  movables: Movable[],
): { update: (elapsed: number) => void } {

  const sideMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85, metalness: 0.05 })
  type AnimIcon = { mesh: THREE.Mesh; phase: number; baseY: number }
  const animIcons: AnimIcon[] = []

  ZONE_SECTIONS.forEach(({ label, skills, baseZ, accent, perRow }) => {
    const accentHex = `#${accent.toString(16).padStart(6, '0')}`
    const grp = new THREE.Group()
    grp.position.set(ZONE_X, 0, baseZ)
    scene.add(grp)
    movables.push({ name: `🛠 Skills · ${label}`, group: grp, scaleObj: grp })

    const nRows  = Math.ceil(skills.length / perRow)
    const topY   = BASE_Y + (nRows - 1) * ROW_GAP

    // Section header sign — width scales with perRow
    const signW   = (perRow - 1) * ICON_GAP + 0.9
    const signMesh = makeSign(label, accentHex, 512, 80, signW, 0.53, 44)
    signMesh.position.set(0, topY + 0.82, 0)
    signMesh.rotation.y = -Math.PI / 2
    grp.add(signMesh)

    // Accent point light
    const light = new THREE.PointLight(accent, 1.8, 12)
    light.position.set(0, topY + 1.8, 0)
    grp.add(light)

    // ── Icon tiles ────────────────────────────────────────────────────────────
    skills.forEach((skill, i) => {
      const row     = Math.floor(i / perRow)
      const col     = i % perRow
      const rowSize = Math.min(perRow, skills.length - row * perRow)
      const zOff    = (col - (rowSize - 1) / 2) * ICON_GAP
      const yPos    = BASE_Y + row * ROW_GAP

      const iconMat = new THREE.MeshBasicMaterial({ map: makeIconTexture(skill, accent) })
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

  // ── "Wall of Qualifications" mega-title spanning all 4 sections ──────────────
  {
    const first = ZONE_SECTIONS[0]
    const last  = ZONE_SECTIONS[ZONE_SECTIONS.length - 1]
    const firstW = (first.perRow - 1) * ICON_GAP + 0.9
    const lastW  = (last.perRow  - 1) * ICON_GAP + 0.9
    const farFront = first.baseZ + firstW / 2
    const farBack  = last.baseZ  - lastW  / 2
    const centerZ  = (farFront + farBack) / 2
    const titleW   = Math.abs(farFront - farBack) + 1.2

    const titleGrp = new THREE.Group()
    titleGrp.position.set(ZONE_X, 0, centerZ)
    scene.add(titleGrp)
    movables.push({ name: '🛠 Skills · Title', group: titleGrp, scaleObj: titleGrp })

    const titleMesh = makeSign('Wall of Qualifications', '#ffd54a', 2048, 160, titleW, 2.2, 96)
    titleMesh.position.set(0, 5.0, 0)
    titleMesh.rotation.y = -Math.PI / 2
    titleGrp.add(titleMesh)

    const titleLight = new THREE.PointLight(0xffd54a, 1.4, 30)
    titleLight.position.set(-2, 5.0, 0)
    titleGrp.add(titleLight)
  }

  return {
    update: (elapsed: number) => {
      animIcons.forEach(({ mesh, phase, baseY }) => {
        mesh.position.y = baseY + Math.sin(elapsed * 0.72 + phase) * 0.10
        mesh.rotation.y = -Math.PI / 2 + Math.sin(elapsed * 0.38 + phase) * 0.12
      })
    },
  }
}
