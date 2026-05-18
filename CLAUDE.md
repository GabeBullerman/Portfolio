# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (Vite)
npm run build    # TypeScript check + Vite production build
npm run preview  # Preview production build locally
```

No test suite is configured.

## Architecture

This is a React + TypeScript portfolio site built with Vite. It has two distinct modes toggled by a floating cube button in the top-right corner:

**2D Mode** — standard React SPA with sections: Hero, Experience, Skills, Projects, Certifications, MoreOnMe, Contact. Data for each section lives in `src/data/` (experience.ts, skills.ts, projects.ts) and is consumed by the matching component in `src/components/`.

**3D Mode** — a first-person WebGL world built entirely inside `src/components/ThreePortfolio.tsx`. This single file (~1600+ lines) contains the entire Three.js scene, Cannon-es physics world, asset loading, player controller, mini-games, and all interaction logic. It lazy-loads via `React.lazy` so it doesn't bloat the initial bundle.

### 3D World internals

- **Scene setup**: Three.js renderer with ACES filmic tone mapping, PCF soft shadows, exponential fog, and an HDRI skybox loaded from `/images/*.hdr`.
- **Physics**: Cannon-es world with a static ground plane. The player is a cylinder body; collision is also handled via a manual cylinder/box list (`cylCols` / `boxCols`) for finer control over walkable geometry.
- **Player controller**: Pointer Lock API for mouse look; WASD + Space/E keybinds; touch joystick for mobile. All mutable game state is stored in `useRef`s inside the single `useEffect` — React state is used only for UI overlays.
- **Sections**: Defined in `src/components/three/constants.ts` as `SECTIONS` (world-space X/Z waypoints). Each section has a wooden sign in the world; approaching one triggers a focus camera animation and shows `SectionOverlay` (the same portfolio data from `src/data/`).
- **Mini-games**: Bowling and ring toss — each has its own state machine (`BowlState`, `RTossState`) with high scores persisted in `localStorage`.
- **Interactive objects**: cabin door, light switch (toggles a SpotLight), benches/chair for sitting, trampoline (physics-based bounce), ladder climb, ball pit.
- **Assets**: GLTF/GLB and FBX models loaded from `public/assets/`. Nature assets (trees, bushes, stones, flowers, mushrooms) are scattered procedurally using a seeded PRNG (`mulberry32` in `src/components/three/helpers.ts`).

### Supporting files in `src/components/three/`

| File | Purpose |
|---|---|
| `constants.ts` | All numeric constants and section waypoints — edit positions/sizes here |
| `helpers.ts` | `mulberry32` seeded PRNG, `lerpAngle` utility |
| `signTextures.ts` | Canvas-drawn sign textures for in-world section markers |
| `SectionOverlay.tsx` | The wood-panel modal rendered over the 3D canvas when a section is focused |

### Key conventions

- All Three.js/Cannon objects are created inside the single `useEffect` in `ThreePortfolio.tsx`. Do not move logic outside this effect — the cleanup function disposes everything on unmount.
- Positional constants (coordinates, radii, proximity thresholds) belong in `constants.ts`, not inline in `ThreePortfolio.tsx`.
- The debug overlay (backtick `` ` `` to toggle) exposes an object editor for live position/rotation/scale tuning — finalized values should be committed back to `constants.ts` or the relevant inline position call.
- Tailwind CSS is used for the 2D site and for overlay UI inside the 3D view.
