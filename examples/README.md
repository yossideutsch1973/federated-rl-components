# 📖 Component Library Examples

Simple examples demonstrating how to use the Federated RL Component Library.

## ⚠️ IMPORTANT: How to Run

ES6 modules require a web server. **Don't double-click HTML files!**

```bash
# Start server from project root
python3 -m http.server 8000

# Open in browser:
# http://localhost:8000/examples/grid-world-minimal.html
# http://localhost:8000/examples/mountain-car.html
```

---

## Examples

### 1. Grid World (Ultra Minimal)
**File:** `grid-world-minimal.html`  
**Lines:** ~40 total (~20 logic)  
**Description:** Simplest possible federated RL app. Agent navigates 10x10 grid to reach goal.

**Demonstrates:**
- Minimal environment definition
- Basic discretization
- Simple rendering
- Auto-start

**URL:** http://localhost:8000/examples/grid-world-minimal.html

---

### 2. Mountain Car
**File:** `mountain-car.html`  
**Lines:** ~100  
**Description:** Classic RL benchmark. Car must build momentum to reach hilltop.

**Demonstrates:**
- Continuous state space
- State discretization
- Physics simulation
- Reward shaping
- Visual feedback (velocity arrows)
- 16 clients with auto-federation

**URL:** http://localhost:8000/examples/mountain-car.html

---

### 3. Ball Balancing with Physics Engine 🎮
**File:** `ball-balancing-physics.html`  
**Lines:** ~180  
**Description:** Ball balancing using **Matter.js physics engine** instead of manual physics.

**Demonstrates:**
- Real rigid body physics
- Physics engine integration
- Matter.js collision detection
- Heterogeneous gravity across clients
- Clean separation: physics engine handles simulation

**Requirements:** Matter.js (loaded via CDN)  
**URL:** http://localhost:8000/examples/ball-balancing-physics.html

---

### 4. Cart-Pole with Physics Engine 🎮
**File:** `cart-pole-physics.html`  
**Lines:** ~200  
**Description:** Cart-pole with real pendulum physics using **Matter.js hinge constraint**.

**Demonstrates:**
- Real pendulum dynamics
- Constraint-based joint (hinge)
- Accurate physics simulation
- No manual physics coding
- Matter.js rigid bodies

**Requirements:** Matter.js (loaded via CDN)  
**URL:** http://localhost:8000/examples/cart-pole-physics.html

---

### 5. Federated LLM Meta-Learning 🧠
**File:** `federated-llm-learning.html`  
**Lines:** ~470  
**Description:** **Advanced!** Uses local LLMs (via Ollama) with RL to learn optimal prompting strategies, then federates this knowledge.

**Demonstrates:**
- Meta-learning (learning how to use LLMs)
- Real LLM integration (Ollama API)
- Prompt strategy optimization
- Higher-level abstraction (RL controls LLM usage)
- Mock mode (works without Ollama!)
- Practical federated learning use case

**Requirements:** Ollama (optional - has mock mode)  
**URL:** http://localhost:8000/examples/federated-llm-learning.html

**What's Different:**
- Each "client" is an LLM + RL agent combo
- RL learns which prompts work best for different question types
- Federation shares learned prompting strategies (not LLM weights!)
- Demonstrates real-world application of federated meta-learning

---

## Component Usage Comparison

| Feature | Grid World | Mountain Car | Ball (Physics) | Cart-Pole (Physics) | LLM Meta-Learning |
|---------|-----------|--------------|----------------|---------------------|-------------------|
| Lines of code | ~40 | ~100 | ~180 | ~200 | ~470 |
| Complexity | Minimal | Moderate | Moderate | Advanced | **Expert** |
| State space | Discrete | Continuous | Continuous | Continuous | Categorical |
| Physics | Manual | Manual | **Matter.js** 🎮 | **Matter.js** 🎮 | N/A |
| Actions | 4 | 3 | 3 | 2 | 5 (strategies) |
| Clients | 4 | 16 | 8 | 8 | 4 |
| Auto-federation | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| Constraints | ❌ No | ❌ No | ❌ No | ✅ Hinge | ❌ No |
| **Special** | - | - | Physics | Physics | **🧠 LLM + RL** |
| External API | ❌ No | ❌ No | ❌ No | ❌ No | ✅ Ollama |

---

## Learning Path

**🎯 Track 1: Manual Physics (Simple)**
1. **Start here:** `grid-world-minimal.html`
   - Understand the basic environment API
   - See how state, action, reward work
   - Modify grid size, starting position

2. **Next:** `mountain-car.html`
   - Continuous physics
   - State discretization strategies
   - Multi-client coordination

**🎮 Track 2: Physics Engine (Realistic)**
3. **Physics intro:** `ball-balancing-physics.html`
   - Matter.js integration
   - Real rigid body physics
   - Physics state extraction

4. **Advanced physics:** `cart-pole-physics.html`
   - Constraint-based joints (hinge)
   - Complex pendulum dynamics
   - No manual physics coding

**🧠 Track 3: LLM Meta-Learning (Advanced)**
5. **LLM integration:** `federated-llm-learning.html`
   - Using LLMs as environment components
   - Meta-learning (learning how to use LLMs)
   - Prompt strategy optimization
   - Real-world application of federated RL
   - Works in mock mode without Ollama!

**🚀 Next Steps:**
- Use `app-template.js` to create new demos
- See `COMPONENT-LIBRARY-GUIDE.md` for patterns
- Check `components/PHYSICS-ENGINE-GUIDE.md` for physics details
- Read `examples/FEDERATED-LLM-GUIDE.md` for LLM meta-learning

---

## Quick Start Template

Copy this to create your own demo:

```html
<!DOCTYPE html>
<html>
<head>
    <title>My RL Demo</title>
    <style>
        body { margin: 0; padding: 20px; background: #1a1a1a; color: #fff; }
        #app { max-width: 1400px; margin: 0 auto; }
    </style>
</head>
<body>
    <div id="app"></div>
    
    <script type="module">
        import { createFederatedApp } from '../components/app-template.js';
        
        createFederatedApp({
            name: 'My Task',
            numClients: 8,
            
            environment: {
                actions: ['ACTION1', 'ACTION2'],
                getState: (state) => stateString,
                step: (state, action) => ({ state, reward, done }),
                reset: () => initialState
            },
            
            render: (ctx, state) => {
                // Your rendering code
            }
        }).start();
    </script>
</body>
</html>
```

---

## Resources

- **Component API**: `../components/README.md`
- **Usage Guide**: `../COMPONENT-LIBRARY-GUIDE.md`
- **Main Project**: `../README-FEDERATED-RL.md`

---

**Happy building! 🚀**
