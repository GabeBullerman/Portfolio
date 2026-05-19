// ─── Types ──────────────────────────────────────────────────────────────────
export type BowlState = 'idle' | 'aiming' | 'thrown' | 'result'
export type RTossState = 'idle' | 'aiming' | 'thrown' | 'result'

// ─── Bowling constants ────────────────────────────────────────────────────────
export const BOWL_CX      = 30          // lane centre X
export const BOWL_START_Z = -32         // where player throws from
export const BOWL_PINS_Z  = -48         // front pin Z
export const BOWL_LANE_Z  = -40         // lane visual centre Z
export const BOWL_PROX    = 5.5         // approach distance to start game
export const PIN_H        = 0.40        // pin height
export const PIN_R_BOT    = 0.07        // pin base radius
export const PIN_R_TOP    = 0.04        // pin neck radius
export const BOWL_BALL_R  = 0.13        // bowling ball radius
export const PIN_SPACING  = 0.48
export const PIN_ROW_D    = 0.54
export const PIN_Y = 0.04 + PIN_H / 2
export const PIN_POSITIONS: [number, number, number][] = [
  // Row 1 (head pin)
  [BOWL_CX,                       PIN_Y, BOWL_PINS_Z],
  // Row 2
  [BOWL_CX - PIN_SPACING / 2,     PIN_Y, BOWL_PINS_Z - PIN_ROW_D],
  [BOWL_CX + PIN_SPACING / 2,     PIN_Y, BOWL_PINS_Z - PIN_ROW_D],
  // Row 3
  [BOWL_CX - PIN_SPACING,         PIN_Y, BOWL_PINS_Z - PIN_ROW_D * 2],
  [BOWL_CX,                       PIN_Y, BOWL_PINS_Z - PIN_ROW_D * 2],
  [BOWL_CX + PIN_SPACING,         PIN_Y, BOWL_PINS_Z - PIN_ROW_D * 2],
  // Row 4 (back)
  [BOWL_CX - PIN_SPACING * 1.5,   PIN_Y, BOWL_PINS_Z - PIN_ROW_D * 3],
  [BOWL_CX - PIN_SPACING * 0.5,   PIN_Y, BOWL_PINS_Z - PIN_ROW_D * 3],
  [BOWL_CX + PIN_SPACING * 0.5,   PIN_Y, BOWL_PINS_Z - PIN_ROW_D * 3],
  [BOWL_CX + PIN_SPACING * 1.5,   PIN_Y, BOWL_PINS_Z - PIN_ROW_D * 3],
]

// ─── Bench constants ──────────────────────────────────────────────────────────
export const BENCH_POSITIONS = [
  { x: -2.3, z: -15.7, ry: Math.PI * 0.3 },
  { x:  2.3, z: -15.7, ry: -Math.PI * 0.3 },
] as const
export const BENCH_PROX = 2.3

// ─── Ring toss constants ──────────────────────────────────────────────────────
export const RTOSS_CX      = 23
export const RTOSS_START_Z = -32
export const RTOSS_POST_Z  = -44
export const RTOSS_PROX    = 5.5
export const RTOSS_RING_R  = 0.36
export const RTOSS_RING_TUBE = 0.048
export const RTOSS_RINGS   = 3
export const RTOSS_POST_H  = 1.5
export const RTOSS_POST_R  = 0.044

// ─── Ball pit + trampoline constants ─────────────────────────────────────────
export const PIT_CX   = -10
export const PIT_CZ   = -51
export const TRAMP_CX = 25
export const TRAMP_CZ = -63
export const TRAMP_R  = 4.8
export const TRAMP_Y  = 2.0   // trampoline surface height
export const LADDER_X = TRAMP_CX                       // south side — centered in X
export const LADDER_Z = TRAMP_CZ + TRAMP_R + 0.12     // flush with south rim
export const LADDER_PROX = 2.2

