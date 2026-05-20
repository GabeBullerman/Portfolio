import { useIntersectionObserver } from '../hooks/useIntersectionObserver'

interface SectionProps {
  sectionRef?: React.RefObject<HTMLElement>
}

export default function Contact({ sectionRef }: SectionProps) {
  const [ref, isVisible] = useIntersectionObserver<HTMLDivElement>()

  return (
    <section id="contact" ref={sectionRef} className="page-section">
      <div className="page-container-narrow">
        <div className="section-heading">
          <p
            className="mb-4 text-sm font-semibold uppercase tracking-[0.3em]"
            style={{ color: 'var(--accent)' }}
          >
            {"Let's Connect"}
          </p>
          <h2 className="text-4xl md:text-5xl font-black" style={{ color: 'var(--text)' }}>
            Contact
          </h2>
          <div className="section-divider" />
        </div>

        <div
          ref={ref}
          className="text-center transition-all duration-[1000ms]"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(24px)',
          }}
        >
          <h3 className="mb-5 text-3xl font-black" style={{ color: 'var(--text)' }}>
            Open to Opportunities
          </h3>

          <p
            className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed"
            style={{ color: 'var(--text-muted)' }}
          >
            {"I'm actively seeking software engineering opportunities involving full-stack development, "}
            frontend engineering, interactive web experiences, or scalable application development.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="mailto:gabebullerman1@gmail.com"
              className="rounded-full px-8 py-3 text-sm font-bold transition-all duration-300 hover:scale-105"
              style={{
                background: 'var(--accent)',
                color: 'var(--bg)',
                boxShadow: '0 0 24px var(--accent-glow)',
              }}
            >
              Email Me
            </a>

            <a
              href="https://github.com/GabeBullerman"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full px-8 py-3 text-sm font-bold transition-all duration-300 hover:scale-105"
              style={{
                background: 'transparent',
                border: '1px solid var(--border-strong)',
                color: 'var(--accent)',
              }}
            >
              GitHub
            </a>

            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full px-8 py-3 text-sm font-bold transition-all duration-300 hover:scale-105"
              style={{
                background: 'transparent',
                border: '1px solid var(--border-strong)',
                color: 'var(--accent)',
              }}
            >
              LinkedIn
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
