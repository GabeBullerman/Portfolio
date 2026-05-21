import { useIntersectionObserver } from '../hooks/useIntersectionObserver'

interface SectionProps {
  sectionRef?: React.RefObject<HTMLElement>
}

const cards = [
  {
    icon: '\u{1F3B9}',
    title: 'Hobbies',
    text: 'Self-teaching piano, rebuilding motorcycles, and studying film keep me grounded outside of work. I picked up music theory after inheriting a grand piano, spent a year modifying a Kawasaki sports bike from the ground up, and am steadily working through the IMDB Top 250 — Interstellar remains my favorite.',
  },
  {
    icon: '\u{1F30D}',
    title: 'Journeys',
    text: "I've visited 49 of 50 U.S. states and traveled extensively abroad — hiking and photographing Greece, exploring Italy's culinary and Renaissance arts, and immersing myself in Japan's culture and cities.",
  },
  {
    icon: '\u{1F5A5}️',
    title: 'Industry',
    text: "My relationship with computers started at age 8 and led to building over 40 custom desktops. A single conversation in high school shifted my focus entirely to software — and that pivot has defined my career ever since.",
  },
]

export default function MoreOnMe({ sectionRef }: SectionProps) {
  const [ref, isVisible] = useIntersectionObserver<HTMLDivElement>()

  return (
    <section id="more-on-me" ref={sectionRef} className="page-section">
      <div className="page-container">
        <div className="section-heading">
          <p
            className="mb-4 text-sm font-semibold uppercase tracking-[0.3em]"
            style={{ color: 'var(--accent)' }}
          >
            Beyond Development
          </p>
          <h2
            className="text-4xl md:text-5xl font-black"
            style={{ color: 'var(--text)' }}
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
            transform: isVisible ? 'translateY(0)' : 'translateY(24px)',
          }}
        >
          {cards.map(({ icon, title, text }) => (
            <div key={title} className="rounded-3xl p-8 glass-card">
              <div
                className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
                style={{ background: 'var(--accent-soft)', border: '1px solid var(--border-strong)' }}
              >
                {icon}
              </div>
              <h3 className="mb-4 text-2xl font-black" style={{ color: 'var(--text)' }}>
                {title}
              </h3>
              <p className="leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                {text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
