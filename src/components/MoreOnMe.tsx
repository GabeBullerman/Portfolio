import { useIntersectionObserver } from '../hooks/useIntersectionObserver'

interface SectionProps {
  sectionRef?: React.RefObject<HTMLElement>
}

export default function MoreOnMe({
  sectionRef,
}: SectionProps) {
  const [ref, isVisible] =
    useIntersectionObserver<HTMLDivElement>()

  return (
    <section
      id="more-on-me"
      ref={sectionRef}
      className="page-section"
    >
      <div className="page-container">
        <div className="section-heading">
          <p
            className="mb-4 text-sm font-semibold uppercase tracking-[0.3em]"
            style={{
              color: 'var(--accent)',
            }}
          >
            Beyond Development
          </p>

          <h2
            className="text-4xl md:text-5xl font-black"
            style={{
              color: 'var(--text)',
            }}
          >
            More About Me
          </h2>

          <div className="section-divider" />
        </div>

        <div
          ref={ref}
          className="grid grid-cols-1 gap-6 lg:grid-cols-3 transition-all duration-[1000ms]"
          style={{
            opacity: isVisible ? 1 : 0,

            transform: isVisible
              ? 'translateY(0)'
              : 'translateY(24px)',
          }}
        >
          <div className="rounded-3xl p-8 glass-card">
            <div
              className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
              style={{
                background:
                  'var(--accent-soft)',

                border:
                  '1px solid var(--border-strong)',
              }}
            >
              💻
            </div>

            <h3
              className="mb-4 text-2xl font-black"
              style={{
                color: 'var(--text)',
              }}
            >
              Building Experiences
            </h3>

            <p
              className="leading-relaxed"
              style={{
                color:
                  'var(--text-muted)',
              }}
            >
              I enjoy combining
              frontend engineering with
              immersive interaction
              design, blending modern
              UI/UX with performant
              Three.js and WebGL
              experiences.
            </p>
          </div>

          <div className="rounded-3xl p-8 glass-card">
            <div
              className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
              style={{
                background:
                  'var(--accent-soft)',

                border:
                  '1px solid var(--border-strong)',
              }}
            >
              🚀
            </div>

            <h3
              className="mb-4 text-2xl font-black"
              style={{
                color: 'var(--text)',
              }}
            >
              Always Improving
            </h3>

            <p
              className="leading-relaxed"
              style={{
                color:
                  'var(--text-muted)',
              }}
            >
              I’m constantly exploring
              new technologies,
              experimenting with modern
              frameworks, and refining
              scalable engineering
              practices across frontend,
              backend, and cloud
              systems.
            </p>
          </div>

          <div className="rounded-3xl p-8 glass-card">
            <div
              className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
              style={{
                background:
                  'var(--accent-soft)',

                border:
                  '1px solid var(--border-strong)',
              }}
            >
              🎮
            </div>

            <h3
              className="mb-4 text-2xl font-black"
              style={{
                color: 'var(--text)',
              }}
            >
              Creative Problem Solving
            </h3>

            <p
              className="leading-relaxed"
              style={{
                color:
                  'var(--text-muted)',
              }}
            >
              Outside of traditional
              software engineering, I
              enjoy interactive systems,
              game-inspired UI concepts,
              streaming tech, automation
              scripting, and creating
              memorable digital
              experiences.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}