import { useEffect, useState } from 'react'
import { useTypingEffect } from '../hooks/useTypingEffect'

const TYPING_TEXTS = [
  'Full-Stack Developer',
  'React/TypeScript Specialist',
  'Mobile App Developer',
  '3D Web Experiences',
]

export default function Hero() {
  const displayText = useTypingEffect(TYPING_TEXTS)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100)
    return () => clearTimeout(t)
  }, [])

  return (
    <section
      id="about-me"
      className="relative flex items-center justify-center px-6 md:px-10 pt-32 pb-2 min-h-[50vh] overflow-hidden"
      style={{ color: 'var(--text)' }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(circle at 18% 12%, var(--accent-glow), transparent 28rem),
            radial-gradient(circle at 80% 30%, var(--accent-soft), transparent 34rem)
          `,
        }}
      />

      <div
        className="absolute top-[-140px] left-[-160px] w-[520px] h-[520px] rounded-full blur-3xl opacity-30"
        style={{ background: 'var(--accent)' }}
      />

      <div
        className="relative z-10 max-w-7xl mx-auto flex flex-col xl:flex-row items-center gap-10 xl:gap-20"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0px)' : 'translateY(24px)',
          transition: 'opacity 1s ease, transform 1s ease',
        }}
      >
        <div className="relative flex-shrink-0 xl:-ml-12">
          <div
            className="absolute rounded-full blur-3xl opacity-50"
            style={{
              inset: '-24px',
              background: 'var(--accent)',
              animation: 'heroPulse 4s ease-in-out infinite',
            }}
          />

          <div
            className="absolute rounded-full"
            style={{
              inset: '-5px',
              background:
                'conic-gradient(from 0deg, var(--accent), transparent, var(--accent))',
              animation: 'heroSpin 10s linear infinite',
            }}
          />

          <img
            src="/images/me.jpg"
            alt="Gabriel Bullerman"
            className="relative w-64 h-64 md:w-80 md:h-80 xl:w-[23rem] xl:h-[23rem] rounded-full object-cover"
            style={{
              border: '5px solid var(--bg)',
              boxShadow: '0 0 46px var(--accent-glow)',
            }}
          />
        </div>

        <div className="max-w-3xl text-center xl:text-left">

          <h1
            className="font-black leading-[0.9] mb-5 text-5xl md:text-7xl xl:text-8xl"
            style={{ color: 'var(--text)' }}
          >
            Gabriel
            <br />
            <span
              style={{
                color: 'var(--accent)',
                textShadow: '0 0 24px var(--accent-glow)',
              }}
            >
              Bullerman
            </span>
          </h1>

          <h2
            className="text-lg md:text-2xl h-10 mb-6 font-medium"
            style={{ color: 'var(--text-muted)' }}
          >
            {displayText}
            <span className="animate-blink ml-1" style={{ color: 'var(--accent)' }}>
              |
            </span>
          </h2>

          <p
            className="text-base md:text-lg leading-relaxed max-w-2xl mb-8"
            style={{ color: 'var(--text-muted)' }}
          >
            Iowa State University CS graduate focused on modern web engineering,
            scalable full-stack applications, mobile development, and immersive
            interactive experiences with React, TypeScript, Node.js, and Three.js.
          </p>

          <div className="flex flex-wrap gap-4 justify-center xl:justify-start">
            <a
              href="https://github.com/GabeBullerman"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-full font-bold transition-all duration-300 hover:scale-105 no-underline"
              style={{
                background: 'var(--accent)',
                color: 'var(--bg)',
                boxShadow: '0 0 24px var(--accent-glow)',
              }}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
                <path d="M12 .5C5.73.5.73 5.5.73 11.77c0 4.99 3.24 9.22 7.74 10.72.57.1.78-.25.78-.55 0-.27-.01-1-.02-1.96-3.15.68-3.82-1.52-3.82-1.52-.52-1.31-1.26-1.66-1.26-1.66-1.03-.7.08-.69.08-.69 1.14.08 1.74 1.17 1.74 1.17 1.01 1.73 2.65 1.23 3.3.94.1-.73.4-1.23.72-1.51-2.52-.29-5.17-1.26-5.17-5.6 0-1.24.44-2.25 1.17-3.04-.12-.29-.51-1.45.11-3.02 0 0 .96-.31 3.15 1.16a10.9 10.9 0 0 1 5.74 0c2.18-1.47 3.14-1.16 3.14-1.16.62 1.57.23 2.73.11 3.02.73.79 1.17 1.8 1.17 3.04 0 4.35-2.65 5.31-5.18 5.59.41.35.77 1.04.77 2.1 0 1.52-.01 2.74-.01 3.11 0 .3.2.66.79.55 4.5-1.5 7.73-5.73 7.73-10.72C23.27 5.5 18.27.5 12 .5Z"/>
              </svg>
              GitHub
            </a>

            <a
              href="https://www.linkedin.com/in/gabe-bullerman/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-full font-bold transition-all duration-300 hover:scale-105 no-underline"
              style={{
                border: '1px solid var(--border-strong)',
                background: 'var(--card)',
                color: 'var(--accent)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
                <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14ZM7.12 20.45H3.55V9h3.57v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.22.79 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z"/>
              </svg>
              LinkedIn
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}