import * as THREE from 'three';
import { STATE, EVENTS } from '../config.js';

export class TerrainManager {
  constructor(scene) {
    this.scene = scene;
    this.mesh = null;
    this.landscape = null;
  }

  setLandscape(landscape) {
    this.landscape = landscape;
    this.rebuild();
  }

  rebuild() {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
    }

    const l = this.landscape;
    const size = l.bounds * 2;
    const segments = 128; // High res
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);

    const pos = geo.attributes.position;
    let maxVal = -Infinity;
    let minVal = Infinity;

    // 1. Calculate Range
    for (let i = 0; i < pos.count; i++) {
      const z = l.f(pos.getX(i), pos.getY(i));
      if (z > maxVal) maxVal = z;
      if (z < minVal) minVal = z;
    }

    const colors = [];
    const cLow = new THREE.Color(l.colors[0]);
    const cHigh = new THREE.Color(l.colors[1]);

    // 2. setZ and colors
    for (let i = 0; i < pos.count; i++) {
      const val = l.f(pos.getX(i), pos.getY(i));

      // Visual Height
      pos.setZ(i, (val * l.hScale) + l.visOffset);

      // Color Interpolation
      let t = 0;
      if (l.id === 'rosenbrock' || l.id === 'schwefel') {
        // Log or different scaling for high range functions
        const safeVal = Math.max(val, 0.0001);
        // Simple normalized log scale
        if (maxVal === minVal) t = 0;
        else t = (Math.log(safeVal) - Math.log(Math.max(minVal, 0.0001))) / (Math.log(maxVal) - Math.log(Math.max(minVal, 0.0001)));
      } else {
        t = (val - minVal) / (maxVal - minVal || 1);
      }
      t = Math.max(0, Math.min(1, t)); // Clamp

      const c = new THREE.Color().lerpColors(cLow, cHigh, t);
      colors.push(c.r, c.g, c.b);
    }

    geo.computeVertexNormals();
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    // Material with support for map (heatmap overlay)
    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.6,
      metalness: 0.1,
      side: THREE.DoubleSide,
      transparent: true,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0 // Default off
    });

    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.rotation.x = -Math.PI / 2;
    this.scene.add(this.mesh);
  }

  setHeatmap(texture) {
    if (!this.mesh) return;
    this.mesh.material.map = texture;
    this.mesh.material.needsUpdate = true;
  }
}
