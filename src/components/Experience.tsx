import { useIntersectionObserver } from '../hooks/useIntersectionObserver'
import {
  experienceData,
  type ExperienceItem,
} from '../data/experience'

interface SectionProps {
  sectionRef?: React.RefObject<HTMLElement>
}

function ExperienceBox({
  item,
  index,
}: {
  item: ExperienceItem
  index: number
}) {
  const [ref, isVisible] = useIntersectionObserver<HTMLDivElement>()

  return (
    <div
      ref={ref}
      className="rounded-3xl p-6 md:p-8 glass-card transition-all duration-[900ms]"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(24px)',
        transitionDelay: `${index * 120}ms`,
      }}
    >
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-5">
        <div>
          <p
            className="mb-2 text-xs font-semibold uppercase tracking-[0.25em]"
            style={{ color: 'var(--accent)' }}
          >
            {item.company}
          </p>

          <h3
            className="text-2xl font-black leading-tight"
            style={{ color: 'var(--text)' }}
          >
            {item.title}
          </h3>

          <p
            className="mt-2 text-sm italic"
            style={{ color: 'var(--text-muted)' }}
          >
            {item.location}
          </p>
        </div>

        <span
          className="rounded-full px-3 py-1 text-xs font-bold md:whitespace-nowrap"
          style={{
            color: 'var(--accent)',
            background: 'var(--accent-soft)',
            border: '1px solid var(--border-strong)',
          }}
        >
          {item.period}
        </span>
      </div>

      <ul className="m-0 list-disc space-y-2 pl-5">
        {item.bullets.map((bullet, i) => (
          <li
            key={i}
            className="text-sm md:text-base leading-relaxed"
            style={{ color: 'var(--text-muted)' }}
          >
            {bullet}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function Experience({ sectionRef }: SectionProps) {
  return (
    <section id="experience" ref={sectionRef} className="page-section">
      <div className="page-container">
        <div className="section-heading">
          <p
            className="mb-4 text-sm font-semibold uppercase tracking-[0.3em]"
            style={{ color: 'var(--accent)' }}
          >
            Professional Background
          </p>

          <h2
            className="text-4xl md:text-5xl font-black"
            style={{ color: 'var(--text)' }}
          >
            Experience
          </h2>

          <div className="section-divider" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {experienceData.map((item, index) => (
            <ExperienceBox
              key={`${item.company}-${item.title}`}
              item={item}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  )
}