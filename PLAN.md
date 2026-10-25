# FFS Face Planner — MVP Plan (no backend)

## Goal
A free web app where someone scans their face on their phone, sculpts regions by dragging, and sees how ambitious each change is. Everything runs in the browser; no face data leaves the device unless the user exports it.

**MVP principle:** get one person from "open the link" to "edited face exported" on an iPhone. Accuracy, stability and edge cases come after.

## MVP scope
**In**
- Live face capture with MediaPipe (no photogrammetry yet)
- One neutral face mesh + one texture snapshot
- Region handles with smooth falloff, before/after toggle
- Achievability zones from a placeholder limits file
- Save locally, export GLB + JSON

**Out (for now)**
- Photogrammetry, FLAME fitting, expressions, CT import
- Real outcome data for limits (placeholders only, clearly labeled)
- Hair/lighting presets, multi-scan management, accounts, any server

## Stack
- Static site on GitHub Pages (free HTTPS, needed for camera)
- Plain ES modules + import maps, no build step
- MediaPipe Tasks Vision (Face Landmarker) for landmarks and mesh
- three.js for rendering, editing and GLB export
- IndexedDB for local storage

## Milestones

### M0 — Skeleton (deploy first)
- Repo, `index.html`, three.js scene rendering a test mesh
- Deploy to GitHub Pages; confirm camera permission works in iPhone Safari
- **Done when:** page loads on the phone and shows the camera feed

### M1 — Capture
- Run Face Landmarker on the live feed
- Guided prompt: look straight, hold still for ~2 seconds
- Average landmarks across frames to reduce jitter → neutral mesh (MediaPipe's canonical face topology)
- Grab one frontal frame as the texture
- Rough scale from iris landmarks (average iris ≈ 11.7 mm); label as approximate
- **Done when:** a textured 3D face of the user appears in the viewer

### M2 — Editor
- Regions defined as sets of landmark indices: brow ridge, forehead, jaw angle (L/R), lower jaw, chin, cheeks (L/R), lips, nose
- Drag a handle → move vertices along the surface normal with a smooth (Gaussian) falloff
- Optional symmetry toggle (mirror left/right edits)
- Before/after toggle, reset per region
- **Done when:** user can visibly reshape each region without tearing the mesh

### M3 — Achievability zones
- `limits.json`: per region and direction (reduce/add), thresholds for typical / ambitious / rare in mm — **values marked TBD/placeholder**
- Color the region and show a short message as the edit crosses each threshold
- Neutral anatomical labels only; visible "placeholder limits, not medical advice" banner
- **Done when:** dragging past a threshold changes the zone color and message

### M4 — Save & export
- Store original mesh, texture and edit list in IndexedDB (edits kept separate from scan)
- Export edited mesh as GLB (three.js GLTFExporter) + JSON sidecar (landmarks, edits, scale, app version)
- Prompt to "Add to Home Screen" and request persistent storage
- **Done when:** user can close the app, reopen it and export a file that opens in another viewer

**MVP = M0–M4 working end to end on one iPhone.**

## After MVP (rough order)
1. Accuracy check: compare against one reference scan; measure mm error
2. Mesh import: load OBJ/GLB from COLMAP, Meshroom or RealityScan and map regions onto it
3. Model fitting (FLAME, after license check) for consistent landmarks across scans
4. Expression capture + expression playback on edited face
5. Better capture guidance, quality checks, retake flow
6. Real limits from published outcome data, with per-region confidence
7. Hair/lighting presets, side-by-side compare, web viewer for exported files
8. Stability: older iPhones/no WebGPU, Android, low light, beards/glasses warnings, storage loss

## Risks to watch early
- MediaPipe mesh depth isn't metric → zone mm values are rough until mesh import/fitting
- Safari may clear site data → push home-screen install and exports
- Placeholder limits could be mistaken for real guidance → keep the banner prominent
