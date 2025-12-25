import { createScene, createCamera, createRenderer, createControls, addLights } from './scaffold.js';
import { STATE, CONSTANTS, EVENTS } from './config.js';

// Landscapes
import { Ackley } from './landscapes/ackley.js';
import { Rosenbrock } from './landscapes/rosenbrock.js';
import { Rastrigin } from './landscapes/rastrigin.js';
import { Sphere } from './landscapes/sphere.js';
import { Schwefel } from './landscapes/schwefel.js';

// Algorithms
import { CuckooSearch } from './algorithms/cuckoo.js';
import { PSO } from './algorithms/pso.js';
import { GeneticAlgorithm } from './algorithms/ga.js';
import { SimulatedAnnealing } from './algorithms/sa.js';
import { RandomSearch } from './algorithms/random.js';

// Managers
import { TerrainManager } from './managers/TerrainManager.js';
import { PopulationManager } from './managers/PopulationManager.js';
import { StatsManager } from './managers/StatsManager.js';
import { HeatmapManager } from './managers/HeatmapManager.js';

const LANDSCAPES = {
  ackley: new Ackley(),
  rosenbrock: new Rosenbrock(),
  rastrigin: new Rastrigin(),
  sphere: new Sphere(),
  schwefel: new Schwefel()
};

const ALGORITHMS = {
  cuckoo: new CuckooSearch(),
  pso: new PSO(),
  ga: new GeneticAlgorithm(),
  sa: new SimulatedAnnealing(),
  random: new RandomSearch()
};

// --- INIT ---
const scene = createScene();
const camera = createCamera();
const renderer = createRenderer('canvas-container');
const controls = createControls(camera, renderer.domElement);
addLights(scene);

const terrainMgr = new TerrainManager(scene);
const popMgr = new PopulationManager(scene);
const statsMgr = new StatsManager();
const heatmapMgr = new HeatmapManager(scene);

// App State
let activeLandscape = LANDSCAPES.ackley;
let activeAlgorithm = ALGORITHMS.cuckoo;

function switchLandscape(id) {
  if (!LANDSCAPES[id]) return;
  activeLandscape = LANDSCAPES[id];
  STATE.currentLandscape = id;
  terrainMgr.setLandscape(activeLandscape);
  heatmapMgr.reset();
  heatmapMgr.setEnabled(document.getElementById('chk-heatmap').checked);
  if (heatmapMgr.enabled) terrainMgr.setHeatmap(heatmapMgr.getTexture());

  // Update Analogy
  document.getElementById('analogy-text').textContent = activeLandscape.analogy;

  reset();
}

function switchAlgorithm(id) {
  if (!ALGORITHMS[id]) return;
  activeAlgorithm = ALGORITHMS[id];
  STATE.currentAlgorithm = id;
  reset();
}

function updateControls() {
  const container = document.getElementById('dynamic-controls');
  container.innerHTML = '';

  // Algorithm Controls
  const algoDiv = document.createElement('div');
  algoDiv.className = 'control-group';
  algoDiv.innerHTML = `<label style="color:#00f260; font-weight:bold;">${activeAlgorithm.id.toUpperCase()} Params</label>` + activeAlgorithm.getControlsHTML();
  container.appendChild(algoDiv);

  // Landscape Controls
  const landDiv = document.createElement('div');
  landDiv.className = 'control-group';
  landDiv.innerHTML = `<label style="color:#4facfe; font-weight:bold;">${activeLandscape.id.toUpperCase()} Params</label>` + activeLandscape.getControlsHTML();
  container.appendChild(landDiv);

  // Bind events
  activeAlgorithm.updateParams(algoDiv);
  activeLandscape.updateParams(landDiv);
}

function reset(keepPrevious = false) {
  STATE.genCount = 0;
  activeAlgorithm.init(activeLandscape);
  popMgr.init(activeAlgorithm.particles);

  statsMgr.reset(keepPrevious);
  heatmapMgr.reset();

  updateControls();
}

// --- DOM HANDLERS ---
document.getElementById('landscape-select').addEventListener('change', e => switchLandscape(e.target.value));
document.getElementById('algorithm-select').addEventListener('change', e => switchAlgorithm(e.target.value));

document.getElementById('btn-reset').addEventListener('click', () => reset(false));
document.getElementById('btn-compare').addEventListener('click', () => {
  // Show a small notification or just reset with history
  reset(true);
});

document.getElementById('btn-toggle').addEventListener('click', e => {
  STATE.isRunning = !STATE.isRunning;
  e.target.innerText = STATE.isRunning ? "Pause" : "Play";
  e.target.classList.toggle('active');
  controls.autoRotate = STATE.isRunning;
});
document.getElementById('btn-export').addEventListener('click', () => statsMgr.exportCSV());

document.getElementById('chk-heatmap').addEventListener('change', e => {
  heatmapMgr.setEnabled(e.target.checked, activeLandscape);
  terrainMgr.setHeatmap(heatmapMgr.getTexture());
});

// Global Params
document.getElementById('inp-popsize').addEventListener('input', e => {
  STATE.popSize = parseInt(e.target.value);
  document.getElementById('val-popsize').innerText = STATE.popSize;
  reset();
});

document.getElementById('inp-speed').addEventListener('input', e => {
  STATE.speed = parseInt(e.target.value);
  document.getElementById('val-speed').innerText = STATE.speed;
});

// Helper for dynamic param events (bubbled from modules)
document.addEventListener(EVENTS.UPDATE_PARAMS, () => {
  terrainMgr.rebuild();
  heatmapMgr.buildMesh(activeLandscape);
  reset();
});

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- LOOP ---
// Initial build
switchLandscape('ackley'); // also triggers reset

let lastTime = 0;
function animate(time) {
  requestAnimationFrame(animate);

  const speedLimit = 1000 / STATE.speed;
  if (STATE.isRunning && time - lastTime > speedLimit) {
    activeAlgorithm.step(activeLandscape);
    popMgr.update(activeAlgorithm.particles, activeLandscape, activeAlgorithm.best);
    heatmapMgr.update(activeAlgorithm.particles, activeLandscape);

    // Ensure terrain manager is using the heatmap texture if enabled
    if (heatmapMgr.enabled) {
      terrainMgr.setHeatmap(heatmapMgr.getTexture());
    }

    // Update stats
    STATE.genCount++;
    // document.getElementById('gen-count').innerText = STATE.genCount; // Removed from HTML? Check later.
    // Actually keep getting stats update
    statsMgr.update(STATE.genCount, activeAlgorithm.particles, activeAlgorithm.best.val);

    lastTime = time;
  }

  controls.update();
  renderer.render(scene, camera);
}
animate(0);
