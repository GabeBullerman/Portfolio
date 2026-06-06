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
    name: 'rose',
    bg: '#0f0509',
    bg2: '#1a0812',
    surface: 'rgba(26,8,18,0.82)',
    card: 'rgba(255,255,255,0.05)',
    cardHover: 'rgba(236,72,153,0.12)',
    border: 'rgba(255,255,255,0.09)',
    borderStrong: 'rgba(236,72,153,0.48)',
    accent: '#ec4899',
    accent2: '#f9a8d4',
    accentSoft: 'rgba(236,72,153,0.16)',
    accentGlow: 'rgba(236,72,153,0.34)',
    text: '#fdf2f8',
    textMuted: '#fbcfe8',
    textSubtle: '#f9a8d4',
    line: 'rgba(236,72,153,0.45)',
  },

  {
    name: 'azure',
    bg: '#030a14',
    bg2: '#071220',
    surface: 'rgba(7,18,32,0.82)',
    card: 'rgba(255,255,255,0.05)',
    cardHover: 'rgba(59,130,246,0.12)',
    border: 'rgba(255,255,255,0.09)',
    borderStrong: 'rgba(59,130,246,0.48)',
    accent: '#3b82f6',
    accent2: '#93c5fd',
    accentSoft: 'rgba(59,130,246,0.16)',
    accentGlow: 'rgba(59,130,246,0.34)',
    text: '#eff6ff',
    textMuted: '#bfdbfe',
    textSubtle: '#93c5fd',
    line: 'rgba(59,130,246,0.45)',
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
    name: 'emerald',
    bg: '#030a06',
    bg2: '#05110a',
    surface: 'rgba(5,17,10,0.82)',
    card: 'rgba(255,255,255,0.05)',
    cardHover: 'rgba(16,185,129,0.10)',
    border: 'rgba(255,255,255,0.09)',
    borderStrong: 'rgba(16,185,129,0.40)',
    accent: '#10b981',
    accent2: '#6ee7b7',
    accentSoft: 'rgba(16,185,129,0.12)',
    accentGlow: 'rgba(16,185,129,0.24)',
    text: '#f0fdf6',
    textMuted: '#a7f3d0',
    textSubtle: '#6ee7b7',
    line: 'rgba(16,185,129,0.38)',
  },

  {
    name: 'silver',
    bg: '#080a0d',
    bg2: '#0f1215',
    surface: 'rgba(15,18,21,0.82)',
    card: 'rgba(255,255,255,0.05)',
    cardHover: 'rgba(226,232,240,0.10)',
    border: 'rgba(255,255,255,0.09)',
    borderStrong: 'rgba(226,232,240,0.45)',
    accent: '#e2e8f0',
    accent2: '#cbd5e1',
    accentSoft: 'rgba(226,232,240,0.12)',
    accentGlow: 'rgba(226,232,240,0.22)',
    text: '#f8fafc',
    textMuted: '#cbd5e1',
    textSubtle: '#94a3b8',
    line: 'rgba(226,232,240,0.35)',
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

function updateFavicon(palette: ThemePalette) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${palette.accent}"/>` +
    `<stop offset="1" stop-color="${palette.accent2}"/></linearGradient></defs>` +
    `<rect width="64" height="64" rx="14" fill="#0d1117"/>` +
    `<rect x="2.5" y="2.5" width="59" height="59" rx="12" fill="none" stroke="url(#g)" stroke-width="2.5"/>` +
    `<text x="32" y="44" font-family="system-ui,-apple-system,sans-serif" font-size="38" ` +
    `font-weight="800" text-anchor="middle" fill="url(#g)">GB</text></svg>`
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  link.type = 'image/svg+xml'
  link.href = 'data:image/svg+xml,' + encodeURIComponent(svg)
}

function applyPalette(palette: ThemePalette) {
  const root = document.documentElement
  root.dataset.theme = palette.name
  updateFavicon(palette)
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
}

export function setTheme(name: string) {
  const palette = PALETTES.find(p => p.name === name)
  if (!palette) return
  localStorage.setItem('theme', name)
  applyPalette(palette)
  window.dispatchEvent(new CustomEvent('theme-change', { detail: palette }))
}

export { PALETTES }

// Random palette chosen once per page load, shared across every useTheme()
// instance so the theme picker's highlighted dot always matches the applied
// theme (each hook call would otherwise roll its own random palette).
let sessionRandom: ThemePalette | null = null

export function useTheme(onApplied?: (name: string) => void) {
  useEffect(() => {
    const last = localStorage.getItem('theme')
    const saved = PALETTES.find(p => p.name === last)
    // Random every load unless user explicitly saved a preference
    if (!saved && !sessionRandom) {
      sessionRandom = PALETTES[Math.floor(Math.random() * PALETTES.length)]
    }
    const palette = saved ?? sessionRandom!
    applyPalette(palette)
    window.dispatchEvent(new CustomEvent('theme-change', { detail: palette }))
    onApplied?.(palette.name)

    return () => {
      document.body.style.backgroundColor = ''
      document.body.style.color = ''
    }
  }, [])
}