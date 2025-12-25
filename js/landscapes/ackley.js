import { Landscape } from './base.js';
import { STATE, EVENTS } from '../config.js';

export class Ackley extends Landscape {
  constructor() {
    super('ackley');
  }

  f(x, z) {
    const p = STATE.landscapeParams.ackley;
    const term1 = -p.a * Math.exp(-p.b * Math.sqrt(0.5 * (x ** 2 + z ** 2)));
    const term2 = -Math.exp(0.5 * (Math.cos(p.c * x) + Math.cos(p.c * z)));
    return term1 + term2 + p.a + Math.E;
  }

  get bounds() {
    return 5;
  }
  get hScale() {
    return 0.8;
  }
  get visOffset() {
    return 0;
  }
  get colors() {
    return [0x00aaff, 0xff0044];
  } // Bright Blue to Neon Red
  get analogy() {
    return "Many smooth 'cups' trap solutions. Cuckoos need Lévy Flights to jump out of local cups towards the deep center.";
  }
  get target() {
    return '(0.0, 0.0)';
  }

  getControlsHTML() {
    const p = STATE.landscapeParams.ackley;
    return `
            <div class="sub-control">
                <label>Amplitude (a): <span id="val-ackley-a">${p.a}</span></label>
                <input type="range" id="inp-ackley-a" min="10" max="40" step="1" value="${p.a}">
            </div>
            <div class="sub-control">
                <label>Decay Rate (b): <span id="val-ackley-b">${p.b}</span></label>
                <input type="range" id="inp-ackley-b" min="0.1" max="0.5" step="0.05" value="${p.b}">
            </div>
            <div class="sub-control">
                <label>Frequency (c): <span id="val-ackley-c">${p.c.toFixed(2)}</span></label>
                <input type="range" id="inp-ackley-c" min="3" max="12" step="0.5" value="${p.c}">
            </div>
        `;
  }

  updateParams(dom) {
    const p = STATE.landscapeParams.ackley;
    const domA = dom.querySelector('#inp-ackley-a');
    const domB = dom.querySelector('#inp-ackley-b');
    const domC = dom.querySelector('#inp-ackley-c');

    if (domA) {
      domA.addEventListener('input', (e) => {
        p.a = parseFloat(e.target.value);
        dom.querySelector('#val-ackley-a').innerText = p.a;
        document.dispatchEvent(new Event(EVENTS.UPDATE_PARAMS));
      });
    }
    if (domB) {
      domB.addEventListener('input', (e) => {
        p.b = parseFloat(e.target.value);
        dom.querySelector('#val-ackley-b').innerText = p.b.toFixed(2);
        document.dispatchEvent(new Event(EVENTS.UPDATE_PARAMS));
      });
    }
    if (domC) {
      domC.addEventListener('input', (e) => {
        p.c = parseFloat(e.target.value);
        dom.querySelector('#val-ackley-c').innerText = p.c.toFixed(2);
        document.dispatchEvent(new Event(EVENTS.UPDATE_PARAMS));
      });
    }
  }
}
