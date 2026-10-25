/**
 * Editable face regions.
 *
 * A region is a set of seed landmark indices plus a radius. Vertex weights
 * fall off as a Gaussian in the distance to the *nearest* seed, which handles
 * elongated regions like the jawline as well as compact ones like the chin.
 *
 * Sides are named for the subject, not the viewer. The texture is unmirrored,
 * so +x is the subject's left.
 */

import * as THREE from 'three';
import { FaceLandmarker } from '@mediapipe/tasks-vision';

const verticesOf = (connections) => [
  ...new Set(connections.flatMap((c) => [c.start, c.end])),
];

/** Weights below this contribute nothing visible; skip them. */
const MIN_WEIGHT = 0.01;

export const REGIONS = [
  { id: 'forehead', label: 'Forehead', seeds: [10, 109, 338, 151], radiusMm: 34 },
  {
    id: 'brow',
    label: 'Brow ridge',
    seeds: () => [
      ...verticesOf(FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW),
      ...verticesOf(FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW),
      9,
    ],
    radiusMm: 18,
  },
  { id: 'nose', label: 'Nose', seeds: [1, 4, 168, 195], radiusMm: 20 },
  { id: 'cheek-left', label: 'Cheek (L)', seeds: [425, 280], radiusMm: 26, pair: 'cheek-right' },
  { id: 'cheek-right', label: 'Cheek (R)', seeds: [205, 50], radiusMm: 26, pair: 'cheek-left' },
  { id: 'jaw-angle-left', label: 'Jaw angle (L)', seeds: [397, 361], radiusMm: 24, pair: 'jaw-angle-right' },
  { id: 'jaw-angle-right', label: 'Jaw angle (R)', seeds: [172, 132], radiusMm: 24, pair: 'jaw-angle-left' },
  { id: 'lower-jaw', label: 'Lower jaw', seeds: [136, 365, 150, 379, 148, 377], radiusMm: 22 },
  { id: 'chin', label: 'Chin', seeds: [152, 175, 199], radiusMm: 22 },
  {
    id: 'lips',
    label: 'Lips',
    seeds: () => verticesOf(FaceLandmarker.FACE_LANDMARKS_LIPS),
    radiusMm: 12,
  },
];

/**
 * Per-region vertex weights, handle position and push direction, all derived
 * from the captured geometry so they follow the individual face.
 *
 * @param {THREE.BufferGeometry} geometry the captured face, in millimetres
 */
export function buildRegions(geometry) {
  const position = geometry.attributes.position;
  const normal = geometry.attributes.normal;
  const count = position.count;

  return REGIONS.map((region) => {
    const seeds = typeof region.seeds === 'function' ? region.seeds() : region.seeds;
    const valid = seeds.filter((i) => i < count);
    if (!valid.length) {
      throw new Error(`region ${region.id} has no seed within ${count} vertices`);
    }

    const sigma = region.radiusMm / 2;
    const weights = new Float32Array(count);
    const direction = new THREE.Vector3();
    const centroid = new THREE.Vector3();
    let weightSum = 0;

    const vertex = new THREE.Vector3();
    const seedPoints = valid.map((i) => new THREE.Vector3().fromBufferAttribute(position, i));

    for (let i = 0; i < count; i += 1) {
      vertex.fromBufferAttribute(position, i);
      let nearest = Infinity;
      for (const seed of seedPoints) {
        nearest = Math.min(nearest, vertex.distanceTo(seed));
      }

      const weight = Math.exp(-(nearest * nearest) / (2 * sigma * sigma));
      if (weight < MIN_WEIGHT) continue;

      weights[i] = weight;
      weightSum += weight;
      centroid.addScaledVector(vertex, weight);
      direction.x += normal.getX(i) * weight;
      direction.y += normal.getY(i) * weight;
      direction.z += normal.getZ(i) * weight;
    }

    centroid.divideScalar(weightSum);
    direction.normalize();

    return {
      ...region,
      seeds: valid,
      weights,
      // One direction for the whole region: per-vertex normals tear the mesh
      // where curvature is high.
      direction,
      handle: centroid,
      weightSum,
    };
  });
}
