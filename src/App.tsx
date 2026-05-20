import { useState, lazy, Suspense, useRef } from 'react'
import Header from './components/Header'
import Hero from './components/Hero'
import Experience from './components/Experience'
import Skills from './components/Skills'
import Projects from './components/Projects'
import Certifications from './components/Certifications'
import MoreOnMe from './components/MoreOnMe'
import Contact from './components/Contact'
import Footer from './components/Footer'
import BackToTop from './components/BackToTop'
import ThreeBackground from './components/ThreeBackground'
import { useTheme } from './hooks/useTheme'

const ThreePortfolio = lazy(() => import('./components/ThreePortfolio'))

function TwoDApp() {
  useTheme()

  const experienceRef = useRef<HTMLElement>(null)
  const skillsRef = useRef<HTMLElement>(null)
  const projectsRef = useRef<HTMLElement>(null)
  const certificationsRef = useRef<HTMLElement>(null)
  const contactRef = useRef<HTMLElement>(null)

  const sectionRefs = [experienceRef, skillsRef, projectsRef, certificationsRef, contactRef]

  return (
    <>
      <ThreeBackground sectionRefs={sectionRefs} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <Header />
        <main>
          <Hero />
          <Experience sectionRef={experienceRef} />
          <Skills sectionRef={skillsRef} />
          <Projects sectionRef={projectsRef} />
          <Certifications sectionRef={certificationsRef} />
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
  const [mode3D, setMode3D] = useState(true)

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

  return <TwoDApp />
}
