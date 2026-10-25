/**
 * Fits the FLAME shape model to captured MediaPipe landmarks.
 *
 * Landmark positions are linear in the shape coefficients, so with the pose
 * held fixed the coefficients come from regularised linear least squares, and
 * with the coefficients fixed the pose is a closed-form similarity alignment.
 * Alternating the two converges in a handful of rounds — no gradient descent,
 * no autodiff.
 *
 * The published embedding covers only the central face (no jawline, no chin),
 * so the jaw would otherwise be left entirely to the shape prior. The silhouette
 * terms below add the jaw outline that MediaPipe does observe, re-matched every
 * iteration because the contour slides over the surface as the head turns.
 */

import { FaceLandmarker } from '@mediapipe/tasks-vision';
import { evaluateShape, embeddedLandmarks, landmarkJacobian } from './flame.js';

const ITERATIONS = 8;
/**
 * Ridge weight, in square millimetres: with coefficients in standard
 * deviations, this is the assumed landmark noise variance, so 9 says "trust a
 * landmark to about 3 mm". Rows are normalised to millimetres before it is
 * applied - the targets arrive in isotropic units roughly 1/570 the size, and
 * regularising against those directly swamps the data term entirely.
 */
const REGULARISATION = 9;
/** MediaPipe's depth is not metric, so it constrains the fit only weakly. */
const DEPTH_WEIGHT = 0.3;
const SILHOUETTE_WEIGHT = 0.6;
/** Beyond this many standard deviations a coefficient is not a plausible face. */
const BETA_LIMIT = 4;

// ---------------------------------------------------------------- linear algebra

/** Jacobi eigen-decomposition of a symmetric 4x4, for Horn's rotation method. */
function largestEigenvector4(matrix) {
  const a = matrix.map((row) => row.slice());
  let v = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];

  for (let sweep = 0; sweep < 24; sweep += 1) {
    let off = 0;
    for (let p = 0; p < 4; p += 1) {
      for (let q = p + 1; q < 4; q += 1) off += a[p][q] * a[p][q];
    }
    if (off < 1e-20) break;

    for (let p = 0; p < 4; p += 1) {
      for (let q = p + 1; q < 4; q += 1) {
        if (Math.abs(a[p][q]) < 1e-18) continue;
        const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let k = 0; k < 4; k += 1) {
          const akp = a[k][p];
          const akq = a[k][q];
          a[k][p] = c * akp - s * akq;
          a[k][q] = s * akp + c * akq;
        }
        for (let k = 0; k < 4; k += 1) {
          const apk = a[p][k];
          const aqk = a[q][k];
          a[p][k] = c * apk - s * aqk;
          a[q][k] = s * apk + c * aqk;
          const vkp = v[k][p];
          const vkq = v[k][q];
          v[k][p] = c * vkp - s * vkq;
          v[k][q] = s * vkp + c * vkq;
        }
      }
    }
  }

  let best = 0;
  for (let i = 1; i < 4; i += 1) if (a[i][i] > a[best][best]) best = i;
  return [v[0][best], v[1][best], v[2][best], v[3][best]];
}

/**
 * Similarity transform (scale, rotation, translation) taking `source` onto
 * `target`, by Horn's quaternion method.
 */
function alignSimilarity(source, target, count) {
  const sc = [0, 0, 0];
  const tc = [0, 0, 0];
  for (let i = 0; i < count; i += 1) {
    for (let a = 0; a < 3; a += 1) {
      sc[a] += source[i * 3 + a];
      tc[a] += target[i * 3 + a];
    }
  }
  for (let a = 0; a < 3; a += 1) {
    sc[a] /= count;
    tc[a] /= count;
  }

  const m = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  let sourceNorm = 0;
  for (let i = 0; i < count; i += 1) {
    const s = [source[i * 3] - sc[0], source[i * 3 + 1] - sc[1], source[i * 3 + 2] - sc[2]];
    const t = [target[i * 3] - tc[0], target[i * 3 + 1] - tc[1], target[i * 3 + 2] - tc[2]];
    for (let r = 0; r < 3; r += 1) {
      for (let c = 0; c < 3; c += 1) m[r][c] += s[r] * t[c];
    }
    sourceNorm += s[0] * s[0] + s[1] * s[1] + s[2] * s[2];
  }

  const n = [
    [m[0][0] + m[1][1] + m[2][2], m[1][2] - m[2][1], m[2][0] - m[0][2], m[0][1] - m[1][0]],
    [m[1][2] - m[2][1], m[0][0] - m[1][1] - m[2][2], m[0][1] + m[1][0], m[2][0] + m[0][2]],
    [m[2][0] - m[0][2], m[0][1] + m[1][0], m[1][1] - m[0][0] - m[2][2], m[1][2] + m[2][1]],
    [m[0][1] - m[1][0], m[2][0] + m[0][2], m[1][2] + m[2][1], m[2][2] - m[0][0] - m[1][1]],
  ];
  const [qw, qx, qy, qz] = largestEigenvector4(n);

  const rotation = [
    [1 - 2 * (qy * qy + qz * qz), 2 * (qx * qy - qz * qw), 2 * (qx * qz + qy * qw)],
    [2 * (qx * qy + qz * qw), 1 - 2 * (qx * qx + qz * qz), 2 * (qy * qz - qx * qw)],
    [2 * (qx * qz - qy * qw), 2 * (qy * qz + qx * qw), 1 - 2 * (qx * qx + qy * qy)],
  ];

  let trace = 0;
  for (let i = 0; i < count; i += 1) {
    const s = [source[i * 3] - sc[0], source[i * 3 + 1] - sc[1], source[i * 3 + 2] - sc[2]];
    const t = [target[i * 3] - tc[0], target[i * 3 + 1] - tc[1], target[i * 3 + 2] - tc[2]];
    for (let r = 0; r < 3; r += 1) {
      trace += t[r] * (rotation[r][0] * s[0] + rotation[r][1] * s[1] + rotation[r][2] * s[2]);
    }
  }
  const scale = sourceNorm > 1e-12 ? trace / sourceNorm : 1;

  const translation = [0, 0, 0];
  for (let r = 0; r < 3; r += 1) {
    translation[r] = tc[r] - scale *
      (rotation[r][0] * sc[0] + rotation[r][1] * sc[1] + rotation[r][2] * sc[2]);
  }
  return { scale, rotation, translation };
}

/** Solves (A + lambda I) x = b for a symmetric positive-definite A, in place. */
function solveCholesky(normal, rhs, size) {
  for (let i = 0; i < size; i += 1) {
    for (let j = 0; j <= i; j += 1) {
      let sum = normal[i * size + j];
      for (let k = 0; k < j; k += 1) sum -= normal[i * size + k] * normal[j * size + k];
      if (i === j) {
        if (sum <= 1e-12) return null; // not positive definite
        normal[i * size + i] = Math.sqrt(sum);
      } else {
        normal[i * size + j] = sum / normal[j * size + j];
      }
    }
  }

  const x = new Float64Array(size);
  for (let i = 0; i < size; i += 1) {
    let sum = rhs[i];
    for (let k = 0; k < i; k += 1) sum -= normal[i * size + k] * x[k];
    x[i] = sum / normal[i * size + i];
  }
  for (let i = size - 1; i >= 0; i -= 1) {
    let sum = x[i];
    for (let k = i + 1; k < size; k += 1) sum -= normal[k * size + i] * x[k];
    x[i] = sum / normal[i * size + i];
  }
  return x;
}

// ---------------------------------------------------------------- topology

/** Edge -> the one or two triangles using it, for silhouette detection. */
export function buildEdgeMap(faces, faceCount) {
  const edges = new Map();
  for (let f = 0; f < faceCount; f += 1) {
    const corners = [faces[f * 3], faces[f * 3 + 1], faces[f * 3 + 2]];
    for (let e = 0; e < 3; e += 1) {
      const u = corners[e];
      const v = corners[(e + 1) % 3];
      const key = u < v ? u * 65536 + v : v * 65536 + u;
      const found = edges.get(key);
      if (found) found.push(f);
      else edges.set(key, [f]);
    }
  }
  return edges;
}

/**
 * Vertices lying on the outline of the mesh as seen down -z, below `maxY`.
 * Recomputed each iteration: the contour slides as the shape and pose change.
 */
function silhouetteVertices(positions, faces, faceCount, edges, maxY) {
  const facing = new Uint8Array(faceCount);
  for (let f = 0; f < faceCount; f += 1) {
    const a = faces[f * 3] * 3;
    const b = faces[f * 3 + 1] * 3;
    const c = faces[f * 3 + 2] * 3;
    // z of the cross product only — we just need the sign.
    const ux = positions[b] - positions[a];
    const uy = positions[b + 1] - positions[a + 1];
    const vx = positions[c] - positions[a];
    const vy = positions[c + 1] - positions[a + 1];
    facing[f] = ux * vy - uy * vx > 0 ? 1 : 0;
  }

  const found = new Set();
  for (const [key, adjacent] of edges) {
    if (adjacent.length !== 2 || facing[adjacent[0]] === facing[adjacent[1]]) continue;
    const u = Math.floor(key / 65536);
    const v = key % 65536;
    if (positions[u * 3 + 1] < maxY) found.add(u);
    if (positions[v * 3 + 1] < maxY) found.add(v);
  }
  return [...found];
}

// ---------------------------------------------------------------- fitting

const unique = (connections) => [...new Set(connections.flatMap((c) => [c.start, c.end]))];

/**
 * @param {object} model          from loadFlame()
 * @param {Float32Array} targets  MediaPipe landmarks in isotropic units, (478,3)
 * @returns fitted coefficients, transform, residuals and a scale estimate
 */
export function fitShape(model, targets, options = {}) {
  const iterations = options.iterations ?? ITERATIONS;
  const lambda = options.regularisation ?? REGULARISATION;
  const { components, embedding, faces, faceCount, basis } = model;

  const jacobian = landmarkJacobian(model);
  const edges = options.edges ?? buildEdgeMap(faces, faceCount);

  // Target positions for the embedded landmarks.
  const landmarkTargets = new Float32Array(embedding.count * 3);
  for (let i = 0; i < embedding.count; i += 1) {
    const source = embedding.landmarkIndices[i] * 3;
    for (let a = 0; a < 3; a += 1) landmarkTargets[i * 3 + a] = targets[source + a];
  }

  // Jaw outline: the oval points below the nose are the ones MediaPipe observes
  // and the embedding omits.
  const ovalIndices = unique(FaceLandmarker.FACE_LANDMARKS_FACE_OVAL);
  const noseY = targets[4 * 3 + 1];
  const jawTargets = ovalIndices.filter((i) => targets[i * 3 + 1] < noseY);

  const betas = new Float64Array(components);
  const positions = new Float32Array(model.vertices * 3);
  const landmarks = new Float32Array(embedding.count * 3);
  const normal = new Float64Array(components * components);
  const rhs = new Float64Array(components);

  let transform = null;
  let residual = Infinity;
  let residualMm = Infinity;
  let silhouetteUsed = 0;

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    evaluateShape(model, betas, positions);
    embeddedLandmarks(model, positions, landmarks);

    // 1. Pose, given the current shape.
    transform = alignSimilarity(landmarks, landmarkTargets, embedding.count);
    const { scale, rotation, translation } = transform;

    // Posed mesh, for silhouette matching and for the residual.
    const posed = new Float32Array(positions.length);
    for (let v = 0; v < model.vertices; v += 1) {
      for (let a = 0; a < 3; a += 1) {
        posed[v * 3 + a] = scale * (
          rotation[a][0] * positions[v * 3] +
          rotation[a][1] * positions[v * 3 + 1] +
          rotation[a][2] * positions[v * 3 + 2]
        ) + translation[a];
      }
    }

    // 2. Match the jaw outline to the current silhouette.
    const contour = silhouetteVertices(posed, faces, faceCount, edges, noseY);
    const pairs = [];
    for (const landmarkIndex of jawTargets) {
      const tx = targets[landmarkIndex * 3];
      const ty = targets[landmarkIndex * 3 + 1];
      let best = -1;
      let bestDistance = Infinity;
      for (const vertex of contour) {
        const dx = posed[vertex * 3] - tx;
        const dy = posed[vertex * 3 + 1] - ty;
        const d = dx * dx + dy * dy;
        if (d < bestDistance) {
          bestDistance = d;
          best = vertex;
        }
      }
      if (best >= 0) pairs.push([best, tx, ty]);
    }
    silhouetteUsed = pairs.length;

    // 3. Shape, given the pose. Rows are weight * d(posed landmark)/d(beta).
    normal.fill(0);
    rhs.fill(0);
    const row = new Float64Array(components);
    // The Jacobian is in millimetres but targets are in isotropic units;
    // dividing by the scale puts both sides in millimetres, which is what
    // makes the ridge term above mean anything.
    const toMillimetres = 1 / scale;

    const addRow = (coefficients, target, weight) => {
      for (let k = 0; k < components; k += 1) row[k] = coefficients[k] * weight;
      const weighted = target * weight;
      for (let i = 0; i < components; i += 1) {
        if (!row[i]) continue;
        rhs[i] += row[i] * weighted;
        for (let j = 0; j <= i; j += 1) normal[i * components + j] += row[i] * row[j];
      }
    };

    const coefficients = new Float64Array(components);

    for (let i = 0; i < embedding.count; i += 1) {
      for (let axis = 0; axis < 3; axis += 1) {
        for (let k = 0; k < components; k += 1) {
          coefficients[k] = scale * (
            rotation[axis][0] * jacobian[(i * 3) * components + k] +
            rotation[axis][1] * jacobian[(i * 3 + 1) * components + k] +
            rotation[axis][2] * jacobian[(i * 3 + 2) * components + k]
          );
        }
        // Constant part of the posed landmark, which moves to the right side.
        const constant = scale * (
          rotation[axis][0] * landmarks[i * 3] +
          rotation[axis][1] * landmarks[i * 3 + 1] +
          rotation[axis][2] * landmarks[i * 3 + 2]
        ) + translation[axis];
        let base = 0;
        for (let k = 0; k < components; k += 1) base += coefficients[k] * betas[k];
        addRow(coefficients, landmarkTargets[i * 3 + axis] - constant + base,
               (axis === 2 ? DEPTH_WEIGHT : 1) * toMillimetres);
      }
    }

    for (const [vertex, tx, ty] of pairs) {
      for (let axis = 0; axis < 2; axis += 1) {
        for (let k = 0; k < components; k += 1) {
          coefficients[k] = scale * (
            rotation[axis][0] * basis[(vertex * 3) * components + k] +
            rotation[axis][1] * basis[(vertex * 3 + 1) * components + k] +
            rotation[axis][2] * basis[(vertex * 3 + 2) * components + k]
          );
        }
        let base = 0;
        for (let k = 0; k < components; k += 1) base += coefficients[k] * betas[k];
        addRow(coefficients, (axis === 0 ? tx : ty) - posed[vertex * 3 + axis] + base,
               SILHOUETTE_WEIGHT * toMillimetres);
      }
    }

    for (let i = 0; i < components; i += 1) {
      normal[i * components + i] += lambda;
      for (let j = i + 1; j < components; j += 1) {
        normal[i * components + j] = normal[j * components + i];
      }
    }

    const solved = solveCholesky(normal, rhs, components);
    // (rows were scaled to millimetres above, so REGULARISATION is in mm^2)
    if (!solved) break;
    for (let k = 0; k < components; k += 1) {
      betas[k] = Math.max(-BETA_LIMIT, Math.min(BETA_LIMIT, solved[k]));
    }

    // Residual on the embedded landmarks, in target units.
    evaluateShape(model, betas, positions);
    embeddedLandmarks(model, positions, landmarks);
    let total = 0;
    for (let i = 0; i < embedding.count; i += 1) {
      let d = 0;
      for (let a = 0; a < 3; a += 1) {
        const p = scale * (
          rotation[a][0] * landmarks[i * 3] +
          rotation[a][1] * landmarks[i * 3 + 1] +
          rotation[a][2] * landmarks[i * 3 + 2]
        ) + translation[a];
        d += (p - landmarkTargets[i * 3 + a]) ** 2;
      }
      total += Math.sqrt(d);
    }
    residual = total / embedding.count;
    residualMm = residual / scale;
  }

  evaluateShape(model, betas, positions);

  return {
    betas,
    positions,          // millimetres, in the model's own frame
    transform,
    residual,           // mean landmark error, in target units
    residualMm,         // the same error in millimetres
    silhouettePoints: silhouetteUsed,
    /**
     * Millimetres per isotropic unit implied by the fit. Independent of the
     * iris assumption, because FLAME's template carries real-world size.
     */
    mmPerUnit: transform ? 1 / transform.scale : null,
  };
}
