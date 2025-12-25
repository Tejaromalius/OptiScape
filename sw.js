const CACHE_NAME = 'cuckoo-search-v1';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/main.js',
  './js/config.js',
  './js/scaffold.js',
  './js/algorithms/base.js',
  './js/algorithms/cuckoo.js',
  './js/algorithms/ga.js',
  './js/algorithms/pso.js',
  './js/algorithms/random.js',
  './js/algorithms/sa.js',
  './js/landscapes/base.js',
  './js/landscapes/ackley.js',
  './js/landscapes/rastrigin.js',
  './js/landscapes/rosenbrock.js',
  './js/landscapes/sphere.js',
  './js/managers/HeatmapManager.js',
  './js/managers/PopulationManager.js',
  './js/managers/StatsManager.js',
  './js/managers/TerrainManager.js',
  './js/utils/math.js',
  './js/utils/random.js',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/hammerjs@2.0.8',
  'https://cdn.jsdelivr.net/npm/chartjs-plugin-zoom',
  'https://unpkg.com/three@0.160.0/build/three.module.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
