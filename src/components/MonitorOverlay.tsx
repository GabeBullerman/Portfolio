import { useRef } from 'react'
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
      {/* "Go Outside" button — floats over the sticky header */}
      <button
        onClick={onGoOutside}
        className="fixed z-[60] flex items-center gap-2 text-sm font-bold transition-all duration-200 hover:scale-105 active:scale-95 px-4 py-2 rounded-full"
        style={{
          top: '1rem',
          right: '1rem',
          background: 'rgba(0,0,0,0.85)',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.2)',
          backdropFilter: 'blur(8px)',
        }}
      >
        Go Outside →
      </button>

      {/* Scrollable portfolio — Header is sticky within this container */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        onClick={handleClick}
        style={{ scrollbarGutter: 'stable' }}
      >
        <Header />
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
    </div>
  )
}
