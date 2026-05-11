const navLinks = [
  { label: 'Experience', href: '#experience' },
  { label: 'Projects', href: '#projects' },
  { label: 'About Me', href: '#me' },
  { label: 'Contact', href: '#contact' },
]

export default function Header() {
  return (
    <header className="bg-black text-white sticky top-0 z-50 h-28">
      <nav className="h-full">
        <ul
          className="grid h-full m-0 p-0 list-none"
          style={{ gridTemplateColumns: `repeat(${navLinks.length}, 1fr)` }}
        >
          {navLinks.map(({ label, href }) => (
            <li key={href} className="flex">
              <a
                href={href}
                className="flex-1 flex items-center justify-center font-bold text-lg text-white no-underline border-4 border-transparent hover:bg-white hover:text-black hover:border-black transition-colors duration-300"
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}
