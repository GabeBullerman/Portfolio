import { useEffect, useRef, useState } from 'react'
import { useIntersectionObserver } from '../hooks/useIntersectionObserver'
import SectionHeading from './SectionHeading'

interface SectionProps {
  sectionRef?: React.RefObject<HTMLElement>
}

const cards = [
  {
    icon: '\u{1F3B9}',
    title: 'Hobbies',
    text: 'Self-teaching piano, rebuilding motorcycles, and studying film keep me grounded outside of work. I picked up music theory after inheriting a grand piano, spent a year modifying a Kawasaki sports bike from the ground up, and am steadily working through the IMDB Top 250 — Interstellar remains my favorite.',
  },
  {
    icon: '\u{1F30D}',
    title: 'Journeys',
    text: "I've visited 49 of 50 U.S. states and traveled extensively abroad — hiking and photographing Greece, exploring Italy's culinary and Renaissance arts, and immersing myself in Japan's culture and cities.",
  },
  {
    icon: '\u{1F5A5}️',
    title: 'Industry',
    text: "My relationship with computers started at age 8 and led to building over 40 custom desktops. A single conversation in high school shifted my focus entirely to software — and that pivot has defined my career ever since.",
  },
]

const slides = [
  { src: '/assets/imagesofmyself/IMG_1986.jpeg', caption: '' },
  { src: '/assets/imagesofmyself/IMG_3399.jpeg', caption: '' },
  { src: '/assets/imagesofmyself/399EA12F-89DB-4593-A201-84EA692B0A78.jpeg', caption: '' },
  { src: '/assets/imagesofmyself/IMG_0707.jpeg', caption: '' },
  { src: '/assets/imagesofmyself/IMG_3421.jpeg', caption: '' },
  { src: '/assets/imagesofmyself/IMG_3544.jpeg', caption: '' },
  { src: '/assets/imagesofmyself/IMG_1447.jpeg', caption: '' },
  { src: '/assets/imagesofmyself/IMG_1459.jpeg', caption: '' },
  { src: '/assets/imagesofmyself/IMG_0792.jpeg', caption: '' },
  { src: '/assets/imagesofmyself/IMG_0815.jpeg', caption: '' },
]

function Carousel() {
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const total = slides.length


  const go = (next: number) => {
    if (next === current) return
    setCurrent((next + total) % total)
  }

  useEffect(() => {
    if (total <= 1 || paused) return
    timerRef.current = setTimeout(() => go((current + 1) % total), 4500)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [current, paused, total])

  const getSlideState = (idx: number) => {
    const diff = idx - current
    const wrapped =
      diff > total / 2 ? diff - total :
      diff < -total / 2 ? diff + total : diff
    return wrapped // -2, -1, 0, 1, 2 ...
  }

  if (total === 0) return null

  return (
    <div
      className="mt-10 select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* 3D stage */}
      <div
        className="relative overflow-hidden rounded-3xl"
        style={{
          height: '600px',
          perspective: '1100px',
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          boxShadow: '0 0 60px var(--accent-glow)',
        }}
      >
        {/* Vignette overlay */}
        <div
          className="absolute inset-0 z-20 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.72) 100%)',
          }}
        />

        {/* Accent glow at bottom */}
        <div
          className="absolute bottom-0 left-0 right-0 h-32 z-20 pointer-events-none"
          style={{
            background:
              'linear-gradient(to top, var(--bg) 0%, transparent 100%)',
          }}
        />

        {slides.map((slide, idx) => {
          const pos = getSlideState(idx)
          const isCenter = pos === 0
          const isVisible = Math.abs(pos) <= 1

          const translateX = pos * 62
          const rotateY = pos * -40
          const scale = isCenter ? 1 : 0.72
          const opacity = isCenter ? 1 : 0.38
          const zIndex = isCenter ? 10 : 5 - Math.abs(pos)

          return (
            // Outer: fixed-size positioning stage — drives the 3D coverflow layout
            <div
              key={idx}
              onClick={() => !isCenter && go(idx)}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '68%',
                height: '90%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transformStyle: 'preserve-3d',
                transform: `translate(-50%, -50%) translateX(${translateX}%) rotateY(${rotateY}deg) scale(${scale})`,
                transition: 'transform 0.55s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.55s ease',
                opacity: isVisible ? opacity : 0,
                zIndex,
                cursor: isCenter ? 'default' : 'pointer',
              }}
            >
              <img
                src={slide.src}
                alt={slide.caption || `Photo ${idx + 1}`}
                style={{
                  display: 'block',
                  width: 'auto',
                  height: 'auto',
                  maxWidth: '100%',
                  maxHeight: '100%',
                  borderRadius: '1.25rem',
                  boxShadow: isCenter
                    ? '0 0 40px var(--accent-glow), 0 0 0 1.5px var(--border-strong), 0 30px 60px rgba(0,0,0,0.6)'
                    : '0 12px 30px rgba(0,0,0,0.5)',
                  pointerEvents: 'none',
                  filter: isCenter ? 'none' : 'brightness(0.55)',
                  transition: 'filter 0.55s ease, box-shadow 0.55s ease',
                }}
                draggable={false}
              />
            </div>
          )
        })}

        {/* Prev / Next */}
        {total > 1 && (
          <>
            <button
              onClick={() => go(current - 1)}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center rounded-full w-10 h-10"
              style={{
                background: 'rgba(0,0,0,0.5)',
                border: '1px solid var(--border-strong)',
                color: 'var(--accent)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              onClick={() => go(current + 1)}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center rounded-full w-10 h-10"
              style={{
                background: 'rgba(0,0,0,0.5)',
                border: '1px solid var(--border-strong)',
                color: 'var(--accent)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </>
        )}

        {/* Slide counter */}
        <div
          className="absolute bottom-4 right-5 z-30 text-xs font-mono tracking-widest"
          style={{ color: 'var(--text-subtle)' }}
        >
          {String(current + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </div>

        {/* Caption */}
        {slides[current].caption && (
          <div
            className="absolute bottom-4 left-5 z-30 text-sm font-semibold"
            style={{ color: 'var(--text-muted)' }}
          >
            {slides[current].caption}
          </div>
        )}
      </div>

      {/* Filmstrip thumbnails */}
      {total > 1 && (
        <div className="flex justify-center gap-2.5 mt-4 px-2">
          {slides.map((slide, idx) => (
            <button
              key={idx}
              onClick={() => go(idx)}
              style={{
                flexShrink: 0,
                width: idx === current ? '72px' : '48px',
                height: '42px',
                borderRadius: '8px',
                overflow: 'hidden',
                border: idx === current
                  ? '2px solid var(--accent)'
                  : '2px solid var(--border)',
                boxShadow: idx === current ? '0 0 10px var(--accent-glow)' : 'none',
                transition: 'width 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
                opacity: idx === current ? 1 : 0.5,
              }}
            >
              <img
                src={slide.src}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                draggable={false}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function MoreOnMe({ sectionRef }: SectionProps) {
  const [ref, isVisible] = useIntersectionObserver<HTMLDivElement>()

  return (
    <section id="more-on-me" ref={sectionRef} className="page-section">
      <div className="page-container">
        <SectionHeading label="Beyond development" title="More About Me" />

        <div
          ref={ref}
          className="transition-all duration-[1000ms]"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(24px)',
          }}
        >
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {cards.map(({ icon, title, text }) => (
              <div key={title} className="rounded-3xl p-8 glass-card">
                <div
                  className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
                  style={{ background: 'var(--accent-soft)', border: '1px solid var(--border-strong)' }}
                >
                  {icon}
                </div>
                <h3 className="mb-4 text-2xl font-black" style={{ color: 'var(--text)' }}>
                  {title}
                </h3>
                <p className="leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  {text}
                </p>
              </div>
            ))}
          </div>

          <Carousel />
        </div>
      </div>
    </section>
  )
}
