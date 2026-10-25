# CONTINUITY — FFS Face Planner

Canonical briefing. Read before acting. Facts only; every entry dated (ISO) and provenance-tagged.

## Goal
Free, fully client-side web app: scan a face on a phone, sculpt regions by dragging, see how
ambitious each change is. No backend. MVP = PLAN.md M0–M4 working end to end on one iPhone.

## State
- 2026-10-24T20:15Z [TOOL] Repo initialized at `C:\Code\ffs-planner`, branch `main`.
  Remote `origin` = `git@github.com:salixbloom/ffs-planner.git`. Nothing pushed yet.
- 2026-10-24T20:15Z [TOOL] `git ls-remote origin` → "Repository not found". SSH to github.com
  authenticates as user **Sinuboh**; local git identity is **Willow Bloom
  <salixbloom@users.noreply.github.com>**. Either the repo does not exist yet or the Sinuboh key
  has no access to it. `gh` CLI is not installed, so the repo cannot be created from here.
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

## [PROGRESS]
- 2026-10-24T20:15Z [CODE] Added `Dockerfile`, `nginx.conf`, `compose.yaml`, `.dockerignore`,
  `.gitignore`, placeholder `index.html`, this file.

## [DISCOVERIES]
- 2026-10-24T20:15Z [TOOL] SSH identity (Sinuboh) ≠ git commit identity (salixbloom). Pushes may
  fail or land under the wrong account; resolve before relying on push.
- 2026-10-24T20:15Z [ASSUMPTION] Camera needs a secure context. `http://localhost:8080` qualifies,
  but a phone reaching the container over a LAN IP does NOT — on-device testing goes through the
  HTTPS GitHub Pages deploy, not this container.

## [OUTCOMES]
- (none yet)
