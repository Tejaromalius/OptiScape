import * as THREE from 'three';
import { STATE, EVENTS } from '../config.js';

export class TerrainManager {
  constructor(scene) {
    this.scene = scene;
    this.mesh = null;
    this.heatmapMesh = null; // Separate mesh for heatmap overlay
    this.landscape = null;
    this._pendingTexture = null;
  }

  setLandscape(landscape) {
    this.landscape = landscape;
    this.rebuild();
  }

  rebuild() {
    // Cleanup existing meshes
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
    }
    if (this.heatmapMesh) {
      this.scene.remove(this.heatmapMesh);
      // Geometry is shared with mesh, so we only dispose material
      this.heatmapMesh.material.dispose();
      this.heatmapMesh = null;
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
      pos.setZ(i, val * l.hScale + l.visOffset);

      // Color Interpolation
      let t = 0;
      if (l.id === 'rosenbrock' || l.id === 'schwefel') {
        const safeVal = Math.max(val, 0.0001);
        if (maxVal === minVal) t = 0;
        else
          t =
            (Math.log(safeVal) - Math.log(Math.max(minVal, 0.0001))) /
            (Math.log(maxVal) - Math.log(Math.max(minVal, 0.0001)));
      } else {
        t = (val - minVal) / (maxVal - minVal || 1);
      }
      t = Math.max(0, Math.min(1, t)); // Clamp

      const c = new THREE.Color().lerpColors(cLow, cHigh, t);
      colors.push(c.r, c.g, c.b);
    }

    geo.computeVertexNormals();
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    // 1. Base Mesh (Terrain Colors) - Responsive and Balanced
    const mat = new THREE.MeshPhongMaterial({
      vertexColors: true,
      shininess: 15,
      specular: 0x222222,
      side: THREE.DoubleSide,
      transparent: false,
    });

    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.rotation.x = -Math.PI / 2;
    this.scene.add(this.mesh);

    // 2. Overlay Mesh (Heatmap Only) - Transparent
    const overlayMat = new THREE.MeshBasicMaterial({
      map: null,
      transparent: true,
      opacity: 1, // Will show texture opacity
      side: THREE.DoubleSide,
      depthWrite: false, // Prevents z-fighting and ensures overlay behavior
      color: 0xffffff,
      alphaTest: 0, // No alpha test needed, use proper blending
    });

    this.heatmapMesh = new THREE.Mesh(geo, overlayMat); // Re-use geometry
    this.heatmapMesh.rotation.x = -Math.PI / 2;
    this.heatmapMesh.position.y = 0.05; // Offset slightly above to sit on top
    this.heatmapMesh.visible = false;
    this.scene.add(this.heatmapMesh);

    // Restore pending state
    if (this._pendingTexture) {
      this.setHeatmap(this._pendingTexture);
    }
  }

  /**
   * Applies or removes heatmap texture to the overlay mesh
   */
  setHeatmap(texture) {
    this._pendingTexture = texture;

    if (!this.heatmapMesh) return;

    if (texture) {
      this.heatmapMesh.material.map = texture;
      this.heatmapMesh.material.needsUpdate = true;
      this.heatmapMesh.visible = true;
    } else {
      this.heatmapMesh.visible = false;
      this.heatmapMesh.material.map = null;
    }
  }
}
