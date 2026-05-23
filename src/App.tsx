import { useState, lazy, Suspense, useRef } from 'react'
import Header from './components/Header'
import Hero from './components/Hero'
import Experience from './components/Experience'
import Skills from './components/Skills'
import Projects from './components/Projects'
import MoreOnMe from './components/MoreOnMe'
import Contact from './components/Contact'
import Footer from './components/Footer'
import BackToTop from './components/BackToTop'
import ThreeBackground from './components/ThreeBackground'
import { useTheme } from './hooks/useTheme'

const ThreePortfolio = lazy(() => import('./components/ThreePortfolio'))

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

function TwoDApp({ onExplore }: { onExplore: () => void }) {
  useTheme()

  const experienceRef = useRef<HTMLElement>(null)
  const skillsRef = useRef<HTMLElement>(null)
  const projectsRef = useRef<HTMLElement>(null)
  const contactRef = useRef<HTMLElement>(null)

  const sectionRefs = [experienceRef, skillsRef, projectsRef, contactRef]

  return (
    <>
      <ThreeBackground sectionRefs={sectionRefs} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <Header onExplore={onExplore} />
        <main>
          <Hero />
          <Experience sectionRef={experienceRef} />
          <Skills sectionRef={skillsRef} />
          <Projects sectionRef={projectsRef} />
          <MoreOnMe />
          <Contact sectionRef={contactRef} />
        </main>
        <Footer />
        <BackToTop />
      </div>
    </>
  )
}

export default function App() {
  const [mode3D, setMode3D] = useState(() => window.innerWidth >= 768)
  const [showMobileWarning, setShowMobileWarning] = useState(false)

  const handleExplore = () => {
    const isMobile = window.innerWidth < 768
    if (isMobile) {
      setShowMobileWarning(true)
    } else {
      setMode3D(true)
    }
  }

  if (mode3D) {
    return (
      <Suspense fallback={
        <div className="w-full h-screen bg-black flex items-center justify-center text-white text-lg">
          Loading 3D world...
        </div>
      }>
        <ThreePortfolio onExit={() => setMode3D(false)} />
      </Suspense>
    )
  }

  return (
    <>
      <TwoDApp onExplore={handleExplore} />
      {showMobileWarning && (
        <MobileWarningModal
          onConfirm={() => { setShowMobileWarning(false); setMode3D(true) }}
          onCancel={() => setShowMobileWarning(false)}
        />
      )}
    </>
  )
}
