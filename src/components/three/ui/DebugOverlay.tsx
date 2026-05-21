import React from 'react'
import * as THREE from 'three'
import { Movable } from '../types'

type XYZ = { x: number; y: number; z: number }

interface DebugOverlayProps {
  debugOpen:    boolean
  debugSel:     number
  debugStep:    number
  selPos:       XYZ | null
  selRot:       XYZ | null
  movablesRef:  React.MutableRefObject<Movable[]>
  debugPanelRef: React.Ref<HTMLPreElement>
  setDebugSel:  (i: number) => void
  setSelPos:    React.Dispatch<React.SetStateAction<XYZ | null>>
  setSelRot:    React.Dispatch<React.SetStateAction<XYZ | null>>
  setDebugStep: (s: number) => void
}

export default function DebugOverlay({
  debugOpen, debugSel, debugStep, selPos, selRot,
  movablesRef, debugPanelRef,
  setDebugSel, setSelPos, setSelRot, setDebugStep,
}: DebugOverlayProps) {
  return (
    <>
      {/* Player-position debug pre — updated directly in animate loop */}
      <pre
        ref={debugPanelRef}
        style={{ display: debugOpen ? 'block' : 'none' }}
        className="absolute z-20 left-4 bottom-4 text-xs text-green-300 bg-black/80 rounded-lg p-3 leading-5 pointer-events-none font-mono whitespace-pre"
      />

      {/* Object editor panel */}
      {debugOpen && (
        <div className="absolute z-20 right-4 top-4 bottom-4 w-64 bg-black/90 backdrop-blur-sm rounded-xl border border-white/20 text-white text-sm flex flex-col overflow-hidden select-none">
          <div className="px-3 py-2 border-b border-white/10 flex justify-between items-center shrink-0">
            <span className="font-bold text-xs tracking-wide">OBJECT EDITOR  <span className="text-white/40 font-normal">(` to close)</span></span>
          </div>

          {/* Object list */}
          <div className="overflow-y-auto flex-1 p-2 flex flex-col gap-1">
            {(() => {
              const getGroup = (name: string) => {
                if (name.startsWith('🦴')) return 'Bones'
                if (name.startsWith('🛣')) return 'Roads'
                if (name.startsWith('🚶')) return 'Sidewalks'
                if (name.includes('(cabin local)') || name.startsWith('🏕') || name.startsWith('🟫') || name.startsWith('🏠')) return 'Cabin'
                if (name.startsWith('🟥') || name.startsWith('🟩') || name.startsWith('🪜') || name.startsWith('🟫')) return 'Cabin'
                if (name.startsWith('🏪') || name.startsWith('🏢') || name.startsWith('🏘')) return 'Buildings'
                if (name.startsWith('🪨')) return 'Stone Paths'
                return 'Props'
              }
              const groupOrder = ['Bones', 'Buildings', 'Cabin', 'Props', 'Stone Paths', 'Roads', 'Sidewalks']
              const grouped: Record<string, number[]> = {}
              movablesRef.current.forEach((m, i) => {
                const g = getGroup(m.name)
                if (!grouped[g]) grouped[g] = []
                grouped[g].push(i)
              })
              return groupOrder.filter(g => grouped[g]?.length).map(g => (
                <div key={g}>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-white/30 px-1 pt-2 pb-1">{g}</div>
                  {grouped[g].map(i => {
                    const m = movablesRef.current[i]
                    return (
                      <button
                        key={i}
                        onClick={() => { setDebugSel(i); setSelPos({ x: m.group.position.x, y: m.group.position.y, z: m.group.position.z }) }}
                        className={`w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors ${debugSel === i ? 'bg-blue-600' : 'bg-white/10 hover:bg-white/20'}`}
                      >
                        <span className="font-medium">{m.name}</span>
                        <span className="block text-white/50 font-mono">
                          x={m.group.position.x.toFixed(1)}  y={m.group.position.y.toFixed(1)}  z={m.group.position.z.toFixed(1)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              ))
            })()}
          </div>

          {/* Move controls */}
          {debugSel >= 0 && movablesRef.current[debugSel] && (() => {
            const snap = () => {
              const m = movablesRef.current[debugSel]
              setSelPos({ x: m.group.position.x, y: m.group.position.y, z: m.group.position.z })
              const e = new THREE.Euler().setFromQuaternion(m.group.quaternion)
              setSelRot({ x: e.x, y: e.y, z: e.z })
            }
            const syncHitMesh = (m: Movable) => {
              const mesh = (m.group as any).__hitMesh as THREE.Mesh | undefined
              if (mesh) {
                mesh.position.copy(m.group.position)
                mesh.rotation.copy(m.group.rotation)
              }
            }
            const move = (dx: number, dz: number) => {
              const m = movablesRef.current[debugSel]
              m.group.position.x += dx; m.group.position.z += dz
              m.meshes?.forEach(obj => { obj.position.x += dx; obj.position.z += dz })
              m.group.updateMatrix(); m.group.updateMatrixWorld(true)
              syncHitMesh(m); snap()
            }
            const moveY = (dy: number) => {
              const m = movablesRef.current[debugSel]
              m.group.position.y += dy
              m.meshes?.forEach(obj => { obj.position.y += dy })
              m.group.updateMatrix(); m.group.updateMatrixWorld(true)
              syncHitMesh(m); snap()
            }
            const rotate = (axis: 'x' | 'y' | 'z', deg: number) => {
              const m = movablesRef.current[debugSel]
              const rad = deg * Math.PI / 180
              const axisVec = axis === 'x' ? new THREE.Vector3(1,0,0) : axis === 'y' ? new THREE.Vector3(0,1,0) : new THREE.Vector3(0,0,1)
              m.group.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(axisVec, rad))
              m.group.updateMatrix()
              m.group.updateMatrixWorld(true)
              syncHitMesh(m); snap()
            }
            return (
              <div className="p-3 border-t border-white/10 shrink-0 overflow-y-auto">
                <div className="text-xs text-white/50 mb-1 font-mono leading-tight">
                  {selPos ? `pos  x=${selPos.x.toFixed(2)} y=${selPos.y.toFixed(2)} z=${selPos.z.toFixed(2)}` : ''}
                </div>
                <div className="text-xs text-white/40 mb-2 font-mono leading-tight">
                  {selRot ? `rot  x=${(selRot.x*180/Math.PI).toFixed(1)}° y=${(selRot.y*180/Math.PI).toFixed(1)}° z=${(selRot.z*180/Math.PI).toFixed(1)}°` : ''}
                </div>
                {/* Step size */}
                <div className="flex gap-1 mb-2">
                  {[0.1, 0.25, 0.5, 1, 2, 5].map(s => (
                    <button key={s} onClick={() => setDebugStep(s)}
                      className={`flex-1 text-xs py-0.5 rounded ${debugStep === s ? 'bg-blue-500' : 'bg-white/15 hover:bg-white/30'}`}>
                      {s}
                    </button>
                  ))}
                </div>
                {/* Y axis */}
                <div className="flex gap-1 mb-1">
                  {[-1, -0.25, +0.25, +1].map(d => (
                    <button key={d} onClick={() => moveY(d * debugStep)}
                      className="flex-1 text-xs py-1 rounded bg-white/15 hover:bg-white/35 active:bg-white/60 font-mono">
                      Y{d > 0 ? `+${d}` : d}
                    </button>
                  ))}
                </div>
                {/* XZ direction grid */}
                <div className="grid grid-cols-3 gap-1 mb-2">
                  {([
                    ['↖',-1,-1],['↑',0,-1],['↗',1,-1],
                    ['←',-1, 0],['·',0, 0],['→',1, 0],
                    ['↙',-1, 1],['↓',0, 1],['↘',1, 1],
                  ] as [string,number,number][]).map(([lbl,dx,dz],i) => (
                    <button key={i} onClick={() => lbl !== '·' && move(dx*debugStep, dz*debugStep)}
                      className={`py-1 text-sm rounded ${lbl==='·' ? 'opacity-0 pointer-events-none' : 'bg-white/15 hover:bg-white/35 active:bg-white/60'}`}>
                      {lbl}
                    </button>
                  ))}
                </div>

                {/* Rotation controls */}
                <div className="mt-1 pt-2 border-t border-white/10">
                  <div className="text-xs text-white/50 mb-1">Rotation (°)</div>
                  {(['x','y','z'] as const).map(axis => (
                    <div key={axis} className="flex gap-1 mb-1 items-center">
                      <span className="text-xs text-white/50 w-4 font-mono uppercase">{axis}</span>
                      {[-45, -15, -5, +5, +15, +45].map(d => (
                        <button key={d} onClick={() => rotate(axis, d)}
                          className="flex-1 text-xs py-0.5 rounded bg-white/15 hover:bg-white/35 active:bg-white/60 font-mono">
                          {d > 0 ? `+${d}` : d}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>

                {/* Per-axis size controls for hitbox planes */}
                {movablesRef.current[debugSel]?.isHitbox && (() => {
                  const mesh = (movablesRef.current[debugSel].group as any).__hitMesh as THREE.Mesh | undefined
                  if (!mesh) return null
                  const bump = (axis: 'x'|'y'|'z', d: number) => {
                    mesh.scale[axis] = Math.max(0.05, mesh.scale[axis] + d)
                    setSelPos(p => p ? { ...p } : { x: 0, y: 0, z: 0 })
                  }
                  const labels = { x: 'W', y: 'H', z: 'D' } as const
                  return (
                    <div className="mt-2 pt-2 border-t border-white/10">
                      <div className="text-xs text-white/50 mb-1">Size (W / H / D)</div>
                      {(['x','y','z'] as const).map(ax => (
                        <div key={ax} className="flex gap-1 mb-1 items-center">
                          <span className="text-xs text-white/50 w-4 font-mono">{labels[ax]}</span>
                          <span className="text-xs text-white/70 font-mono w-8 text-right">{mesh.scale[ax].toFixed(2)}</span>
                          {[-2, -0.5, -0.25, -0.1, +0.1, +0.25, +0.5, +2].map(d => (
                            <button key={d} onClick={() => bump(ax, d)}
                              className="flex-1 text-xs py-0.5 rounded bg-white/15 hover:bg-white/35 active:bg-white/60 font-mono">
                              {d > 0 ? `+${d}` : d}
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  )
                })()}

                {/* Per-axis scale controls for non-hitbox objects */}
                {movablesRef.current[debugSel]?.scaleObj && (() => {
                  const sc = movablesRef.current[debugSel].scaleObj!
                  const applyAxisScale = (axis: 'x' | 'y' | 'z', delta: number) => {
                    sc.scale[axis] = Math.max(0.05, parseFloat((sc.scale[axis] + delta).toFixed(3)))
                    setSelPos(p => p ? { ...p } : { x: 0, y: 0, z: 0 })
                  }
                  return (
                    <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
                      {(['x', 'y', 'z'] as const).map(axis => (
                        <div key={axis}>
                          <div className="text-xs text-white/50 mb-0.5">
                            Scale {axis.toUpperCase()}: <span className="text-white font-mono">{sc.scale[axis].toFixed(3)}</span>
                          </div>
                          <div className="flex gap-1">
                            {[-0.5, -0.1, +0.1, +0.5].map(d => (
                              <button key={d} onClick={() => applyAxisScale(axis, d)}
                                className="flex-1 text-xs py-1 rounded bg-white/15 hover:bg-white/35 active:bg-white/60 font-mono">
                                {d > 0 ? `+${d}` : d}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>
            )
          })()}

          {/* Copy buttons */}
          <div className="p-3 border-t border-white/10 shrink-0 flex flex-col gap-2">
            {(() => {
              const r2d = (r: number) => (r * 180 / Math.PI).toFixed(1)
              const fmtMovable = (m: Movable) => {
                const p = m.group.position, rot = m.group.rotation
                const base = `${m.name}: pos(${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)})`
                if (!m.isHitbox) {
                  const e = new THREE.Euler().setFromQuaternion(m.group.quaternion)
                  const rotStr = `rot(${r2d(e.x)}°, ${r2d(e.y)}°, ${r2d(e.z)}°)`
                  const sc = m.scaleObj
                  if (sc && (sc.scale.x !== sc.scale.y || sc.scale.x !== sc.scale.z)) {
                    return `${base}  ${rotStr}  scale(${sc.scale.x.toFixed(3)}, ${sc.scale.y.toFixed(3)}, ${sc.scale.z.toFixed(3)})`
                  }
                  return `${base}  ${rotStr}`
                }
                const rotStr = `rot(${r2d(rot.x)}°, ${r2d(rot.y)}°, ${r2d(rot.z)}°)`
                const mesh = (m.group as any).__hitMesh as THREE.Mesh | undefined
                const scStr = mesh ? `  size(${mesh.scale.x.toFixed(2)}, ${mesh.scale.y.toFixed(2)}, ${mesh.scale.z.toFixed(2)})` : ''
                return `${base}  ${rotStr}${scStr}`
              }
              const getGroup = (name: string) => {
                if (name.startsWith('🦴')) return 'Bones'
                if (name.startsWith('🛣')) return 'Roads'
                if (name.startsWith('🚶')) return 'Sidewalks'
                if (name.includes('(cabin local)') || name.startsWith('🏕') || name.startsWith('🟫') || name.startsWith('🏠')) return 'Cabin'
                if (name.startsWith('🟥') || name.startsWith('🟩') || name.startsWith('🪜')) return 'Cabin'
                if (name.startsWith('🏪') || name.startsWith('🏢') || name.startsWith('🏘')) return 'Buildings'
                if (name.startsWith('🪨')) return 'Stone Paths'
                return 'Props'
              }
              const selGroup = debugSel >= 0 && movablesRef.current[debugSel]
                ? getGroup(movablesRef.current[debugSel].name)
                : null
              return (
                <>
                  {selGroup && (
                    <button
                      onClick={() => {
                        const lines = movablesRef.current
                          .filter(m => getGroup(m.name) === selGroup)
                          .map(fmtMovable)
                        navigator.clipboard.writeText(lines.join('\n'))
                      }}
                      className="w-full py-1.5 bg-blue-700 hover:bg-blue-600 active:bg-blue-500 rounded-lg text-xs font-semibold transition-colors"
                    >
                      📋 Copy {selGroup}
                    </button>
                  )}
                  <button
                    onClick={() => navigator.clipboard.writeText(movablesRef.current.map(fmtMovable).join('\n'))}
                    className="w-full py-1.5 bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-500 rounded-lg text-xs font-semibold transition-colors"
                  >
                    📋 Copy All Positions
                  </button>
                </>
              )
            })()}
          </div>
        </div>
      )}
    </>
  )
}
