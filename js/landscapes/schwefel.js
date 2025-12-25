import { Landscape } from './base.js';
import { STATE, EVENTS } from '../config.js';

export class Schwefel extends Landscape {
  constructor() {
    super('schwefel');
  }

  f(x, z) {
    // f(x) = 418.9829*n - sum(x_i sin(sqrt(|x_i|)))
    // We use a scaled version to center it better visually or keep standard bounds
    const scale = STATE.landscapeParams.schwefel.scale;
    const term1 = x * Math.sin(Math.sqrt(Math.abs(x)));
    const term2 = z * Math.sin(Math.sqrt(Math.abs(z)));
    // Inverting so minimum is at bottom for consistency in our visualization (usually we look for min)
    // Schwefel min is at 420.9687
    return scale * 2 - (term1 + term2);
  }

  get bounds() {
    return 500;
  }
  get hScale() {
    return 0.08;
  }
  get visOffset() {
    return 10;
  }
  get colors() {
    return [0xff0000, 0xffcccc];
  } // Crimson to Light Red
  get analogy() {
    return 'A deceptive landscape. The global minimum is far at the edge, deep in a valley, while other deep valleys exist far away.';
  }
  get target() {
    return '(420.97, 420.97)';
  }

  getControlsHTML() {
    return `<div style="font-size: 0.8rem; color: #aaa; font-style: italic;">Standard Schwefel function. Bounds +/- 500.</div>`;
  }

  updateParams(dom) { }
}
