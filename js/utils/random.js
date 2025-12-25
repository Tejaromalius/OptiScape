export class SeededRandom {
  constructor(seed = 12345) {
    this.initialSeed = seed;
    this.state = seed;
  }

  // Mulberry32: A fast, seeded RNG for JavaScript
  next() {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Helper for integer ranges [min, max)
  nextInt(min, max) {
    return Math.floor(this.next() * (max - min) + min);
  }

  setSeed(seed) {
    this.initialSeed = seed;
    this.state = seed;
  }

  reset() {
    this.state = this.initialSeed;
  }
}

export const RNG = new SeededRandom();
