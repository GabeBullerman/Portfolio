import { useIntersectionObserver } from '../hooks/useIntersectionObserver'
import { projectsData, type Project } from '../data/projects'

interface SectionProps {
  sectionRef?: React.RefObject<HTMLElement>
}

function ProjectRow({ project, index }: { project: Project; index: number }) {
  const [ref, isVisible] = useIntersectionObserver<HTMLDivElement>()
  const imageLeft = index % 2 === 0

  return (
    <div
      ref={ref}
      className={`grid grid-cols-1 gap-6 items-center transition-all duration-[1000ms] ${imageLeft ? 'lg:grid-cols-[240px_1fr]' : 'lg:grid-cols-[1fr_240px]'}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(28px)',
        transitionDelay: `${index * 120}ms`,
      }}
    >
      <div
        className={`rounded-3xl overflow-hidden glass-card flex-shrink-0 ${imageLeft ? 'lg:order-1' : 'lg:order-2'}`}
        style={{ width: 240, height: 240 }}
      >
        {project.image ? (
          <img
            src={project.image}
            alt={project.imageAlt}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="h-full w-full flex items-center justify-center text-5xl font-black"
            style={{
              color: 'var(--accent)',
              background: 'radial-gradient(circle at center, var(--accent-glow), transparent 60%)',
            }}
          >
            {project.title?.charAt(0)}
          </div>
        )}
      </div>

      <div
        className={`rounded-3xl p-7 md:p-9 glass-card flex flex-col justify-center ${
          imageLeft ? 'lg:order-2' : 'lg:order-1'
        }`}
      >
        <p
          className="mb-3 text-sm font-semibold uppercase tracking-[0.25em]"
          style={{ color: 'var(--accent)' }}
        >
          {project.subtitle}
        </p>

        <h3
          className="text-3xl md:text-4xl font-black mb-5"
          style={{ color: 'var(--text)' }}
        >
          {project.title}
        </h3>

        <p
          className="text-base md:text-lg leading-relaxed mb-6 line-clamp-4"
          style={{ color: 'var(--text-muted)' }}
        >
          {project.description}
        </p>

        <div className="flex flex-wrap gap-2 mb-7">
          {project.tags?.map((tag) => (
            <span
              key={tag}
              className="rounded-full px-3 py-1 text-sm"
              style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                color: 'var(--text-muted)',
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        {project.link && (
          <div className="flex flex-wrap gap-3">
            <a
              href={project.link}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full px-5 py-2 text-sm font-bold transition-all duration-300 hover:scale-105"
              style={{
                background: 'var(--accent)',
                color: 'var(--bg)',
                boxShadow: '0 0 18px var(--accent-glow)',
              }}
            >
              View Project
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Projects({ sectionRef }: SectionProps) {
  return (
    <section id="projects" ref={sectionRef} className="page-section">
      <div className="page-container">
        <div className="section-heading">
          <p
            className="mb-4 text-sm font-semibold uppercase tracking-[0.3em]"
            style={{ color: 'var(--accent)' }}
          >
            Technical Portfolio
          </p>

          <h2
            className="text-4xl md:text-5xl font-black"
            style={{ color: 'var(--text)' }}
          >
            Projects
          </h2>

          <div className="section-divider" />
        </div>

        <div className="flex flex-col gap-8">
          {projectsData.map((project, index) => (
            <ProjectRow
              key={project.title}
              project={project}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
