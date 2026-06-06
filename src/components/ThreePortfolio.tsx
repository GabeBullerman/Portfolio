import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import DebugOverlay from './three/ui/DebugOverlay'
import GameHUD from './three/ui/GameHUD'
import MonitorOverlay from './MonitorOverlay'
import LoadingScreen from './LoadingScreen'
import { createScene } from './three/setup/createScene'
import { createWorld } from './three/setup/createWorld'
import { createBuildings } from './three/setup/createBuildings'
import { createCabin } from './three/setup/createCabin'
import { createProps } from './three/setup/createProps'
import { createPlayer } from './three/setup/createPlayer'
import { createCliff } from './three/setup/createCliff'
import { createProjectDisplays } from './three/setup/createProjectDisplays'
import { createMemoryLaneDisplays } from './three/setup/createMemoryLaneDisplays'
import { createProjectObjects } from './three/setup/createProjectObjects'
import { createPark } from './three/setup/createPark'
import { createExhibit } from './three/setup/createExhibit'
import { createCar } from './three/setup/createCar'
import { createSkillsZone } from './three/setup/createSkillsZone'
import { createBowling } from './three/minigames/bowling'
import { createRingToss } from './three/minigames/ringtoss'
import { createAnimateLoop } from './three/loop/animate'
import { BowlState, RTossState } from './three/constants'

// ─── Music playlist ───────────────────────────────────────────────────────────
const PLAYLIST = [
  { src: '/audio/[no copyright music] Space Aquarium - Lofi Study & Relaxation Music for Deep Focus.mp3', label: 'Space Aquarium' },
  { src: '/audio/[no copyright music] \'Gameplay\' cute background music.mp3',  label: 'Gameplay' },
  { src: '/audio/[no copyright music] \'Loading\' cute background music.mp3',   label: 'Loading' },
  { src: '/audio/[no copyright music] \'On The Top\' lofi background music.mp3', label: 'On The Top' },
  { src: '/audio/[no copyright music] \'little break\' lofi background music.mp3', label: 'little break' },
] as const

// ─── Main component ──────────────────────────────────────────────────────────
export default function ThreePortfolio({ onExit, skipMonitor = false }: { onExit: () => void; skipMonitor?: boolean }) {
  const mountRef          = useRef<HTMLDivElement>(null)
  const [pointerLocked, setPointerLocked] = useState(false)
  const [joyPos, setJoyPos]               = useState({ x: 0, y: 0 })
  // Background music / playlist
  const audioRef         = useRef<HTMLAudioElement | null>(null)
  const [musicMuted, setMusicMuted] = useState(false)
  const musicMutedRef    = useRef(false)
  const musicStarted     = useRef(false)
  const trackIdxRef      = useRef(0)
  const [nowPlaying, setNowPlaying] = useState<string | null>(null)
  const nowPlayingTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Radio proximity
  const radioGroupRef = useRef<THREE.Group | null>(null)
  const [nearRadio, setNearRadio] = useState(false)
  const nearRadioRef  = useRef(false)
  const RADIO_PROX    = 1.4
  const touchMoveRef    = useRef({ x: 0, y: 0 })
  const touchActiveRef  = useRef(false)
  const lookMoveRef     = useRef({ x: 0, y: 0 })
  const lookActiveRef   = useRef(false)
  const isMobileRef     = useRef(typeof window !== 'undefined' && window.innerWidth < 768)
  const [lookJoyPos, setLookJoyPos] = useState({ x: 0, y: 0 })
  // Bowling mini-game
  const [nearBowl, setNearBowl]           = useState(false)
  const [bowlDisplay, setBowlDisplay]     = useState<{ state: BowlState; score: number; hs: number }>({ state: 'idle', score: 0, hs: 0 })
  const bowlStateRef    = useRef<BowlState>('idle')
  const bowlAimRef      = useRef(0)
  const bowlTimerRef    = useRef(0)
  const bowlHSRef       = useRef(parseInt(localStorage.getItem('gabe-bowl-hs') || '0'))
  const nearBowlRef     = useRef(false)
  const bowlPowerRef    = useRef(0)
  const bowlPowerDirRef  = useRef(1)
  const bowlThrowKeyRef  = useRef(false)
  const powerBarRef      = useRef<HTMLDivElement>(null)
  // Bench sit
  const [nearBench, setNearBench] = useState(false)
  const [sitting, setSitting]     = useState(false)
  const sittingRef    = useRef(false)
  const [nearCar, setNearCar]   = useState(false)
  const [driving, setDriving]   = useState(false)
  const nearCarRef  = useRef(false)
  const [nearCradle, setNearCradle] = useState(false)
  const nearCradleRef = useRef(false)
  const [nearWipSign, setNearWipSign] = useState(false)
  const nearWipSignRef = useRef(false)
  const [wipSignOpen, setWipSignOpen] = useState(false)
  const wipSignOpenRef = useRef(false)
  const drivingRef  = useRef(false)
  const nearBenchRef  = useRef(false)
  const seatIdxRef    = useRef(0)
  // Chair sit
  const [nearChair, setNearChair] = useState(false)
  const nearChairRef = useRef(false)
  const sittingAtRef = useRef<'bench' | 'chair' | null>(null)
  const CHAIR_LOCAL_POS = new THREE.Vector3(1.8, 2.085, -1.8)
  const MONITOR_LOCAL_POS = new THREE.Vector3(2.0, 3.35, -2.20)
  const CHAIR_PROX = 1.25
  // Ring toss
  const [nearRToss, setNearRToss]       = useState(false)
  const [rtossDisplay, setRTossDisplay] = useState<{ state: RTossState; thrown: number; score: number; hs: number }>({ state: 'idle', thrown: 0, score: 0, hs: parseInt(localStorage.getItem('gabe-rtoss-hs') || '0') })
  const rtossStateRef    = useRef<RTossState>('idle')
  const rtossAimRef      = useRef(0)
  const rPowerRef        = useRef(0)
  const rPowerDirRef     = useRef(1)
  const rtossThrowKeyRef = useRef(false)
  const rtossTimerRef    = useRef(0)
  const nearRTossRef     = useRef(false)
  const rPowerBarRef     = useRef<HTMLDivElement>(null)
  const rtossThrownRef   = useRef(0)
  const focusPosRef     = useRef(new THREE.Vector3())
  const focusLookRef    = useRef(new THREE.Vector3())
  const focusActiveRef  = useRef(false)
  const overlayShownRef = useRef(false)
  const proxTimerRef    = useRef(0)
  const exitedRef       = useRef(false)
  const relockRef       = useRef<(() => void) | null>(null)
  // Jump
  const jumpPressedRef  = useRef(false)
  const onRampRef       = useRef(false)
  const onFloorRef      = useRef(false)
  // Ladder climb
  const climbingRef     = useRef(false)
  const [climbing, setClimbing] = useState(false)
  const [nearLadder, setNearLadder] = useState(false)
  const nearLadderRef   = useRef(false)
  // Project screen interact zones
  const [nearProject, setNearProject]   = useState(false)
  const nearProjectRef                  = useRef(false)
  const nearProjectLabelRef             = useRef('')
  const nearProjectUrlRef               = useRef('')
  // Cabin door + smoke
  const doorOpenRef     = useRef(false)
  const doorRotRef      = useRef(0)
  const doorPivotRef    = useRef<THREE.Group | null>(null)
  // Cabin light switch
  const cabLightOnRef   = useRef(true)
  const nearSwitchRef   = useRef(false)
  const switchNodeRef   = useRef<THREE.Object3D | null>(null)
  const [nearSwitch, setNearSwitch] = useState(false)
  const cabCeilLightRef = useRef<THREE.PointLight | null>(null)
  const monLightRef     = useRef<THREE.SpotLight | null>(null)
  const screenMatRef    = useRef<any>(null)
  const inCabinPrevRef  = useRef(true)
  // Monitor / go-outside
  const [monitorMode, setMonitorMode] = useState(!skipMonitor)
  const [monitorFading, setMonitorFading] = useState(false)
  // True once the player has been out in the 3D world. Entering via the 2D site
  // (skipMonitor) means they're already coming from the world, so it starts true.
  // Drives whether the cabin-computer stick figure greets or thanks you.
  const hasExploredRef = useRef(skipMonitor)
  // World asset loading screen
  const [worldLoading, setWorldLoading] = useState(true)
  const [loadFading, setLoadFading]     = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)
  // Initial "pan out of the monitor" is deferred until the loading screen is
  // gone (see finalizeLoad) so the cinematic isn't hidden behind it.
  const goOutsideRef    = useRef(false)
  const goToComputerRef = useRef(false)
  // While true, the cinematic camera holds at frame 0 (monitor view) instead of
  // advancing — used to freeze the pan-out until the loading screen clears.
  const cinematicHoldRef = useRef(false)
  const dayEnvRef = useRef<THREE.Texture | null>(null)
  // Cinematic camera transition
  const cinematicRef    = useRef({
    active: false, t: 0, duration: 2.8,
    fromPos: new THREE.Vector3(), toPos:   new THREE.Vector3(),
    fromLook: new THREE.Vector3(), toLook: new THREE.Vector3(),
    onDone: null as (() => void) | null,
  })
  // Lighting refs
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null)
  const sunLightRef     = useRef<THREE.DirectionalLight | null>(null)
  // Player bones + debug
  const playerWalkBlendRef  = useRef(0)
  const playerBonesRef = useRef<{
    lUpLeg?: THREE.Bone; rUpLeg?: THREE.Bone
    lLoLeg?: THREE.Bone; rLoLeg?: THREE.Bone
    lUpArm?: THREE.Bone; rUpArm?: THREE.Bone
    spine?:  THREE.Bone
  } | null>(null)
  const debugModeRef    = useRef(false)
  const debugPanelRef   = useRef<HTMLPreElement>(null)
  const fpsRef          = useRef<HTMLDivElement>(null)
  const minimapRef      = useRef<HTMLCanvasElement>(null)
  const movablesRef     = useRef<{ name: string; group: THREE.Group; meshes?: THREE.Object3D[]; scaleObj?: THREE.Object3D; isHitbox?: boolean }[]>([])
  const addSidewalkRef  = useRef<(() => void) | null>(null)
  const [debugOpen, setDebugOpen]         = useState(false)
  const [debugSel,  setDebugSel]          = useState(-1)
  const [debugStep, setDebugStep]         = useState(1)
  const [selPos,    setSelPos]            = useState<{ x: number; y: number; z: number } | null>(null)
  const [selRot,    setSelRot]            = useState<{ x: number; y: number; z: number } | null>(null)
  const [movablesVersion, setMovablesVersion] = useState(0)

  function exitFocus() {
    focusActiveRef.current  = false
    overlayShownRef.current = false
    proxTimerRef.current    = 0
    exitedRef.current       = true
    relockRef.current?.()
  }

  useEffect(() => {
    if (!audioRef.current) return
    audioRef.current.muted = monitorMode
    musicMutedRef.current  = monitorMode
    setMusicMuted(monitorMode)
  }, [monitorMode])

  // Reset fading flag whenever monitor is re-opened (sitting back at computer)
  useEffect(() => {
    if (monitorMode) setMonitorFading(false)
  }, [monitorMode])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    movablesRef.current = []
    const effectDisposedRef = { current: false }

    // ── Asset loading tracking ───────────────────────────────────────────
    // Every loader uses THREE.DefaultLoadingManager, so we can drive the
    // loading screen from it. We keep the overlay up until the queue drains
    // (debounced, since GLB callbacks kick off nested loads) plus a GPU
    // pre-warm, so the world is smooth the instant it's revealed.
    const mgr = THREE.DefaultLoadingManager
    const prevOnStart    = mgr.onStart
    const prevOnProgress = mgr.onProgress
    const prevOnLoad     = mgr.onLoad
    let finalizeTimer: ReturnType<typeof setTimeout> | null = null
    let progressRatio = 0
    let finalized = false

    const finalizeLoad = () => {
      if (finalized || effectDisposedRef.current) return
      finalized = true
      if (finalizeTimer) { clearTimeout(finalizeTimer); finalizeTimer = null }
      prewarmRender()              // compile shaders / upload buffers before reveal
      setLoadProgress(1)
      // Set up the pan-out-of-monitor cinematic now (camera snaps to the monitor
      // view) but hold it at frame 0 behind the loading screen, then release it
      // once the screen has fully faded so the whole transition is visible.
      if (skipMonitor) {
        goOutsideRef.current = true
        cinematicHoldRef.current = true
      }
      setLoadFading(true)
      setTimeout(() => {
        if (effectDisposedRef.current) return
        setWorldLoading(false)
        cinematicHoldRef.current = false
      }, 750)
    }

    mgr.onStart = (url, loaded, total) => {
      if (finalizeTimer) { clearTimeout(finalizeTimer); finalizeTimer = null }
      prevOnStart?.(url, loaded, total)
    }
    mgr.onProgress = (url, loaded, total) => {
      const r = total > 0 ? loaded / total : 0
      // Hold a touch below 1 so the bar only completes at the real finalize.
      progressRatio = Math.max(progressRatio, Math.min(0.97, r))
      if (!effectDisposedRef.current) setLoadProgress(progressRatio)
      prevOnProgress?.(url, loaded, total)
    }
    mgr.onLoad = () => {
      // Debounce: a GLB's onLoad callback often queues more loads.
      if (finalizeTimer) clearTimeout(finalizeTimer)
      finalizeTimer = setTimeout(finalizeLoad, 700)
      prevOnLoad?.()
    }
    // Hard fallback in case a load errors and the queue never fully drains.
    const loadFallback = setTimeout(finalizeLoad, 18000)

    // ── Scene, camera, renderer, physics ─────────────────────────────────
    const { scene, camera, renderer, physWorld } = createScene(mount, {
      dayEnvRef, ambientLightRef, sunLightRef, inCabinPrevRef,
    })

    // ── Collision arrays ──────────────────────────────────────────────────
    const cylCols: { x: number; z: number; r: number; maxY?: number }[] = []
    const boxCols: { x0: number; x1: number; z0: number; z1: number; maxY: number }[] = []
    const ceilCols: { x0: number; x1: number; z0: number; z1: number; minY: number }[] = []

    const CABIN_X = -5, CABIN_Z = 15
    const POND_X = -24, POND_Z = -36, POND_R = 3.2

    // ── World: ground, fence, roads, sidewalks ────────────────────────────
    const { swBaseTex, TILE } = createWorld(scene)

    // ── Cliff + water lake behind cabin ──────────────────────────────────
    const cliff = createCliff(scene)

    // ── Project building displays ─────────────────────────────────────────
    const projectDisplays = createProjectDisplays(scene)

    // ── Memory Lane displays ──────────────────────────────────────────────
    const memoryLaneDisplays = createMemoryLaneDisplays(scene, movablesRef.current)

    // ── Project Blvd rotating objects ─────────────────────────────────────
    const projectObjects = createProjectObjects(scene, movablesRef.current)

    // ── Three.js Exhibit (SW quadrant) ────────────────────────────────────
    const exhibit = createExhibit(scene, movablesRef.current, physWorld, camera)

    // ── Park ──────────────────────────────────────────────────────────────
    const { addSidewalk, updateWipSign } = createPark(scene, movablesRef.current, cylCols, boxCols)
    addSidewalkRef.current = addSidewalk

    // ── Skills zone (Memory Lane, south of buildings) ────────────────────────
    const { update: skillsZoneUpdate } = createSkillsZone(scene, movablesRef.current)

    // ── Car ───────────────────────────────────────────────────────────────────
    const { carGrp, carCol, carHitboxGrp } = createCar(scene, cylCols)

    const FIRE_POS = new THREE.Vector3(0, 0, -14)

    // ── Buildings ─────────────────────────────────────────────────────────
    createBuildings(scene, boxCols, ceilCols, swBaseTex, TILE, CABIN_X, movablesRef.current)

    // ── Cabin ─────────────────────────────────────────────────────────────
    const { cabGrp, rampGrp, cabHitboxEntries, clockInterval } = createCabin(
      scene,
      { doorPivotRef, cabCeilLightRef, monLightRef, switchNodeRef, radioGroupRef, screenMatRef },
      MONITOR_LOCAL_POS,
    )

    // ── Props: campfire, benches, pond, ducks, balls, trampoline ──────────
    const {
      FIRE_POS: _fp,
      campfireGrp,
      flameMat, flameMesh, innerFlameMesh, fireLight,
      ffMesh, ffData,
      benchGrp: _benchGrp,
      ducks, pondGrp, pitGrp, trampGrp,
      balls,
      ringLine, ringGeo,
      waterUpdate, smokeUpdate,
    } = createProps(scene, physWorld, cylCols, boxCols, POND_X, POND_Z, POND_R)
    void _fp
    movablesRef.current.push({ name: '🔥 Campfire Seating', group: campfireGrp, scaleObj: campfireGrp })
    movablesRef.current.push({ name: '🪴 Pond', group: pondGrp })
    movablesRef.current.push({ name: '🎱 Ball Pit', group: pitGrp })
    movablesRef.current.push({ name: '🤸 Trampoline', group: trampGrp })

    // ── Bowling ───────────────────────────────────────────────────────────
    const {
      bowlGrp,
      pinMeshes, pinBodies,
      bowlBallMesh, bowlBallBody,
      aimArrow,
      resetBowling: _resetBowling,
      throwBowl: _throwBowl,
    } = createBowling(scene, physWorld, bowlAimRef, bowlPowerRef)
    movablesRef.current.push({ name: '🎳 Bowling Alley', group: bowlGrp })

    // ── Ring Toss ─────────────────────────────────────────────────────────
    const {
      rtossGrp,
      ringMeshes, ringBodies,
      resetRingToss: _resetRingToss,
      throwRing: _throwRing,
    } = createRingToss(scene, physWorld, rtossAimRef, rPowerRef)
    movablesRef.current.push({ name: '🥏 Ring Toss', group: rtossGrp })

    function resetBowling() {
      _resetBowling()
      bowlTimerRef.current    = 0
      bowlPowerDirRef.current = 1
      bowlThrowKeyRef.current = false
    }
    function throwBowl() { _throwBowl(bowlAimRef.current, bowlPowerRef.current) }
    function resetRingToss() {
      _resetRingToss()
      rtossTimerRef.current    = 0
      rPowerDirRef.current     = 1
      rtossThrowKeyRef.current = false
      rtossThrownRef.current   = 0
    }
    function throwRing(ringIdx: number) { _throwRing(ringIdx, rtossAimRef.current, rPowerRef.current) }

    // ── Register cabin movables (collision system + door debug) ──────────
    movablesRef.current.push(
      { name: '🏕 Cabin group', group: cabGrp },
      { name: '🪜 Ramp hitbox (cabin local)', group: rampGrp, isHitbox: true },
      ...cabHitboxEntries,
    )

    // ── Player ────────────────────────────────────────────────────────────
    const { player, lArmPivot, rArmPivot, lLegPivot, rLegPivot, lKnee, rKnee, lElbow, rElbow } =
      createPlayer(scene, playerBonesRef, effectDisposedRef)

    // ── Input ─────────────────────────────────────────────────────────────
    const keys = new Set<string>()
    relockRef.current = () => renderer.domElement.requestPointerLock()

    function keyToWASD(key: string): string {
      if (key === 'arrowup') return 'w'; if (key === 'arrowdown') return 's'
      if (key === 'arrowleft') return 'a'; if (key === 'arrowright') return 'd'
      return key
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === '`') {
        debugModeRef.current = !debugModeRef.current
        if (debugPanelRef.current) debugPanelRef.current.style.display = debugModeRef.current ? 'block' : 'none'
        setDebugOpen(d => !d); return
      }
      if (e.key.toLowerCase() === 'f' && musicStarted.current) {
        playTrack(trackIdxRef.current + 1); return
      }
      const mapped = keyToWASD(e.key.toLowerCase())
      keys.add(mapped)
      if (['w', 'a', 's', 'd'].includes(mapped) && (focusActiveRef.current || overlayShownRef.current)) { exitFocus(); return }
      const bs = bowlStateRef.current
      if (bs === 'idle' && mapped === 'e' && nearBowlRef.current) {
        e.preventDefault(); bowlStateRef.current = 'aiming'; setBowlDisplay(p => ({ ...p, state: 'aiming', score: 0 })); return
      }
      if (bs === 'aiming') {
        if (e.key === 'Escape') { bowlThrowKeyRef.current = false; bowlStateRef.current = 'idle'; resetBowling(); setBowlDisplay(p => ({ ...p, state: 'idle' })); setNearBowl(false) }
        if (e.key === ' ' || e.key.toLowerCase() === 'e') bowlThrowKeyRef.current = true
        return
      }
      if (bs === 'result') {
        if (mapped === 'e' || e.key === ' ') { e.preventDefault(); resetBowling(); bowlStateRef.current = 'aiming'; setBowlDisplay(p => ({ ...p, state: 'aiming', score: 0 })) }
        else if (e.key === 'Escape') { resetBowling(); bowlStateRef.current = 'idle'; setBowlDisplay(p => ({ ...p, state: 'idle' })); setNearBowl(false); nearBowlRef.current = false }
        return
      }
      // Exit car on E or Escape (WASD steers while driving, so don't exit on movement)
      if (drivingRef.current && (mapped === 'e' || e.key === 'Escape')) {
        drivingRef.current = false; setDriving(false)
        nearCarRef.current = false; setNearCar(false)
        relockRef.current?.(); return
      }
      // Enter car
      if (mapped === 'e' && nearCarRef.current && !drivingRef.current && !sittingRef.current && bowlStateRef.current === 'idle' && rtossStateRef.current === 'idle') {
        drivingRef.current = true; setDriving(true); document.exitPointerLock(); return
      }
      if (sittingRef.current && (mapped === 'e' || ['w', 'a', 's', 'd'].includes(mapped))) {
        sittingRef.current = false; sittingAtRef.current = null; setSitting(false)
        nearBenchRef.current = false; setNearBench(false); nearChairRef.current = false; setNearChair(false)
        relockRef.current?.()
        if (mapped === 'e') return
      }
      if (mapped === 'e' && !sittingRef.current && bowlStateRef.current === 'idle' && rtossStateRef.current === 'idle') {
        if (nearBenchRef.current) { sittingRef.current = true; sittingAtRef.current = 'bench'; setSitting(true); document.exitPointerLock(); return }
        if (nearChairRef.current) { goToComputerRef.current = true; return }
        if (nearRadioRef.current && audioRef.current) { audioRef.current.muted = !audioRef.current.muted; musicMutedRef.current = audioRef.current.muted; setMusicMuted(audioRef.current.muted); return }
        if (nearProjectRef.current && nearProjectUrlRef.current) { window.open(nearProjectUrlRef.current, '_blank'); return }
        if (nearCradleRef.current) { exhibit.startCradle(); return }
        if (nearWipSignRef.current) { wipSignOpenRef.current = true; setWipSignOpen(true); document.exitPointerLock(); return }
      }
      if (climbingRef.current && (mapped === 'e' || e.key === 'Escape')) { climbingRef.current = false; setClimbing(false); nearLadderRef.current = false; setNearLadder(false) }
      if (!climbingRef.current && nearLadderRef.current && mapped === 'w' && bowlStateRef.current === 'idle' && rtossStateRef.current === 'idle' && !sittingRef.current) { climbingRef.current = true; setClimbing(true) }
      if (rtossStateRef.current === 'idle' && mapped === 'e' && nearRTossRef.current) {
        e.preventDefault(); resetRingToss(); rtossStateRef.current = 'aiming'; rtossThrownRef.current = 0
        setRTossDisplay({ state: 'aiming', thrown: 0, score: 0, hs: parseInt(localStorage.getItem('gabe-rtoss-hs') || '0') }); return
      }
      if (rtossStateRef.current === 'aiming') {
        if (e.key === 'Escape') { rtossThrowKeyRef.current = false; rtossStateRef.current = 'idle'; resetRingToss(); setRTossDisplay(p => ({ ...p, state: 'idle' })); setNearRToss(false); nearRTossRef.current = false }
        if (e.key === ' ' || e.key.toLowerCase() === 'e') rtossThrowKeyRef.current = true
        return
      }
      if (rtossStateRef.current === 'result') {
        if (mapped === 'e' || e.key === ' ') { e.preventDefault(); resetRingToss(); rtossStateRef.current = 'aiming'; rtossThrownRef.current = 0; setRTossDisplay(p => ({ ...p, state: 'aiming', thrown: 0, score: 0 })) }
        else if (e.key === 'Escape') { resetRingToss(); rtossStateRef.current = 'idle'; setRTossDisplay(p => ({ ...p, state: 'idle' })); setNearRToss(false); nearRTossRef.current = false }
        return
      }
      if (e.key === ' ' && bowlStateRef.current === 'idle' && rtossStateRef.current === 'idle' && !focusActiveRef.current && !sittingRef.current) { jumpPressedRef.current = true; return }
      if (mapped === 'e' && nearSwitchRef.current) {
        cabLightOnRef.current = !cabLightOnRef.current
        const on = cabLightOnRef.current
        if (cabCeilLightRef.current) {
          cabCeilLightRef.current.visible = on
          const { bulb, dome, rim } = cabCeilLightRef.current.userData as { bulb?: THREE.Mesh; dome?: THREE.Mesh; rim?: THREE.Mesh }
          if (bulb) bulb.visible = on; if (dome) dome.visible = on; if (rim) rim.visible = on
        }
        if (monLightRef.current) { monLightRef.current.intensity = on ? 1.2 : 3.5; monLightRef.current.distance = on ? 5 : 8 }
        return
      }
      if (e.key === 'Escape' && wipSignOpenRef.current) { wipSignOpenRef.current = false; setWipSignOpen(false); relockRef.current?.(); return }
      if (e.key === 'Escape' && focusActiveRef.current) exitFocus()
    }
    const onKeyUp = (e: KeyboardEvent) => {
      keys.delete(keyToWASD(e.key.toLowerCase()))
      if (bowlStateRef.current === 'aiming' && bowlThrowKeyRef.current && (e.key === ' ' || e.key.toLowerCase() === 'e')) {
        bowlThrowKeyRef.current = false; throwBowl(); bowlStateRef.current = 'thrown'; bowlTimerRef.current = 0; setBowlDisplay(p => ({ ...p, state: 'thrown' }))
      }
      if (rtossStateRef.current === 'aiming' && rtossThrowKeyRef.current && (e.key === ' ' || e.key.toLowerCase() === 'e')) {
        rtossThrowKeyRef.current = false; throwRing(rtossThrownRef.current); rtossThrownRef.current++; rtossTimerRef.current = 0; rtossStateRef.current = 'thrown'
        setRTossDisplay(p => ({ ...p, state: 'thrown', thrown: rtossThrownRef.current }))
      }
    }
    const onBlur = () => keys.clear()
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup',   onKeyUp)
    window.addEventListener('blur',    onBlur)

    // ── Music helpers ─────────────────────────────────────────────────────
    const playTrack = (idx: number) => {
      const next = ((idx % PLAYLIST.length) + PLAYLIST.length) % PLAYLIST.length
      trackIdxRef.current = next
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = '' }
      const audio = new Audio(PLAYLIST[next].src)
      audio.volume = 0.35
      audio.muted = musicMutedRef.current
      audio.play().catch(() => {})
      audio.addEventListener('ended', () => playTrack(trackIdxRef.current + 1))
      audioRef.current = audio
      if (nowPlayingTimer.current) clearTimeout(nowPlayingTimer.current)
      setNowPlaying(PLAYLIST[next].label)
      nowPlayingTimer.current = setTimeout(() => setNowPlaying(null), 3500)
    }

    // ── Pointer lock ──────────────────────────────────────────────────────
    const MOUSE_SENS = 0.0022
    const animStateHolder: { st: { camYaw: number; camPitch: number } | null } = { st: null }
    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== renderer.domElement) return
      if (focusActiveRef.current || bowlStateRef.current !== 'idle') return
      const st = animStateHolder.st; if (!st) return
      st.camYaw -= e.movementX * MOUSE_SENS
      st.camPitch = THREE.MathUtils.clamp(st.camPitch + e.movementY * MOUSE_SENS, -1.3, 1.3)
    }
    const onPointerLockChange = () => {
      const locked = document.pointerLockElement === renderer.domElement
      setPointerLocked(locked)
      if (!locked) keys.clear()
      if (locked && !musicStarted.current) {
        musicStarted.current = true
        playTrack(0)
      }
    }
    const onCanvasClick = () => { if (!focusActiveRef.current && bowlStateRef.current === 'idle') renderer.domElement.requestPointerLock() }
    renderer.domElement.addEventListener('click', onCanvasClick)
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('pointerlockchange', onPointerLockChange)

    // ── Animation loop ────────────────────────────────────────────────────
    const loop = createAnimateLoop({
      scene, camera, renderer, physWorld,
      player, cabGrp, rampGrp, aimArrow,
      flameMat, flameMesh, innerFlameMesh, fireLight,
      ffMesh, ffData, ducks, pondGrp, balls,
      pinMeshes, pinBodies, bowlBallMesh, bowlBallBody,
      ringMeshes, ringBodies, ringLine, ringGeo,
      lArmPivot, rArmPivot, lLegPivot, rLegPivot,
      lKnee, rKnee, lElbow, rElbow,
      cylCols, boxCols, ceilCols,
      CABIN_X, CABIN_Z, POND_X, POND_Z, POND_R,
      FIRE_POS, CHAIR_LOCAL_POS, MONITOR_LOCAL_POS, CHAIR_PROX, RADIO_PROX,
      keys, touchMoveRef, lookMoveRef, isMobileRef,
      bowlStateRef, rtossStateRef, focusActiveRef, overlayShownRef,
      sittingRef, sittingAtRef, seatIdxRef, climbingRef,
      jumpPressedRef, onRampRef, onFloorRef,
      doorPivotRef, doorOpenRef, doorRotRef,
      cabLightOnRef, nearSwitchRef, switchNodeRef, cabCeilLightRef, monLightRef,
      inCabinPrevRef, goOutsideRef, goToComputerRef,
      dayEnvRef, ambientLightRef, sunLightRef,
      cinematicRef, cinematicHoldRef, playerBonesRef, playerWalkBlendRef,
      bowlAimRef, bowlPowerRef, bowlPowerDirRef, bowlTimerRef, bowlHSRef, bowlThrowKeyRef, powerBarRef,
      rtossAimRef, rPowerRef, rPowerDirRef, rtossTimerRef, rtossThrownRef, rtossThrowKeyRef, rPowerBarRef,
      nearBowlRef, nearRTossRef, nearBenchRef, nearChairRef, nearLadderRef, nearRadioRef,
      radioGroupRef, focusPosRef, focusLookRef, movablesRef, debugModeRef, debugPanelRef,
      setNearBowl, setNearRToss, setNearBench, setNearChair,
      setNearLadder, setNearSwitch, setNearRadio, setClimbing, setMonitorMode,
      setBowlDisplay, setRTossDisplay,
      cliffUpdate:          cliff.update,
      projectDisplayUpdate: projectDisplays.update,
      projectObjectsUpdate: projectObjects.update,
      exhibitUpdate:        exhibit.update,
      waterUpdate, smokeUpdate, skillsZoneUpdate,
      interactZones:        [...projectDisplays.interactZones, ...memoryLaneDisplays.interactZones],
      nearProjectRef, nearProjectLabelRef, nearProjectUrlRef,
      setNearProject,
      carGrp, carCol, carHitboxGrp, drivingRef, nearCarRef, setNearCar, setDriving,
      nearCradleRef, setNearCradle,
      nearWipSignRef, setNearWipSign, wipSignUpdate: updateWipSign,
      fpsRef, minimapRef,
    })
    animStateHolder.st = (loop as any).__animState
    loop.start()

    // Pre-warm GPU. The player spawns INSIDE the cabin, where scene.environment
    // is null; stepping outside swaps it to the day env map, which forces every
    // visible material to recompile its env-mapped shader variant — the cause of
    // the cabin-exit lag spike. renderer.compile() compiles ALL materials in the
    // scene graph (unlike render(), which frustum-culls everything behind the
    // cabin walls), so we compile the outdoor variants ahead of time. We then do
    // a tiny offscreen render to upload geometry buffers. Re-run at 5 s and 10 s
    // to catch GLBs that finish loading late.
    function prewarmRender() {
      if (effectDisposedRef.current || !dayEnvRef.current) return
      const savedEnv = scene.environment
      scene.environment = dayEnvRef.current
      // Compile every material in the scene with the outdoor env active.
      renderer.compile(scene, camera)
      // Render once with frustum culling disabled so geometry buffers for objects
      // behind the cabin walls (the whole outdoor world) upload now, not on the
      // first frame after stepping outside.
      const culledOff: THREE.Object3D[] = []
      scene.traverse(o => {
        const m = o as THREE.Mesh
        if ((m.isMesh || (m as any).isInstancedMesh) && m.frustumCulled) {
          m.frustumCulled = false
          culledOff.push(m)
        }
      })
      // Warm the sun shadow map over the outdoor area. The animate loop keeps the
      // shadow camera centred on the player (inside the cabin during loading), so
      // outdoor shadow casters would otherwise compile their depth shaders + upload
      // on the first frame after walking out. Aim the light at the park, force a
      // shadow update, then let the loop snap it back next frame.
      const sun = sunLightRef.current
      let savedSunPos: THREE.Vector3 | null = null
      let savedTgt: THREE.Vector3 | null = null
      if (sun) {
        savedSunPos = sun.position.clone()
        savedTgt = sun.target.position.clone()
        sun.target.position.set(4, 0, -30)        // park centre
        sun.position.set(24, 40, -15)
        sun.target.updateMatrixWorld()
        sun.shadow.needsUpdate = true
      }

      const rt = new THREE.WebGLRenderTarget(1, 1)
      renderer.setRenderTarget(rt)
      renderer.render(scene, camera)
      renderer.setRenderTarget(null)
      rt.dispose()

      if (sun && savedSunPos && savedTgt) {
        sun.position.copy(savedSunPos)
        sun.target.position.copy(savedTgt)
        sun.target.updateMatrixWorld()
      }
      culledOff.forEach(o => { (o as THREE.Mesh).frustumCulled = true })
      scene.environment = savedEnv
    }
    const prewarmId1 = setTimeout(prewarmRender, 5000)
    const prewarmId2 = setTimeout(prewarmRender, 10000)

    const onResize = () => { const w = mount.clientWidth, h = mount.clientHeight; camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h) }
    window.addEventListener('resize', onResize)
    document.body.style.overflow = 'hidden'; document.documentElement.style.overflow = 'hidden'

    return () => {
      clearTimeout(prewarmId1)
      clearTimeout(prewarmId2)
      clearTimeout(loadFallback)
      if (finalizeTimer) clearTimeout(finalizeTimer)
      mgr.onStart = prevOnStart; mgr.onProgress = prevOnProgress; mgr.onLoad = prevOnLoad
      effectDisposedRef.current = true; playerBonesRef.current = null
      document.body.style.overflow = ''; document.documentElement.style.overflow = ''
      document.title = 'Gabriel Bullerman — Full-Stack Developer'
      loop.stop()
      window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); window.removeEventListener('blur', onBlur); window.removeEventListener('resize', onResize)
      renderer.domElement.removeEventListener('click', onCanvasClick); document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('pointerlockchange', onPointerLockChange)
      if (document.pointerLockElement === renderer.domElement) document.exitPointerLock()
      clearInterval(clockInterval)
      if (nowPlayingTimer.current) clearTimeout(nowPlayingTimer.current)
      audioRef.current?.pause(); renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
      while (physWorld.bodies.length > 0) physWorld.removeBody(physWorld.bodies[0])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="fixed inset-0 w-screen overflow-hidden overscroll-none touch-none" style={{ height: '100dvh', paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div ref={mountRef} className="w-full h-full touch-none" />
      {worldLoading && <LoadingScreen progress={loadProgress} fading={loadFading} />}
      {monitorMode && (<MonitorOverlay fading={monitorFading} hasExplored={hasExploredRef.current} onGoOutside={(snapshot) => {
        if (snapshot && screenMatRef.current) {
          const tex = new THREE.CanvasTexture(snapshot)
          tex.flipY = false; tex.repeat.set(1, -1); tex.offset.set(0, 1)
          screenMatRef.current.map = tex
          screenMatRef.current.needsUpdate = true
        }
        // Leaving the monitor for the world — next time they sit down, thank them.
        hasExploredRef.current = true
        // Start cinematic + fade overlay simultaneously; unmount after fade completes
        goOutsideRef.current = true
        relockRef.current?.()
        setMonitorFading(true)
        setTimeout(() => setMonitorMode(false), 650)
      }} />)}
      <button onClick={onExit} className="absolute left-4 z-10 px-4 py-2 bg-black/75 backdrop-blur-sm text-white border border-white/30 rounded-full font-bold text-sm hover:bg-white hover:text-black transition-colors duration-300" style={{ top: 'calc(env(safe-area-inset-top) + 1rem)' }}>← 2D View</button>
      <div ref={fpsRef} className="absolute right-4 z-10 px-2 py-1 bg-black/60 text-green-400 font-mono text-xs rounded pointer-events-none select-none" style={{ top: 'calc(env(safe-area-inset-top) + 1rem)', display: debugOpen ? 'block' : 'none' }} />
      <canvas ref={minimapRef} width={120} height={90} className="absolute bottom-20 right-4 z-20 rounded-lg pointer-events-none select-none hidden md:block" style={{ opacity: 0.85, border: '1px solid rgba(255,255,255,0.12)' }} />
      <GameHUD monitorMode={monitorMode} pointerLocked={pointerLocked} musicMuted={musicMuted} nearBowl={nearBowl} nearRToss={nearRToss} nearBench={nearBench} nearChair={nearChair} nearLadder={nearLadder} nearSwitch={nearSwitch} nearRadio={nearRadio} nearProject={nearProject} nearProjectLabel={nearProjectLabelRef.current} sitting={sitting} climbing={climbing} nearCar={nearCar} driving={driving} nearCradle={nearCradle} nearWipSign={nearWipSign} bowlDisplay={bowlDisplay} rtossDisplay={rtossDisplay} joyPos={joyPos} powerBarRef={powerBarRef} rPowerBarRef={rPowerBarRef} touchMoveRef={touchMoveRef} touchActiveRef={touchActiveRef} setJoyPos={setJoyPos} lookMoveRef={lookMoveRef} lookActiveRef={lookActiveRef} lookJoyPos={lookJoyPos} setLookJoyPos={setLookJoyPos} />
      <DebugOverlay debugOpen={debugOpen} debugSel={debugSel} debugStep={debugStep} selPos={selPos} selRot={selRot} movablesRef={movablesRef} debugPanelRef={debugPanelRef} setDebugSel={setDebugSel} setSelPos={setSelPos} setSelRot={setSelRot} setDebugStep={setDebugStep} movablesVersion={movablesVersion} onAddSidewalk={() => { addSidewalkRef.current?.(); setMovablesVersion(v => v + 1) }} />
      {nowPlaying && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2 bg-black/70 backdrop-blur-sm text-white text-xs rounded-full pointer-events-none select-none animate-fade-in">
          <span className="text-white/60">♪</span>
          <span>{nowPlaying}</span>
          <span className="text-white/40 text-[10px]">F to skip</span>
        </div>
      )}
      {wipSignOpen && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => { wipSignOpenRef.current = false; setWipSignOpen(false); relockRef.current?.() }}>
          <div className="relative bg-amber-50 border-4 border-amber-700 rounded-2xl shadow-2xl max-w-lg w-full mx-4 p-6 text-stone-800" onClick={e => e.stopPropagation()}>
            {/* Construction tape header */}
            <div className="absolute -top-4 left-0 right-0 h-7 rounded-t-xl overflow-hidden" style={{ background: 'repeating-linear-gradient(45deg, #FFD700 0px, #FFD700 14px, #111 14px, #111 28px)' }} />
            <div className="absolute -bottom-4 left-0 right-0 h-7 rounded-b-xl overflow-hidden" style={{ background: 'repeating-linear-gradient(45deg, #FFD700 0px, #FFD700 14px, #111 14px, #111 28px)' }} />
            <div className="mt-2 mb-2">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">⚠</span>
                <h2 className="text-2xl font-black text-amber-800 uppercase tracking-wide">Work In Progress</h2>
                <span className="text-3xl">⚠</span>
              </div>
              <p className="text-sm text-stone-600 mb-4 italic">This 3D portfolio is actively being built — here's what's already in it and what's coming:</p>
              <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                {[
                  { icon: '🌐', label: 'Three.js + WebGL', desc: 'Full 3D world built from scratch' },
                  { icon: '🏎️', label: 'Drivable Car', desc: 'WASD steering, physics-feel' },
                  { icon: '🎵', label: 'Music Player', desc: 'Lofi playlist, press F to skip' },
                  { icon: '🎳', label: 'Mini-Games', desc: 'Bowling + Ring Toss with hi-scores' },
                  { icon: '📦', label: 'Model Importing', desc: 'GLTF/FBX assets from Blender' },
                  { icon: '📱', label: 'Mobile Support', desc: 'Touch joysticks + responsive UI' },
                  { icon: '⚡', label: 'Performance', desc: 'Instancing, LOD, lazy-loading' },
                  { icon: '🎨', label: 'Themes (soon)', desc: 'Day/night + seasonal modes' },
                  { icon: '🗺️', label: 'Open World', desc: 'Park, cabin, buildings, exhibits' },
                  { icon: '👤', label: 'About Me', desc: 'CS student @ Iowa State, May \'26' },
                ].map(({ icon, label, desc }) => (
                  <div key={label} className="flex items-start gap-2 bg-amber-100 rounded-lg p-2">
                    <span className="text-lg leading-none mt-0.5">{icon}</span>
                    <div>
                      <div className="font-bold text-xs text-amber-900">{label}</div>
                      <div className="text-xs text-stone-500">{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <button
                className="w-full py-2 bg-amber-700 hover:bg-amber-600 text-white font-bold rounded-lg transition-colors text-sm"
                onClick={() => { wipSignOpenRef.current = false; setWipSignOpen(false); relockRef.current?.() }}
              >
                Close (Esc)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
