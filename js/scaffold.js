import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050505);
  scene.fog = new THREE.FogExp2(0x050505, 0.02); // Slightly less fog to see trails
  return scene;
}

export function createCamera(container) {
  const width = container ? container.clientWidth : window.innerWidth;
  const height = container ? container.clientHeight : window.innerHeight;
  const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 5000);
  camera.position.set(6, 7, 6);
  camera.lookAt(0, 0, 0);
  return camera;
}

export function createRenderer(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);
  return renderer;
}

export function createControls(camera, domElement) {
  const controls = new OrbitControls(camera, domElement);
  controls.enableDamping = true;
  controls.autoRotate = false;
  controls.autoRotateSpeed = 0.5;
  return controls;
}

export function addLights(scene) {
  // 1. Ambient Light - Balanced to allow shadows to exist
  const ambient = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambient);

  // 2. Main Sun - Strong enough for highlights but not for washing out
  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.position.set(20, 40, 20);
  sun.castShadow = false;
  scene.add(sun);

  // 3. Rim/Fill Light - Subtle accent
  const rimLight = new THREE.PointLight(0x4facfe, 0.5, 500);
  rimLight.position.set(-20, 20, -20);
  scene.add(rimLight);
}

/**
 * Dynamically adjusts the camera and environment based on landscape scale
 */
export function updateEnvironment(camera, controls, scene, landscape) {
  const b = landscape.bounds;

  // 1. Adaptive Camera Position
  const multiplier = b > 100 ? 1.5 : 2.5;
  const dist = b * multiplier;
  const height = b * (multiplier * 0.7);

  camera.position.set(dist, height, dist);
  camera.lookAt(0, 0, 0);

  // 2. Adjust Controls
  controls.target.set(0, 0, 0);
  controls.maxDistance = b * 20;
  controls.update();

  // 3. Adaptive Fog
  if (scene.fog) {
    if (b > 100) {
      scene.fog.density = 0.00005; // Extremely clear for large landscapes
    } else {
      const baseDensity = 0.1;
      scene.fog.density = baseDensity / b;
    }
  }

  // 4. Adaptive Lights - Move lights further out for large landscapes
  scene.traverse((light) => {
    if (light.isDirectionalLight) {
      // Positional behavior for directional light affects shadow/highlight angle
      light.position.set(b * 2, b * 4, b * 2);
    }
    if (light.isPointLight) {
      // Rim light positioning
      light.position.set(-b * 2, b * 2, -b * 2);
      light.distance = b * 10; // Increase reach
    }
  });
}
