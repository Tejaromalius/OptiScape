import { Algorithm } from './base.js';
import { STATE, EVENTS } from '../config.js';
import { RNG } from '../utils/random.js';

export class SimulatedAnnealing extends Algorithm {
  constructor() {
    super('sa');
    this.currentTemp = 1000;
  }

  init(landscape) {
    this.particles = [];
    this.best = { val: Infinity };
    this.currentTemp = STATE.algoParams.sa.temp;
    const b = landscape.bounds;

    // SA is typically single-point, but for visualization we can run multiple parallel SA instances
    // or just one active point and a cloud of history. Let's run PopSize independent Parallel SA chains.

    for (let i = 0; i < STATE.popSize; i++) {
      const x = (RNG.next() * 2 - 1) * b;
      const z = (RNG.next() * 2 - 1) * b;
      const val = landscape.f(x, z);
      this.particles.push({ x, z, val, id: i });
      if (val < this.best.val) this.best = { x, z, val };
    }
  }

  step(landscape) {
    const p = STATE.algoParams.sa;
    const b = landscape.bounds;

    for (let i = 0; i < this.particles.length; i++) {
      const curr = this.particles[i];

      // Neighbor generation
      const stepSize = b * 0.1 * (this.currentTemp / p.temp); // Dynamic step size based on temp
      const nx = curr.x + (RNG.next() * 2 - 1) * stepSize;
      const nz = curr.z + (RNG.next() * 2 - 1) * stepSize;

      // Clamp (optional in pure SA but needed for constrained)
      const cx = Math.max(-b, Math.min(b, nx));
      const cz = Math.max(-b, Math.min(b, nz));
      const nVal = landscape.f(cx, cz);

      // Acceptance
      const delta = nVal - curr.val;
      if (delta < 0 || RNG.next() < Math.exp(-delta / this.currentTemp)) {
        curr.x = cx;
        curr.z = cz;
        curr.val = nVal;

        if (nVal < this.best.val) this.best = { x: cx, z: cz, val: nVal };
      }
    }

    // Cool down
    this.currentTemp *= p.coolingRate;
    if (this.currentTemp < 0.001) this.currentTemp = 0.001; // Floor
  }

  get description() {
    return 'Mirrors the physical process of heating a material and then slowly lowering the temperature to decrease defects. By allowing occasional "worse" moves when the temperature is high, it can escape local minima, gradually narrowing its focus as it cools down.';
  }

  getControlsHTML() {
    const p = STATE.algoParams.sa;
    return `
            <div class="sub-control">
                <label>Init Temp: <span id="val-sa-temp">${p.temp}</span></label>
                <input type="range" id="inp-sa-temp" min="100" max="5000" step="100" value="${p.temp}">
            </div>
            <div class="sub-control">
                <label>Cooling Rate: <span id="val-sa-cool">${p.coolingRate}</span></label>
                <input type="range" id="inp-sa-cool" min="0.8" max="0.999" step="0.001" value="${p.coolingRate}">
            </div>
            <div style="font-size:0.75rem; color: #888">Current Temp: <span id="disp-curr-temp">${this.currentTemp ? this.currentTemp.toFixed(2) : '-'}</span></div>
        `;
  }

  updateParams(dom) {
    const p = STATE.algoParams.sa;
    const domTemp = dom.querySelector('#inp-sa-temp');
    const domCool = dom.querySelector('#inp-sa-cool');

    if (domTemp) {
      domTemp.addEventListener('input', (e) => {
        p.temp = parseInt(e.target.value);
        dom.querySelector('#val-sa-temp').innerText = p.temp;
        // Don't reset currentTemp because it disrupts the run, but next reset will pick it up
      });
      domTemp.addEventListener('change', () => {
        document.dispatchEvent(new Event(EVENTS.RESET));
      });
    }
    if (domCool) {
      domCool.addEventListener('input', (e) => {
        p.coolingRate = parseFloat(e.target.value);
        dom.querySelector('#val-sa-cool').innerText = p.coolingRate.toFixed(3);
      });
      domCool.addEventListener('change', () => {
        document.dispatchEvent(new Event(EVENTS.RESET));
      });
    }

    // Update display of current temp running
    const disp = dom.querySelector('#disp-curr-temp');
    if (disp) disp.innerText = this.currentTemp.toFixed(2);
  }
}
