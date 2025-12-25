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
      // Adjusted scale to prevent excessive boundary clamping on large domains
      // Previously (b / 3), now (b * 0.01) to keep steps closer to local search with occasional long jumps
      // Uses Dynamic control from STATE
      const jumpScale = STATE.algoParams.cuckoo.levyScale * (b * 0.01);

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

      // Standard Yang & Deb (2009): Compare against source nest
      // If the new solution is better, replace the source nest
      if (nVal < current.val) {
        current.x = nx;
        current.z = nz;
        current.val = nVal;
      }
    }

    // 2. Abandonment
    // Sort to find worst (highest values)
    const sorted = this.particles
      .map((p, i) => ({ val: p.val, idx: i }))
      .sort((a, b) => b.val - a.val);
    const numAbandon = Math.floor(this.particles.length * Pa);

    // Find current best index to protect it (Elitism)
    // We scan the current state because particles might have moved during Lévy flights
    let bestIdx = -1;
    let minVal = Infinity;
    for (let i = 0; i < this.particles.length; i++) {
      if (this.particles[i].val < minVal) {
        minVal = this.particles[i].val;
        bestIdx = i;
      }
    }

    for (let k = 0; k < numAbandon; k++) {
      const idx = sorted[k].idx;
      // Elitism: don't abandon the absolute best
      if (idx === bestIdx) continue;

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

  get description() {
    return 'Inspired by the brood parasitism of cuckoo species. It uses Lévy flights (a random walk with power-law jump lengths) to explore the search space, which is more efficient than simple random walks. The algorithm is characterized by its high efficiency in escaping local optima due to occasional "long jumps".';
  }

  getControlsHTML() {
    const p = STATE.algoParams.cuckoo;
    return `
            <div class="sub-control">
                <label>Discovery Rate (Pa): <span id="val-pa">${p.pa}</span></label>
                <input type="range" id="inp-pa" min="0" max="1" step="0.05" value="${p.pa}">
            </div>
            <div class="sub-control">
                <label>Lévy Multiple: <span id="val-levy">${p.levyScale}</span></label>
                <input type="range" id="inp-levy" min="0.1" max="5.0" step="0.1" value="${p.levyScale}">
            </div>
            <div style="font-size: 0.75rem; color: #888;">Fraction abandoned & Jump step multiplier.</div>
        `;
  }

  updateParams(dom) {
    const p = STATE.algoParams.cuckoo;
    const start = dom.querySelector('#inp-pa');
    const levy = dom.querySelector('#inp-levy');
    if (start) {
      start.addEventListener('input', (e) => {
        p.pa = parseFloat(e.target.value);
        dom.querySelector('#val-pa').innerText = p.pa.toFixed(2);
      });
      start.addEventListener('change', () => {
        document.dispatchEvent(new Event(EVENTS.RESET));
      });
    }
    if (levy) {
      levy.addEventListener('input', (e) => {
        p.levyScale = parseFloat(e.target.value);
        dom.querySelector('#val-levy').innerText = p.levyScale.toFixed(1);
      });
      levy.addEventListener('change', () => {
        document.dispatchEvent(new Event(EVENTS.RESET));
      });
    }
  }
}
