import * as THREE from 'three';
import { STATE } from '../config.js';

/**
 * HeatmapManager
 * Generates a high-resolution 2D texture heatmap to be draped over the terrain.
 * Uses a dense grid to accumulate visits and maps intensities to an RGB gradient.
 */
export class HeatmapManager {
  constructor(scene) {
    this.scene = scene;
    this.gridSize = 256; // 256x256 resolution for smooth details
    this.grid = new Float32Array(this.gridSize * this.gridSize);
    this.maxVisits = 1;
    this.enabled = false;

    // Canvas for generating the texture
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.gridSize;
    this.canvas.height = this.gridSize;
    this.ctx = this.canvas.getContext('2d');

    // Create the texture to be used by the terrain material
    this.texture = new THREE.CanvasTexture(this.canvas);
    // Linear filtering ensures the texture looks smooth when zoomed in
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
  }

  /**
   * Clears accumulated data and resets the visualization
   */
  reset() {
    this.grid.fill(0);
    this.maxVisits = 1;
    this.updateTexture(); // Clear the visual texture
  }

  /**
   * Toggles heatmap state
   */
  setEnabled(enabled, landscape) {
    this.enabled = enabled;
    if (enabled) {
      this.updateTexture(); // Ensure visualization is current
    }
  }

  /**
   * No physical mesh to build anymore, but we keep the method signature
   * if the main loop calls it.
   */
  buildMesh(landscape) {
    // No-op for texture mode
  }

  /**
   * Accommodates particle visits into the grid
   */
  update(particles, landscape) {
    if (!this.enabled || !landscape) return;

    const b = landscape.bounds;
    const size = b * 2;
    let changed = true; // Always update to show decay/flow

    // 0. History Preservation
    // We removed the decay so trails persist (Cumulative Heatmap)
    this.maxVisits = 0; // Reset to find new max for normalization

    // Find absolute max for scaling (no decay)
    for (let i = 0; i < this.grid.length; i++) {
      if (this.grid[i] > this.maxVisits) this.maxVisits = this.grid[i];
    }

    // Ensure maxVisits is at least 1 to avoid division by zero log issues
    if (this.maxVisits < 1) this.maxVisits = 1;

    // 1. Add new visits
    // Use a "splat" radius to smooth out the visits
    const gridScale = this.gridSize / size;

    particles.forEach(p => {
      // Convert world pos to grid pos 
      const gx = Math.floor((p.x + b) * gridScale);
      const gz = Math.floor((p.z + b) * gridScale);

      if (gx >= 0 && gx < this.gridSize && gz >= 0 && gz < this.gridSize) {

        // Simple 3x3 Gaussian-like distribution
        for (let ox = -1; ox <= 1; ox++) {
          for (let oz = -1; oz <= 1; oz++) {
            const nx = gx + ox;
            const nz = gz + oz;

            if (nx >= 0 && nx < this.gridSize && nz >= 0 && nz < this.gridSize) {
              const weight = (2 - Math.abs(ox)) * (2 - Math.abs(oz)) * 2.5; // Normal weight
              const idx = nz * this.gridSize + nx;
              this.grid[idx] += weight;

              if (this.grid[idx] > this.maxVisits) {
                this.maxVisits = this.grid[idx];
              }
            }
          }
        }
      }
    });

    this.updateTexture();
  }

  /**
   * Generates the RGB pixel data from the grid intensity
   */
  updateTexture() {
    // Get raw pixel data
    const imgData = this.ctx.createImageData(this.gridSize, this.gridSize);
    const data = imgData.data;
    const totalPixels = this.gridSize * this.gridSize;

    // Color Map Configuration
    // We manually interpolate to get strict control over the gradient
    // 0.0 -> Blue
    // 0.33 -> Cyan
    // 0.66 -> Yellow
    // 1.0 -> Red

    for (let i = 0; i < totalPixels; i++) {
      const val = this.grid[i];

      // 1. Calculate Intensity (0.0 to 1.0)
      // We use a fixed saturation threshold so the colors don't get washed out by huge peaks
      // Anything with >50 visits is considered fully "Hot" (Red)
      const saturationThreshold = 50;

      let intensity = 0;
      if (val > 0) {
        // Linear scale up to threshold, then clamped
        // combining with a slight log curve for the low end
        intensity = Math.log(val + 1) / Math.log(saturationThreshold + 1);
        if (intensity > 1.0) intensity = 1.0;
      }

      // 2. Map Intensity to RGB
      let r = 0, g = 0, b = 0, a = 0;

      if (intensity > 0) {
        // Apply a minimum alpha so even faint trails are seen
        // Alpha ramps up quickly to 0.8
        a = Math.min(180, Math.floor(intensity * 255 + 50));
        if (intensity < 0.2) {
          // Fade in deep blue
          b = 255;
          g = Math.floor((intensity / 0.2) * 255); // 0 -> 255
        } else if (intensity < 0.5) {
          // Blue-Cyan to Green
          // Int: 0.2 -> 0.5
          // T: 0 -> 1
          const t = (intensity - 0.2) / 0.3;
          r = 0;
          g = 255;
          b = Math.floor(255 * (1 - t)); // Fade out blue
        } else if (intensity < 0.8) {
          // Green to Yellow
          // Int: 0.5 -> 0.8
          const t = (intensity - 0.5) / 0.3;
          r = Math.floor(255 * t); // Fade in red
          g = 255;
          b = 0;
        } else {
          // Yellow to Red
          // Int: 0.8 -> 1.0
          const t = (intensity - 0.8) / 0.2;
          r = 255;
          g = Math.floor(255 * (1 - t)); // Fade out green
          b = 0;
        }
      }

      const ptr = i * 4;
      data[ptr] = r;
      data[ptr + 1] = g;
      data[ptr + 2] = b;
      data[ptr + 3] = a;
    }

    // Write back to canvas
    this.ctx.putImageData(imgData, 0, 0);

    // Flag texture for update on GPU
    this.texture.needsUpdate = true;
  }

  /**
   * Returns the live canvas texture
   */
  getTexture() {
    return this.texture;
  }
}
