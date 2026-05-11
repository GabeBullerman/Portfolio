import { useState, lazy, Suspense } from 'react'
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

const ThreePortfolio = lazy(() => import('./components/ThreePortfolio'))

export default function App() {
  const [mode3D, setMode3D] = useState(false)

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

      {/* Floating 3D cube button */}
      <button
        onClick={() => setMode3D(true)}
        title="Switch to 3D View"
        className="fixed top-4 right-4 z-50 w-12 h-12 bg-black text-white rounded-xl flex items-center justify-center shadow-lg hover:scale-110 hover:rotate-12 transition-transform duration-300 border border-white/20"
        style={{ perspective: '200px' }}
      >
        <i className="fa-solid fa-cube text-xl" />
      </button>
    </>
  )
}
