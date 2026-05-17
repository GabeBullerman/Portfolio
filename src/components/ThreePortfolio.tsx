import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'
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

// ─── Bowling constants ────────────────────────────────────────────────────────
const BOWL_CX      = 22          // lane centre X
const BOWL_START_Z = -20         // where player throws from
const BOWL_PINS_Z  = -36         // front pin Z
const BOWL_LANE_Z  = -28         // lane visual centre Z
const BOWL_PROX    = 5.5         // approach distance to start game
const PIN_H        = 0.40        // pin height
const PIN_R_BOT    = 0.07        // pin base radius
const PIN_R_TOP    = 0.04        // pin neck radius
const BOWL_BALL_R  = 0.13        // bowling ball radius
const PIN_SPACING  = 0.48
const PIN_ROW_D    = 0.54
const PIN_Y = 0.04 + PIN_H / 2
const PIN_POSITIONS: [number, number, number][] = [
  // Row 1 (head pin)
  [BOWL_CX,                       PIN_Y, BOWL_PINS_Z],
  // Row 2
  [BOWL_CX - PIN_SPACING / 2,     PIN_Y, BOWL_PINS_Z - PIN_ROW_D],
  [BOWL_CX + PIN_SPACING / 2,     PIN_Y, BOWL_PINS_Z - PIN_ROW_D],
  // Row 3
  [BOWL_CX - PIN_SPACING,         PIN_Y, BOWL_PINS_Z - PIN_ROW_D * 2],
  [BOWL_CX,                       PIN_Y, BOWL_PINS_Z - PIN_ROW_D * 2],
  [BOWL_CX + PIN_SPACING,         PIN_Y, BOWL_PINS_Z - PIN_ROW_D * 2],
  // Row 4 (back)
  [BOWL_CX - PIN_SPACING * 1.5,   PIN_Y, BOWL_PINS_Z - PIN_ROW_D * 3],
  [BOWL_CX - PIN_SPACING * 0.5,   PIN_Y, BOWL_PINS_Z - PIN_ROW_D * 3],
  [BOWL_CX + PIN_SPACING * 0.5,   PIN_Y, BOWL_PINS_Z - PIN_ROW_D * 3],
  [BOWL_CX + PIN_SPACING * 1.5,   PIN_Y, BOWL_PINS_Z - PIN_ROW_D * 3],
]

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
      })
      c.font='18px Georgia,serif'; c.fillStyle='rgba(255,245,224,0.65)'
      c.fillText('Frontend · Backend · DevOps', W/2, top + avail - 28)
      break
    }
    case 'projects': {
      const iw=284, ih=190, gap=22, sx=(W-(3*iw+2*gap))/2, sy=196+((H-240)-ih)/2
      projectsData.slice(0,3).forEach((p,i) => {
        c.fillStyle='rgba(255,245,224,0.10)'; rrect(c,sx+i*(iw+gap),sy,iw,ih,8); c.fill()
        c.strokeStyle='rgba(255,245,224,0.25)'; c.lineWidth=2; rrect(c,sx+i*(iw+gap),sy,iw,ih,8); c.stroke()
        c.fillStyle='#fff5e0'; c.font='bold 24px Georgia,serif'; c.fillText(p.title,sx+i*(iw+gap)+iw/2,sy+ih/2)
      })
      c.font='18px Georgia,serif'; c.fillStyle='rgba(255,245,224,0.65)'
      c.fillText('Full-Stack · Mobile · Web', W/2, top + avail - 28)
      break
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
      })
      c.font='18px Georgia,serif'; c.fillStyle='rgba(255,245,224,0.65)'
      c.fillText('1.5 yrs · Full-Stack · DevOps', W/2, top + avail - 28)
      break
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
      })
      c.font='18px Georgia,serif'; c.fillStyle='rgba(255,245,224,0.65)'
      c.fillText('4 AWS Certifications · Cloud Ready', W/2, top + avail - 28)
      break
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
      c.font='18px Georgia,serif'; c.fillStyle='rgba(255,245,224,0.65)'
      c.fillText('Full-Stack Developer | React · TypeScript · Java', cx, cy + 126)
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
      })
      c.font='18px Georgia,serif'; c.fillStyle='rgba(255,245,224,0.65)'
      c.fillText('Travel · Passion · Growth', W/2, top + avail - 28)
      break
    }
    case 'contact': {
      const items=[{icon:'✉',label:'Email',bg:'#b91c1c'},{icon:'◉',label:'GitHub',bg:'#1f2937'},{icon:'🔗',label:'LinkedIn',bg:'#0369a1'}]
      const bw=204, bh=178, gap=58, tw=items.length*bw+(items.length-1)*gap
      let x=(W-tw)/2; const y=top+(avail-bh)/2
      items.forEach(item => {
        c.fillStyle=item.bg; rrect(c,x,y,bw,bh,16); c.fill()
        c.font='58px serif'; c.fillStyle='#fff'; c.fillText(item.icon,x+bw/2,y+82)
        c.font='bold 24px Georgia,serif'; c.fillText(item.label,x+bw/2,y+146); x+=bw+gap
      })
      c.font='18px Georgia,serif'; c.fillStyle='rgba(255,245,224,0.65)'
      c.fillText('Let\'s Connect · Get in Touch', W/2, top + avail - 28)
      break
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
        width:'min(92vw, 1100px)', maxHeight:'88vh',
        background:'linear-gradient(180deg,#c89060 0%,#b87c4e 25%,#cc9668 50%,#b27248 75%,#c89060 100%)',
        border:'14px solid #5a2e10', outline:'3px solid #8a4c24',
        boxShadow:'0 32px 88px rgba(0,0,0,0.80)', borderRadius:'3px',
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
      <p className="text-xs mb-3" style={{color:WM}}>CS Graduate · Iowa State University</p>
      <p className="text-xs leading-relaxed mb-4" style={{color:WM}}>Full-stack developer specializing in web and mobile applications. Passionate about building scalable, user-centered solutions with React, TypeScript, Node.js, and Java backends.</p>
      <div className="space-y-2 text-xs mb-4" style={{color:WD}}>
        <p><strong style={{color:WT}}>Core Stack:</strong> React · TypeScript · Node.js · Java Spring Boot · React Native</p>
        <p><strong style={{color:WT}}>Latest:</strong> Full-stack classroom management system with real-time WebSockets &amp; CI/CD</p>
      </div>
      <div className="flex gap-2 flex-wrap">
        {[['GitHub','https://github.com/GabeBullerman'],['LinkedIn','https://www.linkedin.com/in/gabe-bullerman/']].map(([l,h])=>(
          <a key={l} href={h} target="_blank" rel="noopener noreferrer"
            className="text-xs px-3 py-1 rounded-full font-bold hover:opacity-80"
            style={{border:'2px solid rgba(255,245,224,0.45)',color:WT}}>{l}</a>
        ))}
      </div>
    </div>
  )
  if (id==='experience') return (
    <div className="space-y-5">
      {experienceData.map((e, idx)=>(
        <div key={e.company} className="pb-4 last:pb-0" style={{borderBottom: idx < experienceData.length - 1 ? '1px solid rgba(255,245,224,0.15)' : 'none'}}>
          <p className="font-bold text-sm" style={{color:WT}}>{e.title}</p>
          <p className="text-xs mb-1" style={{color:WD}}>{e.company} · {e.location}</p>
          <p className="text-xs mb-3 font-medium" style={{color:'#f5d070'}}>{e.period}</p>
          <ul className="text-xs list-disc pl-5 space-y-2 leading-relaxed" style={{color:WM}}>
            {e.bullets.map((b,i)=><li key={i}><span style={{color:WM}}>{b}</span></li>)}
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
    <div className="space-y-5">
      {projectsData.map((p)=>(
        <div key={p.title} className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4 last:pb-0" style={{borderBottom:'1px solid rgba(255,245,224,0.15)'}}>
          <div className="md:col-span-2">
            <a href={p.link} target="_blank" rel="noopener noreferrer" className="font-bold text-sm hover:underline block" style={{color:WT}}>{p.title}</a>
            <p className="text-xs mb-2" style={{color:WD}}>{p.subtitle}</p>
            <p className="text-xs leading-relaxed mb-3" style={{color:WM}}>{p.description}</p>
            <div className="flex flex-wrap gap-1">
              {p.tags.map(t=><span key={t} className="text-xs rounded-full px-2 py-0.5" style={{border:'1px solid rgba(255,245,224,0.28)',color:WD}}>{t}</span>)}
            </div>
            <a href={p.link} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 text-xs hover:underline" style={{color:'#f5d070'}}>→ View on GitHub</a>
          </div>
          <div className="flex items-center justify-center">
            <img src={p.image} alt={p.imageAlt} className="w-full h-auto object-contain rounded" style={{maxHeight:'160px',background:'rgba(0,0,0,0.2)'}} />
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
    <div className="space-y-5">
      {[['Technical Philosophy','I believe in writing clean, maintainable code and building scalable systems. I\'m passionate about mastering new technologies — whether WebGL rendering, WebSocket architectures, or microservices design.'],
        ['Growth Mindset','I learn something new every day about software development. From React optimization to backend design, I push my boundaries and stay current with industry best practices.'],
        ['What Drives Me','Since age 8, I\'ve been obsessed with computers. I went from building custom PCs to discovering the power of great software. Now I\'m dedicated to creating impactful solutions.']].map(([t,p])=>(
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
  const mountRef          = useRef<HTMLDivElement>(null)
  const [pointerLocked, setPointerLocked] = useState(false)
  const [activeSection, setActiveSection] = useState<SectionId | null>(null)
  const [nearSign, setNearSign]           = useState(false)
  const [joyPos, setJoyPos]               = useState({ x: 0, y: 0 })
  const touchMoveRef    = useRef({ x: 0, y: 0 })
  const touchActiveRef  = useRef(false)
  const triggerFocusRef = useRef<((id: SectionId) => void) | null>(null)
  // Bowling mini-game
  type BowlState = 'idle' | 'aiming' | 'thrown' | 'result'
  const [nearBowl, setNearBowl]           = useState(false)
  const [bowlDisplay, setBowlDisplay]     = useState<{ state: BowlState; score: number; hs: number }>({ state: 'idle', score: 0, hs: 0 })
  const bowlStateRef    = useRef<BowlState>('idle')
  const bowlAimRef      = useRef(0)
  const bowlTimerRef    = useRef(0)
  const bowlHSRef       = useRef(parseInt(localStorage.getItem('gabe-bowl-hs') || '0'))
  const nearBowlRef     = useRef(false)
  const bowlPowerRef    = useRef(0)
  const bowlPowerDirRef  = useRef(1)
  const bowlThrowKeyRef  = useRef(false)  // true only if E/Space went down while already aiming
  const powerBarRef      = useRef<HTMLDivElement>(null)
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
    scene.fog = new THREE.FogExp2(0xb8d4f0, 0.010)

    const camera = new THREE.PerspectiveCamera(65, W/H, 0.1, 300)
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
      scene.background = envMap
      scene.environment = envMap
      hdrTex.dispose()
      pmremGen.dispose()
    })

    scene.add(new THREE.AmbientLight(0xffeedd, 1.2))
    const sun = new THREE.DirectionalLight(0xfff0d0, 1.4)
    sun.position.set(20, 40, 15); sun.castShadow = true
    sun.shadow.mapSize.set(2048,2048)
    sun.shadow.camera.left=-80; sun.shadow.camera.right=80
    sun.shadow.camera.top=80; sun.shadow.camera.bottom=-80; sun.shadow.camera.far=160
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
    fireObstacle.position.set(0, 0.15, -6)
    physWorld.addBody(fireObstacle)
    // ── Ground ───────────────────────────────────────────────────────────
    const grassCv = document.createElement('canvas'); grassCv.width = 256; grassCv.height = 256
    const gc = grassCv.getContext('2d')!
    gc.fillStyle = '#3d7a2a'; gc.fillRect(0, 0, 256, 256)
    const gRng = mulberry32(999)
    for (let i = 0; i < 5000; i++) {
      const gx = gRng() * 256, gy = gRng() * 256
      const v = gRng()
      gc.fillStyle = v > 0.65 ? '#4a9034' : v > 0.35 ? '#357828' : '#2d6820'
      gc.fillRect(gx, gy, 1 + gRng() * 1.8, 1 + gRng() * 1.8)
    }
    const grassTex = new THREE.CanvasTexture(grassCv)
    grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping
    grassTex.repeat.set(24, 24)
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(180, 180),
      new THREE.MeshLambertMaterial({ map: grassTex }),
    )
    ground.rotation.x = -Math.PI / 2; scene.add(ground)

    // Map rim (tree-line edge)
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
    // Define campfire position here so tree spawner can exclude it
    const FIRE_POS = new THREE.Vector3(0, 0, -6)

    const rng = mulberry32(42)
    for (let i=0; i<175; i++) {
      const x=(rng()-0.5)*130, z=rng()*110-82
      if (Math.hypot(x,z)>74) continue
      if (SECTIONS.some(s=>Math.hypot(x-s.wx,z-s.wz)<6.5)) continue
      if (Math.hypot(x - FIRE_POS.x, z - FIRE_POS.z) < 5.0) continue
      if (Math.abs(x - BOWL_CX) < 3.5 && z > BOWL_PINS_Z - 3 && z < BOWL_START_Z + 4) continue
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
    })

    // ── Campfire ─────────────────────────────────────────────────────────
    const logMat = new THREE.MeshLambertMaterial({ color:0x5a3010 })
    const logGeo = new THREE.CylinderGeometry(0.08,0.11,1.6,6)
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

    // ── Physics balls (Cannon-backed) ────────────────────────────────────
    const BALL_R   = 0.42
    const PLAYER_R = 0.38
    interface PhysBall { mesh: THREE.Mesh; body: CANNON.Body }
    const balls: PhysBall[] = []
    const ballColors = [0xff4444, 0x44cc44, 0x4488ff, 0xffcc22, 0xff44dd, 0x44ffee, 0xff8800, 0xaa44ff]
    const ballSpots: [number,number][] = [[6,-12],[-9,-26],[12,-38],[-12,-50],[3,-7],[-4,-18],[14,-32],[-14,-44]]
    ballColors.forEach((color,i) => {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(BALL_R,12,8),
        new THREE.MeshLambertMaterial({ color }),
      )
      mesh.castShadow = true; scene.add(mesh)
      const body = new CANNON.Body({ mass: 1 })
      body.addShape(new CANNON.Sphere(BALL_R))
      body.position.set(ballSpots[i][0], BALL_R, ballSpots[i][1])
      body.linearDamping  = 0.55
      body.angularDamping = 0.55
      physWorld.addBody(body)
      balls.push({ mesh, body })
    })

    // ── Bowling lane ──────────────────────────────────────────────────────
    const laneLen = Math.abs(BOWL_PINS_Z - BOWL_START_Z) + 4
    const laneW   = 2.6

    // Wood canvas texture
    const laneCv = document.createElement('canvas'); laneCv.width = 128; laneCv.height = 512
    const lc = laneCv.getContext('2d')!
    lc.fillStyle = '#c8913a'; lc.fillRect(0, 0, 128, 512)
    // Board lines
    for (let bx = 16; bx < 128; bx += 16) {
      lc.strokeStyle = '#9a6a22'; lc.lineWidth = 1.5
      lc.beginPath(); lc.moveTo(bx, 0); lc.lineTo(bx, 512); lc.stroke()
    }
    // Approach dots (7 dots across, repeated rows)
    lc.fillStyle = '#7a4e10'
    for (let row = 0; row < 3; row++) {
      const dy = 80 + row * 50
      for (let col = 0; col < 7; col++) {
        lc.beginPath(); lc.arc(9 + col * 18, dy, 3, 0, Math.PI * 2); lc.fill()
      }
    }
    const laneTex = new THREE.CanvasTexture(laneCv)
    laneTex.wrapS = THREE.RepeatWrapping; laneTex.wrapT = THREE.RepeatWrapping
    laneTex.repeat.set(1, 1)

    const laneMat = new THREE.MeshPhongMaterial({ map: laneTex, shininess: 60 })
    const laneMesh = new THREE.Mesh(new THREE.BoxGeometry(laneW, 0.04, laneLen), laneMat)
    laneMesh.receiveShadow = true
    laneMesh.position.set(BOWL_CX, 0.02, BOWL_LANE_Z); scene.add(laneMesh)

    // Gutters
    ;[-(laneW / 2 + 0.12), (laneW / 2 + 0.12)].forEach(ox => {
      const gutter = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, laneLen), new THREE.MeshLambertMaterial({ color: 0x6b4a1a }))
      gutter.position.set(BOWL_CX + ox, 0.02, BOWL_LANE_Z); scene.add(gutter)
    })

    // Static lane body so balls roll on it
    const laneBody = new CANNON.Body({ mass: 0 })
    laneBody.addShape(new CANNON.Box(new CANNON.Vec3(laneW / 2, 0.02, laneLen / 2)))
    laneBody.position.set(BOWL_CX, 0.02, BOWL_LANE_Z)
    physWorld.addBody(laneBody)

    // ── Pin-deck bumpers ──────────────────────────────────────────────────
    // Warm sandstone — visible but not high-contrast
    const bumperMat = new THREE.MeshLambertMaterial({ color: 0xb09a78 })
    const bumperH   = 0.42
    const bumperThk = 0.18
    const deckFront = BOWL_PINS_Z + 0.55
    const deckBack  = BOWL_PINS_Z - PIN_ROW_D * 3 - 0.65
    const deckLen   = Math.abs(deckBack - deckFront)
    const deckCtrZ  = (deckFront + deckBack) / 2

    // Left and right side walls
    ;[-1, 1].forEach(side => {
      const wx = BOWL_CX + side * (laneW / 2 + bumperThk / 2)
      const wallMesh = new THREE.Mesh(new THREE.BoxGeometry(bumperThk, bumperH, deckLen), bumperMat)
      wallMesh.position.set(wx, bumperH / 2, deckCtrZ); scene.add(wallMesh)
      const wallBody = new CANNON.Body({ mass: 0 })
      wallBody.addShape(new CANNON.Box(new CANNON.Vec3(bumperThk / 2, bumperH / 2, deckLen / 2)))
      wallBody.position.set(wx, bumperH / 2, deckCtrZ)
      physWorld.addBody(wallBody)
    })

    // Back wall
    const backMesh = new THREE.Mesh(new THREE.BoxGeometry(laneW + bumperThk * 2, bumperH, bumperThk), bumperMat)
    backMesh.position.set(BOWL_CX, bumperH / 2, deckBack - bumperThk / 2); scene.add(backMesh)
    const backBody = new CANNON.Body({ mass: 0 })
    backBody.addShape(new CANNON.Box(new CANNON.Vec3((laneW + bumperThk * 2) / 2, bumperH / 2, bumperThk / 2)))
    backBody.position.set(BOWL_CX, bumperH / 2, deckBack - bumperThk / 2)
    physWorld.addBody(backBody)

    // ── Bowling pins ──────────────────────────────────────────────────────
    // Pin canvas texture: white with two red stripes near the neck
    const pinCv = document.createElement('canvas'); pinCv.width = 64; pinCv.height = 128
    const pctx = pinCv.getContext('2d')!
    pctx.fillStyle = '#f5f0e8'; pctx.fillRect(0, 0, 64, 128)
    pctx.fillStyle = '#cc1111'; pctx.fillRect(0, 28, 64, 9)
    pctx.fillStyle = '#cc1111'; pctx.fillRect(0, 42, 64, 9)
    const pinTex = new THREE.CanvasTexture(pinCv)
    const pinMat = new THREE.MeshPhongMaterial({ map: pinTex, shininess: 90 })

    const pinMeshes: THREE.Mesh[] = []
    const pinBodies: CANNON.Body[] = []
    PIN_POSITIONS.forEach(([px, py, pz]) => {
      const pinGeo = new THREE.CylinderGeometry(PIN_R_TOP, PIN_R_BOT, PIN_H, 12)
      const m = new THREE.Mesh(pinGeo, pinMat); m.castShadow = true; scene.add(m)
      m.position.set(px, py, pz); pinMeshes.push(m)
      const b = new CANNON.Body({ mass: 0.15 })
      b.addShape(new CANNON.Cylinder(PIN_R_TOP, PIN_R_BOT, PIN_H, 8))
      b.position.set(px, py, pz)
      b.linearDamping  = 0.3
      b.angularDamping = 0.4
      b.sleep()
      physWorld.addBody(b); pinBodies.push(b)
    })

    // ── Bowling ball ──────────────────────────────────────────────────────
    const bowlBallMesh = new THREE.Mesh(
      new THREE.SphereGeometry(BOWL_BALL_R, 18, 14),
      new THREE.MeshPhongMaterial({ color: 0x1a1a3a, shininess: 180, specular: 0x6688cc }),
    )
    bowlBallMesh.castShadow = true; bowlBallMesh.visible = false; scene.add(bowlBallMesh)
    const bowlBallBody = new CANNON.Body({ mass: 8 })
    bowlBallBody.addShape(new CANNON.Sphere(BOWL_BALL_R))
    bowlBallBody.position.set(BOWL_CX, BOWL_BALL_R, BOWL_START_Z)
    bowlBallBody.linearDamping  = 0.12
    bowlBallBody.angularDamping = 0.25
    bowlBallBody.sleep()
    physWorld.addBody(bowlBallBody)

    // ── Aim arrow ─────────────────────────────────────────────────────────
    const aimArrowMat = new THREE.MeshBasicMaterial({ color: 0xffdd00 })
    const aimShaft = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.025, 1.1), aimArrowMat)
    aimShaft.position.z = -0.55
    const aimHead = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.24, 6), aimArrowMat)
    aimHead.rotation.x = -Math.PI / 2; aimHead.position.z = -1.23
    const aimArrow = new THREE.Group()
    aimArrow.add(aimShaft, aimHead)
    aimArrow.position.set(BOWL_CX, 0.055, BOWL_START_Z - 0.4)
    aimArrow.visible = false
    scene.add(aimArrow)

    // ── Bowling helpers ───────────────────────────────────────────────────
    function resetBowling() {
      bowlBallBody.position.set(BOWL_CX, BOWL_BALL_R, BOWL_START_Z)
      bowlBallBody.velocity.setZero(); bowlBallBody.angularVelocity.setZero()
      bowlBallBody.sleep(); bowlBallMesh.visible = false
      PIN_POSITIONS.forEach(([px, py, pz], i) => {
        pinBodies[i].position.set(px, py, pz)
        pinBodies[i].velocity.setZero(); pinBodies[i].angularVelocity.setZero()
        pinBodies[i].quaternion.set(0, 0, 0, 1)
        pinBodies[i].sleep(); pinMeshes[i].visible = true
      })
      bowlAimRef.current      = 0
      bowlTimerRef.current    = 0
      bowlPowerRef.current    = 0
      bowlPowerDirRef.current = 1
      bowlThrowKeyRef.current = false
    }
    function throwBowl() {
      const spd = 8 + bowlPowerRef.current * 14   // 8–22 units/s
      const aim = bowlAimRef.current
      bowlBallBody.position.set(BOWL_CX + Math.sin(aim) * 0.5, BOWL_BALL_R, BOWL_START_Z)
      bowlBallBody.velocity.set(Math.sin(aim) * spd * 0.22, 0.15, -spd)
      bowlBallBody.wakeUp()
      PIN_POSITIONS.forEach((_, i) => pinBodies[i].wakeUp())
      bowlBallMesh.visible = true
    }
    function countKnockedPins() {
      let knocked = 0
      pinBodies.forEach(b => {
        const q = b.quaternion
        const upY = 1 - 2 * (q.x * q.x + q.z * q.z)
        if (upY < 0.5) knocked++
      })
      return knocked
    }

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
    triggerFocusRef.current = triggerFocus

    function keyToWASD(key: string): string {
      if (key==='arrowup') return 'w'; if (key==='arrowdown') return 's'
      if (key==='arrowleft') return 'a'; if (key==='arrowright') return 'd'
      return key
    }

    const onKeyDown = (e: KeyboardEvent) => {
      const mapped = keyToWASD(e.key.toLowerCase())
      keys.add(mapped)

      // Any movement key closes the sign overlay
      if (['w','a','s','d'].includes(mapped) && (focusActiveRef.current || overlayShownRef.current)) {
        exitFocus(); return
      }

      // Bowling controls take priority when active
      const bs = bowlStateRef.current
      if (bs === 'idle' && mapped === 'e' && nearBowlRef.current) {
        e.preventDefault()
        bowlStateRef.current = 'aiming'
        setBowlDisplay(p => ({ ...p, state: 'aiming', score: 0 }))
        return
      }
      if (bs === 'aiming') {
        if (e.key === 'Escape') {
          bowlThrowKeyRef.current = false
          bowlStateRef.current = 'idle'; resetBowling()
          setBowlDisplay(p => ({ ...p, state: 'idle' })); setNearBowl(false)
        }
        if (e.key === ' ' || e.key.toLowerCase() === 'e') {
          bowlThrowKeyRef.current = true  // mark that the key went down while aiming
        }
        return
      }
      if (bs === 'result') {
        if (mapped === 'e' || e.key === ' ') {
          e.preventDefault(); resetBowling(); bowlStateRef.current = 'aiming'
          setBowlDisplay(p => ({ ...p, state: 'aiming', score: 0 }))
        } else if (e.key === 'Escape') {
          resetBowling(); bowlStateRef.current = 'idle'
          setBowlDisplay(p => ({ ...p, state: 'idle' })); setNearBowl(false); nearBowlRef.current = false
        }
        return
      }

      if (mapped==='e' && !focusActiveRef.current && !exitedRef.current && currentSecRef.current) {
        triggerFocus(currentSecRef.current)
      }
      if (e.key==='Escape' && (focusActiveRef.current || overlayShownRef.current)) {
        exitFocus()
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      keys.delete(keyToWASD(e.key.toLowerCase()))
      // Release Space or E while aiming → throw only if key was pressed during aiming
      if (bowlStateRef.current === 'aiming' && bowlThrowKeyRef.current && (e.key === ' ' || e.key.toLowerCase() === 'e')) {
        bowlThrowKeyRef.current = false
        throwBowl(); bowlStateRef.current = 'thrown'; bowlTimerRef.current = 0
        setBowlDisplay(p => ({ ...p, state: 'thrown' }))
      }
    }
    // Clear all held keys if window loses focus (prevents stuck-key bug)
    const onBlur = () => keys.clear()

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup',   onKeyUp)
    window.addEventListener('blur',    onBlur)

    // ── Pointer lock (mouse look) ──────────────────────────────────────────
    const MOUSE_SENS = 0.0022
    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== renderer.domElement) return
      if (focusActiveRef.current || bowlStateRef.current !== 'idle') return
      camYaw   += e.movementX * MOUSE_SENS
      camPitch  = THREE.MathUtils.clamp(camPitch - e.movementY * MOUSE_SENS, 0.05, 0.9)
    }
    const onPointerLockChange = () => {
      setPointerLocked(document.pointerLockElement === renderer.domElement)
    }
    const onCanvasClick = () => {
      if (!focusActiveRef.current && bowlStateRef.current === 'idle') {
        renderer.domElement.requestPointerLock()
      }
    }
    renderer.domElement.addEventListener('click', onCanvasClick)
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('pointerlockchange', onPointerLockChange)

    // ── Animation ─────────────────────────────────────────────────────────
    const _tmpCam = camera.clone()
    const _mat4   = new THREE.Matrix4()
    let _nearBowl = false   // local mirror of nearBowl state for change-detection
    let animId:  number
    let elapsed  = 0
    let lastTime = performance.now()
    let walkPhase = 0
    let swingAmt  = 0
    let camYaw   = 0   // horizontal orbit angle around player
    let camPitch = 0.3 // vertical tilt (radians, positive = camera higher)

    function animate() {
      animId = requestAnimationFrame(animate)
      const now = performance.now()
      const delta = Math.min((now - lastTime) / 1000, 0.05)
      lastTime = now; elapsed += delta

      // ── Cannon physics step ───────────────────────────────────────────
      physWorld.step(1 / 60, delta, 3)

      // Sync exploration ball meshes from cannon bodies
      balls.forEach(b => {
        b.mesh.position.set(b.body.position.x, b.body.position.y, b.body.position.z)
        b.mesh.quaternion.set(b.body.quaternion.x, b.body.quaternion.y, b.body.quaternion.z, b.body.quaternion.w)
      })
      // Sync bowling objects
      bowlBallMesh.position.set(bowlBallBody.position.x, bowlBallBody.position.y, bowlBallBody.position.z)
      bowlBallMesh.quaternion.set(bowlBallBody.quaternion.x, bowlBallBody.quaternion.y, bowlBallBody.quaternion.z, bowlBallBody.quaternion.w)
      pinMeshes.forEach((m, i) => {
        m.position.set(pinBodies[i].position.x, pinBodies[i].position.y, pinBodies[i].position.z)
        m.quaternion.set(pinBodies[i].quaternion.x, pinBodies[i].quaternion.y, pinBodies[i].quaternion.z, pinBodies[i].quaternion.w)
      })

      player.visible = !focusActiveRef.current && bowlStateRef.current === 'idle'

      if (!focusActiveRef.current) {
        // ── Camera-relative WASD movement ──────────────────────────────
        const fw_x = -Math.sin(camYaw), fw_z = -Math.cos(camYaw)
        const rt_x =  Math.cos(camYaw), rt_z = -Math.sin(camYaw)
        const joyX = touchMoveRef.current.x
        const joyY = touchMoveRef.current.y
        const hasW = keys.has('w') || joyY < -0.2
        const hasS = keys.has('s') || joyY > 0.2
        const hasA = keys.has('a') || joyX < -0.2
        const hasD = keys.has('d') || joyX > 0.2

        const rawVel = new THREE.Vector3()
        if (hasW) { rawVel.x += fw_x; rawVel.z += fw_z }
        if (hasS) { rawVel.x -= fw_x; rawVel.z -= fw_z }
        if (hasA) { rawVel.x -= rt_x; rawVel.z -= rt_z }
        if (hasD) { rawVel.x += rt_x; rawVel.z += rt_z }

        const isMoving = rawVel.lengthSq() > 0
        if (isMoving) {
          rawVel.normalize().multiplyScalar(8.5 * delta)
          player.position.add(rawVel)
        }
        // Player model always faces camera forward direction
        player.rotation.y = lerpAngle(player.rotation.y, camYaw + Math.PI, 0.14)
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

        const camDist = 5.2
        const camTarget = new THREE.Vector3(
          player.position.x + Math.sin(camYaw) * Math.cos(camPitch) * camDist,
          player.position.y + Math.sin(camPitch) * camDist + 1.2,
          player.position.z + Math.cos(camYaw) * Math.cos(camPitch) * camDist,
        )
        camera.position.lerp(camTarget, 0.15)
        camera.lookAt(player.position.x, player.position.y + 1.0, player.position.z)

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

        // Player kicks exploration balls via impulse on their Cannon bodies
        balls.forEach(b => {
          const pdx = b.body.position.x - player.position.x
          const pdz = b.body.position.z - player.position.z
          const pd  = Math.sqrt(pdx * pdx + pdz * pdz)
          if (pd < PLAYER_R + BALL_R + 0.05 && pd > 0.01) {
            const nx = pdx / pd, nz = pdz / pd
            b.body.velocity.x = nx * 6; b.body.velocity.z = nz * 6; b.body.velocity.y = 0.4
            b.body.position.x = player.position.x + nx * (PLAYER_R + BALL_R + 0.07)
            b.body.position.z = player.position.z + nz * (PLAYER_R + BALL_R + 0.07)
            b.body.wakeUp()
          }
        })

        // ── Bowling proximity & state machine ──────────────────────────
        const bowlDist = Math.hypot(player.position.x - BOWL_CX, player.position.z - BOWL_START_Z)
        const newNearBowl = bowlStateRef.current === 'idle' && bowlDist < BOWL_PROX
        if (newNearBowl !== _nearBowl) { _nearBowl = newNearBowl; nearBowlRef.current = newNearBowl; setNearBowl(newNearBowl) }

        if (bowlStateRef.current === 'thrown') {
          bowlTimerRef.current += delta
          if (bowlTimerRef.current > 4.5) {
            const knocked = countKnockedPins()
            const score   = knocked
            const newHS   = Math.max(score, bowlHSRef.current)
            if (newHS > bowlHSRef.current) {
              bowlHSRef.current = newHS
              localStorage.setItem('gabe-bowl-hs', String(newHS))
            }
            bowlStateRef.current = 'result'
            setBowlDisplay({ state: 'result', score, hs: newHS })
          }
        }

        // Bowling — override normal follow when active
        if (bowlStateRef.current === 'aiming' || bowlStateRef.current === 'thrown' || bowlStateRef.current === 'result') {
          const aim = bowlAimRef.current
          if (bowlStateRef.current === 'aiming') {
            if (keys.has('a') || touchMoveRef.current.x < -0.2) bowlAimRef.current = THREE.MathUtils.clamp(bowlAimRef.current - delta * 1.2, -0.45, 0.45)
            if (keys.has('d') || touchMoveRef.current.x > 0.2)  bowlAimRef.current = THREE.MathUtils.clamp(bowlAimRef.current + delta * 1.2, -0.45, 0.45)
            // Power bar oscillation
            bowlPowerRef.current += delta * bowlPowerDirRef.current * 1.4
            if (bowlPowerRef.current >= 1) { bowlPowerRef.current = 1; bowlPowerDirRef.current = -1 }
            if (bowlPowerRef.current <= 0) { bowlPowerRef.current = 0; bowlPowerDirRef.current =  1 }
            if (powerBarRef.current) powerBarRef.current.style.width = `${bowlPowerRef.current * 100}%`
          }
          // Aim arrow — visible only while aiming, rotates with aim
          aimArrow.visible = bowlStateRef.current === 'aiming'
          aimArrow.rotation.y = -bowlAimRef.current

          // First-person camera during aiming/thrown; overview on result
          if (bowlStateRef.current === 'result') {
            camera.position.lerp(new THREE.Vector3(BOWL_CX, 2.4, BOWL_START_Z + 2.2), 0.07)
            camera.lookAt(BOWL_CX, 0.3, BOWL_PINS_Z - PIN_ROW_D * 1.5)
          } else {
            camera.position.lerp(new THREE.Vector3(BOWL_CX, 1.55, BOWL_START_Z + 0.2), 0.18)
            camera.lookAt(BOWL_CX + Math.sin(aim) * 10, 0.35, BOWL_PINS_Z - PIN_ROW_D)
          }
          player.position.set(BOWL_CX, 0, BOWL_START_Z + 1.5)
          player.rotation.y = Math.PI
        }
      } else {
        // ── Cinematic: glide camera to sign ────────────────────────────
        camera.position.lerp(focusPosRef.current, 0.042)
        _tmpCam.position.copy(camera.position); _tmpCam.lookAt(focusLookRef.current)
        camera.quaternion.slerp(_tmpCam.quaternion, 0.062)

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

    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
      cancelAnimationFrame(animId)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup',   onKeyUp)
      window.removeEventListener('blur',    onBlur)
      window.removeEventListener('resize',  onResize)
      renderer.domElement.removeEventListener('click', onCanvasClick)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('pointerlockchange', onPointerLockChange)
      if (document.pointerLockElement === renderer.domElement) document.exitPointerLock()
      renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
      // Remove all cannon bodies
      while (physWorld.bodies.length > 0) physWorld.removeBody(physWorld.bodies[0])
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="fixed inset-0 w-screen overflow-hidden overscroll-none touch-none"
      style={{ height: '100dvh', paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div ref={mountRef} className="w-full h-full touch-none" />

      {/* Click-to-look prompt — desktop only, idle state */}
      {!pointerLocked && !activeSection && bowlDisplay.state === 'idle' && (
        <div className="hidden md:flex absolute inset-0 items-center justify-center pointer-events-none">
          <div className="bg-black/50 backdrop-blur-sm text-white text-sm px-5 py-2 rounded-full opacity-70">
            Click to look around
          </div>
        </div>
      )}

      {/* Back button — always visible */}
      <button
        onClick={onExit}
        className="absolute left-4 z-10 px-4 py-2 bg-black/75 backdrop-blur-sm text-white border border-white/30 rounded-full font-bold text-sm hover:bg-white hover:text-black transition-colors duration-300"
        style={{ top: 'calc(env(safe-area-inset-top) + 1rem)' }}
      >
        ← 2D View
      </button>

      {/* Bowling overlay — shown when actively bowling */}
      {!activeSection && bowlDisplay.state !== 'idle' && (
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 4rem)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}>
          {/* Score bar at top */}
          <div className="flex gap-8 bg-black/70 backdrop-blur-sm text-white px-8 py-3 rounded-full text-sm font-bold">
            <span>Score: <span className="text-yellow-300">{bowlDisplay.score}</span></span>
            <span className="opacity-40">|</span>
            <span>Best: <span className="text-green-300">{bowlDisplay.hs}</span></span>
          </div>

          {/* State-specific instructions at bottom */}
          <div className="text-center">
            {bowlDisplay.state === 'aiming' && (
              <div className="bg-black/70 backdrop-blur-sm text-white px-6 py-4 rounded-2xl text-sm space-y-3 min-w-64">
                <div className="hidden md:block text-center opacity-70 text-xs">
                  <kbd className="font-bold bg-white/20 px-1.5 rounded">A</kbd> / <kbd className="font-bold bg-white/20 px-1.5 rounded">D</kbd> to aim &nbsp;·&nbsp; <kbd className="font-bold bg-white/20 px-1.5 rounded">Esc</kbd> to cancel
                </div>
                <div className="md:hidden text-center opacity-70 text-xs">Joystick left/right to aim</div>
                {/* Power bar */}
                <div>
                  <div className="flex justify-between text-xs opacity-60 mb-1">
                    <span>POWER</span>
                    <span className="hidden md:inline">hold <kbd className="font-bold bg-white/20 px-1 rounded">Space</kbd> / <kbd className="font-bold bg-white/20 px-1 rounded">E</kbd> — release to throw</span>
                    <span className="md:hidden">hold <strong>Throw</strong> — release to bowl</span>
                  </div>
                  <div className="w-full h-4 bg-white/20 rounded-full overflow-hidden">
                    <div
                      ref={powerBarRef}
                      className="h-full rounded-full transition-none"
                      style={{ width: '0%', background: 'linear-gradient(90deg, #22c55e, #eab308, #ef4444)' }}
                    />
                  </div>
                </div>
              </div>
            )}
            {bowlDisplay.state === 'thrown' && (
              <div className="bg-black/70 backdrop-blur-sm text-white px-6 py-3 rounded-2xl text-sm animate-pulse">
                Ball in motion...
              </div>
            )}
            {bowlDisplay.state === 'result' && (
              <div className="bg-black/70 backdrop-blur-sm text-white px-8 py-4 rounded-2xl text-center space-y-2">
                <div className="text-2xl font-bold">
                  {bowlDisplay.score === 10 ? 'STRIKE! ' : ''}{bowlDisplay.score} / 10 pins
                </div>
                {bowlDisplay.score === bowlDisplay.hs && bowlDisplay.score > 0 && (
                  <div className="text-green-300 text-sm font-bold">New Best!</div>
                )}
                <div className="hidden md:block text-xs opacity-70 mt-1"><kbd className="font-bold bg-white/20 px-1.5 rounded">E</kbd> play again &nbsp;·&nbsp; <kbd className="font-bold bg-white/20 px-1.5 rounded">Esc</kbd> leave lane</div>
                <div className="md:hidden text-xs opacity-70 mt-1">Tap <strong>Play Again</strong> or move away</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile throw/play-again button — only during bowling */}
      {!activeSection && (bowlDisplay.state === 'aiming' || bowlDisplay.state === 'result') && (
        <button
          className="md:hidden absolute right-6 z-30 px-5 py-3 bg-yellow-600/90 backdrop-blur-sm text-white border border-yellow-400/50 rounded-full font-bold text-sm pointer-events-auto"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5.5rem)' }}
          onTouchStart={(e) => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', bubbles: true })) }}
          onTouchEnd={(e) => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keyup', { key: 'e', bubbles: true })) }}
        >
          {bowlDisplay.state === 'aiming' ? 'Throw' : 'Play Again'}
        </button>
      )}

      {/* All HUD — hidden when modal is open */}
      {!activeSection && (
        <>
          {/* Near-bowl hint — only when idle near lane */}
          {nearBowl && (
            <div
              className="absolute left-1/2 -translate-x-1/2 text-white text-xs bg-black/60 backdrop-blur-sm px-5 py-2 rounded-full pointer-events-none animate-pulse"
              style={{ bottom: 'calc(env(safe-area-inset-bottom) + 3.5rem)' }}
            >
              Press <kbd className="font-bold mx-1">E</kbd> to Bowl
            </div>
          )}

          {/* Desktop: near-sign hint (above controls bar) */}
          {!nearBowl && nearSign && (
            <div
              className="hidden md:flex absolute left-1/2 -translate-x-1/2 text-white text-xs bg-black/60 backdrop-blur-sm px-5 py-2 rounded-full pointer-events-none animate-pulse"
              style={{ bottom: 'calc(env(safe-area-inset-bottom) + 3.5rem)' }}
            >
              Press <kbd className="font-bold mx-1">E</kbd> to inspect · or stand still for 2s
            </div>
          )}

          {/* Desktop: controls bar — hidden during bowling */}
          {bowlDisplay.state === 'idle' && (
          <div
            className="hidden md:flex absolute left-1/2 -translate-x-1/2 text-white text-xs bg-black/50 backdrop-blur-sm px-5 py-2 rounded-full pointer-events-none"
            style={{ bottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
          >
            WASD · Arrows &nbsp;·&nbsp; <kbd className="font-bold mx-1">E</kbd> inspect &nbsp;·&nbsp; <kbd className="font-bold mx-1">Esc</kbd> or move to close
          </div>
          )}

          {/* Mobile: controls hint — hidden during bowling */}
          {bowlDisplay.state === 'idle' && (
          <div
            className="md:hidden absolute left-1/2 -translate-x-1/2 text-white text-xs bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full pointer-events-none whitespace-nowrap"
            style={{ bottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
          >
            Joystick to move &nbsp;·&nbsp; Tap <strong>Inspect</strong> near signs
          </div>
          )}

          {/* Mobile: Inspect button — right side, same height as joystick */}
          {bowlDisplay.state === 'idle' && nearSign && (
            <button
              className="md:hidden absolute right-6 z-30 px-5 py-3 bg-amber-800/90 backdrop-blur-sm text-white border border-amber-500/50 rounded-full font-bold text-sm animate-pulse"
              style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5.5rem)' }}
              onTouchEnd={(e) => {
                e.preventDefault()
                if (currentSecRef.current && triggerFocusRef.current) {
                  triggerFocusRef.current(currentSecRef.current)
                }
              }}
            >
              Inspect
            </button>
          )}

          {/* Mobile: Joystick — left side, hidden during bowling */}
          {bowlDisplay.state === 'idle' && <div
            className="absolute left-6 z-30 w-28 h-28 md:hidden touch-none select-none"
            style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5.5rem)' }}
            onTouchStart={(e) => { e.preventDefault(); touchActiveRef.current = true }}
            onTouchMove={(e) => {
              e.preventDefault()
              const rect = e.currentTarget.getBoundingClientRect()
              const touch = e.touches[0]
              const x = Math.max(-1, Math.min(1, ((touch.clientX - rect.left) / rect.width) * 2 - 1))
              const y = Math.max(-1, Math.min(1, ((touch.clientY - rect.top) / rect.height) * 2 - 1))
              touchMoveRef.current = { x, y }
              setJoyPos({ x, y })
            }}
            onTouchEnd={(e) => {
              e.preventDefault()
              touchActiveRef.current = false
              touchMoveRef.current = { x: 0, y: 0 }
              setJoyPos({ x: 0, y: 0 })
            }}
          >
            <div className="relative w-full h-full rounded-full bg-black/40 border border-white/30">
              <div
                className="absolute w-10 h-10 rounded-full bg-white/70"
                style={{
                  left: `calc(50% + ${joyPos.x * 35}px - 20px)`,
                  top:  `calc(50% + ${joyPos.y * 35}px - 20px)`,
                }}
              />
            </div>
          </div>}
        </>
      )}

      {activeSection && <SectionOverlay id={activeSection} onClose={exitFocus} />}

    </div>
  )
}
