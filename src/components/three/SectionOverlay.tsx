import { experienceData } from '../../data/experience'
import { skillsData } from '../../data/skills'
import { projectsData } from '../../data/projects'
type SectionId = 'about' | 'experience' | 'skills' | 'projects' | 'certifications' | 'moreonme' | 'contact'
const SECTIONS = [
  { id: 'about', label: 'About Me' }, { id: 'experience', label: 'Experience' },
  { id: 'skills', label: 'Skills' }, { id: 'projects', label: 'Projects' },
  { id: 'certifications', label: 'Certs' }, { id: 'moreonme', label: 'More on Me' },
  { id: 'contact', label: 'Contact' },
] as const

// ─── Overlay theme colors ────────────────────────────────────────────────────
export const WT = '#fff5e0'
export const WM = 'rgba(255,245,224,0.65)'
export const WD = 'rgba(255,245,224,0.45)'

export function SectionOverlay({ id, onClose }: { id: SectionId; onClose: () => void }) {
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
