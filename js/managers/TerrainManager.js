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
    const l = this.landscape;
    if (!l) return;

    const size = l.bounds * 2;
    const segments = 128; // High res

    // 1. Initial creation or full resize
    if (!this.mesh || this._lastBounds !== l.bounds) {
      this._cleanup();
      const geo = new THREE.PlaneGeometry(size, size, segments, segments);

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

      const overlayMat = new THREE.MeshBasicMaterial({
        map: null,
        transparent: true,
        opacity: 1,
        side: THREE.DoubleSide,
        depthWrite: false,
        color: 0xffffff,
      });

      this.heatmapMesh = new THREE.Mesh(geo, overlayMat);
      this.heatmapMesh.rotation.x = -Math.PI / 2;
      this.heatmapMesh.position.y = 0.05;
      this.heatmapMesh.visible = false;
      this.scene.add(this.heatmapMesh);

      this._lastBounds = l.bounds;
    }

    // 2. Perform the actual vertex calculations (Fast Path)
    this._updateAttributes();

    // Restore pending state
    if (this._pendingTexture) {
      this.setHeatmap(this._pendingTexture);
    }
  }

  _updateAttributes() {
    const l = this.landscape;
    const geo = this.mesh.geometry;
    const pos = geo.attributes.position;
    const colorsAttr =
      geo.attributes.color ||
      new THREE.Float32BufferAttribute(pos.count * 3, 3);

    let maxVal = -Infinity;
    let minVal = Infinity;

    // Cache values to avoid double calculation
    const heightMap = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      // Correct coordinate mapping:
      // Plane X = World X
      // Plane Y = World -Z
      // Therefore, to get f(x, z), we pass (pos.getX, -pos.getY)
      const val = l.f(pos.getX(i), -pos.getY(i));
      heightMap[i] = val;
      if (val > maxVal) maxVal = val;
      if (val < minVal) minVal = val;
    }

    const colors = [];
    const cLow = new THREE.Color(l.colors[0]);
    const cHigh = new THREE.Color(l.colors[1]);

    for (let i = 0; i < pos.count; i++) {
      const val = heightMap[i];
      pos.setZ(i, val * l.hScale + l.visOffset);

      let t = 0;
      if (l.id === 'rosenbrock') {
        const safeVal = Math.max(val, 0.0001);
        const safeMin = Math.max(minVal, 0.0001);
        const safeMax = Math.max(maxVal, 0.0001);
        if (safeMax === safeMin) t = 0;
        else
          t =
            (Math.log(safeVal) - Math.log(safeMin)) /
            (Math.log(safeMax) - Math.log(safeMin));
      } else {
        t = (val - minVal) / (maxVal - minVal || 1);
      }
      t = Math.max(0, Math.min(1, t));

      const c = new THREE.Color().lerpColors(cLow, cHigh, t);
      colorsAttr.setXYZ(i, c.r, c.g, c.b);
    }

    pos.needsUpdate = true;
    if (!geo.attributes.color) geo.setAttribute('color', colorsAttr);
    else colorsAttr.needsUpdate = true;

    geo.computeVertexNormals();
  }

  _cleanup() {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
      this.mesh = null;
    }
    if (this.heatmapMesh) {
      this.scene.remove(this.heatmapMesh);
      this.heatmapMesh.material.dispose();
      this.heatmapMesh = null;
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
