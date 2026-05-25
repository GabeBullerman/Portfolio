import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

export interface PlayerResult {
  player:      THREE.Group
  lArmPivot:   THREE.Group
  rArmPivot:   THREE.Group
  lLegPivot:   THREE.Group
  rLegPivot:   THREE.Group
  lKnee:       THREE.Group
  rKnee:       THREE.Group
  lElbow:      THREE.Group
  rElbow:      THREE.Group
}

export function createPlayer(
  scene: THREE.Scene,
  playerBonesRef: React.MutableRefObject<{
    lUpLeg?: THREE.Bone; rUpLeg?: THREE.Bone
    lLoLeg?: THREE.Bone; rLoLeg?: THREE.Bone
    lUpArm?: THREE.Bone; rUpArm?: THREE.Bone
    spine?:  THREE.Bone
  } | null>,
  effectDisposedRef: { current: boolean },
): PlayerResult {
  const gltfLoader = new GLTFLoader()

  const skinMat  = new THREE.MeshLambertMaterial({ color: 0xfcd34d })
  const shirtMat = new THREE.MeshLambertMaterial({ color: 0x2563eb })
  const pantsMat = new THREE.MeshLambertMaterial({ color: 0x1e3a5f })
  const shoesMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a })
  const hairMat  = new THREE.MeshLambertMaterial({ color: 0x3d1f00 })

  const player = new THREE.Group()
  const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.36), skinMat)
  headMesh.position.y = 1.96; headMesh.castShadow = true; player.add(headMesh)
  const hairTop = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.10, 0.38), hairMat)
  hairTop.position.y = 2.19; player.add(hairTop)
  const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.24, 0.06), hairMat)
  hairBack.position.set(0, 2.10, -0.18); player.add(hairBack)
  const torsoMesh = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.68, 0.28), shirtMat)
  torsoMesh.position.y = 1.34; torsoMesh.castShadow = true; player.add(torsoMesh)

  function makeArm(side: 1 | -1) {
    const pivot = new THREE.Group(); pivot.position.set(side * 0.37, 1.62, 0)
    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.44, 0.18), shirtMat)
    upper.position.y = -0.22; upper.castShadow = true; pivot.add(upper)
    const elbow = new THREE.Group(); elbow.position.y = -0.44
    const lower = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.42, 0.15), skinMat)
    lower.position.y = -0.21; lower.castShadow = true; elbow.add(lower)
    pivot.add(elbow); return { pivot, elbow }
  }
  function makeLeg(side: 1 | -1) {
    const pivot = new THREE.Group(); pivot.position.set(side * 0.14, 1.02, 0)
    const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.48, 0.22), pantsMat)
    thigh.position.y = -0.24; thigh.castShadow = true; pivot.add(thigh)
    const knee = new THREE.Group(); knee.position.y = -0.48
    const shin = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.44, 0.20), pantsMat)
    shin.position.y = -0.22; shin.castShadow = true; knee.add(shin)
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.10, 0.30), shoesMat)
    foot.position.set(0, -0.49, 0.06); knee.add(foot)
    pivot.add(knee); return { pivot, knee }
  }
  const { pivot: lArmPivot, elbow: lElbow } = makeArm(-1)
  const { pivot: rArmPivot, elbow: rElbow } = makeArm(1)
  player.add(lArmPivot, rArmPivot)
  const { pivot: lLegPivot, knee: lKnee } = makeLeg(-1)
  const { pivot: rLegPivot, knee: rKnee } = makeLeg(1)
  player.add(lLegPivot, rLegPivot)

  // Load scout boy GLB — texture embedded, replaces procedural stick figure when ready
  const proceduralMeshes = [headMesh, hairTop, hairBack, torsoMesh]
  gltfLoader.load('/assets/player/Untitled.glb', gltf => {
    // ── MUST BE FIRST — before effectDisposed guard ──────────────────
    if (effectDisposedRef.current) return
    const model = gltf.scene
    // GLB has embedded texture + KHR_materials_unlit — materials load correctly as-is

    // Debug: log actual bone names so we can verify the lookup keys
    const boneMap = new Map<string, THREE.Bone>()
    model.traverse(c => { if ((c as THREE.Bone).isBone) boneMap.set(c.name, c as THREE.Bone) })

    const lUpLeg  = boneMap.get('mixamorigLeftUpLeg_28')
    const rUpLeg  = boneMap.get('mixamorigRightUpLeg_33')
    const lLoLeg  = boneMap.get('mixamorigLeftLeg_27')
    const rLoLeg  = boneMap.get('mixamorigRightLeg_32')
    const lUpArm  = boneMap.get('mixamorigLeftArm_11')
    const rUpArm  = boneMap.get('mixamorigRightArm_19')
    const spine   = boneMap.get('mixamorigSpine_23')

    // Hide procedural geometry
    proceduralMeshes.forEach(m => { m.visible = false })
    ;[lArmPivot, rArmPivot, lLegPivot, rLegPivot].forEach(p =>
      p.traverse(c => { if ((c as THREE.Mesh).isMesh) (c as THREE.Mesh).visible = false })
    )
    model.scale.setScalar(1.0)
    model.rotation.set(-Math.PI / 2, 0, 0)
    // Measure bounds in local space BEFORE adding to player (avoids player world-transform offset)
    const bbox = new THREE.Box3().setFromObject(model)
    model.position.y = -bbox.min.y
    player.add(model)

    // Store bone refs for direct per-frame manipulation (bypasses PropertyBinding colon issue)
    playerBonesRef.current = { lUpLeg, rUpLeg, lLoLeg, rLoLeg, lUpArm, rUpArm, spine }
  }, undefined, err => console.error('[player] scout boy failed:', err))

  // Spawn inside cabin (monitor room) — monitorMode overlay covers the 3D view initially
  player.position.set(-4.0, 2.1, 14.0); scene.add(player)

  return { player, lArmPivot, rArmPivot, lLegPivot, rLegPivot, lKnee, rKnee, lElbow, rElbow }
}
