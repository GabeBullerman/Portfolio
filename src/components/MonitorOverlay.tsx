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
import { useTheme } from '../hooks/useTheme'

type Props = {
  onGoOutside: (snapshot?: HTMLCanvasElement) => void
}

export default function MonitorOverlay({
  onGoOutside,
}: Props) {
  useTheme()

  const scrollRef =
    useRef<HTMLDivElement>(null)

  const [showFigure, setShowFigure] =
    useState(false)

  const [typedText, setTypedText] =
    useState('')

  const [typingDone, setTypingDone] =
    useState(false)

  const [hasExplored, setHasExplored] =
    useState(false)

  const MESSAGE = hasExplored
    ? 'Thanks for exploring!'
    : 'Pssst… hit Explore up in the nav!'

  useEffect(() => {
    localStorage.removeItem('gabe-explored')
    sessionStorage.removeItem(
      'gabe-explored'
    )

    setHasExplored(false)
  }, [])

  const handleExplore = async () => {
    sessionStorage.setItem('gabe-explored', 'true')
    setHasExplored(true)
    try {
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(document.body, {
        scale: 0.5,
        useCORS: true,
        logging: false,
      })
      onGoOutside(canvas)
    } catch {
      onGoOutside()
    }
  }

  useEffect(() => {
    const t = setTimeout(
      () => setShowFigure(true),
      10000
    )

    return () => clearTimeout(t)
  }, [])

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
      }}
    >
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden"
      >
        <Header onExplore={handleExplore} />

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