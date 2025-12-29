import { Algorithm } from './base.js';
import { STATE, EVENTS } from '../config.js';
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
      // Parent Selection
      const p1 = this.selectParent(p.selectionType);
      const p2 = this.selectParent(p.selectionType);

      // Crossover
      let child = { x: p1.x, z: p1.z };

      if (RNG.next() < p.crossoverRate) {
        child = this.crossover(p1, p2, p.crossoverType, p.sbxEta);
      }

      // Mutation
      if (RNG.next() < p.mutationRate) {
        child = this.mutate(child, b, p.mutationType);
      }

      // Clamp to bounds
      child.x = Math.max(-b, Math.min(b, child.x));
      child.z = Math.max(-b, Math.min(b, child.z));

      newPop.push({
        x: child.x,
        z: child.z,
        val: landscape.f(child.x, child.z),
        id: newPop.length,
      });
    }

    this.particles = newPop;

    // Update Best
    this.particles.forEach((pt) => {
      if (pt.val < this.best.val) this.best = { x: pt.x, z: pt.z, val: pt.val };
    });
  }

  get description() {
    return "Based on Darwin's theory of evolution. Using operations like selection (survival of the fittest), crossover (recombination of genetic material), and mutation (random changes), it evolves a population towards the optimal solution over several generations.";
  }

  // ==================== SELECTION OPERATORS ====================

  selectParent(type) {
    switch (type) {
      case 'tournament':
        return this.tournamentSelect(3);
      case 'roulette':
        return this.rouletteSelect();
      case 'rank':
        return this.rankSelect();
      case 'random':
        return this.particles[RNG.nextInt(0, this.particles.length)];
      default:
        return this.rouletteSelect();
    }
  }

  tournamentSelect(k) {
    let best = null;
    for (let i = 0; i < k; i++) {
      const ind = this.particles[RNG.nextInt(0, this.particles.length)];
      if (best === null || ind.val < best.val) best = ind;
    }
    return best;
  }

  rouletteSelect() {
    // For minimization: invert fitness (lower is better)
    const fitnessValues = this.particles.map((p) => 1 / (1 + p.val));
    const total = fitnessValues.reduce((a, b) => a + b, 0);
    let r = RNG.next() * total;
    for (let i = 0; i < this.particles.length; i++) {
      r -= fitnessValues[i];
      if (r <= 0) return this.particles[i];
    }
    return this.particles[this.particles.length - 1];
  }

  rankSelect() {
    const sorted = [...this.particles].sort((a, b) => a.val - b.val);
    const n = sorted.length;
    // Linear ranking: rank 1 (best) gets n points, rank n gets 1 point
    const ranks = sorted.map((_, i) => n - i);
    const total = ranks.reduce((a, b) => a + b, 0);
    let r = RNG.next() * total;
    for (let i = 0; i < sorted.length; i++) {
      r -= ranks[i];
      if (r <= 0) return sorted[i];
    }
    return sorted[sorted.length - 1];
  }

  // ==================== CROSSOVER OPERATORS ====================

  crossover(p1, p2, type, eta) {
    switch (type) {
      case 'blend':
        return this.blendCrossover(p1, p2);
      case 'single':
        return this.singlePointCrossover(p1, p2);
      case 'uniform':
        return this.uniformCrossover(p1, p2);
      case 'sbx':
        return this.sbxCrossover(p1, p2, eta);
      default:
        return this.blendCrossover(p1, p2);
    }
  }

  blendCrossover(p1, p2) {
    const alpha = RNG.next();
    return {
      x: alpha * p1.x + (1 - alpha) * p2.x,
      z: alpha * p1.z + (1 - alpha) * p2.z,
    };
  }

  singlePointCrossover(p1, p2) {
    // Swap either x or z
    if (RNG.next() < 0.5) {
      return { x: p1.x, z: p2.z };
    }
    return { x: p2.x, z: p1.z };
  }

  uniformCrossover(p1, p2) {
    return {
      x: RNG.next() < 0.5 ? p1.x : p2.x,
      z: RNG.next() < 0.5 ? p1.z : p2.z,
    };
  }

  sbxCrossover(p1, p2, eta = 2) {
    // Simulated Binary Crossover
    const u = RNG.next();
    const beta =
      u < 0.5
        ? Math.pow(2 * u, 1 / (eta + 1))
        : Math.pow(1 / (2 * (1 - u)), 1 / (eta + 1));
    return {
      x: 0.5 * ((1 + beta) * p1.x + (1 - beta) * p2.x),
      z: 0.5 * ((1 + beta) * p1.z + (1 - beta) * p2.z),
    };
  }

  // ==================== MUTATION OPERATORS ====================

  mutate(child, bounds, type) {
    switch (type) {
      case 'uniform':
        return this.uniformMutate(child, bounds);
      case 'gaussian':
        return this.gaussianMutate(child, bounds);
      case 'polynomial':
        return this.polynomialMutate(child, bounds);
      case 'swap':
        return this.swapMutate(child);
      default:
        return this.uniformMutate(child, bounds);
    }
  }

  uniformMutate(child, bounds) {
    return {
      x: child.x + (RNG.next() * 2 - 1) * (bounds * 0.1),
      z: child.z + (RNG.next() * 2 - 1) * (bounds * 0.1),
    };
  }

  gaussianMutate(child, bounds) {
    const sigma = bounds * 0.1;
    return {
      x: child.x + this.gaussianRandom() * sigma,
      z: child.z + this.gaussianRandom() * sigma,
    };
  }

  polynomialMutate(child, bounds, eta = 20) {
    const mutateGene = (value) => {
      const u = RNG.next();
      const delta =
        u < 0.5
          ? Math.pow(2 * u, 1 / (eta + 1)) - 1
          : 1 - Math.pow(2 * (1 - u), 1 / (eta + 1));
      return value + delta * bounds * 0.1;
    };
    return {
      x: mutateGene(child.x),
      z: mutateGene(child.z),
    };
  }

  swapMutate(child) {
    // Swap x and z values
    return { x: child.z, z: child.x };
  }

  // Utility: Box-Muller transform for Gaussian random
  gaussianRandom() {
    let u, v, s;
    do {
      u = RNG.next() * 2 - 1;
      v = RNG.next() * 2 - 1;
      s = u * u + v * v;
    } while (s >= 1 || s === 0);
    return u * Math.sqrt((-2 * Math.log(s)) / s);
  }

  // ==================== UI CONTROLS ====================

  getControlsHTML() {
    const p = STATE.algoParams.ga;
    return `
      <div class="sub-control">
        <label>Selection Type:</label>
        <select id="inp-ga-selection">
          <option value="tournament" ${p.selectionType === 'tournament' ? 'selected' : ''}>Tournament</option>
          <option value="roulette" ${p.selectionType === 'roulette' ? 'selected' : ''}>Roulette Wheel</option>
          <option value="rank" ${p.selectionType === 'rank' ? 'selected' : ''}>Rank</option>
          <option value="random" ${p.selectionType === 'random' ? 'selected' : ''}>Random</option>
        </select>
      </div>
      <div class="sub-control">
        <label>Crossover Type:</label>
        <select id="inp-ga-crossover">
          <option value="blend" ${p.crossoverType === 'blend' ? 'selected' : ''}>Blend (BLX-α)</option>
          <option value="single" ${p.crossoverType === 'single' ? 'selected' : ''}>Single-Point</option>
          <option value="uniform" ${p.crossoverType === 'uniform' ? 'selected' : ''}>Uniform</option>
          <option value="sbx" ${p.crossoverType === 'sbx' ? 'selected' : ''}>SBX</option>
        </select>
      </div>
      <div class="sub-control">
        <label>Mutation Type:</label>
        <select id="inp-ga-mutation">
          <option value="uniform" ${p.mutationType === 'uniform' ? 'selected' : ''}>Uniform</option>
          <option value="gaussian" ${p.mutationType === 'gaussian' ? 'selected' : ''}>Gaussian</option>
          <option value="polynomial" ${p.mutationType === 'polynomial' ? 'selected' : ''}>Polynomial</option>
          <option value="swap" ${p.mutationType === 'swap' ? 'selected' : ''}>Swap</option>
        </select>
      </div>
      <div class="sub-control">
        <label>SBX η (eta): <span id="val-ga-eta">${p.sbxEta}</span></label>
        <input type="range" id="inp-ga-eta" min="1" max="20" step="1" value="${p.sbxEta}">
      </div>
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

    // Selection Type
    const domSel = dom.querySelector('#inp-ga-selection');
    if (domSel) {
      domSel.addEventListener('change', (e) => {
        p.selectionType = e.target.value;
        document.dispatchEvent(new Event(EVENTS.RESET));
      });
    }

    // Crossover Type
    const domCross = dom.querySelector('#inp-ga-crossover');
    if (domCross) {
      domCross.addEventListener('change', (e) => {
        p.crossoverType = e.target.value;
        document.dispatchEvent(new Event(EVENTS.RESET));
      });
    }

    // Mutation Type
    const domMut = dom.querySelector('#inp-ga-mutation');
    if (domMut) {
      domMut.addEventListener('change', (e) => {
        p.mutationType = e.target.value;
        document.dispatchEvent(new Event(EVENTS.RESET));
      });
    }

    // SBX Eta
    const domEta = dom.querySelector('#inp-ga-eta');
    if (domEta) {
      domEta.addEventListener('input', (e) => {
        p.sbxEta = parseInt(e.target.value);
        dom.querySelector('#val-ga-eta').innerText = p.sbxEta;
      });
      domEta.addEventListener('change', () => {
        document.dispatchEvent(new Event(EVENTS.RESET));
      });
    }

    // Mutation Rate
    const domMutRate = dom.querySelector('#inp-ga-mut');
    if (domMutRate) {
      domMutRate.addEventListener('input', (e) => {
        p.mutationRate = parseFloat(e.target.value);
        dom.querySelector('#val-ga-mut').innerText = p.mutationRate.toFixed(2);
      });
      domMutRate.addEventListener('change', () => {
        document.dispatchEvent(new Event(EVENTS.RESET));
      });
    }

    // Crossover Rate
    const domCrossRate = dom.querySelector('#inp-ga-cross');
    if (domCrossRate) {
      domCrossRate.addEventListener('input', (e) => {
        p.crossoverRate = parseFloat(e.target.value);
        dom.querySelector('#val-ga-cross').innerText =
          p.crossoverRate.toFixed(2);
      });
      domCrossRate.addEventListener('change', () => {
        document.dispatchEvent(new Event(EVENTS.RESET));
      });
    }
  }
}
