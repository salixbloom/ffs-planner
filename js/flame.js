/**
 * FLAME 2023 shape model.
 *
 * The shipped basis holds the first 100 identity components as float32, in
 * metres (see tools/prepare-flame.py and the README). A face built from it is
 * `template + sum(beta_k * basis_k)`, which is linear in the coefficients —
 * the property the fitter depends on.
 */

import * as THREE from 'three';

const MODEL_URL = './flame/flame-shape.json';
const EMBEDDING_URL = './flame/mediapipe-embedding.json';
const MM_PER_METRE = 1000;

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.json();
}

/**
 * Loads the basis, the topology and the MediaPipe correspondence.
 * Positions are converted to millimetres to match the rest of the app.
 */
export async function loadFlame() {
  const [header, embedding] = await Promise.all([
    fetchJson(MODEL_URL),
    fetchJson(EMBEDDING_URL),
  ]);

  const binaryUrl = MODEL_URL.replace(/\.json$/, '.bin');
  const response = await fetch(binaryUrl);
  if (!response.ok) throw new Error(`${binaryUrl} returned ${response.status}`);
  const buffer = await response.arrayBuffer();

  const { vertices, faces: faceCount, components } = header;
  const expected = vertices * 3 * 4 + vertices * 3 * components * 4 + faceCount * 3 * 2;
  if (buffer.byteLength !== expected) {
    throw new Error(`${binaryUrl}: expected ${expected} bytes, got ${buffer.byteLength}`);
  }

  let offset = 0;
  const template = new Float32Array(buffer, offset, vertices * 3);
  offset += vertices * 3 * 4;
  // Layout is (vertex, axis, component) from numpy, so component varies fastest.
  const basis = new Float32Array(buffer, offset, vertices * 3 * components);
  offset += vertices * 3 * components * 4;
  const faces = new Uint16Array(buffer, offset, faceCount * 3);

  return {
    vertices,
    faceCount,
    components,
    faces,
    /** Neutral head in millimetres. */
    template: Float32Array.from(template, (v) => v * MM_PER_METRE),
    /** Shape basis in millimetres, same (vertex, axis, component) layout. */
    basis: Float32Array.from(basis, (v) => v * MM_PER_METRE),
    embedding: {
      count: embedding.count,
      landmarkIndices: Int32Array.from(embedding.landmarkIndices),
      triangleIndices: Int32Array.from(embedding.triangleIndices),
      barycentric: Float32Array.from(embedding.barycentric.flat()),
    },
    attribution: { model: header.source, embedding: embedding.source },
  };
}

/**
 * Evaluates the model for the given coefficients.
 * @param {Float32Array} [out] reused output buffer
 */
export function evaluateShape(model, betas, out) {
  const { template, basis, vertices, components } = model;
  const positions = out ?? new Float32Array(vertices * 3);
  positions.set(template);

  for (let k = 0; k < components; k += 1) {
    const beta = betas[k];
    if (!beta) continue;
    for (let i = 0; i < vertices * 3; i += 1) {
      positions[i] += beta * basis[i * components + k];
    }
  }
  return positions;
}

/**
 * The 105 embedded landmark positions for a given set of vertex positions.
 * Each is a barycentric blend of one triangle's corners.
 */
export function embeddedLandmarks(model, positions, out) {
  const { embedding, faces } = model;
  const points = out ?? new Float32Array(embedding.count * 3);

  for (let i = 0; i < embedding.count; i += 1) {
    const tri = embedding.triangleIndices[i] * 3;
    const [w0, w1, w2] = [
      embedding.barycentric[i * 3],
      embedding.barycentric[i * 3 + 1],
      embedding.barycentric[i * 3 + 2],
    ];
    const a = faces[tri] * 3;
    const b = faces[tri + 1] * 3;
    const c = faces[tri + 2] * 3;
    for (let axis = 0; axis < 3; axis += 1) {
      points[i * 3 + axis] =
        w0 * positions[a + axis] + w1 * positions[b + axis] + w2 * positions[c + axis];
    }
  }
  return points;
}

/** Renderable geometry for a set of fitted vertex positions, in millimetres. */
export function buildHeadGeometry(model, positions) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(positions), 3));
  geometry.setIndex(new THREE.BufferAttribute(Uint16Array.from(model.faces), 1));
  geometry.computeVertexNormals();
  geometry.center();
  geometry.computeBoundingSphere();
  return geometry;
}

/**
 * Per-component landmark offsets: how each embedded landmark moves per unit of
 * each coefficient. Constant for a given model, and the Jacobian the fitter
 * needs — landmarks being linear in the coefficients is what makes the solve
 * a least-squares problem rather than an optimisation.
 *
 * @returns {Float32Array} (landmark, axis, component)
 */
export function landmarkJacobian(model) {
  const { embedding, faces, basis, components } = model;
  const jacobian = new Float32Array(embedding.count * 3 * components);

  for (let i = 0; i < embedding.count; i += 1) {
    const tri = embedding.triangleIndices[i] * 3;
    const corners = [faces[tri], faces[tri + 1], faces[tri + 2]];
    const weights = [
      embedding.barycentric[i * 3],
      embedding.barycentric[i * 3 + 1],
      embedding.barycentric[i * 3 + 2],
    ];

    for (let corner = 0; corner < 3; corner += 1) {
      const weight = weights[corner];
      if (!weight) continue;
      const vertexBase = corners[corner] * 3;
      for (let axis = 0; axis < 3; axis += 1) {
        const from = (vertexBase + axis) * components;
        const to = (i * 3 + axis) * components;
        for (let k = 0; k < components; k += 1) {
          jacobian[to + k] += weight * basis[from + k];
        }
      }
    }
  }
  return jacobian;
}
