import { useIntersectionObserver } from '../hooks/useIntersectionObserver'
import { experienceData, type ExperienceItem } from '../data/experience'

function ExperienceCard({ item }: { item: ExperienceItem }) {
  const [ref, isVisible] = useIntersectionObserver<HTMLDivElement>()

  return (
    <div
      ref={ref}
      className={`border-2 border-black rounded-2xl p-6 md:p-8 transition-all duration-[1250ms] ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
      }`}
    >
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-1 md:gap-2 mb-4">
        <div>
          <h3 className="text-xl font-bold m-0">{item.title}</h3>
          <span className="text-gray-500 italic text-sm">
            {item.company} &mdash; {item.location}
          </span>
        </div>
        <span className="text-gray-500 italic text-sm md:whitespace-nowrap">{item.period}</span>
      </div>
      <ul className="list-disc pl-5 space-y-2 m-0">
        {item.bullets.map((bullet, i) => (
          <li key={i} className="leading-relaxed text-sm md:text-base">
            {bullet}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function Experience() {
  return (
    <section id="experience" className="bg-white text-black py-16">
      <div className="max-w-7xl mx-auto px-8">
        <h2 className="text-4xl font-bold text-center mb-10">Experience</h2>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {experienceData.map((item) => (
            <ExperienceCard key={item.company} item={item} />
          ))}
        </div>
      </div>
    </section>
  )
}
