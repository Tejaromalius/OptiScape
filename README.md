# Cuckoo Search Simulator and Optimization Playground

A high-performance, interactive 3D visualization tool for studying metaheuristic optimization algorithms. This project provides a "playground" environment where students and researchers can visualize how different algorithms (like Cuckoo Search, PSO, and Genetic Algorithms) navigate complex mathematical landscapes in real-time.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Technology](https://img.shields.io/badge/tech-Three.js%20%7C%20Chart.js%20%7C%20Vanilla%20JS-yellow)
![Mobile](https://img.shields.io/badge/mobile-optimized-green.svg)

## 🚀 Features

### 🧠 Implemented Algorithms

* **Cuckoo Search (CS):** Visualizes random Lévy flight walks and nest abandonment mechanics.
* **Particle Swarm Optimization (PSO):** Demonstrates flocking behaviors with customizable inertia and social/cognitive coefficients.
* **Genetic Algorithm (GA):** Shows population evolution through selection, crossover, and mutation.
* **Simulated Annealing (SA):** Visualizes temperature-based exploration vs. exploitation.
* **Random Search:** A baseline for comparison.

### 🏔️ 3D Mathematical Landscapes

Explore agents interacting with complex objective functions, each rendered in interactive 3D:

* **Ackley Function:** The "Egg Carton" landscape with many local minima.
* **Rastrigin Function:** A highly multimodal "field of needles."
* **Rosenbrock Function:** The classic "Valley/Banana" optimization problem.
* **Schwefel Function:** A deceptive landscape with distant global optima.
* **Sphere Function:** A simple convex bowl for sanity testing.

### 🛠️ Interactive Controls

* **Real-time Parameter Tuning:** Adjust algorithm-specific parameters (e.g., Mutation Rate, Inertia, Discovery Rate) on the fly without restarting.
* **Simulation Controls:** Play, Pause, Reset, and adjust simulation speed.
* **Visual Aids:** Toggle Heatmaps and Auto-Rotation.

### 📊 Analytics & Data

* **Live Charts:** Real-time plotting of convergence (Best Fitness vs. Generation).
* **Statistical Dashboard:** Live metrics for Population Diversity (Std Dev), Average Fitness, and Success Rate.
* **Export:** Download simulation data as CSV for external analysis.
* **Comparison Mode:** Run benchmarks to compare the performance of the current algorithm configuration.

### 📱 Mobile Support

* **Fully Responsive:** Optimized for phones, tablets, and desktops with adaptive layouts.
* **Touch Controls:** Slide-out drawer navigation with touch-optimized controls (48px tap targets).
* **Gesture Support:** Pinch-to-zoom, drag-to-rotate, and two-finger pan on 3D canvas.
* **Performance Optimized:** Automatic particle count reduction on mobile devices.
* **PWA Ready:** Install as a standalone app on iOS and Android.
* **Orientation Aware:** Adapts to portrait and landscape modes seamlessly.

📖 **[Read the Mobile Guide](MOBILE.md)** for detailed usage instructions.

---

## 💻 Tech Stack

* **Visual Engine:** [Three.js](https://threejs.org/) (WebGL)
* **Analytics:** [Chart.js](https://www.chartjs.org/)
* **Core:** Vanilla JavaScript (ES6 Modules)
* **Styling:** Custom CSS3 (Glassmorphism design)

---

## 🏃‍♂️ Getting Started

### Prerequisites

* Node.js installed (only for running the local dev server).

### Installation & Running

1. **Clone the repository:**

    ```bash
    git clone https://github.com/Tejaromalius/CuckooSearchSimulator.git
    cd CuckooSearchSimulator
    ```

2. **Start the local server:**
    This project uses `npx` to serve static files. No heavy `npm install` is required for dependencies as libraries are loaded via CDN or ES modules.

    ```bash
    npm start
    ```

    *Alternatively, you can use any static file server like generic `python -m http.server` or VS Code's Live Server.*

3. **Open in Browser:**
    Navigate to `http://localhost:3000` (or the port shown in your terminal).

---

## 📂 Project Structure

```text
/
├── css/                 # Styling and UI design
├── js/
│   ├── algorithms/      # Logic for CS, PSO, GA, SA
│   ├── landscapes/      # Math formulas for objective functions (Ackley, etc.)
│   ├── managers/        # Simulation loop and state management
│   ├── ui/              # User Interface event handling
│   ├── utils/           # Math helpers and data processing
│   ├── main.js          # Entry point and Three.js scene setup
│   └── config.js        # Global configuration and event bus
├── index.html           # Application entry point
├── package.json         # Script definitions
└── README.md            # Project documentation
```

---

## 🔬 Scientific Context

### 1. Algorithms Implemented

#### 1.1 Cuckoo Search (CS)

**Concept:** Inspired by the obligate brood parasitism of some cuckoo species, combined with the Lévy flight behavior of some birds and fruit flies.

**Mathematical Formulation:**
The algorithm maintains a population of $n$ nests.

1. **Lévy Flights (Global Random Walk):**
    New solutions $x^{(t+1)}$ are generated using a Lévy flight:

    $$x_i^{(t+1)} = x_i^{(t)} + \alpha \oplus \text{Levy}(\lambda)$$

    Where $\alpha > 0$ is the step size scaling factor.

    The step length $s$ follows the Lévy distribution:

    $$\text{Levy} \sim u = t^{-\lambda}, \quad (1 < \lambda \le 3)$$

    In this implementation, the step length is calculated using **Mantegna's Algorithm**:

    $$\text{step} = \frac{u}{|v|^{1/\beta}}$$

    Where $u$ and $v$ are drawn from normal distributions:

    $$u \sim N(0, \sigma_u^2), \quad v \sim N(0, 1)$$

    $$\sigma_u = \left\lbrace \frac{\Gamma(1+\beta) \sin(\pi \beta / 2)}{\Gamma[(1+\beta)/2] \beta 2^{(\beta-1)/2}} \right\rbrace^{1/\beta}$$

    (Here $\beta = \lambda - 1$).

2. **Selection:**
    A randomly chosen nest $j$ is compared with the new solution. If the new solution fitness $f_{new}$ is better than $f_j$, it replaces nest $j$.

3. **Discovery/Abandonment (Local Random Walk):**
    A fraction $p_a$ of the worst nests are abandoned and new ones are built. In this simulator, this is implemented as a random re-initialization of the abandoned nests within the bounds:

    $$x_i^{new} = \text{LowerBound} + r \times (\text{UpperBound} - \text{LowerBound})$$

    Where $r \sim U(0, 1)$.

#### 1.2 Particle Swarm Optimization (PSO)

**Concept:** Simulates the social behavior of bird flocking or fish schooling.

**Mathematical Formulation:**
Each particle $i$ has position $x_i$ and velocity $v_i$.

1. **Velocity Update:**

    $$v_i^{(t+1)} = w v_i^{(t)} + c_1 r_1 (pBest_i - x_i^{(t)}) + c_2 r_2 (gBest - x_i^{(t)})$$

    Where:
    * $w$: Inertia weight.
    * $c_{1}, c_{2}$: Cognitive and social acceleration coefficients.
    * $r_{1}, r_{2} \sim U(0, 1)$.
    * $pBest_i$: Personal best position of particle $i$.
    * $gBest$: Global best position of the swarm.

2. **Position Update:**

    $$x_i^{(t+1)} = x_i^{(t)} + v_i^{(t+1)}$$

#### 1.3 Genetic Algorithm (GA)

**Concept:** Based on the principles of natural selection and genetics.

**Mathematical Formulation:**

1. **Selection:** Tournament selection ($k=3$) to choose parents.
2. **Crossover:** Arithmetic crossover with probability $p_c$:

    $$Child = \gamma \cdot Parent_1 + (1 - \gamma) \cdot Parent_2$$

    Where $\gamma \sim U(0, 1)$.
3. **Mutation:** Uniform mutation with probability $p_m$.

    $$x_{new} = x_{old} + \delta, \quad \delta \in [-0.1 \cdot \text{Bounds}, 0.1 \cdot \text{Bounds}]$$

#### 1.4 Simulated Annealing (SA)

**Concept:** Probabilistic technique for approximating the global optimum of a given function, inspired by annealing in metallurgy.

**Mathematical Formulation:**

1. **Exploration:**

    $$x_{new} = x_{curr} + \epsilon$$

    Where step size $\epsilon$ scales with the current temperature $T$.
2. **Acceptance (Metropolis Criterion):**
    Let $\Delta E = f(x_{new}) - f(x_{curr})$.
    If $\Delta E < 0$, accept the new state.
    Else, accept with probability:

    $$P(\text{accept}) = \exp\left( -\frac{\Delta E}{T} \right)$$
3. **Cooling Schedule:** Geometric cooling.

    $$T_{k+1} = \alpha T_k$$

    Where $\alpha$ is the cooling rate (e.g., 0.99).

### 2. Landscapes (Benchmarking Functions)

#### 2.1 Ackley Function

A widely used multimodal test function. It is characterized by a nearly flat outer region (due to the exponential term) and a large hole at the center.

$$f(x, z) = -a \exp\left(-b \sqrt{\frac{1}{2}(x^2 + z^2)}\right) - \exp\left(\frac{1}{2}(\cos(cx) + \cos(cz))\right) + a + e$$

* **Global Minimum:** $0$ at $(0, 0)$.

#### 2.2 Rastrigin Function

A highly multimodal function with a regular distribution of local minima. It is based on the Sphere function with a cosine modulation to create the "needle field."

$$f(x, z) = 2A + (x^2 - A \cos(2\pi x)) + (z^2 - A \cos(2\pi z))$$

* **Global Minimum:** $0$ at $(0, 0)$.

#### 2.3 Rosenbrock Function

Also known as the Valley or Banana function. The global minimum is inside a long, narrow, parabolic shaped flat valley. To find the valley is trivial. To converge to the global minimum is difficult.

$$f(x, z) = (a - x)^2 + b(z - x^2)^2$$

* **Global Minimum:** $0$ at $(a, a^2)$. (Standard: $(1, 1)$).

#### 2.4 Schwefel Function

Complex function with many local minima. The global minimum is far from the next best local minima.

$$f(x, z) = 418.9829 \times 2 - (x \sin(\sqrt{|x|}) + z \sin(\sqrt{|z|}))$$

* **Global Minimum:** $0$ at $(420.9687, 420.9687)$.

#### 2.5 Sphere Function

A simple unimodal convex function used as a baseline to check algorithm sanity and convergence speed.

$$f(x, z) = x^2 + z^2$$

* **Global Minimum:** $0$ at $(0, 0)$.

---

## 🤝 Contributing

Contributions are welcome! If you want to add a new algorithm (e.g., Firefly Algorithm, Ant Colony) or a new landscape:

1. Create a new file in `js/algorithms/` or `js/landscapes/`.
2. Extend the base `Algorithm` or `Landscape` class.
3. Register it in `index.html` (UI) and `scaffold.js` (Mapping).
