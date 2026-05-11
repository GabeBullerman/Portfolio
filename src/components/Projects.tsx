import { useIntersectionObserver } from '../hooks/useIntersectionObserver'
import { projectsData, type Project } from '../data/projects'

function ProjectCard({ project, index }: { project: Project; index: number }) {
  const [ref, isVisible] = useIntersectionObserver<HTMLDivElement>()
  const isEven = index % 2 === 0

  return (
    <div
      ref={ref}
      className={`flex items-center gap-0 mb-12 transition-all duration-[2000ms] flex-col md:${
        isEven ? 'flex-row' : 'flex-row-reverse'
      } ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
    >
      <a
        href={project.link}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-shrink-0 w-48 h-48 block"
      >
        <img src={project.image} alt={project.imageAlt} className="w-full h-full object-contain" />
      </a>

      <h3
        className={`flex-shrink-0 font-bold text-xl px-10 py-4 relative md:py-0 ${
          isEven ? 'border-r border-white' : 'border-l border-white'
        } max-md:border-none max-md:text-center`}
      >
        {project.subtitle}
      </h3>

      <div className={`flex-1 px-4 ${isEven ? 'text-left' : 'text-right'} max-md:text-center`}>
        <p className="text-lg mb-3 leading-relaxed">{project.description}</p>
        <div
          className={`flex flex-wrap gap-2 ${
            isEven ? 'justify-start' : 'justify-end'
          } max-md:justify-center`}
        >
          {project.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs border border-white rounded-full px-3 py-1 opacity-70"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Projects() {
  return (
    <section id="projects" className="bg-black text-white py-16">
      <div className="max-w-5xl mx-auto px-4 md:px-8">
        <h2 className="text-4xl font-bold text-center mb-10">Projects</h2>
        {projectsData.map((project, index) => (
          <ProjectCard key={project.title} project={project} index={index} />
        ))}
      </div>
    </section>
  )
}
