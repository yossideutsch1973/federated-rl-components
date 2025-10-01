# Ball Balancing - Federated RL Demo

**✨ Refactored with Component Library!**  
**Before:** ~1000 lines | **After:** ~150 lines | **Reduction:** 85%

## Overview
AI agents learn to keep a falling ball balanced on a moving platform through federated reinforcement learning.

**Implementation:** Uses `app-template.js` from the component library - only environment and rendering logic!

## Files
- **`index.html`** - Main demo (open this in browser)

## Quick Start

**⚠️ Requires local server (ES6 modules):**
```bash
# From project root
python3 -m http.server 8000
# Then open: http://localhost:8000/ball-balancing/index.html
```

1. Open in browser via localhost (not file://)
2. Set number of clients (1-100, default: 16)
3. Click "▶ Start Training"
4. Optionally enable "🤖 Auto-Federate" for automatic knowledge sharing
5. Watch agents learn to balance the ball!

## Features
- **Heterogeneous Physics**: Each client has different gravity, platform speed, friction
- **State Space**: ~3,000-8,000 unique states
- **Actions**: LEFT, STAY, RIGHT
- **Convergence**: 100-200 episodes with 16 clients

## Controls
- **▶ Start Training** - Begin learning
- **🔄 Federate Models** - Manually share knowledge across clients
- **↻ Reset** - Reset all agents
- **💾 Export Model** - Save trained Q-table to JSON
- **📂 Load Model** - Import pre-trained model
- **🎯 Inference Mode** - Toggle pure exploitation (no learning)
- **🤖 Auto-Federate** - Automatic federation every 100 episodes

## Real-World Applications
- Manufacturing: Catching/sorting items on conveyors
- Robotics: Ball catching, juggling robots
- Sports: Tennis/ping-pong robots
- Entertainment: Interactive exhibits

## Parent Documentation
See `../README-FEDERATED-RL.md` for complete project documentation.
