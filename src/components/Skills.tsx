import { useIntersectionObserver } from '../hooks/useIntersectionObserver'
import { skillsData, type SkillCategory } from '../data/skills'

function SkillCategoryBlock({ category, isLast }: { category: SkillCategory; isLast: boolean }) {
  const [ref, isVisible] = useIntersectionObserver<HTMLDivElement>()

  return (
    <>
      <div ref={ref} className="text-center">
        <strong className="block text-xl mb-6">{category.category}</strong>
        <div className="flex flex-wrap justify-center gap-6">
          {category.skills.map((skill, i) => (
            <div
              key={skill.name}
              className="flex flex-col items-center w-20 transition-opacity duration-700"
              style={{
                opacity: isVisible ? 1 : 0,
                transitionDelay: `${i * 60}ms`,
              }}
            >
              <img src={skill.icon} alt={skill.name} className="w-16 h-16 mb-2 object-contain" />
              <p className="text-xs font-bold text-center m-0 leading-tight">{skill.name}</p>
            </div>
          ))}
        </div>
      </div>
      {!isLast && <div className="h-px bg-black w-[85%] mx-auto" />}
    </>
  )
}

export default function Skills() {
  return (
    <section id="skills" className="bg-white text-black py-16">
      <div className="max-w-4xl mx-auto px-4 md:px-8">
        <h2 className="text-4xl font-bold text-center mb-8">Technical Skills</h2>
        <div className="border-2 border-black rounded-2xl p-6 md:p-10 flex flex-col gap-8">
          {skillsData.map((category, i) => (
            <SkillCategoryBlock
              key={category.category}
              category={category}
              isLast={i === skillsData.length - 1}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
