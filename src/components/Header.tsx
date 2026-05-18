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
  return (
    <header className="bg-black text-white sticky top-0 z-50 h-28">
      <nav className="h-full">
        <ul
          className="grid h-full m-0 p-0 list-none"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
          {navLinks.map(({ label, href }, i) => (
            <li key={href} className="flex relative">
              {i > 0 && (
                <div className="absolute left-0 top-1/4 h-1/2 w-[2px] bg-white pointer-events-none" />
              )}
              <a
                href={href}
                className="flex-1 flex items-center justify-center font-bold text-lg text-white no-underline border-4 border-black hover:bg-white hover:text-black transition-colors duration-300"
              >
                {label}
              </a>
            </li>
          ))}
          {onExplore && (
            <li className="flex relative">
              <div className="absolute left-0 top-1/4 h-1/2 w-[2px] bg-white pointer-events-none" />
              <button
                onClick={onExplore}
                className="flex-1 flex items-center justify-center font-bold text-lg text-white border-4 border-black hover:bg-white hover:text-black transition-colors duration-300 bg-transparent cursor-pointer"
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
