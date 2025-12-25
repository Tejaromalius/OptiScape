export class Algorithm {
  constructor(id) {
    this.id = id;
    this.particles = []; // Array of {x, z, val, ...}
    this.best = { x: 0, z: 0, val: Infinity };
  }

  init(landscape) {}

  step(landscape) {}

  get description() {
    return '';
  }

  getControlsHTML() {
    return '';
  }

  updateParams(dom) {}
}
