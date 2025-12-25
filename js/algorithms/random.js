import { Algorithm } from './base.js';
import { STATE, EVENTS } from '../config.js';
import { RNG } from '../utils/random.js';

export class RandomSearch extends Algorithm {
  constructor() {
    super('random');
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
    const b = landscape.bounds;
    // Pure random search: just jumpt to new random spot
    for (let i = 0; i < this.particles.length; i++) {
      const x = (RNG.next() * 2 - 1) * b;
      const z = (RNG.next() * 2 - 1) * b;
      const val = landscape.f(x, z);

      this.particles[i].x = x;
      this.particles[i].z = z;
      this.particles[i].val = val;

      if (val < this.best.val) this.best = { x, z, val };
    }
  }

  getControlsHTML() {
    return `<div style="font-size:0.8rem;">Just pure luck.</div>`;
  }
  updateParams(dom) {}
}
