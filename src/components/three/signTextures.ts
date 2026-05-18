import * as THREE from 'three'
import { experienceData } from '../../data/experience'
import { projectsData } from '../../data/projects'
import { SectionId } from './constants'
import { mulberry32 } from './helpers'

// ─── Canvas helpers ──────────────────────────────────────────────────────────
export function rrect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath()
  c.moveTo(x+r,y); c.lineTo(x+w-r,y); c.quadraticCurveTo(x+w,y,x+w,y+r)
  c.lineTo(x+w,y+h-r); c.quadraticCurveTo(x+w,y+h,x+w-r,y+h)
  c.lineTo(x+r,y+h); c.quadraticCurveTo(x,y+h,x,y+h-r)
  c.lineTo(x,y+r); c.quadraticCurveTo(x,y,x+r,y); c.closePath()
}

export function asyncLoadProjectImages(c: CanvasRenderingContext2D, W: number, H: number, tex: THREE.CanvasTexture) {
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

export function asyncLoadCertImages(c: CanvasRenderingContext2D, W: number, H: number, tex: THREE.CanvasTexture) {
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

export function drawSignPreview(c: CanvasRenderingContext2D, id: SectionId, W: number, H: number) {
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

export function makeSignTexture(label: string, id: SectionId): THREE.CanvasTexture {
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
