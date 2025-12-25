import { RNG } from './random.js';
export const MathUtils = {
  // Normal distribution random number using Box-Muller transform
  normalRandom: function () {
    let u = 0,
      v = 0;
    while (u === 0) u = RNG.next();
    while (v === 0) v = RNG.next();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  },

  // Gamma function approximation (Lanczos approximation)
  gamma: function (z) {
    const p = [
      0.99999999999980993, 676.5203681218851, -1259.1392167224028,
      771.32342877765313, -176.61502916214059, 12.507343278686905,
      -0.13857109526572012,
    ];
    if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * this.gamma(1 - z));
    z -= 1;
    let x = p[0];
    for (let i = 1; i < p.length; i++) x += p[i] / (z + i);
    return (
      Math.sqrt(2 * Math.PI) *
      Math.pow(z + p.length - 0.5, z + 0.5) *
      Math.exp(-(z + p.length - 0.5)) *
      x
    );
  },

  // Weighted random selection
  weightedRandom: function (weights) {
    let sum = weights.reduce((a, b) => a + b, 0);
    let rand = RNG.next() * sum;
    for (let i = 0; i < weights.length; i++) {
      rand -= weights[i];
      if (rand < 0) return i;
    }
    return weights.length - 1;
  },
};
