# FFS Face Planner

A free, fully client-side web app for planning facial-feminisation surgery changes: scan your
face on a phone, sculpt regions by dragging, and see how ambitious each change is. No backend —
face data never leaves the device unless you export it.

See [PLAN.md](PLAN.md) for scope and milestones, and `.agent/CONTINUITY.md` for current state.

**Status: M1 (capture).** Start the camera, hold still looking straight ahead, and a textured 3D
face mesh is built from averaged MediaPipe landmarks. Region editing lands in M2.

Scale comes from iris width (assumed 11.7 mm) and is approximate: measured against a reference
portrait it reads roughly 5-8% small, and MediaPipe's depth axis is not metric at all.

> Achievability limits are placeholders, not medical advice.

## Run locally

```sh
docker compose up --build
```

Then open <http://localhost:8080>. The camera works there because `localhost` counts as a secure
context; a phone reaching the container over a LAN IP does **not**, so on-device testing goes
through the HTTPS GitHub Pages deploy.

Edits to the site are served immediately — the repo is bind-mounted into the container, so no
rebuild is needed.

## Stack

No build step. Plain ES modules with an import map; dependencies load from jsDelivr, pinned:

| Dependency | Version | Used for |
| --- | --- | --- |
| [three.js](https://threejs.org) | 0.186.1 | rendering, editing, GLB export |
| [@mediapipe/tasks-vision](https://ai.google.dev/edge/mediapipe) | 1.1.1 | face landmarks (M1) |

## Layout

| Path | Purpose |
| --- | --- |
| `index.html` | markup, styles, import map |
| `js/app.js` | entry point, UI wiring, diagnostics |
| `js/camera.js` | `getUserMedia` capture and error messages |
| `js/viewer.js` | three.js scene over the feed |
| `js/landmarker.js` | MediaPipe Face Landmarker setup, head pose |
| `js/capture.js` | guided hold-still capture and landmark averaging |
| `js/facemesh.js` | landmarks to a textured mesh in millimetres |
| `Dockerfile`, `compose.yaml`, `nginx.conf` | local static server |

## Licence

GPL-3.0 — see [LICENSE](LICENSE).
