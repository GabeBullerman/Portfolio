import { useRef, useEffect, useState } from 'react'
import Header from './Header'
import Hero from './Hero'
import Experience from './Experience'
import Skills from './Skills'
import Projects from './Projects'
import Certifications from './Certifications'
import MoreOnMe from './MoreOnMe'
import Contact from './Contact'
import Footer from './Footer'
import BackToTop from './BackToTop'

interface Props {
  onGoOutside: () => void
}

export default function MonitorOverlay({ onGoOutside }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showFigure, setShowFigure]   = useState(false)
  const [typedText, setTypedText]     = useState('')
  const [typingDone, setTypingDone]   = useState(false)
  const hasExplored = localStorage.getItem('gabe-explored') === 'true'
  const MESSAGE = hasExplored ? "Thanks for exploring!" : "Pssst… hit Explore up in the nav!"

  const handleExplore = () => {
    localStorage.setItem('gabe-explored', 'true')
    onGoOutside()
  }

  useEffect(() => {
    const t = setTimeout(() => setShowFigure(true), 10000)
    return () => clearTimeout(t)
  }, [])

  // Start typing once the figure slides in
  useEffect(() => {
    if (!showFigure) return
    let i = 0
    const id = setInterval(() => {
      i++
      setTypedText(MESSAGE.slice(0, i))
      if (i >= MESSAGE.length) { clearInterval(id); setTypingDone(true) }
    }, 55)
    return () => clearInterval(id)
  }, [showFigure])

  // Intercept hash-link clicks so they scroll within the overlay instead of the page
  const handleClick = (e: React.MouseEvent) => {
    const a = (e.target as HTMLElement).closest('a[href^="#"]')
    if (!a) return
    e.preventDefault()
    const id = a.getAttribute('href')!.slice(1)
    const el = scrollRef.current?.querySelector(`#${id}`) ?? document.getElementById(id)
    if (el && scrollRef.current) {
      scrollRef.current.scrollTo({ top: (el as HTMLElement).offsetTop - 112, behavior: 'smooth' })
    }
  }

  return (
    <div className="absolute inset-0 z-30 flex flex-col" style={{ background: '#fff' }}>
      {/* Scrollable portfolio — Header is sticky within this container */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        onClick={handleClick}
        style={{ scrollbarGutter: 'stable' }}
      >
        <Header onExplore={handleExplore} />
        <main>
          <Hero />
          <Experience />
          <Skills />
          <Projects />
          <Certifications />
          <MoreOnMe />
          <Contact />
        </main>
        <Footer />
        <BackToTop />
      </div>

      {/* Stick figure — peeks from right edge after 10s */}
      <div
        className="fixed z-50 pointer-events-none select-none"
        style={{
          right: 0,
          // clamp keeps the figure below the Go Outside button on short viewports.
          // translateY(-50%) shifts the container up by ~half its height (~110px),
          // so the 170px floor puts the top edge at ~60px — safely under the button.
          top: 'clamp(170px, 40%, 72vh)',
          transform: showFigure
            ? 'translateY(-50%) translateX(18px) rotate(-38deg)'
            : 'translateY(-50%) translateX(130%) rotate(-38deg)',
          transformOrigin: 'right center',
          transition: 'transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {/* Speech bubble — counter-rotated so text stays level; hidden until figure appears */}
        <div
          style={{
            position: 'absolute',
            right: '82px',
            top: '10px',
            transform: 'rotate(38deg)',
            animation: showFigure ? 'figBob 2s ease-in-out infinite' : 'none',
            visibility: showFigure ? 'visible' : 'hidden',
          }}
        >
          <div className="relative bg-white border-2 border-gray-800 rounded-2xl px-4 py-2 text-sm font-semibold text-gray-800 whitespace-nowrap shadow-lg">
            {typedText}{!typingDone && <span className="animate-blink font-thin">|</span>}
            <span className="absolute right-[-10px] top-1/2 -translate-y-1/2 w-0 h-0"
              style={{ borderTop:'8px solid transparent', borderBottom:'8px solid transparent', borderLeft:'10px solid #1f2937' }} />
            <span className="absolute right-[-8px] top-1/2 -translate-y-1/2 w-0 h-0"
              style={{ borderTop:'7px solid transparent', borderBottom:'7px solid transparent', borderLeft:'9px solid white' }} />
          </div>
        </div>

        {/* Stick figure — white outline via drop-shadow so he's visible on dark backgrounds */}
        <svg
          width="90" height="220" viewBox="0 0 90 220"
          style={{
            animation: showFigure ? 'figBob 2s ease-in-out infinite' : 'none',
            display: 'block',
            overflow: 'visible',
            filter: 'drop-shadow(0 0 2px white) drop-shadow(0 0 2px white)',
          }}
        >
          {/* Head */}
          <circle cx="40" cy="24" r="18" fill="none" stroke="#1f2937" strokeWidth="3.5" />
          {/* Eyes */}
          <circle cx="33" cy="22" r="2.2" fill="#1f2937" />
          <circle cx="47" cy="22" r="2.2" fill="#1f2937" />
          {/* Smile */}
          <path d="M33 31 Q40 38 47 31" fill="none" stroke="#1f2937" strokeWidth="2.5" strokeLinecap="round" />
          {/* Body */}
          <line x1="40" y1="42" x2="40" y2="115" stroke="#1f2937" strokeWidth="3.5" strokeLinecap="round" />
          {/* Left arm (viewer's right) — vertical on screen, pointing straight up */}
          <line x1="40" y1="65" x2="83" y2="10" stroke="#1f2937" strokeWidth="3.5" strokeLinecap="round" />
          {/* Right arm (viewer's left) — down by side normally, both up when explored */}
          {hasExplored
            ? <line x1="40" y1="65" x2="2"  y2="18" stroke="#1f2937" strokeWidth="3.5" strokeLinecap="round" />
            : <line x1="40" y1="65" x2="18" y2="108" stroke="#1f2937" strokeWidth="3.5" strokeLinecap="round" />
          }
          {/* Legs — barely visible stubs */}
          <line x1="40" y1="115" x2="28" y2="210" stroke="#1f2937" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="40" y1="115" x2="54" y2="210" stroke="#1f2937" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
      </div>

      <style>{`
        @keyframes figBob {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-7px); }
        }
      `}</style>
    </div>
  )
}
