import { useRef } from 'react'
import { experienceData } from '../data/experience'
import { skillsData } from '../data/skills'
import { projectsData } from '../data/projects'

interface Props {
  onGoOutside: () => void
}

export default function MonitorOverlay({ onGoOutside }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)

  return (
    <div className="absolute inset-0 z-30 flex flex-col" style={{ background: '#0d0d0d' }}>

      {/* Top bar */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b border-white/10" style={{ background: '#111' }}>
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
          <span className="ml-3 text-white/40 text-xs font-mono">gabebullerman.dev — Portfolio</span>
        </div>
        <button
          onClick={onGoOutside}
          className="flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold transition-all duration-200 hover:scale-105 active:scale-95"
          style={{ background: 'linear-gradient(135deg, #3b8c4e, #2d6b3c)', color: '#c8f5d0', border: '1px solid rgba(100,200,120,0.3)', boxShadow: '0 0 12px rgba(80,180,100,0.25)' }}
        >
          Go Outside →
        </button>
      </div>

      {/* Scrollable content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto" style={{ scrollbarColor: '#333 transparent' }}>
        <div className="max-w-3xl mx-auto px-6 py-12 space-y-20">

          {/* Hero */}
          <section className="space-y-5">
            <div className="flex items-center gap-3 text-xs font-mono text-white/30 mb-8">
              <span className="text-green-400">▶</span>
              <span>~/portfolio</span>
              <span className="animate-pulse">_</span>
            </div>
            <h1 className="text-4xl font-bold text-white leading-tight">
              Gabriel Bullerman
            </h1>
            <p className="text-lg text-white/60">Full-Stack Software Developer</p>
            <p className="text-sm text-white/50 leading-relaxed max-w-xl">
              CS Graduate from Iowa State University. Full-stack developer specializing in web and mobile
              applications — React, TypeScript, Java Spring Boot, Node.js. Passionate about building
              scalable, user-centered solutions.
            </p>
            <div className="flex gap-3 flex-wrap pt-2">
              {[
                ['GitHub', 'https://github.com/GabeBullerman'],
                ['LinkedIn', 'https://www.linkedin.com/in/gabe-bullerman/'],
              ].map(([label, href]) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                  className="px-4 py-1.5 rounded-full text-xs font-semibold text-white/80 border border-white/20 hover:border-white/50 hover:text-white transition-colors">
                  {label}
                </a>
              ))}
            </div>
          </section>

          <Divider label="Experience" />

          {/* Experience */}
          <section className="space-y-8">
            {experienceData.map((e) => (
              <div key={e.company} className="space-y-3">
                <div>
                  <h3 className="text-base font-bold text-white">{e.title}</h3>
                  <p className="text-sm text-white/50">{e.company} · {e.location}</p>
                  <p className="text-xs font-mono text-green-400/80 mt-0.5">{e.period}</p>
                </div>
                <ul className="space-y-2 pl-4 border-l border-white/10">
                  {e.bullets.map((b, i) => (
                    <li key={i} className="text-sm text-white/60 leading-relaxed">{b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </section>

          <Divider label="Skills" />

          {/* Skills */}
          <section className="space-y-6">
            {skillsData.map((cat) => (
              <div key={cat.category}>
                <p className="text-xs font-mono text-white/40 uppercase tracking-widest mb-3">{cat.category}</p>
                <div className="flex flex-wrap gap-2">
                  {cat.skills.map((s) => (
                    <span key={s.name}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs text-white/70 border border-white/10"
                      style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <img src={s.icon} alt="" className="w-3.5 h-3.5 opacity-70" />
                      {s.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </section>

          <Divider label="Projects" />

          {/* Projects */}
          <section className="space-y-8">
            {projectsData.map((p) => (
              <div key={p.title} className="grid grid-cols-1 sm:grid-cols-3 gap-5 p-5 rounded-xl border border-white/8"
                style={{ background: 'rgba(255,255,255,0.025)' }}>
                <div className="sm:col-span-2 space-y-2">
                  <a href={p.link} target="_blank" rel="noopener noreferrer"
                    className="text-base font-bold text-white hover:text-green-300 transition-colors block">
                    {p.title}
                  </a>
                  <p className="text-xs text-white/40">{p.subtitle}</p>
                  <p className="text-sm text-white/60 leading-relaxed">{p.description}</p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {p.tags.map(t => (
                      <span key={t} className="text-xs px-2 py-0.5 rounded text-white/50 border border-white/10">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-center">
                  <img src={p.image} alt={p.imageAlt}
                    className="rounded-lg object-contain w-full"
                    style={{ maxHeight: '120px', background: 'rgba(0,0,0,0.3)' }} />
                </div>
              </div>
            ))}
          </section>

          <Divider label="Certifications" />

          {/* Certifications */}
          <section>
            <p className="text-xs text-white/40 mb-5">AWS Certification Path</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
              {[
                ['cloudPractitionerAWS', 'Cloud Practitioner'],
                ['aiPractitionerAWS', 'AI Practitioner'],
                ['developerAWS', 'Developer'],
                ['devopsEngineerAWS', 'DevOps Engineer'],
              ].map(([file, label]) => (
                <div key={label} className="flex flex-col items-center gap-2">
                  <img src={`/images/${file}.png`} alt={label} className="w-16 h-16 object-contain" />
                  <p className="text-xs text-center text-white/50">{label}</p>
                </div>
              ))}
            </div>
          </section>

          <Divider label="Contact" />

          {/* Contact */}
          <section className="space-y-3 pb-16">
            {[
              ['fa-brands fa-github', 'GitHub', 'https://github.com/GabeBullerman'],
              ['fa-brands fa-linkedin', 'LinkedIn', 'https://www.linkedin.com/in/gabe-bullerman/'],
              ['fa-solid fa-envelope', 'gabebullerman1@gmail.com', 'mailto:gabebullerman1@gmail.com'],
            ].map(([icon, label, href]) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 text-sm text-white/60 hover:text-white transition-colors">
                <i className={`${icon} w-5 text-center text-white/40`} />
                {label}
              </a>
            ))}
            <div className="flex items-center gap-3 text-sm text-white/60">
              <i className="fa-solid fa-phone w-5 text-center text-white/40" />
              319-230-0474
            </div>
          </section>

        </div>
      </div>

    </div>
  )
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-xs font-mono text-green-400/60 uppercase tracking-widest">{label}</span>
      <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, rgba(100,200,120,0.2), transparent)' }} />
    </div>
  )
}
