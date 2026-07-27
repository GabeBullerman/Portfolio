import {
  Canvas,
  ThreeEvent,
  useFrame,
  useThree,
} from '@react-three/fiber'

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import * as THREE from 'three'
import { useCanvasStrategy } from '../../hooks/useCanvasStrategy'

function MobilePoster({ label }: { label: string }) {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center text-center px-6">
      <span className="text-4xl mb-4 opacity-40" style={{ color: 'var(--accent)' }}>✧</span>
      <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-subtle)' }}>
        {label}
      </p>
      <p className="mt-2 text-base" style={{ color: 'var(--text-muted)' }}>
        Best viewed on desktop
      </p>
    </div>
  )
}

type DragState = {
  object: THREE.Mesh | null
  lastX: number
  lastY: number
}

type SceneColors = { muted: string; subtle: string; accent2: string }

function ScrollScene({ progress, sceneColors }: { progress: number; sceneColors: SceneColors }) {
  const groupRef = useRef<THREE.Group>(null)
  const torusRef = useRef<THREE.Mesh>(null)
  const coneRef = useRef<THREE.Mesh>(null)
  const knotRef = useRef<THREE.Mesh>(null)

  const dragState = useRef<DragState>({
    object: null,
    lastX: 0,
    lastY: 0,
  })

  const { camera } = useThree()

  const particles = useMemo(() => {
    const count = 500
    const positions = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
      const i3 = i * 3

      positions[i3] = (Math.random() - 0.5) * 9
      positions[i3 + 1] = 2.2 - Math.random() * 9
      positions[i3 + 2] = (Math.random() - 0.5) * 6
    }

    return positions
  }, [])

  useFrame((state, delta) => {
    camera.position.y = THREE.MathUtils.lerp(
      camera.position.y,
      -progress * 8,
      0.08
    )

    camera.position.x = THREE.MathUtils.lerp(
      camera.position.x,
      state.pointer.x * 0.45,
      0.04
    )

    camera.position.z = THREE.MathUtils.lerp(
      camera.position.z,
      6 + progress * 0.75,
      0.04
    )

    camera.lookAt(0, camera.position.y, 0)

    const meshes = [torusRef.current, coneRef.current, knotRef.current]

    meshes.forEach((mesh, index) => {
      if (!mesh) return
      if (dragState.current.object === mesh) return

      mesh.rotation.x += delta * (0.25 + index * 0.05)
      mesh.rotation.y += delta * (0.35 + index * 0.06)
    })

    if (groupRef.current) {
      groupRef.current.rotation.y =
        Math.sin(state.clock.elapsedTime * 0.25) * 0.08
    }
  })

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()

    const mesh = event.object as THREE.Mesh

    dragState.current = {
      object: mesh,
      lastX: event.clientX,
      lastY: event.clientY,
    }

    const target = event.target as Element | null
    target?.setPointerCapture?.(event.pointerId)
  }

  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
    const dragged = dragState.current.object
    if (!dragged) return

    event.stopPropagation()

    const deltaX = event.clientX - dragState.current.lastX
    const deltaY = event.clientY - dragState.current.lastY

    dragged.rotation.y += deltaX * 0.012
    dragged.rotation.x += deltaY * 0.012

    dragState.current.lastX = event.clientX
    dragState.current.lastY = event.clientY
  }

  const handlePointerUp = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()

    dragState.current.object = null

    const target = event.target as Element | null

    if (target?.hasPointerCapture?.(event.pointerId)) {
      target.releasePointerCapture(event.pointerId)
    }
  }

  const meshHandlers = (_name: string) => ({
    onPointerOver: (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation()
      document.body.style.cursor = 'grab'
    },

    onPointerOut: () => {
      document.body.style.cursor = 'default'
    },

    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
  })

  return (
    <>
      <ambientLight intensity={0.7} />

      <directionalLight position={[3, 4, 4]} intensity={2.4} />

      <pointLight
        position={[-4, -2, 5]}
        intensity={1.8}
        color={sceneColors.accent2}
      />

      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[particles, 3]}
          />
        </bufferGeometry>

        <pointsMaterial
          color={sceneColors.subtle}
          size={0.035}
          sizeAttenuation
          transparent
          opacity={0.75}
        />
      </points>

      <group ref={groupRef}>
        <mesh
          ref={torusRef}
          position={[2, 0, 0]}
          {...meshHandlers('Portfolio')}
        >
          <torusGeometry args={[1, 0.38, 18, 70]} />
          <meshToonMaterial color={sceneColors.muted} />
        </mesh>

        <mesh
          ref={coneRef}
          position={[-2, -4, 0]}
          {...meshHandlers('Projects')}
        >
          <coneGeometry args={[1, 2, 40]} />
          <meshToonMaterial color={sceneColors.subtle} />
        </mesh>

        <mesh
          ref={knotRef}
          position={[2, -8, 0]}
          {...meshHandlers('Contact')}
        >
          <torusKnotGeometry args={[0.82, 0.32, 120, 18]} />
          <meshToonMaterial color={sceneColors.accent2} />
        </mesh>
      </group>
    </>
  )
}

function getCssVar(name: string, fallback: string) {
  if (typeof window === 'undefined') return fallback
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

export default function ScrollMotionPanel() {
  const [progress, setProgress] = useState(0)
  const [sceneColors, setSceneColors] = useState<SceneColors>(() => ({
    muted: getCssVar('--text-muted', '#cbd5e1'),
    subtle: getCssVar('--text-subtle', '#94a3b8'),
    accent2: getCssVar('--accent-2', '#cbd5e1'),
  }))
  const scrollBoxRef = useRef<HTMLDivElement>(null)
  const { renderCanvas, frameloop, dpr } = useCanvasStrategy(scrollBoxRef)

  useEffect(() => {
    const onThemeChange = (e: Event) => {
      const p = (e as CustomEvent).detail
      setSceneColors({ muted: p.textMuted, subtle: p.textSubtle, accent2: p.accent2 })
    }
    window.addEventListener('theme-change', onThemeChange)
    return () => window.removeEventListener('theme-change', onThemeChange)
  }, [])

  const progressPercent = Math.round(progress * 100)

  useEffect(() => {
    setProgress(0)

    if (scrollBoxRef.current) {
      scrollBoxRef.current.scrollTop = 0
    }
  }, [])

  useEffect(() => {
    const el = scrollBoxRef.current

    if (!el) return

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      event.stopPropagation()

      setProgress((current) => {
        const next = current + event.deltaY * 0.0012
        return Math.min(1, Math.max(0, next))
      })
    }

    el.addEventListener('wheel', handleWheel, {
      passive: false,
    })

    return () => {
      el.removeEventListener('wheel', handleWheel)
    }
  }, [])

  return (
    <div
      className="relative overflow-hidden rounded-3xl"
      style={{
        background:
          'linear-gradient(180deg, var(--surface), rgba(0,0,0,0.55))',
        border: '1px solid var(--border)',
        boxShadow: '0 0 50px var(--accent-glow)',
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at top, var(--accent-glow), transparent 55%)',
        }}
      />

      <div className="relative p-8 md:p-10">
        <div className="mb-7">
          <p
            className="text-sm uppercase tracking-[0.3em] mb-4 font-semibold"
            style={{ color: 'var(--accent)' }}
          >
            Scroll Animation System
          </p>

          <h3
            className="text-3xl font-black mb-5 leading-tight"
            style={{ color: 'var(--text)' }}
          >
            Scroll inside the scene to move through 3D sections.
          </h3>

          <p
            className="leading-relaxed text-lg"
            style={{ color: 'var(--text-muted)' }}
          >
            Localized scene scrolling, draggable 3D objects, and parallax camera
            motion.
          </p>
        </div>

        <div
          ref={scrollBoxRef}
          className="relative h-[260px] md:h-[520px] overflow-hidden rounded-3xl"
          style={{
            border: '1px solid var(--border)',
            background: 'linear-gradient(180deg, #111, #05070a)',
          }}
        >
          {renderCanvas ? (
            <Canvas camera={{ position: [0, 0, 6], fov: 35 }} dpr={dpr} frameloop={frameloop}>
              <color attach="background" args={['#05070a']} />
              <ScrollScene progress={progress} sceneColors={sceneColors} />
            </Canvas>
          ) : (
            <MobilePoster label="Scroll Animation System" />
          )}

          <div className="absolute left-5 top-5 flex flex-wrap gap-2">
            <div
              className="rounded-full px-4 py-2 text-xs"
              style={{
                background: 'rgba(0,0,0,0.4)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                backdropFilter: 'blur(10px)',
              }}
            >
              Wheel inside card: {progressPercent}%
            </div>

            <div
              className="rounded-full px-4 py-2 text-xs"
              style={{
                background: 'rgba(0,0,0,0.4)',
                color: 'var(--text-muted)',
                border: '1px solid var(--border)',
                backdropFilter: 'blur(10px)',
              }}
            >
              Hover + drag shapes
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-8">
          {[
            'Three.js',
            'R3F',
            'Local Scroll',
            'Raycasting',
            'Parallax',
          ].map((tag) => (
            <span
              key={tag}
              className="px-4 py-2 rounded-full text-sm"
              style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                color: 'var(--text-muted)',
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}