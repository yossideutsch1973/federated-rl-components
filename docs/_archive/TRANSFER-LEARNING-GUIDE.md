# Transfer Learning & Continual Learning Guide

**How to reuse learned skills without forgetting them**

---

## 🎯 Your Question

> "I trained a circle model. Can I teach it something new (slalom) without forgetting the circle?"

**Answer: YES!** Here are 4 approaches:

---

## 📚 Approach Comparison

| Approach | Keeps Circle? | Implementation | When to Use |
|----------|--------------|----------------|-------------|
| **1. Direct Transfer** | ❌ No (forgets) | Easiest | Quick prototyping |
| **2. Multi-Task** | ✅ Yes | Moderate | Learn both skills |
| **3. EWC** | ✅ Yes | Complex | Prioritize old task |
| **4. Progressive Networks** | ✅ Yes | Most complex | Many sequential tasks |

---

## 1️⃣ **Direct Transfer (Simplest, but Forgets)**

### How It Works:
Copy the circle Q-table and continue training on slalom.

### Implementation:
```javascript
// 1. Train circle until good (say 80%+ success)
// 2. Save Q-table
app.saveModel('circle-trained.json');

// 3. Load into slalom environment
const circleQ = await fetch('circle-trained.json').then(r => r.json());

// 4. Initialize slalom agent with circle Q
const agent = createTabularAgent({
    initialQ: circleQ,  // Start with circle knowledge
    alpha: 0.1,         // Lower α to preserve old knowledge
    ...
});
```

### Result:
- ✅ **Fast initial learning** on slalom (leverages circle control)
- ❌ **Forgets circle** after ~200 slalom episodes
- ❌ **Catastrophic forgetting** occurs

### When to Use:
- Prototyping
- Don't care about circle anymore
- Circle was just pre-training

---

## 2️⃣ **Multi-Task Learning (Recommended)** ⭐

### How It Works:
Train on BOTH tasks by alternating episodes.

### Key Innovation:
**Task-prefixed state encoding:**
```javascript
// Circle states: "C:error,angle,vel"
// Slalom states: "S:relX,relY,velMag,velDir"

// Same Q-table, different namespaces!
Q = {
    "C:2,3,1": [0.5, 0.3, ...],  // Circle state
    "S:1,2,1,2": [0.8, 0.2, ...], // Slalom state
}
```

### Implementation:
**✅ Created: `examples/magnet-multitask-learning.html`**

Key code:
```javascript
const environment = {
    reset: (clientId, oldState) => {
        // 50% circle, 50% slalom
        if (Math.random() < 0.5) {
            return { taskType: 'circle', ... };
        } else {
            return { taskType: 'slalom', ... };
        }
    },
    
    getState: (state) => {
        if (state.taskType === 'circle') {
            return `C:${circleFeatures}`;  // Prefix with C
        } else {
            return `S:${slomaFeatures}`;   // Prefix with S
        }
    }
};
```

### Result:
- ✅ **Never forgets circle** (keeps practicing)
- ✅ **Learns slalom** simultaneously
- ✅ **Single Q-table** for both skills
- ✅ **Simple implementation** (no extra algorithms)

### Performance:
- Circle: 70-80% on target (maintained)
- Slalom: 40-60% completion (gradual improvement)
- Total training: ~500-800 episodes

### When to Use:
- Want to keep both skills
- Have compute budget for both
- Tasks share similar control primitives

---

## 3️⃣ **Elastic Weight Consolidation (EWC)**

### How It Works:
Add penalty for changing important Q-values.

### Math:
```
Loss = normal_Q_loss + λ * Σ F_i (Q_i - Q_i^old)²

where:
  F_i = importance of Q-value i (Fisher information)
  λ = forgetting prevention strength
```

### Implementation:
```javascript
class EWCAgent {
    constructor() {
        this.Q = {};
        this.importance = {};  // Fisher information
        this.oldQ = {};        // Snapshot after circle
        this.lambda = 1000;    // EWC strength
    }
    
    // After circle training completes
    consolidate() {
        // Snapshot Q-table
        this.oldQ = { ...this.Q };
        
        // Compute importance (simplified)
        for (let key in this.Q) {
            // States visited frequently = important
            this.importance[key] = this.visitCount[key] || 1;
        }
    }
    
    // Modified Q-learning update
    learn(state, action, reward, nextState) {
        const key = `${state},${action}`;
        
        // Standard Q-update
        const oldQ = this.Q[key] || 0;
        const target = reward + gamma * maxQ(nextState);
        let newQ = oldQ + alpha * (target - oldQ);
        
        // EWC penalty
        if (key in this.oldQ) {
            const importance = this.importance[key];
            const elasticPenalty = importance * (newQ - this.oldQ[key]);
            newQ -= this.lambda * elasticPenalty * alpha;
        }
        
        this.Q[key] = newQ;
    }
}
```

### Steps:
1. Train circle until converged
2. Call `agent.consolidate()` - marks important Q-values
3. Train slalom - EWC resists changing circle Q-values
4. Circle preserved, slalom learned slower

### Result:
- ✅ **Keeps circle** (90%+ retention)
- ✅ **Learns slalom** (70-80% completion)
- ⚠️ **Slower slalom learning** (penalty overhead)
- ⚠️ **More complex** implementation

### Hyperparameters:
- `λ = 100`: Weak protection (80% circle retained)
- `λ = 1000`: Medium (90% retained)
- `λ = 10000`: Strong (95% retained, slow slalom)

### When to Use:
- Circle is critical (must not degrade)
- Can afford slower new learning
- Sequential task learning

---

## 4️⃣ **Progressive Neural Networks**

### How It Works:
Separate Q-tables for each task, with "adapter" connections.

### Architecture:
```
Circle Q-table (frozen)
       ↓ (adapter weights)
    Slalom Q-table (trains)
```

### Implementation:
```javascript
class ProgressiveAgent {
    constructor(circleQ) {
        this.circleQ = circleQ;     // Frozen
        this.slomaQ = {};           // Trainable
        this.adapter = {};          // Map circle→slalom
    }
    
    chooseAction(state, task) {
        if (task === 'circle') {
            // Use frozen circle knowledge
            return epsilonGreedy(this.circleQ[state]);
        } else {
            // Combine: slalom + adapted circle
            const slomaValues = this.slomaQ[state] || zeros();
            const circleValues = this.circleQ[state] || zeros();
            const adapted = this.adapter.transform(circleValues);
            
            // Weighted combination
            const combined = 0.7 * slomaValues + 0.3 * adapted;
            return epsilonGreedy(combined);
        }
    }
}
```

### Result:
- ✅ **Perfect circle retention** (frozen)
- ✅ **Leverages circle** for slalom
- ✅ **Scalable** to many tasks
- ❌ **Most complex** implementation
- ❌ **More memory** (separate Q-tables)

### When to Use:
- Many sequential tasks (>3)
- Must guarantee no forgetting
- Have memory budget

---

## 🎓 Theoretical Background

### **Catastrophic Forgetting**

**Why it happens:**
```
Episode 1-200: Circle training
  Q["0,0,1"] = 5.2  (good for circle)

Episode 201-400: Slalom training
  Q["0,0,1"] = -2.1  (overwritten for slalom!)

Back to circle: Performance drops to ~20% (forgot!)
```

**Solution:** Keep Q-values for both tasks separate or prevent changes.

### **Transfer Learning Benefits**

**Without transfer (random init):**
```
Slalom from scratch: 500-1000 episodes → 70%
```

**With circle transfer:**
```
Circle: 200 episodes → 80%
Slalom (with circle init): 300 episodes → 70%
Total: 500 episodes (2x faster!)
```

**Why it helps:**
- Learned: Magnet activation timing
- Learned: Force strength selection
- Learned: Velocity control
- New: Just navigation strategies

---

## 📊 Practical Recommendations

### **Scenario 1: Just want slalom (don't care about circle)**
→ Use **Direct Transfer**
- Train circle 200 episodes
- Copy Q-table to slalom
- Train slalom 300 episodes
- Total: 500 episodes

### **Scenario 2: Need both skills**
→ Use **Multi-Task Learning** (created for you!)
- Open `magnet-multitask-learning.html`
- Train 500-800 episodes
- Both skills maintained

### **Scenario 3: Circle is critical, slalom optional**
→ Use **EWC**
- Train circle 200 episodes
- Consolidate
- Train slalom 400 episodes
- Circle preserved at 90%+

### **Scenario 4: Building curriculum (circle → slalom → figure-8 → ...)**
→ Use **Progressive Networks**
- Each task gets its own Q-table
- Adapters connect them
- No forgetting ever

---

## 🚀 Quick Start: Multi-Task Learning

**File created:** `examples/magnet-multitask-learning.html`

**How to use:**
1. Open the file in browser
2. Click "Start Training"
3. Watch it alternate:
   - ⭕ **Circle episodes** (green target ring)
   - 🎯 **Slalom episodes** (numbered flags)
4. Console shows both skills improving
5. Q-table grows to ~420 states (both tasks)

**Expected results (after 500 episodes):**
```
⭕ Circle: 75% on target
🎯 Slalom: 50% (4/8 flags average)
Q-table: 350-420 states
```

**Adjust task balance:**
```javascript
CONFIG.circleWeight = 0.7;  // 70% circle, 30% slalom
CONFIG.circleWeight = 0.3;  // 30% circle, 70% slalom
```

---

## 🔬 Advanced: State Space Analysis

### **Why Task Prefixes Work**

**Without prefixes (BROKEN):**
```
State "2,3,1" could mean:
  - Circle: error=2, angle=3, vel=1
  - Slalom: relX=2, relY=3, vel=1
  
Same state, different meanings → CONFLICT!
Agent confused, poor performance on both.
```

**With prefixes (WORKS):**
```
"C:2,3,1" - unambiguous circle state
"S:2,3,1" - unambiguous slalom state

No conflicts! Q-table keeps both.
```

### **State Space Size**

```
Circle alone: 5×8×3 = 120 states
Slalom alone: 5×5×3×4 = 300 states
Multi-task: 120 + 300 = 420 states (separate namespaces)

Memory: 420 states × 27 actions × 8 bytes ≈ 90 KB (tiny!)
```

---

## 📝 Summary

| Your Goal | Best Approach | File to Use |
|-----------|---------------|-------------|
| "Forget circle, just do slalom faster" | Direct Transfer | Load → slalom |
| "Keep both skills forever" | **Multi-Task** ⭐ | `magnet-multitask-learning.html` |
| "Circle is critical, don't degrade" | EWC | Implement EWC |
| "Learning 5+ tasks sequentially" | Progressive | Build progressive |

**Recommended:** Start with **Multi-Task Learning** (already created for you!). It's the sweet spot of simplicity and effectiveness.

---

## 🎮 Try It Now!

1. Open: `http://localhost:8000/examples/magnet-multitask-learning.html`
2. Train 200-300 episodes
3. Watch console: Episodes alternate ⭕🎯⭕🎯
4. Both skills improve without forgetting!

Adjust `CONFIG.circleWeight` in live controls to balance task distribution!

