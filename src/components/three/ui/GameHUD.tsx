import React, { useRef } from 'react'
import { BowlState, RTossState, RTOSS_RINGS } from '../constants'

interface BowlDisplay  { state: BowlState;  score: number; hs: number }
interface RTossDisplay { state: RTossState; thrown: number; score: number; hs: number }

interface GameHUDProps {
  monitorMode:      boolean
  pointerLocked:    boolean
  musicMuted:       boolean
  nearBowl:         boolean
  nearRToss:        boolean
  nearBench:        boolean
  nearChair:        boolean
  nearLadder:       boolean
  nearSwitch:       boolean
  nearRadio:        boolean
  nearProject:      boolean
  nearProjectLabel: string
  sitting:          boolean
  climbing:         boolean
  nearCar:          boolean
  driving:          boolean
  nearCradle:       boolean
  bowlDisplay:    BowlDisplay
  rtossDisplay:   RTossDisplay
  joyPos:         { x: number; y: number }
  powerBarRef:    React.Ref<HTMLDivElement>
  rPowerBarRef:   React.Ref<HTMLDivElement>
  touchMoveRef:   React.MutableRefObject<{ x: number; y: number }>
  touchActiveRef: React.MutableRefObject<boolean>
  setJoyPos:      (p: { x: number; y: number }) => void
  lookMoveRef:    React.MutableRefObject<{ x: number; y: number }>
  lookActiveRef:  React.MutableRefObject<boolean>
  lookJoyPos:     { x: number; y: number }
  setLookJoyPos:  (p: { x: number; y: number }) => void
}

export default function GameHUD({
  monitorMode, pointerLocked, musicMuted,
  nearBowl, nearRToss, nearBench, nearChair, nearLadder, nearSwitch, nearRadio,
  nearProject, nearProjectLabel,
  sitting, climbing, nearCar, driving, nearCradle,
  bowlDisplay, rtossDisplay,
  joyPos, powerBarRef, rPowerBarRef,
  touchMoveRef, touchActiveRef, setJoyPos,
  lookMoveRef, lookActiveRef, lookJoyPos, setLookJoyPos,
}: GameHUDProps) {
  // nearLadder excluded: climbing uses joystick-up (W), not the E/Inspect button
  const hasNearby = nearBowl || nearRToss || nearBench || nearSwitch || nearProject || nearChair || nearRadio || nearCar || nearCradle
  const moveTouchId = useRef(-1)
  const lookTouchId = useRef(-1)

  const inspectLabel =
    nearProject  ? 'Open Repo'
    : nearBowl   ? 'Bowl'
    : nearRToss  ? 'Ring Toss'
    : nearChair  ? 'Use Computer'
    : nearBench  ? 'Sit Down'
    : nearCar    ? 'Enter Car'
    : nearCradle ? 'Start Cradle'
    : nearRadio  ? (musicMuted ? 'Unmute Music' : 'Mute Music')
    : nearSwitch ? 'Toggle Light'
    : 'Interact'

  const dispatchE = (type: 'keydown' | 'keyup') =>
    window.dispatchEvent(new KeyboardEvent(type, { key: 'e', bubbles: true }))

  return (
    <>
      {/* "Use computer" prompt — desktop only (mobile uses Inspect button) */}
      {!monitorMode && nearChair && (
        <div className="hidden md:block absolute bottom-20 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="bg-black/70 backdrop-blur-sm text-white text-sm px-4 py-2 rounded-full flex items-center gap-2">
            <kbd className="bg-white/20 text-xs px-1.5 py-0.5 rounded font-mono">E</kbd>
            Use Computer
          </div>
        </div>
      )}

      {/* Click-to-look prompt — desktop only */}
      {!monitorMode && !pointerLocked && bowlDisplay.state === 'idle' && !sitting && (
        <div className="hidden md:flex absolute inset-0 items-center justify-center pointer-events-none">
          <div className="bg-black/50 backdrop-blur-sm text-white text-sm px-5 py-2 rounded-full opacity-70">
            Click to look around
          </div>
        </div>
      )}

      {/* Muted indicator */}
      {musicMuted && (
        <div
          className="absolute z-10 px-3 py-1.5 bg-black/60 backdrop-blur-sm text-white/70 rounded-full text-xs pointer-events-none select-none"
          style={{ top: 'calc(env(safe-area-inset-top) + 1rem)', right: '1rem' }}
        >
          🔇 muted
        </div>
      )}

      {/* Radio interaction prompt — desktop only (mobile uses Inspect button) */}
      {!monitorMode && nearRadio && (
        <div className="hidden md:block absolute bottom-20 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="bg-black/70 backdrop-blur-sm text-white text-sm px-4 py-2 rounded-full flex items-center gap-2">
            <kbd className="bg-white/20 text-xs px-1.5 py-0.5 rounded font-mono">E</kbd>
            {musicMuted ? 'Unmute Music' : 'Mute Music'}
            <span className="text-white/40">·</span>
            <kbd className="bg-white/20 text-xs px-1.5 py-0.5 rounded font-mono">F</kbd>
            Next Track
          </div>
        </div>
      )}

      {/* Bowling overlay */}
      {bowlDisplay.state !== 'idle' && (
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 4rem)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}>
          <div className="flex gap-8 bg-black/70 backdrop-blur-sm text-white px-8 py-3 rounded-full text-sm font-bold">
            <span>Score: <span className="text-yellow-300">{bowlDisplay.score}</span></span>
            <span className="opacity-40">|</span>
            <span>Best: <span className="text-green-300">{bowlDisplay.hs}</span></span>
          </div>
          <div className="flex-1 flex items-center">
          <div className="text-center">
            {bowlDisplay.state === 'aiming' && (
              <div className="bg-black/70 backdrop-blur-sm text-white px-6 py-4 rounded-2xl text-sm space-y-3 min-w-64">
                <div className="hidden md:block text-center opacity-70 text-xs">
                  <kbd className="font-bold bg-white/20 px-1.5 rounded">A</kbd> / <kbd className="font-bold bg-white/20 px-1.5 rounded">D</kbd> to aim &nbsp;·&nbsp; <kbd className="font-bold bg-white/20 px-1.5 rounded">Esc</kbd> to cancel
                </div>
                <div className="md:hidden text-center opacity-70 text-xs">Joystick left/right to aim</div>
                <div>
                  <div className="flex justify-between text-xs opacity-60 mb-1">
                    <span>POWER</span>
                    <span className="hidden md:inline">hold <kbd className="font-bold bg-white/20 px-1 rounded">Space</kbd> / <kbd className="font-bold bg-white/20 px-1 rounded">E</kbd> — release to throw</span>
                    <span className="md:hidden">hold <strong>Throw</strong> — release to bowl</span>
                  </div>
                  <div className="w-full h-4 bg-white/20 rounded-full overflow-hidden">
                    <div ref={powerBarRef} className="h-full rounded-full transition-none"
                      style={{ width: '0%', background: 'linear-gradient(90deg, #22c55e, #eab308, #ef4444)' }} />
                  </div>
                </div>
              </div>
            )}
            {bowlDisplay.state === 'thrown' && (
              <div className="bg-black/70 backdrop-blur-sm text-white px-6 py-3 rounded-2xl text-sm animate-pulse">
                Ball in motion...
              </div>
            )}
            {bowlDisplay.state === 'result' && (
              <div className="bg-black/70 backdrop-blur-sm text-white px-8 py-4 rounded-2xl text-center space-y-2">
                <div className="text-2xl font-bold">
                  {bowlDisplay.score === 10 ? 'STRIKE! ' : ''}{bowlDisplay.score} / 10 pins
                </div>
                {bowlDisplay.score === bowlDisplay.hs && bowlDisplay.score > 0 && (
                  <div className="text-green-300 text-sm font-bold">New Best!</div>
                )}
                <div className="hidden md:block text-xs opacity-70 mt-1"><kbd className="font-bold bg-white/20 px-1.5 rounded">E</kbd> play again &nbsp;·&nbsp; <kbd className="font-bold bg-white/20 px-1.5 rounded">Esc</kbd> leave lane</div>
                <div className="md:hidden text-xs opacity-70 mt-1">Tap <strong>Play Again</strong> or move away</div>
              </div>
            )}
          </div>
          </div>
        </div>
      )}

      {/* Mobile bowling throw/play-again button */}
      {(bowlDisplay.state === 'aiming' || bowlDisplay.state === 'result') && (
        <button
          className="md:hidden absolute right-6 z-30 px-5 py-3 bg-yellow-600/90 backdrop-blur-sm text-white border border-yellow-400/50 rounded-full font-bold text-sm pointer-events-auto"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5.5rem)' }}
          onTouchStart={(e) => { e.preventDefault(); dispatchE('keydown') }}
          onTouchEnd={(e) => { e.preventDefault(); dispatchE('keyup') }}
        >
          {bowlDisplay.state === 'aiming' ? 'Throw' : 'Play Again'}
        </button>
      )}

      {/* Mobile bowling leave button */}
      {(bowlDisplay.state === 'aiming' || bowlDisplay.state === 'result') && (
        <button
          className="md:hidden absolute left-6 z-30 px-5 py-3 bg-white/15 backdrop-blur-sm text-white border border-white/30 rounded-full font-bold text-sm pointer-events-auto"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5.5rem)' }}
          onTouchStart={(e) => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })) }}
          onTouchEnd={(e) => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', bubbles: true })) }}
        >
          Leave Lane
        </button>
      )}

      {/* Ring toss overlay */}
      {rtossDisplay.state !== 'idle' && (
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center"
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 4rem)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}>
          <div className="flex gap-8 bg-black/70 backdrop-blur-sm text-white px-8 py-3 rounded-full text-sm font-bold">
            <span>Ring <span className="text-yellow-300">{rtossDisplay.thrown}</span>/{RTOSS_RINGS}</span>
            <span className="opacity-40">|</span>
            <span>Score: <span className="text-yellow-300">{rtossDisplay.score}</span></span>
            <span className="opacity-40">|</span>
            <span>Best: <span className="text-green-300">{rtossDisplay.hs}</span></span>
          </div>
          <div className="flex-1 flex items-center">
          <div className="text-center">
            {rtossDisplay.state === 'aiming' && (
              <div className="bg-black/70 backdrop-blur-sm text-white px-6 py-4 rounded-2xl text-sm space-y-3 min-w-64">
                <div className="hidden md:block text-center opacity-70 text-xs">
                  <kbd className="font-bold bg-white/20 px-1.5 rounded">A</kbd> / <kbd className="font-bold bg-white/20 px-1.5 rounded">D</kbd> aim &nbsp;·&nbsp; hold <kbd className="font-bold bg-white/20 px-1.5 rounded">Space</kbd> / <kbd className="font-bold bg-white/20 px-1.5 rounded">E</kbd> — release to throw
                </div>
                <div className="md:hidden text-center opacity-70 text-xs">Joystick left/right to aim</div>
                <div>
                  <div className="flex justify-between text-xs opacity-60 mb-1"><span>POWER</span></div>
                  <div className="w-full h-4 bg-white/20 rounded-full overflow-hidden">
                    <div ref={rPowerBarRef} className="h-full rounded-full transition-none"
                      style={{ width: '0%', background: 'linear-gradient(90deg, #22c55e, #eab308, #ef4444)' }} />
                  </div>
                </div>
              </div>
            )}
            {rtossDisplay.state === 'thrown' && (
              <div className="bg-black/70 backdrop-blur-sm text-white px-6 py-3 rounded-2xl text-sm animate-pulse">
                {rtossDisplay.thrown < RTOSS_RINGS ? 'Ring in flight...' : 'Settling...'}
              </div>
            )}
            {rtossDisplay.state === 'result' && (
              <div className="bg-black/70 backdrop-blur-sm text-white px-8 py-4 rounded-2xl text-center space-y-2">
                <div className="text-2xl font-bold">
                  {rtossDisplay.score === RTOSS_RINGS ? 'Perfect! ' : ''}{rtossDisplay.score} / {RTOSS_RINGS} ringers
                </div>
                {rtossDisplay.score === rtossDisplay.hs && rtossDisplay.score > 0 && (
                  <div className="text-green-300 text-sm font-bold">New Best!</div>
                )}
                <div className="hidden md:block text-xs opacity-70 mt-1">
                  <kbd className="font-bold bg-white/20 px-1.5 rounded">E</kbd> play again &nbsp;·&nbsp; <kbd className="font-bold bg-white/20 px-1.5 rounded">Esc</kbd> leave
                </div>
                <div className="md:hidden text-xs opacity-70 mt-1">Tap <strong>Play Again</strong> or move away</div>
              </div>
            )}
          </div>
          </div>
        </div>
      )}

      {/* Mobile ring toss throw/play-again button */}
      {(rtossDisplay.state === 'aiming' || rtossDisplay.state === 'result') && (
        <button
          className="md:hidden absolute right-6 z-30 px-5 py-3 bg-yellow-600/90 backdrop-blur-sm text-white border border-yellow-400/50 rounded-full font-bold text-sm pointer-events-auto"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5.5rem)' }}
          onTouchStart={(e) => { e.preventDefault(); dispatchE('keydown') }}
          onTouchEnd={(e) => { e.preventDefault(); dispatchE('keyup') }}
        >
          {rtossDisplay.state === 'aiming' ? 'Throw' : 'Play Again'}
        </button>
      )}

      {/* Mobile ring toss leave button */}
      {(rtossDisplay.state === 'aiming' || rtossDisplay.state === 'result') && (
        <button
          className="md:hidden absolute left-6 z-30 px-5 py-3 bg-white/15 backdrop-blur-sm text-white border border-white/30 rounded-full font-bold text-sm pointer-events-auto"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5.5rem)' }}
          onTouchStart={(e) => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })) }}
          onTouchEnd={(e) => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', bubbles: true })) }}
        >
          Leave
        </button>
      )}

      {/* All HUD hints and controls */}
      {(
        <>
          {/* Near-bowl hint — desktop only; mobile uses Inspect button */}
          {nearBowl && bowlDisplay.state === 'idle' && rtossDisplay.state === 'idle' && !sitting && (
            <div
              className="hidden md:block absolute left-1/2 -translate-x-1/2 text-white text-xs bg-black/60 backdrop-blur-sm px-5 py-2 rounded-full pointer-events-none animate-pulse"
              style={{ bottom: 'calc(env(safe-area-inset-bottom) + 3.5rem)' }}
            >
              Press <kbd className="font-bold mx-1">E</kbd> to Bowl
            </div>
          )}

          {/* Near ring toss hint — desktop only */}
          {nearRToss && rtossDisplay.state === 'idle' && bowlDisplay.state === 'idle' && !sitting && (
            <div
              className="hidden md:block absolute left-1/2 -translate-x-1/2 text-white text-xs bg-black/60 backdrop-blur-sm px-5 py-2 rounded-full pointer-events-none animate-pulse"
              style={{ bottom: 'calc(env(safe-area-inset-bottom) + 3.5rem)' }}
            >
              Press <kbd className="font-bold mx-1">E</kbd> for Ring Toss
            </div>
          )}

          {/* Near car hint — desktop only */}
          {nearCar && !sitting && !driving && bowlDisplay.state === 'idle' && rtossDisplay.state === 'idle' && (
            <div
              className="hidden md:block absolute left-1/2 -translate-x-1/2 text-white text-xs bg-black/60 backdrop-blur-sm px-5 py-2 rounded-full pointer-events-none animate-pulse"
              style={{ bottom: 'calc(env(safe-area-inset-bottom) + 3.5rem)' }}
            >
              Press <kbd className="font-bold mx-1">E</kbd> to drive
            </div>
          )}

          {/* Near Newton's Cradle hint — desktop only */}
          {nearCradle && !sitting && !driving && bowlDisplay.state === 'idle' && rtossDisplay.state === 'idle' && (
            <div
              className="hidden md:block absolute left-1/2 -translate-x-1/2 text-white text-xs bg-black/60 backdrop-blur-sm px-5 py-2 rounded-full pointer-events-none animate-pulse"
              style={{ bottom: 'calc(env(safe-area-inset-bottom) + 3.5rem)' }}
            >
              Press <kbd className="font-bold mx-1">E</kbd> to start Newton&apos;s Cradle
            </div>
          )}

          {/* Driving hints */}
          {driving && (
            <>
              <div className="hidden md:block absolute left-1/2 -translate-x-1/2 text-white text-xs bg-black/60 backdrop-blur-sm px-5 py-2 rounded-full pointer-events-none"
                style={{ bottom: 'calc(env(safe-area-inset-bottom) + 3.5rem)' }}>
                WASD drive &nbsp;·&nbsp; <kbd className="font-bold mx-1">E</kbd> or <kbd className="font-bold mx-1">Esc</kbd> exit
              </div>
              <button
                className="md:hidden absolute left-1/2 -translate-x-1/2 z-30 px-6 py-3 bg-white/20 backdrop-blur-sm text-white border border-white/40 rounded-full font-bold text-sm pointer-events-auto"
                style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5.5rem)' }}
                onTouchStart={(e) => { e.preventDefault(); dispatchE('keydown') }}
                onTouchEnd={(e) => { e.preventDefault(); dispatchE('keyup') }}
              >
                Exit Car
              </button>
            </>
          )}

          {/* Bench sit hint — desktop only */}
          {nearBench && !sitting && bowlDisplay.state === 'idle' && rtossDisplay.state === 'idle' && (
            <div
              className="hidden md:block absolute left-1/2 -translate-x-1/2 text-white text-xs bg-black/60 backdrop-blur-sm px-5 py-2 rounded-full pointer-events-none animate-pulse"
              style={{ bottom: 'calc(env(safe-area-inset-bottom) + 3.5rem)' }}
            >
              Press <kbd className="font-bold mx-1">E</kbd> to sit
            </div>
          )}

          {/* Sitting: desktop hint / mobile Stand Up button */}
          {sitting && (
            <>
              <div className="hidden md:block absolute left-1/2 -translate-x-1/2 text-white text-xs bg-black/60 backdrop-blur-sm px-5 py-2 rounded-full pointer-events-none"
                style={{ bottom: 'calc(env(safe-area-inset-bottom) + 3.5rem)' }}>
                <kbd className="font-bold mx-1">E</kbd> or move to stand
              </div>
              <button
                className="md:hidden absolute left-1/2 -translate-x-1/2 z-30 px-6 py-3 bg-white/20 backdrop-blur-sm text-white border border-white/40 rounded-full font-bold text-sm pointer-events-auto"
                style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5.5rem)' }}
                onTouchStart={(e) => { e.preventDefault(); dispatchE('keydown') }}
                onTouchEnd={(e) => { e.preventDefault(); dispatchE('keyup') }}
              >
                Stand Up
              </button>
            </>
          )}

          {/* Ladder hints — desktop shows keys, mobile shows joystick instructions */}
          {nearLadder && !climbing && !sitting && bowlDisplay.state === 'idle' && rtossDisplay.state === 'idle' && (
            <>
              <div className="hidden md:block absolute left-1/2 -translate-x-1/2 text-white text-xs bg-black/60 backdrop-blur-sm px-5 py-2 rounded-full pointer-events-none animate-pulse"
                style={{ bottom: 'calc(env(safe-area-inset-bottom) + 3.5rem)' }}>
                Press <kbd className="font-bold mx-1">W</kbd> to climb
              </div>
              <div className="md:hidden absolute left-1/2 -translate-x-1/2 text-white text-xs bg-black/60 backdrop-blur-sm px-5 py-2 rounded-full pointer-events-none animate-pulse"
                style={{ bottom: 'calc(env(safe-area-inset-bottom) + 3.5rem)' }}>
                Joystick up to climb
              </div>
            </>
          )}
          {climbing && (
            <>
              <div className="hidden md:block absolute left-1/2 -translate-x-1/2 text-white text-xs bg-black/60 backdrop-blur-sm px-5 py-2 rounded-full pointer-events-none"
                style={{ bottom: 'calc(env(safe-area-inset-bottom) + 3.5rem)' }}>
                <kbd className="font-bold mx-1">W</kbd>/<kbd className="font-bold mx-1">S</kbd> climb &nbsp;·&nbsp; <kbd className="font-bold mx-1">Esc</kbd> dismount
              </div>
              <div className="md:hidden absolute left-1/2 -translate-x-1/2 text-white text-xs bg-black/60 backdrop-blur-sm px-5 py-2 rounded-full pointer-events-none"
                style={{ bottom: 'calc(env(safe-area-inset-bottom) + 3.5rem)' }}>
                Joystick up/down to climb · Move away to dismount
              </div>
            </>
          )}

          {/* Light switch hint — desktop only */}
          {nearSwitch && !nearBowl && !nearRToss && !nearBench && !sitting && (
            <div
              className="hidden md:block absolute left-1/2 -translate-x-1/2 text-white text-xs bg-black/60 backdrop-blur-sm px-5 py-2 rounded-full pointer-events-none animate-pulse"
              style={{ bottom: 'calc(env(safe-area-inset-bottom) + 3.5rem)' }}
            >
              Press <kbd className="font-bold mx-1">E</kbd> to toggle light
            </div>
          )}

          {/* Project screen hint — desktop only */}
          {nearProject && !nearBowl && !nearRToss && !sitting && (
            <div
              className="hidden md:block absolute left-1/2 -translate-x-1/2 text-white text-xs bg-black/70 backdrop-blur-sm px-5 py-2 rounded-full pointer-events-none animate-pulse"
              style={{ bottom: 'calc(env(safe-area-inset-bottom) + 3.5rem)', borderColor: '#9333ea', borderWidth: 1 }}
            >
              Press <kbd className="font-bold mx-1">E</kbd> to open {nearProjectLabel}
            </div>
          )}

          {/* Desktop controls bar */}
          {bowlDisplay.state === 'idle' && rtossDisplay.state === 'idle' && !sitting && !driving && (
            <div
              className="hidden md:flex absolute left-1/2 -translate-x-1/2 text-white text-xs bg-black/50 backdrop-blur-sm px-5 py-2 rounded-full pointer-events-none"
              style={{ bottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
            >
              WASD · Arrows &nbsp;·&nbsp; <kbd className="font-bold mx-1">Space</kbd> jump &nbsp;·&nbsp; <kbd className="font-bold mx-1">E</kbd> interact
            </div>
          )}

          {/* Mobile controls hint */}
          {bowlDisplay.state === 'idle' && rtossDisplay.state === 'idle' && !sitting && (
            <div
              className="md:hidden absolute left-1/2 -translate-x-1/2 text-white text-xs bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full pointer-events-none whitespace-nowrap"
              style={{ bottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
            >
              Left stick: move &nbsp;·&nbsp; Right stick: look
            </div>
          )}

          {/* Mobile move joystick — left side */}
          {!monitorMode && bowlDisplay.state === 'idle' && rtossDisplay.state === 'idle' && !sitting && <div
            className="absolute left-6 z-30 w-28 h-28 md:hidden touch-none select-none"
            style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5.5rem)' }}
            onTouchStart={(e) => {
              e.preventDefault()
              moveTouchId.current = e.changedTouches[0].identifier
              touchActiveRef.current = true
            }}
            onTouchMove={(e) => {
              e.preventDefault()
              const touch = Array.from(e.touches).find(t => t.identifier === moveTouchId.current)
              if (!touch) return
              const rect = e.currentTarget.getBoundingClientRect()
              const x = Math.max(-1, Math.min(1, ((touch.clientX - rect.left) / rect.width) * 2 - 1))
              const y = Math.max(-1, Math.min(1, ((touch.clientY - rect.top) / rect.height) * 2 - 1))
              touchMoveRef.current = { x, y }
              setJoyPos({ x, y })
            }}
            onTouchEnd={(e) => {
              e.preventDefault()
              if (Array.from(e.changedTouches).some(t => t.identifier === moveTouchId.current)) {
                moveTouchId.current = -1
                touchActiveRef.current = false
                touchMoveRef.current = { x: 0, y: 0 }
                setJoyPos({ x: 0, y: 0 })
              }
            }}
          >
            <div className="relative w-full h-full rounded-full bg-black/40 border border-white/30">
              <div
                className="absolute w-10 h-10 rounded-full bg-white/70"
                style={{
                  left: `calc(50% + ${joyPos.x * 35}px - 20px)`,
                  top:  `calc(50% + ${joyPos.y * 35}px - 20px)`,
                }}
              />
            </div>
          </div>}

          {/* Mobile look joystick — right side */}
          {!monitorMode && bowlDisplay.state === 'idle' && rtossDisplay.state === 'idle' && <div
            className="absolute right-6 z-30 w-28 h-28 md:hidden touch-none select-none"
            style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5.5rem)' }}
            onTouchStart={(e) => {
              e.preventDefault()
              lookTouchId.current = e.changedTouches[0].identifier
              lookActiveRef.current = true
            }}
            onTouchMove={(e) => {
              e.preventDefault()
              const touch = Array.from(e.touches).find(t => t.identifier === lookTouchId.current)
              if (!touch) return
              const rect = e.currentTarget.getBoundingClientRect()
              const x = Math.max(-1, Math.min(1, ((touch.clientX - rect.left) / rect.width) * 2 - 1))
              const y = Math.max(-1, Math.min(1, ((touch.clientY - rect.top) / rect.height) * 2 - 1))
              lookMoveRef.current = { x, y }
              setLookJoyPos({ x, y })
            }}
            onTouchEnd={(e) => {
              e.preventDefault()
              if (Array.from(e.changedTouches).some(t => t.identifier === lookTouchId.current)) {
                lookTouchId.current = -1
                lookActiveRef.current = false
                lookMoveRef.current = { x: 0, y: 0 }
                setLookJoyPos({ x: 0, y: 0 })
              }
            }}
          >
            <div className="relative w-full h-full rounded-full bg-black/40 border border-white/30">
              <div
                className="absolute w-10 h-10 rounded-full bg-white/50"
                style={{
                  left: `calc(50% + ${lookJoyPos.x * 35}px - 20px)`,
                  top:  `calc(50% + ${lookJoyPos.y * 35}px - 20px)`,
                }}
              />
            </div>
          </div>}

          {/* Mobile interact button — contextual label, center */}
          {!monitorMode && hasNearby && !sitting && !climbing &&
           bowlDisplay.state === 'idle' && rtossDisplay.state === 'idle' && (
            <button
              className="md:hidden absolute left-1/2 -translate-x-1/2 z-30 px-6 py-3 bg-white/20 backdrop-blur-sm text-white border border-white/40 rounded-full font-bold text-sm pointer-events-auto"
              style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5.5rem)' }}
              onTouchStart={(e) => { e.preventDefault(); dispatchE('keydown') }}
              onTouchEnd={(e) => { e.preventDefault(); dispatchE('keyup') }}
            >
              {inspectLabel}
            </button>
          )}
        </>
      )}
    </>
  )
}
