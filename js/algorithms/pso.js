import { Algorithm } from './base.js';
import { STATE, EVENTS } from '../config.js';
import { RNG } from '../utils/random.js';

export class PSO extends Algorithm {
  constructor() {
    super('pso');
  }

  init(landscape) {
    this.particles = [];
    this.best = { val: Infinity };
    this.globalBest = { x: 0, z: 0, val: Infinity };
    const b = landscape.bounds;

    for (let i = 0; i < STATE.popSize; i++) {
      const x = (RNG.next() * 2 - 1) * b;
      const z = (RNG.next() * 2 - 1) * b;
      const val = landscape.f(x, z);

      // Random initial velocity
      const vx = (RNG.next() * 2 - 1) * (b * 0.1);
      const vz = (RNG.next() * 2 - 1) * (b * 0.1);

      const p = {
        x,
        z,
        val,
        vx,
        vz,
        pBest: { x, z, val }, // Personal best
        id: i,
      };
      this.particles.push(p);

      if (val < this.globalBest.val) this.globalBest = { x, z, val };
    }
    this.best = this.globalBest;
  }

  step(landscape) {
    const p = STATE.algoParams.pso;
    const w = p.w; // Inertia
    const c1 = p.c1; // Cognitive (self)
    const c2 = p.c2; // Social (global)
    const b = landscape.bounds;

    for (let i = 0; i < this.particles.length; i++) {
      const part = this.particles[i];

      // Update Velocity (independent random values per dimension)
      const r1x = RNG.next(),
        r1z = RNG.next();
      const r2x = RNG.next(),
        r2z = RNG.next();

      part.vx =
        w * part.vx +
        c1 * r1x * (part.pBest.x - part.x) +
        c2 * r2x * (this.globalBest.x - part.x);

      part.vz =
        w * part.vz +
        c1 * r1z * (part.pBest.z - part.z) +
        c2 * r2z * (this.globalBest.z - part.z);

      // Update Position
      part.x += part.vx;
      part.z += part.vz;

      // Boundary handling (Clamp)
      part.x = Math.max(-b, Math.min(b, part.x));
      part.z = Math.max(-b, Math.min(b, part.z));

      // Eval
      part.val = landscape.f(part.x, part.z);

      // Update Personal Best
      if (part.val < part.pBest.val) {
        part.pBest = { x: part.x, z: part.z, val: part.val };
      }

      // Update Global Best
      if (part.val < this.globalBest.val) {
        this.globalBest = { x: part.x, z: part.z, val: part.val };
      }
    }
    this.best = this.globalBest;
  }

  get description() {
    return 'Simulates the social behavior of bird flocking or fish schooling. Each particle adjusts its position based on its own experience (personal best) and the experience of the entire swarm (global best). It is highly effective for large-scale nonlinear optimization problems.';
  }

  getControlsHTML() {
    const p = STATE.algoParams.pso;
    return `
            <div class="sub-control">
                <label>Inertia (w): <span id="val-pso-w">${p.w}</span></label>
                <input type="range" id="inp-pso-w" min="0" max="1" step="0.05" value="${p.w}">
            </div>
            <div class="sub-control">
                <label>Cognitive (c1): <span id="val-pso-c1">${p.c1}</span></label>
                <input type="range" id="inp-pso-c1" min="0" max="4" step="0.1" value="${p.c1}">
            </div>
            <div class="sub-control">
                <label>Social (c2): <span id="val-pso-c2">${p.c2}</span></label>
                <input type="range" id="inp-pso-c2" min="0" max="4" step="0.1" value="${p.c2}">
            </div>
        `;
  }

  updateParams(dom) {
    const p = STATE.algoParams.pso;
    const domW = dom.querySelector('#inp-pso-w');
    const domC1 = dom.querySelector('#inp-pso-c1');
    const domC2 = dom.querySelector('#inp-pso-c2');

    if (domW) {
      domW.addEventListener('input', (e) => {
        p.w = parseFloat(e.target.value);
        dom.querySelector('#val-pso-w').innerText = p.w.toFixed(2);
      });
      domW.addEventListener('change', () => {
        document.dispatchEvent(new Event(EVENTS.RESET));
      });
    }
    if (domC1) {
      domC1.addEventListener('input', (e) => {
        p.c1 = parseFloat(e.target.value);
        dom.querySelector('#val-pso-c1').innerText = p.c1.toFixed(1);
      });
      domC1.addEventListener('change', () => {
        document.dispatchEvent(new Event(EVENTS.RESET));
      });
    }
    if (domC2) {
      domC2.addEventListener('input', (e) => {
        p.c2 = parseFloat(e.target.value);
        dom.querySelector('#val-pso-c2').innerText = p.c2.toFixed(1);
      });
      domC2.addEventListener('change', () => {
        document.dispatchEvent(new Event(EVENTS.RESET));
      });
    }
  }
}
