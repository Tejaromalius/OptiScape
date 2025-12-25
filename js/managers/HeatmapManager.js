import * as THREE from 'three';
import { STATE } from '../config.js';

export class HeatmapManager {
  constructor(scene) {
    this.scene = scene;
    this.gridSize = 128; // Resolution
    this.grid = new Float32Array(this.gridSize * this.gridSize);
    this.texture = null;
    this.maxVisits = 1;
    this.enabled = false;
  }

  reset() {
    this.grid.fill(0);
    this.maxVisits = 1;
    if (this.texture) this.texture.needsUpdate = true;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (enabled && !this.texture) {
      this.buildTexture();
    }
  }

  buildTexture() {
    const size = this.gridSize;
    this.texture = new THREE.DataTexture(
      new Uint8Array(size * size * 4),
      size,
      size
    );
    this.texture.format = THREE.RGBAFormat;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.needsUpdate = true;
  }

  getTexture() {
    return this.enabled ? this.texture : null;
  }

  update(particles, landscape) {
    if (!this.enabled || !this.texture) return;

    const b = landscape.bounds;
    let changed = false;

  }

  updateTexture() {
    const data = this.texture.image.data;
    for (let i = 0; i < this.grid.length; i++) {
      const val = this.grid[i];
      const stride = i * 4;
      if (val > 0) {
        const intensity = Math.log(val + 1) / Math.log(this.maxVisits + 1);

        // Heatmap Gradient: Blue -> Cyan -> Green -> Yellow -> Red
        // Let's use a simpler spectral map for clarity on terrain
        data[stride] = Math.min(1, intensity * 2) * 255; // R
        data[stride + 1] = (1 - Math.abs(intensity - 0.5) * 2) * 255; // G
        data[stride + 2] = Math.max(0, (1 - intensity * 2)) * 255; // B
        data[stride + 3] = Math.min(1.0, intensity * 1.5) * 255; // A
      } else {
        data[stride + 3] = 0; // Transparent
      }
    }
    this.texture.needsUpdate = true;
  }
}
