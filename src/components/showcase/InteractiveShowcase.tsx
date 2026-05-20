import ScrollMotionPanel from './ScrollMotionPanel'
import GalaxyPreview from './GalaxyPreview'

export default function InteractiveShowcase() {
  return (
    <section
      id="interactive"
      className="page-section relative overflow-hidden"
    >
      <div className="page-container">
        <div className="section-heading">
          <p
            className="text-sm uppercase tracking-[0.3em] font-semibold mb-4"
            style={{ color: 'var(--accent)' }}
          >
            Interactive Frontend Engineering
          </p>

          <h2
            className="text-4xl md:text-5xl font-black mb-5"
            style={{ color: 'var(--text)' }}
          >
            Featured Interactive Work
          </h2>

          <p
            className="max-w-3xl mx-auto text-lg leading-relaxed"
            style={{ color: 'var(--text-muted)' }}
          >
            Lightweight WebGL and motion experiments designed to make the
            portfolio more memorable while keeping the experience professional.
          </p>

          <div className="section-divider" />
        </div>

        <div className="page-container">
          <div className="flex flex-col gap-10">
            <ScrollMotionPanel />

            <GalaxyPreview />
          </div>
        </div>
      </div>
    </section>
  )
}