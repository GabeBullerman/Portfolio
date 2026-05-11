import { useIntersectionObserver } from '../hooks/useIntersectionObserver'

const certs = [
  { src: '/images/cloudPractitionerAWS.png', alt: 'AWS Cloud Practitioner' },
  { src: '/images/aiPractitionerAWS.png', alt: 'AWS AI Practitioner' },
  { src: '/images/developerAWS.png', alt: 'AWS Developer' },
  { src: '/images/devopsEngineerAWS.png', alt: 'AWS DevOps Engineer' },
]

export default function Certifications() {
  const [ref, isVisible] = useIntersectionObserver<HTMLDivElement>()

  return (
    <section id="certifications" className="bg-white text-black py-16">
      <div className="max-w-5xl mx-auto px-8">
        <h2 className="text-4xl font-bold text-center mb-8">Certifications</h2>
        <div
          ref={ref}
          className={`border-2 border-black rounded-2xl p-8 text-center transition-opacity duration-[1250ms] ${
            isVisible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <strong className="block text-xl mb-6">AWS</strong>
          <div className="flex flex-wrap justify-center gap-6 mb-6">
            {certs.map((cert, i) => (
              <img
                key={cert.alt}
                src={cert.src}
                alt={cert.alt}
                className="w-32 h-32 md:w-36 md:h-36 object-contain transition-opacity duration-700"
                style={{ opacity: isVisible ? 1 : 0, transitionDelay: `${i * 100}ms` }}
              />
            ))}
          </div>
          <p className="text-sm md:text-base text-gray-600 max-w-xl mx-auto">
            I have studied, practiced, and completed the AWS Development path, acquiring the Cloud
            Practitioner, AI Practitioner, Developer, and DevOps Engineer certifications.
          </p>
        </div>
      </div>
    </section>
  )
}
