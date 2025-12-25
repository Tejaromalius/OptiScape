import { Algorithm } from './base.js';
import { STATE, EVENTS } from '../config.js';
import { MathUtils } from '../utils/math.js';
import { RNG } from '../utils/random.js';

export class GeneticAlgorithm extends Algorithm {
  constructor() {
    super('ga');
  }

  init(landscape) {
    this.particles = [];
    this.best = { val: Infinity };
    const b = landscape.bounds;

    for (let i = 0; i < STATE.popSize; i++) {
      const x = (RNG.next() * 2 - 1) * b;
      const z = (RNG.next() * 2 - 1) * b;
      const val = landscape.f(x, z);
      this.particles.push({ x, z, val, id: i });
      if (val < this.best.val) this.best = { x, z, val };
    }
  }

  step(landscape) {
    const p = STATE.algoParams.ga;
    const newPop = [];
    const b = landscape.bounds;

    // Elitism: Keep best
    newPop.push({ ...this.best, id: 0 });

    while (newPop.length < this.particles.length) {
      // Tournament Selection
      const p1 = this.tournamentSelect(3);
      const p2 = this.tournamentSelect(3);

      // Crossover
      let childX = p1.x;
      let childZ = p1.z;

      if (RNG.next() < p.crossoverRate) {
        const alpha = RNG.next();
        childX = alpha * p1.x + (1 - alpha) * p2.x;
        childZ = alpha * p1.z + (1 - alpha) * p2.z;
      }

      // Mutation
      if (RNG.next() < p.mutationRate) {
        childX += (RNG.next() * 2 - 1) * (b * 0.1);
        childZ += (RNG.next() * 2 - 1) * (b * 0.1);
      }

      // Clamp
      childX = Math.max(-b, Math.min(b, childX));
      childZ = Math.max(-b, Math.min(b, childZ));

      newPop.push({
        x: childX,
        z: childZ,
        val: landscape.f(childX, childZ),
        id: newPop.length,
      });
    }

    this.particles = newPop;

    // Update Best
    this.particles.forEach((pt) => {
      if (pt.val < this.best.val) this.best = { x: pt.x, z: pt.z, val: pt.val };
    });
  }

  tournamentSelect(k) {
    let best = null;
    for (let i = 0; i < k; i++) {
      const ind = this.particles[RNG.nextInt(0, this.particles.length)];
      if (best === null || ind.val < best.val) best = ind;
    }
    return best;
  }

  getControlsHTML() {
    const p = STATE.algoParams.ga;
    return `
            <div class="sub-control">
                <label>Mutation Rate: <span id="val-ga-mut">${p.mutationRate}</span></label>
                <input type="range" id="inp-ga-mut" min="0" max="1" step="0.05" value="${p.mutationRate}">
            </div>
            <div class="sub-control">
                <label>Crossover Rate: <span id="val-ga-cross">${p.crossoverRate}</span></label>
                <input type="range" id="inp-ga-cross" min="0" max="1" step="0.05" value="${p.crossoverRate}">
            </div>
        `;
  }

  updateParams(dom) {
    const p = STATE.algoParams.ga;
    const domMut = dom.querySelector('#inp-ga-mut');
    const domCross = dom.querySelector('#inp-ga-cross');

    if (domMut) {
      domMut.addEventListener('input', (e) => {
        p.mutationRate = parseFloat(e.target.value);
        dom.querySelector('#val-ga-mut').innerText = p.mutationRate.toFixed(2);
      });
    }
    if (domCross) {
      domCross.addEventListener('input', (e) => {
        p.crossoverRate = parseFloat(e.target.value);
        dom.querySelector('#val-ga-cross').innerText =
          p.crossoverRate.toFixed(2);
      });
    }
  }
}
