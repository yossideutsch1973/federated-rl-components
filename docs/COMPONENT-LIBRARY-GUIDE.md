# 🧩 Component Library Usage Guide

## Overview

The Federated RL Component Library is designed for **super easy reuse**. You can:

1. **Build a complete app in 20-30 lines** using `app-template.js`
2. **Mix and match components** for custom solutions
3. **Use pure RL functions** in any JavaScript project
4. **Zero dependencies** - works everywhere

---

## 🎯 Three Levels of Usage

### Level 1: Use the App Template (Easiest)

**Perfect for:** Quick demos, learning, prototyping

```javascript
import { createFederatedApp } from './components/app-template.js';

createFederatedApp({
  name: 'My Task',
  numClients: 8,
  environment: {
    actions: ['LEFT', 'RIGHT'],
    getState: (state) => stateString,
    step: (state, action) => ({ state, reward, done }),
    reset: () => initialState
  },
  render: (ctx, state) => { /* draw */ }
}).start();
```

**Pros:**
- ✅ Fastest way to build a demo
- ✅ All features included (federation, export/import, inference)
- ✅ Beautiful UI out of the box
- ✅ Auto-federation support

**Cons:**
- ❌ Less control over UI layout
- ❌ Harder to customize federation logic

**Examples:**
- `examples/grid-world-minimal.html` (~20 lines)
- `examples/mountain-car.html` (~80 lines)

---

### Level 2: Compose Components (Flexible)

**Perfect for:** Custom UIs, specific workflows, research tools

```javascript
import { createTabularAgent } from './components/rl-core.js';
import { createFederatedManager } from './components/federated-core.js';
import { createClientGrid, createControlBar } from './components/ui-builder.js';

// Create your own clients
const clients = Array(8).fill().map(() => ({
  agent: createTabularAgent({ alpha: 0.1, gamma: 0.95 }),
  state: environment.reset()
}));

// Create federation manager
const fedManager = createFederatedManager({ federationInterval: 100 });

// Build custom UI
const clientGrid = createClientGrid({ numClients: 8, container: myDiv });
const buttons = createControlBar({ 
  buttons: [{ id: 'btn-start', label: 'Start' }],
  container: controlDiv 
});

// Your custom training loop
function train() {
  clients.forEach(client => {
    const action = client.agent.chooseAction(client.state);
    const { state, reward, done } = environment.step(client.state, action);
    client.agent.learn(client.state, action, reward, state);
    client.state = state;
  });
  
  if (fedManager.shouldFederate(clients)) {
    fedManager.federate(clients);
  }
}
```

**Pros:**
- ✅ Full control over UI and logic
- ✅ Custom federation strategies
- ✅ Easy to extend
- ✅ Still reusable components

**Cons:**
- ❌ More code to write
- ❌ Need to handle more details

---

### Level 3: Use Pure Functions (Maximum Control)

**Perfect for:** Integration into existing projects, non-browser environments, testing

```javascript
import { updateQValue, selectAction, federatedAverage } from './components/rl-core.js';

// Use in Node.js, web workers, or anywhere
const qTable = { 'state1': [0.1, 0.5, 0.3] };
const action = selectAction(qTable['state1'], 0.2);
const newQ = updateQValue(qTable['state1'][action], reward, maxNextQ, 0.1, 0.95);

// Aggregate models from any source
const globalModel = federatedAverage([model1, model2, model3]);

// Pure functions = easy testing
assert(updateQValue(0.5, 10, 0.8, 0.1, 0.9) === 1.12);
```

**Pros:**
- ✅ Maximum flexibility
- ✅ No UI dependencies
- ✅ Works in Node.js, Deno, Bun
- ✅ Perfect for testing

**Cons:**
- ❌ No UI provided
- ❌ Most work required

---

## 📚 Component Reference

### `rl-core.js` - Pure RL Functions

**Key exports:**
- `updateQValue()` - Q-learning update
- `selectAction()` - ε-greedy policy
- `createTabularAgent()` - Complete Q-learning agent
- `discretize()` - Continuous → discrete

**When to use:**
- ✅ Need just RL algorithms
- ✅ Building custom agent
- ✅ Testing RL logic
- ✅ Non-federated projects

**Example:**
```javascript
const agent = createTabularAgent({ 
  alpha: 0.1, gamma: 0.95, epsilon: 0.2, numActions: 3 
});

// Training loop
const action = agent.chooseAction(state);
agent.learn(state, action, reward, nextState);
agent.decayEpsilon();
```

---

### `federated-core.js` - Federated Learning

**Key exports:**
- `federatedAverage()` - FedAvg algorithm
- `createFederatedManager()` - Auto-federation
- `serializeModel()` / `deserializeModel()` - Model I/O

**When to use:**
- ✅ Multi-client learning
- ✅ Model aggregation
- ✅ Model persistence
- ✅ Auto-federation triggers

**Example:**
```javascript
const fedManager = createFederatedManager({
  federationInterval: 100,
  autoFederate: true,
  strategy: 'episodes'
});

// Check and federate
if (fedManager.shouldFederate(clients)) {
  const globalModel = fedManager.federate(clients);
  const json = serializeModel(globalModel, { round: fedManager.getRound() });
}
```

---

### `ui-builder.js` - Dashboard Components

**Key exports:**
- `createDashboardLayout()` - Main layout
- `createClientGrid()` - Canvas grid
- `createControlBar()` - Buttons
- `createMetricsPanel()` - Metrics display

**When to use:**
- ✅ Custom UI layouts
- ✅ Non-standard configurations
- ✅ Research dashboards
- ✅ Educational tools

**Example:**
```javascript
const layout = createDashboardLayout({ title: 'My RL Lab' });
const clients = createClientGrid({ numClients: 16, container: layout.clients });
const buttons = createControlBar({ 
  buttons: [
    { id: 'btn-train', label: 'Train', onClick: startTraining },
    { id: 'btn-stop', label: 'Stop', onClick: stopTraining }
  ],
  container: layout.controls
});
```

---

### `app-template.js` - Complete App

**Key export:**
- `createFederatedApp()` - Full app builder

**When to use:**
- ✅ Quick demos
- ✅ Standard federated RL setup
- ✅ Learning and teaching
- ✅ Prototyping

**Example:**
```javascript
const app = createFederatedApp({
  name: 'My Task',
  numClients: 8,
  environment: { /* define environment */ },
  render: (ctx, state) => { /* draw */ },
  onFederation: (model, round) => { console.log(`Round ${round}`) }
});
```

---

## ⚠️ Running Examples (IMPORTANT!)

ES6 modules **require a web server** due to CORS. Don't double-click HTML files!

```bash
# From project root
python3 -m http.server 8000

# Then browse to:
# http://localhost:8000/examples/grid-world-minimal.html
# http://localhost:8000/examples/mountain-car.html
```

**Why?** Browsers block ES6 module imports from `file://` URLs for security.

---

## 🛠️ Common Patterns

### Pattern 1: Custom Reward Shaping

```javascript
environment: {
  step: (state, action) => {
    const newState = physics(state, action);
    
    // Custom reward shaping
    let reward = -1; // Living penalty
    if (atGoal(newState)) reward = 100;
    if (hitObstacle(newState)) reward = -50;
    
    // Progress bonus
    reward += distanceReduction(state, newState) * 10;
    
    return { state: newState, reward, done: atGoal(newState) };
  }
}
```

### Pattern 2: Heterogeneous Clients

```javascript
environment: {
  reset: (clientId) => {
    // Different starting conditions per client
    return {
      pos: -0.5 + clientId * 0.1,
      vel: 0,
      difficulty: clientId % 3 // Easy, medium, hard
    };
  },
  
  step: (state, action) => {
    // Adjust physics based on difficulty
    const gravityScale = [0.5, 1.0, 1.5][state.difficulty];
    // ...
  }
}
```

### Pattern 3: Performance Tracking

```javascript
const app = createFederatedApp({
  // ... config ...
  
  onEpisodeEnd: (client) => {
    // Log performance
    console.log(`Client ${client.id}: Reward = ${client.metrics.totalReward}`);
    
    // Track best performers
    if (client.metrics.totalReward > bestReward) {
      bestReward = client.metrics.totalReward;
      bestClient = client.id;
    }
  },
  
  onFederation: (globalModel, round) => {
    // Analyze global model
    const totalStates = Object.keys(globalModel).length;
    console.log(`Round ${round}: ${totalStates} states in global model`);
  }
});
```

### Pattern 4: Curriculum Learning

```javascript
let episodeCount = 0;
const difficulties = [0.5, 1.0, 1.5, 2.0];
let currentDifficulty = 0;

environment: {
  reset: () => {
    episodeCount++;
    
    // Increase difficulty every 500 episodes
    if (episodeCount % 500 === 0 && currentDifficulty < difficulties.length - 1) {
      currentDifficulty++;
      console.log(`📈 Difficulty increased to level ${currentDifficulty + 1}`);
    }
    
    return { difficulty: difficulties[currentDifficulty], /* ... */ };
  }
}
```

---

## 🧪 Testing Your Components

### Test Pure Functions

```javascript
import { updateQValue, selectAction } from './components/rl-core.js';

// Test Q-learning math
console.assert(
  updateQValue(0, 10, 0, 1.0, 0.9) === 10,
  'Q-update with α=1 should equal target'
);

// Test action selection
const deterministicRandom = () => 0.5;
console.assert(
  selectAction([0.1, 0.9, 0.3], 0.0, deterministicRandom) === 1,
  'Should select action with highest Q-value'
);
```

### Test Federation

```javascript
import { federatedAverage } from './components/federated-core.js';

const model1 = { 'state1': [1, 0], 'state2': [0, 2] };
const model2 = { 'state1': [0, 1], 'state3': [1, 1] };

const avgModel = federatedAverage([model1, model2]);

// Should contain all states
console.assert('state1' in avgModel);
console.assert('state2' in avgModel);
console.assert('state3' in avgModel);

// Should average values
console.assert(avgModel['state1'][0] === 0.5); // (1+0)/2
console.assert(avgModel['state2'][0] === 0);   // (0+0)/2
```

---

## 📖 Examples Breakdown

### Grid World (Ultra Minimal)

**File:** `examples/grid-world-minimal.html`  
**Lines:** ~40 (20 logic, 20 rendering)  
**Demonstrates:** Simplest possible federated RL app

**Key takeaways:**
- Minimal environment definition
- Simple discretization (`${x},${y}`)
- Basic rendering

### Mountain Car

**File:** `examples/mountain-car.html`  
**Lines:** ~100  
**Demonstrates:** Classic RL benchmark as federated task

**Key takeaways:**
- Continuous physics
- State discretization
- Reward shaping
- Visual feedback (velocity arrow)

---

## 🚀 Best Practices

### 1. Start Simple

```javascript
// ❌ Don't start with complex environment
environment: {
  getState: (s) => complexFeatureExtraction(s),
  step: (s, a) => fullPhysicsSimulation(s, a)
}

// ✅ Start simple, iterate
environment: {
  getState: (s) => `${s.x},${s.y}`,
  step: (s, a) => ({ state: { x: s.x + dx, y: s.y + dy }, reward, done })
}
```

### 2. Tune One Parameter at a Time

```javascript
// Start with defaults
{ alpha: 0.1, gamma: 0.95, epsilon: 0.2 }

// Adjust learning rate if not converging
{ alpha: 0.05, gamma: 0.95, epsilon: 0.2 }

// Adjust exploration if stuck
{ alpha: 0.05, gamma: 0.95, epsilon: 0.5 }
```

### 3. Use Hooks for Debugging

```javascript
createFederatedApp({
  // ...
  onEpisodeEnd: (client) => {
    if (client.id === 0 && client.metrics.episodeCount % 100 === 0) {
      console.log('Client 0 progress:', client.metrics);
    }
  },
  onFederation: (model, round) => {
    console.log(`✅ Federation ${round}: ${Object.keys(model).length} states`);
  }
});
```

### 4. Export Models Regularly

```javascript
// Add periodic auto-export
let lastExport = 0;
onFederation: (model, round) => {
  if (round - lastExport >= 10) {
    const json = serializeModel(model, { round });
    // Save to localStorage or download
    lastExport = round;
  }
}
```

---

## 🎓 Learning Path

1. **Day 1**: Run `grid-world-minimal.html`, understand environment API
2. **Day 2**: Modify grid size, add obstacles, change rewards
3. **Day 3**: Try `mountain-car.html`, understand continuous spaces
4. **Day 4**: Build your own task using app template
5. **Day 5**: Compose custom solution with individual components

---

## 🔧 Troubleshooting

### Not Learning?

1. Check reward signal: Is it too sparse?
2. Increase exploration: Higher epsilon
3. Slower decay: Higher epsilonDecay
4. Check state space: Too large? Use discretization

### Federation Not Helping?

1. Federation too frequent? Reduce interval
2. Clients too similar? Add diversity to reset()
3. State overlap too low? Check state representation

### Performance Issues?

1. Reduce numClients (start with 4)
2. Simplify render() function
3. Reduce canvas size
4. Use requestAnimationFrame properly

---

## 💡 Ideas for New Demos

- **Lunar Lander**: Soft landing with thruster control
- **Maze Solver**: Dynamic maze generation
- **Trading Bot**: Multi-asset portfolio management
- **Robotic Arm**: Reach target position
- **Flappy Bird**: Timing and control
- **Inventory Management**: Supply chain optimization

All can be built in <100 lines with the component library!

---

## 🤝 Contributing

To add a new component:

1. Add to appropriate file (`rl-core.js`, `federated-core.js`, etc.)
2. Follow functional programming style
3. Add JSDoc comments
4. Export in default object
5. Add example to README
6. Write tests (optional but recommended)

---

**Happy building! 🚀**
