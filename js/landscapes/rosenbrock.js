import { Landscape } from './base.js';
import { STATE, EVENTS } from '../config.js';

export class Rosenbrock extends Landscape {
  constructor() {
    super('rosenbrock');
  }

  f(x, z) {
    const p = STATE.landscapeParams.rosenbrock;
    return Math.pow(p.a - x, 2) + p.b * Math.pow(z - Math.pow(x, 2), 2);
  }

  get bounds() {
    return 2.0;
  }
  get hScale() {
    return 0.01;
  } // Dampened because values explode
  get visOffset() {
    return 0.5;
  }
  get colors() {
    return [0x00ff88, 0xffcc00];
  } // Bright Mint to Golden Yellow
  get analogy() {
    return 'A long, curved valley. The walls are steep. Easy to find the valley floor, but hard to find the minimum at (a, a²).';
  }
  get target() {
    const p = STATE.landscapeParams.rosenbrock;
    return `(${p.a.toFixed(1)}, ${(p.a ** 2).toFixed(1)})`;
  }

  getControlsHTML() {
    const p = STATE.landscapeParams.rosenbrock;
    return `
            <div class="sub-control">
                <label>Min Position (a): <span id="val-rosen-a">${p.a}</span></label>
                <input type="range" id="inp-rosen-a" min="-1.5" max="1.5" step="0.1" value="${p.a}">
            </div>
            <div class="sub-control">
                <label>Steepness (b): <span id="val-rosen-b">${p.b}</span></label>
                <input type="range" id="inp-rosen-b" min="1" max="200" step="10" value="${p.b}">
            </div>
        `;
  }

  updateParams(dom) {
    const p = STATE.landscapeParams.rosenbrock;
    const domA = dom.querySelector('#inp-rosen-a');
    const domB = dom.querySelector('#inp-rosen-b');

    if (domA) {
      domA.addEventListener('input', (e) => {
        p.a = parseFloat(e.target.value);
        dom.querySelector('#val-rosen-a').innerText = p.a.toFixed(1);
        document.dispatchEvent(new Event(EVENTS.UPDATE_PARAMS));
      });
    }
    if (domB) {
      domB.addEventListener('input', (e) => {
        p.b = parseInt(e.target.value);
        dom.querySelector('#val-rosen-b').innerText = p.b;
        document.dispatchEvent(new Event(EVENTS.UPDATE_PARAMS));
      });
    }
  }
}
