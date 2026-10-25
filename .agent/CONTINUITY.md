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
- 2026-10-24T20:15Z [CODE] No application code exists. `index.html` is a placeholder only.

## [PLANS]
- 2026-10-24T20:15Z [USER] Next: connect to GitHub remote + minimal container (this task).
- 2026-10-24T20:15Z [CODE] Then M0 per PLAN.md: three.js scene, camera feed, deploy to Pages,
  confirm camera permission in iPhone Safari.

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

## [PROGRESS]
- 2026-10-24T20:15Z [CODE] Added `Dockerfile`, `nginx.conf`, `compose.yaml`, `.dockerignore`,
  `.gitignore`, placeholder `index.html`, this file.
- 2026-10-24T20:25Z [TOOL] `docker compose config` parses clean. `docker compose build` and nginx
  config syntax remain UNCONFIRMED (daemon down).
- 2026-10-24T20:40Z [TOOL] Remote `main` already held one commit (`f702899 Initial commit`,
  GPL-3.0 `LICENSE` only). Local commits were rebased onto it — linear history, LICENSE preserved,
  no force-push. Pushed to `origin/main`.

## [DISCOVERIES]
- 2026-10-24T20:40Z [TOOL] Two GitHub identities exist on this machine. The default SSH key is
  Sinuboh; salixbloom is reachable only through the `github.com-salixbloom` alias. A plain
  `git@github.com:salixbloom/...` URL fails with a misleading "Repository not found".
- 2026-10-24T20:40Z [CODE] Project is GPL-3.0 (LICENSE came from the remote's initial commit).
- 2026-10-24T20:15Z [ASSUMPTION] Camera needs a secure context. `http://localhost:8080` qualifies,
  but a phone reaching the container over a LAN IP does NOT — on-device testing goes through the
  HTTPS GitHub Pages deploy, not this container.

## [OUTCOMES]
- (none yet)
