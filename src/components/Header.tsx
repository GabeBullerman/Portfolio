import { useState } from 'react'

const navLinks = [
  { label: 'Experience', href: '#experience' },
  { label: 'Projects', href: '#projects' },
  { label: 'About Me', href: '#me' },
  { label: 'Contact', href: '#contact' },
]

interface Props {
  onExplore?: () => void
}

export default function Header({ onExplore }: Props) {
  const cols = navLinks.length + (onExplore ? 1 : 0)
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <header
      className="sticky top-0 z-50 h-20"
      style={{
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <nav className="h-full">
        <ul
          className="grid h-full m-0 p-0 list-none"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
          {navLinks.map(({ label, href }, i) => (
            <li key={href} className="flex relative">
              {i > 0 && (
                <div
                  className="absolute left-0 top-1/4 h-1/2 w-px pointer-events-none"
                  style={{ background: 'rgba(255,255,255,0.12)' }}
                />
              )}
              <a
                href={href}
                onMouseEnter={() => setHovered(href)}
                onMouseLeave={() => setHovered(null)}
                className="flex-1 flex items-center justify-center font-bold text-base no-underline transition-all duration-300"
                style={{
                  color: hovered === href ? 'var(--accent)' : 'var(--text)',
                  background: hovered === href ? 'var(--accent-glow)' : 'transparent',
                }}
              >
                {label}
              </a>
            </li>
          ))}
          {onExplore && (
            <li className="flex relative">
              <div
                className="absolute left-0 top-1/4 h-1/2 w-px pointer-events-none"
                style={{ background: 'rgba(255,255,255,0.12)' }}
              />
              <button
                onClick={onExplore}
                onMouseEnter={() => setHovered('explore')}
                onMouseLeave={() => setHovered(null)}
                className="flex-1 flex items-center justify-center font-bold text-base transition-all duration-300 bg-transparent cursor-pointer border-none"
                style={{
                  color: hovered === 'explore' ? 'var(--accent)' : 'var(--text)',
                  background: hovered === 'explore' ? 'var(--accent-glow)' : 'transparent',
                }}
              >
                Explore
              </button>
            </li>
          )}
        </ul>
      </nav>
    </header>
  )
}
