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
      className="relative flex items-center justify-center px-6 md:px-10 pt-24 pb-8 min-h-[72vh] overflow-hidden"
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
              className="px-8 py-3 rounded-full font-bold transition-all duration-300 hover:scale-105 no-underline"
              style={{
                background: 'var(--accent)',
                color: 'var(--bg)',
                boxShadow: '0 0 24px var(--accent-glow)',
              }}
            >
              GitHub
            </a>

            <a
              href="https://www.linkedin.com/in/gabe-bullerman/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3 rounded-full font-bold transition-all duration-300 hover:scale-105 no-underline"
              style={{
                border: '1px solid var(--border-strong)',
                background: 'var(--card)',
                color: 'var(--accent)',
                backdropFilter: 'blur(12px)',
              }}
            >
              LinkedIn
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}