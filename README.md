# Tesseract Maze — Geometric Illusion Prototype

A 3D spatial puzzle game built with **Three.js** that projects a 4D hypercube (tesseract) into 3D space, creating impossible-looking topological mazes with switchable gravity.

![Three.js](https://img.shields.io/badge/Three.js-r170-blue?logo=threedotjs)
![Vanilla JS](https://img.shields.io/badge/Vanilla-ES%20Modules-yellow?logo=javascript)
![License](https://img.shields.io/badge/License-MIT-green)

## ✨ Features

- **4D Tesseract Maze** — 16 vertices and ~20 corridors generated via Kruskal's algorithm, rendered as a stereographic projection from 4D → 3D
- **6-Axis Gravity Switching** — Redefine "down" to any cardinal direction with smooth quaternion SLERP transitions
- **Real-time 4D Rotation** — Rotate the hypercube in the XW and YW planes, morphing the maze topology before your eyes
- **Puzzle Mechanics** — Pick up geometric pieces (tetrahedron, cube, dodecahedron) and deliver them to matching target slots
- **Custom GLSL Shaders** — Flat-shaded rim lighting with cel shading and animated glow effects
- **Low-Poly Aesthetic** — Deliberate low polygon counts with high-contrast rim lighting emphasizing geometric edges
- **Bloom Post-Processing** — UnrealBloomPass for glowing neon edges
- **Premium HUD** — Glassmorphic panels with gravity indicator, score display, and control hints

## 🎮 Controls

| Key | Action |
|-----|--------|
| **W/A/S/D** or **Arrows** | Move player to adjacent vertex |
| **1-6** | Switch gravity (Down/Up/Left/Right/Forward/Back) |
| **Q/E** | Rotate tesseract in XW plane |
| **R/F** | Rotate tesseract in YW plane |
| **Space** | Pick up / place puzzle piece |
| **Mouse drag** | Orbit camera |
| **P** | Toggle FPS counter |

## 🚀 Getting Started

No build step required — this is a vanilla ES modules project.

```bash
# Clone the repo
git clone https://github.com/sgurau/tesseract-maze.git
cd tesseract-maze

# Serve locally (any static server works)
npx serve -l 3000

# Open in browser
open http://localhost:3000
```

> **Note:** Must be served over HTTP/HTTPS — `file://` won't work due to ES module CORS restrictions.

## 🏗️ Architecture

```
├── index.html          # Entry point with Three.js importmap
├── index.css           # Dark glassmorphic HUD styling
└── js/
    ├── main.js         # Game loop & orchestration
    ├── scene.js        # Three.js scene, camera, lights, bloom
    ├── maze.js         # 4D tesseract generation & projection
    ├── gravity.js      # 6-axis gravity switching system
    ├── player.js       # Player controller & piece carrying
    ├── snap.js         # Geometric fit detection & snap animation
    ├── shaders.js      # Custom GLSL rim lighting materials
    └── ui.js           # HUD rendering & gravity indicator
```

## 🧮 Key Algorithms

### 4D Projection
Vertices are defined in 4D as all 16 combinations of (±1, ±1, ±1, ±1). After applying 4D rotation matrices (XW and YW planes), stereographic projection maps them to 3D:

```
factor = 2.0 / (3.0 - w)
x' = x × factor
y' = y × factor  
z' = z × factor
```

### Maze Generation
Kruskal's algorithm with union-find creates a spanning tree over the tesseract's 32 edges, plus 5 extra edges for alternative paths.

### Gravity Transitions
Smooth axis switching via quaternion SLERP with cubic ease-out interpolation, preventing gimbal lock artifacts.

## 🎨 Visual Design

- **Color Palette**: Deep space blues (#0a0a1a) with neon accents (cyan #00f0ff, magenta #ff006e, green #39ff14, gold #ffd700, violet #7b2fff)
- **Shading**: Custom GLSL flat-shaded materials with `dFdx`/`dFdy` derivative-based normals
- **Rim Lighting**: Fresnel-based edge glow: `rim = pow(1 - dot(viewDir, normal), rimPower)`
- **Post-Processing**: UnrealBloomPass (strength 0.6, radius 0.4, threshold 0.2)

## 📝 License

MIT
