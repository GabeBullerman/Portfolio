// ─── Helpers ────────────────────────────────────────────────────────────────
export function mulberry32(seed: number) {
  return () => {
    seed += 0x6d2b79f5
    let t = seed
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Shortest-path angle interpolation — avoids 350°→10° spinning the long way
export function lerpAngle(from: number, to: number, t: number): number {
  const twoPi = Math.PI * 2
  const delta = ((to - from) % twoPi + twoPi * 1.5) % twoPi - Math.PI
  return from + delta * t
}
