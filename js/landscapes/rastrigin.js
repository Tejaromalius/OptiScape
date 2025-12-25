import { Landscape } from './base.js';
import { STATE, EVENTS } from '../config.js';

export class Rastrigin extends Landscape {
  constructor() {
    super('rastrigin');
  }

  f(x, z) {
    const p = STATE.landscapeParams.rastrigin;
    // f(x) = An + sum(x_i^2 - A cos(2pi x_i))
    // Here n=2
    const A = p.A;
    return (
      A * 2 +
      (x ** 2 - A * Math.cos(2 * Math.PI * x)) +
      (z ** 2 - A * Math.cos(2 * Math.PI * z))
    );
  }

  get bounds() {
    return 5.12;
  }
  get hScale() {
    return 0.2;
  }
  get visOffset() {
    return 0;
  }
  get colors() {
    return [0x9d00ff, 0xffa500];
  } // Electric Purple to Orange
  get analogy() {
    return 'A field of needles. Hundreds of local minima. Extremely difficult for hill-climbers, requiring significant exploration.';
  }
  get target() {
    return '(0, 0)';
  }

  getControlsHTML() {
    const p = STATE.landscapeParams.rastrigin;
    return `
            <div class="sub-control">
                <label>Amplitude (A): <span id="val-rast-A">${p.A}</span></label>
                <input type="range" id="inp-rast-A" min="0" max="20" step="1" value="${p.A}">
            </div>
            <div style="font-size: 0.75rem; color: #888;">Controls the depth of the local minima.</div>
        `;
  }

  updateParams(dom) {
    const p = STATE.landscapeParams.rastrigin;
    const domA = dom.querySelector('#inp-rast-A');

    if (domA) {
      domA.addEventListener('input', (e) => {
        p.A = parseInt(e.target.value);
        dom.querySelector('#val-rast-A').innerText = p.A;
        document.dispatchEvent(new Event(EVENTS.UPDATE_PARAMS));
      });
    }
  }
}
