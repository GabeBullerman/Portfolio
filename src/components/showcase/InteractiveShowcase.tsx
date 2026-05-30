import ScrollMotionPanel from './ScrollMotionPanel'
import GalaxyPreview from './GalaxyPreview'
import { useEffect, useRef, useState } from 'react'
import SectionHeading from '../SectionHeading'

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
              <>
                <ScrollMotionPanel />
                <GalaxyPreview />
              </>
            ) : (
              // Placeholder keeps layout stable while canvases are deferred
              <div style={{ minHeight: '1300px' }} />
            )}
          </div>
        </div>
      </div>
    </section>
  )
}