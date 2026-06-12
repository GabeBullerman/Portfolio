import { useState } from 'react'

// Ordered to match the vertical section order of the 2D site (TwoDApp):
// Experience → Skills → Projects → MoreOnMe (About Me) → Contact.
const navLinks = [
  { label: 'Experience', href: '#experience' },
  { label: 'Skills', href: '#skills' },
  { label: 'Projects', href: '#projects' },
  { label: 'About Me', href: '#more-on-me' },
  { label: 'Contact', href: '#contact' },
]

interface Props {
  onExplore?: () => void
  /** Override nav order (e.g. to match a page's section order). */
  links?: { label: string; href: string }[]
}

export default function Header({ onExplore, links = navLinks }: Props) {
  const cols = links.length + (onExplore ? 1 : 0)
  const [hovered, setHovered] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  const closeMenu = () => setMenuOpen(false)

  return (
    <header
      className="sticky top-0 z-50 h-16 md:h-20"
      style={{
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Desktop nav */}
      <nav className="hidden md:block h-full">
        <ul
          className="grid h-full m-0 p-0 list-none"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
          {links.map(({ label, href }, i) => (
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

      {/* Mobile nav bar */}
      <div className="flex md:hidden h-full items-center justify-between px-5">
        <span className="font-bold text-base" style={{ color: 'var(--text)' }}>Portfolio</span>
        <button
          onClick={() => setMenuOpen(o => !o)}
          className="flex flex-col gap-1.5 p-2 rounded-lg transition-colors"
          style={{ background: menuOpen ? 'rgba(255,255,255,0.08)' : 'transparent', border: 'none', cursor: 'pointer' }}
          aria-label="Toggle menu"
        >
          <span className="block w-5 h-0.5 rounded-full transition-all duration-200" style={{ background: 'var(--text)', transform: menuOpen ? 'translateY(8px) rotate(45deg)' : 'none' }} />
          <span className="block w-5 h-0.5 rounded-full transition-all duration-200" style={{ background: 'var(--text)', opacity: menuOpen ? 0 : 1 }} />
          <span className="block w-5 h-0.5 rounded-full transition-all duration-200" style={{ background: 'var(--text)', transform: menuOpen ? 'translateY(-8px) rotate(-45deg)' : 'none' }} />
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div
          className="md:hidden absolute top-16 left-0 right-0 z-50 py-2"
          style={{
            background: 'rgba(0,0,0,0.92)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {links.map(({ label, href }) => (
            <a
              key={href}
              href={href}
              onClick={closeMenu}
              className="flex items-center px-6 py-3.5 font-semibold text-sm no-underline transition-colors"
              style={{ color: 'var(--text)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
            >
              {label}
            </a>
          ))}
          {onExplore && (
            <button
              onClick={() => { closeMenu(); onExplore() }}
              className="w-full flex items-center px-6 py-3.5 font-semibold text-sm bg-transparent border-none cursor-pointer transition-colors"
              style={{ color: 'var(--accent)' }}
            >
              Explore 3D World →
            </button>
          )}
        </div>
      )}
    </header>
  )
}
