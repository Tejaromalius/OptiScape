import { STATE } from '../config.js';

export class StatsManager {
  constructor() {
    this.ctx = document.getElementById('fitness-chart').getContext('2d');
    this.modalCtx = document
      .getElementById('modal-fitness-chart')
      .getContext('2d');
    this.modal = document.getElementById('chart-modal');

    // 1. Primary Chart (Mini preview, use same shared labels for now)
    this.chart = new Chart(this.ctx, {
      type: 'line',
      data: { labels: [], datasets: [] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            align: 'start',
            labels: {
              color: '#555',
              boxWidth: 6,
              font: { size: 7 },
              padding: 2,
            },
          },
        },
        scales: {
          x: {
            type: 'linear',
            display: true,
            grid: { display: false },
            ticks: { display: false },
          },
          y: {
            display: true,
            position: 'right',
            grid: { color: 'rgba(255,255,255,0.03)' },
            ticks: {
              color: '#444',
              font: { size: 7 },
              maxTicksLimit: 3,
            },
          },
        },
      },
    });

    // 2. Modal Chart (Large, full control)
    this.modalChart = null;

    // Listeners for Modal
    document
      .getElementById('btn-expand-chart')
      .addEventListener('click', () => {
        this.openModal();
      });

    document.getElementById('modal-close').addEventListener('click', () => {
      this.closeModal();
    });

    document.getElementById('modal-zoom-in').addEventListener('click', () => {
      // Zoom with better scaling for linear axis
      if (this.modalChart) {
        this.modalChart.zoom({ x: 1.1, y: 1.1 }); // zoom in by 10%
      }
    });

    document.getElementById('modal-zoom-out').addEventListener('click', () => {
      if (this.modalChart) {
        this.modalChart.zoom({ x: 0.9, y: 0.9 });
      }
    });

    document
      .getElementById('modal-reset-zoom')
      .addEventListener('click', () => {
        if (this.modalChart) this.modalChart.resetZoom();
      });

    this.runHistory = [];
    this.allRunsHistory = [];
    this.currentRunData = [];
    this.currentMetadata = {};
    this.runCount = 0;
    this.bestFitness = Infinity;
    this.updateInterval = 1; // High resolution: record every generation
  }

  openModal() {
    this.modal.classList.add('active');
    if (!this.modalChart) {
      this.initModalChart();
    } else {
      // Sync datasets
      this.modalChart.data.datasets = this.chart.data.datasets;
      // Linear scale doesn't strictly need labels if data is {x,y},
      // but if we used labels before, we might need to migrate logic.
      // But now we are pushing {x,y} points so labels are ignored by linear scale.
      this.modalChart.update();
    }
  }

  closeModal() {
    this.modal.classList.remove('active');
  }

  initModalChart() {
    this.modalChart = new Chart(this.modalCtx, {
      type: 'line',
      data: {
        // No labels needed for linear scale
        datasets: this.chart.data.datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        layout: {
          padding: { left: 10, right: 20, top: 20, bottom: 10 },
        },
        interaction: { mode: 'nearest', intersect: false, axis: 'x' },
        scales: {
          x: {
            type: 'linear',
            display: true,
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: {
              color: '#666',
              font: { size: 11 },
              autoSkip: true,
              maxTicksLimit: 12,
            },
            title: {
              display: true,
              text: 'Generations',
              color: '#888',
              font: { size: 12 },
            },
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#888', font: { size: 11 } },
            title: {
              display: true,
              text: 'Fitness',
              color: '#888',
              font: { size: 12 },
            },
          },
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: { color: '#aaa', font: { size: 12 } },
          },
          tooltip: {
            callbacks: {
              title: (items) => `Gen: ${items[0].parsed.x}`,
              label: (item) =>
                `${item.dataset.label}: ${item.parsed.y.toFixed(4)}`,
            },
          },
          zoom: {
            limits: {
              x: { min: 0, max: 'original', minRange: 5 },
              y: { min: 'original', max: 'original', minRange: 0.0001 },
            },
            pan: { enabled: true, mode: 'xy', threshold: 10 },
            zoom: {
              wheel: { enabled: true },
              pinch: { enabled: true },
              mode: 'xy',
            },
          },
        },
      },
    });
  }

  reset(keepPrevious, meta = {}) {
    // Save current run before resetting
    if (this.runHistory.length > 0) {
      this.allRunsHistory.push({
        runId: this.runCount,
        meta: this.currentMetadata,
        data: [...this.runHistory],
      });
    }

    this.currentMetadata = meta;

    if (!keepPrevious) {
      this.chart.data.datasets = [];
      this.runCount = 0;
      this.allRunsHistory = [];
    } else {
      // Reuse empty dataset logic...
      if (
        this.chart.data.datasets.length > 0 &&
        this.chart.data.datasets[this.chart.data.datasets.length - 1].data
          .length === 0
      ) {
        this.bestFitness = Infinity;
        this.runHistory = [];
        return;
      }
      // Fade previous styles
      if (this.chart.data.datasets.length > 0) {
        const last =
          this.chart.data.datasets[this.chart.data.datasets.length - 1];
        last.borderWidth = 1;
        last.pointRadius = 0;
      }
    }

    this.runCount++;

    const hue = (this.runCount * 137.5) % 360;
    const color = `hsla(${hue}, 80%, 50%, 1)`;
    const bg = `hsla(${hue}, 80%, 50%, 0.1)`;

    const newSet = {
      label: `Run ${this.runCount}`,
      data: [], // Stores {x, y} objects now
      borderColor: color,
      backgroundColor: bg,
      borderWidth: 2,
      tension: 0.1,
      pointRadius: 0,
      showLine: true,
    };
    this.chart.data.datasets.push(newSet);

    // No need to create labels array for linear scale

    this.currentRunData =
      this.chart.data.datasets[this.chart.data.datasets.length - 1].data;
    this.runHistory = [];
    this.bestFitness = Infinity;
    this.chart.update();
    if (this.modalChart) {
      this.modalChart.data.datasets = this.chart.data.datasets;
      this.modalChart.update();
    }
  }

  update(gen, particles, bestVal, targetStr) {
    // 1. Calculate Stats
    let sum = 0;
    let sqSum = 0;
    let successCount = 0;
    const epsilon = STATE.epsilon;
    let cx = 0,
      cz = 0;

    particles.forEach((p) => {
      sum += p.val;
      sqSum += p.val * p.val;
      if (Math.abs(p.val) < epsilon) successCount++;
      cx += p.x;
      cz += p.z;
    });

    const N = particles.length;
    const avg = sum / N;
    const variance = Math.max(0, sqSum / N - avg * avg);
    const stdDev = Math.sqrt(variance);
    const successRate = (successCount / N) * 100;
    cx /= N;
    cz /= N;
    let distSum = 0;
    particles.forEach((p) => {
      distSum += Math.sqrt((p.x - cx) ** 2 + (p.z - cz) ** 2);
    });
    const dispersion = distSum / N;

    // 2. DOM Updates
    const domAvg = document.getElementById('stat-avg');
    const domBest = document.getElementById('stat-best');
    const domStd = document.getElementById('stat-std');
    const domSucc = document.getElementById('stat-succ');
    const domDiv = document.getElementById('stat-div');

    if (bestVal < this.bestFitness) {
      this.bestFitness = bestVal;
    }

    if (domAvg) domAvg.innerText = avg.toFixed(4);
    if (domBest) domBest.innerText = this.bestFitness.toFixed(4);
    if (domStd) domStd.innerText = stdDev.toFixed(4);
    if (domSucc) domSucc.innerText = successRate.toFixed(1) + '%';
    if (domDiv) domDiv.innerText = dispersion.toFixed(3);

    // 3. Store History
    this.runHistory.push({
      gen,
      best: bestVal,
      avg,
      stdDev,
      success: successRate,
    });

    // 4. Chart Update
    if (gen % this.updateInterval !== 0) return;

    // Push Point Object {x, y} for Linear Scale
    this.currentRunData.push({ x: gen, y: bestVal });

    // Performance Cap
    if (this.currentRunData.length > 5000) {
      // Shift data to keep memory usage low
      // For multi-dataset history, we should only shift current if we want to effectively "scroll"
      // But simply, let's just shift current to prevent crash.
      // Or better: decimate? No, shift is safest to keep "rolling window" appearance.
      this.currentRunData.shift();
    }

    this.chart.update('none');
    if (this.modalChart && this.modal.classList.contains('active')) {
      this.modalChart.update('none');
    }
  }

  exportCSV() {
    const allData = [...this.allRunsHistory];
    if (this.runHistory.length > 0) {
      allData.push({
        runId: this.runCount,
        meta: this.currentMetadata,
        data: this.runHistory,
      });
    }

    if (allData.length === 0) return;

    let csv =
      'RunID,Algorithm,Landscape,PopSize,Epsilon,Seed,AlgoParams,Generation,BestFitness,AvgFitness,StdDev,SuccessRate\n';

    allData.forEach((run) => {
      const m = run.meta || {};
      const algo = m.algorithm || 'unknown';
      const land = m.landscape || 'unknown';
      const pop = m.popSize || 0;
      const eps = m.epsilon || 0;
      const seed = m.seed || 0;
      const algoParams = m.algoParams
        ? Object.entries(m.algoParams)
            .map(([key, val]) => `${key}=${val}`)
            .join(';')
        : 'none';

      run.data.forEach((r) => {
        csv += `${run.runId},${algo},${land},${pop},${eps},${seed},"${algoParams}",${r.gen},${r.best},${r.avg},${r.stdDev},${r.success}\n`;
      });
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `simulation_multi_run_V${Date.now()}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
}
