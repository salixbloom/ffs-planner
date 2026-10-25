/**
 * MediaPipe Face Landmarker setup.
 *
 * The wasm runtime (~13 MB) and model (~3.8 MB) are fetched from a CDN on
 * first run, so callers should show progress while this resolves. Inference
 * itself is local — frames never leave the device.
 */

import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

const WASM_ROOT = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

/** Landmarks 0..467 form the mesh; 468..477 are the iris rings. */
export const MESH_VERTEX_COUNT = 468;

export async function createLandmarker({ delegate = 'GPU' } = {}) {
  const fileset = await FilesetResolver.forVisionTasks(WASM_ROOT);
  const options = {
    baseOptions: { modelAssetPath: MODEL_URL, delegate },
    runningMode: 'VIDEO',
    numFaces: 1,
    outputFacialTransformationMatrixes: true,
  };

  try {
    return await FaceLandmarker.createFromOptions(fileset, options);
  } catch (err) {
    if (delegate === 'CPU') throw err;
    // Older phones can fail to bind a GPU delegate; CPU still runs, slower.
    console.warn('GPU delegate unavailable, falling back to CPU', err);
    return FaceLandmarker.createFromOptions(fileset, {
      ...options,
      baseOptions: { ...options.baseOptions, delegate: 'CPU' },
    });
  }
}

/**
 * Yaw and pitch of the head in degrees, from the facial transformation matrix.
 * Both are ~0 when the subject looks straight down the camera axis.
 */
export function headAnglesDeg(matrix) {
  // Column-major 4x4; the third column is the face's local forward axis.
  const d = matrix.data;
  const [fx, fy, fz] = [d[8], d[9], d[10]];
  return {
    yaw: (Math.atan2(fx, fz) * 180) / Math.PI,
    pitch: (Math.atan2(-fy, Math.hypot(fx, fz)) * 180) / Math.PI,
  };
}
