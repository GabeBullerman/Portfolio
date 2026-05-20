import { useEffect, useState } from 'react'

export default function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 200)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!visible) return null

  return (
    <a
      href="#about-me"
      className="fixed bottom-5 right-5 z-50 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 hover:opacity-80"
      aria-label="Back to top"
      style={{
        background: 'var(--accent)',
        color: 'var(--text)',
        boxShadow: '0 0 16px var(--accent)',
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L3 13h6v9h6v-9h6L12 2z" />
      </svg>
    </a>
  )
}
