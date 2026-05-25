import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { Movable } from '../types'

export const EXHIBIT_CX = -20
export const EXHIBIT_CZ = -70
export const CRADLE_X    = EXHIBIT_CX - 6   // = -26
export const CRADLE_Z    = EXHIBIT_CZ - 3   // = -73
export const CRADLE_PROX = 2.8

// ─── Cradle geometry constants (all in world-space Y from ground) ────────────
const BALL_R    = 0.18
const STRING_L  = 1.6          // vertical drop from bar to ball centre at rest
const FRAME_H   = STRING_L + BALL_R + 0.55   // bar world-Y (≈2.33)
const Z_OFF     = 0.55         // half-distance between front/back bars
const N_BALLS   = 5
const SP        = BALL_R * 2   // centre-to-centre spacing; balls touch at rest
// Full string length (bar corner → ball centre)
const STR_FULL  = Math.sqrt(STRING_L * STRING_L + Z_OFF * Z_OFF)
const REST_Y    = FRAME_H - STRING_L   // ball-centre Y at rest (≈0.73)

export function createExhibit(
  scene: THREE.Scene,
  movables: Movable[],
  physWorld: CANNON.World,
  camera: THREE.PerspectiveCamera,
): { update: (elapsed: number, delta: number) => void; startCradle: () => void } {
  const updateFns: Array<(elapsed: number, delta: number) => void> = []
  let startCradle = () => { /* assigned below */ }

  // ── Pedestal GLB — loaded once, cloned for every placement ─────────────────
  const gltfLoader = new GLTFLoader()
  let pedestalBase: THREE.Group | null = null
  const pedestalPending: Array<{ grp: THREE.Group; h: number }> = []

  function applyPedestalGLB(grp: THREE.Group, base: THREE.Group, h: number) {
    const clone = base.clone(true)
    clone.traverse(c => {
      if ((c as THREE.Mesh).isMesh) { c.castShadow = true; c.receiveShadow = true }
    })
    const box = new THREE.Box3().setFromObject(clone)
    const modelH = box.max.y - box.min.y
    const s = modelH > 0 ? h / modelH : 1
    clone.scale.setScalar(s)
    clone.position.y = -box.min.y * s
    grp.add(clone)
  }

  gltfLoader.load('/assets/outdoor/park stuff/exhibit/pedestals/Pedestal.glb', gltf => {
    pedestalBase = gltf.scene
    pedestalPending.forEach(({ grp, h }) => applyPedestalGLB(grp, pedestalBase!, h))
    pedestalPending.length = 0
  }, undefined, err => console.error('[pedestal]', err))

  function pedestal(x: number, z: number, h = 1.1, name?: string) {
    const grp = new THREE.Group()
    grp.position.set(x, 0, z)
    scene.add(grp)
    if (pedestalBase) applyPedestalGLB(grp, pedestalBase, h)
    else pedestalPending.push({ grp, h })
    if (name) movables.push({ name, group: grp, scaleObj: grp })
    return grp
  }

  // ── Entrance arch ────────────────────────────────────────────────────────
  {
    const archMat = new THREE.MeshStandardMaterial({ color: 0x1a0a2e, roughness: 0.7, metalness: 0.4 })
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0xcc88ff, emissive: 0xaa44ff, emissiveIntensity: 1.2, roughness: 0.4, metalness: 0.1,
    })
    const archGrp = new THREE.Group()
    archGrp.position.set(EXHIBIT_CX, 0, EXHIBIT_CZ - 9)

    const leftPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 3.2, 8), archMat)
    leftPillar.position.set(-1.8, 1.6, 0); leftPillar.castShadow = true
    const rightPillar = leftPillar.clone(); rightPillar.position.set(1.8, 1.6, 0)

    const bar = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.25, 0.25), glowMat)
    bar.position.set(0, 3.3, 0)

    const orbGeo = new THREE.SphereGeometry(0.22, 12, 12)
    const leftOrb = new THREE.Mesh(orbGeo, glowMat); leftOrb.position.set(-1.8, 3.35, 0)
    const rightOrb = new THREE.Mesh(orbGeo, glowMat); rightOrb.position.set(1.8, 3.35, 0)

    archGrp.add(leftPillar, rightPillar, bar, leftOrb, rightOrb)
    movables.push({ name: '✨ Exhibit Arch', group: archGrp, scaleObj: archGrp })
    scene.add(archGrp)

    // Sign — child of arch, solid background, in front of bar so no z-fighting
    const canvas = document.createElement('canvas')
    canvas.width = 512; canvas.height = 96
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#1a0a2e'
    ctx.roundRect(4, 4, 504, 88, 14); ctx.fill()
    ctx.strokeStyle = '#aa44ff'; ctx.lineWidth = 3
    ctx.roundRect(4, 4, 504, 88, 14); ctx.stroke()
    ctx.fillStyle = '#cc88ff'
    ctx.font = 'bold 42px sans-serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('Three.js Exhibit', 256, 48)
    const signMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(3.5, 0.66),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), side: THREE.DoubleSide }),
    )
    signMesh.position.set(0, 3.32, 0.14)
    archGrp.add(signMesh)
  }

  // ── Newton's Cradle (Cannon pendulum + analytical transfer) ───────────────
  {
    const NC_X = CRADLE_X, NC_Z = CRADLE_Z

    // Ball rest x positions
    const restXs = Array.from({ length: N_BALLS }, (_, i) =>
      NC_X + (i - (N_BALLS - 1) / 2) * SP,
    )

    // ── Visual frame (static mesh group) ─────────────────────────────────
    const cradleGrp = new THREE.Group()
    cradleGrp.position.set(NC_X, 0, NC_Z)
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.85, roughness: 0.15 })

    // Front/back horizontal top bars — span all balls
    const BAR_LEN = N_BALLS * SP + 0.5
    const barGeo  = new THREE.CylinderGeometry(0.045, 0.045, BAR_LEN, 8)
    for (const zOff of [-Z_OFF, Z_OFF]) {
      const b = new THREE.Mesh(barGeo, frameMat)
      b.rotation.z = Math.PI / 2
      b.position.set(0, FRAME_H, zOff)   // local y = FRAME_H matches world y
      b.castShadow = true
      cradleGrp.add(b)
    }

    // Vertical corner legs
    const LEG_X = (N_BALLS - 1) * SP / 2 + 0.22
    const legGeo = new THREE.CylinderGeometry(0.035, 0.035, FRAME_H, 6)
    for (const xOff of [-LEG_X, LEG_X]) {
      for (const zOff of [-Z_OFF, Z_OFF]) {
        const leg = new THREE.Mesh(legGeo, frameMat)
        leg.position.set(xOff, FRAME_H / 2, zOff)
        leg.castShadow = true
        cradleGrp.add(leg)
      }
    }

    movables.push({ name: "⚙️ Newton's Cradle", group: cradleGrp, scaleObj: cradleGrp })
    scene.add(cradleGrp)

    // ── Physics bodies ────────────────────────────────────────────────────
    const ballBodies: CANNON.Body[] = []
    const ballMeshes: THREE.Mesh[]  = []
    const strPos: Float32Array[]    = []
    const strGeos: THREE.BufferGeometry[] = []

    const ballVisualMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.95, roughness: 0.05 })
    const strLineMat    = new THREE.LineBasicMaterial({ color: 0xbbbbbb })

    for (let i = 0; i < N_BALLS; i++) {
      const bx = restXs[i]
      const by = REST_Y
      const bz = NC_Z

      // Physics ball — collides with nothing (we do transfer analytically)
      const body = new CANNON.Body({ mass: 1, linearDamping: 0.008, angularDamping: 1 })
      body.addShape(new CANNON.Sphere(BALL_R))
      body.position.set(bx, by, bz)
      body.collisionFilterGroup = 2
      body.collisionFilterMask  = 0   // no Cannon collisions; transfer done analytically
      body.sleep()
      physWorld.addBody(body)
      ballBodies.push(body)

      // Two static pivot bodies (front bar, back bar) + distance constraints
      for (const zOff of [-Z_OFF, Z_OFF]) {
        const pivot = new CANNON.Body({ mass: 0 })
        pivot.addShape(new CANNON.Sphere(0.01))
        pivot.position.set(bx, FRAME_H, NC_Z + zOff)
        pivot.collisionFilterMask = 0
        physWorld.addBody(pivot)
        physWorld.addConstraint(new CANNON.DistanceConstraint(pivot, body, STR_FULL, 1e6))
      }

      // Visual ball mesh
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(BALL_R, 16, 16), ballVisualMat)
      mesh.castShadow = true
      mesh.position.set(bx, by, bz)
      scene.add(mesh)
      ballMeshes.push(mesh)

      // Two string lines per ball: front and back
      for (const zOff of [-Z_OFF, Z_OFF]) {
        // top vertex = bar attachment (world); bottom vertex = ball centre (world, updated each frame)
        const pos = new Float32Array([bx, FRAME_H, NC_Z + zOff, bx, by, bz])
        const geo = new THREE.BufferGeometry()
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
        scene.add(new THREE.Line(geo, strLineMat))
        strPos.push(pos)
        strGeos.push(geo)
      }
    }

    // Helper: teleport body (bypasses interpolation so constraint sees correct position)
    function bodySet(b: CANNON.Body, x: number, y: number, z: number) {
      b.position.set(x, y, z)
      b.previousPosition.set(x, y, z)
      b.interpolatedPosition.set(x, y, z)
    }

    // ── startCradle: reset all to rest, raise ball[0] 40°, release ────────
    function _startCradle() {
      const THETA = Math.PI / 4.5   // ~40° swing
      for (let i = 0; i < N_BALLS; i++) {
        if (i === 0) {
          bodySet(ballBodies[0],
            restXs[0] - Math.sin(THETA) * STRING_L,
            FRAME_H   - Math.cos(THETA) * STRING_L,
            NC_Z,
          )
        } else {
          bodySet(ballBodies[i], restXs[i], REST_Y, NC_Z)
        }
        ballBodies[i].velocity.set(0, 0, 0)
        ballBodies[i].angularVelocity.set(0, 0, 0)
        ballBodies[i].wakeUp()
      }
    }

    // ── Per-frame: sync meshes/strings + analytical Newton transfer ────────
    const TRANSFER_EPS = 0.06   // min speed to trigger transfer

    updateFns.push(() => {
      // Sync visuals
      for (let i = 0; i < N_BALLS; i++) {
        const bp = ballBodies[i].position
        ballMeshes[i].position.set(bp.x, bp.y, bp.z)
        // Each ball owns 2 string line entries (2i and 2i+1)
        // Top vertex is fixed; update bottom vertex only
        for (let s = 0; s < 2; s++) {
          const pos = strPos[i * 2 + s]
          pos[3] = bp.x; pos[4] = bp.y; pos[5] = bp.z
          strGeos[i * 2 + s].attributes.position.needsUpdate = true
        }
      }

      // Analytical transfer: ball[0] swings right → launches ball[4]
      const v0 = ballBodies[0].velocity
      if (v0.x > TRANSFER_EPS && ballBodies[0].position.x >= restXs[0] - 0.01) {
        const speed = Math.sqrt(v0.x * v0.x + v0.y * v0.y)
        bodySet(ballBodies[0], restXs[0], REST_Y, NC_Z)
        ballBodies[0].velocity.set(0, 0, 0)
        bodySet(ballBodies[N_BALLS - 1], restXs[N_BALLS - 1], REST_Y, NC_Z)
        ballBodies[N_BALLS - 1].velocity.set(speed, 0, 0)
        ballBodies[N_BALLS - 1].wakeUp()
      }

      // Analytical transfer: ball[4] swings left → launches ball[0]
      const vN = ballBodies[N_BALLS - 1].velocity
      if (vN.x < -TRANSFER_EPS && ballBodies[N_BALLS - 1].position.x <= restXs[N_BALLS - 1] + 0.01) {
        const speed = Math.sqrt(vN.x * vN.x + vN.y * vN.y)
        bodySet(ballBodies[N_BALLS - 1], restXs[N_BALLS - 1], REST_Y, NC_Z)
        ballBodies[N_BALLS - 1].velocity.set(0, 0, 0)
        bodySet(ballBodies[0], restXs[0], REST_Y, NC_Z)
        ballBodies[0].velocity.set(-speed, 0, 0)
        ballBodies[0].wakeUp()
      }
    })

    startCradle = _startCradle
  }

  // ── Geometry Gallery ─────────────────────────────────────────────────────
  {
    const PH = 1.1

    pedestal(EXHIBIT_CX + 7, EXHIBIT_CZ - 4, PH, '🔵 Pedestal: Torus Knot')
    const tkMesh = new THREE.Mesh(
      new THREE.TorusKnotGeometry(0.42, 0.13, 128, 16),
      new THREE.MeshStandardMaterial({ color: 0x7744ff, metalness: 0.3, roughness: 0.4, emissive: 0x220066, emissiveIntensity: 0.4 }),
    )
    tkMesh.castShadow = true
    const tkGrp = new THREE.Group()
    tkGrp.position.set(EXHIBIT_CX + 7, PH + 0.62, EXHIBIT_CZ - 4)
    tkGrp.add(tkMesh)
    scene.add(tkGrp)
    movables.push({ name: '💜 Torus Knot', group: tkGrp, scaleObj: tkMesh })
    updateFns.push((t) => { tkMesh.rotation.x = t * 0.5; tkMesh.rotation.y = t * 0.8 })

    pedestal(EXHIBIT_CX + 7.5, EXHIBIT_CZ + 2, PH, '🔵 Pedestal: Icosahedron')
    const icoGeo = new THREE.IcosahedronGeometry(0.52, 1)
    const icoSolid = new THREE.Mesh(icoGeo,
      new THREE.MeshStandardMaterial({ color: 0x44aaff, metalness: 0.2, roughness: 0.5, transparent: true, opacity: 0.55 }))
    const icoWire = new THREE.Mesh(icoGeo.clone(),
      new THREE.MeshBasicMaterial({ color: 0x88ddff, wireframe: true }))
    const icoGrp = new THREE.Group()
    icoGrp.position.set(EXHIBIT_CX + 7.5, PH + 0.68, EXHIBIT_CZ + 2)
    icoGrp.add(icoSolid, icoWire)
    scene.add(icoGrp)
    movables.push({ name: '🔷 Icosahedron', group: icoGrp, scaleObj: icoGrp })
    updateFns.push((t) => {
      icoSolid.rotation.y = t * 0.6
      icoWire.rotation.y  = -t * 0.45
      icoWire.rotation.x  = t * 0.28
    })

  }

  // ── Particle Fountain ────────────────────────────────────────────────────
  {
    const FX = EXHIBIT_CX - 6.5, FZ = EXHIBIT_CZ + 5
    const NP = 250
    const positions  = new Float32Array(NP * 3)
    const velocities = new Float32Array(NP * 3)
    const lifetimes  = new Float32Array(NP)
    const maxLifes   = new Float32Array(NP)

    function spawnParticle(i: number, lt = 0) {
      const theta = Math.random() * Math.PI * 2, rs = 0.2 + Math.random() * 0.4
      velocities[i*3]   = Math.cos(theta) * rs
      velocities[i*3+1] = 3.5 + Math.random() * 2.5
      velocities[i*3+2] = Math.sin(theta) * rs
      positions[i*3] = FX; positions[i*3+1] = 0.60; positions[i*3+2] = FZ
      maxLifes[i]  = 1.4 + Math.random() * 1.4
      lifetimes[i] = lt
    }

    for (let i = 0; i < NP; i++) {
      spawnParticle(i, Math.random() * 2.0)
      const lt = lifetimes[i]
      positions[i*3]   += velocities[i*3]   * lt
      positions[i*3+1] += velocities[i*3+1] * lt - 0.5 * 6 * lt * lt
      positions[i*3+2] += velocities[i*3+2] * lt
    }

    const colors = new Float32Array(NP * 3)
    for (let i = 0; i < NP; i++) {
      const f = Math.random()
      colors[i*3] = 0.05 + f * 0.15       // R: near zero (slight teal)
      colors[i*3+1] = 0.35 + f * 0.35     // G: mid blue-green
      colors[i*3+2] = 0.80 + f * 0.20     // B: strong blue
    }

    const pGeo = new THREE.BufferGeometry()
    pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    pGeo.setAttribute('color',    new THREE.BufferAttribute(colors, 3))
    scene.add(new THREE.Points(pGeo, new THREE.PointsMaterial({
      size: 0.10, vertexColors: true, sizeAttenuation: true, transparent: true, opacity: 0.85,
    })))

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x7a7a70, roughness: 0.92, metalness: 0.04 })

    // Wide flat stone base slab — clearly reads as a round stone platform
    const basinBase = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.65, 0.22, 40), stoneMat)
    basinBase.position.set(FX, 0.11, FZ); basinBase.castShadow = true; basinBase.receiveShadow = true
    scene.add(basinBase)

    // Raised rim ring (torus) — sits on top of slab, defines the pool boundary
    const rimRing = new THREE.Mesh(new THREE.TorusGeometry(1.38, 0.11, 8, 48), stoneMat)
    rimRing.rotation.x = Math.PI / 2
    rimRing.position.set(FX, 0.38, FZ); rimRing.castShadow = true; rimRing.receiveShadow = true
    scene.add(rimRing)

    // Water fill inside the rim — larger, emissive so it reads clearly at eye level
    const waterDisc = new THREE.Mesh(
      new THREE.CircleGeometry(1.26, 56),
      new THREE.MeshStandardMaterial({
        color: 0x1a88cc, emissive: 0x005599, emissiveIntensity: 0.45,
        roughness: 0.04, metalness: 0.15, transparent: true, opacity: 0.88,
      }),
    )
    waterDisc.rotation.x = -Math.PI / 2
    waterDisc.position.set(FX, 0.245, FZ)
    scene.add(waterDisc)

    // Central spout column
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.08, 0.38, 12), stoneMat)
    spout.position.set(FX, 0.41, FZ); spout.castShadow = true
    scene.add(spout)

    // Add basin group to movables for debug tuning
    const basinGrp = new THREE.Group()
    basinGrp.position.set(FX, 0, FZ)
    scene.add(basinGrp)
    movables.push({ name: '⛲ Fountain Basin', group: basinGrp, scaleObj: basinGrp })

    const fLight = new THREE.PointLight(0x2299cc, 2.0, 8)
    fLight.position.set(FX, 0.8, FZ); scene.add(fLight)

    const GRAVITY = 6
    updateFns.push((t, dt) => {
      for (let i = 0; i < NP; i++) {
        lifetimes[i] += dt
        if (lifetimes[i] >= maxLifes[i]) { spawnParticle(i); continue }
        velocities[i*3+1] -= GRAVITY * dt
        positions[i*3]   += velocities[i*3]   * dt
        positions[i*3+1] += velocities[i*3+1] * dt
        positions[i*3+2] += velocities[i*3+2] * dt
        if (positions[i*3+1] < 0.26) {
          positions[i*3+1] = 0.26
          velocities[i*3+1] = Math.abs(velocities[i*3+1]) * 0.25
          velocities[i*3] *= 0.6; velocities[i*3+2] *= 0.6
        }
      }
      pGeo.attributes.position.needsUpdate = true
      fLight.intensity = 1.0 + Math.sin(t * 4) * 0.3
    })
  }

  // ── Orbital Orrery ───────────────────────────────────────────────────────
  {
    const OX = EXHIBIT_CX, OZ = EXHIBIT_CZ + 3, PH = 2.4
    pedestal(OX, OZ, PH, '🔵 Pedestal: Orrery').scale.set(0.656, 0.528, 0.810)

    const orreryGrp = new THREE.Group()
    orreryGrp.position.set(OX, PH + 0.1, OZ); scene.add(orreryGrp)

    const sun = new THREE.Mesh(new THREE.SphereGeometry(0.38, 24, 24),
      new THREE.MeshStandardMaterial({ color: 0xffcc44, emissive: 0xffaa00, emissiveIntensity: 1.5, roughness: 1 }))
    orreryGrp.add(sun)
    const sunLight = new THREE.PointLight(0xffcc44, 2.0, 14); orreryGrp.add(sunLight)

    const orbitMat = new THREE.LineBasicMaterial({ color: 0x444444 })
    const orbDefs = [
      { r: 1.0, speed: 2.2, inc:  0.10, color: 0x4488ff, size: 0.12 },
      { r: 1.6, speed: 1.3, inc: -0.25, color: 0xff7744, size: 0.15 },
      { r: 2.3, speed: 0.7, inc:  0.40, color: 0x55cc55, size: 0.18 },
      { r: 3.0, speed: 0.4, inc: -0.15, color: 0xcc88ff, size: 0.13 },
    ]
    const pivots: THREE.Group[] = []
    orbDefs.forEach(({ r, inc, color, size }) => {
      const pts: THREE.Vector3[] = []
      for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.12)
        pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r))
      const ring = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), orbitMat)
      ring.rotation.x = inc; orreryGrp.add(ring)
      const pivot = new THREE.Group(); pivot.rotation.x = inc; orreryGrp.add(pivot)
      const planet = new THREE.Mesh(new THREE.SphereGeometry(size, 14, 14),
        new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.1 }))
      planet.position.x = r; planet.castShadow = true; pivot.add(planet)
      pivots.push(pivot)
    })
    movables.push({ name: '🪐 Orrery', group: orreryGrp, scaleObj: orreryGrp })

    updateFns.push((t) => {
      sun.rotation.y = t * 0.3
      orbDefs.forEach(({ speed }, i) => { pivots[i].rotation.y = t * speed })
      sunLight.intensity = 1.8 + Math.sin(t * 1.5) * 0.2
    })
  }

  // ── Plasma Blob ────────────────────────────────────────────────────────────
  {
    const BX = EXHIBIT_CX + 7, BZ = EXHIBIT_CZ + 8, PH = 1.1
    const blobPed = pedestal(BX, BZ, PH, '🔵 Pedestal: Plasma Blob')
    void blobPed

    const blobMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: /* glsl */`
        uniform float uTime;
        varying vec3 vNormal;
        varying float vDisp;
        void main() {
          float d =
            sin(position.x * 3.8 + uTime * 1.1) * 0.10 +
            sin(position.y * 4.2 + uTime * 0.8) * 0.08 +
            sin(position.z * 3.5 + uTime * 1.3) * 0.09 +
            sin((position.x + position.z) * 2.5 + uTime * 0.6) * 0.06;
          vDisp = d;
          vec3 displaced = position + normal * d;
          vNormal = normalMatrix * normal;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        varying vec3 vNormal;
        varying float vDisp;
        void main() {
          vec3 n = normalize(vNormal);
          float diff = dot(n, normalize(vec3(0.5, 1.0, 0.8))) * 0.5 + 0.5;
          // Cycle through violet → cyan → green
          float t = vDisp * 5.0 + 0.5;
          vec3 a = vec3(0.55, 0.1, 0.9);   // violet
          vec3 b = vec3(0.1, 0.9, 0.85);   // cyan
          vec3 col = mix(a, b, clamp(t, 0.0, 1.0)) * (0.6 + diff * 0.7);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    })

    const blobMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 5), blobMat)
    blobMesh.castShadow = true
    blobMesh.position.y = PH + 0.65

    const blobLight = new THREE.PointLight(0x8833ff, 1.5, 6)
    blobLight.position.y = PH + 1.2

    const blobGrp = new THREE.Group()
    blobGrp.position.set(BX, 0, BZ)
    blobGrp.add(blobMesh, blobLight)
    scene.add(blobGrp)
    movables.push({ name: '🫧 Plasma Blob', group: blobGrp, scaleObj: blobMesh })

    updateFns.push((t) => {
      blobMat.uniforms.uTime.value = t
      blobLight.intensity = 1.2 + Math.sin(t * 2.3) * 0.4
    })
  }

  // ── Exploding Statue ─────────────────────────────────────────────────────
  {
    const SX = EXHIBIT_CX, SZ = EXHIBIT_CZ - 5
    const STATUE_PROX = 9.0
    const MAX_EXPLODE = 1.6
    const RAY_RADIUS  = 0.75    // world-unit radius of the exploding "beam"
    // World-space centre of the statue (mid-height) — ray always points here from player eye
    const statueCenterPos = new THREE.Vector3(SX, 1.6, SZ + 0.05)
    const _rayDir         = new THREE.Vector3()

    // Pedestal
    const pedH = 0.9
    pedestal(SX, SZ, pedH)

    // Plaque
    const plaqCanvas = document.createElement('canvas')
    plaqCanvas.width = 256; plaqCanvas.height = 64
    const pCtx = plaqCanvas.getContext('2d')!
    pCtx.fillStyle = '#1a1a2a'; pCtx.fillRect(0, 0, 256, 64)
    pCtx.fillStyle = '#ccbbff'
    pCtx.font = 'bold 22px sans-serif'
    pCtx.textAlign = 'center'; pCtx.textBaseline = 'middle'
    pCtx.fillText('Look at me', 128, 32)
    const plaqMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.65, 0.16),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(plaqCanvas), side: THREE.DoubleSide }),
    )
    plaqMesh.position.set(SX, pedH * 0.5, SZ + 0.46)
    scene.add(plaqMesh)

    let explodeFactor = 0
    let explodeMat: THREE.ShaderMaterial | null = null

    const loader = new GLTFLoader()
    loader.load('/assets/outdoor/park stuff/exhibit/scene.gltf', gltf => {
      gltf.scene.updateMatrixWorld(true)
      const geos: THREE.BufferGeometry[] = []
      gltf.scene.traverse(child => {
        const m = child as THREE.Mesh
        if (!m.isMesh) return
        const g = m.geometry.clone()
        const relMat = new THREE.Matrix4()
          .copy(gltf.scene.matrixWorld).invert()
          .multiply(m.matrixWorld)
        g.applyMatrix4(relMat)
        geos.push(g)
      })
      if (geos.length === 0) return

      const merged = mergeGeometries(geos, false)
      if (!merged) return
      geos.forEach(g => g.dispose())

      const flat = merged.toNonIndexed()
      merged.dispose()

      const pos = flat.attributes.position as THREE.BufferAttribute

      // Per-face normal attribute
      const faceNormals = new Float32Array(pos.count * 3)
      const vA = new THREE.Vector3(), vB = new THREE.Vector3(), vC = new THREE.Vector3()
      const fn = new THREE.Vector3()
      for (let i = 0; i < pos.count; i += 3) {
        vA.fromBufferAttribute(pos, i)
        vB.fromBufferAttribute(pos, i + 1)
        vC.fromBufferAttribute(pos, i + 2)
        fn.crossVectors(
          new THREE.Vector3().subVectors(vB, vA),
          new THREE.Vector3().subVectors(vC, vA),
        ).normalize()
        for (let v = 0; v < 3; v++) {
          faceNormals[(i + v) * 3]     = fn.x
          faceNormals[(i + v) * 3 + 1] = fn.y
          faceNormals[(i + v) * 3 + 2] = fn.z
        }
      }
      flat.setAttribute('aFaceNormal', new THREE.BufferAttribute(faceNormals, 3))

      // Per-face centroid attribute — used in shader to compute ray-point distance
      const centroids = new Float32Array(pos.count * 3)
      for (let i = 0; i < pos.count; i += 3) {
        const cx = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3
        const cy = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3
        const cz = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3
        for (let v = 0; v < 3; v++) {
          centroids[(i + v) * 3]     = cx
          centroids[(i + v) * 3 + 1] = cy
          centroids[(i + v) * 3 + 2] = cz
        }
      }
      flat.setAttribute('aCentroid', new THREE.BufferAttribute(centroids, 3))

      // Per-face random multiplier for variation
      const randoms = new Float32Array(pos.count)
      for (let i = 0; i < pos.count; i += 3) {
        const r = Math.random()
        randoms[i] = r; randoms[i + 1] = r; randoms[i + 2] = r
      }
      flat.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1))

      flat.computeBoundingBox()
      const bbox = flat.boundingBox!
      const modelH    = bbox.max.y - bbox.min.y
      const targetScale = 1.5 / modelH

      // ── Inner model (80% scale — clear gap from outer shell) ─────────────
      const innerScale = targetScale * 0.80
      const innerMesh  = new THREE.Mesh(
        flat.clone(),
        new THREE.MeshStandardMaterial({ color: 0x8899aa, roughness: 0.55, metalness: 0.45 }),
      )
      innerMesh.scale.setScalar(innerScale)
      innerMesh.position.set(SX, pedH - bbox.min.y * innerScale, SZ)
      innerMesh.castShadow = true
      const innerGrp = new THREE.Group()
      innerGrp.add(innerMesh)
      scene.add(innerGrp)
      movables.push({ name: '🗿 Statue Inner', group: innerGrp, scaleObj: innerMesh })

      // ── Outer shell — ray-based partial explosion ─────────────────────────
      // cameraPosition is a built-in Three.js ShaderMaterial uniform (world space)
      explodeMat = new THREE.ShaderMaterial({
        uniforms: {
          uExplode: { value: 0 },
          uRadius:  { value: RAY_RADIUS },
          uCamFwd:  { value: new THREE.Vector3(0, 0, -1) },
        },
        vertexShader: /* glsl */`
          attribute vec3 aFaceNormal;
          attribute vec3 aCentroid;
          attribute float aRandom;
          uniform float uExplode;
          uniform float uRadius;
          uniform vec3 uCamFwd;
          varying vec3 vNormal;
          varying float vDisp;

          void main() {
            vec3 worldCentroid = (modelMatrix * vec4(aCentroid, 1.0)).xyz;
            vec3 toPoint = worldCentroid - cameraPosition;
            float rayDist = length(cross(toPoint, uCamFwd));
            float influence = 1.0 - smoothstep(0.0, uRadius, rayDist);

            vDisp = uExplode * influence * (0.5 + aRandom * 0.9);
            vec3 displaced = position + aFaceNormal * vDisp;

            vNormal = normalMatrix * aFaceNormal;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
          }
        `,
        fragmentShader: /* glsl */`
          varying vec3 vNormal;
          varying float vDisp;
          void main() {
            vec3 n = normalize(vNormal);
            float diff = dot(n, normalize(vec3(1.0, 2.0, 0.5))) * 0.5 + 0.5;
            // Gold: dark amber → bright gold
            vec3 col = mix(vec3(0.35, 0.18, 0.0), vec3(1.0, 0.82, 0.18), diff);
            gl_FragColor = vec4(col, 1.0);
          }
        `,
        transparent: false,
        side: THREE.DoubleSide,
        depthWrite: true,
      })

      const outerScale = targetScale
      const outerMesh  = new THREE.Mesh(flat, explodeMat)
      outerMesh.scale.setScalar(outerScale)
      outerMesh.position.set(SX, pedH - bbox.min.y * outerScale, SZ)
      const outerGrp = new THREE.Group()
      outerGrp.position.set(0, -0.10, 0.05)
      outerGrp.add(outerMesh)
      scene.add(outerGrp)
      movables.push({ name: '🗿 Statue Shell', group: outerGrp, scaleObj: outerMesh })
    }, undefined, err => console.error('[statue]', err))

    // Every frame: update camera forward uniform + ramp explode intensity on proximity
    updateFns.push((_, dt) => {
      if (!explodeMat) return

      // Ray direction: player eye → statue centre (camera IS the eye in first-person)
      _rayDir.subVectors(statueCenterPos, camera.position).normalize()
      explodeMat.uniforms.uCamFwd.value.copy(_rayDir)

      const near = camera.position.distanceTo(statueCenterPos) < STATUE_PROX
      if (near) {
        explodeFactor = Math.min(explodeFactor + dt * 2.2, MAX_EXPLODE)
      } else {
        explodeFactor = Math.max(explodeFactor - dt * 1.4, 0)
      }
      explodeMat.uniforms.uExplode.value = explodeFactor
    })
  }

  return {
    update:       (elapsed, delta) => updateFns.forEach(fn => fn(elapsed, delta)),
    startCradle,
  }
}
