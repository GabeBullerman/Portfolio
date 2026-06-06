type Props = {
  /** 0 → 1 load progress */
  progress?: number
  /** when true, the screen fades + scales away */
  fading?: boolean
  /** static pose with no spin/wave — used as the lazy-chunk Suspense fallback */
  staticPose?: boolean
}

const BAR_COUNT = 24

// Cuboid dimensions (px): L = radial length, W = tangential width, T = thickness.
const L = 50
const W = 16
const T = 14
const RADIUS = 96

// Six faces of a centred cuboid (box is L × W × T on X/Y/Z).
// `b` is a brightness percentage used to shade each face for a solid 3D read.
const FACES = [
  { w: L, h: W, t: `translateZ(${T / 2}px)`,                  b: 100 }, // top  (+Z)
  { w: L, h: W, t: `translateZ(${-T / 2}px) rotateY(180deg)`, b: 42  }, // bottom (−Z)
  { w: T, h: W, t: `translateX(${L / 2}px) rotateY(90deg)`,   b: 78  }, // outer end (+X)
  { w: T, h: W, t: `translateX(${-L / 2}px) rotateY(-90deg)`, b: 78  }, // inner end (−X)
  { w: L, h: T, t: `translateY(${-W / 2}px) rotateX(90deg)`,  b: 62  }, // side (−Y)
  { w: L, h: T, t: `translateY(${W / 2}px) rotateX(-90deg)`,  b: 62  }, // side (+Y)
]

/**
 * Full-screen loading overlay shown while the 3D world streams in its GLB
 * models, textures and shaders. A tilted, slowly-spinning ring of solid 3D
 * blocks radiates outward and runs a travelling up/down wave; a subtle red/cyan
 * chromatic split nods to anaglyph 3D.
 */
export default function LoadingScreen({ progress = 0, fading = false, staticPose = false }: Props) {
  const pct = Math.round(Math.min(1, Math.max(0, progress)) * 100)

  return (
    <div
      className={`ls-root fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black select-none${staticPose ? ' ls-static' : ''}`}
      style={{
        transition: 'opacity 0.7s ease, transform 0.7s ease',
        opacity: fading ? 0 : 1,
        transform: fading ? 'scale(1.08)' : 'scale(1)',
        pointerEvents: fading ? 'none' : 'auto',
      }}
    >
      <div className="ls-scene">
        <div className="ls-ring">
          {Array.from({ length: BAR_COUNT }).map((_, i) => (
            <div
              key={i}
              className="ls-bar"
              style={{ transform: `rotateZ(${(360 / BAR_COUNT) * i}deg) translateX(${RADIUS}px)` }}
            >
              <div
                className="ls-box"
                style={{ animationDelay: `${-(i / BAR_COUNT) * 1.7}s` }}
              >
                {FACES.map((f, j) => (
                  <span
                    key={j}
                    className="ls-face"
                    style={{
                      width: `${f.w}px`,
                      height: `${f.h}px`,
                      marginLeft: `${-f.w / 2}px`,
                      marginTop: `${-f.h / 2}px`,
                      transform: f.t,
                      background: `color-mix(in srgb, var(--accent, #61dafb) ${f.b}%, #060606)`,
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="ls-readout">
        {staticPose ? (
          <div className="ls-label">Loading…</div>
        ) : (
          <>
            <div className="ls-pct">{pct}%</div>
            <div className="ls-label">Building the world…</div>
            <div className="ls-track">
              <div className="ls-fill" style={{ width: `${pct}%` }} />
            </div>
          </>
        )}
      </div>

      <style>{`
        .ls-scene {
          perspective: 760px;
          width: 320px;
          height: 320px;
          display: flex;
          align-items: center;
          justify-content: center;
          filter:
            drop-shadow(2px 0 0 rgba(255, 40, 70, 0.5))
            drop-shadow(-2px 0 0 rgba(40, 220, 255, 0.5));
        }
        .ls-ring {
          position: relative;
          width: 0;
          height: 0;
          transform-style: preserve-3d;
          transform: rotateX(62deg) rotateZ(0deg);
          animation: lsSpin 9s linear infinite;
        }
        @keyframes lsSpin {
          to { transform: rotateX(62deg) rotateZ(360deg); }
        }
        .ls-bar {
          position: absolute;
          left: 0;
          top: 0;
          transform-style: preserve-3d;
        }
        /* Wave: tip the whole block up/down about its tangential axis. */
        .ls-box {
          position: absolute;
          transform-style: preserve-3d;
          animation: lsWave 1.7s ease-in-out infinite;
        }
        @keyframes lsWave {
          0%, 100% { transform: rotateY(-58deg); }
          50%      { transform: rotateY(20deg); }
        }
        .ls-face {
          position: absolute;
          left: 0;
          top: 0;
          border-radius: 2px;
          box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.25);
        }
        .ls-readout {
          margin-top: 30px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }
        .ls-pct {
          font: 700 34px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
          letter-spacing: 1px;
          color: #fff;
          text-shadow: 0 0 18px var(--accent-glow, rgba(97, 218, 251, 0.6));
        }
        .ls-label {
          font: 500 13px/1 system-ui, sans-serif;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.55);
        }
        .ls-track {
          margin-top: 4px;
          width: 220px;
          height: 3px;
          border-radius: 3px;
          background: rgba(255, 255, 255, 0.12);
          overflow: hidden;
        }
        .ls-fill {
          height: 100%;
          border-radius: 3px;
          background: var(--accent, #61dafb);
          box-shadow: 0 0 10px var(--accent-glow, rgba(97, 218, 251, 0.6));
          transition: width 0.3s ease;
        }
        /* Static fallback: even pose, ring keeps a calm spin (no per-block wave). */
        .ls-static .ls-box { animation: none; transform: rotateY(-18deg); }

        @media (prefers-reduced-motion: reduce) {
          .ls-ring { animation: none; }
          .ls-box  { animation: none; transform: rotateY(-20deg); }
        }
      `}</style>
    </div>
  )
}
