import { useIntersectionObserver } from '../hooks/useIntersectionObserver'
import { skillsData, type SkillCategory } from '../data/skills'
import SectionHeading from './SectionHeading'

interface SectionProps {
  sectionRef?: React.RefObject<HTMLElement>
}

function SkillRow({ category, index, isLast }: { category: SkillCategory; index: number; isLast: boolean }) {
  const [ref, isVisible] = useIntersectionObserver<HTMLDivElement>()

  return (
    <>
      <div
        ref={ref}
        className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 py-6 transition-all duration-[900ms]"
        style={{
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateY(0)' : 'translateY(16px)',
          transitionDelay: `${index * 80}ms`,
        }}
      >
        {/* Category label */}
        <div className="flex-shrink-0 sm:w-36 sm:text-right">
          <span
            className="text-xs font-bold uppercase tracking-[0.2em]"
            style={{ color: 'var(--accent)' }}
          >
            {category.category}
          </span>
        </div>

        {/* Vertical rule */}
        <div
          className="hidden sm:block self-stretch w-px flex-shrink-0"
          style={{ background: 'var(--border)' }}
        />

        {/* Icons */}
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-3">
          {category.skills.map((skill, i) => (
            <div
              key={skill.name}
              className="group flex flex-col items-center gap-1 cursor-default w-14 transition-all duration-500"
              style={{
                opacity: isVisible ? 1 : 0,
                transitionDelay: `${index * 80 + i * 35}ms`,
              }}
            >
              <img
                src={skill.icon}
                alt={skill.name}
                className="h-10 w-10 object-contain transition-all duration-300 group-hover:scale-110"
                style={{ filter: 'drop-shadow(0 0 0px transparent)' }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLImageElement).style.filter =
                    'drop-shadow(0 0 8px var(--accent))'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLImageElement).style.filter =
                    'drop-shadow(0 0 0px transparent)'
                }}
              />
              <span
                className="text-center leading-tight"
                style={{ color: 'var(--text-subtle)', fontSize: '0.65rem', fontWeight: 600 }}
              >
                {skill.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {!isLast && (
        <div
          className="h-px w-full"
          style={{ background: 'linear-gradient(90deg, transparent, var(--border), transparent)' }}
        />
      )}
    </>
  )
}

export default function Skills({ sectionRef }: SectionProps) {
  return (
    <section id="skills" ref={sectionRef} className="page-section" style={{ color: 'var(--text)' }}>
      <div className="page-container">
        <SectionHeading label="My toolkit" title="Technical Skills" />

        <div className="rounded-3xl px-6 md:px-10 glass-card">
          {skillsData.map((category, index) => (
            <SkillRow
              key={category.category}
              category={category}
              index={index}
              isLast={index === skillsData.length - 1}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
