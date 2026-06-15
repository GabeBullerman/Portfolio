import { useState, lazy, Suspense, useRef, useEffect } from 'react'
import Header from './components/Header'
import Hero from './components/Hero'
import Experience from './components/Experience'
import Skills from './components/Skills'
import Projects from './components/Projects'
import InteractiveShowcase from './components/showcase/InteractiveShowcase'
import MoreOnMe from './components/MoreOnMe'
import Contact from './components/Contact'
import Footer from './components/Footer'
import BackToTop from './components/BackToTop'
import StickFigure from './components/StickFigure'
import LoadingScreen from './components/LoadingScreen'
import { Analytics } from '@vercel/analytics/react'
import { useTheme, setTheme, PALETTES } from './hooks/useTheme'

// Single import factory so we can both lazy-render AND prefetch the chunk.
const importThreePortfolio = () => import('./components/ThreePortfolio')
const ThreePortfolio = lazy(importThreePortfolio)
let threePrefetched = false
const prefetchThree = () => {
  if (threePrefetched) return
  threePrefetched = true
  importThreePortfolio()  // warm the module cache (ThreePortfolio + three.js)
}

function MobileWarningModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-6">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
        <div className="text-4xl">📱</div>
        <h2 className="text-white font-bold text-lg">Better on Desktop</h2>
        <p className="text-white/60 text-sm leading-relaxed">
          The 3D experience is designed for desktop and may run slowly or look cramped on mobile. For the best experience, visit on a computer.
        </p>
        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={onConfirm}
            className="w-full px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold text-sm transition-colors"
          >
            Explore Anyway
          </button>
          <button
            onClick={onCancel}
            className="w-full px-4 py-2.5 bg-transparent hover:bg-white/5 text-white/50 rounded-xl font-semibold text-sm transition-colors"
          >
            Stay Here
          </button>
        </div>
      </div>
    </div>
  )
}

function ThemePicker() {
  const [activeTheme, setActiveTheme] = useState(() => localStorage.getItem('theme') ?? '')
  useTheme((name) => { setActiveTheme(prev => prev || name) })

  return (
    <div className="flex justify-center gap-2.5 py-2.5">
      {PALETTES.map(p => (
        <button
          key={p.name}
          title={p.name.charAt(0).toUpperCase() + p.name.slice(1)}
          onClick={() => { setTheme(p.name); setActiveTheme(p.name) }}
          className="w-4 h-4 rounded-full focus:outline-none"
          style={{
            background: p.accent,
            transition: 'transform 0.15s, box-shadow 0.15s',
            boxShadow: activeTheme === p.name ? `0 0 0 2px #000, 0 0 0 3.5px ${p.accent}` : 'none',
            transform: activeTheme === p.name ? 'scale(1.3)' : 'scale(1)',
          }}
        />
      ))}
    </div>
  )
}

function TwoDApp({ onExplore }: { onExplore: () => void }) {
  useTheme()

  const experienceRef = useRef<HTMLElement>(null)
  const skillsRef = useRef<HTMLElement>(null)
  const projectsRef = useRef<HTMLElement>(null)
  const contactRef = useRef<HTMLElement>(null)

  return (
    <div style={{ position: 'relative', zIndex: 1 }}>
      <Header onExplore={onExplore} />
      <ThemePicker />
      <main>
        <Hero />
        <Experience sectionRef={experienceRef} />
        <Skills sectionRef={skillsRef} />
        <Projects sectionRef={projectsRef} />
        <InteractiveShowcase />
        <MoreOnMe />
        <Contact sectionRef={contactRef} />
      </main>
      <Footer />
      <BackToTop />
      <StickFigure message="Pssst… hit Explore up in the nav!" delayMs={2500} />
    </div>
  )
}

export default function App() {
  const [mode3D, setMode3D] = useState(false)
  const [showMobileWarning, setShowMobileWarning] = useState(false)
  const [skipMonitor, setSkipMonitor] = useState(false)

  // Prefetch the 3D bundle while the browser is idle so clicking Explore
  // doesn't stall on a chunk download — the loading screen shows instantly.
  useEffect(() => {
    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback
    if (ric) ric(prefetchThree)
    else setTimeout(prefetchThree, 1500)
  }, [])

  const handleExplore = () => {
    prefetchThree()
    const isMobile = window.innerWidth < 768
    if (isMobile) {
      setShowMobileWarning(true)
    } else {
      setSkipMonitor(true)
      setMode3D(true)
    }
  }

  if (mode3D) {
    return (
      <Suspense fallback={<LoadingScreen staticPose />}>
        <ThreePortfolio onExit={() => setMode3D(false)} skipMonitor={skipMonitor} />
        <Analytics />
      </Suspense>
    )
  }

  return (
    <>
      <TwoDApp onExplore={handleExplore} />
      <Analytics />
      {showMobileWarning && (
        <MobileWarningModal
          onConfirm={() => { setShowMobileWarning(false); setSkipMonitor(true); setMode3D(true) }}
          onCancel={() => setShowMobileWarning(false)}
        />
      )}
    </>
  )
}
