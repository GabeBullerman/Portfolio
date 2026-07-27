import { useEffect, useRef, useState, lazy, Suspense } from 'react'
import SectionHeading from '../SectionHeading'

// Lazy-loaded so Three.js ships in its own chunk instead of the main 2D bundle.
const ScrollMotionPanel = lazy(() => import('./ScrollMotionPanel'))
const GalaxyPreview     = lazy(() => import('./GalaxyPreview'))

function useLazyMount() {
  const [ready, setReady] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Mount canvases when the section is near the viewport AND the browser is idle
    const mount = () => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => setReady(true), { timeout: 1500 })
      } else {
        setTimeout(() => setReady(true), 500)
      }
    }

    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { mount(); obs.disconnect() } },
      { rootMargin: '300px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return { ref, ready }
}

export default function InteractiveShowcase() {
  const { ref, ready } = useLazyMount()

  return (
    <section
      id="interactive"
      className="page-section relative overflow-hidden"
    >
      <div className="page-container">
        <SectionHeading
          label="WebGL & motion"
          title="Interactive Work"
          description="Lightweight WebGL and motion experiments designed to make memorable experiences."
        />

        <div className="page-container">
          <div ref={ref} className="flex flex-col gap-10">
            {ready ? (
              <Suspense fallback={<div className="min-h-[560px] md:min-h-[1300px]" />}>
                <ScrollMotionPanel />
                <GalaxyPreview />
              </Suspense>
            ) : (
              // Placeholder keeps layout stable while canvases are deferred
              <div className="min-h-[560px] md:min-h-[1300px]" />
            )}
          </div>
        </div>
      </div>
    </section>
  )
}