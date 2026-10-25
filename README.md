# FFS Face Planner

A free, fully client-side web app for planning facial-feminisation surgery changes: scan your
face on a phone, sculpt regions by dragging, and see how ambitious each change is. No backend —
face data never leaves the device unless you export it.

See [PLAN.md](PLAN.md) for scope and milestones, and `.agent/CONTINUITY.md` for current state.

**Status: M0 (skeleton).** The page shows the live camera feed with a three.js test mesh over it.
Face capture lands in M1.

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
| `Dockerfile`, `compose.yaml`, `nginx.conf` | local static server |

## Licence

GPL-3.0 — see [LICENSE](LICENSE).
