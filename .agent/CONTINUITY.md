# CONTINUITY — FFS Face Planner

Canonical briefing. Read before acting. Facts only; every entry dated (ISO) and provenance-tagged.

## Goal
Free, fully client-side web app: scan a face on a phone, sculpt regions by dragging, see how
ambitious each change is. No backend. MVP = PLAN.md M0–M4 working end to end on one iPhone.

## State
- 2026-10-24T20:15Z [TOOL] Repo initialized at `C:\Code\ffs-planner`, branch `main`.
  Remote `origin` = `git@github.com:salixbloom/ffs-planner.git`. Nothing pushed yet.
- 2026-10-24T20:40Z [TOOL] SUPERSEDES the 20:15Z "Repository not found" entry: the repo exists.
  `~/.ssh/config` defines host alias `github.com-salixbloom` → github.com with
  `IdentityFile ~/.ssh/id_ed25519_salixbloom`, `IdentitiesOnly yes`. Bare `git@github.com`
  resolves to the default key, which authenticates as **Sinuboh** and cannot see the repo.
  Origin URL is now `git@github.com-salixbloom:salixbloom/ffs-planner.git` — always use the alias
  for this repo. `gh` CLI is not installed.
- 2026-10-24T20:15Z [TOOL] Docker CLI 28.1.1 / Compose v2.35.1 present; daemon NOT running
  (Docker Desktop stopped), so `docker compose build` is UNCONFIRMED.
- 2026-10-25T05:35Z [CODE] SUPERSEDES the 05:10Z M0-only entry: M0 complete and deployed, M1 code
  complete. Modules `js/{app,camera,viewer,landmarker,capture,facemesh}.js`. `window.__ffs`
  exposes frameCount/cameraActive/hasFace/scaleMmPerUnit/captureState for automated checks.
- 2026-10-25T05:20Z [USER] M0 confirmed on iPhone: face correct, mesh stable. Pages live at
  https://salixbloom.github.io/ffs-planner/ (200 [TOOL]).

## [PLANS]
- 2026-10-24T20:15Z [USER] Next: connect to GitHub remote + minimal container (this task).
- 2026-10-25T05:35Z [CODE] Next: M2 editor per PLAN.md - region landmark-index sets, drag along
  surface normal with Gaussian falloff, symmetry toggle, before/after, per-region reset.
  Geometry is already in mm, so M3 thresholds can read straight off it.
- 2026-10-25T05:35Z [CODE] Open follow-up: iris-derived scale reads ~5-8% small (see OUTCOMES).
  Do NOT fudge a correction factor from one sample; settle it with the reference-scan accuracy
  check that PLAN.md lists as the first post-MVP item.

## [DECISIONS]
- 2026-10-24T20:15Z [USER] Use `git@github.com:salixbloom/ffs-planner.git` as origin.
- 2026-10-24T20:15Z [USER] Add a minimal container despite the no-build-step stack; it serves the
  repo root as a static site rather than building anything.
- 2026-10-24T20:15Z [ASSUMPTION] Container = `nginx:alpine` on port 8080, repo root bind-mounted
  read-only for live editing, `Cache-Control: no-store` so edited ES modules reload. Image tag left
  unpinned (`alpine`) rather than guessing a specific nginx version.
- 2026-10-24T20:15Z [ASSUMPTION] Site root = repo root (GitHub Pages serves from root per PLAN.md),
  so the container's document root is the repo root too.
- 2026-10-24T20:25Z [CODE] `.gitattributes` sets `* text=auto eol=lf`; the Dockerfile and nginx.conf
  are read inside Linux, so CRLF checkout on Windows is not acceptable.
- 2026-10-25T05:10Z [TOOL] Dependency versions pinned from registry.npmjs.org on 2026-10-25:
  three 0.186.1, @mediapipe/tasks-vision 1.1.1. Both resolve 200 on cdn.jsdelivr.net, including
  `examples/jsm/` addons and `vision_bundle.mjs`. Pin exact versions in the import map; no ranges.
- 2026-10-25T05:10Z [ASSUMPTION] Pages will deploy from branch `main` at root (no Actions workflow)
  since the repo root is the site. `.nojekyll` added so Jekyll does not process the tree.
- 2026-10-25T05:10Z [CODE] The video element sits behind the canvas; the renderer uses
  `alpha: true` + `setClearAlpha(0)` so M1 can draw the face mesh registered over the feed.
- 2026-10-25T05:35Z [CODE] Face geometry is built in MILLIMETRES (landmarks -> isotropic units,
  scaled by mm/unit from iris width), so M3 compares edits to mm thresholds with no conversion
  layer. Camera near/far spans both the mm face and the unit-scale test mesh.
- 2026-10-25T05:35Z [CODE] Texture is the UNMIRRORED captured frame, UV = (lm.x, 1 - lm.y). The
  live feed is mirrored for a natural selfie view, the captured mesh is not, so the mesh shows
  true anatomical orientation.
- 2026-10-25T05:35Z [CODE] Mesh material is unlit MeshBasicMaterial, side DoubleSide: the texture
  already carries lighting and tessellation winding is not guaranteed consistent.

## [PROGRESS]
- 2026-10-24T20:15Z [CODE] Added `Dockerfile`, `nginx.conf`, `compose.yaml`, `.dockerignore`,
  `.gitignore`, placeholder `index.html`, this file.
- 2026-10-25T05:10Z [CODE] Added M0: `index.html`, `js/app.js`, `js/camera.js`, `js/viewer.js`,
  `.nojekyll`, `README.md`.
- 2026-10-25T05:35Z [CODE] Added M1: `js/landmarker.js`, `js/capture.js`, `js/facemesh.js`;
  viewer gained showFace/clearFace/setFrameCallback; capture button + progress bar.
- 2026-10-25T04:42Z [TOOL] SUPERSEDES the 20:25Z UNCONFIRMED build entry: container verified.
  `docker compose up -d --build` succeeds (nginx 1.31.8); `GET http://localhost:8080/` → 200,
  `Content-Type: text/html; charset=utf-8`, `Cache-Control: no-store`. Bind-mount live edits are
  served without a rebuild.
- 2026-10-24T20:40Z [TOOL] Remote `main` already held one commit (`f702899 Initial commit`,
  GPL-3.0 `LICENSE` only). Local commits were rebased onto it — linear history, LICENSE preserved,
  no force-push. Pushed to `origin/main`.

## [DISCOVERIES]
- 2026-10-24T20:40Z [TOOL] Two GitHub identities exist on this machine. The default SSH key is
  Sinuboh; salixbloom is reachable only through the `github.com-salixbloom` alias. A plain
  `git@github.com:salixbloom/...` URL fails with a misleading "Repository not found".
- 2026-10-24T20:40Z [USER] Project license is GPL-3.0 (confirmed 2026-10-25); LICENSE came from
  the remote's initial commit. Relevant to the post-MVP FLAME-fitting license check in PLAN.md.
- 2026-10-25T04:42Z [TOOL] nginx serves `.wasm` as `application/wasm` out of the box — M1's
  MediaPipe Tasks Vision load needs this, so no custom `types` block is required.
- 2026-10-25T04:42Z [CODE] `.dockerignore` must NOT list `nginx.conf`: the Dockerfile COPYs it from
  the build context, and ignoring it fails the build with `"/nginx.conf": not found`.
- 2026-10-25T05:30Z [TOOL] FACE_LANDMARKS_TESSELATION is an EDGE list, not triangles, but it is
  generated from triangles: 2556 edges = 852 closed triples, every triple verified
  (a.end==b.start, b.end==c.start, c.end==a.start), spanning landmarks 0..467. Iris landmarks
  468..477 lie outside the tessellation, so they are scale-only.
- 2026-10-25T05:30Z [TOOL] A backgrounded Chrome tab throttles rAF to ~1 Hz (measured deltas
  ~1007 ms). Hold-duration and frame-budget logic must assume this; automated checks of the
  capture flow run ~30x slower than a foreground tab.
- 2026-10-25T05:30Z [TOOL] MediaPipe wasm logs on every load, including one INFO line ("Created
  TensorFlow Lite XNNPACK delegate for CPU") that the console tags as an ERROR. Not a failure.
- 2026-10-24T20:15Z [ASSUMPTION] Camera needs a secure context. `http://localhost:8080` qualifies,
  but a phone reaching the container over a LAN IP does NOT — on-device testing goes through the
  HTTPS GitHub Pages deploy, not this container.

## [OUTCOMES]
- 2026-10-25T05:10Z [TOOL] M0 verified in desktop Chrome at `http://localhost:8080`: modules load
  with zero console messages, WebGL2 context (ANGLE/D3D11), render loop advances, and the WebGL
  canvas composites over the video instead of occluding it (checked with a synthetic green feed).
  Camera UI paths exercised with a stubbed `getUserMedia`: NotAllowedError -> "Camera permission
  was denied..." in the error style; success -> "Camera running", button flips to "Stop camera",
  diagnostics report the negotiated `640x480@24fps`; stop -> tracks released, button resets.
  A real `getUserMedia` prompt was NOT triggered (permission state `prompt`; a native bubble can
  freeze browser automation). REMAINING: iPhone Safari camera confirmation, which is M0's actual
  done-criterion, and the Pages deploy.
- 2026-10-25T05:20Z [USER] M0 DONE. iPhone Safari shows the camera feed, face proportions correct,
  mesh stable. Pages serving over HTTPS.
- 2026-10-25T05:35Z [TOOL] M1 verified end to end by feeding a public-domain frontal portrait into
  the real pipeline as a synthetic camera stream (no live face needed): capture completed, mesh
  built with 468 vertices / 852 triangles, UVs and texture present, bbox 145 x 169 x 102 mm.
  Console carried only MediaPipe wasm logging, nothing from app code.
  TWO BUGS FOUND AND FIXED by that test:
  (1) the hold completed on elapsed time alone, so under 1 Hz rAF throttling it averaged ONE
      frame, defeating the averaging. Fixed with MIN_FRAMES=24 plus a 100 ms per-tick dt clamp;
      re-verified at 24 frames.
  (2) iris width used a single ring axis; averaging both axes moved IPD 56.6 -> 58.8 mm.
  RESIDUAL [ASSUMPTION]: scale still reads low against adult references (IPD 58.8 vs ~60-66,
  outer canthal 84.3 vs ~88-92, mouth width 52.8 within ~45-55) - roughly 5-8% small. Measured on
  ONE portrait of unknown true dimensions, so the bias is indicative, NOT established. Depth
  (102 mm) is the least trustworthy axis, as PLAN.md's first risk predicts.
