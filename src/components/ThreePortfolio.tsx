import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { experienceData } from '../data/experience'
import { skillsData } from '../data/skills'
import { projectsData } from '../data/projects'

// ─── Seeded PRNG ───────────────────────────────────────────────────────────
function mulberry32(seed: number) {
  return () => {
    seed += 0x6d2b79f5
    let t = seed
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Shortest-path angle lerp
function lerpAngle(from: number, to: number, t: number): number {
  const twoPi = Math.PI * 2
  const delta = ((to - from) % twoPi + twoPi * 1.5) % twoPi - Math.PI
  return from + delta * t
}

// ─── GLSL ──────────────────────────────────────────────────────────────────
const NOISE_FN = /* glsl */`
float hash2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise2(vec2 p){
  vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.0-2.0*f);
  return mix(mix(hash2(i),hash2(i+vec2(1,0)),f.x),mix(hash2(i+vec2(0,1)),hash2(i+vec2(1,1)),f.x),f.y);
}`

const GRASS_VERT = /* glsl */`
#include <fog_pars_vertex>
${NOISE_FN}
varying vec2 vXZ; varying float vElev;
void main(){
  vXZ=position.xy;
  float n=noise2(position.xy*0.07)*0.45+noise2(position.xy*0.22)*0.18;
  vElev=n;
  vec3 pos=position; pos.z+=n;
  vec4 mvPosition=modelViewMatrix*vec4(pos,1.0);
  gl_Position=projectionMatrix*mvPosition;
  #include <fog_vertex>
}`

const GRASS_FRAG = /* glsl */`
#include <fog_pars_fragment>
${NOISE_FN}
varying vec2 vXZ; varying float vElev; uniform vec3 uSunDir;
void main(){
  float n1=noise2(vXZ*0.15),n2=noise2(vXZ*0.42),n3=noise2(vXZ*1.30);
  float m=n1*0.50+n2*0.30+n3*0.20;
  vec3 darkG=vec3(0.22,0.41,0.17),midG=vec3(0.32,0.55,0.23),lightG=vec3(0.44,0.68,0.31),dryG=vec3(0.50,0.54,0.24);
  vec3 col=mix(darkG,midG,m);
  col=mix(col,lightG,noise2(vXZ*0.05)*0.50);
  float dry=smoothstep(0.60,0.80,noise2(vXZ*0.10+vec2(53.0,17.0)));
  col=mix(col,dryG,dry*0.45);
  col+=vElev*0.06;
  float NdotL=max(dot(vec3(0.0,1.0,0.0),uSunDir),0.0);
  col=col*(0.45+NdotL*0.65);
  gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);
  #include <fog_fragment>
}`

// ─── Types ─────────────────────────────────────────────────────────────────
type SectionId = 'about' | 'experience' | 'skills' | 'projects' | 'certifications' | 'moreonme' | 'contact'
interface SectionCfg { id: SectionId; label: string; wx: number; wz: number }

const SECTIONS: SectionCfg[] = [
  { id: 'about',          label: 'About Me',   wx:  0, wz:   2 },
  { id: 'experience',     label: 'Experience', wx:  7, wz: -12 },
  { id: 'skills',         label: 'Skills',     wx: -7, wz: -24 },
  { id: 'projects',       label: 'Projects',   wx:  7, wz: -36 },
  { id: 'certifications', label: 'Certs',      wx: -7, wz: -48 },
  { id: 'moreonme',       label: 'More on Me', wx:  7, wz: -60 },
  { id: 'contact',        label: 'Contact',    wx:  0, wz: -70 },
]

const PROX = 6.5

// ─── Canvas helpers ─────────────────────────────────────────────────────────
function rrect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath()
  c.moveTo(x + r, y); c.lineTo(x + w - r, y)
  c.quadraticCurveTo(x + w, y, x + w, y + r)
  c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r)
  c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y)
  c.closePath()
}

// Async image loaders — overwrite canvas art placeholders after network load
function asyncLoadProjectImages(c: CanvasRenderingContext2D, W: number, H: number, tex: THREE.CanvasTexture) {
  const projects = projectsData.slice(0, 3)
  const iw = 284, ih = 190, gap = 22
  const totalW = 3 * iw + 2 * gap
  const sx = (W - totalW) / 2
  const sy = 196 + ((H - 240) - ih) / 2
  projects.forEach((p, i) => {
    const img = new Image()
    img.onload = () => {
      const px = sx + i * (iw + gap)
      c.save(); rrect(c, px, sy, iw, ih, 8); c.clip()
      c.drawImage(img, px, sy, iw, ih)
      c.restore(); tex.needsUpdate = true
    }
    img.src = p.image
  })
}

function asyncLoadCertImages(c: CanvasRenderingContext2D, W: number, H: number, tex: THREE.CanvasTexture) {
  const files = ['cloudPractitionerAWS', 'aiPractitionerAWS', 'developerAWS', 'devopsEngineerAWS']
  const iw = 156, ih = 156, gap = 26
  const totalW = 4 * iw + 3 * gap
  const sx = (W - totalW) / 2
  const sy = 196 + ((H - 240) - ih) / 2
  files.forEach((f, i) => {
    const img = new Image()
    img.onload = () => {
      const px = sx + i * (iw + gap)
      c.save(); rrect(c, px, sy, iw, ih, 10); c.clip()
      c.drawImage(img, px, sy, iw, ih)
      c.restore(); tex.needsUpdate = true
    }
    img.src = `/images/${f}.png`
  })
}

function drawSignPreview(c: CanvasRenderingContext2D, id: SectionId, W: number, H: number) {
  const top = 196, avail = H - top - 44
  c.save(); c.textAlign = 'center'; c.textBaseline = 'middle'; c.shadowColor = 'transparent'

  switch (id) {
    case 'skills': {
      const badges = [
        { text: 'JS',   bg: '#f7df1e', fg: '#1a1a1a' },
        { text: 'TS',   bg: '#3178c6', fg: '#ffffff' },
        { text: '⚛',   bg: '#20232a', fg: '#61dafb' },
        { text: 'Java', bg: '#e76f00', fg: '#ffffff' },
      ]
      const bw = 148, bh = 132, gap = 26
      const tw = badges.length * bw + (badges.length - 1) * gap
      let x = (W - tw) / 2; const y = top + (avail - bh) / 2
      badges.forEach(b => {
        c.fillStyle = b.bg; rrect(c, x, y, bw, bh, 14); c.fill()
        c.fillStyle = b.fg; c.font = `bold ${b.text.length > 2 ? 34 : 50}px monospace`
        c.fillText(b.text, x + bw / 2, y + bh / 2); x += bw + gap
      }); break
    }
    case 'projects': {
      // Placeholder cards replaced by real images after async load
      const iw = 284, ih = 190, gap = 22
      const totalW = 3 * iw + 2 * gap
      let x = (W - totalW) / 2; const y = 196 + ((H - 240) - ih) / 2
      projectsData.slice(0, 3).forEach(p => {
        c.fillStyle = 'rgba(255,245,224,0.10)'; rrect(c, x, y, iw, ih, 8); c.fill()
        c.strokeStyle = 'rgba(255,245,224,0.25)'; c.lineWidth = 2; rrect(c, x, y, iw, ih, 8); c.stroke()
        c.fillStyle = '#fff5e0'; c.font = 'bold 24px Georgia, serif'
        c.fillText(p.title, x + iw / 2, y + ih / 2); x += iw + gap
      }); break
    }
    case 'experience': {
      const entries = experienceData.slice(0, 2)
      const rowH = 88, gap = 14
      const totalH = entries.length * rowH + (entries.length - 1) * gap
      let y = top + (avail - totalH) / 2
      entries.forEach((e, i) => {
        c.fillStyle = '#f5d070'; c.beginPath(); c.arc(100, y + 38, 12, 0, Math.PI * 2); c.fill()
        if (i < entries.length - 1) {
          c.strokeStyle = 'rgba(245,208,112,0.35)'; c.lineWidth = 2
          c.beginPath(); c.moveTo(100, y + 50); c.lineTo(100, y + rowH + gap - 12); c.stroke()
        }
        c.textAlign = 'left'; c.fillStyle = '#fff5e0'; c.font = 'bold 26px Georgia, serif'
        c.fillText(e.title.split(',')[0], 134, y + 26)
        c.fillStyle = 'rgba(255,245,224,0.58)'; c.font = '21px Georgia, serif'
        c.fillText(e.company + ' · ' + e.period, 134, y + 58)
        c.textAlign = 'center'; y += rowH + gap
      }); break
    }
    case 'certifications': {
      // Placeholder shields replaced by real badge images after async load
      const iw = 156, ih = 156, gap = 26
      const totalW = 4 * iw + 3 * gap; let x = (W - totalW) / 2
      const y = 196 + ((H - 240) - ih) / 2
      const colors = ['#d97706', '#7c3aed', '#16a34a', '#0369a1']
      colors.forEach(col => {
        const cx = x + iw / 2, cy = y + ih / 2
        c.fillStyle = col; c.beginPath()
        c.moveTo(cx, cy - ih * 0.44); c.lineTo(cx + iw * 0.44, cy - ih * 0.18)
        c.lineTo(cx + iw * 0.44, cy + ih * 0.12); c.lineTo(cx, cy + ih * 0.44)
        c.lineTo(cx - iw * 0.44, cy + ih * 0.12); c.lineTo(cx - iw * 0.44, cy - ih * 0.18)
        c.closePath(); c.fill()
        c.fillStyle = '#fff'; c.font = 'bold 20px sans-serif'; c.fillText('AWS', cx, cy)
        x += iw + gap
      }); break
    }
    case 'about': {
      const cx = W / 2, cy = top + avail / 2
      c.strokeStyle = 'rgba(245,208,112,0.55)'; c.lineWidth = 4
      c.beginPath(); c.arc(cx, cy - 38, 74, 0, Math.PI * 2); c.stroke()
      c.fillStyle = 'rgba(255,245,224,0.14)'; c.beginPath(); c.arc(cx, cy - 38, 70, 0, Math.PI * 2); c.fill()
      c.fillStyle = 'rgba(255,245,224,0.38)'
      c.beginPath(); c.arc(cx, cy - 60, 27, 0, Math.PI * 2); c.fill()
      c.beginPath(); c.arc(cx, cy - 10, 46, Math.PI, 0); c.fill()
      c.fillStyle = '#fff5e0'; c.font = 'bold 30px Georgia, serif'; c.fillText('Gabriel Bullerman', cx, cy + 58)
      c.fillStyle = 'rgba(255,245,224,0.58)'; c.font = '21px Georgia, serif'; c.fillText('CS · Iowa State University', cx, cy + 94)
      break
    }
    case 'moreonme': {
      const cats = [{ icon: '🎹', label: 'Hobbies' }, { icon: '✈', label: 'Journeys' }, { icon: '💻', label: 'Industry' }]
      const bw = 220, bh = 178, gap = 46; const tw = cats.length * bw + (cats.length - 1) * gap
      let x = (W - tw) / 2; const y = top + (avail - bh) / 2
      cats.forEach(cat => {
        c.fillStyle = 'rgba(255,245,224,0.10)'; rrect(c, x, y, bw, bh, 16); c.fill()
        c.strokeStyle = 'rgba(255,245,224,0.22)'; c.lineWidth = 2; rrect(c, x, y, bw, bh, 16); c.stroke()
        c.font = '54px serif'; c.fillStyle = '#fff5e0'; c.fillText(cat.icon, x + bw / 2, y + 74)
        c.font = 'bold 24px Georgia, serif'; c.fillText(cat.label, x + bw / 2, y + 142)
        x += bw + gap
      }); break
    }
    case 'contact': {
      const items = [
        { icon: '✉', label: 'Email', bg: '#b91c1c' },
        { icon: '◉', label: 'GitHub', bg: '#1f2937' },
        { icon: '🔗', label: 'LinkedIn', bg: '#0369a1' },
      ]
      const bw = 204, bh = 178, gap = 58; const tw = items.length * bw + (items.length - 1) * gap
      let x = (W - tw) / 2; const y = top + (avail - bh) / 2
      items.forEach(item => {
        c.fillStyle = item.bg; rrect(c, x, y, bw, bh, 16); c.fill()
        c.font = '58px serif'; c.fillStyle = '#fff'; c.fillText(item.icon, x + bw / 2, y + 82)
        c.font = 'bold 24px Georgia, serif'; c.fillText(item.label, x + bw / 2, y + 146)
        x += bw + gap
      }); break
    }
  }
  c.restore()
}

// ─── Canvas sign texture ────────────────────────────────────────────────────
function makeSignTexture(label: string, id: SectionId): THREE.CanvasTexture {
  const W = 1024, H = 512
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H
  const c = cv.getContext('2d')!

  const plankCols = ['#c89060', '#b87c4e', '#cc9668', '#b27248']
  const ph = H / plankCols.length
  plankCols.forEach((col, i) => {
    c.fillStyle = col; c.fillRect(0, i * ph, W, ph)
    c.fillStyle = '#5a2e10'; c.fillRect(0, (i + 1) * ph - 5, W, 10)
  })

  const grainRng = mulberry32(label.charCodeAt(0) * 97 + id.length * 31 + 7)
  for (let i = 0; i < 28; i++) {
    const x = grainRng() * W, y = grainRng() * H
    c.strokeStyle = `rgba(0,0,0,${0.02 + grainRng() * 0.04})`; c.lineWidth = 0.5 + grainRng() * 1.5
    c.beginPath(); c.moveTo(x, y)
    c.quadraticCurveTo(x + (grainRng() - 0.5) * 50, y + (grainRng() - 0.5) * 30, x + (grainRng() - 0.5) * 30, y + grainRng() * 100)
    c.stroke()
  }

  c.strokeStyle = '#5a2e10'; c.lineWidth = 22; c.strokeRect(11, 11, W - 22, H - 22)
  c.strokeStyle = '#8a4c24'; c.lineWidth = 6; c.strokeRect(26, 26, W - 52, H - 52)

  ;[[36, 36], [W - 36, 36], [36, H - 36], [W - 36, H - 36]].forEach(([nx, ny]) => {
    c.fillStyle = '#777'; c.beginPath(); c.arc(nx, ny, 9, 0, Math.PI * 2); c.fill()
    c.fillStyle = '#bbb'; c.beginPath(); c.arc(nx - 2, ny - 2, 3, 0, Math.PI * 2); c.fill()
  })

  c.fillStyle = 'rgba(50,22,6,0.50)'; c.fillRect(30, 30, W - 60, 138)
  const fontSize = label.length > 9 ? 68 : 82
  c.fillStyle = '#fff5e0'; c.font = `bold ${fontSize}px Georgia, serif`
  c.textAlign = 'center'; c.textBaseline = 'middle'
  c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowOffsetX = 3; c.shadowOffsetY = 3; c.shadowBlur = 8
  c.fillText(label, W / 2, 99); c.shadowColor = 'transparent'

  c.strokeStyle = '#7a4024'; c.lineWidth = 3; c.beginPath(); c.moveTo(44, 174); c.lineTo(W - 44, 174); c.stroke()
  ;[W / 2 - 130, W / 2, W / 2 + 130].forEach(dx => {
    c.save(); c.translate(dx, 174); c.rotate(Math.PI / 4)
    c.fillStyle = '#7a4024'; c.fillRect(-8, -8, 16, 16)
    c.fillStyle = '#c49060'; c.fillRect(-3, -3, 6, 6); c.restore()
  })

  drawSignPreview(c, id, W, H)

  const tex = new THREE.CanvasTexture(cv)
  if (id === 'projects') asyncLoadProjectImages(c, W, H, tex)
  if (id === 'certifications') asyncLoadCertImages(c, W, H, tex)
  return tex
}

// ─── Overlay content ────────────────────────────────────────────────────────
const WT = '#fff5e0'
const WM = 'rgba(255,245,224,0.65)'
const WD = 'rgba(255,245,224,0.45)'

function SectionOverlay({ id, onClose }: { id: SectionId; onClose: () => void }) {
  const label = SECTIONS.find(s => s.id === id)?.label ?? ''
  return (
    <div className="absolute inset-0 flex items-center justify-center z-20">
      <div className="absolute inset-0 bg-black/25" onClick={onClose} />
      <div className="relative z-10 flex flex-col overflow-hidden" style={{
        width: 'min(680px, 88vw)', maxHeight: '74vh',
        background: 'linear-gradient(180deg,#c89060 0%,#b87c4e 25%,#cc9668 50%,#b27248 75%,#c89060 100%)',
        border: '14px solid #5a2e10', outline: '3px solid #8a4c24',
        boxShadow: '0 28px 72px rgba(0,0,0,0.72)', borderRadius: '3px',
      }}>
        <div className="flex justify-between items-center px-6 py-3 flex-shrink-0" style={{ background: 'rgba(50,22,6,0.55)' }}>
          <h2 className="font-bold text-lg font-serif" style={{ color: WT }}>{label}</h2>
          <button onClick={onClose} className="text-2xl leading-none hover:opacity-100 transition-opacity" style={{ color: WD }}>×</button>
        </div>
        <div className="flex-shrink-0 mx-5" style={{ height: 2, background: '#7a4024' }} />
        <div className="overflow-y-auto flex-1 px-6 py-5"><Content id={id} /></div>
        <div className="flex-shrink-0 text-center py-2 text-xs font-serif" style={{ color: WD, background: 'rgba(50,22,6,0.25)' }}>
          Press <kbd>ESC</kbd> or click outside to close
        </div>
      </div>
    </div>
  )
}

function Content({ id }: { id: SectionId }) {
  if (id === 'about') return (
    <div>
      <p className="font-bold text-sm mb-1" style={{ color: WT }}>Gabriel John Bullerman</p>
      <p className="text-xs mb-3" style={{ color: WM }}>CS · Iowa State University</p>
      <p className="text-xs leading-relaxed" style={{ color: WM }}>Undergraduate CS major interested in full-stack development, mobile apps, and webapps.</p>
      <div className="flex gap-2 mt-4 flex-wrap">
        {[['GitHub', 'https://github.com/GabeBullerman'], ['LinkedIn', 'https://www.linkedin.com/in/gabe-bullerman/']].map(([l, h]) => (
          <a key={l} href={h} target="_blank" rel="noopener noreferrer"
            className="text-xs px-3 py-1 rounded-full font-bold transition-colors hover:opacity-80"
            style={{ border: '2px solid rgba(255,245,224,0.45)', color: WT }}>{l}</a>
        ))}
      </div>
    </div>
  )
  if (id === 'experience') return (
    <div className="space-y-4">
      {experienceData.map(e => (
        <div key={e.company}>
          <p className="font-bold text-xs" style={{ color: WT }}>{e.title}</p>
          <p className="text-xs mb-1" style={{ color: WD }}>{e.company} · {e.period}</p>
          <ul className="text-xs list-disc pl-4 space-y-1 leading-relaxed" style={{ color: WM }}>
            {e.bullets.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
        </div>
      ))}
    </div>
  )
  if (id === 'skills') return (
    <div className="space-y-3">
      {skillsData.map(cat => (
        <div key={cat.category}>
          <p className="font-bold text-xs mb-1" style={{ color: WT }}>{cat.category}</p>
          <p className="text-xs leading-relaxed" style={{ color: WM }}>{cat.skills.map(s => s.name).join(', ')}</p>
        </div>
      ))}
    </div>
  )
  if (id === 'projects') return (
    <div className="space-y-4">
      {projectsData.map(p => (
        <div key={p.title} className="pb-3 last:pb-0" style={{ borderBottom: '1px solid rgba(255,245,224,0.15)' }}>
          <a href={p.link} target="_blank" rel="noopener noreferrer" className="font-bold text-xs hover:underline block" style={{ color: WT }}>{p.title}</a>
          <p className="text-xs mb-1" style={{ color: WD }}>{p.subtitle}</p>
          <p className="text-xs leading-relaxed" style={{ color: WM }}>{p.description}</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {p.tags.map(t => <span key={t} className="text-xs rounded-full px-2 py-0.5" style={{ border: '1px solid rgba(255,245,224,0.28)', color: WD }}>{t}</span>)}
          </div>
        </div>
      ))}
    </div>
  )
  if (id === 'certifications') return (
    <div className="text-center">
      <p className="text-xs mb-3" style={{ color: WD }}>AWS Certification Path</p>
      <div className="grid grid-cols-2 gap-3">
        {[['cloudPractitionerAWS', 'Cloud Practitioner'], ['aiPractitionerAWS', 'AI Practitioner'], ['developerAWS', 'Developer'], ['devopsEngineerAWS', 'DevOps Engineer']].map(([f, l]) => (
          <div key={l} className="flex flex-col items-center">
            <img src={`/images/${f}.png`} alt={l} className="w-14 h-14 object-contain" />
            <p className="text-xs mt-1" style={{ color: WM }}>{l}</p>
          </div>
        ))}
      </div>
    </div>
  )
  if (id === 'moreonme') return (
    <div className="space-y-4">
      {[['Hobbies', 'Piano, Kawasaki sports bike restoration, film (IMDB top 250 — Interstellar #1).'], ['Journeys', '49/50 US states. Greece, Italy, Japan — chasing contrasts in culture and landscape.'], ['Industry', 'Built 40+ computers since age 8. A high-school question flipped the switch from hardware to software.']].map(([t, p]) => (
        <div key={t}>
          <p className="font-bold text-xs uppercase tracking-wide mb-1" style={{ color: WT }}>{t}</p>
          <p className="text-xs leading-relaxed" style={{ color: WM }}>{p}</p>
        </div>
      ))}
    </div>
  )
  return (
    <div className="space-y-3">
      {[['fa-brands fa-github', 'GitHub', 'https://github.com/GabeBullerman'], ['fa-brands fa-linkedin', 'LinkedIn', 'https://www.linkedin.com/in/gabe-bullerman/'], ['fa-solid fa-envelope', 'gabebullerman1@gmail.com', 'mailto:gabebullerman1@gmail.com']].map(([icon, label, href]) => (
        <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-xs hover:underline" style={{ color: WM }}>
          <i className={icon} style={{ color: WT }} />{label}
        </a>
      ))}
      <div className="flex items-center gap-3 text-xs" style={{ color: WM }}><i className="fa-solid fa-phone" style={{ color: WT }} />319-230-0474</div>
    </div>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────
export default function ThreePortfolio({ onExit }: { onExit: () => void }) {
  const mountRef = useRef<HTMLDivElement>(null)
  const [activeSection, setActiveSection] = useState<SectionId | null>(null)
  const [nearSign, setNearSign] = useState(false)

  const focusPosRef     = useRef(new THREE.Vector3())
  const focusLookRef    = useRef(new THREE.Vector3())
  const focusActiveRef  = useRef(false)
  const overlayShownRef = useRef(false)
  const proxTimerRef    = useRef(0)
  const currentSecRef   = useRef<SectionId | null>(null)

  function exitFocus() {
    focusActiveRef.current = false
    overlayShownRef.current = false
    proxTimerRef.current = 0
    setActiveSection(null)
    setNearSign(false)
  }

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const W = mount.clientWidth, H = mount.clientHeight

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x87ceeb)
    scene.fog = new THREE.FogExp2(0x87ceeb, 0.012)

    const camera = new THREE.PerspectiveCamera(65, W / H, 0.1, 200)
    camera.position.set(0, 2.2, 11)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(W, H); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap
    mount.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight(0xffffff, 0.55))
    const sun = new THREE.DirectionalLight(0xfff4e0, 1.1)
    sun.position.set(20, 40, 15); sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    sun.shadow.camera.left = -80; sun.shadow.camera.right = 80
    sun.shadow.camera.top = 80; sun.shadow.camera.bottom = -80; sun.shadow.camera.far = 160
    scene.add(sun)
    const sunDir = new THREE.Vector3(20, 40, 15).normalize()

    // ── Ground ────────────────────────────────────────────────────────────
    const grassMat = new THREE.ShaderMaterial({
      uniforms: { ...THREE.UniformsLib.fog, uSunDir: { value: sunDir } },
      vertexShader: GRASS_VERT, fragmentShader: GRASS_FRAG, fog: true,
    })
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(180, 180, 120, 120), grassMat)
    ground.rotation.x = -Math.PI / 2; scene.add(ground)

    // ── Fog dome ──────────────────────────────────────────────────────────
    const dome = new THREE.Mesh(
      new THREE.CylinderGeometry(80, 80, 60, 48, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x87ceeb, side: THREE.BackSide, transparent: true, opacity: 0.90, depthWrite: false }),
    )
    dome.position.y = 15; scene.add(dome)
    const rim = new THREE.Mesh(new THREE.RingGeometry(72, 82, 48), new THREE.MeshLambertMaterial({ color: 0x3a6030, side: THREE.DoubleSide }))
    rim.rotation.x = -Math.PI / 2; rim.position.y = -0.3; scene.add(rim)

    // ── Trees ─────────────────────────────────────────────────────────────
    const postMat = new THREE.MeshLambertMaterial({ color: 0x7a4f2d })
    function addTree(x: number, z: number, sc: number) {
      const g = new THREE.Group()
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * sc, 0.26 * sc, 1.8 * sc, 7), postMat)
      trunk.position.y = 0.9 * sc; trunk.castShadow = true; g.add(trunk)
      ;([{ r: 1.8, h: 2.4, y: 1.8, c: 0x2d6b29 }, { r: 1.3, h: 2.0, y: 3.0, c: 0x357a30 }, { r: 0.8, h: 1.5, y: 4.1, c: 0x3d8a37 }] as const)
        .forEach(({ r, h, y, c }) => {
          const cone = new THREE.Mesh(new THREE.ConeGeometry(r * sc, h * sc, 7), new THREE.MeshLambertMaterial({ color: c }))
          cone.position.y = y * sc; cone.castShadow = true; g.add(cone)
        })
      g.position.set(x, 0, z); scene.add(g)
    }
    const rng = mulberry32(42)
    for (let i = 0; i < 175; i++) {
      const x = (rng() - 0.5) * 130, z = rng() * 110 - 82
      if (Math.hypot(x, z) > 74) continue
      if (SECTIONS.some(s => Math.hypot(x - s.wx, z - s.wz) < 6)) continue
      addTree(x, z, 0.7 + rng() * 0.65)
    }

    // ── Sign posts ────────────────────────────────────────────────────────
    SECTIONS.forEach(({ id, label, wx, wz }) => {
      const clear = new THREE.Mesh(new THREE.CircleGeometry(4.5, 20), new THREE.MeshLambertMaterial({ color: 0x5a9c5a }))
      clear.rotation.x = -Math.PI / 2; clear.position.set(wx, 0.01, wz); scene.add(clear)
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.15, 3.2, 7), postMat)
      post.position.set(wx, 1.6, wz); post.castShadow = true; scene.add(post)
      const tex = makeSignTexture(label, id)
      const sign = new THREE.Mesh(new THREE.BoxGeometry(5.0, 2.5, 0.22), new THREE.MeshLambertMaterial({ map: tex }))
      sign.position.set(wx, 3.8, wz); sign.castShadow = true; scene.add(sign)
      const brk = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.35), new THREE.MeshLambertMaterial({ color: 0x888888 }))
      brk.position.set(wx, 3.2, wz + 0.05); scene.add(brk)
    })

    // ── Player (detailed humanoid) ─────────────────────────────────────────
    const skinMat  = new THREE.MeshLambertMaterial({ color: 0xfcd34d })
    const shirtMat = new THREE.MeshLambertMaterial({ color: 0x2563eb })
    const pantsMat = new THREE.MeshLambertMaterial({ color: 0x1e3a5f })
    const shoesMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a })
    const hairMat  = new THREE.MeshLambertMaterial({ color: 0x3d1f00 })

    const player = new THREE.Group()

    // Head
    const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.36), skinMat)
    headMesh.position.y = 1.96; headMesh.castShadow = true; player.add(headMesh)
    // Hair top
    const hairTop = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.10, 0.38), hairMat)
    hairTop.position.y = 2.19; player.add(hairTop)
    // Hair back
    const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.24, 0.06), hairMat)
    hairBack.position.set(0, 2.10, -0.18); player.add(hairBack)
    // Torso
    const torsoMesh = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.68, 0.28), shirtMat)
    torsoMesh.position.y = 1.34; torsoMesh.castShadow = true; player.add(torsoMesh)

    // Arms (pivot at shoulder, mesh hangs down)
    function makeArm(side: 1 | -1) {
      const pivot = new THREE.Group(); pivot.position.set(side * 0.37, 1.62, 0)
      const upper = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.44, 0.18), shirtMat)
      upper.position.y = -0.22; upper.castShadow = true; pivot.add(upper)
      const elbow = new THREE.Group(); elbow.position.y = -0.44
      const lower = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.42, 0.15), skinMat)
      lower.position.y = -0.21; lower.castShadow = true; elbow.add(lower)
      pivot.add(elbow); return { pivot, elbow }
    }

    // Legs (pivot at hip, thigh hangs down, knee group at bottom of thigh)
    function makeLeg(side: 1 | -1) {
      const pivot = new THREE.Group(); pivot.position.set(side * 0.14, 1.02, 0)
      const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.48, 0.22), pantsMat)
      thigh.position.y = -0.24; thigh.castShadow = true; pivot.add(thigh)
      const knee = new THREE.Group(); knee.position.y = -0.48
      const shin = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.44, 0.20), pantsMat)
      shin.position.y = -0.22; shin.castShadow = true; knee.add(shin)
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.10, 0.30), shoesMat)
      foot.position.set(0, -0.49, 0.06); knee.add(foot)
      pivot.add(knee); return { pivot, knee }
    }

    const { pivot: lArmPivot, elbow: lElbow } = makeArm(-1)
    const { pivot: rArmPivot, elbow: rElbow } = makeArm(1)
    player.add(lArmPivot, rArmPivot)
    const { pivot: lLegPivot, knee: lKnee } = makeLeg(-1)
    const { pivot: rLegPivot, knee: rKnee } = makeLeg(1)
    player.add(lLegPivot, rLegPivot)

    player.position.set(0, 0, 6); scene.add(player)

    // ── Input ─────────────────────────────────────────────────────────────
    const keys = new Set<string>()

    function triggerFocus(id: SectionId) {
      const s = SECTIONS.find(sec => sec.id === id)!
      focusPosRef.current.set(s.wx, 3.8, s.wz + 7.0)
      focusLookRef.current.set(s.wx, 3.8, s.wz)
      focusActiveRef.current = true; overlayShownRef.current = false; proxTimerRef.current = 0
    }

    const onKeyDown = (e: KeyboardEvent) => {
      keys.add(e.key.toLowerCase())
      if (e.key === 'ArrowUp') keys.add('w'); if (e.key === 'ArrowDown') keys.add('s')
      if (e.key === 'ArrowLeft') keys.add('a'); if (e.key === 'ArrowRight') keys.add('d')
      if (e.key.toLowerCase() === 'e' && !focusActiveRef.current && currentSecRef.current) triggerFocus(currentSecRef.current)
      if (e.key === 'Escape' && (focusActiveRef.current || overlayShownRef.current)) exitFocus()
    }
    const onKeyUp = (e: KeyboardEvent) => {
      keys.delete(e.key.toLowerCase())
      if (e.key === 'ArrowUp') keys.delete('w'); if (e.key === 'ArrowDown') keys.delete('s')
      if (e.key === 'ArrowLeft') keys.delete('a'); if (e.key === 'ArrowRight') keys.delete('d')
    }
    window.addEventListener('keydown', onKeyDown); window.addEventListener('keyup', onKeyUp)

    // ── Animation ─────────────────────────────────────────────────────────
    const clock = new THREE.Clock()
    const _tmpCam = camera.clone()
    let animId: number
    let walkPhase = 0
    let swingAmt  = 0
    let camYaw    = 0  // 0 = camera at +Z side of player (player starts facing -Z)

    function animate() {
      animId = requestAnimationFrame(animate)
      const delta = Math.min(clock.getDelta(), 0.05)

      // Player always hidden in cinematic mode
      player.visible = !focusActiveRef.current

      if (!focusActiveRef.current) {
        // ── Explore mode ──────────────────────────────────────────────────

        // Movement
        const vel = new THREE.Vector3()
        if (keys.has('w')) vel.z -= 1; if (keys.has('s')) vel.z += 1
        if (keys.has('a')) vel.x -= 1; if (keys.has('d')) vel.x += 1
        const isMoving = vel.lengthSq() > 0
        if (isMoving) {
          vel.normalize().multiplyScalar(6 * delta)
          player.position.add(vel)
          player.rotation.y = Math.atan2(vel.x, vel.z)
        }
        player.position.x = THREE.MathUtils.clamp(player.position.x, -28, 28)
        player.position.z = THREE.MathUtils.clamp(player.position.z, -76, 8)

        // Walk animation
        swingAmt = THREE.MathUtils.clamp(swingAmt + (isMoving ? 1 : -1) * delta * 8, 0, 1)
        if (isMoving) walkPhase += delta * 6.5
        const sw = Math.sin(walkPhase) * swingAmt * 0.55
        lArmPivot.rotation.x =  sw; rArmPivot.rotation.x = -sw
        lLegPivot.rotation.x = -sw; rLegPivot.rotation.x =  sw
        // Knee bends when leg swings backward
        lKnee.rotation.x = Math.max(0, -Math.sin(walkPhase)) * swingAmt * 0.40
        rKnee.rotation.x = Math.max(0,  Math.sin(walkPhase)) * swingAmt * 0.40
        // Subtle elbow bend while walking
        lElbow.rotation.x = swingAmt * 0.15; rElbow.rotation.x = swingAmt * 0.15
        // Body bob
        player.position.y = Math.abs(Math.sin(walkPhase * 2)) * swingAmt * 0.04

        // 3rd-person camera (follows behind player)
        if (isMoving) {
          const targetYaw = player.rotation.y + Math.PI
          camYaw = lerpAngle(camYaw, targetYaw, 0.10)
        }
        const camDist = 5.0, camH = 2.2
        const camTarget = new THREE.Vector3(
          player.position.x + Math.sin(camYaw) * camDist,
          player.position.y + camH,
          player.position.z + Math.cos(camYaw) * camDist,
        )
        camera.position.lerp(camTarget, 0.10)
        camera.lookAt(player.position.x, player.position.y + 1.4, player.position.z)

        // Proximity to signs
        let nearest: SectionId | null = null, nearDist = PROX
        SECTIONS.forEach(({ id, wx, wz }) => {
          const d = Math.hypot(player.position.x - wx, player.position.z - wz)
          if (d < nearDist) { nearDist = d; nearest = id }
        })
        if (nearest !== currentSecRef.current) {
          currentSecRef.current = nearest
          setNearSign(nearest !== null)
          if (!nearest) proxTimerRef.current = 0
        }
        if (nearest) {
          proxTimerRef.current += delta
          if (proxTimerRef.current > 2.2) triggerFocus(nearest)
        }
      } else {
        // ── Cinematic mode (lerp to sign) ─────────────────────────────────
        camera.position.lerp(focusPosRef.current, 0.028)
        _tmpCam.position.copy(camera.position); _tmpCam.lookAt(focusLookRef.current)
        camera.quaternion.slerp(_tmpCam.quaternion, 0.04)

        if (!overlayShownRef.current && camera.position.distanceTo(focusPosRef.current) < 0.6) {
          overlayShownRef.current = true
          setActiveSection(currentSecRef.current)
        }
      }

      renderer.render(scene, camera)
    }
    animate()

    const onResize = () => {
      const w = mount.clientWidth, h = mount.clientHeight
      camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <div ref={mountRef} className="w-full h-full" />

      <button
        onClick={onExit}
        className="absolute top-4 left-4 z-10 px-4 py-2 bg-black/75 backdrop-blur-sm text-white border border-white/30 rounded-full font-bold text-sm hover:bg-white hover:text-black transition-colors duration-300"
      >← 2D View</button>

      {nearSign && !activeSection && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 text-white text-xs bg-black/60 backdrop-blur-sm px-5 py-2 rounded-full pointer-events-none animate-pulse">
          Press <kbd className="font-bold">E</kbd> to inspect · or stand still for 2s
        </div>
      )}

      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white text-xs bg-black/50 backdrop-blur-sm px-5 py-2 rounded-full pointer-events-none">
        WASD · Arrow Keys &nbsp;·&nbsp; <kbd className="font-bold">E</kbd> inspect &nbsp;·&nbsp; <kbd className="font-bold">Esc</kbd> exit
      </div>

      {activeSection && <SectionOverlay id={activeSection} onClose={exitFocus} />}
    </div>
  )
}
