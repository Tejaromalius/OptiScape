export const CONSTANTS = {
  beta: 1.5,
  levyScale: 0.2,
};

export const STATE = {
  popSize: 50,
  speed: 30, // frames per second cap (approx)
  isRunning: false,
  genCount: 0,
  epsilon: 0.1, // Success threshold
  currentAlgorithm: 'cuckoo',
  currentLandscape: 'ackley',
  seed: 12345,

  // Dynamic params for landscapes
  landscapeParams: {
    ackley: { a: 20, b: 0.2, c: 2 * Math.PI },
    rosenbrock: { a: 1.0, b: 100 },
    rastrigin: { A: 10 },
    sphere: {},
  },

  // Dynamic params for algorithms
  algoParams: {
    cuckoo: { pa: 0.25, levyScale: 0.2 },
    pso: { w: 0.7, c1: 1.5, c2: 1.5 }, // Inertia, cognitive, social
    ga: { mutationRate: 0.1, crossoverRate: 0.8 },
    sa: { temp: 1000, coolingRate: 0.99 },
    random: {},
  },
};

export const EVENTS = {
  RESET: 'reset',
  UPDATE_PARAMS: 'update_params',
};
