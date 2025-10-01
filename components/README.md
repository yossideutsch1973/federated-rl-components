open # Federated RL Component Library

**Super easy reusable components for building federated reinforcement learning apps.**

**NEW! 🎮** Physics engine integration - Use Matter.js for real physics simulation!

## 🎯 Quick Start

Create a complete federated RL demo in ~30 lines:

```javascript
import { createFederatedApp } from './components/app-template.js';

const app = createFederatedApp({
  name: 'My RL Task',
  numClients: 16,
  
  environment: {
    actions: ['LEFT', 'RIGHT'],
    getState: (state) => `${state.x},${state.y}`,
    step: (state, action) => ({ state: newState, reward, done }),
    reset: () => ({ x: 0, y: 0 })
  },
  
  render: (ctx, state) => {
    // Draw your environment
  }
});

app.start();
```

## 📦 Components

### 1. `rl-core.js` - Pure RL Algorithms

**Pure functional RL algorithms with no dependencies.**

```javascript
import { updateQValue, selectAction, createTabularAgent } from './rl-core.js';

// Q-learning update
const newQ = updateQValue(currentQ, reward, maxNextQ, alpha, gamma);

// Epsilon-greedy action selection
const action = selectAction(qValues, epsilon);

// Create agent
const agent = createTabularAgent({
  alpha: 0.1,
  gamma: 0.95,
  epsilon: 0.2,
  numActions: 3
});

// Use agent
const action = agent.chooseAction(state);
agent.learn(state, action, reward, nextState);
```

**Exports:**
- `updateQValue(currentQ, reward, maxNextQ, alpha, gamma)` - Q-learning update
- `selectAction(qValues, epsilon, random?)` - ε-greedy selection
- `tdError(reward, currentQ, maxNextQ, gamma)` - Calculate TD error
- `softmaxSelect(qValues, temperature, random?)` - Softmax action selection
- `createTabularAgent(config)` - Create Q-learning agent
- `discretize(value, bins, min, max)` - Discretize continuous values
- `discretizeState(values, bins, mins, maxs)` - Create state string

### 2. `federated-core.js` - Federated Learning

**Federated averaging, model serialization, auto-federation.**

```javascript
import { federatedAverage, createFederatedManager, serializeModel } from './federated-core.js';

// Aggregate models from clients
const globalModel = federatedAverage(models, weights?);

// Create federated system
const fedManager = createFederatedManager({
  federationInterval: 100,
  autoFederate: true,
  strategy: 'episodes' // or 'performance'
});

// Check if should federate
if (fedManager.shouldFederate(clients)) {
  fedManager.federate(clients);
}

// Export model
const json = serializeModel(model, metadata);
```

**Exports:**
- `federatedAverage(models, weights?)` - FedAvg algorithm
- `federatedAverageWeighted(models, sampleCounts)` - Weighted FedAvg
- `serializeModel(model, metadata)` - Model to JSON
- `deserializeModel(jsonString)` - JSON to model
- `shouldFederateByEpisodes(counts, threshold, lastTrigger)` - Episode-based trigger
- `shouldFederateByPerformance(rewards, window, threshold)` - Performance-based trigger
- `createFederatedManager(config)` - Create federation manager

### 3. `ui-builder.js` - Dashboard Components

**Build beautiful dashboards with minimal code.**

```javascript
import { createDashboardLayout, createClientGrid, createControlBar, createMetricsPanel } from './ui-builder.js';

// Create layout
const layout = createDashboardLayout({
  title: 'My RL App',
  subtitle: 'Learning in progress',
  containerId: 'app'
});

// Create client grid
const clients = createClientGrid({
  numClients: 16,
  canvasWidth: 300,
  canvasHeight: 220,
  container: layout.clients
});

// Create buttons
const buttons = createControlBar({
  container: layout.controls,
  buttons: [
    { id: 'btn-start', label: '▶ Start' },
    { id: 'btn-federate', label: '🔄 Federate' }
  ]
});

// Create metrics
const metrics = createMetricsPanel({
  container: layout.metrics,
  metrics: [
    { id: 'metric-round', label: 'Round' },
    { id: 'metric-reward', label: 'Avg Reward' }
  ]
});

// Update metrics
updateMetric(metrics['metric-round'], roundCount);
```

**Exports:**
- `createDashboardLayout(config)` - Main layout
- `createClientGrid(config)` - Client canvas grid
- `createControlBar(config)` - Button toolbar
- `createInput(config)` - Input controls
- `createMetricsPanel(config)` - Metrics display
- `updateMetric(element, value, format?)` - Update metric
- `injectDefaultStyles()` - Add default CSS

### 4. `app-template.js` - Complete App Builder

**Highest-level abstraction. Define environment and go!**

```javascript
import { createFederatedApp } from './app-template.js';

const app = createFederatedApp({
  // Metadata
  name: 'Cart-Pole',
  subtitle: 'Balance the pole',
  
  // Clients
  numClients: 16,
  canvasWidth: 300,
  canvasHeight: 220,
  
  // RL parameters
  alpha: 0.1,
  gamma: 0.95,
  epsilon: 0.2,
  
  // Federation
  autoFederate: true,
  federationInterval: 100,
  
  // Environment (required)
  environment: {
    actions: ['LEFT', 'RIGHT'],
    getState: (state) => stateString,
    step: (state, action) => ({ state, reward, done }),
    reset: (clientId?) => initialState
  },
  
  // Rendering (optional)
  render: (ctx, state, client) => {
    // Draw environment
  },
  
  // Hooks (optional)
  onClientInit: (client) => {},
  onEpisodeEnd: (client) => {},
  onFederation: (globalModel, round) => {}
});

// Control app
app.start();
app.pause();
app.federate();
app.reset();
```

**Returns:**
- `start()` - Start training
- `pause()` - Pause training
- `federate()` - Trigger federation
- `reset()` - Reset all clients
- `getClients()` - Get client array
- `getFedManager()` - Get federation manager
- `isRunning()` - Check if running

## 🚀 Examples

### Mountain Car (Minimal)

```javascript
createFederatedApp({
  name: 'Mountain Car',
  numClients: 8,
  environment: {
    actions: ['LEFT', 'NONE', 'RIGHT'],
    getState: (s) => `${Math.floor(s.pos*10)},${Math.floor(s.vel*10)}`,
    step: (s, a) => {
      const force = (a - 1) * 0.001;
      let vel = s.vel + force - 0.0025 * Math.cos(3 * s.pos);
      let pos = s.pos + vel;
      return { 
        state: { pos, vel }, 
        reward: pos >= 0.5 ? 0 : -1, 
        done: pos >= 0.5 
      };
    },
    reset: () => ({ pos: -0.5, vel: 0 })
  },
  render: (ctx, s) => {
    // Draw mountain and car
  }
});
```

### Grid World (Ultra Minimal)

```javascript
createFederatedApp({
  name: 'Grid World',
  numClients: 4,
  environment: {
    actions: ['UP', 'DOWN', 'LEFT', 'RIGHT'],
    getState: (s) => `${s.x},${s.y}`,
    step: (s, a) => {
      const moves = [[0,-1], [0,1], [-1,0], [1,0]];
      const [dx, dy] = moves[a];
      return { 
        state: { x: s.x + dx, y: s.y + dy }, 
        reward: (s.x === 9 && s.y === 9) ? 10 : -1, 
        done: (s.x === 9 && s.y === 9) 
      };
    },
    reset: () => ({ x: 0, y: 0 })
  }
});
```

## 📋 Features

✅ **Pure functional RL algorithms** - No side effects, fully testable  
✅ **Federated averaging** - FedAvg with proper state aggregation  
✅ **Auto-federation** - Episode or performance-based triggers  
✅ **Model persistence** - Export/import models as JSON  
✅ **Inference mode** - Pure exploitation for deployment  
✅ **Scalable clients** - Support 1-100+ clients dynamically  
✅ **Beautiful UI** - Pre-built dashboard components  
✅ **Physics engine integration** - 🎮 Matter.js support for real physics  
✅ **Zero dependencies** - Pure JavaScript, works anywhere  
✅ **ES6 modules** - Tree-shakeable exports  

## 🎨 Styling

Components come with default dark theme. Customize via CSS:

```css
.client-panel { border: 2px solid #4f8cff; }
.btn { background: linear-gradient(#667eea, #764ba2); }
.metric-value { color: #22c55e; }
```

Or inject your own styles before creating the app.

## 🧪 Testing

All RL core functions are pure and easily testable:

```javascript
import { updateQValue, selectAction } from './rl-core.js';

// Test Q-learning
const newQ = updateQValue(0.5, 10, 0.8, 0.1, 0.9);
console.assert(newQ === 1.12, 'Q-update failed');

// Test epsilon-greedy
const mockRandom = () => 0.5; // Always exploit
const action = selectAction([0.1, 0.9, 0.3], 0.1, mockRandom);
console.assert(action === 1, 'Action selection failed');
```

## 📂 File Structure

```
components/
├── rl-core.js           # Pure RL algorithms
├── federated-core.js    # Federated learning
├── ui-builder.js        # Dashboard components
├── app-template.js      # High-level app builder
└── README.md           # This file

examples/
├── mountain-car.html    # Mountain car demo
└── grid-world.html      # Grid world demo
```

## 🔧 Advanced Usage

### Custom Federation Strategy

```javascript
const fedManager = createFederatedManager({
  federationInterval: 50,
  autoFederate: true,
  strategy: 'performance'
});

// Custom trigger logic
if (myCustomCondition) {
  fedManager.federate(clients);
}
```

### Weighted Federation

```javascript
import { federatedAverageWeighted } from './federated-core.js';

const models = clients.map(c => c.agent.getModel());
const sampleCounts = clients.map(c => c.metrics.episodeCount);
const globalModel = federatedAverageWeighted(models, sampleCounts);
```

### Custom Agent

```javascript
import { createTabularAgent } from './rl-core.js';

const agent = createTabularAgent({
  alpha: 0.05,        // Slower learning
  gamma: 0.99,        # Longer-term rewards
  epsilon: 0.5,       // More exploration
  epsilonDecay: 0.999, // Slower decay
  minEpsilon: 0.05,   // Higher minimum
  numActions: 5
});
```

## 🚦 Best Practices

1. **Start small**: Test with 4 clients, then scale to 16+
2. **Tune RL params**: Adjust α, γ, ε for your task
3. **Federation timing**: Balance frequency vs. exploration diversity
4. **State discretization**: Too coarse = poor learning, too fine = slow convergence
5. **Rendering**: Keep render logic simple for smooth animation

## 🤝 Contributing

Components are designed for easy extension:
- Add new RL algorithms to `rl-core.js`
- Add new federation strategies to `federated-core.js`
- Add new UI widgets to `ui-builder.js`
- Extend app template with new features

## 📜 License

MIT - Use freely, build amazing federated RL apps!

## 🌟 Credits

Built with functional programming principles and modern JavaScript.  
Inspired by the need for simple, reusable federated RL tools.
