export default function Footer() {
  return (
    <footer
      className="text-center py-8"
      style={{
        color: 'var(--text-muted)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(0,0,0,0.3)',
      }}
    >
      <p className="m-0">&copy; {new Date().getFullYear()} Gabriel Bullerman</p>
    </footer>
  )
}
