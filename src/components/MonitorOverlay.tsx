import { useRef, useEffect, useState } from 'react'
import Header from './Header'
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

  const [showFigure, setShowFigure] =
    useState(false)

  const [typedText, setTypedText] =
    useState('')

  const [typingDone, setTypingDone] =
    useState(false)

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

  useEffect(() => {
    // Pop in promptly to thank a returning explorer; linger longer as a subtle
    // nudge for someone who hasn't explored yet.
    const t = setTimeout(
      () => setShowFigure(true),
      hasExplored ? 1400 : 10000
    )

    return () => clearTimeout(t)
  }, [hasExplored])

  useEffect(() => {
    if (!showFigure) return

    let i = 0

    const interval = setInterval(() => {
      setTypedText(MESSAGE.slice(0, i + 1))

      i++

      if (i >= MESSAGE.length) {
        clearInterval(interval)
        setTypingDone(true)
      }
    }, 35)

    return () => clearInterval(interval)
  }, [showFigure, MESSAGE])

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

        {/* Stick figure — original pose/layout with themed colors */}
        <div
          className="hidden md:block fixed z-50 pointer-events-none select-none"
          style={{
            right: 0,
            top: 'clamp(170px, 40%, 72vh)',

            transform: showFigure
              ? 'translateY(-50%) translateX(18px) rotate(-38deg)'
              : 'translateY(-50%) translateX(130%) rotate(-38deg)',

            transformOrigin: 'right center',

            transition:
              'transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          {/* Speech bubble */}
          <div
            style={{
              position: 'absolute',
              right: '82px',
              top: '10px',

              transform: 'rotate(38deg)',

              animation: showFigure
                ? 'figBob 2s ease-in-out infinite'
                : 'none',

              visibility: showFigure
                ? 'visible'
                : 'hidden',
            }}
          >
            <div
              className="relative rounded-2xl px-4 py-2 text-sm font-semibold whitespace-nowrap shadow-lg"
              style={{
                background: 'var(--surface)',

                border:
                  '2px solid var(--accent)',

                color: 'var(--text)',

                boxShadow:
                  '0 0 18px var(--accent-glow)',
              }}
            >
              {typedText}

              {!typingDone && (
                <span className="animate-blink font-thin">
                  |
                </span>
              )}

              <span
                className="absolute right-[-10px] top-1/2 -translate-y-1/2 w-0 h-0"
                style={{
                  borderTop:
                    '8px solid transparent',

                  borderBottom:
                    '8px solid transparent',

                  borderLeft:
                    '10px solid var(--accent)',
                }}
              />

              <span
                className="absolute right-[-7px] top-1/2 -translate-y-1/2 w-0 h-0"
                style={{
                  borderTop:
                    '7px solid transparent',

                  borderBottom:
                    '7px solid transparent',

                  borderLeft:
                    '9px solid var(--surface)',
                }}
              />
            </div>
          </div>

          {/* Original SVG figure */}
          <svg
            width="90"
            height="220"
            viewBox="0 0 90 220"
            style={{
              animation: showFigure
                ? 'figBob 2s ease-in-out infinite'
                : 'none',

              display: 'block',

              overflow: 'visible',

              filter:
                'drop-shadow(0 0 3px var(--accent-glow)) drop-shadow(0 0 2px var(--bg))',
            }}
          >
            {/* Head */}
            <circle
              cx="40"
              cy="24"
              r="18"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="3.5"
            />

            {/* Eyes */}
            <circle
              cx="33"
              cy="22"
              r="2.2"
              fill="var(--accent)"
            />

            <circle
              cx="47"
              cy="22"
              r="2.2"
              fill="var(--accent)"
            />

            {/* Smile */}
            <path
              d="M33 31 Q40 38 47 31"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {/* Body */}
            <line
              x1="40"
              y1="42"
              x2="40"
              y2="115"
              stroke="var(--accent)"
              strokeWidth="3.5"
              strokeLinecap="round"
            />

            {/* Left arm */}
            <line
              x1="40"
              y1="65"
              x2="83"
              y2="10"
              stroke="var(--accent)"
              strokeWidth="3.5"
              strokeLinecap="round"
            />

            {/* Right arm */}
            {hasExplored ? (
              <line
                x1="40"
                y1="65"
                x2="2"
                y2="18"
                stroke="var(--accent)"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
            ) : (
              <line
                x1="40"
                y1="65"
                x2="18"
                y2="108"
                stroke="var(--accent)"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
            )}

            {/* Legs */}
            <line
              x1="40"
              y1="115"
              x2="28"
              y2="210"
              stroke="var(--accent)"
              strokeWidth="3.5"
              strokeLinecap="round"
            />

            <line
              x1="40"
              y1="115"
              x2="54"
              y2="210"
              stroke="var(--accent)"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
    </div>
  )
}