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
- 2026-10-25T05:10Z [CODE] SUPERSEDES the 20:15Z "no application code" entry: M0 skeleton exists.
  `index.html` + `js/{app,camera,viewer}.js`. Camera feed behind a transparent three.js canvas;
  test mesh (torus knot) with OrbitControls; on-page diagnostics panel; `window.__ffs` exposes
  `frameCount`/`cameraActive` for automated checks. Not yet deployed to Pages.

## [PLANS]
- 2026-10-24T20:15Z [USER] Next: connect to GitHub remote + minimal container (this task).
- 2026-10-25T05:10Z [CODE] M0 code is done and verified in desktop Chrome. Remaining for M0:
  enable GitHub Pages (Settings -> Pages -> Deploy from a branch -> main / root) and confirm the
  camera prompt on a real iPhone. Then M1 (Face Landmarker) per PLAN.md.

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

## [PROGRESS]
- 2026-10-24T20:15Z [CODE] Added `Dockerfile`, `nginx.conf`, `compose.yaml`, `.dockerignore`,
  `.gitignore`, placeholder `index.html`, this file.
- 2026-10-25T05:10Z [CODE] Added M0: `index.html`, `js/app.js`, `js/camera.js`, `js/viewer.js`,
  `.nojekyll`, `README.md`.
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
