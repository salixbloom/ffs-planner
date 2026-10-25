/**
 * Builds a three.js face mesh from MediaPipe landmarks, in millimetres.
 *
 * Working in mm from the start means M3's achievability thresholds can be read
 * straight off the geometry. The scale comes from iris width, so it is only as
 * good as that assumption — see `estimateMmPerUnit`.
 */

import * as THREE from 'three';
import { FaceLandmarker } from '@mediapipe/tasks-vision';
import { MESH_VERTEX_COUNT } from './landmarker.js';

/** Horizontal visible iris diameter, near-constant across adult humans. */
export const IRIS_DIAMETER_MM = 11.7;

/**
 * Opposing pairs on each iris ring. Both axes are averaged: a single axis is
 * noisier, and the ring is a circle so either diameter is the same measure.
 */
const IRIS_AXES = [
  [[469, 471], [470, 472]], // left eye
  [[474, 476], [475, 477]], // right eye
];

let cachedIndices;

/**
 * MediaPipe ships the tessellation as an edge list, but it is generated from
 * triangles, so each consecutive triple of edges closes one face. Verified at
 * runtime rather than assumed.
 */
export function tessellationIndices() {
  if (cachedIndices) return cachedIndices;

  const edges = FaceLandmarker.FACE_LANDMARKS_TESSELATION;
  if (edges.length % 3 !== 0) {
    throw new Error(`tessellation length ${edges.length} is not a multiple of 3`);
  }

  const indices = new Uint16Array(edges.length);
  for (let i = 0; i < edges.length; i += 3) {
    const [a, b, c] = [edges[i], edges[i + 1], edges[i + 2]];
    if (a.end !== b.start || b.end !== c.start || c.end !== a.start) {
      throw new Error(`tessellation is not triangle-ordered at edge ${i}`);
    }
    indices[i] = a.start;
    indices[i + 1] = b.start;
    indices[i + 2] = c.start;
  }

  cachedIndices = indices;
  return indices;
}

/**
 * Converts normalized landmarks to isotropic units (1 = image height).
 * MediaPipe normalizes x by width and y by height, and z on roughly the same
 * scale as x, so x and z need the aspect correction to stay square.
 */
function toIsotropic(landmark, aspect) {
  return [(landmark.x - 0.5) * aspect, -(landmark.y - 0.5), (landmark.z ?? 0) * aspect];
}

/**
 * Millimetres per isotropic unit, from iris width.
 * Approximate: it assumes an average iris and ignores perspective.
 */
export function estimateMmPerUnit(landmarks, aspect) {
  const widths = IRIS_AXES.flat()
    .map(([a, b]) => {
      if (!landmarks[a] || !landmarks[b]) return null;
      const p = toIsotropic(landmarks[a], aspect);
      const q = toIsotropic(landmarks[b], aspect);
      return Math.hypot(p[0] - q[0], p[1] - q[1]); // 2D: z is the noisiest axis
    })
    .filter((w) => w && w > 1e-6);

  if (!widths.length) return null;
  const mean = widths.reduce((a, b) => a + b, 0) / widths.length;
  return IRIS_DIAMETER_MM / mean;
}

/**
 * @param {Array<{x:number,y:number,z:number}>} landmarks averaged landmarks
 * @param {number} aspect video width / height
 * @param {number} mmPerUnit from `estimateMmPerUnit`
 */
export function buildFaceGeometry(landmarks, aspect, mmPerUnit) {
  const positions = new Float32Array(MESH_VERTEX_COUNT * 3);
  const uvs = new Float32Array(MESH_VERTEX_COUNT * 2);

  for (let i = 0; i < MESH_VERTEX_COUNT; i += 1) {
    const lm = landmarks[i];
    const [x, y, z] = toIsotropic(lm, aspect);
    positions[i * 3] = x * mmPerUnit;
    positions[i * 3 + 1] = y * mmPerUnit;
    positions[i * 3 + 2] = z * mmPerUnit;

    // The texture is the unmirrored frame, so UVs are the landmark's own
    // image coordinates, flipped vertically for three.js texture space.
    uvs[i * 2] = lm.x;
    uvs[i * 2 + 1] = 1 - lm.y;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(new THREE.BufferAttribute(tessellationIndices(), 1));
  geometry.computeVertexNormals();
  geometry.center();
  geometry.computeBoundingSphere();
  return geometry;
}

/** Snapshot of the current video frame, used as the face texture. */
export function captureTexture(video) {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
