# Federated Reinforcement Learning Framework

A modular, production-ready framework for federated reinforcement learning in the browser.

## 🚀 Quick Start

```bash
# Start local server (required for ES6 modules)
./start-server.sh
# or
python3 -m http.server 8000
```

**Open in browser:** `http://localhost:8000`

## 📚 What's Included

### **Component Library** (`components/`)
Reusable modules for building Fed-RL apps:
- **rl-core.js** - Pure RL algorithms (Q-learning, ε-greedy)
- **federated-core.js** - Federation logic (FedAvg, model sync)
- **ui-builder.js** - Dashboard, controls, metrics
- **app-template.js** - High-level app builder (combines all components)
- **physics-engine.js** - Matter.js wrapper for realistic physics

### **Working Demos**

#### Original Demos (Refactored with Components)
- **Ball Balancing** - `ball-balancing/index.html`
- **Cart-Pole** - `cart-pole/index.html`

#### Example Demos (Built with Components)
- **Grid World** - `examples/grid-world-minimal.html` (20 lines!)
- **Mountain Car** - `examples/mountain-car.html`
- **Ball Balancing (Physics)** - `examples/ball-balancing-physics.html` (Matter.js)
- **Cart-Pole (Physics)** - `examples/cart-pole-physics.html` (Matter.js)
- **LLM Meta-Learning** - `examples/federated-llm-learning.html` (Ollama)

## 🎯 Features

✅ **Modular Architecture** - Composable components for rapid development  
✅ **Pure Functional RL** - Q-learning, ε-greedy, discretization  
✅ **Federated Averaging** - Correct weighted averaging across all clients  
✅ **Physics Engine** - Matter.js integration for realistic simulations  
✅ **LLM Integration** - Meta-learning for prompt optimization (Ollama)  
✅ **Dynamic Scaling** - 1-100 clients on the fly  
✅ **Auto-Federation** - Episode or performance-based triggers  
✅ **Model Export/Import** - JSON serialization for deployment  
✅ **Inference Mode** - Pure exploitation with trained models  

## 📖 Documentation

- **[START-HERE.md](START-HERE.md)** - Quick reference guide
- **[components/README.md](components/README.md)** - Component API reference
- **[examples/README.md](examples/README.md)** - Demo catalog & learning path
- **[docs/](docs/)** - Architecture, algorithms, comparisons

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    App Template                         │
│  (High-level builder: environment + config → app)       │
└─────────────────────────────────────────────────────────┘
           ▲              ▲              ▲
           │              │              │
    ┌──────┴──────┐  ┌───┴───┐  ┌──────┴──────┐
    │   RL Core   │  │  Fed  │  │ UI Builder  │
    │  Q-learning │  │ Core  │  │  Dashboard  │
    └─────────────┘  └───────┘  └─────────────┘
```

## 🔬 Technical Highlights

- **Q-Learning**: `Q(s,a) ← Q(s,a) + α[r + γ·max(Q(s',a')) - Q(s,a)]`
- **FedAvg**: `θ_global = Σ(n_k/n)·θ_k` (weighted by client episodes)
- **Async Support**: Handles both sync/async step functions
- **Matter.js Physics**: Rigid bodies, constraints, realistic dynamics
- **LLM Meta-Learning**: RL optimizes prompts, federates strategies

## 🎮 Usage Example

```javascript
import { createFederatedRLApp } from './components/app-template.js';

createFederatedRLApp({
    // Define your environment
    environment: {
        actions: ['left', 'right'],
        reset: (clientId) => ({ position: 0 }),
        step: (state, action) => ({
            state: { position: state.position + (action === 1 ? 1 : -1) },
            reward: Math.abs(state.position) < 5 ? 1 : -10,
            done: Math.abs(state.position) >= 10
        }),
        getState: (state) => `${state.position}`
    },
    
    // Optional: custom render
    render: (ctx, state) => {
        ctx.clearRect(0, 0, 400, 400);
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(state.position * 20 + 200, 180, 40, 40);
    }
});
```

**Result:** Full Fed-RL app with 4 clients, auto-federation, metrics, controls!

## 🧪 Known Issues

- LLM demo requires Ollama setup (or runs in mock mode)
- Async step functions may slow down training (sequential execution)
- Large client counts (>50) may impact browser performance

## 🛠️ Development Status

**Current Version:** v1.0 (Production-ready)

**Components:**
- ✅ RL Core (stable)
- ✅ Federated Core (stable)
- ✅ UI Builder (stable)
- ✅ App Template (stable - async support added)
- ✅ Physics Engine (stable - Matter.js)

**Demos:**
- ✅ Ball Balancing (refactored)
- ✅ Cart-Pole (refactored)
- ✅ Grid World (example)
- ✅ Mountain Car (example)
- ✅ Physics Demos (Matter.js)
- ⚠️ LLM Demo (async fix applied, needs testing)

## 🤝 Handoff Notes

See **[HANDOFF.md](HANDOFF.md)** for detailed status and next steps.

## 📄 License

MIT (or your license here)

## 🙏 Credits

Built with functional programming principles, rigorous math notation, and ADHD-friendly concise structure.

