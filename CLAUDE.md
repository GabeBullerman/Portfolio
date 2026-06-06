# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (Vite)
npm run build    # TypeScript check (tsc) + Vite production build
npm run preview  # Preview production build locally
```

`tsconfig` has `strict`, `noUnusedLocals`, and `noUnusedParameters` enabled, so the
build fails on unused locals/imports/params. No test suite is configured.

## Architecture

React + TypeScript portfolio built with Vite, in two modes:

**2D mode** (`src/App.tsx` → `TwoDApp`) — a standard React SPA. Section order:
Hero, Experience, Skills, Projects, InteractiveShowcase, MoreOnMe, Contact. Section
data lives in `src/data/` (`experience.ts`, `projects.ts`, `skills.ts`) and is
consumed by the matching component in `src/components/`. Theming is handled by
`src/hooks/useTheme.ts` (CSS variables + a random palette per load).

**3D mode** — a first-person WebGL world. Entered via the **Explore** nav button
(`handleExplore` in `App.tsx`), which lazy-loads `ThreePortfolio` via `React.lazy`
so it never bloats the 2D bundle. `LoadingScreen` covers the view until assets load.

### 3D world structure

`ThreePortfolio.tsx` is the orchestrator: it owns all React state/refs and a single
`useEffect` that builds the scene by calling the `setup/` factories, starts the
animation loop, and disposes everything on unmount. The heavy logic is split out:

| Path | Purpose |
|---|---|
| `three/setup/createScene.ts` | Renderer (ACES tone mapping, PCF soft shadows), camera, fog, HDRI skybox, Cannon world |
| `three/setup/createWorld.ts` | Ground, roads, world boundaries |
| `three/setup/createCabin.ts` | Cabin shell + interior: desk/monitor (emissive screen + glow), radio, table, printer, light switch, door, bed, chair |
| `three/setup/createBuildings.ts` | Project Blvd + Memory Lane buildings, Wayfarer building, collision hitboxes |
| `three/setup/createPark.ts` | Trees, bushes, fences, sidewalks, skatepark (procedural scatter via `mulberry32`) |
| `three/setup/createProps.ts` | Campfire + smoke, pond, ducks, ball pit, trampoline, ring-toss/bowling props |
| `three/setup/createCar.ts` | Drivable car (toon-shaded) + hitbox |
| `three/setup/createExhibit.ts` | Three.js demo exhibit (shaders, physics, rotating objects) |
| `three/setup/createSkillsZone.ts` | "Memory Lane" floating skill-icon sections |
| `three/setup/createProjectDisplays.ts` / `createProjectObjects.ts` / `createMemoryLaneDisplays.ts` | Project screens + rotating project objects (Earth, etc.) |
| `three/setup/createPlayer.ts` / `createCliff.ts` | Player model + boat/beach/cliff |
| `three/loop/animate.ts` | The per-frame loop: movement, physics step, camera (FPV/third-person blend), proximity detection, cinematics, minimap, tab-title zones |
| `three/minigames/bowling.ts`, `ringtoss.ts` | Mini-game state machines (`BowlState`, `RTossState`), high scores in `localStorage` |
| `three/ui/GameHUD.tsx`, `DebugOverlay.tsx` | In-world HUD prompts and the debug object editor |
| `three/constants.ts` | Numeric constants (coordinates, radii, proximity thresholds) |
| `three/helpers.ts` | `mulberry32` PRNG, `lerpAngle`, `fixFoliageMaterials`, `normalizeOpaqueMaterials` |
| `three/types.ts` | Shared types (`Movable`, `CylCol`, `BoxCol`, …) |

### Key conventions

- **Physics/collision**: Cannon-es for dynamic bodies; walkable geometry uses manual
  cylinder/box lists (`cylCols` / `boxCols`) plus `ceilCols` for ceilings.
- **State**: all mutable per-frame game state lives in `useRef`s; React state is only
  for UI overlays (HUD, prompts, loading screen).
- **Setup factories** take the scene + shared arrays/refs and return objects with an
  `update(elapsed)` fn where they need per-frame work; `animate.ts` calls them.
- **Debug overlay** (backtick `` ` ``): movables register `{ name, group, scaleObj }`
  for live position/rotation/scale tuning. Copy the values out and bake them back
  into the relevant `setup/` factory or `constants.ts`.
- **GLB gotchas**: many exported materials are flagged transparent while opaque (use
  `normalizeOpaqueMaterials`); foliage needs alpha-cutout (`fixFoliageMaterials`).
  Some GLBs ship embedded lights — strip them on load to avoid washing out a scene.
- **Tailwind CSS** is used for the 2D site and the 3D overlay UI.
