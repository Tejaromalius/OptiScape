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
import { RNG } from './utils/random.js';

const LANDSCAPES = {
  ackley: new Ackley(),
  rosenbrock: new Rosenbrock(),
  rastrigin: new Rastrigin(),
  sphere: new Sphere(),
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
STATE.keepHistory = false; // Track comparison mode
let activeLandscape = LANDSCAPES.ackley;
let activeAlgorithm = ALGORITHMS.cuckoo;

// --- ALGORITHM INFO MODAL ---
const algoInfoModal = document.getElementById('algo-info-modal');
const algoInfoTitle = document.getElementById('algo-info-title');
const algoInfoText = document.getElementById('algo-info-text');

function openAlgoInfo() {
  const algoName = document.querySelector(
    `#algorithm-select option[value="${STATE.currentAlgorithm}"]`,
  ).innerText;
  algoInfoTitle.innerText = algoName;
  algoInfoText.innerText = activeAlgorithm.description;
  algoInfoModal.classList.add('active');
}

function closeAlgoInfo() {
  algoInfoModal.classList.remove('active');
}

document
  .getElementById('btn-algo-info')
  .addEventListener('click', openAlgoInfo);
document
  .getElementById('algo-info-close')
  .addEventListener('click', closeAlgoInfo);

// Close on backdrop click
algoInfoModal.addEventListener('click', (e) => {
  if (e.target === algoInfoModal) closeAlgoInfo();
});

async function switchLandscape(id) {
  if (!LANDSCAPES[id]) return;

  // Warning when changing landscape in comparison mode
  if (STATE.keepHistory) {
    const confirmed = await showConfirmationDialog(
      '⚠️ Clear Comparison Data?',
      'Changing the landscape type or terrain parameters will clear all previous simulation runs as comparison data is no longer valid.',
    );
    if (!confirmed) {
      // Revert the select dropdown
      document.getElementById('landscape-select').value =
        STATE.currentLandscape;
      return;
    }
    // If they continue, we MUST clear history
    STATE.keepHistory = false;
    const compBtn = document.getElementById('btn-compare');
    if (compBtn) {
      compBtn.innerText = '📊 Compare Current Algorithm';
      compBtn.style.background = '';
      compBtn.style.color = '';
    }
  }

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

  // Adjust population limits based on algorithm type
  const popSlider = document.getElementById('inp-popsize');
  if (id === 'sa' || id === 'random') {
    popSlider.min = '1';
  } else {
    // For population-based algos (PSO, GA, Cuckoo), 1 particle is nonsense/broken
    popSlider.min = '10';
    if (STATE.popSize < 10) {
      STATE.popSize = 10;
      popSlider.value = 10;
      document.getElementById('val-popsize').innerText = 10;
    }
  }

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
  RNG.setSeed(STATE.seed);
  RNG.reset();
  activeAlgorithm.init(activeLandscape);
  popMgr.init(activeAlgorithm.particles);

  // Capture metadata for the run
  const meta = {
    algorithm: STATE.currentAlgorithm,
    landscape: STATE.currentLandscape,
    popSize: STATE.popSize,
    epsilon: STATE.epsilon,
    seed: STATE.seed,
    // Algorithm-specific parameters
    algoParams: JSON.parse(
      JSON.stringify(STATE.algoParams[STATE.currentAlgorithm]),
    ),
    // Landscape-specific parameters
    landParams: JSON.parse(
      JSON.stringify(STATE.landscapeParams[STATE.currentLandscape]),
    ),
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

  // Snapshot current parameters when entering comparison mode
  paramSnapshot = JSON.parse(
    JSON.stringify(STATE.landscapeParams[STATE.currentLandscape]),
  );

  // Do NOT called reset(true) here.
  // We just enable the mode. The actual reset/save happens when
  // the user changes a parameter or clicks Reset manually.
});

document.getElementById('btn-toggle').addEventListener('click', (e) => {
  // Check if generation limit has been reached
  if (
    STATE.maxGenerations > 0 &&
    STATE.genCount >= STATE.maxGenerations &&
    !STATE.isRunning
  ) {
    // Show warning message
    showGenerationLimitWarning();
    return;
  }

  STATE.isRunning = !STATE.isRunning;
  e.target.innerText = STATE.isRunning ? 'Pause' : 'Play';
  e.target.classList.toggle('active');
});

// Helper function to show generation limit warning
function showGenerationLimitWarning() {
  const warning = document.createElement('div');
  warning.id = 'gen-limit-warning';
  warning.innerHTML = `
    <strong>⚠️ Generation Limit Reached</strong><br>
    Maximum of ${STATE.maxGenerations} generations completed.<br>
    Reset the simulation or increase the limit to continue.
  `;
  warning.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(135deg, rgba(255, 50, 50, 0.95), rgba(200, 0, 0, 0.95));
    color: white;
    padding: 20px 30px;
    border-radius: 12px;
    border: 2px solid rgba(255, 100, 100, 0.8);
    box-shadow: 0 8px 32px rgba(255, 0, 0, 0.4);
    z-index: 10001;
    text-align: center;
    font-size: 0.95rem;
    line-height: 1.6;
    animation: shake 0.5s ease;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  `;

  document.body.appendChild(warning);

  // Auto-remove after 3 seconds
  setTimeout(() => {
    warning.style.opacity = '0';
    warning.style.transform = 'translate(-50%, -50%) scale(0.9)';
    warning.style.transition = 'all 0.3s ease';
    setTimeout(() => warning.remove(), 300);
  }, 3000);
}

// Helper function to show custom confirmation dialog
function showConfirmationDialog(title, message) {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(5px);
      -webkit-backdrop-filter: blur(5px);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    const dialog = document.createElement('div');
    dialog.style.cssText = `
      background: linear-gradient(135deg, rgba(255, 150, 50, 0.95), rgba(200, 80, 0, 0.95));
      color: white;
      padding: 25px 35px;
      border-radius: 12px;
      border: 2px solid rgba(255, 150, 100, 0.8);
      box-shadow: 0 8px 32px rgba(255, 100, 0, 0.4);
      text-align: center;
      max-width: 450px;
      animation: shakeDialog 0.5s ease;
    `;

    dialog.innerHTML = `
      <div style="margin-bottom: 20px;">
        <strong style="font-size: 1.1rem; display: block; margin-bottom: 12px;">${title}</strong>
        <p style="line-height: 1.6; margin: 0;">${message}</p>
      </div>
      <div style="display: flex; gap: 15px; justify-content: center;">
        <button id="confirm-yes" style="
          padding: 10px 25px;
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.5);
          color: white;
          border-radius: 6px;
          cursor: pointer;
          font-weight: bold;
          transition: all 0.2s;
        ">Continue</button>
        <button id="confirm-no" style="
          padding: 10px 25px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
          border-radius: 6px;
          cursor: pointer;
          font-weight: bold;
          transition: all 0.2s;
        ">Cancel</button>
      </div>
    `;

    backdrop.appendChild(dialog);
    document.body.appendChild(backdrop);

    const cleanup = () => {
      backdrop.style.opacity = '0';
      backdrop.style.transition = 'opacity 0.3s ease';
      setTimeout(() => backdrop.remove(), 300);
    };

    dialog.querySelector('#confirm-yes').addEventListener('click', () => {
      cleanup();
      resolve(true);
    });

    dialog.querySelector('#confirm-no').addEventListener('click', () => {
      cleanup();
      resolve(false);
    });

    // Hover effects
    const buttons = dialog.querySelectorAll('button');
    buttons.forEach((btn) => {
      btn.addEventListener('mouseenter', () => {
        btn.style.transform = 'translateY(-2px)';
        btn.style.boxShadow = '0 4px 12px rgba(255, 255, 255, 0.3)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'translateY(0)';
        btn.style.boxShadow = 'none';
      });
    });
  });
}

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
    activeLandscape,
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

// Helper: Stop, reset, and update UI (wait for Play)
function stopAndReset() {
  STATE.isRunning = false;
  const btn = document.getElementById('btn-toggle');
  if (btn) {
    btn.innerText = 'Play';
    btn.classList.remove('active');
  }
  reset(STATE.keepHistory);
}

// Global Params
const popSlider = document.getElementById('inp-popsize');
popSlider.addEventListener('input', (e) => {
  STATE.popSize = parseInt(e.target.value);
  document.getElementById('val-popsize').innerText = STATE.popSize;
});
popSlider.addEventListener('change', () => {
  stopAndReset();
});

document.getElementById('inp-speed').addEventListener('input', (e) => {
  STATE.speed = parseInt(e.target.value);
  document.getElementById('val-speed').innerText = STATE.speed;
});

document.getElementById('inp-epsilon').addEventListener('input', (e) => {
  STATE.epsilon = parseFloat(e.target.value);
  document.getElementById('val-epsilon').innerText = STATE.epsilon.toFixed(3);
  // Optional: if epsilon changes result in immediate success/fail, we might want to reset too?
  // Use 'change' event for that if needed, currently kept live.
});
document.getElementById('inp-epsilon').addEventListener('change', () => {
  stopAndReset();
});

document.getElementById('inp-seed').addEventListener('change', (e) => {
  STATE.seed = parseInt(e.target.value) || 0;
  stopAndReset();
});

document.getElementById('btn-rand-seed').addEventListener('click', () => {
  STATE.seed = Math.floor(Math.random() * 1000000);
  document.getElementById('inp-seed').value = STATE.seed;
  stopAndReset();
});

document.getElementById('inp-max-gen').addEventListener('change', (e) => {
  STATE.maxGenerations = parseInt(e.target.value) || 0;
  // If max gen changes, we should probably reset to reflect new constraint from start
  stopAndReset();
});

// Helper for dynamic param events (bubbled from modules)
let isProcessingParamChange = false;
let paramSnapshot = null;

document.addEventListener(EVENTS.UPDATE_PARAMS, async () => {
  // Prevent re-entry (multiple dialogs)
  if (isProcessingParamChange) return;
  isProcessingParamChange = true;

  // Warning when changing landscape params in comparison mode
  if (STATE.keepHistory) {
    // Ensure we have a snapshot (should have been created when comparison mode enabled)
    if (!paramSnapshot) {
      console.warn(
        'No param snapshot found - comparison mode may not have been properly initialized',
      );
    }

    const confirmed = await showConfirmationDialog(
      '⚠️ Clear Comparison Data?',
      'Changing terrain parameters will clear all previous simulation runs as comparison data is no longer valid.',
    );

    if (!confirmed) {
      // Restore the old parameters from snapshot (if we have one)
      if (paramSnapshot) {
        STATE.landscapeParams[STATE.currentLandscape] = JSON.parse(
          JSON.stringify(paramSnapshot),
        );
      }
      isProcessingParamChange = false;

      // Rebuild with old values
      terrainMgr.rebuild();
      heatmapMgr.buildMesh(activeLandscape);

      // Re-sync UI controls to show the reverted values
      updateControls();
      return;
    }

    // User confirmed - update snapshot to new confirmed state and exit comparison mode
    paramSnapshot = JSON.parse(
      JSON.stringify(STATE.landscapeParams[STATE.currentLandscape]),
    );
    STATE.keepHistory = false;
    const compBtn = document.getElementById('btn-compare');
    if (compBtn) {
      compBtn.innerText = '📊 Compare Current Algorithm';
      compBtn.style.background = '';
      compBtn.style.color = '';
    }
  }

  terrainMgr.rebuild();
  heatmapMgr.buildMesh(activeLandscape);
  stopAndReset();
  isProcessingParamChange = false;
});

// Algorithm parameter changes trigger new run (stopped)
document.addEventListener(EVENTS.RESET, () => {
  stopAndReset();
});

// --- STATISTICS TOOLTIP FUNCTIONALITY ---
const tooltip = document.getElementById('stat-tooltip');
const statRows = document.querySelectorAll('.stat-clickable');
let tooltipTimeout = null;
let activeStatRow = null;

function positionTooltip(row) {
  if (!row) return;

  const rect = row.getBoundingClientRect();
  tooltip.style.left = `${rect.left + rect.width / 2}px`;
  tooltip.style.top = `${rect.top - 10}px`;
  tooltip.style.transform = 'translate(-50%, -100%)';
}

statRows.forEach((row) => {
  row.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent event from bubbling to document

    const tooltipText = row.getAttribute('data-tooltip');
    if (!tooltipText) return;

    // Clear any existing timeout
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
    }

    activeStatRow = row;
    tooltip.textContent = tooltipText;
    tooltip.classList.add('visible');

    // Position tooltip near the clicked element
    positionTooltip(row);

    // Auto-hide after 5 seconds
    tooltipTimeout = setTimeout(() => {
      tooltip.classList.remove('visible');
      activeStatRow = null;
    }, 5000);
  });
});

// Update tooltip position on scroll
const uiPanel = document.getElementById('ui-panel');
if (uiPanel) {
  uiPanel.addEventListener('scroll', () => {
    if (activeStatRow && tooltip.classList.contains('visible')) {
      positionTooltip(activeStatRow);
    }
  });
}

// Hide tooltip when clicking elsewhere
document.addEventListener('click', (e) => {
  if (
    !e.target.closest('.stat-clickable') &&
    !e.target.closest('.stat-tooltip')
  ) {
    tooltip.classList.remove('visible');
    activeStatRow = null;
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
    }
  }
});

// --- PORTRAIT FULLSCREEN BUTTON ---
const portraitFullscreenBtn = document.getElementById(
  'btn-portrait-fullscreen',
);
if (portraitFullscreenBtn) {
  portraitFullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    }
  });
}

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
document.getElementById('inp-seed').value = STATE.seed;
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

    // Check if generation limit reached
    if (STATE.maxGenerations > 0 && STATE.genCount >= STATE.maxGenerations) {
      STATE.isRunning = false;
      document.getElementById('btn-toggle').innerText = 'Play';
      document.getElementById('btn-toggle').classList.remove('active');
    }

    // document.getElementById('gen-count').innerText = STATE.genCount; // Removed from HTML? Check later.
    // Actually keep getting stats update
    statsMgr.update(
      STATE.genCount,
      activeAlgorithm.particles,
      activeAlgorithm.best.val,
      activeLandscape,
    );

    lastTime = time;
  }

  controls.update();
  renderer.render(scene, camera);
}
animate(0);
