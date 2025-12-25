import { Algorithm } from './base.js';
import { STATE, CONSTANTS, EVENTS } from '../config.js';
import { MathUtils } from '../utils/math.js';
import { RNG } from '../utils/random.js';

export class CuckooSearch extends Algorithm {
  constructor() {
    super('cuckoo');
  }

  init(landscape) {
    this.particles = [];
    this.best = { val: Infinity };
    const b = landscape.bounds;

    for (let i = 0; i < STATE.popSize; i++) {
      const x = (RNG.next() * 2 - 1) * b;
      const z = (RNG.next() * 2 - 1) * b;
      const val = landscape.f(x, z);
      this.particles.push({
        x,
        z,
        val,
        id: i,
        isNest: true, // For visual differentiation later
      });
      if (val < this.best.val) this.best = { x, z, val };
    }
  }

  step(landscape) {
    const b = landscape.bounds;
    const Pa = STATE.algoParams.cuckoo.pa;
    const beta = CONSTANTS.beta;

    // 1. Lévy Flights
    for (let i = 0; i < this.particles.length; i++) {
      const current = this.particles[i];
      const jumpScale = CONSTANTS.levyScale * (b / 3);

      // Lévy step using Mantegna's method
      const sigma = Math.pow(
        (MathUtils.gamma(1 + beta) * Math.sin((Math.PI * beta) / 2)) /
        (MathUtils.gamma((1 + beta) / 2) *
          beta *
          Math.pow(2, (beta - 1) / 2)),
        1 / beta,
      );
      const getLevyStep = () => {
        const u = MathUtils.normalRandom() * sigma;
        const v = MathUtils.normalRandom();
        return u / Math.pow(Math.abs(v), 1 / beta);
      };

      // Standard Coordinate-wise Lévy Flight
      // Independent steps for each dimension
      const stepX = getLevyStep() * jumpScale;
      const stepZ = getLevyStep() * jumpScale;

      let nx = current.x + stepX;
      let nz = current.z + stepZ;

      // Reflective boundary handling
      if (nx > b) nx = 2 * b - nx;
      else if (nx < -b) nx = -2 * b - nx;

      if (nz > b) nz = 2 * b - nz;
      else if (nz < -b) nz = -2 * b - nz;
      const nVal = landscape.f(nx, nz);

      // Random choice selection
      const randIdx = RNG.nextInt(0, this.particles.length);
      if (nVal < this.particles[randIdx].val) {
        this.particles[randIdx].x = nx;
        this.particles[randIdx].z = nz;
        this.particles[randIdx].val = nVal;
      }
    }

    // 2. Abandonment
    // Sort to find worst
    const sorted = this.particles
      .map((p, i) => ({ val: p.val, idx: i }))
      .sort((a, b) => b.val - a.val);
    const numAbandon = Math.floor(this.particles.length * Pa);

    for (let k = 0; k < numAbandon; k++) {
      const idx = sorted[k].idx;
      // Elitism: don't abandon the absolute best
      if (Math.abs(this.particles[idx].val - this.best.val) < 1e-9) continue;

      const rx = (RNG.next() * 2 - 1) * b;
      const rz = (RNG.next() * 2 - 1) * b;
      this.particles[idx].x = rx;
      this.particles[idx].z = rz;
      this.particles[idx].val = landscape.f(rx, rz);
    }

    // 3. Update Best
    this.particles.forEach((p) => {
      if (p.val < this.best.val) this.best = { x: p.x, z: p.z, val: p.val };
    });
  }

  getControlsHTML() {
    const p = STATE.algoParams.cuckoo;
    return `
            <div class="sub-control">
                <label>Discovery Rate (Pa): <span id="val-pa">${p.pa}</span></label>
                <input type="range" id="inp-pa" min="0" max="1" step="0.05" value="${p.pa}">
            </div>
            <div style="font-size: 0.75rem; color: #888;">Fraction of nests abandoned each generation.</div>
        `;
  }

  updateParams(dom) {
    const p = STATE.algoParams.cuckoo;
    const start = dom.querySelector('#inp-pa');
    if (start) {
      start.addEventListener('input', (e) => {
        p.pa = parseFloat(e.target.value);
        dom.querySelector('#val-pa').innerText = p.pa.toFixed(2);
      });
    }
  }
}
