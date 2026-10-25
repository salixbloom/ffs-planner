/**
 * M0 entry point: prove the camera feed and a WebGL overlay both work on the
 * target device. Everything here runs client-side; no network calls are made
 * beyond loading the modules themselves.
 */

import { startCamera, stopCamera, describeStream } from './camera.js';
import { createViewer, describeRenderer } from './viewer.js';

const APP_VERSION = '0.1.0-m0';

const els = {
  feed: document.querySelector('#feed'),
  canvas: document.querySelector('#gl'),
  start: document.querySelector('#start'),
  status: document.querySelector('#status'),
  diag: document.querySelector('#diag'),
};

let viewer;
let stream;

function setStatus(text, isError = false) {
  els.status.textContent = text;
  els.status.classList.toggle('error', isError);
}

function setDiagnostics(rows) {
  els.diag.replaceChildren(
    ...rows.map(([label, value]) => {
      const li = document.createElement('li');
      li.textContent = `${label}: ${value}`;
      return li;
    }),
  );
}

function baseDiagnostics() {
  return [
    ['version', APP_VERSION],
    ['secure context', String(window.isSecureContext)],
    ['renderer', viewer ? describeRenderer(viewer.renderer) : 'not started'],
    ['camera', stream ? describeStream(stream) : 'off'],
  ];
}

function refreshDiagnostics() {
  setDiagnostics(baseDiagnostics());
}

async function onStart() {
  els.start.disabled = true;
  setStatus('Requesting camera permission…');
  try {
    stream = await startCamera(els.feed);
    setStatus('Camera running. Drag to orbit the test mesh.');
    els.start.textContent = 'Stop camera';
  } catch (err) {
    setStatus(err.message, true);
    els.start.textContent = 'Start camera';
  } finally {
    els.start.disabled = false;
    refreshDiagnostics();
  }
}

function onStop() {
  stopCamera(stream);
  stream = undefined;
  els.feed.srcObject = null;
  els.start.textContent = 'Start camera';
  setStatus('Camera off. Nothing leaves this device.');
  refreshDiagnostics();
}

els.start.addEventListener('click', () => (stream ? onStop() : onStart()));

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

// Exposed so the render loop and camera state can be asserted from the console
// or an automated browser check.
window.__ffs = {
  version: APP_VERSION,
  get frameCount() { return viewer?.frameCount ?? 0; },
  get cameraActive() { return Boolean(stream); },
};
