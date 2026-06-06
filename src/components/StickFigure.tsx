import { useEffect, useState } from 'react'

type Props = {
  /** Text the figure types out in its speech bubble. */
  message: string
  /** Delay before the figure slides in (ms). */
  delayMs?: number
  /** Arm-raised "waving" pose (vs. arm-down idle pose). */
  waving?: boolean
}

/**
 * Themed stick figure that slides in from the right edge and types a message.
 * Hidden on mobile. Used as the "hit Explore" hint on the 2D landing and the
 * "thanks for exploring" greeting on the cabin computer screen.
 */
export default function StickFigure({ message, delayMs = 1400, waving = false }: Props) {
  const [showFigure, setShowFigure] = useState(false)
  const [typedText, setTypedText]   = useState('')
  const [typingDone, setTypingDone] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setShowFigure(true), delayMs)
    return () => clearTimeout(t)
  }, [delayMs])

  useEffect(() => {
    if (!showFigure) return
    setTypedText('')
    setTypingDone(false)
    let i = 0
    const interval = setInterval(() => {
      setTypedText(message.slice(0, i + 1))
      i++
      if (i >= message.length) {
        clearInterval(interval)
        setTypingDone(true)
      }
    }, 35)
    return () => clearInterval(interval)
  }, [showFigure, message])

  return (
    <div
      className="hidden md:block fixed z-50 pointer-events-none select-none"
      style={{
        right: 0,
        top: 'clamp(170px, 40%, 72vh)',
        transform: showFigure
          ? 'translateY(-50%) translateX(18px) rotate(-38deg)'
          : 'translateY(-50%) translateX(130%) rotate(-38deg)',
        transformOrigin: 'right center',
        transition: 'transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      {/* Speech bubble */}
      <div
        style={{
          position: 'absolute',
          right: '82px',
          top: '10px',
          transform: 'rotate(38deg)',
          animation: showFigure ? 'figBob 2s ease-in-out infinite' : 'none',
          visibility: showFigure ? 'visible' : 'hidden',
        }}
      >
        <div
          className="relative rounded-2xl px-4 py-2 text-sm font-semibold whitespace-nowrap shadow-lg"
          style={{
            background: 'var(--surface)',
            border: '2px solid var(--accent)',
            color: 'var(--text)',
            boxShadow: '0 0 18px var(--accent-glow)',
          }}
        >
          {typedText}
          {!typingDone && <span className="animate-blink font-thin">|</span>}
          <span
            className="absolute right-[-10px] top-1/2 -translate-y-1/2 w-0 h-0"
            style={{
              borderTop: '8px solid transparent',
              borderBottom: '8px solid transparent',
              borderLeft: '10px solid var(--accent)',
            }}
          />
          <span
            className="absolute right-[-7px] top-1/2 -translate-y-1/2 w-0 h-0"
            style={{
              borderTop: '7px solid transparent',
              borderBottom: '7px solid transparent',
              borderLeft: '9px solid var(--surface)',
            }}
          />
        </div>
      </div>

      {/* SVG figure */}
      <svg
        width="90"
        height="220"
        viewBox="0 0 90 220"
        style={{
          animation: showFigure ? 'figBob 2s ease-in-out infinite' : 'none',
          display: 'block',
          overflow: 'visible',
          filter: 'drop-shadow(0 0 3px var(--accent-glow)) drop-shadow(0 0 2px var(--bg))',
        }}
      >
        {/* Head */}
        <circle cx="40" cy="24" r="18" fill="none" stroke="var(--accent)" strokeWidth="3.5" />
        {/* Eyes */}
        <circle cx="33" cy="22" r="2.2" fill="var(--accent)" />
        <circle cx="47" cy="22" r="2.2" fill="var(--accent)" />
        {/* Smile */}
        <path d="M33 31 Q40 38 47 31" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
        {/* Body */}
        <line x1="40" y1="42" x2="40" y2="115" stroke="var(--accent)" strokeWidth="3.5" strokeLinecap="round" />
        {/* Left arm */}
        <line x1="40" y1="65" x2="83" y2="10" stroke="var(--accent)" strokeWidth="3.5" strokeLinecap="round" />
        {/* Right arm — raised when waving, down when idle */}
        {waving ? (
          <line x1="40" y1="65" x2="2" y2="18" stroke="var(--accent)" strokeWidth="3.5" strokeLinecap="round" />
        ) : (
          <line x1="40" y1="65" x2="18" y2="108" stroke="var(--accent)" strokeWidth="3.5" strokeLinecap="round" />
        )}
        {/* Legs */}
        <line x1="40" y1="115" x2="28" y2="210" stroke="var(--accent)" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="40" y1="115" x2="54" y2="210" stroke="var(--accent)" strokeWidth="3.5" strokeLinecap="round" />
      </svg>
    </div>
  )
}
