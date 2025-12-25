import {
  createScene,
  createCamera,
  createRenderer,
  createControls,
  addLights,
  updateEnvironment,
} from './scaffold.js';
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
  schwefel: new Schwefel(),
};

const ALGORITHMS = {
  cuckoo: new CuckooSearch(),
  pso: new PSO(),
  ga: new GeneticAlgorithm(),
  sa: new SimulatedAnnealing(),
  random: new RandomSearch(),
};

// --- INIT ---
const canvasContainer = document.getElementById('canvas-container');
const scene = createScene();
const camera = createCamera(canvasContainer);
const renderer = createRenderer(canvasContainer);
const controls = createControls(camera, renderer.domElement);
addLights(scene);

const terrainMgr = new TerrainManager(scene);
const popMgr = new PopulationManager(scene);
const statsMgr = new StatsManager();
const heatmapMgr = new HeatmapManager(scene);

// App State
// App State
STATE.keepHistory = false; // Track comparison mode
let activeLandscape = LANDSCAPES.ackley;
let activeAlgorithm = ALGORITHMS.cuckoo;

function switchLandscape(id) {
  if (!LANDSCAPES[id]) return;
  activeLandscape = LANDSCAPES[id];
  STATE.currentLandscape = id;
  terrainMgr.setLandscape(activeLandscape);
  heatmapMgr.reset();
  heatmapMgr.setEnabled(
    document.getElementById('chk-heatmap').checked,
    activeLandscape,
  );
  if (heatmapMgr.enabled) {
    terrainMgr.setHeatmap(heatmapMgr.getTexture());
  } else {
    terrainMgr.setHeatmap(null);
  }

  // Adaptive Camera & Fog
  updateEnvironment(camera, controls, scene, activeLandscape);

  // Update Analogy
  document.getElementById('analogy-text').textContent = activeLandscape.analogy;

  // Scale Particles/Assets
  popMgr.scaleAssets(activeLandscape);

  // Mobile FOV adjustment (often needs wider view in split screen)
  if (isMobileDevice()) {
    camera.fov = 75;
    camera.updateProjectionMatrix();
  } else {
    camera.fov = 60;
    camera.updateProjectionMatrix();
  }

  updateControls();
  reset(STATE.keepHistory);
}

function switchAlgorithm(id) {
  if (!ALGORITHMS[id]) return;
  activeAlgorithm = ALGORITHMS[id];
  STATE.currentAlgorithm = id;
  updateControls();
  reset(STATE.keepHistory);
}

function updateControls() {
  const container = document.getElementById('dynamic-controls');
  container.innerHTML = '';

  // Algorithm Controls
  const algoDiv = document.createElement('div');
  algoDiv.className = 'control-group';
  algoDiv.innerHTML =
    `<label style="color:#00f260; font-weight:bold;">${activeAlgorithm.id.toUpperCase()} Params</label>` +
    activeAlgorithm.getControlsHTML();
  container.appendChild(algoDiv);

  // Landscape Controls
  const landDiv = document.createElement('div');
  landDiv.className = 'control-group';
  landDiv.innerHTML =
    `<label style="color:#4facfe; font-weight:bold;">${activeLandscape.id.toUpperCase()} Params</label>` +
    activeLandscape.getControlsHTML();
  container.appendChild(landDiv);

  // Bind events
  activeAlgorithm.updateParams(algoDiv);
  activeLandscape.updateParams(landDiv);
}

function reset(keepPrevious = false) {
  STATE.genCount = 0;
  activeAlgorithm.init(activeLandscape);
  popMgr.init(activeAlgorithm.particles);

  // Capture metadata for the run
  const meta = {
    algorithm: STATE.currentAlgorithm,
    landscape: STATE.currentLandscape,
    popSize: STATE.popSize,
    epsilon: STATE.epsilon,
  };
  statsMgr.reset(keepPrevious, meta);
  heatmapMgr.reset();
}

// --- MOBILE OPTIMIZATIONS ---
function isMobileDevice() {
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    ) || window.innerWidth <= 768
  );
}

// Adjust population size for mobile performance
if (isMobileDevice() && STATE.popSize > 50) {
  STATE.popSize = 30; // Reduce default for mobile
  document.getElementById('inp-popsize').value = 30;
  document.getElementById('val-popsize').innerText = 30;
}

// Show mobile instruction banner
if (isMobileDevice()) {
  document.getElementById('mobile-instruction').style.display = 'block';
}

// --- DOM HANDLERS ---
document
  .getElementById('landscape-select')
  .addEventListener('change', (e) => switchLandscape(e.target.value));
document
  .getElementById('algorithm-select')
  .addEventListener('change', (e) => switchAlgorithm(e.target.value));

document.getElementById('btn-reset').addEventListener('click', () => {
  STATE.keepHistory = false;
  document.getElementById('btn-compare').innerText =
    '📊 Compare Current Algorithm';
  document.getElementById('btn-compare').style.background = ''; // Reset style
  reset(false);
});

document.getElementById('btn-compare').addEventListener('click', (e) => {
  STATE.keepHistory = true;
  e.target.innerText = 'Comparing... (Reset to Exit)';
  e.target.style.background = '#00f260';
  e.target.style.color = '#000';
  // Do NOT called reset(true) here.
  // We just enable the mode. The actual reset/save happens when
  // the user changes a parameter or clicks Reset manually.
});

document.getElementById('btn-toggle').addEventListener('click', (e) => {
  STATE.isRunning = !STATE.isRunning;
  e.target.innerText = STATE.isRunning ? 'Pause' : 'Play';
  e.target.classList.toggle('active');
});

document.getElementById('btn-step').addEventListener('click', () => {
  // Execute one step manually
  activeAlgorithm.step(activeLandscape);
  popMgr.update(
    activeAlgorithm.particles,
    activeLandscape,
    activeAlgorithm.best,
  );
  heatmapMgr.update(activeAlgorithm.particles, activeLandscape);

  // Update stats
  STATE.genCount++;
  statsMgr.update(
    STATE.genCount,
    activeAlgorithm.particles,
    activeAlgorithm.best.val,
  );
});
document
  .getElementById('btn-export')
  .addEventListener('click', () => statsMgr.exportCSV());

document.getElementById('chk-heatmap').addEventListener('change', (e) => {
  const enabled = e.target.checked;
  heatmapMgr.setEnabled(enabled, activeLandscape);
  if (enabled) {
    terrainMgr.setHeatmap(heatmapMgr.getTexture());
  } else {
    terrainMgr.setHeatmap(null);
  }
});

document.getElementById('chk-autorotate').addEventListener('change', (e) => {
  controls.autoRotate = e.target.checked;
});

document.getElementById('btn-fullscreen').addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch((err) => {
      console.error(`Error attempting to enable fullscreen: ${err.message}`);
    });
  } else {
    document.exitFullscreen();
  }
});

// Update fullscreen icon
document.addEventListener('fullscreenchange', () => {
  const btn = document.getElementById('btn-fullscreen');
  if (document.fullscreenElement) {
    btn.textContent = '❐'; // Exit fullscreen icon
  } else {
    btn.textContent = '⛶'; // Enter fullscreen icon
  }
});

// Global Params
const popSlider = document.getElementById('inp-popsize');
popSlider.addEventListener('input', (e) => {
  STATE.popSize = parseInt(e.target.value);
  document.getElementById('val-popsize').innerText = STATE.popSize;
});
popSlider.addEventListener('change', () => {
  reset(STATE.keepHistory);
});

document.getElementById('inp-speed').addEventListener('input', (e) => {
  STATE.speed = parseInt(e.target.value);
  document.getElementById('val-speed').innerText = STATE.speed;
});

document.getElementById('inp-epsilon').addEventListener('input', (e) => {
  STATE.epsilon = parseFloat(e.target.value);
  document.getElementById('val-epsilon').innerText = STATE.epsilon.toFixed(3);
  // No need to reset(), stats update on next frame
});

// Helper for dynamic param events (bubbled from modules)
document.addEventListener(EVENTS.UPDATE_PARAMS, () => {
  terrainMgr.rebuild();
  heatmapMgr.buildMesh(activeLandscape);
  reset(STATE.keepHistory);
});

// Resize
window.addEventListener('resize', () => {
  const width = canvasContainer.clientWidth;
  const height = canvasContainer.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
});

// --- LOOP ---
// Initial build
updateControls();
switchLandscape('ackley'); // also triggers reset

let lastTime = 0;
function animate(time) {
  requestAnimationFrame(animate);

  const speedLimit = 1000 / STATE.speed;
  if (STATE.isRunning && time - lastTime > speedLimit) {
    activeAlgorithm.step(activeLandscape);
    popMgr.update(
      activeAlgorithm.particles,
      activeLandscape,
      activeAlgorithm.best,
    );
    heatmapMgr.update(activeAlgorithm.particles, activeLandscape);

    // Update stats
    STATE.genCount++;
    // document.getElementById('gen-count').innerText = STATE.genCount; // Removed from HTML? Check later.
    // Actually keep getting stats update
    statsMgr.update(
      STATE.genCount,
      activeAlgorithm.particles,
      activeAlgorithm.best.val,
    );

    lastTime = time;
  }

  controls.update();
  renderer.render(scene, camera);
}
animate(0);
