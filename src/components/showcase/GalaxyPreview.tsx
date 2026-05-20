import { Canvas, ThreeEvent, useFrame } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

const galaxyParameters = {
  count: 30000,
  size: 0.012,
  radius: 5,
  branches: 4,
  spin: 1.2,
  randomnessPower: 2.3,
}

function getCssVariable(name: string, fallback: string) {
  if (typeof window === 'undefined') return fallback

  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim()

  return value || fallback
}

function GalaxyParticles() {
  const pointsRef = useRef<THREE.Points>(null)
  const [hovered, setHovered] = useState(false)
  const [themeVersion, setThemeVersion] = useState(0)

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setThemeVersion((current) => current + 1)
    })

    return () => cancelAnimationFrame(raf)
  }, [])

  const { positions, colors } = useMemo(() => {
    const positionsArray = new Float32Array(galaxyParameters.count * 3)
    const colorsArray = new Float32Array(galaxyParameters.count * 3)

    const accent = getCssVariable('--accent', '#8b5cf6')
    const accent2 = getCssVariable('--accent-2', '#c4b5fd')

    const colorInside = new THREE.Color(accent2)
    const colorOutside = new THREE.Color(accent)

    for (let i = 0; i < galaxyParameters.count; i++) {
      const i3 = i * 3
      const radius = Math.random() * galaxyParameters.radius
      const spinAngle = radius * galaxyParameters.spin
      const branchAngle =
        ((i % galaxyParameters.branches) / galaxyParameters.branches) *
        Math.PI *
        2

      const randomX =
        Math.pow(Math.random(), galaxyParameters.randomnessPower) *
        (Math.random() < 0.5 ? 1 : -1)

      const randomY =
        Math.pow(Math.random(), galaxyParameters.randomnessPower) *
        (Math.random() < 0.5 ? 1 : -1) *
        0.35

      const randomZ =
        Math.pow(Math.random(), galaxyParameters.randomnessPower) *
        (Math.random() < 0.5 ? 1 : -1)

      positionsArray[i3] =
        Math.cos(branchAngle + spinAngle) * radius + randomX

      positionsArray[i3 + 1] = randomY

      positionsArray[i3 + 2] =
        Math.sin(branchAngle + spinAngle) * radius + randomZ

      const mixedColor = colorInside.clone()
      mixedColor.lerp(colorOutside, radius / galaxyParameters.radius)

      colorsArray[i3] = mixedColor.r
      colorsArray[i3 + 1] = mixedColor.g
      colorsArray[i3 + 2] = mixedColor.b
    }

    return {
      positions: positionsArray,
      colors: colorsArray,
    }
  }, [themeVersion])

  useFrame((state) => {
    if (!pointsRef.current) return

    const speed = hovered ? 0.22 : 0.1

    pointsRef.current.rotation.y =
      state.clock.elapsedTime * speed * galaxyParameters.spin

    pointsRef.current.scale.setScalar(hovered ? 1.04 : 1)
  })

  const handlePointerOver = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    setHovered(true)
  }

  const handlePointerOut = () => {
    setHovered(false)
  }

  return (
    <points
      ref={pointsRef}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />

        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>

      <pointsMaterial
        size={galaxyParameters.size}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexColors
        transparent
      />
    </points>
  )
}

export default function GalaxyPreview() {
  return (
    <div
      className="group relative overflow-hidden rounded-3xl"
      style={{
        background:
          'linear-gradient(180deg, var(--surface), rgba(0,0,0,0.58))',
        border: '1px solid var(--border)',
        boxShadow: '0 0 50px var(--accent-glow)',
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at top, var(--accent-glow), transparent 58%)',
        }}
      />

      <div className="relative p-8 md:p-10 min-h-[620px] flex flex-col">
        <div className="mb-8">
          <p
            className="text-sm uppercase tracking-[0.3em] mb-4 font-semibold"
            style={{
              color: 'var(--accent)',
            }}
          >
            WebGL Particle Playground
          </p>

          <h3
            className="text-3xl font-black mb-5 leading-tight"
            style={{
              color: 'var(--text)',
            }}
          >
            Click and drag to orbit the procedural galaxy.
          </h3>

          <p
            className="leading-relaxed text-lg"
            style={{
              color: 'var(--text-muted)',
            }}
          >
            Adapted from the standalone galaxy playground: colored particle
            branches, additive blending, orbit controls, zoom, and real-time
            rotation in a contained portfolio preview.
          </p>
        </div>

        <div
          className="relative h-[520px] overflow-hidden rounded-3xl cursor-grab active:cursor-grabbing"
          style={{
            border: '1px solid var(--border)',
            background:
              'radial-gradient(circle at center, var(--accent-soft), transparent 45%), linear-gradient(180deg, #05070a, #020617)',
            boxShadow: 'inset 0 0 45px rgba(0,0,0,0.55)',
          }}
        >
          <Canvas
            camera={{
              position: [0, 3.2, 7],
              fov: 62,
            }}
            dpr={[1, 1.75]}
          >
            <color attach="background" args={['#020617']} />

            <Stars
              radius={90}
              depth={45}
              count={1000}
              factor={3}
              saturation={0}
              fade
              speed={0.35}
            />

            <GalaxyParticles />

            <OrbitControls
  target={[0, 0, 0]}
  enableDamping
  dampingFactor={0.06}
  rotateSpeed={0.7}
  zoomSpeed={0.7}
  minDistance={5}
  maxDistance={18}
/>
          </Canvas>

          <div
            className="pointer-events-none absolute left-5 top-5 rounded-full px-4 py-2 text-xs"
            style={{
              background: 'rgba(0,0,0,0.42)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              backdropFilter: 'blur(10px)',
            }}
          >
            Drag to orbit • Scroll to zoom
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-8">
          {[
            'Three.js',
            'Particles',
            'Orbit Controls',
            'Additive Blending',
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