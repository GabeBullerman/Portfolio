import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { experienceData } from '../data/experience'
import { skillsData } from '../data/skills'
import { projectsData } from '../data/projects'

// ─── Helpers ────────────────────────────────────────────────────────────────
function mulberry32(seed: number) {
  return () => {
    seed += 0x6d2b79f5
    let t = seed
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Shortest-path angle interpolation — avoids 350°→10° spinning the long way
function lerpAngle(from: number, to: number, t: number): number {
  const twoPi = Math.PI * 2
  const delta = ((to - from) % twoPi + twoPi * 1.5) % twoPi - Math.PI
  return from + delta * t
}

// ─── GLSL ───────────────────────────────────────────────────────────────────
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
  vElev=n; vec3 pos=position; pos.z+=n;
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
  vec3 col=mix(darkG,midG,m); col=mix(col,lightG,noise2(vXZ*0.05)*0.50);
  float dry=smoothstep(0.60,0.80,noise2(vXZ*0.10+vec2(53.0,17.0)));
  col=mix(col,dryG,dry*0.45); col+=vElev*0.06;
  float NdotL=max(dot(vec3(0.0,1.0,0.0),uSunDir),0.0);
  col=col*(0.45+NdotL*0.65);
  gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);
  #include <fog_fragment>
}`

// ─── Types ──────────────────────────────────────────────────────────────────
type SectionId = 'about' | 'experience' | 'skills' | 'projects' | 'certifications' | 'moreonme' | 'contact'
interface SectionCfg { id: SectionId; label: string; wx: number; wz: number }

const SECTIONS: SectionCfg[] = [
  { id: 'about',          label: 'About Me',   wx:  0, wz:   2 },
  { id: 'experience',     label: 'Experience', wx:  8, wz: -14 },
  { id: 'skills',         label: 'Skills',     wx: -8, wz: -26 },
  { id: 'projects',       label: 'Projects',   wx:  8, wz: -38 },
  { id: 'certifications', label: 'Certs',      wx: -8, wz: -50 },
  { id: 'moreonme',       label: 'More on Me', wx:  8, wz: -62 },
  { id: 'contact',        label: 'Contact',    wx:  0, wz: -72 },
]

const PROX = 6.5

// ─── Canvas helpers ──────────────────────────────────────────────────────────
function rrect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath()
  c.moveTo(x+r,y); c.lineTo(x+w-r,y); c.quadraticCurveTo(x+w,y,x+w,y+r)
  c.lineTo(x+w,y+h-r); c.quadraticCurveTo(x+w,y+h,x+w-r,y+h)
  c.lineTo(x+r,y+h); c.quadraticCurveTo(x,y+h,x,y+h-r)
  c.lineTo(x,y+r); c.quadraticCurveTo(x,y,x+r,y); c.closePath()
}

function asyncLoadProjectImages(c: CanvasRenderingContext2D, W: number, H: number, tex: THREE.CanvasTexture) {
  const iw = 284, ih = 190, gap = 22
  const sx = (W - (3*iw + 2*gap)) / 2, sy = 196 + ((H-240) - ih) / 2
  projectsData.slice(0, 3).forEach((p, i) => {
    const img = new Image()
    img.onload = () => {
      c.save(); rrect(c, sx + i*(iw+gap), sy, iw, ih, 8); c.clip()
      c.drawImage(img, sx + i*(iw+gap), sy, iw, ih)
      c.restore(); tex.needsUpdate = true
    }
    img.src = p.image
  })
}

function asyncLoadCertImages(c: CanvasRenderingContext2D, W: number, H: number, tex: THREE.CanvasTexture) {
  const files = ['cloudPractitionerAWS','aiPractitionerAWS','developerAWS','devopsEngineerAWS']
  const iw = 156, ih = 156, gap = 26
  const sx = (W - (4*iw + 3*gap)) / 2, sy = 196 + ((H-240) - ih) / 2
  files.forEach((f, i) => {
    const img = new Image()
    img.onload = () => {
      c.save(); rrect(c, sx + i*(iw+gap), sy, iw, ih, 10); c.clip()
      c.drawImage(img, sx + i*(iw+gap), sy, iw, ih)
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
        { text:'JS', bg:'#f7df1e', fg:'#1a1a1a' }, { text:'TS', bg:'#3178c6', fg:'#fff' },
        { text:'⚛',  bg:'#20232a', fg:'#61dafb' }, { text:'Java', bg:'#e76f00', fg:'#fff' },
      ]
      const bw=148, bh=132, gap=26, tw=badges.length*bw+(badges.length-1)*gap
      let x=(W-tw)/2; const y=top+(avail-bh)/2
      badges.forEach(b => {
        c.fillStyle=b.bg; rrect(c,x,y,bw,bh,14); c.fill()
        c.fillStyle=b.fg; c.font=`bold ${b.text.length>2?34:50}px monospace`
        c.fillText(b.text,x+bw/2,y+bh/2); x+=bw+gap
      }); break
    }
    case 'projects': {
      const iw=284, ih=190, gap=22, sx=(W-(3*iw+2*gap))/2, sy=196+((H-240)-ih)/2
      projectsData.slice(0,3).forEach((p,i) => {
        c.fillStyle='rgba(255,245,224,0.10)'; rrect(c,sx+i*(iw+gap),sy,iw,ih,8); c.fill()
        c.strokeStyle='rgba(255,245,224,0.25)'; c.lineWidth=2; rrect(c,sx+i*(iw+gap),sy,iw,ih,8); c.stroke()
        c.fillStyle='#fff5e0'; c.font='bold 24px Georgia,serif'; c.fillText(p.title,sx+i*(iw+gap)+iw/2,sy+ih/2)
      }); break
    }
    case 'experience': {
      const entries=experienceData.slice(0,2), rowH=88, gap=14, totalH=entries.length*rowH+(entries.length-1)*gap
      let y=top+(avail-totalH)/2
      entries.forEach((e,i) => {
        c.fillStyle='#f5d070'; c.beginPath(); c.arc(100,y+38,12,0,Math.PI*2); c.fill()
        if (i<entries.length-1) {
          c.strokeStyle='rgba(245,208,112,0.35)'; c.lineWidth=2
          c.beginPath(); c.moveTo(100,y+50); c.lineTo(100,y+rowH+gap-12); c.stroke()
        }
        c.textAlign='left'; c.fillStyle='#fff5e0'; c.font='bold 26px Georgia,serif'
        c.fillText(e.title.split(',')[0],134,y+26)
        c.fillStyle='rgba(255,245,224,0.58)'; c.font='21px Georgia,serif'
        c.fillText(e.company+' · '+e.period,134,y+58)
        c.textAlign='center'; y+=rowH+gap
      }); break
    }
    case 'certifications': {
      const iw=156, ih=156, gap=26, sx=(W-(4*iw+3*gap))/2, sy=196+((H-240)-ih)/2
      const colors=['#d97706','#7c3aed','#16a34a','#0369a1']
      colors.forEach((col,i) => {
        const cx=sx+i*(iw+gap)+iw/2, cy=sy+ih/2
        c.fillStyle=col; c.beginPath()
        c.moveTo(cx,cy-ih*0.44); c.lineTo(cx+iw*0.44,cy-ih*0.18)
        c.lineTo(cx+iw*0.44,cy+ih*0.12); c.lineTo(cx,cy+ih*0.44)
        c.lineTo(cx-iw*0.44,cy+ih*0.12); c.lineTo(cx-iw*0.44,cy-ih*0.18)
        c.closePath(); c.fill()
        c.fillStyle='#fff'; c.font='bold 20px sans-serif'; c.fillText('AWS',cx,cy)
      }); break
    }
    case 'about': {
      const cx=W/2, cy=top+avail/2
      c.strokeStyle='rgba(245,208,112,0.55)'; c.lineWidth=4
      c.beginPath(); c.arc(cx,cy-38,74,0,Math.PI*2); c.stroke()
      c.fillStyle='rgba(255,245,224,0.14)'; c.beginPath(); c.arc(cx,cy-38,70,0,Math.PI*2); c.fill()
      c.fillStyle='rgba(255,245,224,0.38)'
      c.beginPath(); c.arc(cx,cy-60,27,0,Math.PI*2); c.fill()
      c.beginPath(); c.arc(cx,cy-10,46,Math.PI,0); c.fill()
      c.fillStyle='#fff5e0'; c.font='bold 30px Georgia,serif'; c.fillText('Gabriel Bullerman',cx,cy+58)
      c.fillStyle='rgba(255,245,224,0.58)'; c.font='21px Georgia,serif'; c.fillText('CS · Iowa State University',cx,cy+94)
      break
    }
    case 'moreonme': {
      const cats=[{icon:'🎹',label:'Hobbies'},{icon:'✈',label:'Journeys'},{icon:'💻',label:'Industry'}]
      const bw=220, bh=178, gap=46, tw=cats.length*bw+(cats.length-1)*gap
      let x=(W-tw)/2; const y=top+(avail-bh)/2
      cats.forEach(cat => {
        c.fillStyle='rgba(255,245,224,0.10)'; rrect(c,x,y,bw,bh,16); c.fill()
        c.strokeStyle='rgba(255,245,224,0.22)'; c.lineWidth=2; rrect(c,x,y,bw,bh,16); c.stroke()
        c.font='54px serif'; c.fillStyle='#fff5e0'; c.fillText(cat.icon,x+bw/2,y+74)
        c.font='bold 24px Georgia,serif'; c.fillText(cat.label,x+bw/2,y+142); x+=bw+gap
      }); break
    }
    case 'contact': {
      const items=[{icon:'✉',label:'Email',bg:'#b91c1c'},{icon:'◉',label:'GitHub',bg:'#1f2937'},{icon:'🔗',label:'LinkedIn',bg:'#0369a1'}]
      const bw=204, bh=178, gap=58, tw=items.length*bw+(items.length-1)*gap
      let x=(W-tw)/2; const y=top+(avail-bh)/2
      items.forEach(item => {
        c.fillStyle=item.bg; rrect(c,x,y,bw,bh,16); c.fill()
        c.font='58px serif'; c.fillStyle='#fff'; c.fillText(item.icon,x+bw/2,y+82)
        c.font='bold 24px Georgia,serif'; c.fillText(item.label,x+bw/2,y+146); x+=bw+gap
      }); break
    }
  }
  c.restore()
}

function makeSignTexture(label: string, id: SectionId): THREE.CanvasTexture {
  const W=1024, H=512
  const cv=document.createElement('canvas'); cv.width=W; cv.height=H
  const c=cv.getContext('2d')!
  const plankCols=['#c89060','#b87c4e','#cc9668','#b27248']
  const ph=H/plankCols.length
  plankCols.forEach((col,i) => {
    c.fillStyle=col; c.fillRect(0,i*ph,W,ph)
    c.fillStyle='#5a2e10'; c.fillRect(0,(i+1)*ph-5,W,10)
  })
  const grainRng=mulberry32(label.charCodeAt(0)*97+id.length*31+7)
  for (let i=0;i<28;i++) {
    const x=grainRng()*W, y=grainRng()*H
    c.strokeStyle=`rgba(0,0,0,${0.02+grainRng()*0.04})`; c.lineWidth=0.5+grainRng()*1.5
    c.beginPath(); c.moveTo(x,y)
    c.quadraticCurveTo(x+(grainRng()-0.5)*50,y+(grainRng()-0.5)*30,x+(grainRng()-0.5)*30,y+grainRng()*100)
    c.stroke()
  }
  c.strokeStyle='#5a2e10'; c.lineWidth=22; c.strokeRect(11,11,W-22,H-22)
  c.strokeStyle='#8a4c24'; c.lineWidth=6; c.strokeRect(26,26,W-52,H-52)
  ;[[36,36],[W-36,36],[36,H-36],[W-36,H-36]].forEach(([nx,ny]) => {
    c.fillStyle='#777'; c.beginPath(); c.arc(nx,ny,9,0,Math.PI*2); c.fill()
    c.fillStyle='#bbb'; c.beginPath(); c.arc(nx-2,ny-2,3,0,Math.PI*2); c.fill()
  })
  c.fillStyle='rgba(50,22,6,0.50)'; c.fillRect(30,30,W-60,138)
  c.fillStyle='#fff5e0'; c.font=`bold ${label.length>9?68:82}px Georgia,serif`
  c.textAlign='center'; c.textBaseline='middle'
  c.shadowColor='rgba(0,0,0,0.55)'; c.shadowOffsetX=3; c.shadowOffsetY=3; c.shadowBlur=8
  c.fillText(label,W/2,99); c.shadowColor='transparent'
  c.strokeStyle='#7a4024'; c.lineWidth=3; c.beginPath(); c.moveTo(44,174); c.lineTo(W-44,174); c.stroke()
  ;[W/2-130,W/2,W/2+130].forEach(dx => {
    c.save(); c.translate(dx,174); c.rotate(Math.PI/4)
    c.fillStyle='#7a4024'; c.fillRect(-8,-8,16,16)
    c.fillStyle='#c49060'; c.fillRect(-3,-3,6,6); c.restore()
  })
  drawSignPreview(c,id,W,H)
  const tex=new THREE.CanvasTexture(cv)
  if (id==='projects') asyncLoadProjectImages(c,W,H,tex)
  if (id==='certifications') asyncLoadCertImages(c,W,H,tex)
  return tex
}

// ─── Overlay ─────────────────────────────────────────────────────────────────
const WT='#fff5e0', WM='rgba(255,245,224,0.65)', WD='rgba(255,245,224,0.45)'

function SectionOverlay({ id, onClose }: { id: SectionId; onClose: () => void }) {
  const label = SECTIONS.find(s => s.id === id)?.label ?? ''
  return (
    <div className="absolute inset-0 flex items-center justify-center z-20">
      <div className="absolute inset-0 bg-black/25" onClick={onClose} />
      <div className="relative z-10 flex flex-col overflow-hidden" style={{
        width:'min(680px,88vw)', maxHeight:'74vh',
        background:'linear-gradient(180deg,#c89060 0%,#b87c4e 25%,#cc9668 50%,#b27248 75%,#c89060 100%)',
        border:'14px solid #5a2e10', outline:'3px solid #8a4c24',
        boxShadow:'0 28px 72px rgba(0,0,0,0.72)', borderRadius:'3px',
      }}>
        <div className="flex justify-between items-center px-6 py-3 flex-shrink-0" style={{background:'rgba(50,22,6,0.55)'}}>
          <h2 className="font-bold text-lg font-serif" style={{color:WT}}>{label}</h2>
          <button onClick={onClose} className="text-2xl leading-none hover:opacity-100" style={{color:WD}}>×</button>
        </div>
        <div className="flex-shrink-0 mx-5" style={{height:2,background:'#7a4024'}} />
        <div className="overflow-y-auto flex-1 px-6 py-5"><Content id={id} /></div>
        <div className="flex-shrink-0 text-center py-2 text-xs font-serif" style={{color:WD,background:'rgba(50,22,6,0.25)'}}>
          Press <kbd>ESC</kbd>, move, or click outside to close
        </div>
      </div>
    </div>
  )
}

function Content({ id }: { id: SectionId }) {
  if (id==='about') return (
    <div>
      <p className="font-bold text-sm mb-1" style={{color:WT}}>Gabriel John Bullerman</p>
      <p className="text-xs mb-3" style={{color:WM}}>CS · Iowa State University</p>
      <p className="text-xs leading-relaxed" style={{color:WM}}>Undergraduate CS major interested in full-stack development, mobile apps, and webapps.</p>
      <div className="flex gap-2 mt-4 flex-wrap">
        {[['GitHub','https://github.com/GabeBullerman'],['LinkedIn','https://www.linkedin.com/in/gabe-bullerman/']].map(([l,h])=>(
          <a key={l} href={h} target="_blank" rel="noopener noreferrer"
            className="text-xs px-3 py-1 rounded-full font-bold hover:opacity-80"
            style={{border:'2px solid rgba(255,245,224,0.45)',color:WT}}>{l}</a>
        ))}
      </div>
    </div>
  )
  if (id==='experience') return (
    <div className="space-y-4">
      {experienceData.map(e=>(
        <div key={e.company}>
          <p className="font-bold text-xs" style={{color:WT}}>{e.title}</p>
          <p className="text-xs mb-1" style={{color:WD}}>{e.company} · {e.period}</p>
          <ul className="text-xs list-disc pl-4 space-y-1 leading-relaxed" style={{color:WM}}>
            {e.bullets.map((b,i)=><li key={i}>{b}</li>)}
          </ul>
        </div>
      ))}
    </div>
  )
  if (id==='skills') return (
    <div className="space-y-3">
      {skillsData.map(cat=>(
        <div key={cat.category}>
          <p className="font-bold text-xs mb-1" style={{color:WT}}>{cat.category}</p>
          <p className="text-xs leading-relaxed" style={{color:WM}}>{cat.skills.map(s=>s.name).join(', ')}</p>
        </div>
      ))}
    </div>
  )
  if (id==='projects') return (
    <div className="space-y-4">
      {projectsData.map(p=>(
        <div key={p.title} className="pb-3 last:pb-0" style={{borderBottom:'1px solid rgba(255,245,224,0.15)'}}>
          <a href={p.link} target="_blank" rel="noopener noreferrer" className="font-bold text-xs hover:underline block" style={{color:WT}}>{p.title}</a>
          <p className="text-xs mb-1" style={{color:WD}}>{p.subtitle}</p>
          <p className="text-xs leading-relaxed" style={{color:WM}}>{p.description}</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {p.tags.map(t=><span key={t} className="text-xs rounded-full px-2 py-0.5" style={{border:'1px solid rgba(255,245,224,0.28)',color:WD}}>{t}</span>)}
          </div>
        </div>
      ))}
    </div>
  )
  if (id==='certifications') return (
    <div className="text-center">
      <p className="text-xs mb-3" style={{color:WD}}>AWS Certification Path</p>
      <div className="grid grid-cols-2 gap-3">
        {[['cloudPractitionerAWS','Cloud Practitioner'],['aiPractitionerAWS','AI Practitioner'],['developerAWS','Developer'],['devopsEngineerAWS','DevOps Engineer']].map(([f,l])=>(
          <div key={l} className="flex flex-col items-center">
            <img src={`/images/${f}.png`} alt={l} className="w-14 h-14 object-contain"/>
            <p className="text-xs mt-1" style={{color:WM}}>{l}</p>
          </div>
        ))}
      </div>
    </div>
  )
  if (id==='moreonme') return (
    <div className="space-y-4">
      {[['Hobbies','Piano, Kawasaki sports bike restoration, film (IMDB top 250 — Interstellar #1).'],
        ['Journeys','49/50 US states. Greece, Italy, Japan — chasing contrasts in culture and landscape.'],
        ['Industry','Built 40+ computers since age 8. A high-school question flipped the switch from hardware to software.']].map(([t,p])=>(
        <div key={t}>
          <p className="font-bold text-xs uppercase tracking-wide mb-1" style={{color:WT}}>{t}</p>
          <p className="text-xs leading-relaxed" style={{color:WM}}>{p}</p>
        </div>
      ))}
    </div>
  )
  return (
    <div className="space-y-3">
      {[['fa-brands fa-github','GitHub','https://github.com/GabeBullerman'],
        ['fa-brands fa-linkedin','LinkedIn','https://www.linkedin.com/in/gabe-bullerman/'],
        ['fa-solid fa-envelope','gabebullerman1@gmail.com','mailto:gabebullerman1@gmail.com']].map(([icon,label,href])=>(
        <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-xs hover:underline" style={{color:WM}}>
          <i className={icon} style={{color:WT}}/>{label}
        </a>
      ))}
      <div className="flex items-center gap-3 text-xs" style={{color:WM}}><i className="fa-solid fa-phone" style={{color:WT}}/>319-230-0474</div>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function ThreePortfolio({ onExit }: { onExit: () => void }) {
  const mountRef       = useRef<HTMLDivElement>(null)
  const [activeSection, setActiveSection] = useState<SectionId | null>(null)
  const [nearSign, setNearSign]           = useState(false)

  const focusPosRef     = useRef(new THREE.Vector3())
  const focusLookRef    = useRef(new THREE.Vector3())
  const focusActiveRef  = useRef(false)
  const overlayShownRef = useRef(false)
  const proxTimerRef    = useRef(0)
  const currentSecRef   = useRef<SectionId | null>(null)
  // Prevents sign from re-triggering immediately after the player presses ESC
  const exitedRef       = useRef(false)

  function exitFocus() {
    focusActiveRef.current  = false
    overlayShownRef.current = false
    proxTimerRef.current    = 0
    exitedRef.current       = true   // suppresses re-trigger until player moves away
    setActiveSection(null)
    setNearSign(false)
  }

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const W = mount.clientWidth, H = mount.clientHeight

    // ── Scene ────────────────────────────────────────────────────────────
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x87ceeb)
    scene.fog = new THREE.FogExp2(0x87ceeb, 0.012)

    const camera = new THREE.PerspectiveCamera(65, W/H, 0.1, 200)
    camera.position.set(0, 2.2, 11)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(W, H); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap
    mount.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight(0xffffff, 0.55))
    const sun = new THREE.DirectionalLight(0xfff4e0, 1.1)
    sun.position.set(20, 40, 15); sun.castShadow = true
    sun.shadow.mapSize.set(2048,2048)
    sun.shadow.camera.left=-80; sun.shadow.camera.right=80
    sun.shadow.camera.top=80; sun.shadow.camera.bottom=-80; sun.shadow.camera.far=160
    scene.add(sun)
    const sunDir = new THREE.Vector3(20,40,15).normalize()

    // ── Ground ───────────────────────────────────────────────────────────
    const grassMat = new THREE.ShaderMaterial({
      uniforms: { ...THREE.UniformsLib.fog, uSunDir:{ value:sunDir } },
      vertexShader: GRASS_VERT, fragmentShader: GRASS_FRAG, fog: true,
    })
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(180,180,120,120), grassMat)
    ground.rotation.x = -Math.PI/2; scene.add(ground)

    // Fog dome + map rim
    const dome = new THREE.Mesh(
      new THREE.CylinderGeometry(80,80,60,48,1,true),
      new THREE.MeshBasicMaterial({ color:0x87ceeb, side:THREE.BackSide, transparent:true, opacity:0.90, depthWrite:false }),
    )
    dome.position.y = 15; scene.add(dome)
    const rim = new THREE.Mesh(new THREE.RingGeometry(72,82,48), new THREE.MeshLambertMaterial({ color:0x3a6030, side:THREE.DoubleSide }))
    rim.rotation.x = -Math.PI/2; rim.position.y = -0.3; scene.add(rim)

    // ── Trees ────────────────────────────────────────────────────────────
    const postMat = new THREE.MeshLambertMaterial({ color:0x7a4f2d })
    function addTree(x: number, z: number, sc: number) {
      const g = new THREE.Group()
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18*sc,0.26*sc,1.8*sc,7), postMat)
      trunk.position.y=0.9*sc; trunk.castShadow=true; g.add(trunk)
      ;([{r:1.8,h:2.4,y:1.8,c:0x2d6b29},{r:1.3,h:2.0,y:3.0,c:0x357a30},{r:0.8,h:1.5,y:4.1,c:0x3d8a37}] as const).forEach(({r,h,y,c})=>{
        const cone = new THREE.Mesh(new THREE.ConeGeometry(r*sc,h*sc,7), new THREE.MeshLambertMaterial({color:c}))
        cone.position.y=y*sc; cone.castShadow=true; g.add(cone)
      })
      g.position.set(x,0,z); scene.add(g)
    }
    const rng = mulberry32(42)
    for (let i=0; i<175; i++) {
      const x=(rng()-0.5)*130, z=rng()*110-82
      if (Math.hypot(x,z)>74) continue
      if (SECTIONS.some(s=>Math.hypot(x-s.wx,z-s.wz)<6.5)) continue
      addTree(x,z,0.7+rng()*0.65)
    }

    // ── Signs ────────────────────────────────────────────────────────────
    SECTIONS.forEach(({ id, label, wx, wz }) => {
      const clear = new THREE.Mesh(new THREE.CircleGeometry(4.5,20), new THREE.MeshLambertMaterial({color:0x5a9c5a}))
      clear.rotation.x=-Math.PI/2; clear.position.set(wx,0.01,wz); scene.add(clear)
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.10,0.15,3.2,7), postMat)
      post.position.set(wx,1.6,wz); post.castShadow=true; scene.add(post)
      const sign = new THREE.Mesh(new THREE.BoxGeometry(5.0,2.5,0.22), new THREE.MeshLambertMaterial({map:makeSignTexture(label,id)}))
      sign.position.set(wx,3.8,wz); sign.castShadow=true; scene.add(sign)
      const brk = new THREE.Mesh(new THREE.BoxGeometry(0.18,0.18,0.35), new THREE.MeshLambertMaterial({color:0x888888}))
      brk.position.set(wx,3.2,wz+0.05); scene.add(brk)
    })

    // ── Campfire ─────────────────────────────────────────────────────────
    const logMat = new THREE.MeshLambertMaterial({ color:0x5a3010 })
    const logGeo = new THREE.CylinderGeometry(0.08,0.11,1.6,6)
    const FIRE_POS = new THREE.Vector3(0,0,-6)
    ;[0, Math.PI/3, -Math.PI/3].forEach(ry => {
      const log = new THREE.Mesh(logGeo, logMat)
      log.position.copy(FIRE_POS); log.position.y=0.09
      log.rotation.z=Math.PI/2; log.rotation.y=ry; scene.add(log)
    })
    for (let i=0; i<9; i++) {
      const stone = new THREE.Mesh(new THREE.SphereGeometry(0.13,5,4), new THREE.MeshLambertMaterial({color:0x888888}))
      stone.position.set(FIRE_POS.x+Math.sin(i*Math.PI*2/9)*0.68,0.09,FIRE_POS.z+Math.cos(i*Math.PI*2/9)*0.68)
      scene.add(stone)
    }
    const flameMat  = new THREE.MeshBasicMaterial({ color:0xff6600 })
    const flameMesh = new THREE.Mesh(new THREE.ConeGeometry(0.32,0.85,8), flameMat)
    flameMesh.position.set(FIRE_POS.x,0.52,FIRE_POS.z); scene.add(flameMesh)
    const innerFlameMat  = new THREE.MeshBasicMaterial({ color:0xffee00 })
    const innerFlameMesh = new THREE.Mesh(new THREE.ConeGeometry(0.16,0.54,8), innerFlameMat)
    innerFlameMesh.position.set(FIRE_POS.x,0.52,FIRE_POS.z); scene.add(innerFlameMesh)
    const fireLight = new THREE.PointLight(0xff7700, 1.6, 9)
    fireLight.position.set(FIRE_POS.x,1.0,FIRE_POS.z); scene.add(fireLight)

    // ── Fireflies ─────────────────────────────────────────────────────────
    const FF_COUNT = 40
    const ffGeo = new THREE.SphereGeometry(0.055, 4, 3)
    const ffMat = new THREE.MeshBasicMaterial({ color:0xffff55 })
    const ffMesh = new THREE.InstancedMesh(ffGeo, ffMat, FF_COUNT)
    ffMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(ffMesh)
    const ffRng = mulberry32(1337)
    const ffData = Array.from({ length:FF_COUNT }, () => ({
      bx: (ffRng()-0.5)*120, by: 0.7+ffRng()*4, bz: ffRng()*95-80,
      ph: ffRng()*Math.PI*2, sp: 0.35+ffRng()*0.75, am: 1.0+ffRng()*2.8,
    }))

    // ── Physics balls ────────────────────────────────────────────────────
    const BALL_R  = 0.42
    const PLAYER_R = 0.38
    interface PhysBall { mesh: THREE.Mesh; vel: THREE.Vector3 }
    const balls: PhysBall[] = []
    const ballColors = [0xff4444, 0x44cc44, 0x4488ff, 0xffcc22, 0xff44dd, 0x44ffee, 0xff8800, 0xaa44ff]
    const ballSpots: [number,number][] = [[6,-12],[-9,-26],[12,-38],[-12,-50],[3,-7],[-4,-18],[14,-32],[-14,-44]]
    ballColors.forEach((color,i) => {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(BALL_R,12,8),
        new THREE.MeshLambertMaterial({ color }),
      )
      mesh.position.set(ballSpots[i][0], BALL_R, ballSpots[i][1])
      mesh.castShadow = true; scene.add(mesh)
      balls.push({ mesh, vel:new THREE.Vector3() })
    })

    // ── Player ───────────────────────────────────────────────────────────
    const skinMat  = new THREE.MeshLambertMaterial({ color:0xfcd34d })
    const shirtMat = new THREE.MeshLambertMaterial({ color:0x2563eb })
    const pantsMat = new THREE.MeshLambertMaterial({ color:0x1e3a5f })
    const shoesMat = new THREE.MeshLambertMaterial({ color:0x1a1a1a })
    const hairMat  = new THREE.MeshLambertMaterial({ color:0x3d1f00 })

    const player = new THREE.Group()
    const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.36,0.36,0.36), skinMat)
    headMesh.position.y=1.96; headMesh.castShadow=true; player.add(headMesh)
    const hairTop = new THREE.Mesh(new THREE.BoxGeometry(0.38,0.10,0.38), hairMat)
    hairTop.position.y=2.19; player.add(hairTop)
    const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.36,0.24,0.06), hairMat)
    hairBack.position.set(0,2.10,-0.18); player.add(hairBack)
    const torsoMesh = new THREE.Mesh(new THREE.BoxGeometry(0.52,0.68,0.28), shirtMat)
    torsoMesh.position.y=1.34; torsoMesh.castShadow=true; player.add(torsoMesh)

    function makeArm(side:1|-1) {
      const pivot=new THREE.Group(); pivot.position.set(side*0.37,1.62,0)
      const upper=new THREE.Mesh(new THREE.BoxGeometry(0.18,0.44,0.18), shirtMat)
      upper.position.y=-0.22; upper.castShadow=true; pivot.add(upper)
      const elbow=new THREE.Group(); elbow.position.y=-0.44
      const lower=new THREE.Mesh(new THREE.BoxGeometry(0.15,0.42,0.15), skinMat)
      lower.position.y=-0.21; lower.castShadow=true; elbow.add(lower)
      pivot.add(elbow); return { pivot, elbow }
    }
    function makeLeg(side:1|-1) {
      const pivot=new THREE.Group(); pivot.position.set(side*0.14,1.02,0)
      const thigh=new THREE.Mesh(new THREE.BoxGeometry(0.22,0.48,0.22), pantsMat)
      thigh.position.y=-0.24; thigh.castShadow=true; pivot.add(thigh)
      const knee=new THREE.Group(); knee.position.y=-0.48
      const shin=new THREE.Mesh(new THREE.BoxGeometry(0.20,0.44,0.20), pantsMat)
      shin.position.y=-0.22; shin.castShadow=true; knee.add(shin)
      const foot=new THREE.Mesh(new THREE.BoxGeometry(0.22,0.10,0.30), shoesMat)
      foot.position.set(0,-0.49,0.06); knee.add(foot)
      pivot.add(knee); return { pivot, knee }
    }
    const { pivot:lArmPivot, elbow:lElbow } = makeArm(-1)
    const { pivot:rArmPivot, elbow:rElbow } = makeArm(1)
    player.add(lArmPivot, rArmPivot)
    const { pivot:lLegPivot, knee:lKnee } = makeLeg(-1)
    const { pivot:rLegPivot, knee:rKnee } = makeLeg(1)
    player.add(lLegPivot, rLegPivot)
    player.position.set(0,0,6); scene.add(player)

    // ── Input ────────────────────────────────────────────────────────────
    const keys = new Set<string>()

    function triggerFocus(id: SectionId) {
      const s = SECTIONS.find(sec=>sec.id===id)!
      focusPosRef.current.set(s.wx,3.8,s.wz+7.0)
      focusLookRef.current.set(s.wx,3.8,s.wz)
      focusActiveRef.current=true; overlayShownRef.current=false; proxTimerRef.current=0
    }

    function keyToWASD(key: string): string {
      if (key==='arrowup') return 'w'; if (key==='arrowdown') return 's'
      if (key==='arrowleft') return 'a'; if (key==='arrowright') return 'd'
      return key
    }

    const onKeyDown = (e: KeyboardEvent) => {
      const mapped = keyToWASD(e.key.toLowerCase())
      keys.add(mapped)

      // Any movement key closes the overlay so the player can walk away
      if (['w','a','s','d'].includes(mapped) && (focusActiveRef.current || overlayShownRef.current)) {
        exitFocus(); return
      }

      if (mapped==='e' && !focusActiveRef.current && !exitedRef.current && currentSecRef.current) {
        triggerFocus(currentSecRef.current)
      }
      if (e.key==='Escape' && (focusActiveRef.current || overlayShownRef.current)) {
        exitFocus()
      }
    }
    const onKeyUp = (e: KeyboardEvent) => { keys.delete(keyToWASD(e.key.toLowerCase())) }
    // Clear all held keys if window loses focus (prevents stuck-key bug)
    const onBlur = () => keys.clear()

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup',   onKeyUp)
    window.addEventListener('blur',    onBlur)

    // ── Animation ─────────────────────────────────────────────────────────
    const _tmpCam  = camera.clone()
    const _mat4    = new THREE.Matrix4()
    const _rotAxis = new THREE.Vector3()
    let animId:  number
    let elapsed  = 0
    let lastTime = performance.now()
    let walkPhase = 0
    let swingAmt  = 0
    // camYaw: angle such that camera sits at player + (sin(camYaw)*dist, h, cos(camYaw)*dist)
    // 0 = camera at +Z side (behind player who faces -Z by default)
    let camYaw = 0

    function animate() {
      animId = requestAnimationFrame(animate)
      const now = performance.now()
      const delta = Math.min((now - lastTime) / 1000, 0.05)
      lastTime = now; elapsed += delta

      player.visible = !focusActiveRef.current

      if (!focusActiveRef.current) {
        // ── Camera-relative WASD movement ──────────────────────────────
        // fw = direction from camera toward player (player's "forward")
        const fw_x = -Math.sin(camYaw), fw_z = -Math.cos(camYaw)
        // rt = screen-right = fw rotated 90° CW from above
        const rt_x =  Math.cos(camYaw), rt_z = -Math.sin(camYaw)

        const rawVel = new THREE.Vector3()
        if (keys.has('w')) { rawVel.x += fw_x; rawVel.z += fw_z }
        if (keys.has('s')) { rawVel.x -= fw_x; rawVel.z -= fw_z }
        if (keys.has('a')) { rawVel.x -= rt_x; rawVel.z -= rt_z }
        if (keys.has('d')) { rawVel.x += rt_x; rawVel.z += rt_z }

        const isMoving = rawVel.lengthSq() > 0
        if (isMoving) {
          // Smooth rotation — lerp player facing toward movement direction
          const targetRotY = Math.atan2(rawVel.x, rawVel.z)
          player.rotation.y = lerpAngle(player.rotation.y, targetRotY, 0.16)
          rawVel.normalize().multiplyScalar(6 * delta)
          player.position.add(rawVel)
        }
        player.position.x = THREE.MathUtils.clamp(player.position.x, -28, 28)
        player.position.z = THREE.MathUtils.clamp(player.position.z, -78, 8)

        // Walk animation with smooth ramp
        swingAmt = THREE.MathUtils.clamp(swingAmt + (isMoving ? 1 : -1) * delta * 8, 0, 1)
        if (isMoving) walkPhase += delta * 6.5
        const sw = Math.sin(walkPhase) * swingAmt * 0.55
        lArmPivot.rotation.x =  sw; rArmPivot.rotation.x = -sw
        lLegPivot.rotation.x = -sw; rLegPivot.rotation.x =  sw
        lKnee.rotation.x = Math.max(0, -Math.sin(walkPhase)) * swingAmt * 0.40
        rKnee.rotation.x = Math.max(0,  Math.sin(walkPhase)) * swingAmt * 0.40
        lElbow.rotation.x = swingAmt * 0.15; rElbow.rotation.x = swingAmt * 0.15
        player.position.y = Math.abs(Math.sin(walkPhase * 2)) * swingAmt * 0.04

        // 3rd-person camera — swing smoothly behind player
        if (isMoving) {
          camYaw = lerpAngle(camYaw, player.rotation.y + Math.PI, 0.10)
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
          // Player moved to a different area — reset exit cooldown so the new sign can trigger
          currentSecRef.current = nearest
          exitedRef.current = false
          setNearSign(nearest !== null)
          proxTimerRef.current = 0
        }

        // Only auto-trigger if player hasn't just dismissed this sign
        if (nearest && !exitedRef.current) {
          proxTimerRef.current += delta
          if (proxTimerRef.current > 2.2) triggerFocus(nearest)
        }

        // Physics balls
        balls.forEach(b => {
          b.vel.x *= 0.88; b.vel.z *= 0.88
          b.mesh.position.x += b.vel.x * delta * 60
          b.mesh.position.z += b.vel.z * delta * 60
          b.mesh.position.y = BALL_R

          // Map boundary
          const br = Math.hypot(b.mesh.position.x, b.mesh.position.z)
          if (br > 68) {
            const nx = b.mesh.position.x/br, nz = b.mesh.position.z/br
            b.mesh.position.x = nx*68; b.mesh.position.z = nz*68
            const dot = b.vel.x*nx + b.vel.z*nz
            b.vel.x -= 2*dot*nx; b.vel.z -= 2*dot*nz
          }

          // Player collision — player kicks ball
          const pdx = b.mesh.position.x - player.position.x
          const pdz = b.mesh.position.z - player.position.z
          const pd  = Math.sqrt(pdx*pdx + pdz*pdz)
          if (pd < PLAYER_R + BALL_R + 0.05 && pd > 0.01) {
            const nx = pdx/pd, nz = pdz/pd
            b.vel.x = nx * 5.5; b.vel.z = nz * 5.5
            b.mesh.position.x = player.position.x + nx * (PLAYER_R + BALL_R + 0.06)
            b.mesh.position.z = player.position.z + nz * (PLAYER_R + BALL_R + 0.06)
          }

          // Ball-ball elastic collision
          balls.forEach(b2 => {
            if (b === b2) return
            const dx = b.mesh.position.x - b2.mesh.position.x
            const dz = b.mesh.position.z - b2.mesh.position.z
            const d  = Math.sqrt(dx*dx + dz*dz)
            if (d < BALL_R*2 && d > 0.01) {
              const nx = dx/d, nz = dz/d
              const rvx = b.vel.x - b2.vel.x, rvz = b.vel.z - b2.vel.z
              const impulse = rvx*nx + rvz*nz
              if (impulse < 0) {
                b.vel.x -= impulse*nx; b.vel.z -= impulse*nz
                b2.vel.x += impulse*nx; b2.vel.z += impulse*nz
              }
              const overlap = BALL_R*2 - d
              b.mesh.position.x += nx*overlap*0.5; b.mesh.position.z += nz*overlap*0.5
              b2.mesh.position.x -= nx*overlap*0.5; b2.mesh.position.z -= nz*overlap*0.5
            }
          })

          // Rolling rotation
          const spd = b.vel.length()
          if (spd > 0.02) {
            _rotAxis.set(-b.vel.z, 0, b.vel.x).normalize()
            b.mesh.rotateOnWorldAxis(_rotAxis, spd * delta * 60 * (1/BALL_R) * 0.09)
          }
        })
      } else {
        // ── Cinematic: glide camera to sign ────────────────────────────
        camera.position.lerp(focusPosRef.current, 0.028)
        _tmpCam.position.copy(camera.position); _tmpCam.lookAt(focusLookRef.current)
        camera.quaternion.slerp(_tmpCam.quaternion, 0.04)

        if (!overlayShownRef.current && camera.position.distanceTo(focusPosRef.current) < 0.6) {
          overlayShownRef.current = true
          setActiveSection(currentSecRef.current)
        }
      }

      // ── Campfire animation (always) ───────────────────────────────────
      const flameG = 0.32 + Math.sin(elapsed*7)*0.10 + Math.sin(elapsed*13)*0.06
      flameMat.color.setRGB(1, flameG, 0)
      flameMesh.rotation.y = elapsed * 2.5
      flameMesh.scale.y    = 1 + Math.sin(elapsed*9)*0.08 + Math.sin(elapsed*14)*0.04
      innerFlameMesh.rotation.y = -elapsed * 3.5
      innerFlameMesh.scale.y    = 1 + Math.sin(elapsed*11+1)*0.12
      fireLight.intensity  = 1.4 + Math.sin(elapsed*7)*0.35 + Math.sin(elapsed*17)*0.18

      // ── Fireflies ─────────────────────────────────────────────────────
      ffData.forEach((f, i) => {
        _mat4.makeTranslation(
          f.bx + Math.sin(elapsed*f.sp + f.ph) * f.am,
          f.by + Math.sin(elapsed*f.sp*1.3 + f.ph) * 0.5,
          f.bz + Math.cos(elapsed*f.sp*0.8 + f.ph) * f.am * 0.7,
        )
        ffMesh.setMatrixAt(i, _mat4)
      })
      ffMesh.instanceMatrix.needsUpdate = true

      renderer.render(scene, camera)
    }
    animate()

    const onResize = () => {
      const w=mount.clientWidth, h=mount.clientHeight
      camera.aspect=w/h; camera.updateProjectionMatrix(); renderer.setSize(w,h)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup',   onKeyUp)
      window.removeEventListener('blur',    onBlur)
      window.removeEventListener('resize',  onResize)
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
        WASD · Arrows &nbsp;·&nbsp; <kbd className="font-bold">E</kbd> inspect &nbsp;·&nbsp; <kbd className="font-bold">Esc</kbd> or move to close
      </div>

      {activeSection && <SectionOverlay id={activeSection} onClose={exitFocus} />}
    </div>
  )
}
