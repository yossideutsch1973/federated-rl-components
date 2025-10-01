# Federated RL Project - Directory Structure

## 📁 Root Level
```
my-prompts-tests/
├── index-federated-rl.html     ⭐ START HERE - Main landing page
├── README-FEDERATED-RL.md      📖 Complete project documentation
├── DIRECTORY-STRUCTURE.md      📋 This file
├── COMPONENT-LIBRARY-GUIDE.md  🎓 Component usage guide
├── COMPONENT-ANALYSIS.md       🔍 Component design analysis
│
├── ball-balancing/             ⚖️ Ball Balancing Demo
│   ├── index.html             (Main demo)
│   └── README.md              (Demo-specific docs)
│
├── cart-pole/                  🎯 Cart-Pole Demo
│   ├── index.html             (Main demo)
│   ├── visual-test.html       (Physics animation test)
│   ├── physics-test.html      (Numerical verification)
│   └── README.md              (Demo-specific docs)
│
├── components/                 🧩 Reusable Component Library (NEW!)
│   ├── rl-core.js             (Pure RL algorithms)
│   ├── federated-core.js      (Federated learning logic)
│   ├── ui-builder.js          (Dashboard components)
│   ├── app-template.js        (Complete app builder)
│   └── README.md              (Component API docs)
│
├── examples/                   📖 Simple Examples (NEW!)
│   ├── grid-world-minimal.html (Ultra minimal demo ~20 lines)
│   ├── mountain-car.html       (Classic RL benchmark)
│   └── README.md               (Examples guide)
│
├── docs/                       📚 Documentation
│   ├── auto-federation-algorithm.md
│   ├── federated-rl-comparison.md
│   ├── federation-analysis.md
│   └── PHYSICS-FIX-OPTIONS.md
│
└── _archive/                   🗄️ Old backups & test files
    ├── federated-rl-demo-backup.html
    ├── federated-rl-demo.html.bak
    ├── debug-check.js
    ├── fedavg-test-comparison.js
    └── test-buttons.html
```

## 🚀 Quick Start

### For Users
1. Open `index-federated-rl.html` in browser
2. Choose a demo (Ball Balancing or Cart-Pole)
3. Follow on-screen instructions

### For Developers
1. Read `README-FEDERATED-RL.md` for architecture
2. Check individual demo folders for specific implementations
3. See `docs/` for algorithm details

## 📂 Folder Descriptions

### `ball-balancing/`
Ball balancing on moving platform demo. Each client has different physics (gravity, friction).

**Key File**: `index.html`

**Characteristics**:
- State space: 3K-8K states
- Actions: LEFT, STAY, RIGHT
- Convergence: 100-200 episodes

### `cart-pole/`
Classic inverted pendulum balancing demo. Each client has different pole length and cart mass.

**Key File**: `index.html`

**Characteristics**:
- State space: 5K-10K states
- Actions: PUSH LEFT, PUSH RIGHT
- Convergence: 50-100 episodes

**Testing Tools**:
- `visual-test.html`: Watch pole fall under gravity
- `physics-test.html`: Verify equations numerically

### `components/` (NEW! 🧩)
**Reusable component library** for building federated RL apps.

**Files**:
- `rl-core.js`: Pure RL algorithms (Q-learning, ε-greedy, etc.)
- `federated-core.js`: FedAvg, model I/O, auto-federation
- `ui-builder.js`: Dashboard components (grids, controls, metrics)
- `app-template.js`: High-level app builder (create demos in ~20 lines!)
- `README.md`: Component API documentation

**Key Features**:
- Zero dependencies
- Pure functional design
- ES6 modules (tree-shakeable)
- Fully testable
- Works anywhere (browser, Node.js)

### `examples/` (NEW! 📖)
**Simple examples** demonstrating component library usage.

**Files**:
- `grid-world-minimal.html`: Ultra minimal demo (~20 lines of logic)
- `mountain-car.html`: Classic RL benchmark (~100 lines)
- `README.md`: Examples guide and learning path

**Use Cases**:
- Learning how to use components
- Quick prototyping
- Reference implementations

### `docs/`
Technical documentation and algorithm descriptions.

**Files**:
- `auto-federation-algorithm.md`: How auto-federation triggers
- `federated-rl-comparison.md`: Compare both demos
- `federation-analysis.md`: Scaling analysis (4/16/100 clients)
- `PHYSICS-FIX-OPTIONS.md`: Cart-pole physics debugging notes

### `_archive/`
Old versions, backups, and debugging scripts. Safe to delete.

## 🎯 Common Tasks

### Run a Demo
```bash
# Ball Balancing
open ball-balancing/index.html

# Cart-Pole
open cart-pole/index.html

# Landing Page
open index-federated-rl.html
```

### Build Your Own Demo (NEW! 🚀)
```bash
# Try minimal example
open examples/grid-world-minimal.html

# Try mountain car
open examples/mountain-car.html

# Read component docs
open components/README.md

# Read usage guide
open COMPONENT-LIBRARY-GUIDE.md
```

### Test Physics
```bash
# Visual animation test
open cart-pole/visual-test.html

# Numerical verification
open cart-pole/physics-test.html
```

### Read Documentation
```bash
# Main README
open README-FEDERATED-RL.md

# Algorithm details
open docs/auto-federation-algorithm.md

# Comparison
open docs/federated-rl-comparison.md
```

## 📝 File Counts

- **Demo Files**: 2 main demos + 2 test tools + 2 examples = 6 HTML files
- **Component Library**: 4 JS modules + 1 README = 5 files
- **Documentation**: 1 main README + 4 technical docs + 2 guides + 3 folder READMEs = 10 markdown files
- **Archive**: 5 backup/debug files
- **Total Active Files**: 21 (demos + components + docs + examples + index)

## 🔄 Version History

- **v1.0**: Initial ball balancing demo
- **v1.1**: Added cart-pole demo
- **v1.2**: Fixed federated averaging bug (now includes ALL states)
- **v1.3**: Added export/import/inference features
- **v1.4**: Simplified cart-pole physics for dramatic effect
- **v1.5**: Organized into folder structure
- **v2.0**: 🧩 Component library! Reusable modules + examples (current)

## 🧹 Maintenance

### Safe to Delete
- `_archive/` - Old backups and test scripts

### Important to Keep
- `index-federated-rl.html` - Entry point
- `README-FEDERATED-RL.md` - Main documentation
- `ball-balancing/` - Demo 1
- `cart-pole/` - Demo 2
- `components/` - 🧩 Component library
- `examples/` - Example implementations
- `docs/` - Technical documentation

### Generated at Runtime
- Exported model JSON files (saved to Downloads)
- Browser console logs
- Performance metrics

---

**Last Updated**: October 2025
**Version**: 2.0 🧩
**Status**: Production Ready + Reusable Components ✅
