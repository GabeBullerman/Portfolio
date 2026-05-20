import React from 'react'
import { BowlState, RTossState, RTOSS_RINGS } from '../constants'

interface BowlDisplay  { state: BowlState;  score: number; hs: number }
interface RTossDisplay { state: RTossState; thrown: number; score: number; hs: number }

interface GameHUDProps {
  monitorMode:    boolean
  pointerLocked:  boolean
  isNight:        boolean
  musicMuted:     boolean
  nearBowl:       boolean
  nearRToss:      boolean
  nearBench:      boolean
  nearChair:      boolean
  nearLadder:     boolean
  nearSwitch:     boolean
  nearBed:        boolean
  nearRadio:      boolean
  sitting:        boolean
  climbing:       boolean
  bowlDisplay:    BowlDisplay
  rtossDisplay:   RTossDisplay
  joyPos:         { x: number; y: number }
  sleepOverlayRef: React.Ref<HTMLDivElement>
  powerBarRef:    React.Ref<HTMLDivElement>
  rPowerBarRef:   React.Ref<HTMLDivElement>
  touchMoveRef:   React.MutableRefObject<{ x: number; y: number }>
  touchActiveRef: React.MutableRefObject<boolean>
  setJoyPos:      (p: { x: number; y: number }) => void
}

export default function GameHUD({
  monitorMode, pointerLocked, isNight, musicMuted,
  nearBowl, nearRToss, nearBench, nearChair, nearLadder, nearSwitch, nearBed, nearRadio,
  sitting, climbing,
  bowlDisplay, rtossDisplay,
  joyPos, sleepOverlayRef, powerBarRef, rPowerBarRef,
  touchMoveRef, touchActiveRef, setJoyPos,
}: GameHUDProps) {
  return (
    <>
      {/* "Use computer" prompt when near the chair */}
      {!monitorMode && nearChair && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="bg-black/70 backdrop-blur-sm text-white text-sm px-4 py-2 rounded-full flex items-center gap-2">
            <kbd className="bg-white/20 text-xs px-1.5 py-0.5 rounded font-mono">E</kbd>
            Use Computer
          </div>
        </div>
      )}

      {/* "Sleep" prompt when near the bed */}
      {!monitorMode && nearBed && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="bg-black/70 backdrop-blur-sm text-white text-sm px-4 py-2 rounded-full flex items-center gap-2">
            <kbd className="bg-white/20 text-xs px-1.5 py-0.5 rounded font-mono">E</kbd>
            {isNight ? 'Wake Up' : 'Sleep'}
          </div>
        </div>
      )}

      {/* Eyes-closing sleep overlay */}
      <div
        ref={sleepOverlayRef}
        className="absolute inset-0 bg-black pointer-events-none"
        style={{ opacity: 0, zIndex: 55 }}
      />

      {/* Click-to-look prompt — desktop only, idle state, not in monitor mode */}
      {!monitorMode && !pointerLocked && bowlDisplay.state === 'idle' && !sitting && (
        <div className="hidden md:flex absolute inset-0 items-center justify-center pointer-events-none">
          <div className="bg-black/50 backdrop-blur-sm text-white text-sm px-5 py-2 rounded-full opacity-70">
            Click to look around
          </div>
        </div>
      )}

      {/* Muted indicator — small, unobtrusive, always visible when music is off */}
      {musicMuted && (
        <div
          className="absolute z-10 px-3 py-1.5 bg-black/60 backdrop-blur-sm text-white/70 rounded-full text-xs pointer-events-none select-none"
          style={{ top: 'calc(env(safe-area-inset-top) + 1rem)', right: '1rem' }}
        >
          🔇 muted
        </div>
      )}

      {/* Radio interaction prompt */}
      {!monitorMode && nearRadio && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="bg-black/70 backdrop-blur-sm text-white text-sm px-4 py-2 rounded-full flex items-center gap-2">
            <kbd className="bg-white/20 text-xs px-1.5 py-0.5 rounded font-mono">E</kbd>
            {musicMuted ? 'Unmute Music' : 'Mute Music'}
          </div>
        </div>
      )}

      {/* Bowling overlay — shown when actively bowling */}
      {bowlDisplay.state !== 'idle' && (
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 4rem)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}>
          {/* Score bar at top */}
          <div className="flex gap-8 bg-black/70 backdrop-blur-sm text-white px-8 py-3 rounded-full text-sm font-bold">
            <span>Score: <span className="text-yellow-300">{bowlDisplay.score}</span></span>
            <span className="opacity-40">|</span>
            <span>Best: <span className="text-green-300">{bowlDisplay.hs}</span></span>
          </div>

          {/* State-specific instructions at bottom */}
          <div className="text-center">
            {bowlDisplay.state === 'aiming' && (
              <div className="bg-black/70 backdrop-blur-sm text-white px-6 py-4 rounded-2xl text-sm space-y-3 min-w-64">
                <div className="hidden md:block text-center opacity-70 text-xs">
                  <kbd className="font-bold bg-white/20 px-1.5 rounded">A</kbd> / <kbd className="font-bold bg-white/20 px-1.5 rounded">D</kbd> to aim &nbsp;·&nbsp; <kbd className="font-bold bg-white/20 px-1.5 rounded">Esc</kbd> to cancel
                </div>
                <div className="md:hidden text-center opacity-70 text-xs">Joystick left/right to aim</div>
                {/* Power bar */}
                <div>
                  <div className="flex justify-between text-xs opacity-60 mb-1">
                    <span>POWER</span>
                    <span className="hidden md:inline">hold <kbd className="font-bold bg-white/20 px-1 rounded">Space</kbd> / <kbd className="font-bold bg-white/20 px-1 rounded">E</kbd> — release to throw</span>
                    <span className="md:hidden">hold <strong>Throw</strong> — release to bowl</span>
                  </div>
                  <div className="w-full h-4 bg-white/20 rounded-full overflow-hidden">
                    <div
                      ref={powerBarRef}
                      className="h-full rounded-full transition-none"
                      style={{ width: '0%', background: 'linear-gradient(90deg, #22c55e, #eab308, #ef4444)' }}
                    />
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
      )}

      {/* Mobile throw/play-again button — only during bowling */}
      {(bowlDisplay.state === 'aiming' || bowlDisplay.state === 'result') && (
        <button
          className="md:hidden absolute right-6 z-30 px-5 py-3 bg-yellow-600/90 backdrop-blur-sm text-white border border-yellow-400/50 rounded-full font-bold text-sm pointer-events-auto"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5.5rem)' }}
          onTouchStart={(e) => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', bubbles: true })) }}
          onTouchEnd={(e) => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keyup', { key: 'e', bubbles: true })) }}
        >
          {bowlDisplay.state === 'aiming' ? 'Throw' : 'Play Again'}
        </button>
      )}

      {/* Ring toss overlay */}
      {rtossDisplay.state !== 'idle' && (
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between"
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 4rem)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}>
          <div className="flex gap-8 bg-black/70 backdrop-blur-sm text-white px-8 py-3 rounded-full text-sm font-bold">
            <span>Ring <span className="text-yellow-300">{rtossDisplay.thrown}</span>/{RTOSS_RINGS}</span>
            <span className="opacity-40">|</span>
            <span>Score: <span className="text-yellow-300">{rtossDisplay.score}</span></span>
            <span className="opacity-40">|</span>
            <span>Best: <span className="text-green-300">{rtossDisplay.hs}</span></span>
          </div>
          <div className="text-center">
            {rtossDisplay.state === 'aiming' && (
              <div className="bg-black/70 backdrop-blur-sm text-white px-6 py-4 rounded-2xl text-sm space-y-3 min-w-64">
                <div className="hidden md:block text-center opacity-70 text-xs">
                  <kbd className="font-bold bg-white/20 px-1.5 rounded">A</kbd> / <kbd className="font-bold bg-white/20 px-1.5 rounded">D</kbd> aim &nbsp;·&nbsp; hold <kbd className="font-bold bg-white/20 px-1.5 rounded">Space</kbd> / <kbd className="font-bold bg-white/20 px-1.5 rounded">E</kbd> — release to throw
                </div>
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
              </div>
            )}
          </div>
        </div>
      )}

      {/* All HUD — hidden when modal is open */}
      {(
        <>
          {/* Near-bowl hint — only when idle near lane */}
          {nearBowl && bowlDisplay.state === 'idle' && rtossDisplay.state === 'idle' && !sitting && (
            <div
              className="absolute left-1/2 -translate-x-1/2 text-white text-xs bg-black/60 backdrop-blur-sm px-5 py-2 rounded-full pointer-events-none animate-pulse"
              style={{ bottom: 'calc(env(safe-area-inset-bottom) + 3.5rem)' }}
            >
              Press <kbd className="font-bold mx-1">E</kbd> to Bowl
            </div>
          )}

          {/* Near ring toss hint */}
          {nearRToss && rtossDisplay.state === 'idle' && bowlDisplay.state === 'idle' && !sitting && (
            <div
              className="absolute left-1/2 -translate-x-1/2 text-white text-xs bg-black/60 backdrop-blur-sm px-5 py-2 rounded-full pointer-events-none animate-pulse"
              style={{ bottom: 'calc(env(safe-area-inset-bottom) + 3.5rem)' }}
            >
              Press <kbd className="font-bold mx-1">E</kbd> for Ring Toss
            </div>
          )}

          {/* Bench sit/stand hints */}
          {nearBench && !sitting && bowlDisplay.state === 'idle' && rtossDisplay.state === 'idle' && (
            <div className="absolute left-1/2 -translate-x-1/2 text-white text-xs bg-black/60 backdrop-blur-sm px-5 py-2 rounded-full pointer-events-none animate-pulse"
              style={{ bottom: 'calc(env(safe-area-inset-bottom) + 3.5rem)' }}>
              Press <kbd className="font-bold mx-1">E</kbd> to sit
            </div>
          )}
          {sitting && (
            <div className="absolute left-1/2 -translate-x-1/2 text-white text-xs bg-black/60 backdrop-blur-sm px-5 py-2 rounded-full pointer-events-none"
              style={{ bottom: 'calc(env(safe-area-inset-bottom) + 3.5rem)' }}>
              <kbd className="font-bold mx-1">E</kbd> or move to stand
            </div>
          )}

          {/* Ladder hints */}
          {nearLadder && !climbing && !sitting && bowlDisplay.state === 'idle' && rtossDisplay.state === 'idle' && (
            <div className="absolute left-1/2 -translate-x-1/2 text-white text-xs bg-black/60 backdrop-blur-sm px-5 py-2 rounded-full pointer-events-none animate-pulse"
              style={{ bottom: 'calc(env(safe-area-inset-bottom) + 3.5rem)' }}>
              Press <kbd className="font-bold mx-1">W</kbd> to climb
            </div>
          )}
          {climbing && (
            <div className="absolute left-1/2 -translate-x-1/2 text-white text-xs bg-black/60 backdrop-blur-sm px-5 py-2 rounded-full pointer-events-none"
              style={{ bottom: 'calc(env(safe-area-inset-bottom) + 3.5rem)' }}>
              <kbd className="font-bold mx-1">W</kbd>/<kbd className="font-bold mx-1">S</kbd> climb &nbsp;·&nbsp; <kbd className="font-bold mx-1">Esc</kbd> dismount
            </div>
          )}

          {/* Light switch hint */}
          {nearSwitch && !nearBowl && !nearRToss && !nearBench && !sitting && (
            <div className="absolute left-1/2 -translate-x-1/2 text-white text-xs bg-black/60 backdrop-blur-sm px-5 py-2 rounded-full pointer-events-none animate-pulse"
              style={{ bottom: 'calc(env(safe-area-inset-bottom) + 3.5rem)' }}>
              Press <kbd className="font-bold mx-1">E</kbd> to toggle light
            </div>
          )}

          {/* Desktop: controls bar — hidden during bowling/rtoss/sitting */}
          {bowlDisplay.state === 'idle' && rtossDisplay.state === 'idle' && !sitting && (
          <div
            className="hidden md:flex absolute left-1/2 -translate-x-1/2 text-white text-xs bg-black/50 backdrop-blur-sm px-5 py-2 rounded-full pointer-events-none"
            style={{ bottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
          >
            WASD · Arrows &nbsp;·&nbsp; <kbd className="font-bold mx-1">Space</kbd> jump &nbsp;·&nbsp; <kbd className="font-bold mx-1">E</kbd> interact
          </div>
          )}

          {/* Mobile: controls hint — hidden during bowling/rtoss/sitting */}
          {bowlDisplay.state === 'idle' && rtossDisplay.state === 'idle' && !sitting && (
          <div
            className="md:hidden absolute left-1/2 -translate-x-1/2 text-white text-xs bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full pointer-events-none whitespace-nowrap"
            style={{ bottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
          >
            Joystick to move &nbsp;·&nbsp; Tap <strong>Inspect</strong> near signs
          </div>
          )}

          {/* Mobile: Joystick — left side, hidden during bowling/rtoss/sitting */}
          {bowlDisplay.state === 'idle' && rtossDisplay.state === 'idle' && !sitting && <div
            className="absolute left-6 z-30 w-28 h-28 md:hidden touch-none select-none"
            style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5.5rem)' }}
            onTouchStart={(e) => { e.preventDefault(); touchActiveRef.current = true }}
            onTouchMove={(e) => {
              e.preventDefault()
              const rect = e.currentTarget.getBoundingClientRect()
              const touch = e.touches[0]
              const x = Math.max(-1, Math.min(1, ((touch.clientX - rect.left) / rect.width) * 2 - 1))
              const y = Math.max(-1, Math.min(1, ((touch.clientY - rect.top) / rect.height) * 2 - 1))
              touchMoveRef.current = { x, y }
              setJoyPos({ x, y })
            }}
            onTouchEnd={(e) => {
              e.preventDefault()
              touchActiveRef.current = false
              touchMoveRef.current = { x: 0, y: 0 }
              setJoyPos({ x: 0, y: 0 })
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
        </>
      )}
    </>
  )
}
