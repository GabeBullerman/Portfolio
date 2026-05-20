import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { gsap } from 'gsap'

// ─── Simplex noise (Ian McEwan / Ashima Arts) ───────────────────────────────
const NOISE_GLSL = /* glsl */`
vec3 _mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 _mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 _permute(vec4 x) { return _mod289(((x*34.0)+1.0)*x); }
vec4 _taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = _mod289(i);
  vec4 p = _permute(_permute(_permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = _taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
`

const VERT = `#version 300 es
precision highp float;

${NOISE_GLSL}

uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform vec2 uResolution;
uniform float uSize;
uniform float uProgress;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec2 uMouse;

in vec3 position;
in vec3 aPositionTarget;
in float aSize;

out vec3 vColor;

void main() {
  float noiseOrigin = snoise(position * 0.2);
  float noiseTarget = snoise(aPositionTarget * 0.2);
  float noise = mix(noiseOrigin, noiseTarget, uProgress);
  noise = smoothstep(-1.0, 1.0, noise);

  float duration = 0.4;
  float delay = (1.0 - duration) * noise;
  float end = delay + duration;
  float progress = smoothstep(delay, end, uProgress);

  vec3 mixedPos = mix(position, aPositionTarget, progress);

  // mouse repulsion
  vec2 mouseOffset = mixedPos.xy - uMouse;
  float mouseDist = length(mouseOffset);
  if (mouseDist < 0.8) {
    float strength = (0.8 - mouseDist) / 0.8;
    mixedPos.xy += normalize(mouseOffset) * strength * 0.5;
  }

  vec4 mvPos = viewMatrix * modelMatrix * vec4(mixedPos, 1.0);
  gl_Position = projectionMatrix * mvPos;
  gl_PointSize = aSize * uSize * uResolution.y * (1.0 / -mvPos.z);

  vColor = mix(uColorA, uColorB, noise);
}
`

const FRAG = `#version 300 es
precision highp float;

in vec3 vColor;
out vec4 fragColor;

void main() {
  vec2 uv = gl_PointCoord;
  float dist = length(uv - 0.5);
  if (dist > 0.5) discard;
  float alpha = 0.05 / max(dist, 0.001) - 0.1;
  alpha = clamp(alpha, 0.0, 1.0);
  fragColor = vec4(vColor, alpha);
}
`

// ─── Helpers ─────────────────────────────────────────────────────────────────
function sampleGeo(geo: THREE.BufferGeometry, count: number): Float32Array {
  const pos = geo.attributes.position
  const out = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * pos.count)
    out[i * 3] = pos.getX(idx)
    out[i * 3 + 1] = pos.getY(idx)
    out[i * 3 + 2] = pos.getZ(idx)
  }
  geo.dispose()
  return out
}

function accentToColor(): THREE.Color {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()
  return new THREE.Color(v || '#7c3aed')
}

// ─── Component ───────────────────────────────────────────────────────────────
interface Props {
  sectionRefs?: React.RefObject<HTMLElement>[]
}

export default function ThreeBackground({ sectionRefs = [] }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // ── Renderer ──────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false })
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setClearColor(0x000000, 0)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 100)
    camera.position.set(0, 0, 8)

    // ── Stars ─────────────────────────────────────────────────────────────────
    const N_STARS = 12000
    const starPos = new Float32Array(N_STARS * 3)
    for (let i = 0; i < N_STARS; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 30 + Math.random() * 30
      starPos[i * 3]     = r * Math.sin(phi) * Math.cos(theta)
      starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      starPos[i * 3 + 2] = r * Math.cos(phi)
    }
    const starGeo = new THREE.BufferGeometry()
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.12, transparent: true, opacity: 0.9 })
    const stars = new THREE.Points(starGeo, starMat)
    scene.add(stars)

    // ── Particle morph ────────────────────────────────────────────────────────
    const N = 6000

    const cloud = new Float32Array(N * 3)
    for (let i = 0; i < N; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = Math.random() * 2.5
      cloud[i * 3]     = r * Math.sin(phi) * Math.cos(theta)
      cloud[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      cloud[i * 3 + 2] = r * Math.cos(phi)
    }

    const shapes: Float32Array[] = [
      cloud,
      sampleGeo(new THREE.SphereGeometry(2.5, 64, 64), N),
      sampleGeo(new THREE.TorusGeometry(2.2, 0.7, 40, 80), N),
      sampleGeo(new THREE.TorusKnotGeometry(1.6, 0.5, 200, 20), N),
      sampleGeo(new THREE.IcosahedronGeometry(2.5, 4), N),
    ]

    const sizes = new Float32Array(N)
    for (let i = 0; i < N; i++) sizes[i] = 0.3 + Math.random() * 0.7

    const uniforms = {
      uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      uSize:       { value: 0.6 },
      uProgress:   { value: 0 },
      uColorA:     { value: accentToColor() },
      uColorB:     { value: new THREE.Color(0xffffff) },
      uMouse:      { value: new THREE.Vector2(9999, 9999) },
    }

    const morphGeo = new THREE.BufferGeometry()
    morphGeo.setAttribute('position',        new THREE.BufferAttribute(shapes[0].slice(), 3))
    morphGeo.setAttribute('aPositionTarget', new THREE.BufferAttribute(shapes[1].slice(), 3))
    morphGeo.setAttribute('aSize',           new THREE.BufferAttribute(sizes, 1))

    const morphMat = new THREE.RawShaderMaterial({
      vertexShader:   VERT,
      fragmentShader: FRAG,
      uniforms,
      transparent:    true,
      blending:       THREE.AdditiveBlending,
      depthWrite:     false,
    })

    const morphMesh = new THREE.Points(morphGeo, morphMat)
    scene.add(morphMesh)

    let currentShape = 0
    let morphTween: gsap.core.Tween | null = null

    function morphTo(idx: number) {
      if (idx === currentShape) return
      const from = currentShape
      currentShape = idx
      uniforms.uColorA.value = accentToColor()
      morphGeo.setAttribute('position',        new THREE.BufferAttribute(shapes[from].slice(), 3))
      morphGeo.setAttribute('aPositionTarget', new THREE.BufferAttribute(shapes[idx].slice(), 3))
      uniforms.uProgress.value = 0
      morphTween?.kill()
      morphTween = gsap.to(uniforms.uProgress, { value: 1, duration: 2.5, ease: 'power2.inOut' })
    }

    // Auto-cycle shapes
    let autoCycle = 0
    const CYCLE_MS = 5000
    const initTimer = setTimeout(() => morphTo(1), 2500)

    // ── Section observers ─────────────────────────────────────────────────────
    const shapeMap = [1, 2, 3, 4, 4]
    const observers: IntersectionObserver[] = []
    sectionRefs.forEach((ref, i) => {
      if (!ref.current) return
      const obs = new IntersectionObserver(
        ([e]) => { if (e.isIntersecting) morphTo(shapeMap[i] ?? 1) },
        { threshold: 0.3 }
      )
      obs.observe(ref.current)
      observers.push(obs)
    })

    // ── Mouse ─────────────────────────────────────────────────────────────────
    function onMouse(e: MouseEvent) {
      const ndcX = (e.clientX / window.innerWidth) * 2 - 1
      const ndcY = -(e.clientY / window.innerHeight) * 2 + 1
      const halfH = Math.tan((35 * Math.PI) / 360) * 8
      uniforms.uMouse.value.set(ndcX * halfH * camera.aspect, ndcY * halfH)
    }
    window.addEventListener('mousemove', onMouse)

    // ── Resize ────────────────────────────────────────────────────────────────
    function onResize() {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
      uniforms.uResolution.value.set(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', onResize)

    // ── Loop ──────────────────────────────────────────────────────────────────
    let raf = 0
    let last = performance.now()

    function animate() {
      raf = requestAnimationFrame(animate)
      const now = performance.now()
      const dt = now - last
      last = now

      morphMesh.rotation.y += 0.0006
      morphMesh.rotation.x += 0.0002
      stars.rotation.y += 0.00006
      stars.rotation.x += 0.00002

      if (currentShape <= 1) {
        autoCycle += dt
        if (autoCycle > CYCLE_MS) {
          autoCycle = 0
          morphTo((currentShape + 1) % shapes.length)
        }
      }

      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(initTimer)
      morphTween?.kill()
      window.removeEventListener('mousemove', onMouse)
      window.removeEventListener('resize', onResize)
      observers.forEach(o => o.disconnect())
      starGeo.dispose()
      starMat.dispose()
      morphGeo.dispose()
      morphMat.dispose()
      renderer.dispose()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
        background: 'var(--bg, #0d0d1a)',
      }}
    />
  )
}
