import { useIntersectionObserver } from '../hooks/useIntersectionObserver'

interface SectionProps {
  sectionRef?: React.RefObject<HTMLElement>
}

const certs = [
  { src: '/images/cloudPractitionerAWS.png', alt: 'AWS Cloud Practitioner' },
  { src: '/images/aiPractitionerAWS.png', alt: 'AWS AI Practitioner' },
  { src: '/images/developerAWS.png', alt: 'AWS Developer' },
  { src: '/images/devopsEngineerAWS.png', alt: 'AWS DevOps Engineer' },
]

export default function Certifications({ sectionRef }: SectionProps) {
  const [ref, isVisible] = useIntersectionObserver<HTMLDivElement>()

  return (
    <section id="certifications" ref={sectionRef} className="page-section">
      <div className="page-container">
        <div className="section-heading">
          <p
            className="mb-4 text-sm font-semibold uppercase tracking-[0.3em]"
            style={{ color: 'var(--accent)' }}
          >
            Cloud Expertise
          </p>
          <h2
            className="text-4xl md:text-5xl font-black"
            style={{ color: 'var(--text)' }}
          >
            Certifications
          </h2>
          <div className="section-divider" />
        </div>

        <div
          ref={ref}
          className="rounded-3xl p-8 md:p-12 glass-card text-center transition-all duration-[1000ms]"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(24px)',
          }}
        >
          <p
            className="mb-8 text-sm font-semibold uppercase tracking-[0.3em]"
            style={{ color: 'var(--accent)' }}
          >
            Amazon Web Services
          </p>

          <div className="flex flex-wrap justify-center gap-6 md:gap-10 mb-8">
            {certs.map((cert, i) => (
              <img
                key={cert.alt}
                src={cert.src}
                alt={cert.alt}
                className="w-28 h-28 md:w-36 md:h-36 xl:w-44 xl:h-44 object-contain transition-all duration-300 hover:scale-110"
                style={{
                  opacity: isVisible ? 1 : 0,
                  transitionDelay: `${i * 100}ms`,
                  filter: 'drop-shadow(0 0 0px transparent)',
                  transition: `opacity 700ms ${i * 100}ms ease, filter 0.3s ease, transform 0.3s ease`,
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLImageElement).style.filter =
                    'drop-shadow(0 0 10px var(--accent))'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLImageElement).style.filter =
                    'drop-shadow(0 0 0px transparent)'
                }}
              />
            ))}
          </div>

          <p
            className="text-sm md:text-base max-w-xl mx-auto"
            style={{ color: 'var(--text-muted)' }}
          >
            Studied, practiced, and completed the AWS Development path — Cloud
            Practitioner, AI Practitioner, Developer, and DevOps Engineer.
          </p>
        </div>
      </div>
    </section>
  )
}
