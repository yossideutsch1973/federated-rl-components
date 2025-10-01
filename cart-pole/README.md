# Cart-Pole Balance - Federated RL Demo

**✨ Refactored with Component Library!**  
**Before:** ~900 lines | **After:** ~170 lines | **Reduction:** 81%

## Overview
Classic inverted pendulum problem where AI agents learn to balance a pole on a moving cart through federated reinforcement learning.

**Implementation:** Uses `app-template.js` from the component library - only environment and rendering logic!

## Files
- **`index.html`** - Main demo (open this in browser)
- **`visual-test.html`** - Visual physics verification (pole falling animation)
- **`physics-test.html`** - Numerical physics verification test

## Quick Start

**⚠️ Requires local server (ES6 modules):**
```bash
# From project root
python3 -m http.server 8000
# Then open: http://localhost:8000/cart-pole/index.html
```

1. Open in browser via localhost (not file://)
2. Set number of clients (1-100, default: 16)
3. Click "▶ Start Training"
4. Watch poles fall initially, then see agents learn to balance!

## Features
- **Heterogeneous Physics**: Each client has different pole length, cart mass, friction
- **State Space**: ~5,000-10,000 unique states
- **Actions**: PUSH LEFT, PUSH RIGHT
- **Convergence**: 50-100 episodes with 16 clients
- **Simplified Physics**: Uses basic pendulum equation for dramatic falling effect

## Physics Model
The simulation uses a simplified pendulum model:

```
θ̈ = (g/L) · sin(θ) - damping · θ̇ + cart_coupling

Where:
- g = 15.0 (high gravity for visible acceleration)
- L = pole length (varies per client: 42-78 cm)
- damping = 0.01 (low for dramatic motion)
```

## Controls
- **▶ Start Training** - Begin learning
- **🔄 Federate Models** - Manually share knowledge across clients
- **↻ Reset** - Reset all agents
- **💾 Export Model** - Save trained Q-table to JSON
- **📂 Load Model** - Import pre-trained model
- **🤖 Auto-Federate** - Automatic federation every 50 episodes

## Testing Tools

### Visual Test (`visual-test.html`)
- Shows single pole falling under gravity
- No agent control
- Verifies physics work correctly
- Shows angular velocity and acceleration

### Physics Test (`physics-test.html`)
- Numerical verification
- Text output showing step-by-step calculations
- Confirms physics equations

## Real-World Applications
- Robotics: Bipedal walking, humanoid balance
- Control Systems: Crane stabilization, satellite orientation
- Manufacturing: Balancing products on conveyors
- Research: Standard RL benchmark since 1983

## Troubleshooting
- **Poles not falling?** → Open `visual-test.html` to verify physics
- **Too slow?** → Increase client count to 50 or 100
- **Not learning?** → Enable auto-federate and wait 50-100 episodes

## Parent Documentation
See `../README-FEDERATED-RL.md` for complete project documentation.
