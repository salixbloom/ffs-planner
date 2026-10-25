/**
 * Entry point: camera, guided face capture, and the 3D viewer.
 *
 * Everything runs client-side. The only network traffic is loading the
 * modules, the MediaPipe runtime and the landmark model.
 */

import { startCamera, stopCamera, describeStream } from './camera.js';
import { createViewer, describeRenderer } from './viewer.js';
import { createLandmarker } from './landmarker.js';
import { createCaptureSession, CAPTURE_PROMPTS } from './capture.js';
import { buildFaceGeometry, captureTexture, estimateMmPerUnit } from './facemesh.js';
import { createEditor } from './editor.js';

const APP_VERSION = '0.3.0-m2';

const els = {
  feed: document.querySelector('#feed'),
  canvas: document.querySelector('#gl'),
  start: document.querySelector('#start'),
  capture: document.querySelector('#capture'),
  progress: document.querySelector('#progress'),
  bar: document.querySelector('#bar'),
  status: document.querySelector('#status'),
  diag: document.querySelector('#diag'),
  editor: document.querySelector('#editor'),
  symmetry: document.querySelector('#symmetry'),
  before: document.querySelector('#before'),
  resetAll: document.querySelector('#resetAll'),
  edits: document.querySelector('#edits'),
};

let viewer;
let stream;
let landmarker;
let session;
let editor;
let scaleMmPerUnit = null;

function setStatus(text, isError = false) {
  els.status.textContent = text;
  els.status.classList.toggle('error', isError);
}

function setProgress(fraction) {
  els.progress.hidden = fraction === null;
  els.bar.style.width = `${Math.round((fraction ?? 0) * 100)}%`;
}

function refreshDiagnostics() {
  const rows = [
    ['version', APP_VERSION],
    ['secure context', String(window.isSecureContext)],
    ['renderer', viewer ? describeRenderer(viewer.renderer) : 'not started'],
    ['camera', stream ? describeStream(stream) : 'off'],
    ['model', landmarker ? 'loaded' : 'not loaded'],
    ['scale', scaleMmPerUnit ? `${scaleMmPerUnit.toFixed(1)} mm/unit (approx, from iris)` : '—'],
  ];
  els.diag.replaceChildren(
    ...rows.map(([label, value]) => {
      const li = document.createElement('li');
      li.textContent = `${label}: ${value}`;
      return li;
    }),
  );
}

/** The landmark model is several MB; load it once, on demand. */
async function ensureLandmarker() {
  if (landmarker) return landmarker;
  setStatus('Loading the face model (a few MB, first time only)…');
  landmarker = await createLandmarker();
  refreshDiagnostics();
  return landmarker;
}

function onCaptureUpdate({ state, progress }) {
  setStatus(CAPTURE_PROMPTS[state] ?? state);
  setProgress(progress);
}

/** One row per edited region, each with its own reset. */
function renderEdits({ edits }) {
  els.edits.replaceChildren(
    ...edits.map(({ id, label, mm }) => {
      const li = document.createElement('li');
      const text = document.createElement('span');
      text.textContent = `${label}: ${mm > 0 ? '+' : ''}${mm.toFixed(1)} mm`;
      const reset = document.createElement('button');
      reset.type = 'button';
      reset.textContent = 'reset';
      reset.addEventListener('click', () => editor.reset(id));
      li.append(text, reset);
      return li;
    }),
  );
}

function startEditing(mesh) {
  editor?.dispose();
  editor = createEditor({ viewer, mesh, onChange: renderEdits });
  els.editor.hidden = false;
  editor.setSymmetry(els.symmetry.checked);
}

function stopEditing() {
  editor?.dispose();
  editor = null;
  els.editor.hidden = true;
  els.edits.replaceChildren();
}

function onCaptureComplete({ landmarks, frames }) {
  const aspect = els.feed.videoWidth / els.feed.videoHeight;
  scaleMmPerUnit = estimateMmPerUnit(landmarks, aspect);

  if (!scaleMmPerUnit) {
    setStatus('Could not measure iris width — try again in better light.', true);
    endCapture();
    return;
  }

  const texture = captureTexture(els.feed);
  const geometry = buildFaceGeometry(landmarks, aspect, scaleMmPerUnit);
  const mesh = viewer.showFace(geometry, texture);

  endCapture();
  els.feed.hidden = true; // the mesh replaces the live view
  els.capture.textContent = 'Retake';
  startEditing(mesh);
  setStatus(`Captured from ${frames} frames. Drag a handle to reshape a region.`);
}

function endCapture() {
  session?.cancel();
  session = null;
  viewer.setFrameCallback(null);
  setProgress(null);
  refreshDiagnostics();
}

async function onCapture() {
  if (viewer.hasFace) {
    stopEditing();
    viewer.clearFace();
    els.feed.hidden = false;
    els.capture.textContent = 'Capture face';
    setStatus('Camera running. Drag to orbit.');
    return;
  }

  els.capture.disabled = true;
  try {
    await ensureLandmarker();
    session = createCaptureSession({
      landmarker,
      video: els.feed,
      onUpdate: onCaptureUpdate,
      onComplete: onCaptureComplete,
    });
    viewer.setFrameCallback((time) => session?.tick(time));
  } catch (err) {
    setStatus(`Face model failed to load: ${err?.message || err}`, true);
  } finally {
    els.capture.disabled = false;
  }
}

async function onStart() {
  els.start.disabled = true;
  setStatus('Requesting camera permission…');
  try {
    stream = await startCamera(els.feed);
    setStatus('Camera running. Drag to orbit.');
    els.start.textContent = 'Stop camera';
    els.capture.hidden = false;
  } catch (err) {
    setStatus(err.message, true);
    els.start.textContent = 'Start camera';
  } finally {
    els.start.disabled = false;
    refreshDiagnostics();
  }
}

function onStop() {
  endCapture();
  stopEditing();
  stopCamera(stream);
  stream = undefined;
  els.feed.srcObject = null;
  els.feed.hidden = false;
  els.capture.hidden = true;
  els.capture.textContent = 'Capture face';
  viewer.clearFace();
  els.start.textContent = 'Start camera';
  setStatus('Camera off. Nothing leaves this device.');
  refreshDiagnostics();
}

els.start.addEventListener('click', () => (stream ? onStop() : onStart()));
els.capture.addEventListener('click', onCapture);
els.symmetry.addEventListener('change', () => editor?.setSymmetry(els.symmetry.checked));
els.resetAll.addEventListener('click', () => editor?.resetAll());

// Press and hold to see the unedited scan, so comparison needs no extra state.
for (const [event, showBase] of [
  ['pointerdown', true], ['pointerup', false], ['pointerleave', false], ['pointercancel', false],
]) {
  els.before.addEventListener(event, () => editor?.setShowBase(showBase));
}

// Safari drops camera tracks when the tab is backgrounded; surface that rather
// than leaving a frozen frame on screen.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && stream) {
    const live = stream.getVideoTracks().some((t) => t.readyState === 'live');
    if (!live) {
      onStop();
      setStatus('The camera was released while the app was in the background.', true);
    }
  }
});

try {
  viewer = createViewer(els.canvas);
} catch (err) {
  setStatus(`WebGL failed to initialise: ${err?.message || err}`, true);
}

refreshDiagnostics();

// Exposed so state can be asserted from the console or an automated check.
window.__ffs = {
  version: APP_VERSION,
  get frameCount() { return viewer?.frameCount ?? 0; },
  get cameraActive() { return Boolean(stream); },
  get hasFace() { return Boolean(viewer?.hasFace); },
  get scaleMmPerUnit() { return scaleMmPerUnit; },
  get captureState() { return session?.state ?? 'idle'; },
  get edits() { return editor?.summary.edits ?? []; },
  _internals: {
    get viewer() { return viewer; },
    get editor() { return editor; },
  },
};
