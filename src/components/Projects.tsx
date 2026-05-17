import { useIntersectionObserver } from '../hooks/useIntersectionObserver'
import { projectsData, type Project } from '../data/projects'

function EvenCard({ project }: { project: Project }) {
  const [ref, isVisible] = useIntersectionObserver<HTMLDivElement>()
  return (
    <div
      ref={ref}
      className={`flex flex-col md:flex-row items-center gap-8 mb-16 transition-all duration-[2000ms] ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
      }`}
    >
      <a
        href={project.link}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-shrink-0 w-52 h-52 xl:w-64 xl:h-64 hover:scale-105 transition-transform duration-300 block"
      >
        <img src={project.image} alt={project.imageAlt} className="w-full h-full object-contain" />
      </a>
      <h3 className="flex-shrink-0 font-bold text-xl px-8 md:border-r border-white text-center md:text-left">
        {project.subtitle}
      </h3>
      <div className="flex-1 text-left">
        <p className="text-lg mb-3 leading-relaxed">{project.description}</p>
        <div className="flex flex-wrap gap-2">
          {project.tags.map((tag) => (
            <span key={tag} className="text-xs border border-white rounded-full px-3 py-1 opacity-70">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function OddCard({ project }: { project: Project }) {
  const [ref, isVisible] = useIntersectionObserver<HTMLDivElement>()
  return (
    <div
      ref={ref}
      className={`flex flex-col md:flex-row-reverse items-center gap-8 mb-16 transition-all duration-[2000ms] ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
      }`}
    >
      <a
        href={project.link}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-shrink-0 w-52 h-52 xl:w-64 xl:h-64 hover:scale-105 transition-transform duration-300 block"
      >
        <img src={project.image} alt={project.imageAlt} className="w-full h-full object-contain" />
      </a>
      <h3 className="flex-shrink-0 font-bold text-xl px-8 md:border-l border-white text-center md:text-right">
        {project.subtitle}
      </h3>
      <div className="flex-1 text-right max-md:text-left">
        <p className="text-lg mb-3 leading-relaxed">{project.description}</p>
        <div className="flex flex-wrap gap-2 justify-end max-md:justify-start">
          {project.tags.map((tag) => (
            <span key={tag} className="text-xs border border-white rounded-full px-3 py-1 opacity-70">
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
      <div className="max-w-7xl mx-auto px-8">
        <h2 className="text-4xl font-bold text-center mb-12">Projects</h2>
        {projectsData.map((project, index) =>
          index % 2 === 0 ? (
            <EvenCard key={project.title} project={project} />
          ) : (
            <OddCard key={project.title} project={project} />
          )
        )}
      </div>
    </section>
  )
}
