export class Landscape {
  constructor(id) {
    this.id = id;
  }

  // Returns z value for given x, y
  f(x, y) {
    return 0;
  }

  get bounds() {
    return 5;
  } // +/- bounds
  get hScale() {
    return 0.5;
  } // Visual height scaling
  get visOffset() {
    return 0;
  } // Visual Y offset
  get colors() {
    return [0x000000, 0xffffff];
  } // Low/High colors
  get analogy() {
    return '';
  }
  get target() {
    return '(0,0)';
  }

  get globalMinVal() {
    return 0;
  }

  // HTML string for controls
  getControlsHTML() {
    return '';
  }

  // Handle parameter updates from DOM
  updateParams(domElement) {}
}
