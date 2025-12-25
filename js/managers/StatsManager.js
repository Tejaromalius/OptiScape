import { STATE } from '../config.js';

export class StatsManager {
  constructor() {
    this.ctx = document.getElementById('fitness-chart').getContext('2d');

    // Multi-dataset support
    this.chart = new Chart(this.ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: {
            display: true,
            ticks: { color: '#666', maxTicksLimit: 8, font: { size: 9 } },
            title: {
              display: true,
              text: 'Generations',
              color: '#666',
              font: { size: 10 },
            },
          },
          y: {
            grid: { color: '#333' },
            ticks: { color: '#888', font: { size: 9 } },
            title: {
              display: true,
              text: 'Fitness',
              color: '#888',
              font: { size: 10 },
            },
          },
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: '#aaa',
              boxWidth: 8,
              font: { size: 10 },
              padding: 5,
            },
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              label: function (context) {
                return (
                  context.dataset.label + ': ' + context.parsed.y.toFixed(3)
                );
              },
            },
          },
        },
      },
    });

    this.runHistory = []; // For CSV export: { gen, best, avg, stdDev, success }
    this.allRunsHistory = []; // Store past runs for consolidated export
    this.currentRunData = []; // Data for current chart line
    this.currentMetadata = {}; // Metadata for the active run
    this.runCount = 0;
    this.bestFitness = Infinity; // Track best fitness across all generations

    this.updateInterval = 5;
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

    this.currentMetadata = meta; // Set new metadata

    if (!keepPrevious) {
      this.chart.data.datasets = [];
      this.runCount = 0;
      this.allRunsHistory = []; // Hard reset clears all history
    } else {
      // Fade previous runs but keep their color distinction
      if (this.chart.data.datasets.length > 0) {
        const last =
          this.chart.data.datasets[this.chart.data.datasets.length - 1];
        last.borderWidth = 1;
        last.pointRadius = 0;
      }
    }

    // Start new dataset
    this.runCount++;

    // Golden Angle approximation for distinct colors
    const hue = (this.runCount * 137.5) % 360;
    const color = `hsla(${hue}, 80%, 50%, 1)`;
    const bg = `hsla(${hue}, 80%, 50%, 0.1)`;

    const newSet = {
      label: `Run ${this.runCount}`,
      data: [],
      borderColor: color,
      backgroundColor: bg,
      borderWidth: 2,
      tension: 0.1,
      pointRadius: 0,
    };
    this.chart.data.datasets.push(newSet);

    // sync labels if needed, or clear if fresh
    if (!keepPrevious) this.chart.data.labels = [];

    this.currentRunData =
      this.chart.data.datasets[this.chart.data.datasets.length - 1].data;
    this.runHistory = [];
    this.bestFitness = Infinity; // Reset best fitness for new run
    this.chart.update();
  }

  update(gen, particles, bestVal, targetStr) {
    // 1. Calculate Stats
    let sum = 0;
    let sqSum = 0;
    let successCount = 0;

    // Parse target if possible (simple heuristic)
    // Ideally pass target object, but string parsing for now is hacky but quick
    // Actually, let's just use bestVal vs 0 or known optimum if possible
    // For generalized success, we can check if fitness < epsilon
    // Relaxed threshold for visualization satisfaction (Parametric)
    const epsilon = STATE.epsilon;

    // Centroid for Explore/Exploit
    let cx = 0,
      cz = 0;

    particles.forEach((p) => {
      sum += p.val;
      sqSum += p.val * p.val;

      // Assuming 0 is always optimum-ish or close to it for our functions
      // (Ackley, Rastrigin, Sphere, etc.)
      // Schwefel is the exception (min is 0 with our offset)
      if (Math.abs(p.val) < epsilon) successCount++;

      cx += p.x;
      cz += p.z;
    });

    const N = particles.length;
    const avg = sum / N;
    const variance = sqSum / N - avg * avg;
    const stdDev = Math.sqrt(Math.max(0, variance));
    const successRate = (successCount / N) * 100;

    cx /= N;
    cz /= N;

    // Exploration: Avg distance from centroid
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

    // Update best fitness if current is better
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

    // Ensure labels exist
    if (this.chart.data.labels.length <= this.currentRunData.length) {
      this.chart.data.labels.push(gen);
    }

    this.currentRunData.push(bestVal);

    // Performance cap for long runs
    if (this.currentRunData.length > 200) {
      // Decimate? Or just shift? Shift is easier for now.
      // If we shift, we must shift labels too, which breaks multi-run sync if they have diff lengths...
      // Let's just stop updating graph after 200 points to save memory, or strictly shift everything.
      // For simplicity in this demo: shift.
      if (this.chart.data.labels.length > 200) {
        this.chart.data.labels.shift();
        this.chart.data.datasets.forEach((d) => {
          if (d.data.length > 200) d.data.shift();
        });
      }
    }

    this.chart.update('none');
  }

  exportCSV() {
    // Combine current run with history
    const allData = [...this.allRunsHistory];

    // Add active run if it has data
    if (this.runHistory.length > 0) {
      allData.push({
        runId: this.runCount,
        meta: this.currentMetadata,
        data: this.runHistory,
      });
    }

    if (allData.length === 0) return;

    // Enhanced CSV Header with algorithm parameters
    let csv =
      'RunID,Algorithm,Landscape,PopSize,Epsilon,Seed,AlgoParams,Generation,BestFitness,AvgFitness,StdDev,SuccessRate\n';

    allData.forEach((run) => {
      const m = run.meta || {};
      const algo = m.algorithm || 'unknown';
      const land = m.landscape || 'unknown';
      const pop = m.popSize || 0;
      const eps = m.epsilon || 0;
      const seed = m.seed || 0;

      // Format algorithm parameters as a readable string
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
  }
}
