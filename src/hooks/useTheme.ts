import { useEffect } from 'react'

type ThemePalette = {
  name: string
  bg: string
  bg2: string
  surface: string
  card: string
  cardHover: string
  border: string
  borderStrong: string
  accent: string
  accent2: string
  accentSoft: string
  accentGlow: string
  text: string
  textMuted: string
  textSubtle: string
  line: string
}

const PALETTES: ThemePalette[] = [
  {
    name: 'forest',
    bg: '#050b07',
    bg2: '#08150c',
    surface: 'rgba(8, 21, 12, 0.82)',
    card: 'rgba(255,255,255,0.05)',
    cardHover: 'rgba(34,197,94,0.12)',
    border: 'rgba(255,255,255,0.09)',
    borderStrong: 'rgba(34,197,94,0.48)',
    accent: '#22c55e',
    accent2: '#86efac',
    accentSoft: 'rgba(34,197,94,0.16)',
    accentGlow: 'rgba(34,197,94,0.34)',
    text: '#f0fdf4',
    textMuted: '#bbf7d0',
    textSubtle: '#86efac',
    line: 'rgba(34,197,94,0.45)',
  },

  {
    name: 'crimson',
    bg: '#100506',
    bg2: '#1a080b',
    surface: 'rgba(26,8,11,0.82)',
    card: 'rgba(255,255,255,0.05)',
    cardHover: 'rgba(239,68,68,0.12)',
    border: 'rgba(255,255,255,0.09)',
    borderStrong: 'rgba(239,68,68,0.48)',
    accent: '#ef4444',
    accent2: '#fca5a5',
    accentSoft: 'rgba(239,68,68,0.16)',
    accentGlow: 'rgba(239,68,68,0.34)',
    text: '#fff1f2',
    textMuted: '#fecdd3',
    textSubtle: '#fca5a5',
    line: 'rgba(239,68,68,0.45)',
  },

  {
    name: 'gold',
    bg: '#0f0a02',
    bg2: '#1a1204',
    surface: 'rgba(26,18,4,0.82)',
    card: 'rgba(255,255,255,0.05)',
    cardHover: 'rgba(245,158,11,0.12)',
    border: 'rgba(255,255,255,0.09)',
    borderStrong: 'rgba(245,158,11,0.5)',
    accent: '#f59e0b',
    accent2: '#fde68a',
    accentSoft: 'rgba(245,158,11,0.16)',
    accentGlow: 'rgba(245,158,11,0.34)',
    text: '#fffbeb',
    textMuted: '#fde68a',
    textSubtle: '#fcd34d',
    line: 'rgba(245,158,11,0.45)',
  },

  {
    name: 'violet',
    bg: '#090514',
    bg2: '#120a24',
    surface: 'rgba(18,10,36,0.82)',
    card: 'rgba(255,255,255,0.05)',
    cardHover: 'rgba(139,92,246,0.12)',
    border: 'rgba(255,255,255,0.09)',
    borderStrong: 'rgba(139,92,246,0.5)',
    accent: '#8b5cf6',
    accent2: '#c4b5fd',
    accentSoft: 'rgba(139,92,246,0.16)',
    accentGlow: 'rgba(139,92,246,0.34)',
    text: '#faf5ff',
    textMuted: '#ddd6fe',
    textSubtle: '#c4b5fd',
    line: 'rgba(139,92,246,0.45)',
  },
]

export function useTheme() {
  useEffect(() => {
    const palette =
      PALETTES[Math.floor(Math.random() * PALETTES.length)]

    const root = document.documentElement

    root.dataset.theme = palette.name

    root.style.setProperty('--bg', palette.bg)
    root.style.setProperty('--bg-2', palette.bg2)
    root.style.setProperty('--surface', palette.surface)
    root.style.setProperty('--card', palette.card)
    root.style.setProperty('--card-hover', palette.cardHover)
    root.style.setProperty('--bg-card', palette.card)
    root.style.setProperty('--border', palette.border)
    root.style.setProperty('--border-strong', palette.borderStrong)
    root.style.setProperty('--accent', palette.accent)
    root.style.setProperty('--accent-2', palette.accent2)
    root.style.setProperty('--accent-soft', palette.accentSoft)
    root.style.setProperty('--accent-glow', palette.accentGlow)
    root.style.setProperty('--text', palette.text)
    root.style.setProperty('--text-muted', palette.textMuted)
    root.style.setProperty('--text-subtle', palette.textSubtle)
    root.style.setProperty('--line', palette.line)

    document.body.style.backgroundColor = palette.bg
    document.body.style.color = palette.text

    return () => {
      document.body.style.backgroundColor = ''
      document.body.style.color = ''
    }
  }, [])
}