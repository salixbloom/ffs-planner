/**
 * three.js scene drawn over the camera feed. In M0 it holds a test mesh only;
 * M1 replaces that with the captured face mesh.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const MAX_PIXEL_RATIO = 2; // phone GPUs gain nothing above this

export function createViewer(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true, // let the camera feed show through
    antialias: true,
  });
  renderer.setClearAlpha(0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 4);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.enablePan = false;

  const testMesh = new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.7, 0.24, 160, 24),
    new THREE.MeshNormalMaterial(),
  );
  scene.add(testMesh);

  function resize() {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (!w || !h) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  let frame = 0;
  renderer.setAnimationLoop(() => {
    frame += 1;
    testMesh.rotation.x += 0.004;
    testMesh.rotation.y += 0.007;
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
    dispose() {
      observer.disconnect();
      renderer.setAnimationLoop(null);
      controls.dispose();
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
