# Next Session: Electromagnetic Slalom Control

**Goal**: Test component library reusability by building a new federated RL scenario

---

## 🎯 Mission

Build a **magnetic field control system** where 8 binary magnets guide a ferromagnetic object through a slalom course.

**Success Criteria**:
- ✅ Reuse ≥85% of existing components
- ✅ Custom code <300 lines (environment + render only)
- ✅ Converges in 500-1000 episodes
- ✅ Success rate >70% after training

---

## 📋 Expert AI Software Engineer Prompt (3-Iteration Review)

### **Iteration 1: Prompt Engineer**
*Clear specifications, state/action spaces, reward shaping*

#### **Environment Specification**

**Physical Setup**:
```
Arena: 400×400 canvas
8 Magnets: Fixed positions around perimeter (evenly spaced 45°)
Object: 10×10 ferromagnetic unit
Course: 8 flags in zigzag slalom pattern
Control: Each magnet binary on/off
```

**Magnet Positions** (evenly spaced):
```javascript
const MAGNETS = [
    {x: 200, y: 20},    // N
    {x: 340, y: 60},    // NE
    {x: 380, y: 200},   // E
    {x: 340, y: 340},   // SE
    {x: 200, y: 380},   // S
    {x: 60, y: 340},    // SW
    {x: 20, y: 200},    // W
    {x: 60, y: 60}      // NW
];
```

**Physics Model** (Custom field-based):
```
Magnetic Force (per magnet):
  F_mag = k / r²
  Direction: towards magnet when ON
  k = 500 (magnet strength constant)
  r = distance, clamped to ≥10 (prevent singularity)

Total Force:
  F_total = Σ F_mag_i for all active magnets

Dynamics:
  vx' = vx × 0.9 + fx  (friction = 0.9)
  vy' = vy × 0.9 + fy
  |v| ≤ 8 (max velocity clamp)
  x' = x + vx'
  y' = y + vy'
```

**State Space Design**:
```
Continuous 6D input:
  - Object: (x, y, vx, vy)
  - Next flag: (fx, fy) - relative position

Discretized 4D output:
  - relX: discretize(flag.x - obj.x, 5 bins, [-200, 200])
  - relY: discretize(flag.y - obj.y, 5 bins, [-200, 200])
  - vMag: discretize(‖v‖, 3 bins, [0, 8])
  - vDir: discretize(atan2(vy, vx), 4 bins, [-π, π])

State space size: 5×5×3×4 = 300 states

Rationale:
  - Relative position: Task-relevant (not absolute)
  - Velocity polar: Direction + magnitude sufficient
  - Magnet states: Captured implicitly via dynamics
```

**Action Space**:
```
9 Directional Presets (optimal for tabular RL):

  [0,0,0,0,0,0,0,0]  # 0: All off
  [1,0,0,0,0,0,0,0]  # 1: N  (top)
  [0,0,1,0,0,0,0,0]  # 2: E  (right)
  [0,0,0,0,1,0,0,0]  # 3: S  (bottom)
  [0,0,0,0,0,0,1,0]  # 4: W  (left)
  [1,0,1,0,0,0,0,0]  # 5: NE (diagonal)
  [0,0,1,0,1,0,0,0]  # 6: SE (diagonal)
  [0,0,0,0,1,0,1,0]  # 7: SW (diagonal)
  [1,0,0,0,0,0,1,0]  # 8: NW (diagonal)

Why 9 not 256 (2^8)?
  - Tabular Q-learning: 300 states × 256 actions = 76,800 Q-values
  - Too large to converge efficiently
  - 9 presets: 300 × 9 = 2,700 Q-values (manageable)
  - Covers all directions + "off" option
```

**Reward Shaping**:
```
Formula: r(s,a,s') = r_flag + r_time + r_energy + r_proximity

Components:
  r_flag = +100 × δ_flag      # Passed through flag
  r_time = -0.1               # Per step (encourage speed)
  r_energy = -0.01 × n_active # Energy cost (n_active = count of ON magnets)
  r_proximity = +5 × (1 - d/d_max)  # Reward for approaching flag
    where d = distance to next flag, d_max = 400

Episode termination:
  done = True if:
    - All flags passed (success)
    - Steps > 500 (timeout)

Expected returns:
  Success (8 flags, ~400 steps):
    G ≈ 8×100 - 400×0.1 - 400×0.02 + ~100
      ≈ 800 - 40 - 8 + 100 = +852
  
  Timeout (no flags):
    G ≈ -500×0.1 - 500×0.02
      ≈ -50 - 10 = -60
  
  Good separation: +852 vs -60
```

**Success Metrics**:
```
Training:
  - Flags passed per episode (0-8)
  - Episode length (steps, lower is better)
  - Success rate (% completing all flags)
  - Energy efficiency (avg active magnets per step)

Convergence:
  - Q-table coverage (% of 300 states explored)
  - Federation delta (Δ < 0.01 indicates convergence)
  - Policy stability (action entropy)

Inference (frozen agent, ε=0):
  - Success rate over 50 episodes
  - Mean completion time
  - Total energy consumption
  - Path smoothness (Σ |Δv|)
```

---

### **Iteration 2: Software Engineer**
*Component reusability, DI pattern, minimal custom code*

#### **Component Reuse Analysis**

**✅ MUST Reuse** (saves ~1,950 lines):

| Component | Purpose | Lines Saved |
|-----------|---------|-------------|
| `createFederatedApp()` | Full orchestrator | ~700 |
| `rl-core.js` | Q-learning, discretize | ~200 |
| `ui-builder.js` | All UI components | ~300 |
| `mode-switcher.js` | Training/inference | ~200 |
| `model-persistence.js` | Save/load/export | ~250 |
| `federated-core.js` | FedAvg, delta | ~300 |

**❌ CANNOT Reuse**:
- `physics-engine.js` - Built for Matter.js (collision physics)
- Magnetic forces are **field-based** (F = k/r²), not collision-based
- Need custom physics (~50 lines)

**Target**: 89% reuse, 11% custom (250 lines total)

---

#### **Implementation Structure**

```javascript
// FILE: examples/magnet-slalom-control.html
// TOTAL: ~250 lines

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>🧲 Electromagnetic Slalom Control</title>
    <style>
        body { margin: 0; padding: 20px; 
               background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
               color: #fff; font-family: monospace; }
        #app { max-width: 1800px; margin: 0 auto; }
    </style>
</head>
<body>
    <div id="app"></div>
    <script type="module">
        // ====================================================================
        // IMPORTS (✅ Using component library)
        // ====================================================================
        import { createFederatedApp } from '../components/app-template.js';
        import { discretize } from '../components/rl-core.js';

        // ====================================================================
        // CONFIGURATION (DI Principle)
        // ====================================================================
        
        const PHYSICS_CONFIG = {
            magnetStrength: 500,  // k in F = k/r²
            minDistance: 10,      // Prevent r=0 singularity
            friction: 0.9,        // Velocity decay per step
            maxVelocity: 8,       // Speed limit
            flagRadius: 20,       // Capture distance
            dt: 1.0               // Time step
        };

        const MAGNETS = [
            {x: 200, y: 20},    // N
            {x: 340, y: 60},    // NE
            {x: 380, y: 200},   // E
            {x: 340, y: 340},   // SE
            {x: 200, y: 380},   // S
            {x: 60, y: 340},    // SW
            {x: 20, y: 200},    // W
            {x: 60, y: 60}      // NW
        ];

        // ====================================================================
        // PURE FUNCTIONS (Functional Programming)
        // ====================================================================

        /**
         * Apply magnetic forces to object
         * Formula: F = Σ(k/r² × direction) for active magnets
         * @pure
         * @param {Object} state - Current state {x, y, vx, vy}
         * @param {Array} action - Magnet states [0|1, ...]
         * @param {Object} config - Physics config
         * @returns {Object} New physics state {x, y, vx, vy}
         */
        const applyMagneticForces = (state, action, config = PHYSICS_CONFIG) => {
            let fx = 0, fy = 0;
            
            // Sum forces from all active magnets
            action.forEach((magnetOn, i) => {
                if (!magnetOn) return;
                
                const mag = MAGNETS[i];
                const dx = mag.x - state.x;
                const dy = mag.y - state.y;
                const r = Math.max(
                    Math.hypot(dx, dy), 
                    config.minDistance
                );
                
                const forceMag = config.magnetStrength / (r * r);
                fx += forceMag * dx / r;
                fy += forceMag * dy / r;
            });
            
            // Update velocity with friction
            let vx = state.vx * config.friction + fx * config.dt;
            let vy = state.vy * config.friction + fy * config.dt;
            
            // Clamp velocity
            const vMag = Math.hypot(vx, vy);
            if (vMag > config.maxVelocity) {
                const scale = config.maxVelocity / vMag;
                vx *= scale;
                vy *= scale;
            }
            
            // Update position
            const x = state.x + vx * config.dt;
            const y = state.y + vy * config.dt;
            
            return { x, y, vx, vy };
        };

        /**
         * State to key mapping (discretization)
         * Formula: key = "relX,relY,vMag,vDir"
         * @pure
         * @param {Object} state - Current state
         * @returns {string} State key for Q-table
         */
        const stateToKey = (state) => {
            const flag = state.flags[state.currentFlag];
            if (!flag) return '0,0,0,0';
            
            // Relative position to next flag
            const relX = flag.x - state.x;
            const relY = flag.y - state.y;
            
            // Velocity in polar coordinates
            const vMag = Math.hypot(state.vx, state.vy);
            const vDir = Math.atan2(state.vy, state.vx);
            
            // Discretize (✅ using rl-core.js)
            const rx = discretize(relX, 5, -200, 200);
            const ry = discretize(relY, 5, -200, 200);
            const vm = discretize(vMag, 3, 0, 8);
            const vd = discretize(vDir, 4, -Math.PI, Math.PI);
            
            return `${rx},${ry},${vm},${vd}`;
        };

        /**
         * Compute reward with energy penalty
         * Formula: r = r_flag + r_time + r_energy + r_proximity
         * @pure
         */
        const computeReward = (state, action, newState, config = PHYSICS_CONFIG) => {
            let reward = -0.1; // Time penalty
            
            // Energy cost
            const activeMagnets = action.filter(m => m === 1).length;
            reward -= 0.01 * activeMagnets;
            
            // Flag passage bonus
            if (newState.currentFlag > state.currentFlag) {
                reward += 100;
            } else {
                // Proximity shaping
                const flag = state.flags[state.currentFlag];
                if (flag) {
                    const dist = Math.hypot(newState.x - flag.x, newState.y - flag.y);
                    reward += 5 * (1 - dist / 400);
                }
            }
            
            return reward;
        };

        // ====================================================================
        // RL ENVIRONMENT (✅ Using app-template.js pattern)
        // ====================================================================

        const ACTIONS = [
            [0,0,0,0,0,0,0,0], // All off
            [1,0,0,0,0,0,0,0], // N
            [0,0,1,0,0,0,0,0], // E
            [0,0,0,0,1,0,0,0], // S
            [0,0,0,0,0,0,1,0], // W
            [1,0,1,0,0,0,0,0], // NE
            [0,0,1,0,1,0,0,0], // SE
            [0,0,0,0,1,0,1,0], // SW
            [1,0,0,0,0,0,1,0]  // NW
        ];

        const environment = {
            actions: ACTIONS,
            
            getState: (state) => stateToKey(state),
            
            step: (state, actionIdx) => {
                const action = ACTIONS[actionIdx];
                
                // Apply physics
                const newPhysics = applyMagneticForces(state, action);
                
                // Check flag passage
                let currentFlag = state.currentFlag;
                const flag = state.flags[currentFlag];
                
                if (flag) {
                    const dist = Math.hypot(newPhysics.x - flag.x, newPhysics.y - flag.y);
                    if (dist < PHYSICS_CONFIG.flagRadius) {
                        currentFlag++;
                    }
                }
                
                // Build new state
                const newState = {
                    ...state,
                    ...newPhysics,
                    currentFlag,
                    steps: state.steps + 1
                };
                
                // Compute reward
                const reward = computeReward(state, action, newState);
                
                // Check termination
                const done = currentFlag >= state.flags.length || state.steps > 500;
                
                return { state: newState, reward, done };
            },
            
            reset: (clientId, oldState) => {
                // Generate random slalom course
                const flags = [];
                for (let i = 0; i < 8; i++) {
                    flags.push({
                        x: 100 + Math.random() * 200,
                        y: 50 + i * 40
                    });
                }
                
                return {
                    x: 200,
                    y: 380,
                    vx: 0,
                    vy: 0,
                    flags,
                    currentFlag: 0,
                    steps: 0
                };
            }
        };

        // ====================================================================
        // RENDERING (Custom visualization)
        // ====================================================================

        const render = (ctx, state, client) => {
            // Clear
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, 400, 400);
            
            // Get current action
            const action = client.lastAction !== undefined ? 
                          ACTIONS[client.lastAction] : 
                          [0,0,0,0,0,0,0,0];
            
            // Draw magnets with field lines
            MAGNETS.forEach((mag, i) => {
                const active = action[i] === 1;
                
                // Magnet body
                ctx.fillStyle = active ? '#ef4444' : '#475569';
                ctx.beginPath();
                ctx.arc(mag.x, mag.y, 8, 0, Math.PI * 2);
                ctx.fill();
                
                // Field lines when active
                if (active) {
                    ctx.strokeStyle = 'rgba(239, 68, 68, 0.15)';
                    ctx.lineWidth = 1;
                    for (let r = 20; r < 150; r += 30) {
                        ctx.beginPath();
                        ctx.arc(mag.x, mag.y, r, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                }
            });
            
            // Draw flags
            state.flags.forEach((flag, i) => {
                const passed = i < state.currentFlag;
                const current = i === state.currentFlag;
                
                if (passed) {
                    // Passed flag (checkmark)
                    ctx.strokeStyle = '#10b981';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(flag.x, flag.y, 20, 0, Math.PI * 2);
                    ctx.stroke();
                } else {
                    // Upcoming flag
                    ctx.fillStyle = current ? '#22c55e' : '#64748b';
                    ctx.beginPath();
                    ctx.arc(flag.x, flag.y, 20, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Flag number
                    ctx.fillStyle = '#fff';
                    ctx.font = '12px monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText(i + 1, flag.x, flag.y + 4);
                }
            });
            
            // Draw object
            ctx.fillStyle = '#3b82f6';
            ctx.fillRect(state.x - 5, state.y - 5, 10, 10);
            
            // Velocity vector
            if (Math.hypot(state.vx, state.vy) > 0.1) {
                ctx.strokeStyle = '#22d3ee';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(state.x, state.y);
                ctx.lineTo(state.x + state.vx * 5, state.y + state.vy * 5);
                ctx.stroke();
            }
            
            // Stats
            ctx.fillStyle = '#fff';
            ctx.font = '10px monospace';
            ctx.textAlign = 'left';
            ctx.fillText(`Flags: ${state.currentFlag}/${state.flags.length}`, 10, 15);
            ctx.fillText(`Steps: ${state.steps}`, 10, 30);
            ctx.fillText(`Speed: ${Math.hypot(state.vx, state.vy).toFixed(1)}`, 10, 45);
            
            // Active magnets
            const activeCount = action.filter(m => m === 1).length;
            ctx.fillText(`Magnets: ${activeCount}/8`, 10, 60);
        };

        // ====================================================================
        // CREATE APP (✅ Testing component template)
        // ====================================================================

        console.log('🧲 Electromagnetic Slalom Control');
        console.log('State Space: 5×5×3×4 = 300 states');
        console.log('  - RelX to flag: 5 bins [-200, 200]');
        console.log('  - RelY to flag: 5 bins [-200, 200]');
        console.log('  - Velocity magnitude: 3 bins [0, 8]');
        console.log('  - Velocity direction: 4 bins [-π, π]');
        console.log('Action Space: 9 directional presets (8 directions + off)');
        console.log('Physics: Field-based (F = k/r²), not collision-based');
        console.log('Magnets: 8 around perimeter, binary on/off control');

        createFederatedApp({
            name: '🧲 Electromagnetic Slalom',
            subtitle: '8 magnets • Field physics • Energy-efficient navigation',
            
            numClients: 4,
            canvasWidth: 400,
            canvasHeight: 400,
            
            // Hyperparameters
            alpha: 0.15,         // Higher than ball catch (sparser rewards)
            gamma: 0.95,         // High (long-term planning needed)
            epsilon: 0.3,        // Standard initial exploration
            epsilonDecay: 0.995,
            minEpsilon: 0.001,   // Ultra-low for near-pure exploitation
            
            // Federation
            autoFederate: false,
            federationInterval: 100,
            
            // Environment
            environment,
            render,
            
            // Lifecycle
            onEpisodeEnd: (client, completedEpisode) => {
                const success = client.state.currentFlag >= client.state.flags.length;
                const rate = Math.round(client.state.currentFlag / client.state.flags.length * 100);
                const qSize = Object.keys(client.agent.getModel()).length;
                
                console.log(`Client ${client.id}: ${client.state.currentFlag}/8 flags (${rate}%), Q: ${qSize} states, ε=${client.agent.getEpsilon().toFixed(3)}`);
            }
        });
    </script>
</body>
</html>
```

---

### **Iteration 3: AI Researcher**
*RL rigor, convergence analysis*

#### **Q-Learning Convergence**

**Conditions**:
```
1. ✅ All (s,a) visited infinitely often (ε-greedy ensures)
2. ⚠️ Learning rate: Σα_t = ∞, Σα_t² < ∞
   - Using fixed α = 0.15 violates condition
   - Acceptable for continuous learning (non-stationary)
3. ✅ Bounded rewards: |r| ∈ [-60, +100]

With α = 0.15 (fixed):
  - Fast initial learning
  - May not converge to true Q*
  - Good for practical applications

Expected convergence:
  - State space: 300 states
  - With ε-greedy: ~3 visits per state minimum
  - Total visits needed: 900-1500
  - With 4 clients: 250-400 episodes per client
```

**Hyperparameter Justification**:
```
α = 0.15 (vs 0.1 for ball catch):
  - Higher because flags are sparser rewards
  - Ball catch: ~10-20 bounces per episode
  - Magnet slalom: 8 flags (less frequent)
  - Need faster learning from sparse signals

γ = 0.95 (same as ball catch):
  - High discount for long-term planning
  - Slalom requires anticipation (next flag, not just current)

ε decay: 0.3 → 0.001 over ~1380 episodes:
  - Ultra-low exploration for near-pure exploitation
  - With 4 clients: ~345 episodes per client to reach 0.001
```

---

## ✅ Acceptance Criteria

### **Functionality** (Must Pass)
- [ ] 4 clients train simultaneously
- [ ] Object moves via magnetic forces (realistic field behavior)
- [ ] Flags detected when object passes through (within 20px)
- [ ] Episode resets with new random slalom course
- [ ] Success rate increases over time

### **Component Reusability** (Goal: ≥85%)
- [ ] Uses `createFederatedApp` (no custom app orchestrator)
- [ ] Uses `createTabularAgent` (no custom Q-learning)
- [ ] Uses `discretize` (no custom discretization)
- [ ] No new UI components needed
- [ ] Custom code <300 lines (target: ~250)
- [ ] **Reuse calculation**: (1950 reused) / (1950 + 250 custom) × 100% = **89%** ✅

### **RL Rigor** (Quality Standards)
- [ ] State space documented (300 states formula)
- [ ] Action space justified (9 vs 256 explained)
- [ ] Reward formula in code comments
- [ ] Hyperparameters logged at startup
- [ ] Convergence criteria defined

### **Performance** (Benchmarks)
- [ ] Converges in 500-1000 episodes (4 clients)
- [ ] Final success rate >70%
- [ ] Q-table size 200-300 states (good coverage)
- [ ] Federation time <10ms

---

## 🔬 Validation Questions

After implementation, answer these to assess template quality:

### **1. Was the 3-step API sufficient?**
```
3 steps: environment, render, createFederatedApp({...})
Did you need anything else?
Yes / No / Explain
```

### **2. Did you need to modify any components?**
```
Modified: None / app-template.js / rl-core.js / ...
Reason: N/A / Bug fix / Feature addition / ...
```

### **3. What was the hardest part?**
```
Options:
  - Physics implementation (magnetic forces)
  - Reward shaping (tuning coefficients)
  - State discretization (choosing bins)
  - Convergence debugging
  - Visualization (rendering)
```

### **4. Does it converge?**
```
Metrics:
  - Episodes to 50% success: ___
  - Episodes to 70% success: ___
  - Final success rate: ___%
  - Q-table coverage: ___/300 states
```

### **5. Is it reusable?**
```
Could you build:
  - Magnetic maze navigation? Yes / No
  - Multi-object magnet control? Yes / No
  - Variable magnet strengths? Yes / No
  
Ease of reuse: Easy / Medium / Hard
```

---

## 📊 Expected Results

### **Training Progress** (4 clients)
```
Episode 0-100:
  Success rate: 0-10%
  Q-table: 50-100 states explored
  
Episode 100-300:
  Success rate: 10-40%
  Q-table: 150-250 states
  Learning: Basic directional control
  
Episode 300-500:
  Success rate: 40-70%
  Q-table: 250-300 states (full coverage)
  Learning: Energy-efficient paths
  
Episode 500-1000:
  Success rate: 70-85%
  Q-table: Stable (converged)
  Policy: Near-optimal slalom navigation
```

### **Final Performance**
```
Inference metrics (frozen agent, 50 episodes):
  - Success rate: 75-85%
  - Mean steps per success: 300-400
  - Energy efficiency: 1.5-2.5 avg magnets/step
  - Path smoothness: Low velocity variance
```

---

## 🚀 Implementation Time Estimate

**If component library is truly reusable**:
- Setup + environment: 30 min
- Rendering: 30 min
- Testing + tuning: 60 min
- **Total: ~2 hours**

**If library has issues**:
- Debugging component bugs: +2 hours
- Implementing missing features: +3 hours
- **Total: ~7 hours**

---

## 📝 Deliverable

**Single file**: `examples/magnet-slalom-control.html`

**Documentation in file**:
```javascript
/**
 * ELECTROMAGNETIC SLALOM CONTROL
 * 
 * Tests component library reusability with field-based physics.
 * 
 * State: 300 states (relX, relY, vMag, vDir)
 * Actions: 9 directional presets
 * Reward: r = +100·flag - 0.1·time - 0.01·energy + proximity
 * 
 * Custom code: ~250 lines (11%)
 * Reused code: ~1,950 lines (89%)
 */
```

---

## 🎯 Success Definition

**Milestone achieved if**:
1. ✅ Implementation takes <3 hours
2. ✅ Reuse ≥85% of components
3. ✅ Converges to >70% success rate
4. ✅ No modifications to core library needed

**This proves**: Component library is production-ready for new RL scenarios!

---

**Ready to implement? GO! 🚀**

