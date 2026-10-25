# FFS Face Planner

A free, fully client-side web app for planning facial-feminisation surgery changes: scan your
face on a phone, sculpt regions by dragging, and see how ambitious each change is. No backend —
face data never leaves the device unless you export it.

See [PLAN.md](PLAN.md) for scope and milestones, and `.agent/CONTINUITY.md` for current state.

**Status: M2 (editor) + head fitting.** Start the camera, hold still looking straight ahead, then
drag the handles to reshape ten face regions. The same landmarks are also fitted to a full-head
FLAME model, viewable with "Show fitted head"; region editing still works on the scan mask until
the regions are redefined on the fitted topology.

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
| `js/regions.js` | region seed landmarks and Gaussian vertex weights |
| `js/editor.js` | handle dragging, symmetry, compare, reset |
| `js/flame.js` | FLAME basis loading and shape evaluation |
| `js/fit.js` | fitting the head model to captured landmarks |
| `js/panel.js` | resizable/collapsible control panel |
| `flame/` | compact FLAME 2023 shape basis (see Head model) |
| `tools/prepare-flame.py` | regenerates that basis from the published model |
| `tools/prepare-embedding.py` | regenerates the MediaPipe correspondence |
| `Dockerfile`, `compose.yaml`, `nginx.conf` | local static server |

## Head model

`flame/flame-shape.bin` is derived from the **FLAME 2023** model by the Max Planck Institute
for Intelligent Systems, licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) and
available at <https://flame.is.tue.mpg.de/>.

**Changes made** (CC BY requires these be stated): the published model is a 53 MB pickle holding
400 shape components as float64. The shipped file keeps the first **100 of the 300 identity
components**, drops the 100 expression components and the pose correctives, converts the arrays
to float32 and the face indices to uint16 — about 6 MB. Beyond component 99 each further
component moves the surface by under 0.2 mm on average at three standard deviations, well below
this pipeline's own error.

To regenerate it, download `FLAME2023Open.zip` (registration required) and run:

```sh
python tools/prepare-flame.py ~/Downloads/FLAME2023Open.zip --components 100
```

Only the **2023** release is usable here: FLAME 2017/2019/2020 are licensed for non-commercial
research with no redistribution, so they cannot be shipped in this repo.

## Landmark correspondence

`flame/mediapipe-embedding.json` is derived from
[SMIRK](https://github.com/georgeretsi/smirk) (MIT, Copyright (c) 2024 George Retsinas), which
places 105 MediaPipe landmarks barycentrically on FLAME's surface. Verified against MediaPipe's
own `canonical_face_model.obj`: 2.96 mm mean residual after similarity alignment, against 45 mm
for a scrambled control.

It covers the central face only — no jawline, chin or forehead points — so the fitter adds the
jaw outline separately from MediaPipe's face-oval landmarks, re-matched to the model's silhouette
on each iteration.

## Accuracy

Every measurement this app reports is approximate, and the app says so. Scale is estimated from
iris width (assumed 11.7 mm) and measured roughly 5-8% small against a reference portrait;
MediaPipe's depth axis is not metric; and parts of the head have no observational support at all,
so they are inferred from the model's population statistics rather than from your scan. Treat the
millimetre figures as relative, not absolute, and never as medical advice.

## Licence

GPL-3.0 — see [LICENSE](LICENSE). The bundled FLAME basis is CC BY 4.0, as described above.
