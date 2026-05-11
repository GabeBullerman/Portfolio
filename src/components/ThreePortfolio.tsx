import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { experienceData } from '../data/experience'
import { skillsData } from '../data/skills'
import { projectsData } from '../data/projects'

// ─── Seeded PRNG ───────────────────────────────────────────────────────────
function mulberry32(seed: number) {
  return () => {
    seed += 0x6d2b79f5
    let t = seed
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ─── GLSL ──────────────────────────────────────────────────────────────────
const NOISE_FN = /* glsl */`
float hash2(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float noise2(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash2(i), hash2(i + vec2(1.0, 0.0)), f.x),
    mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), f.x),
    f.y);
}
`

const GRASS_VERT = /* glsl */`
#include <fog_pars_vertex>
${NOISE_FN}
varying vec2 vXZ;
varying float vElev;
void main() {
  vXZ = position.xy;
  float n = noise2(position.xy * 0.07) * 0.45 + noise2(position.xy * 0.22) * 0.18;
  vElev = n;
  vec3 pos = position; pos.z += n;
  vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPos;
  #include <fog_vertex>
}
`

const GRASS_FRAG = /* glsl */`
#include <fog_pars_fragment>
${NOISE_FN}
varying vec2 vXZ;
varying float vElev;
uniform vec3 uSunDir;
void main() {
  float n1 = noise2(vXZ * 0.15);
  float n2 = noise2(vXZ * 0.42);
  float n3 = noise2(vXZ * 1.30);
  float m  = n1 * 0.50 + n2 * 0.30 + n3 * 0.20;
  vec3 darkG  = vec3(0.22, 0.41, 0.17);
  vec3 midG   = vec3(0.32, 0.55, 0.23);
  vec3 lightG = vec3(0.44, 0.68, 0.31);
  vec3 dryG   = vec3(0.50, 0.54, 0.24);
  vec3 col = mix(darkG, midG, m);
  col = mix(col, lightG, noise2(vXZ * 0.05) * 0.50);
  float dry = smoothstep(0.60, 0.80, noise2(vXZ * 0.10 + vec2(53.0, 17.0)));
  col = mix(col, dryG, dry * 0.45);
  col += vElev * 0.06;
  float NdotL = max(dot(vec3(0.0, 1.0, 0.0), uSunDir), 0.0);
  col = col * (0.45 + NdotL * 0.65);
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
  #include <fog_fragment>
}
`

// ─── Canvas sign texture ────────────────────────────────────────────────────
function makeSignTexture(label: string): THREE.CanvasTexture {
  const W = 1024, H = 512
  const cv = document.createElement('canvas')
  cv.width = W; cv.height = H
  const c = cv.getContext('2d')!

  // Plank rows
  const plankCols = ['#c89060', '#b87c4e', '#cc9668', '#b27248']
  const ph = H / plankCols.length
  plankCols.forEach((col, i) => {
    c.fillStyle = col; c.fillRect(0, i * ph, W, ph)
    c.fillStyle = '#5a2e10'; c.fillRect(0, (i + 1) * ph - 5, W, 10)
  })

  // Grain lines
  for (let i = 0; i < 28; i++) {
    const x = Math.random() * W, y = Math.random() * H
    c.strokeStyle = `rgba(0,0,0,${0.02 + Math.random() * 0.04})`
    c.lineWidth = 0.5 + Math.random() * 1.5
    c.beginPath(); c.moveTo(x, y)
    c.quadraticCurveTo(x + (Math.random() - 0.5) * 50, y + (Math.random() - 0.5) * 30,
                       x + (Math.random() - 0.5) * 30, y + Math.random() * 100)
    c.stroke()
  }

  // Outer border
  c.strokeStyle = '#5a2e10'; c.lineWidth = 22
  c.strokeRect(11, 11, W - 22, H - 22)
  c.strokeStyle = '#8a4c24'; c.lineWidth = 6
  c.strokeRect(26, 26, W - 52, H - 52)

  // Corner nails
  ;[[36, 36], [W - 36, 36], [36, H - 36], [W - 36, H - 36]].forEach(([nx, ny]) => {
    c.fillStyle = '#777'; c.beginPath(); c.arc(nx, ny, 9, 0, Math.PI * 2); c.fill()
    c.fillStyle = '#bbb'; c.beginPath(); c.arc(nx - 2, ny - 2, 3, 0, Math.PI * 2); c.fill()
  })

  // Header band
  c.fillStyle = 'rgba(50,22,6,0.50)'; c.fillRect(30, 30, W - 60, 138)

  // Label
  const fontSize = label.length > 9 ? 68 : 82
  c.fillStyle = '#fff5e0'
  c.font = `bold ${fontSize}px Georgia, serif`
  c.textAlign = 'center'; c.textBaseline = 'middle'
  c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowOffsetX = 3; c.shadowOffsetY = 3; c.shadowBlur = 8
  c.fillText(label, W / 2, 99)
  c.shadowColor = 'transparent'

  // Divider + diamonds
  c.strokeStyle = '#7a4024'; c.lineWidth = 3
  c.beginPath(); c.moveTo(44, 174); c.lineTo(W - 44, 174); c.stroke()
  ;[W / 2 - 130, W / 2, W / 2 + 130].forEach(dx => {
    c.save(); c.translate(dx, 174); c.rotate(Math.PI / 4)
    c.fillStyle = '#7a4024'; c.fillRect(-8, -8, 16, 16)
    c.fillStyle = '#c49060'; c.fillRect(-3, -3, 6, 6)
    c.restore()
  })

  // Interact hint
  c.fillStyle = 'rgba(255,240,200,0.70)'
  c.font = '34px Georgia, serif'
  c.textAlign = 'center'; c.textBaseline = 'middle'
  c.fillText('[ E ]  Inspect', W / 2, 385)
  c.strokeStyle = 'rgba(200,155,70,0.35)'; c.lineWidth = 1
  c.beginPath(); c.moveTo(W / 2 - 110, 414); c.lineTo(W / 2 + 110, 414); c.stroke()

  return new THREE.CanvasTexture(cv)
}

// ─── Types & section data ───────────────────────────────────────────────────
type SectionId = 'about' | 'experience' | 'skills' | 'projects' | 'certifications' | 'moreonme' | 'contact'

interface SectionCfg { id: SectionId; label: string; wx: number; wz: number }

const SECTIONS: SectionCfg[] = [
  { id: 'about',          label: 'About Me',       wx:  0, wz:   2 },
  { id: 'experience',     label: 'Experience',     wx:  5, wz: -12 },
  { id: 'skills',         label: 'Skills',         wx: -5, wz: -24 },
  { id: 'projects',       label: 'Projects',       wx:  5, wz: -36 },
  { id: 'certifications', label: 'Certs',          wx: -5, wz: -48 },
  { id: 'moreonme',       label: 'More on Me',     wx:  5, wz: -60 },
  { id: 'contact',        label: 'Contact',        wx:  0, wz: -70 },
]

const PROX = 6.0

// ─── Overlay content ────────────────────────────────────────────────────────
function SectionOverlay({ id, onClose }: { id: SectionId; onClose: () => void }) {
  const label = SECTIONS.find(s => s.id === id)?.label ?? ''
  return (
    <div className="absolute right-4 top-1/2 -translate-y-1/2 w-80 max-h-[78vh] bg-white text-black rounded-2xl shadow-2xl flex flex-col overflow-hidden">
      <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-3 flex justify-between items-center z-10">
        <h2 className="font-bold text-base">{label}</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-black text-xl leading-none">&times;</button>
      </div>
      <div className="px-5 py-4 overflow-y-auto">
        <Content id={id} />
      </div>
    </div>
  )
}

function Content({ id }: { id: SectionId }) {
  if (id === 'about') return (
    <div>
      <p className="font-bold text-sm mb-1">Gabriel John Bullerman</p>
      <p className="text-xs text-gray-500 mb-3">CS · Iowa State University</p>
      <p className="text-xs text-gray-700 leading-relaxed">Undergraduate CS major interested in full-stack development, mobile apps, and webapps.</p>
      <div className="flex gap-2 mt-4 flex-wrap">
        {[['GitHub','https://github.com/GabeBullerman'],['LinkedIn','https://www.linkedin.com/in/gabe-bullerman/']].map(([l,h])=>(
          <a key={l} href={h} target="_blank" rel="noopener noreferrer" className="text-xs px-3 py-1 border-2 border-black rounded-full font-bold hover:bg-black hover:text-white transition-colors">{l}</a>
        ))}
      </div>
    </div>
  )
  if (id === 'experience') return (
    <div className="space-y-4">
      {experienceData.map(e => (
        <div key={e.company}>
          <p className="font-bold text-xs">{e.title}</p>
          <p className="text-xs text-gray-500 mb-1">{e.company} · {e.period}</p>
          <ul className="text-xs list-disc pl-4 space-y-1 text-gray-700 leading-relaxed">
            {e.bullets.map((b,i)=><li key={i}>{b}</li>)}
          </ul>
        </div>
      ))}
    </div>
  )
  if (id === 'skills') return (
    <div className="space-y-3">
      {skillsData.map(cat=>(
        <div key={cat.category}>
          <p className="font-bold text-xs mb-1">{cat.category}</p>
          <p className="text-xs text-gray-600 leading-relaxed">{cat.skills.map(s=>s.name).join(', ')}</p>
        </div>
      ))}
    </div>
  )
  if (id === 'projects') return (
    <div className="space-y-4">
      {projectsData.map(p=>(
        <div key={p.title} className="pb-3 border-b border-gray-100 last:border-none last:pb-0">
          <a href={p.link} target="_blank" rel="noopener noreferrer" className="font-bold text-xs hover:underline block">{p.title}</a>
          <p className="text-xs text-gray-500 mb-1">{p.subtitle}</p>
          <p className="text-xs text-gray-700 leading-relaxed">{p.description}</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {p.tags.map(t=><span key={t} className="text-xs border border-gray-300 rounded-full px-2 py-0.5 text-gray-500">{t}</span>)}
          </div>
        </div>
      ))}
    </div>
  )
  if (id === 'certifications') return (
    <div className="text-center">
      <p className="text-xs text-gray-500 mb-3">AWS Certification Path</p>
      <div className="grid grid-cols-2 gap-3">
        {[['cloudPractitionerAWS','Cloud Practitioner'],['aiPractitionerAWS','AI Practitioner'],['developerAWS','Developer'],['devopsEngineerAWS','DevOps Engineer']].map(([f,l])=>(
          <div key={l} className="flex flex-col items-center">
            <img src={`/images/${f}.png`} alt={l} className="w-16 h-16 object-contain" />
            <p className="text-xs text-gray-600 mt-1">{l}</p>
          </div>
        ))}
      </div>
    </div>
  )
  if (id === 'moreonme') return (
    <div className="space-y-4">
      {[['Hobbies','Piano, Kawasaki sports bike restoration, film (IMDB top 250 — Interstellar #1).'],['Journeys',"49/50 US states. Greece, Italy, Japan — chasing contrasts in culture and landscape."],['Industry',"Built 40+ computers since age 8. A high school question flipped the switch from hardware to software."]].map(([t,p])=>(
        <div key={t}><p className="font-bold text-xs uppercase tracking-wide mb-1">{t}</p><p className="text-xs text-gray-700 leading-relaxed">{p}</p></div>
      ))}
    </div>
  )
  return (
    <div className="space-y-3">
      {[['fa-brands fa-linkedin','LinkedIn','https://www.linkedin.com/in/gabe-bullerman/'],['fa-solid fa-envelope','gabebullerman1@gmail.com','mailto:gabebullerman1@gmail.com']].map(([icon,label,href])=>(
        <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-xs hover:underline">
          <i className={icon} />{label}
        </a>
      ))}
      <div className="flex items-center gap-3 text-xs"><i className="fa-solid fa-phone" />319-230-0474</div>
    </div>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────
export default function ThreePortfolio({ onExit }: { onExit: () => void }) {
  const mountRef = useRef<HTMLDivElement>(null)
  const [activeSection, setActiveSection] = useState<SectionId | null>(null)
  const [nearSign, setNearSign] = useState(false)

  // Camera focus refs — readable outside useEffect for overlay close handler
  const focusPosRef  = useRef(new THREE.Vector3())
  const focusLookRef = useRef(new THREE.Vector3())
  const focusActiveRef = useRef(false)   // true = camera heading to / at sign
  const overlayShownRef = useRef(false)  // true = overlay is showing
  const proxTimerRef = useRef(0)
  const currentSecRef = useRef<SectionId | null>(null)

  function exitFocus() {
    focusActiveRef.current = false
    overlayShownRef.current = false
    proxTimerRef.current = 0
    setActiveSection(null)
    setNearSign(false)
  }

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const W = mount.clientWidth, H = mount.clientHeight

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x87ceeb)
    scene.fog = new THREE.FogExp2(0x87ceeb, 0.012)

    // Camera
    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 200)
    camera.position.set(0, 20, 20)

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    mount.appendChild(renderer.domElement)

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.55))
    const sun = new THREE.DirectionalLight(0xfff4e0, 1.1)
    sun.position.set(20, 40, 15)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    sun.shadow.camera.left = -80; sun.shadow.camera.right = 80
    sun.shadow.camera.top  =  80; sun.shadow.camera.bottom = -80
    sun.shadow.camera.far  = 160
    scene.add(sun)
    const sunDir = new THREE.Vector3(20, 40, 15).normalize()

    // ── Grass ground (shader) ──────────────────────────────────────────────
    const grassMat = new THREE.ShaderMaterial({
      uniforms: {
        ...THREE.UniformsLib.fog,
        uSunDir: { value: sunDir },
      },
      vertexShader: GRASS_VERT,
      fragmentShader: GRASS_FRAG,
      fog: true,
    })
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(180, 180, 120, 120), grassMat)
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = false
    scene.add(ground)

    // ── Fog dome cylinder ──────────────────────────────────────────────────
    const dome = new THREE.Mesh(
      new THREE.CylinderGeometry(80, 80, 60, 48, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x87ceeb, side: THREE.BackSide, transparent: true, opacity: 0.90, depthWrite: false }),
    )
    dome.position.y = 15
    scene.add(dome)

    // Ground rim (dark ring at map edge for a "cliff" feel → now a soft grass ring)
    const rim = new THREE.Mesh(
      new THREE.RingGeometry(72, 82, 48),
      new THREE.MeshLambertMaterial({ color: 0x3a6030, side: THREE.DoubleSide }),
    )
    rim.rotation.x = -Math.PI / 2
    rim.position.y = -0.3
    scene.add(rim)

    // ── Brick path ────────────────────────────────────────────────────────
    const TILE = 1.4
    const tileGeo = new THREE.BoxGeometry(TILE, 0.14, TILE)
    const brickA = new THREE.MeshLambertMaterial({ color: 0xb5613a })
    const brickB = new THREE.MeshLambertMaterial({ color: 0xc97a52 })
    let row = 0
    for (let z = 8; z > -78; z -= TILE) {
      for (let xi = -1; xi <= 1; xi++) {
        const t = new THREE.Mesh(tileGeo, (row + xi) % 2 === 0 ? brickA : brickB)
        t.position.set(xi * TILE, 0.07, z)
        t.receiveShadow = true
        scene.add(t)
      }
      row++
    }

    // Branch paths
    const branchGeo = new THREE.BoxGeometry(3.0, 0.14, TILE)
    SECTIONS.forEach(({ wx, wz }) => {
      if (wx === 0) return
      const b = new THREE.Mesh(branchGeo, brickA)
      b.position.set(wx > 0 ? 3.5 : -3.5, 0.07, wz)
      b.receiveShadow = true
      scene.add(b)
    })

    // ── Trees ─────────────────────────────────────────────────────────────
    const postMat = new THREE.MeshLambertMaterial({ color: 0x7a4f2d })

    function addTree(x: number, z: number, sc: number) {
      const g = new THREE.Group()
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18 * sc, 0.26 * sc, 1.8 * sc, 7), postMat,
      )
      trunk.position.y = 0.9 * sc; trunk.castShadow = true; g.add(trunk)
      ;([{ r:1.8,h:2.4,y:1.8,c:0x2d6b29 },{ r:1.3,h:2.0,y:3.0,c:0x357a30 },{ r:0.8,h:1.5,y:4.1,c:0x3d8a37 }] as const)
        .forEach(({ r,h,y,c }) => {
          const cone = new THREE.Mesh(
            new THREE.ConeGeometry(r * sc, h * sc, 7),
            new THREE.MeshLambertMaterial({ color: c }),
          )
          cone.position.y = y * sc; cone.castShadow = true; g.add(cone)
        })
      g.position.set(x, 0, z)
      scene.add(g)
    }

    const rng = mulberry32(42)
    for (let i = 0; i < 155; i++) {
      const x = (rng() - 0.5) * 130, z = rng() * 100 - 82
      if (Math.abs(x) < 3.5 && z > -78 && z < 9) continue
      if (Math.hypot(x, z) > 74) continue
      if (SECTIONS.some(s => Math.hypot(x - s.wx, z - s.wz) < 5.5)) continue
      addTree(x, z, 0.7 + rng() * 0.65)
    }

    // ── Sign posts ────────────────────────────────────────────────────────
    SECTIONS.forEach(({ label, wx, wz }) => {
      // Clearing
      const clear = new THREE.Mesh(new THREE.CircleGeometry(4, 20), new THREE.MeshLambertMaterial({ color: 0x5a9c5a }))
      clear.rotation.x = -Math.PI / 2; clear.position.set(wx, 0.01, wz); scene.add(clear)

      // Post
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.15, 3.2, 7), postMat)
      post.position.set(wx, 1.6, wz); post.castShadow = true; scene.add(post)

      // Sign board with canvas texture (faces +Z → camera reads from worldZ + 7)
      const tex = makeSignTexture(label)
      const sign = new THREE.Mesh(
        new THREE.BoxGeometry(5.0, 2.5, 0.22),
        new THREE.MeshLambertMaterial({ map: tex }),
      )
      sign.position.set(wx, 3.8, wz); sign.castShadow = true; scene.add(sign)

      // Small bracket
      const brk = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.35), new THREE.MeshLambertMaterial({ color: 0x888888 }))
      brk.position.set(wx, 3.2, wz + 0.05); scene.add(brk)
    })

    // ── Player ────────────────────────────────────────────────────────────
    const player = new THREE.Group()
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.1, 10), new THREE.MeshLambertMaterial({ color: 0x2563eb }))
    body.position.y = 0.55; body.castShadow = true; player.add(body)
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 10), new THREE.MeshLambertMaterial({ color: 0xfcd34d }))
    head.position.y = 1.38; head.castShadow = true; player.add(head)
    player.position.set(0, 0, 6)
    scene.add(player)

    // ── Input ─────────────────────────────────────────────────────────────
    const keys = new Set<string>()

    function triggerFocus(id: SectionId) {
      const s = SECTIONS.find(sec => sec.id === id)!
      focusPosRef.current.set(s.wx, 3.8, s.wz + 7.2)
      focusLookRef.current.set(s.wx, 3.8, s.wz)
      focusActiveRef.current = true
      overlayShownRef.current = false
      proxTimerRef.current = 0
    }

    const onKeyDown = (e: KeyboardEvent) => {
      keys.add(e.key.toLowerCase())
      if (e.key === 'ArrowUp')    keys.add('w')
      if (e.key === 'ArrowDown')  keys.add('s')
      if (e.key === 'ArrowLeft')  keys.add('a')
      if (e.key === 'ArrowRight') keys.add('d')

      if (e.key.toLowerCase() === 'e' && !focusActiveRef.current && currentSecRef.current) {
        triggerFocus(currentSecRef.current)
      }
      if (e.key === 'Escape' && (focusActiveRef.current || overlayShownRef.current)) {
        exitFocus()
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      keys.delete(e.key.toLowerCase())
      if (e.key === 'ArrowUp')    keys.delete('w')
      if (e.key === 'ArrowDown')  keys.delete('s')
      if (e.key === 'ArrowLeft')  keys.delete('a')
      if (e.key === 'ArrowRight') keys.delete('d')
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    // ── Animation ─────────────────────────────────────────────────────────
    const clock = new THREE.Clock()
    const CAM_OFFSET = new THREE.Vector3(0, 20, 14)
    const _tmpCam = camera.clone()
    let animId: number

    function animate() {
      animId = requestAnimationFrame(animate)
      const delta = Math.min(clock.getDelta(), 0.05)

      if (!focusActiveRef.current) {
        // Player movement
        const vel = new THREE.Vector3()
        if (keys.has('w')) vel.z -= 1
        if (keys.has('s')) vel.z += 1
        if (keys.has('a')) vel.x -= 1
        if (keys.has('d')) vel.x += 1
        if (vel.lengthSq() > 0) {
          vel.normalize().multiplyScalar(6 * delta)
          player.position.add(vel)
          player.rotation.y = Math.atan2(vel.x, vel.z)
        }
        player.position.x = THREE.MathUtils.clamp(player.position.x, -24, 24)
        player.position.z = THREE.MathUtils.clamp(player.position.z, -76, 8)

        // Follow camera
        camera.position.lerp(player.position.clone().add(CAM_OFFSET), 0.07)
        _tmpCam.position.copy(camera.position); _tmpCam.lookAt(player.position)
        camera.quaternion.slerp(_tmpCam.quaternion, 0.07)

        // Proximity
        let nearest: SectionId | null = null, nearDist = PROX
        SECTIONS.forEach(({ id, wx, wz }) => {
          const d = Math.hypot(player.position.x - wx, player.position.z - wz)
          if (d < nearDist) { nearDist = d; nearest = id }
        })

        if (nearest !== currentSecRef.current) {
          currentSecRef.current = nearest
          setNearSign(nearest !== null)
          if (!nearest) proxTimerRef.current = 0
        }

        if (nearest) {
          proxTimerRef.current += delta
          if (proxTimerRef.current > 2.2) triggerFocus(nearest)
        }
      } else {
        // Cinematic: lerp camera toward sign
        camera.position.lerp(focusPosRef.current, 0.028)
        _tmpCam.position.copy(camera.position); _tmpCam.lookAt(focusLookRef.current)
        camera.quaternion.slerp(_tmpCam.quaternion, 0.04)

        // Once arrived, show overlay
        if (!overlayShownRef.current && camera.position.distanceTo(focusPosRef.current) < 0.6) {
          overlayShownRef.current = true
          setActiveSection(currentSecRef.current)
        }
      }

      renderer.render(scene, camera)
    }
    animate()

    const onResize = () => {
      const w = mount.clientWidth, h = mount.clientHeight
      camera.aspect = w / h; camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <div ref={mountRef} className="w-full h-full" />

      <button
        onClick={onExit}
        className="absolute top-4 left-4 z-10 px-4 py-2 bg-black/75 backdrop-blur-sm text-white border border-white/30 rounded-full font-bold text-sm hover:bg-white hover:text-black transition-colors duration-300"
      >
        ← 2D View
      </button>

      {/* Near-sign prompt */}
      {nearSign && !activeSection && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 text-white text-xs bg-black/60 backdrop-blur-sm px-5 py-2 rounded-full pointer-events-none animate-pulse">
          Press <kbd className="font-bold">E</kbd> to inspect · or stand still for 2s
        </div>
      )}

      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white text-xs bg-black/50 backdrop-blur-sm px-5 py-2 rounded-full pointer-events-none">
        WASD · Arrow Keys &nbsp;·&nbsp; <kbd className="font-bold">E</kbd> inspect &nbsp;·&nbsp; <kbd className="font-bold">Esc</kbd> exit
      </div>

      {activeSection && (
        <SectionOverlay
          id={activeSection}
          onClose={exitFocus}
        />
      )}
    </div>
  )
}
