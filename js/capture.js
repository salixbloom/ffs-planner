/**
 * Guided neutral capture: look straight, hold still, average the result.
 *
 * Averaging over a short hold cancels most of the per-frame landmark jitter.
 * The session is driven by the render loop via `tick`.
 */

import { headAnglesDeg } from './landmarker.js';

const HOLD_MS = 2000;        // how long the pose must be held
const MIN_FRAMES = 24;       // averaging needs real samples, not just elapsed time
const MAX_TICK_MS = 100;     // ignore stalls: a throttled tab must not fast-forward the hold
const MAX_YAW_DEG = 12;      // "looking straight" tolerance
const MAX_PITCH_DEG = 12;
const MAX_DRIFT = 0.0022;    // mean per-frame landmark movement, normalized units

export const CAPTURE_PROMPTS = {
  searching: 'Point the camera at your face.',
  aligning: 'Look straight at the camera.',
  steadying: 'Hold still…',
  holding: 'Hold still…',
  done: 'Captured.',
};

/** Mean per-landmark movement between two frames, in normalized units. */
function drift(a, b) {
  let total = 0;
  for (let i = 0; i < a.length; i += 1) {
    total += Math.hypot(a[i].x - b[i].x, a[i].y - b[i].y);
  }
  return total / a.length;
}

export function createCaptureSession({ landmarker, video, onUpdate, onComplete }) {
  let state = 'searching';
  let heldMs = 0;
  let previous = null;
  let lastTick = null;
  let sums = null;
  let frames = 0;
  let cancelled = false;

  function reset(next) {
    state = next;
    heldMs = 0;
    sums = null;
    frames = 0;
  }

  function accumulate(landmarks) {
    if (!sums) {
      sums = landmarks.map(() => ({ x: 0, y: 0, z: 0 }));
    }
    for (let i = 0; i < landmarks.length; i += 1) {
      sums[i].x += landmarks[i].x;
      sums[i].y += landmarks[i].y;
      sums[i].z += landmarks[i].z ?? 0;
    }
    frames += 1;
  }

  function average() {
    return sums.map((s) => ({ x: s.x / frames, y: s.y / frames, z: s.z / frames }));
  }

  /** @param {number} timestampMs monotonically increasing frame timestamp */
  function tick(timestampMs) {
    if (cancelled || state === 'done') return;
    if (!video.videoWidth) return;

    // Clamping matters: a backgrounded tab throttles rAF to ~1 Hz, and
    // unclamped a couple of those ticks would satisfy HOLD_MS outright,
    // averaging one or two frames instead of a steady couple of seconds.
    const dt = lastTick === null ? 0 : Math.min(timestampMs - lastTick, MAX_TICK_MS);
    lastTick = timestampMs;

    const result = landmarker.detectForVideo(video, timestampMs);
    const landmarks = result.faceLandmarks?.[0];
    const matrix = result.facialTransformationMatrixes?.[0];

    if (!landmarks) {
      previous = null;
      reset('searching');
      onUpdate?.({ state, progress: 0 });
      return;
    }

    if (matrix) {
      const { yaw, pitch } = headAnglesDeg(matrix);
      if (Math.abs(yaw) > MAX_YAW_DEG || Math.abs(pitch) > MAX_PITCH_DEG) {
        previous = landmarks;
        reset('aligning');
        onUpdate?.({ state, progress: 0, yaw, pitch });
        return;
      }
    }

    const moved = previous ? drift(landmarks, previous) : Infinity;
    previous = landmarks;

    if (moved > MAX_DRIFT) {
      reset('steadying');
      onUpdate?.({ state, progress: 0, drift: moved });
      return;
    }

    state = 'holding';
    heldMs += dt;
    accumulate(landmarks);
    const progress = Math.min(heldMs / HOLD_MS, frames / MIN_FRAMES, 1);
    onUpdate?.({ state, progress, drift: moved, frames });

    if (progress >= 1) {
      state = 'done';
      onComplete?.({ landmarks: average(), frames });
    }
  }

  return {
    tick,
    cancel() { cancelled = true; },
    get state() { return state; },
  };
}
