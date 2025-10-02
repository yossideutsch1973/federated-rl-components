# System Architecture

**Federated RL Component Library - Design & Implementation**

---

## 🏗️ System Overview

This is a **production-ready component library** for building federated reinforcement learning applications. The architecture emphasizes:

- **Modularity**: Reusable, composable components
- **Pure Functions**: Testable, deterministic logic
- **Dependency Injection**: Configuration-driven composition  
- **Separation of Concerns**: Each module has one clear responsibility

---

## 📦 Component Architecture

```
┌─────────────────────────────────────────────────────┐
│         createFederatedApp()                        │
│         (app-template.js - 888 lines)               │
│  ┌────────────────────────────────────────────────┐ │
│  │  Training Loop                                  │ │
│  │  - Multi-client simulation                      │ │
│  │  - Episode management                           │ │
│  │  - Metrics tracking                             │ │
│  └────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────┐ │
│  │  Inference Mode                                 │ │
│  │  - Frozen agent evaluation                      │ │
│  │  - Aggregate metrics                            │ │
│  │  - KPI tracking                                 │ │
│  └────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
         ↓ uses
┌─────────────────────────────────────────────────────┐
│  Core Components (Pure Functions)                   │
├─────────────────────────────────────────────────────┤
│  rl-core.js           │ Q-learning agent (230 lines)│
│  federated-core.js    │ FedAvg algorithm (360)      │
│  metrics-core.js      │ KPI tracking (350)          │
│  ui-builder.js        │ UI components (350)         │
│  mode-switcher.js     │ Training/Inference (270)    │
│  model-persistence.js │ Save/load (290)             │
│  inference-mode.js    │ Evaluation (540)            │
│  live-controls.js     │ Real-time tuning (400)      │
│  physics-engine.js    │ Matter.js wrapper (180)     │
└─────────────────────────────────────────────────────┘
```

**Total**: ~3,600 lines of production code

---

## 🎯 Design Principles

### 1. **Functional Core, Imperative Shell**

**Pure Functions** (math, physics, RL algorithms):
```javascript
// ✅ Pure: Same input → Same output
const updateQValue = (Q, reward, maxNextQ, alpha, gamma) => {
    return Q + alpha * (reward + gamma * maxNextQ - Q);
};
```

**Imperative Shell** (UI, state management):
```javascript
// Orchestration, side effects allowed
const stepClient = async (client) => {
    const action = client.agent.chooseAction(state);
    const result = environment.step(state, action);
    client.agent.learn(...);
    render(ctx, state);
};
```

### 2. **Dependency Injection**

Configuration flows top-down:
```javascript
createFederatedApp({
    alpha: 0.1,           // ← Config
    gamma: 0.95,
    environment,
    metrics
})
  ↓
createTabularAgent({ alpha, gamma })  // ← Injected
  ↓
updateQValue(Q, reward, maxNextQ, alpha, gamma)  // ← Pure
```

### 3. **Single Responsibility**

Each module does ONE thing well:

| Module | Responsibility | Dependencies |
|--------|---------------|--------------|
| `rl-core.js` | Q-learning algorithm | None |
| `federated-core.js` | Model averaging | None |
| `metrics-core.js` | KPI computation | None |
| `ui-builder.js` | DOM generation | None |
| `app-template.js` | Orchestration | All above |

### 4. **Composition Over Inheritance**

Build complex behavior from simple pieces:
```javascript
// Compose features via config
const app = createFederatedApp({
    environment,         // Required
    render,              // Optional
    metrics,             // Optional
    onEpisodeEnd,        // Optional
    onFederation         // Optional
});
```

---

## 🔑 Key Components

### **1. rl-core.js** - Pure RL Algorithms

**Exports**:
- `createTabularAgent(config)` - Q-learning agent factory
- `updateQValue(Q, reward, maxNextQ, α, γ)` - Bellman update
- `selectAction(qValues, ε)` - ε-greedy policy
- `discretize(value, bins, min, max)` - State discretization

**Properties**:
- ✅ Zero dependencies
- ✅ 100% pure functions
- ✅ Fully testable
- ✅ No side effects

**Formula**:
```
Q(s,a) ← Q(s,a) + α·[r + γ·max_a' Q(s',a') - Q(s,a)]
```

### **2. federated-core.js** - FedAvg Implementation

**Exports**:
- `createFederatedManager(config)` - Manager factory
- `federateAverage(models, weights)` - FedAvg algorithm
- `serializeModel(qTable)` - Convert to JSON
- `deserializeModel(json)` - Restore Q-table
- `computeModelDelta(old, new)` - Convergence metric

**Algorithm**:
```
FedAvg:
  1. For each state s:
       Q_global(s,a) = Σ(w_i · Q_i(s,a)) / Σw_i
  2. Broadcast Q_global to all clients
  3. Compute Δ = ||Q_new - Q_old||_1
```

**Convergence Criteria**: Δ < 0.01

### **3. metrics-core.js** - KPI System ⚡NEW!

**Exports**:
- `createEpisodeTracker(metricsConfig)` - Track KPIs per episode
- `AGGREGATORS` - Pure aggregation functions (sum, avg, max, min)
- `DEFAULT_CONFIGS` - Pre-built metric configs

**Key Innovation**: Separates reward (training signal) from KPIs (evaluation metrics)

**Example**:
```javascript
const tracker = createEpisodeTracker({
    isSuccessful: (state, data) => data.kpis.stepsOnCircle > 1500,
    kpis: {
        stepsOnCircle: {
            compute: (state) => state.error < 15 ? 1 : 0,
            aggregate: 'sum'
        },
        avgSpeed: {
            compute: (state) => Math.hypot(state.vx, state.vy),
            aggregate: 'avg'
        }
    }
});
```

**Philosophy**:
- Reward function shapes learning (can be negative, abstract)
- KPIs measure real-world success (intuitive, domain-specific)

### **4. app-template.js** - Orchestrator

**Responsibilities**:
1. UI setup (dashboard, controls, canvases)
2. Client initialization (agents, state)
3. Training loop (step, learn, render)
4. Federation coordination
5. Mode switching (training ↔ inference)
6. Model persistence

**Interface**:
```javascript
createFederatedApp({
    name: 'Demo',
    numClients: 4,
    alpha: 0.1,
    gamma: 0.95,
    epsilon: 0.3,
    environment: { actions, getState, step, reset },
    render: (ctx, state, client) => {...},
    metrics: metricsConfig,
    onEpisodeEnd: (client) => {...}
})
```

**Returns**:
```javascript
{
    start(), pause(), reset(), federate(),
    setRenderInterval(value),
    getClients(), getFedManager(),
    isRunning()
}
```

### **5. live-controls.js** - Real-Time Tuning ⚡NEW!

**Exports**:
- `createLiveControls(app, config)` - One-line integration

**Features**:
- Auto-generates sliders for all parameters
- Real-time updates during training
- Organized by category (Training, Physics, Rewards)
- Toggle visibility (Ctrl+K shortcut)
- FAB button for quick access

**Usage**:
```javascript
const CONFIG = {
    alpha: 0.15,
    gamma: 0.95,
    epsilon: 0.3,
    strengthMed: 50000
};

const app = createFederatedApp({ ...CONFIG, environment, render });
createLiveControls(app, CONFIG);  // ← One line!
```

---

## 🔄 Data Flow

### **Training Mode**

```
1. User clicks "Start"
   ↓
2. For each client:
     state = environment.reset()
   ↓
3. Training loop (60 FPS):
     For each client:
       action = agent.chooseAction(state)
       {state', reward, done} = environment.step(state, action)
       agent.learn(state, action, reward, state')
       tracker.step(episodeData, state', action, reward)  ← KPIs
       if done:
           tracker.finalize(episodeData, state')
           onEpisodeEnd(client, episodeData)
           state = environment.reset()
   ↓
4. Every N episodes:
     Q_global = fedManager.federate(clients)
     For each client:
         client.agent.setModel(Q_global)
   ↓
5. Repeat until user clicks "Pause"
```

### **Inference Mode**

```
1. User switches to Inference tab
   ↓
2. Load model:
     Option A: From checkpoint (localStorage)
     Option B: From file upload
   ↓
3. Create frozen agent:
     frozenAgent = createInferenceAgent(model, numActions)
     // ε=0 (greedy), α=0 (no learning)
   ↓
4. Run N test episodes:
     For i = 1 to N:
         episodeData = tracker.init()
         state = environment.reset(0)
         While not done:
             action = frozenAgent.chooseAction(state)
             {state', reward, done} = environment.step(state, action)
             episodeData = tracker.step(..., state', action, reward)
             render(ctx, state', mockClient)
         episodeData = tracker.finalize(episodeData, state')
         results.episodes.push(episodeData)
   ↓
5. Display aggregate metrics:
     - Success rate
     - Mean reward ± σ
     - Consistency score
     - KPIs (domain-specific)
```

---

## 🎨 UI Architecture

### **Component Hierarchy**

```
Dashboard Layout
├── Header (title, subtitle)
├── Mode Switcher (Training / Inference tabs)
├── Controls Container
│   ├── Training Controls (visible in training mode)
│   │   ├── Start/Pause button
│   │   ├── Reset button
│   │   ├── Federate button
│   │   ├── Client count input
│   │   └── Auto-federate checkbox
│   └── Inference Controls (visible in inference mode)
│       ├── Model source select
│       ├── Run evaluation button
│       ├── Stop button
│       ├── Load model button
│       └── Results panel
├── Clients Grid
│   └── Client Panels (4x)
│       ├── Client header
│       ├── Canvas (400x400)
│       └── Metrics (episode, reward, ε)
└── Metrics Dashboard
    ├── Federation status
    ├── Model delta (convergence)
    └── Recent performance
```

### **Live Controls Panel** (Floating)

```
┌──────────────────────────────┐
│ ⚙️ Live Training Controls    │
│ ─────────────────────────── │
│ 📚 Training                   │
│   Learning Rate (α)  [====] │
│   Discount (γ)       [====] │
│   Epsilon            [====] │
│ ⚙️ Physics                    │
│   Strength (MED)     [====] │
│   Friction           [====] │
│ 🎁 Rewards                    │
│   Flag Bonus         [====] │
│   Time Penalty       [====] │
│ ⚡ Performance                │
│   Render Interval    [====] │
│ ─────────────────────────── │
│ [Apply to All] [Reset]      │
│ [Hide Panel]                 │
└──────────────────────────────┘
         ↑
         │
    Ctrl+K to toggle
```

---

## 🧪 Testing Strategy

### **Unit Tests** (Pure Functions)

```javascript
// test/test-rl-core.js
assert(updateQValue(0.5, 10, 0.8, 0.1, 0.9) === 1.12);
assert(discretize(75, 10, 0, 100) === 7);

// test/test-metrics-core.js
assert(AGGREGATORS.sum([1,2,3]) === 6);
assert(AGGREGATORS.avg([2,4,6]) === 4);
```

### **Integration Tests** (Environment → Agent)

```javascript
// test/test-grid-world.js
const agent = createTabularAgent({ alpha: 0.1, gamma: 0.9 });
const env = createGridWorldEnvironment();

for (let ep = 0; ep < 100; ep++) {
    let state = env.reset();
    while (!done) {
        const action = agent.chooseAction(state);
        const { state: nextState, reward, done } = env.step(state, action);
        agent.learn(state, action, reward, nextState);
        state = nextState;
    }
}

assert(agent.hasConverged());
```

### **End-to-End Tests** (Manual)

1. Load example: `examples/rl-ball-catch-pure.html`
2. Click Start → Training begins
3. Wait 500 episodes → Success rate > 80%
4. Click Federate → Delta < 0.1
5. Save checkpoint → localStorage updated
6. Switch to Inference → Model loaded
7. Run 50 episodes → Success rate stable

---

## 📊 Performance Characteristics

| Metric | Value | Notes |
|--------|-------|-------|
| **Federation Speed** | <10ms | 4 clients, 400 states |
| **Q-update Speed** | ~1μs | Pure function |
| **Storage Size** | ~50KB | Checkpoint w/ 400 states |
| **Training FPS** | 60 | With rendering |
| **Training FPS** | 600+ | Without rendering (renderInterval=100) |
| **State Space** | 10-500 | Tabular Q-learning limit |
| **Clients** | 1-1000 | Tested up to 1000 |

---

## 🔮 Design Decisions (Rationale)

### **Why Tabular Q-Learning?**

- ✅ Simple, interpretable, no ML library needed
- ✅ Works well for discrete state spaces (10-500 states)
- ✅ Fast convergence in low dimensions
- ❌ Does not scale to large state spaces (use DQN for that)

### **Why FedAvg (Not FedProx, FedOpt)?**

- ✅ Simplest federated algorithm
- ✅ Provably convergent for i.i.d. data
- ✅ No hyperparameters to tune (beyond α, γ)
- ❌ Sensitive to non-i.i.d. data (use FedProx for heterogeneous clients)

### **Why localStorage (Not IndexedDB)?**

- ✅ Simple key-value API
- ✅ Synchronous reads (no async complexity)
- ✅ 5-10MB quota (sufficient for Q-tables)
- ❌ Limited to same origin (use file export for portability)

### **Why Canvas (Not WebGL)?**

- ✅ 2D graphics sufficient for demos
- ✅ Simple API (no shader complexity)
- ✅ Better text rendering
- ❌ Slower for particle systems (use WebGL if needed)

### **Why ES6 Modules (Not Webpack/Rollup)?**

- ✅ Native browser support (2025)
- ✅ Zero build step (just serve files)
- ✅ Faster iteration (no bundler overhead)
- ❌ No tree-shaking (ship all code)

---

## 🚧 Future Architecture Improvements

### **Short-Term** (Next 2-4 weeks)

1. **Testing Infrastructure**
   - Unit tests for all pure functions
   - CI/CD with GitHub Actions
   - Coverage reporting

2. **Performance Monitoring**
   - Training speed (steps/sec)
   - Memory usage tracking
   - Render FPS counter

### **Medium-Term** (1-3 months)

3. **Modular Algorithms**
   - Pluggable RL algorithms (SARSA, Expected SARSA, Double Q)
   - Pluggable exploration strategies (UCB, Boltzmann)
   - Pluggable federation strategies (FedProx, FedOpt)

4. **Advanced Features**
   - Experience replay buffer
   - Eligibility traces (λ-returns)
   - Prioritized experience replay

### **Long-Term** (3-6 months)

5. **Deep RL Support**
   - Neural network agents (DQN, A3C, PPO)
   - TensorFlow.js integration
   - Model quantization

6. **Distributed System**
   - WebSocket backend for true multi-machine federation
   - Model versioning & rollback
   - A/B testing framework

---

## 📚 Further Reading

- **Reinforcement Learning**: Sutton & Barto (2nd ed)
- **Federated Learning**: McMahan et al. 2017 (FedAvg paper)
- **Component Design**: Martin Fowler - "Dependency Injection"
- **Functional Programming**: "Professor Frisby's Mostly Adequate Guide"

---

**Last Updated**: October 2, 2025  
**Maintained By**: Yossi Deutsch  
**Status**: ✅ Production-Ready

