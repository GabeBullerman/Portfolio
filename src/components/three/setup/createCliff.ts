import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

export interface CliffResult {
  update: (elapsed: number) => void
}

// ── Exact vertex shader from src/shaders/vertex.glsl ─────────────────────────
const vertexShader = `
uniform float uBigWavesElevation;
uniform vec2 uBigWavesFrequency;
uniform float uTime;
uniform float uBigWavesSpeed;

uniform float uSmallWavesElevation;
uniform float uSmallWavesFrequency;
uniform float uSmallWavesSpeed;
uniform float uSmallWavesIterations;

varying float vElevation;

vec4 permute(vec4 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
vec3 fade(vec3 t) { return t*t*t*(t*(t*6.0-15.0)+10.0); }

float cnoise(vec3 P) {
  vec3 Pi0 = floor(P);
  vec3 Pi1 = Pi0 + vec3(1.0);
  Pi0 = mod(Pi0, 289.0);
  Pi1 = mod(Pi1, 289.0);
  vec3 Pf0 = fract(P);
  vec3 Pf1 = Pf0 - vec3(1.0);
  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
  vec4 iy = vec4(Pi0.yy, Pi1.yy);
  vec4 iz0 = Pi0.zzzz;
  vec4 iz1 = Pi1.zzzz;
  vec4 ixy  = permute(permute(ix) + iy);
  vec4 ixy0 = permute(ixy + iz0);
  vec4 ixy1 = permute(ixy + iz1);
  vec4 gx0 = ixy0 / 7.0;
  vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
  gx0 = fract(gx0);
  vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
  vec4 sz0 = step(gz0, vec4(0.0));
  gx0 -= sz0 * (step(0.0, gx0) - 0.5);
  gy0 -= sz0 * (step(0.0, gy0) - 0.5);
  vec4 gx1 = ixy1 / 7.0;
  vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
  gx1 = fract(gx1);
  vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
  vec4 sz1 = step(gz1, vec4(0.0));
  gx1 -= sz1 * (step(0.0, gx1) - 0.5);
  gy1 -= sz1 * (step(0.0, gy1) - 0.5);
  vec3 g000 = vec3(gx0.x, gy0.x, gz0.x);
  vec3 g100 = vec3(gx0.y, gy0.y, gz0.y);
  vec3 g010 = vec3(gx0.z, gy0.z, gz0.z);
  vec3 g110 = vec3(gx0.w, gy0.w, gz0.w);
  vec3 g001 = vec3(gx1.x, gy1.x, gz1.x);
  vec3 g101 = vec3(gx1.y, gy1.y, gz1.y);
  vec3 g011 = vec3(gx1.z, gy1.z, gz1.z);
  vec3 g111 = vec3(gx1.w, gy1.w, gz1.w);
  vec4 norm0 = taylorInvSqrt(vec4(dot(g000,g000), dot(g010,g010), dot(g100,g100), dot(g110,g110)));
  g000 *= norm0.x; g010 *= norm0.y; g100 *= norm0.z; g110 *= norm0.w;
  vec4 norm1 = taylorInvSqrt(vec4(dot(g001,g001), dot(g011,g011), dot(g101,g101), dot(g111,g111)));
  g001 *= norm1.x; g011 *= norm1.y; g101 *= norm1.z; g111 *= norm1.w;
  float n000 = dot(g000, Pf0);
  float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
  float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
  float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
  float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
  float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
  float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
  float n111 = dot(g111, Pf1);
  vec3 fade_xyz = fade(Pf0);
  vec4 n_z  = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
  vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
  float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
  return 2.2 * n_xyz;
}

void main() {
  vec4 modelPosition = modelMatrix * vec4(position, 1.0);

  float elevation =
    sin(modelPosition.x * uBigWavesFrequency.x + uTime * uBigWavesSpeed) *
    sin(modelPosition.z * uBigWavesFrequency.y + uTime * uBigWavesSpeed) *
    uBigWavesElevation;

  for (float i = 1.0; i <= uSmallWavesIterations; i++) {
    elevation -= abs(cnoise(vec3(
      modelPosition.xz * uSmallWavesFrequency * i,
      uTime * uSmallWavesSpeed
    )) * uSmallWavesElevation / i);
  }

  vElevation = elevation;
  modelPosition.y += elevation;

  vec4 viewPosition = viewMatrix * modelPosition;
  gl_Position = projectionMatrix * viewPosition;
}
`

// ── Fragment shader from src/shaders/fragment.glsl + uAlpha for transparency ─
const fragmentShader = `
uniform vec3 uDepthColor;
uniform vec3 uSurfaceColor;
uniform float uColorOffset;
uniform float uColorMultiplier;
uniform float uAlpha;

varying float vElevation;

void main() {
  float mixStrength = (vElevation + uColorOffset) * uColorMultiplier;
  vec3 color = mix(uDepthColor, uSurfaceColor, mixStrength);
  gl_FragColor = vec4(color, uAlpha);
}
`

// ── Main export ───────────────────────────────────────────────────────────────
export function createCliff(scene: THREE.Scene): CliffResult {
  const WATER_Y  = -0.8
  const SLOPE_START_Z = 22   // fence line
  const SLOPE_END_Z   = 46   // where rocky slope meets the water surface
  const FRONT_Z  = SLOPE_END_Z
  const BACK_Z   = 110
  const LEFT_X   = -62
  const RIGHT_X  = 62
  const MID_Z    = (FRONT_Z + BACK_Z) / 2
  const W        = RIGHT_X - LEFT_X
  const D        = BACK_Z - FRONT_Z

  // ── Flat angled slope: fence edge (z=22, y=0) → water surface (z=46, y=WATER_Y) ──
  const SLOPE_W = 160   // wider than fence to cover side rim strips
  const slopeGeo = new THREE.BufferGeometry()
  slopeGeo.setAttribute('position', new THREE.Float32BufferAttribute([
    -SLOPE_W / 2, WATER_Y, SLOPE_END_Z,   //  BL
     SLOPE_W / 2, WATER_Y, SLOPE_END_Z,   //  BR
    -SLOPE_W / 2, 0,       SLOPE_START_Z, //  TL
     SLOPE_W / 2, 0,       SLOPE_START_Z, //  TR
  ], 3))
  slopeGeo.setAttribute('uv', new THREE.Float32BufferAttribute([0,0, 1,0, 0,1, 1,1], 2))
  slopeGeo.setIndex([0, 1, 2, 1, 3, 2])
  slopeGeo.computeVertexNormals()

  const slopeMat = new THREE.MeshStandardMaterial({ color: 0xd4bc8a, roughness: 0.95, metalness: 0 })
  const slopeMesh = new THREE.Mesh(slopeGeo, slopeMat)
  slopeMesh.receiveShadow = true
  slopeMesh.castShadow    = true
  scene.add(slopeMesh)

  // Dark lake bed beneath the water
  const bedMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(W, D),
    new THREE.MeshLambertMaterial({ color: 0x0a1018 }),
  )
  bedMesh.rotation.x = -Math.PI / 2
  bedMesh.position.set(0, WATER_Y - 1.8, MID_Z)
  scene.add(bedMesh)

  // ── Animated water ────────────────────────────────────────────────────────
  const waterMat = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      uTime:                { value: 0 },
      uBigWavesElevation:   { value: 0.32 },
      uBigWavesFrequency:   { value: new THREE.Vector2(1.2, 0.7) },
      uBigWavesSpeed:       { value: 0.55 },
      uSmallWavesElevation: { value: 0.04 },
      uSmallWavesFrequency: { value: 0.6 },
      uSmallWavesSpeed:     { value: 0.12 },
      uSmallWavesIterations:{ value: 2.0 },
      uDepthColor:          { value: new THREE.Color('#5ec8f0') },
      uSurfaceColor:        { value: new THREE.Color('#d0f0ff') },
      uColorOffset:         { value: 0.08 },
      uColorMultiplier:     { value: 5.0 },
      uAlpha:               { value: 0.88 },
    },
    vertexShader,
    fragmentShader,
  })

  const waterMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(W, D, 128, 128),
    waterMat,
  )
  waterMesh.rotation.x = -Math.PI / 2
  waterMesh.position.set(0, WATER_Y, MID_Z)
  scene.add(waterMesh)

  // ── Boat ─────────────────────────────────────────────────────────────────
  const BOAT_X = -13, BOAT_Z = 73
  const boatRef = { current: null as THREE.Object3D | null }

  new GLTFLoader().load('/assets/outdoor/boat/scene.gltf', gltf => {
    const boat = gltf.scene
    const box = new THREE.Box3().setFromObject(boat)
    const size = new THREE.Vector3(); box.getSize(size)
    const maxDim = Math.max(size.x, size.y, size.z)
    boat.scale.setScalar(maxDim > 0 ? 8.0 / maxDim : 1.0)
    const D2R = Math.PI / 180
    boat.rotation.set(-1.6 * D2R, 29.8 * D2R, 2.8 * D2R)
    boat.position.set(BOAT_X, WATER_Y + 0.3, BOAT_Z)
    boat.traverse(c => {
      if ((c as THREE.Mesh).isMesh) {
        c.castShadow = true; c.receiveShadow = true
        const mats = Array.isArray((c as THREE.Mesh).material)
          ? (c as THREE.Mesh).material as THREE.Material[]
          : [(c as THREE.Mesh).material as THREE.Material]
        mats.forEach(m => {
          ;(m as THREE.MeshStandardMaterial).transparent = false
          ;(m as THREE.MeshStandardMaterial).opacity = 1
          ;(m as THREE.MeshStandardMaterial).depthWrite = true
          m.needsUpdate = true
        })
      }
    })
    scene.add(boat)
    boatRef.current = boat
  }, undefined, err => console.error('[cliff] Boat load failed:', err))

  // ── Beach prop ────────────────────────────────────────────────────────────
  new GLTFLoader().load('/assets/outdoor/beach/Untitled.glb', gltf => {
    const beach = gltf.scene
    const box = new THREE.Box3().setFromObject(beach)
    const size = new THREE.Vector3(); box.getSize(size)
    const maxDim = Math.max(size.x, size.y, size.z)
    beach.scale.setScalar(maxDim > 0 ? 12.0 / maxDim * 0.75 : 0.75)
    beach.position.set(-6, -0.3, 34)
    beach.rotation.y = -Math.PI / 2
    beach.traverse(c => { if ((c as THREE.Mesh).isMesh) { c.castShadow = true; c.receiveShadow = true } })
    scene.add(beach)
  }, undefined, err => console.error('[cliff] Beach load failed:', err))

  // ── Per-frame update ──────────────────────────────────────────────────────
  function update(elapsed: number) {
    waterMat.uniforms.uTime.value = elapsed

    if (boatRef.current) {
      const t = elapsed
      // Replicate big-wave vertex shader math at boat position
      const elev =
        Math.sin(BOAT_X * 4.0 + t * 0.75) *
        Math.sin(BOAT_Z * 1.5 + t * 0.75) *
        0.18
      boatRef.current.position.y = WATER_Y + 0.3 + elev
      boatRef.current.rotation.z = 0.05 * Math.cos(t * 0.6)
      boatRef.current.rotation.x = 0.03 * Math.sin(t * 0.8)
    }
  }

  return { update }
}
