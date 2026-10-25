/**
 * three.js scene drawn over the camera feed.
 *
 * Until a face is captured this shows a test mesh (M0). Once `showFace` is
 * called the scene switches to the captured face, whose units are millimetres.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const MAX_PIXEL_RATIO = 2; // phone GPUs gain nothing above this
const FOV_DEG = 45;

export function createViewer(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true, // let the camera feed show through
    antialias: true,
  });
  renderer.setClearAlpha(0);

  const scene = new THREE.Scene();
  // Range spans the test mesh (~1 unit) and a face in mm (~200 units).
  const camera = new THREE.PerspectiveCamera(FOV_DEG, 1, 0.1, 5000);
  camera.position.set(0, 0, 4);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.enablePan = false;

  const testMesh = new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.7, 0.24, 160, 24),
    new THREE.MeshNormalMaterial(),
  );
  scene.add(testMesh);

  let face = null;

  function frameObject(object) {
    object.geometry.computeBoundingSphere();
    const { center, radius } = object.geometry.boundingSphere;
    const distance = (radius * 1.6) / Math.sin((FOV_DEG * Math.PI) / 360);

    controls.target.copy(center);
    camera.position.set(center.x, center.y, center.z + distance);
    camera.near = Math.max(distance / 100, 0.1);
    camera.far = distance * 10;
    camera.updateProjectionMatrix();
    controls.update();
  }

  function disposeFace() {
    if (!face) return;
    scene.remove(face);
    face.geometry.dispose();
    face.material.map?.dispose();
    face.material.dispose();
    face = null;
  }

  function resize() {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (!w || !h) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  let frame = 0;
  let onFrame = null;

  renderer.setAnimationLoop((time) => {
    frame += 1;
    if (!face) {
      testMesh.rotation.x += 0.004;
      testMesh.rotation.y += 0.007;
    }
    onFrame?.(time);
    controls.update();
    renderer.render(scene, camera);
  });

  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  return {
    renderer,
    scene,
    /** Frames drawn so far — used to prove the render loop is alive. */
    get frameCount() { return frame; },
    get hasFace() { return Boolean(face); },

    /** Runs every frame before rendering; used to drive capture. */
    setFrameCallback(fn) { onFrame = fn; },

    showFace(geometry, texture) {
      disposeFace();
      scene.remove(testMesh);
      face = new THREE.Mesh(
        geometry,
        new THREE.MeshBasicMaterial({
          map: texture,
          // Tessellation winding is not guaranteed consistent, and the texture
          // already carries the lighting, so draw both sides unlit.
          side: THREE.DoubleSide,
        }),
      );
      scene.add(face);
      frameObject(face);
      return face;
    },

    clearFace() {
      disposeFace();
      scene.add(testMesh);
      camera.position.set(0, 0, 4);
      controls.target.set(0, 0, 0);
      controls.update();
    },

    dispose() {
      observer.disconnect();
      renderer.setAnimationLoop(null);
      controls.dispose();
      disposeFace();
      testMesh.geometry.dispose();
      testMesh.material.dispose();
      renderer.dispose();
    },
  };
}

/** GPU string, when the browser exposes it — useful when triaging phone reports. */
export function describeRenderer(renderer) {
  const gl = renderer.getContext();
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  const name = info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : 'hidden';
  return `${renderer.capabilities.isWebGL2 ? 'WebGL2' : 'WebGL1'} · ${name}`;
}
