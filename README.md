# Gabriel Bullerman — Portfolio

An interactive portfolio with two ways to explore it:

- **2D site** — a fast, themeable React single-page portfolio (hero, experience, skills, projects, interactive WebGL demos, about, contact).
- **3D world** — a first-person, explorable cabin-and-park scene built with Three.js + Cannon-es physics: walk around, drive a car, play mini-games (bowling, ring toss), browse projects on "Project Blvd", view skills on "Memory Lane", and sit at the in-world computer to bring up the 2D portfolio.

Click **Explore** in the nav to enter the 3D world; use **← 2D View** to return.

## Tech stack

- **React 18 + TypeScript**, built with **Vite**
- **Three.js** (WebGL) for the 3D world and the 2D interactive demos
- **Cannon-es** for physics
- **Tailwind CSS** for styling and overlay UI
- **Vercel** for hosting (auto-deploys from `main`) + **Vercel Analytics**

## Getting started

```bash
npm install
npm run dev      # start the Vite dev server
npm run build    # type-check + production build
npm run preview  # preview the production build locally
```

## Performance notes

- The 3D world (`ThreePortfolio`) and the WebGL demos are **lazy-loaded**, so the
  2D site ships a small initial bundle; Three.js only downloads when needed.
- Assets are gated behind a themed loading screen that waits for models, textures,
  and shaders to finish (and pre-warms the GPU) before revealing the world.

## Controls (3D world)

- **WASD / Arrows** — move · **Space** — jump · **E** — interact
- **Mouse** — look (click to capture) · mobile uses on-screen joysticks
- Press **`` ` ``** to toggle the debug overlay (live position/rotation/scale tuning)
