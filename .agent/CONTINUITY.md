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
- 2026-10-25T06:20Z [CODE] SUPERSEDES the 05:35Z entry: M0-M2 code complete, M0/M1 confirmed on
  device. Modules js/{app,camera,viewer,landmarker,capture,facemesh,regions,editor}.js.
  window.__ffs exposes frameCount/cameraActive/hasFace/scaleMmPerUnit/captureState/edits plus
  _internals.{viewer,editor} for automated checks.
- 2026-10-25T07:05Z [CODE] Layout is a flex column (banner / stage / panel); the panel takes space
  FROM the viewer instead of covering it, and js/panel.js makes it drag-resizable and tap-to-
  collapse. Added after the panel was found overlaying the lower face.
- 2026-10-25T05:20Z [USER] M0 confirmed on iPhone: face correct, mesh stable. Pages live at
  https://salixbloom.github.io/ffs-planner/ (200 [TOOL]).

## [PLANS]
- 2026-10-25T08:30Z [USER] DIRECTION SET: pull PLAN.md post-MVP item 3 (model fitting) forward,
  using FLAME 2023, and leave item 2 (photogrammetry mesh import) where it is. The jaw problem is
  topology, not scanning. NEXT BLOCKER: there is no MediaPipe-468 -> FLAME-5023 landmark
  correspondence yet, and the FLAME zip ships none - that mapping must be sourced or derived
  before any fitting can run. After fitting lands, M2's regions must be redefined on FLAME
  topology (the current seed indices are MediaPipe indices and do NOT transfer).
- 2026-10-24T20:15Z [USER] Next: connect to GitHub remote + minimal container (this task).
- 2026-10-25T06:20Z [CODE] Next: M3 achievability zones - limits.json with placeholder per-region
  thresholds, colour + message on crossing. Edits are already millimetre amounts per region id
  (editor summary), which is exactly the shape the thresholds compare against.
- 2026-10-25T07:05Z [TOOL] SUPERSEDES the 06:20Z "M2 unverified visually" entry: the window came
  back and M2 was confirmed visually (see OUTCOMES).
- 2026-10-25T05:35Z [CODE] Open follow-up: iris-derived scale reads ~5-8% small (see OUTCOMES).
  Do NOT fudge a correction factor from one sample; settle it with the reference-scan accuracy
  check that PLAN.md lists as the first post-MVP item.

## [DECISIONS]
- 2026-10-25T08:30Z [USER] Ship 100 identity components and COMMIT the derived binary to the repo
  (rather than have contributors generate it). Attribution in both README and in-app.
- 2026-10-25T08:30Z [USER] No per-region measured/inferred tiers for now - a single blanket
  warning in the panel instead. KNOWN TRADE, raised and accepted: the warning cannot distinguish
  inferred jaw geometry from measured face geometry, so jaw numbers will look exactly as
  trustworthy as nose numbers.
- 2026-10-25T08:30Z [CODE] Do NOT ship the FLAME texture space: 1.2 GB, and pointless here since
  the texture is the captured camera frame. Its licence may also differ from FLAME 2023's CC-BY.
- 2026-10-25T08:30Z [CODE] `.gitattributes` must keep `*.bin binary`. The repo-wide
  `* text=auto eol=lf` would otherwise risk line-ending translation on model data, which fails
  silently and far from the cause.
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
- 2026-10-25T06:20Z [CODE] A region = seed landmark indices + radiusMm. Vertex weight is a
  Gaussian (sigma = radius/2) on distance to the NEAREST seed, which suits elongated regions
  (jawline) as well as compact ones (chin). Lips and brows use the exported MediaPipe
  LIPS/EYEBROW sets; the rest use seeds verified against the captured geometry.
- 2026-10-25T06:20Z [CODE] All vertices in a region move along ONE direction (the weighted mean
  normal), not their own per-vertex normals, which would tear the mesh where curvature is high.
- 2026-10-25T06:20Z [CODE] Edits are stored as mm per region id and never baked into the mesh;
  displayed positions are always base + sum(edits). That is what gives exact compare/reset, and
  is the form M4 needs to store edits separately from the scan.
- 2026-10-25T07:05Z [USER] The bottom panel must never push the 3D preview out of view: it either
  drags away or takes its space from the viewer. Both were implemented - flex layout so the stage
  shrinks rather than being covered, plus a grip to drag/collapse.
- 2026-10-25T07:05Z [CODE] The panel sets an explicit pixel height only once the user drags or
  taps it; until then it sizes to content. panel.refit() is called from the few functions that
  change panel contents (setStatus, setProgress, renderEdits, start/stopEditing, capture reveal)
  so a user-set height does not clip newly added controls. Deliberately NOT a ResizeObserver on
  the panel body: panel height drives body height, so that would feed back on itself.
- 2026-10-25T06:20Z [CODE] Drag sensitivity is DELIBERATELY not 1:1 handle-follows-finger. One
  screen height is ~300 mm at normal viewing distance, so tracking the finger made the smallest
  nudge bigger than any realistic change (a 60 px drag gave -79 mm on the brow). Rate is now
  DRAG_RADII_PER_SCREEN (2) x the radius of the region per canvas height; the screen projection
  decides direction only.

## [PROGRESS]
- 2026-10-24T20:15Z [CODE] Added `Dockerfile`, `nginx.conf`, `compose.yaml`, `.dockerignore`,
  `.gitignore`, placeholder `index.html`, this file.
- 2026-10-25T05:10Z [CODE] Added M0: `index.html`, `js/app.js`, `js/camera.js`, `js/viewer.js`,
  `.nojekyll`, `README.md`.
- 2026-10-25T05:35Z [CODE] Added M1: `js/landmarker.js`, `js/capture.js`, `js/facemesh.js`;
  viewer gained showFace/clearFace/setFrameCallback; capture button + progress bar.
- 2026-10-25T06:20Z [CODE] Added M2: js/regions.js, js/editor.js; viewer exposes camera/controls;
  editor UI (symmetry toggle, hold-to-compare, reset all, per-region reset).
- 2026-10-25T07:05Z [CODE] Added js/panel.js and reflowed index.html to a flex column; banner and
  panel are in normal flow (were position:fixed), body height is 100dvh.
- 2026-10-25T04:42Z [TOOL] SUPERSEDES the 20:25Z UNCONFIRMED build entry: container verified.
  `docker compose up -d --build` succeeds (nginx 1.31.8); `GET http://localhost:8080/` → 200,
  `Content-Type: text/html; charset=utf-8`, `Cache-Control: no-store`. Bind-mount live edits are
  served without a rebuild.
- 2026-10-24T20:40Z [TOOL] Remote `main` already held one commit (`f702899 Initial commit`,
  GPL-3.0 `LICENSE` only). Local commits were rebased onto it — linear history, LICENSE preserved,
  no force-push. Pushed to `origin/main`.

## [DISCOVERIES]
- 2026-10-25T09:15Z [TOOL] A published MediaPipe->FLAME correspondence exists and WORKS, but its
  coverage is central-face only. Source: SMIRK (github.com/georgeretsi/smirk, MIT),
  `assets/mediapipe_landmark_embedding/mediapipe_landmark_embedding.npz`, 4518 bytes. Format per
  its own readme: 105 MediaPipe points embedded barycentrically in FLAME's surface, as
  lmk_face_idx (FLAME triangle), lmk_b_coords (barycentric weights), landmark_indices (MediaPipe
  vertex ids). flame-head-tracker was REJECTED as a source: its licence is NOASSERTION and it
  disclaims third-party permissions.
- 2026-10-25T09:15Z [TOOL] Embedding verified geometrically against MediaPipe's own
  canonical_face_model.obj (468 verts) and FLAME's v_template, aligned by Umeyama similarity.
  Structurally clean: 105 landmarks, triangle indices 3..8834 < 9976, barycentric sums exactly
  1.000000, no negative weights, MediaPipe indices 0..466. Residual mean 2.96 mm, median 2.84,
  p90 4.31, max 7.29 (calibrated at 10.122 mm/unit from a 90 mm outer canthal distance), against
  45.05 mm for a scrambled control - 15.2x better than chance, so the mapping is real. NOTE the
  residual also contains the genuine shape difference between two DIFFERENT mean faces, so it is
  an upper bound on mapping error, not a measurement of it.
- 2026-10-25T09:15Z [TOOL] COVERAGE GAP, decisive for this project: the embedding contains ZERO
  of the 36 face-oval points, and none of the M2 seeds for forehead, cheeks, jaw-angle, lower-jaw
  or chin (nose is 3/4; brows/eyes/mouth are covered). Embedded points span y -54..+52 mm of a
  face spanning -95..+84 mm, so the bottom ~41 mm (chin and jawline) and top ~32 mm (upper
  forehead) have no landmarks at all; 49 canonical vertices sit below the lowest embedded point.
  CONSEQUENCE: fitting FLAME with this embedding alone leaves the jaw determined entirely by the
  shape prior - including the jawline silhouette that MediaPipe DOES observe. That does not fix
  the problem which motivated the FLAME work.
- 2026-10-25T09:15Z [ASSUMPTION] Supplementing with oval/jawline correspondences is NOT just
  adding indices: silhouette landmarks slide over the surface with head pose (the classic contour
  -landmark problem in 3DMM fitting), so they need dynamic/sliding correspondence rather than
  fixed vertex pairs. UNCONFIRMED how much that costs here.
- 2026-10-25T08:30Z [TOOL] FLAME 2023 (flame2023_Open.pkl, 53 MB) inspected directly: 5023
  vertices, 9976 faces, metres. Arrays: shapedirs (5023,3,400) float64 = 48.2 MB (91% of the
  file), posedirs (5023,3,36) = 4.3 MB, v_template/weights/f/J/J_regressor all < 0.5 MB.
  Model metadata states `expr_components = last_100`, `n_expr = 100`, so shapedirs[:,:,:300] is
  identity and the last 100 are expression - VERIFIED from the file, not assumed. The expression
  basis is `expr_source = SUPR_head`, `supr_gender = male`: irrelevant to identity shape, but
  worth weighing when expressions arrive in a feminisation tool.
- 2026-10-25T08:30Z [TOOL] Shipped basis = first 100 identity components as float32 + template +
  uint16 faces = 6.15 MB. Round-trip verified against the pickle: byte count exact, template err
  7.5e-9 m, basis err 4.6e-10 m, faces identical, max index 5022 < 5023. Template extent
  217.6 x 319.4 x 228.3 mm - a full head WITH neck, which is the point.
- 2026-10-25T08:30Z [TOOL] Component contribution falls off fast: at 3 sigma, component 0 moves
  the surface 10.0 mm mean / 31.2 mm max, component 50 is 0.38/2.24 mm, component 99 is
  0.19/1.35 mm. Past ~50 the components contribute less than this pipeline's own scale bias
  (5-8%), so 100 is generous and truncation costs nothing measurable.
- 2026-10-25T08:30Z [TOOL] FLAME downloads are account-gated (flame.is.tue.mpg.de/download.php),
  so the model cannot be fetched unattended; the zip must come from a human login.
- 2026-10-25T08:30Z [TOOL] NoW benchmark figures for context, NOT a forecast for this pipeline:
  MICA 0.90 mm median non-metrical / 1.08 mm metrical, DECA 1.09 / 1.35 mm. These are learned
  networks using the whole image, scored after rigid alignment on a face-region mask, and the
  non-metrical numbers permit rescaling during alignment - which hides exactly the scale error
  this project has. A browser-side landmark-only fit will do worse, and the jaw periphery and
  neck are barely evaluated by that benchmark at all.
- 2026-10-25T07:40Z [USER] The MediaPipe mesh is a face MASK bounded by the face oval - no skull,
  ramus, neck or back of head. Pushing a region seeded on that rim moves the mesh's free edge
  (a flange), not a volume, so jaw edits are not predictable. CONFIRMED by seed membership:
  lower-jaw 6/6 seeds on the oval rim, jaw-angle 2/2 each side, forehead 3/4, chin 1/3, nose and
  cheeks 0/n. This is why jaw-angle moves only 15 vertices against nose 149 and forehead 87 - the
  Gaussian is one-sided, half its support falling where no vertices exist.
  CONSEQUENCE FOR M3: a "jaw angle +8 mm" threshold would measure boundary displacement, not
  bigonial width. Rim regions need either a landmark-measurement definition or a full-head mesh.
- 2026-10-25T07:40Z [TOOL] LICENCE GATE RESOLVED (PLAN.md post-MVP item 3 said "after license
  check"), from primary sources on 2026-10-25:
  * FLAME 2023 is CC-BY 4.0 - commercial use AND redistribution permitted with attribution
    (flame.is.tue.mpg.de/modellicense.html). FLAME 2017/2019/2020 remain non-commercial with NO
    redistribution, so the 2023 release is the only usable one. Acceptable-use terms bar
    pornographic and defamatory use. CC-BY is attribution-only, so it composes with this repo's
    GPL-3.0 as long as attribution is preserved.
  * ICT-FaceKit (USC-ICT) is MIT - commercial use and redistribution permitted.
  * FLAME covers the full head: linear shape space from 3800 head scans plus an articulated jaw,
    neck and eyeballs, pose-dependent correctives and expression blendshapes. Vertex count is
    UNCONFIRMED (not stated on the model page).
- 2026-10-25T07:40Z [ASSUMPTION] The jaw problem is a TOPOLOGY problem, not a scanning one.
  Fitting a full-head template to the 468 landmarks we already capture would fix it without
  photogrammetry; in-browser photogrammetry is not viable (COLMAP/Meshroom are desktop C++,
  RealityScan is a separate app) and importing a scan does NOT by itself restore region editing,
  because an arbitrary scan has no landmark correspondence. UNCONFIRMED until prototyped.
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
- 2026-10-25T06:20Z [TOOL] Chrome reports innerWidth/innerHeight = 0 and canvas rects of 0x0 when
  its window is minimised, while document.visibilityState still reads "visible" and
  Page.captureScreenshot times out. Any pointer maths divided by those sizes yields NaN. To test
  interaction anyway, set explicit px sizes on #stage and #gl: absolute lengths lay out anyway.
- 2026-10-25T06:20Z [TOOL] MediaPipe exports FACE_LANDMARKS_LIPS / LEFT_EYE / RIGHT_EYE /
  LEFT_EYEBROW / RIGHT_EYEBROW / LEFT_IRIS / RIGHT_IRIS / FACE_OVAL / CONTOURS / TESSELATION.
  There is NO nose, cheek, jaw, forehead or chin set - those regions need seed indices verified
  against real geometry.
- 2026-10-25T06:20Z [TOOL] Verified landmark anchors (mm, +x = subject left, +y up, +z out of the
  face, after the z fix): 4 nose tip (z +53), 152 chin bottom (y -87), 10 forehead top (y +87),
  9 glabella (y +47), 205/425 cheeks (x -/+41), 172/397 jaw angle (x -/+60, z -30 near the ear),
  136/365 jawline, 127/356 face sides (x -/+74).
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
  (102 mm) is the least trustworthy axis, as the first risk in PLAN.md predicts.
- 2026-10-25T06:20Z [TOOL] M2 verified numerically against the same portrait capture. 10 regions
  build with anatomically correct handles and directions. A real synthetic pointer drag through
  the actual editor path (raycast -> setAmount -> rebuild -> UI) gives, for a 60 px drag:
  forehead +5.8, nose +3.4, brow -3.1, chin -3.8, lower jaw -3.8, lips -2.1 mm; lateral regions
  respond to sideways drags instead (cheeks 4.45/4.42, jaw angles 3.99/3.92 mm, left/right
  symmetric). Max edge stretch 1.00-1.16 = no tearing. Symmetry on edits both sides, off edits
  one. Hold-to-compare restores the base mesh EXACTLY (max delta 0.000 mm) and releasing restores
  the edit; reset-all returns to pristine exactly; every position stays finite.
  THREE BUGS FOUND AND FIXED:
  (1) The captured mesh was depth-INVERTED - MediaPipe z grows away from the camera, so the nose
      sat at z -53 behind the ears at +47 and vertex normals pointed INTO the face. It looked
      correct only because the material is double-sided; dragging along the normal would have
      pushed every feature inward. Fixed by negating z; nose now +53 with normal +1.
  (2) A zero-sized canvas made every pointer calculation NaN, silently destroying the mesh with
      no error and no way back (NaN fails the edit-list filter, so the UI looked empty). Now
      guarded on both canvas size and non-finite amounts.
  (3) Drag sensitivity exploded near the alignment clamp (60 px = -79 mm on the brow). See
      DECISIONS - the rate is now tied to region radius.
  NOT VERIFIED AT 06:20: how the edits LOOK - resolved at 07:05 below.
- 2026-10-25T07:05Z [TOOL] M2 CONFIRMED VISUALLY once the browser window was restored. Jaw angle
  +9.6 mm (both sides via symmetry), chin +8.1 mm, brow +9.2 mm render as a squared, wider lower
  face with a longer chin and a fuller brow - smooth, no tearing or spikes, texture stretching
  with the geometry. Hold-to-compare visibly restores the narrower original and moves the handles
  back to base positions. The jaw-angle region reads as a genuine jaw change rather than a local
  bump, which answers the earlier worry about it moving only 15 vertices.
- 2026-10-25T07:05Z [TOOL] Panel layout verified at 1920x911: banner 33 + stage 640 + panel 238 =
  911, stage bottom meets panel top exactly (no overlap). Tap collapses the panel to 26 px and
  hands 212 px to the viewer (camera aspect 3.000 -> 2.236, drawing buffer resized to match);
  tapping again restores; dragging down 120 px leaves the panel at 118 px; dragging up 400 px
  clamps at the natural 238 px instead of growing without bound. With a face captured, all 10
  handles sit inside the viewer rect, the lowest (chin, y 431) well clear of the panel at y 567.
