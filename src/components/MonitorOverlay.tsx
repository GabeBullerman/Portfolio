import { useRef, useState } from 'react'
import Header from './Header'
import StickFigure from './StickFigure'
import Hero from './Hero'
import Experience from './Experience'
import Projects from './Projects'
import Skills from './Skills'
import MoreOnMe from './MoreOnMe'
import Contact from './Contact'
import Footer from './Footer'
import InteractiveShowcase from './showcase/InteractiveShowcase'
import { useTheme, setTheme, PALETTES } from '../hooks/useTheme'

type Props = {
  onGoOutside: (snapshot?: HTMLCanvasElement) => void
  fading?: boolean
  /** True when the player has already been out in the 3D world. */
  hasExplored?: boolean
}

export default function MonitorOverlay({
  onGoOutside,
  fading = false,
  hasExplored = false,
}: Props) {
  const [activeTheme, setActiveTheme] = useState(
    () => localStorage.getItem('theme') ?? ''
  )

  useTheme((name) => {
    setActiveTheme(prev => prev || name)
  })

  function handleTheme(name: string) {
    setTheme(name)
    setActiveTheme(name)
  }

  const scrollRef =
    useRef<HTMLDivElement>(null)

  // Greeting is fixed for this mount: thank players returning from the 3D world,
  // nudge first-timers to explore. Driven by the prop so it never flips mid-click.
  const MESSAGE = hasExplored
    ? 'Thanks for exploring!'
    : 'Pssst… hit Explore up in the nav!'

  const [loading, setLoading] = useState(false)

  const handleExplore = async () => {
    // Capture the page BEFORE the loading overlay appears.
    // setLoading(true) is called only after the capture completes so the
    // "Entering 3D World" screen never ends up baked into the monitor texture.
    let canvas: HTMLCanvasElement | undefined
    try {
      const { default: html2canvas } = await import('html2canvas')
      canvas = await html2canvas(document.body, {
        scale: 0.5,
        useCORS: true,
        logging: false,
      })
    } catch {
      // ignore — onGoOutside handles the undefined case
    }

    setLoading(true)
    onGoOutside(canvas)
  }

  return (
    <div
      className="absolute inset-0 z-30 flex flex-col text-[var(--text)]"
      style={{
        background:
          'radial-gradient(circle at 20% 0%, var(--accent-glow), transparent 32rem), linear-gradient(180deg, var(--bg), var(--bg-2))',
        opacity: fading ? 0 : 1,
        transition: fading ? 'opacity 0.6s ease' : 'none',
        pointerEvents: fading ? 'none' : undefined,
      }}
    >
      {/* Loading screen — shown while html2canvas captures + 3D world boots */}
      {loading && (
        <div
          className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-6"
          style={{ background: 'var(--bg)' }}
        >
          <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
            <circle cx="36" cy="36" r="28" stroke="var(--border)" strokeWidth="4" />
            <circle
              cx="36" cy="36" r="28"
              stroke="var(--accent)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="44 132"
              style={{ transformOrigin: '36px 36px', animation: 'heroSpin 1s linear infinite' }}
            />
          </svg>
          <p className="text-sm font-semibold tracking-[0.2em] uppercase" style={{ color: 'var(--text-muted)' }}>
            Entering 3D World…
          </p>
        </div>
      )}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden"
      >
        <Header onExplore={handleExplore} />

        <div className="flex justify-center gap-2.5 py-2.5">
          {PALETTES.map(p => (
            <button
              key={p.name}
              title={p.name.charAt(0).toUpperCase() + p.name.slice(1)}
              onClick={() => handleTheme(p.name)}
              className="w-4 h-4 rounded-full focus:outline-none"
              style={{
                background: p.accent,
                transition: 'transform 0.15s, box-shadow 0.15s',
                boxShadow: activeTheme === p.name
                  ? `0 0 0 2px #000, 0 0 0 3.5px ${p.accent}`
                  : 'none',
                transform: activeTheme === p.name ? 'scale(1.3)' : 'scale(1)',
              }}
            />
          ))}
        </div>

        <main className="relative z-10">
  <Hero />

  <Experience />

  <Projects />

  <InteractiveShowcase />

  <Skills />

  <MoreOnMe />

  <Contact />
</main>

        <Footer />

        <StickFigure
          message={MESSAGE}
          delayMs={hasExplored ? 1400 : 10000}
          waving={hasExplored}
        />
      </div>
    </div>
  )
}