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
      {/* Label — fades in at the same time as the h2 so neither is orphaned */}
      <p
        className="mb-3 text-sm font-semibold uppercase tracking-[0.3em]"
        style={{
          color: 'var(--accent)',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 0.55s ease, transform 0.55s ease',
        }}
      >
        {label}
      </p>

      {/* H2 — grid trick collapses container to 0 height when hidden,
          eliminating the blank space caused by overflow:hidden + translateY */}
      <div
        style={{
          display: 'grid',
          gridTemplateRows: visible ? '1fr' : '0fr',
          transition: 'grid-template-rows 0.55s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <div style={{ overflow: 'hidden', minHeight: 0 }}>
          <h2
            className="text-4xl md:text-5xl font-black"
            style={{
              color: 'var(--accent)',
              textShadow: '0 0 32px var(--accent-glow)',
              transform: visible ? 'translateY(0)' : 'translateY(100%)',
              transition: 'transform 0.65s cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            {title}
          </h2>
        </div>
      </div>

      {/* Section divider — draws in from centre */}
      <div
        className="section-divider"
        style={{
          transform: visible ? 'scaleX(1)' : 'scaleX(0)',
          transformOrigin: 'center',
          transition: 'transform 0.55s cubic-bezier(0.22, 1, 0.36, 1) 0.25s',
        }}
      />

      {/* Optional description */}
      {description && (
        <p
          className="mt-4 max-w-3xl mx-auto text-lg leading-relaxed"
          style={{
            color: 'var(--text-muted)',
            opacity: visible ? 1 : 0,
            transition: 'opacity 0.6s ease 0.35s',
          }}
        >
          {description}
        </p>
      )}
    </div>
  )
}
