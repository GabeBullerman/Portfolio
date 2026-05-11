import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { experienceData } from '../data/experience'
import { skillsData } from '../data/skills'
import { projectsData } from '../data/projects'

// Seeded PRNG for deterministic tree placement
function mulberry32(seed: number) {
  return () => {
    seed += 0x6d2b79f5
    let t = seed
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type SectionId = 'about' | 'experience' | 'skills' | 'projects' | 'certifications' | 'moreonme' | 'contact'

interface SectionConfig {
  id: SectionId
  label: string
  worldX: number
  worldZ: number
}

const SECTIONS: SectionConfig[] = [
  { id: 'about',          label: 'About Me',       worldX:  0, worldZ:   2 },
  { id: 'experience',     label: 'Experience',     worldX:  5, worldZ: -12 },
  { id: 'skills',         label: 'Skills',         worldX: -5, worldZ: -24 },
  { id: 'projects',       label: 'Projects',       worldX:  5, worldZ: -36 },
  { id: 'certifications', label: 'Certifications', worldX: -5, worldZ: -48 },
  { id: 'moreonme',       label: 'More on Me',     worldX:  5, worldZ: -60 },
  { id: 'contact',        label: 'Contact',        worldX:  0, worldZ: -70 },
]

const PROXIMITY = 5.5

// ─── Section overlay content ───────────────────────────────────────────────

function getSectionContent(id: SectionId): React.ReactNode {
  switch (id) {
    case 'about':
      return (
        <div>
          <p className="font-bold text-base mb-1">Gabriel John Bullerman</p>
          <p className="text-gray-500 text-xs mb-3">Computer Science · Iowa State University</p>
          <p className="text-sm leading-relaxed text-gray-700">
            Undergraduate CS major interested in full-stack development, mobile apps, and webapps.
          </p>
          <div className="flex gap-3 mt-4 flex-wrap">
            <a href="https://github.com/GabeBullerman" target="_blank" rel="noopener noreferrer"
               className="text-xs px-3 py-1 border-2 border-black rounded-full font-bold hover:bg-black hover:text-white transition-colors">
              GitHub
            </a>
            <a href="https://www.linkedin.com/in/gabe-bullerman/" target="_blank" rel="noopener noreferrer"
               className="text-xs px-3 py-1 border-2 border-black rounded-full font-bold hover:bg-black hover:text-white transition-colors">
              LinkedIn
            </a>
          </div>
        </div>
      )
    case 'experience':
      return (
        <div className="space-y-5">
          {experienceData.map(item => (
            <div key={item.company}>
              <p className="font-bold text-sm">{item.title}</p>
              <p className="text-xs text-gray-500 mb-2">{item.company} · {item.period}</p>
              <ul className="text-xs list-disc pl-4 space-y-1 text-gray-700 leading-relaxed">
                {item.bullets.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )
    case 'skills':
      return (
        <div className="space-y-3">
          {skillsData.map(cat => (
            <div key={cat.category}>
              <p className="font-bold text-xs text-black mb-1">{cat.category}</p>
              <p className="text-xs text-gray-600 leading-relaxed">{cat.skills.map(s => s.name).join(', ')}</p>
            </div>
          ))}
        </div>
      )
    case 'projects':
      return (
        <div className="space-y-4">
          {projectsData.map(p => (
            <div key={p.title} className="pb-3 border-b border-gray-100 last:border-none last:pb-0">
              <a href={p.link} target="_blank" rel="noopener noreferrer"
                 className="font-bold text-sm hover:underline block">
                {p.title}
              </a>
              <p className="text-xs text-gray-500 mb-1">{p.subtitle}</p>
              <p className="text-xs text-gray-700 leading-relaxed">{p.description}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {p.tags.map(t => (
                  <span key={t} className="text-xs border border-gray-300 rounded-full px-2 py-0.5 text-gray-500">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )
    case 'certifications':
      return (
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-4">AWS Certification Path</p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { src: '/images/cloudPractitionerAWS.png',  alt: 'Cloud Practitioner' },
              { src: '/images/aiPractitionerAWS.png',     alt: 'AI Practitioner' },
              { src: '/images/developerAWS.png',          alt: 'Developer' },
              { src: '/images/devopsEngineerAWS.png',     alt: 'DevOps Engineer' },
            ].map(c => (
              <div key={c.alt} className="flex flex-col items-center">
                <img src={c.src} alt={c.alt} className="w-20 h-20 object-contain" />
                <p className="text-xs text-gray-600 mt-1">{c.alt}</p>
              </div>
            ))}
          </div>
        </div>
      )
    case 'moreonme':
      return (
        <div className="space-y-4 text-sm leading-relaxed">
          <div>
            <p className="font-bold text-black mb-1 text-xs uppercase tracking-wide">Hobbies</p>
            <p className="text-xs text-gray-700">Piano, Kawasaki sports bike restoration, film (IMDB top 250 — Interstellar is #1).</p>
          </div>
          <div>
            <p className="font-bold text-black mb-1 text-xs uppercase tracking-wide">Journeys</p>
            <p className="text-xs text-gray-700">49/50 US states. Greece, Italy, Japan — chasing stark contrasts in culture and landscape.</p>
          </div>
          <div>
            <p className="font-bold text-black mb-1 text-xs uppercase tracking-wide">Industry</p>
            <p className="text-xs text-gray-700">Built 40+ desktop computers since age 8. A high school conversation flipped the switch from hardware to software.</p>
          </div>
        </div>
      )
    case 'contact':
      return (
        <div className="space-y-3">
          <a href="https://www.linkedin.com/in/gabe-bullerman/" target="_blank" rel="noopener noreferrer"
             className="flex items-center gap-3 text-sm hover:underline">
            <i className="fa-brands fa-linkedin text-lg" />
            LinkedIn
          </a>
          <a href="mailto:gabebullerman1@gmail.com"
             className="flex items-center gap-3 text-sm hover:underline">
            <i className="fa-solid fa-envelope text-lg" />
            gabebullerman1@gmail.com
          </a>
          <div className="flex items-center gap-3 text-sm">
            <i className="fa-solid fa-phone text-lg" />
            319-230-0474
          </div>
        </div>
      )
  }
}

function SectionOverlay({ sectionId, onClose }: { sectionId: SectionId; onClose: () => void }) {
  const section = SECTIONS.find(s => s.id === sectionId)
  return (
    <div className="absolute right-4 top-1/2 -translate-y-1/2 w-88 max-w-sm max-h-[75vh] overflow-y-auto bg-white text-black rounded-2xl shadow-2xl flex flex-col">
      <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-3 flex justify-between items-center rounded-t-2xl z-10">
        <h2 className="text-base font-bold">{section?.label}</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-black text-xl leading-none w-6 h-6 flex items-center justify-center">
          &times;
        </button>
      </div>
      <div className="px-5 py-4 overflow-y-auto">
        {getSectionContent(sectionId)}
      </div>
    </div>
  )
}

// ─── Main Three.js component ───────────────────────────────────────────────

export default function ThreePortfolio({ onExit }: { onExit: () => void }) {
  const mountRef = useRef<HTMLDivElement>(null)
  const [activeSection, setActiveSection] = useState<SectionId | null>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const W = mount.clientWidth
    const H = mount.clientHeight

    // ── Scene ──
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x87ceeb)
    scene.fog = new THREE.Fog(0x87ceeb, 40, 95)

    // ── Camera ──
    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 200)

    // ── Renderer ──
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    mount.appendChild(renderer.domElement)

    // ── Lights ──
    scene.add(new THREE.AmbientLight(0xffffff, 0.55))
    const sun = new THREE.DirectionalLight(0xfff4e0, 1.1)
    sun.position.set(20, 40, 15)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    sun.shadow.camera.left   = -80
    sun.shadow.camera.right  =  80
    sun.shadow.camera.top    =  80
    sun.shadow.camera.bottom = -80
    sun.shadow.camera.far    = 160
    scene.add(sun)

    // ── Ground ──
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(160, 160),
      new THREE.MeshLambertMaterial({ color: 0x4a7c4e }),
    )
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    scene.add(ground)

    // ── Brick path (main) ──
    const TILE = 1.4
    const tileGeo = new THREE.BoxGeometry(TILE, 0.14, TILE)
    const brickA = new THREE.MeshLambertMaterial({ color: 0xb5613a })
    const brickB = new THREE.MeshLambertMaterial({ color: 0xc97a52 })
    let row = 0
    for (let z = 8; z > -78; z -= TILE) {
      for (let xi = -1; xi <= 1; xi++) {
        const tile = new THREE.Mesh(tileGeo, (row + xi) % 2 === 0 ? brickA : brickB)
        tile.position.set(xi * TILE, 0.07, z)
        tile.receiveShadow = true
        scene.add(tile)
      }
      row++
    }

    // ── Branch paths to section markers ──
    const branchGeo = new THREE.BoxGeometry(3.0, 0.14, TILE)
    SECTIONS.forEach(({ worldX, worldZ }) => {
      if (worldX === 0) return
      const branch = new THREE.Mesh(branchGeo, brickA)
      branch.position.set(worldX > 0 ? 3.5 : -3.5, 0.07, worldZ)
      branch.receiveShadow = true
      scene.add(branch)
    })

    // ── Trees ──
    function addTree(x: number, z: number, scale: number) {
      const g = new THREE.Group()
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18 * scale, 0.26 * scale, 1.8 * scale, 7),
        new THREE.MeshLambertMaterial({ color: 0x7a4f2d }),
      )
      trunk.position.y = 0.9 * scale
      trunk.castShadow = true
      g.add(trunk)
      ;([
        { r: 1.8, h: 2.4, y: 1.8, c: 0x2d6b29 },
        { r: 1.3, h: 2.0, y: 3.0, c: 0x357a30 },
        { r: 0.8, h: 1.5, y: 4.1, c: 0x3d8a37 },
      ] as const).forEach(({ r, h, y, c }) => {
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry(r * scale, h * scale, 7),
          new THREE.MeshLambertMaterial({ color: c }),
        )
        cone.position.y = y * scale
        cone.castShadow = true
        g.add(cone)
      })
      g.position.set(x, 0, z)
      scene.add(g)
    }

    const rng = mulberry32(42)
    for (let i = 0; i < 150; i++) {
      const x = (rng() - 0.5) * 110
      const z = rng() * 95 - 80
      // Skip path corridor
      if (Math.abs(x) < 3.5 && z > -78 && z < 9) continue
      // Skip section clearings
      if (SECTIONS.some(s => Math.hypot(x - s.worldX, z - s.worldZ) < 5.5)) continue
      addTree(x, z, 0.7 + rng() * 0.65)
    }

    // ── Section markers (sign posts) ──
    SECTIONS.forEach(({ worldX, worldZ }) => {
      // Cleared grass circle
      const clear = new THREE.Mesh(
        new THREE.CircleGeometry(3.5, 16),
        new THREE.MeshLambertMaterial({ color: 0x5a9c5a }),
      )
      clear.rotation.x = -Math.PI / 2
      clear.position.set(worldX, 0.01, worldZ)
      scene.add(clear)

      // Post
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.11, 2.4, 7),
        new THREE.MeshLambertMaterial({ color: 0x7a4f2d }),
      )
      post.position.set(worldX, 1.2, worldZ)
      post.castShadow = true
      scene.add(post)

      // Sign board
      const sign = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 0.75, 0.12),
        new THREE.MeshLambertMaterial({ color: 0xf5e6c8 }),
      )
      sign.position.set(worldX, 2.55, worldZ)
      sign.castShadow = true
      scene.add(sign)
    })

    // ── Player ──
    const player = new THREE.Group()
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.32, 1.1, 10),
      new THREE.MeshLambertMaterial({ color: 0x2563eb }),
    )
    body.position.y = 0.55
    body.castShadow = true
    player.add(body)
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 10, 10),
      new THREE.MeshLambertMaterial({ color: 0xfcd34d }),
    )
    head.position.y = 1.38
    head.castShadow = true
    player.add(head)
    player.position.set(0, 0, 6)
    scene.add(player)

    // Initial camera
    camera.position.set(0, 20, 20)
    camera.lookAt(player.position)

    // ── Input ──
    const keys = new Set<string>()
    const onKeyDown = (e: KeyboardEvent) => {
      keys.add(e.key.toLowerCase())
      if (e.key === 'ArrowUp')    keys.add('w')
      if (e.key === 'ArrowDown')  keys.add('s')
      if (e.key === 'ArrowLeft')  keys.add('a')
      if (e.key === 'ArrowRight') keys.add('d')
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

    // ── Animation loop ──
    const clock = new THREE.Clock()
    const CAM_OFFSET = new THREE.Vector3(0, 20, 14)
    let currentSection: SectionId | null = null
    let animId: number

    function animate() {
      animId = requestAnimationFrame(animate)
      const delta = Math.min(clock.getDelta(), 0.05)

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

      // Smooth camera follow
      camera.position.lerp(player.position.clone().add(CAM_OFFSET), 0.07)
      camera.lookAt(player.position)

      // Proximity check
      let nearest: SectionId | null = null
      let nearestDist = PROXIMITY
      SECTIONS.forEach(({ id, worldX, worldZ }) => {
        const d = Math.hypot(player.position.x - worldX, player.position.z - worldZ)
        if (d < nearestDist) { nearestDist = d; nearest = id }
      })
      if (nearest !== currentSection) {
        currentSection = nearest
        setActiveSection(nearest)
      }

      renderer.render(scene, camera)
    }
    animate()

    // ── Resize ──
    const onResize = () => {
      const w = mount.clientWidth, h = mount.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
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
  }, [])

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <div ref={mountRef} className="w-full h-full" />

      {/* Exit button */}
      <button
        onClick={onExit}
        className="absolute top-4 left-4 z-10 px-4 py-2 bg-black/75 backdrop-blur-sm text-white border border-white/30 rounded-full font-bold text-sm hover:bg-white hover:text-black transition-colors duration-300"
      >
        ← 2D View
      </button>

      {/* Controls hint */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white text-xs bg-black/50 backdrop-blur-sm px-5 py-2 rounded-full pointer-events-none">
        WASD · Arrow Keys to walk &nbsp;·&nbsp; Approach signs to read
      </div>

      {/* Section info overlay */}
      {activeSection && (
        <SectionOverlay
          sectionId={activeSection}
          onClose={() => setActiveSection(null)}
        />
      )}
    </div>
  )
}
