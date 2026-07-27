import { useEffect, useState } from 'react'

/**
 * Governs whether an in-page WebGL canvas should render at all, and — when it
 * does — whether it should be running or paused based on scroll position.
 *
 * Mobile viewports skip the canvas entirely (renderCanvas === false). Mobile
 * browsers have a very small system-wide WebGL context budget shared across
 * every tab; leaving heavy canvases mounted mid-page reliably crashes the tab
 * once a few other tabs are open. Fall back to a static poster on mobile.
 *
 * On desktop the canvas mounts, but frameloop drops from "always" to "demand"
 * when the wrapper scrolls out of view, so an idle demo doesn't burn GPU.
 *
 * @param wrapperRef  Ref to the DOM node containing the canvas — observed for
 *                    visibility. The caller can reuse an existing ref.
 */
export function useCanvasStrategy(wrapperRef: React.RefObject<HTMLElement | null>) {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768,
  )
  const [visible, setVisible] = useState(true)

  // Track the viewport-width breakpoint so a browser resize live-updates.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(max-width: 767px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  // Pause the frameloop when the canvas is scrolled out of view (desktop only).
  useEffect(() => {
    if (isMobile) return
    const el = wrapperRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.05 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [isMobile, wrapperRef])

  return {
    /** true on desktop; false on mobile viewports (render a poster instead) */
    renderCanvas: !isMobile,
    /** pass to Canvas: 'always' when in view, 'demand' when off-screen */
    frameloop: visible ? ('always' as const) : ('demand' as const),
    /** cap dpr — belt & suspenders since mobile skips entirely anyway */
    dpr: [1, 1.75] as [number, number],
    /** true when the tab-viewport is narrow enough to be mobile-y */
    isMobile,
  }
}
