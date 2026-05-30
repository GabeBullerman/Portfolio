import { useIntersectionObserver } from '../hooks/useIntersectionObserver'

interface Props {
  label: string
  title: string
  description?: string
}

export default function SectionHeading({ label, title, description }: Props) {
  const [ref, visible] = useIntersectionObserver<HTMLDivElement>({ threshold: 0.4 })

  return (
    <div ref={ref} className="section-heading">
      {/* Label — fades + lifts in */}
      <p
        className="mb-3 text-sm font-semibold uppercase tracking-[0.3em]"
        style={{
          color: 'var(--accent)',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(10px)',
          transition: 'opacity 0.5s ease, transform 0.5s ease',
        }}
      >
        {label}
      </p>

      {/* H2 — slides up from behind a mask */}
      <div style={{ overflow: 'hidden', paddingBottom: '0.1em' }}>
        <h2
          className="text-4xl md:text-5xl font-black"
          style={{
            color: 'var(--accent)',
            textShadow: '0 0 32px var(--accent-glow)',
            transform: visible ? 'translateY(0)' : 'translateY(110%)',
            transition: 'transform 0.75s cubic-bezier(0.22, 1, 0.36, 1) 0.08s',
          }}
        >
          {title}
        </h2>
      </div>

      {/* Section divider — draws in from centre */}
      <div
        className="section-divider"
        style={{
          transform: visible ? 'scaleX(1)' : 'scaleX(0)',
          transformOrigin: 'center',
          transition: 'transform 0.55s cubic-bezier(0.22, 1, 0.36, 1) 0.28s',
        }}
      />

      {/* Optional description */}
      {description && (
        <p
          className="mt-4 max-w-3xl mx-auto text-lg leading-relaxed"
          style={{
            color: 'var(--text-muted)',
            opacity: visible ? 1 : 0,
            transition: 'opacity 0.6s ease 0.4s',
          }}
        >
          {description}
        </p>
      )}
    </div>
  )
}
