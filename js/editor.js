/**
 * Region editor: drag a handle to push a region in or out.
 *
 * Edits are kept as millimetre amounts per region, never baked into the mesh.
 * The displayed geometry is always base + the sum of current edits, which
 * gives before/after and per-region reset for free, and is the form M4 needs
 * to store edits separately from the scan.
 */

import * as THREE from 'three';
import { buildRegions } from './regions.js';

const HANDLE_RADIUS_MM = 4;
/**
 * Below this, the region pushes too nearly straight at the camera for its
 * screen projection to mean anything, and the drag direction is mostly noise.
 * Those regions fall back to a plain vertical drag.
 */
const MIN_ALIGNMENT = 0.3;
const PROBE_MM = 10;
/**
 * A full-height drag moves a region by this multiple of its own radius.
 *
 * Deliberately not 1:1 handle-follows-finger: at a normal viewing distance one
 * screen height is ~300 mm, so tracking the finger would make the smallest
 * controllable nudge larger than any realistic change. Tying the rate to the
 * region's size instead keeps every region controllable in millimetres, and
 * keeps sensitivity steady as the user zooms.
 */
const DRAG_RADII_PER_SCREEN = 2;
const HANDLE_COLOR = 0x5b9cff;
const HANDLE_COLOR_ACTIVE = 0xffd166;

export function createEditor({ viewer, mesh, onChange }) {
  const geometry = mesh.geometry;
  const position = geometry.attributes.position;
  const base = Float32Array.from(position.array);
  const regions = buildRegions(geometry);
  const edits = new Map(); // region id -> millimetres
  let symmetry = true;
  let showingBase = false;

  const handles = new THREE.Group();
  const handleGeometry = new THREE.SphereGeometry(HANDLE_RADIUS_MM, 16, 12);
  for (const region of regions) {
    const handle = new THREE.Mesh(
      handleGeometry,
      new THREE.MeshBasicMaterial({ color: HANDLE_COLOR, depthTest: false }),
    );
    handle.position.copy(region.handle);
    handle.renderOrder = 2;
    handle.userData.regionId = region.id;
    handles.add(handle);
  }
  viewer.scene.add(handles);

  function regionById(id) {
    return regions.find((r) => r.id === id);
  }

  /** Rebuilds displayed positions from the base mesh plus every edit. */
  function rebuild() {
    position.array.set(base);

    if (!showingBase) {
      for (const [id, millimetres] of edits) {
        if (!millimetres) continue;
        const region = regionById(id);
        const { weights, direction } = region;
        for (let i = 0; i < position.count; i += 1) {
          const weight = weights[i];
          if (!weight) continue;
          const offset = weight * millimetres;
          position.array[i * 3] += direction.x * offset;
          position.array[i * 3 + 1] += direction.y * offset;
          position.array[i * 3 + 2] += direction.z * offset;
        }
      }
    }

    position.needsUpdate = true;
    geometry.computeVertexNormals();

    for (const handle of handles.children) {
      const region = regionById(handle.userData.regionId);
      const amount = showingBase ? 0 : edits.get(region.id) ?? 0;
      handle.position.copy(region.handle).addScaledVector(region.direction, amount);
    }
  }

  function setAmount(id, millimetres) {
    const region = regionById(id);
    if (!region) return;
    // A non-finite amount would silently turn every weighted vertex into NaN,
    // which renders as nothing at all and cannot be undone by resetting.
    if (!Number.isFinite(millimetres)) return;
    edits.set(id, millimetres);
    if (symmetry && region.pair) edits.set(region.pair, millimetres);
    rebuild();
    onChange?.(summary());
  }

  function summary() {
    return {
      edits: [...edits.entries()]
        .filter(([, mm]) => Math.abs(mm) > 0.01)
        .map(([id, mm]) => ({ id, label: regionById(id).label, mm })),
      symmetry,
      showingBase,
    };
  }

  // --- pointer interaction -------------------------------------------------

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const canvas = viewer.renderer.domElement;
  let drag = null;

  function pointerToNdc(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function onPointerDown(event) {
    if (showingBase) return;
    // A zero-sized canvas (hidden tab, mid-orientation-change) makes every
    // pointer calculation NaN.
    if (!canvas.clientWidth || !canvas.clientHeight) return;
    pointerToNdc(event);
    raycaster.setFromCamera(pointer, viewer.camera);
    const hit = raycaster.intersectObjects(handles.children, false)[0];
    if (!hit) return;

    const region = regionById(hit.object.userData.regionId);
    const camera = viewer.camera;
    const halfWidth = canvas.clientWidth / 2;
    const halfHeight = canvas.clientHeight / 2;

    // Where the push direction goes on screen, measured against an in-plane
    // vector of the same length so the ratio is a true 0..1 alignment.
    const origin = region.handle.clone().project(camera);
    const pushed = region.handle.clone()
      .addScaledVector(region.direction, PROBE_MM).project(camera);
    const inPlane = region.handle.clone()
      .addScaledVector(new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0), PROBE_MM)
      .project(camera);

    const axis = new THREE.Vector2(
      (pushed.x - origin.x) * halfWidth,
      (pushed.y - origin.y) * halfHeight,
    );
    const reference = new THREE.Vector2(
      (inPlane.x - origin.x) * halfWidth,
      (inPlane.y - origin.y) * halfHeight,
    ).length();
    const alignment = reference > 1e-6 ? axis.length() / reference : 0;

    // Alignment decides only which way to drag; the rate is uniform.
    if (alignment >= MIN_ALIGNMENT) {
      axis.normalize(); // drag the way the region visibly grows
    } else {
      axis.set(0, 1); // facing the camera: drag up to push out
    }

    drag = {
      region,
      axis,
      alignment,
      startX: event.clientX,
      startY: event.clientY,
      startAmount: edits.get(region.id) ?? 0,
      scale: (DRAG_RADII_PER_SCREEN * region.radiusMm) / canvas.clientHeight,
    };

    hit.object.material.color.setHex(HANDLE_COLOR_ACTIVE);
    viewer.controls.enabled = false;
    // Capture keeps the drag alive past the canvas edge, but is not essential;
    // it throws for pointer ids the browser no longer considers active.
    try { canvas.setPointerCapture(event.pointerId); } catch { /* not capturable */ }
    onChange?.({ ...summary(), active: region.id });
  }

  function onPointerMove(event) {
    if (!drag) return;
    // Screen y grows downward; the axis is in y-up screen pixels.
    const dx = event.clientX - drag.startX;
    const dy = -(event.clientY - drag.startY);
    const along = dx * drag.axis.x + dy * drag.axis.y;
    setAmount(drag.region.id, drag.startAmount + along * drag.scale);
  }

  function onPointerUp(event) {
    if (!drag) return;
    for (const handle of handles.children) handle.material.color.setHex(HANDLE_COLOR);
    viewer.controls.enabled = true;
    try { canvas.releasePointerCapture(event.pointerId); } catch { /* never captured */ }
    drag = null;
    onChange?.(summary());
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);

  return {
    regions,
    get summary() { return summary(); },

    setSymmetry(enabled) {
      symmetry = enabled;
      onChange?.(summary());
    },

    /** Momentarily show the unedited scan. */
    setShowBase(enabled) {
      showingBase = enabled;
      rebuild();
      onChange?.(summary());
    },

    /** Handles belong to the scan mesh, so they hide with it. */
    setHandlesVisible(visible) {
      handles.visible = visible;
    },

    reset(id) {
      const region = regionById(id);
      edits.delete(id);
      if (region?.pair) edits.delete(region.pair);
      rebuild();
      onChange?.(summary());
    },

    resetAll() {
      edits.clear();
      rebuild();
      onChange?.(summary());
    },

    dispose() {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      viewer.scene.remove(handles);
      handles.children.forEach((h) => h.material.dispose());
      handleGeometry.dispose();
      viewer.controls.enabled = true;
    },
  };
}
