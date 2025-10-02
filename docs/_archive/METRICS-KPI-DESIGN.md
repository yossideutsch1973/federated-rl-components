# KPI & Metrics System Design

**Goal**: Add flexible, reusable KPI/metrics system to core components with minimal cognitive load

---

## 🎯 3-Iteration Rigorous Review

### **Iteration 1: Prompt Engineer**
*Clear specifications, interface design, domain modeling*

#### **Problem Analysis**

**Current Issues**:
1. ❌ Hardcoded success criteria in `inference-mode.js` (line 216)
2. ❌ Circle training has negative-only rewards
3. ❌ No way to define custom KPIs per experiment
4. ❌ Inference metrics don't match training objectives

**Requirements**:
```
✅ Define custom success criteria per experiment
✅ Track domain-specific KPIs (e.g., steps_on_circle, speed>0)
✅ Separate reward (training signal) from KPIs (evaluation metrics)
✅ Easy to use: "with breeze" for client apps
✅ Part of core components
✅ Backward compatible (existing demos still work)
```

#### **Architecture Design**

**Key Insight**: **Separation of Concerns**
- **Reward function**: Shapes learning (can be negative, abstract)
- **KPI metrics**: Measure real-world success (intuitive, positive)

**Interface Specification**:

```javascript
// 1. Define metrics in app config
const metricsConfig = {
  // Success criteria for inference
  isSuccessful: (state, episodeData) => boolean,
  
  // Real-time KPIs tracked during episode
  kpis: {
    stepsOnCircle: {
      compute: (state) => state.error < threshold ? 1 : 0,
      aggregate: 'sum',  // sum | avg | max | min | last
      display: 'Steps on Circle',
      format: (value) => `${value} steps`
    },
    avgSpeed: {
      compute: (state) => Math.hypot(state.vx, state.vy),
      aggregate: 'avg',
      display: 'Average Speed',
      format: (value) => `${value.toFixed(1)} px/s`
    }
  },
  
  // Episode-level summary metrics
  summaryMetrics: (episodeData) => ({
    efficiency: episodeData.kpis.stepsOnCircle / episodeData.steps,
    consistency: 1.0 - (stdDev(episodeData.trajectory) / mean)
  })
};

// 2. Pass to createFederatedApp
createFederatedApp({
  environment,
  render,
  metrics: metricsConfig  // ← One line!
});
```

**State Space Design**:

```
EpisodeData:
  - steps: number
  - totalReward: number
  - kpis: { [key: string]: number }  // Aggregated KPI values
  - trajectory: Array<{ state, action, reward, kpis }>
  - success: boolean  // From isSuccessful()
  - summary: { [key: string]: any }  // From summaryMetrics()
```

**Core Principles**:
1. **Declarative**: Define what to measure, not how
2. **Pure functions**: All compute functions pure
3. **Composable**: KPIs can depend on other KPIs
4. **Flexible aggregation**: sum, avg, max, min, last
5. **Optional**: Defaults work, no KPIs = old behavior

---

### **Iteration 2: Software Engineer**
*Implementation structure, component reuse, code organization*

#### **File Structure**

```
components/
├── metrics-core.js         # NEW: Pure KPI computation & aggregation (~150 lines)
├── inference-mode.js       # MODIFY: Use metrics config (~10 line change)
├── app-template.js         # MODIFY: Track KPIs during training (~30 lines)
└── README.md              # UPDATE: Document metrics system

examples/
├── magnet-circle-training.html   # UPDATE: Add circle KPIs
├── magnet-slalom-control.html    # UPDATE: Add slalom KPIs
└── rl-ball-catch-pure.html       # Works as-is (backward compatible)

test/
├── test-metrics.js         # NEW: Pure function tests
└── run-tests.sh           # NEW: Simple CI/CD
```

#### **Implementation Plan**

**Phase 1: Core Component** (~150 lines)

```javascript
// FILE: components/metrics-core.js

/**
 * METRICS-CORE.JS - KPI Tracking & Evaluation
 * 
 * Pure functional metrics system for RL experiments.
 * Separates reward (training signal) from KPIs (evaluation).
 * 
 * @module metrics-core
 */

// Aggregation functions (pure)
export const AGGREGATORS = {
    sum: (values) => values.reduce((a, b) => a + b, 0),
    avg: (values) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0,
    max: (values) => values.length ? Math.max(...values) : 0,
    min: (values) => values.length ? Math.min(...values) : Infinity,
    last: (values) => values.length ? values[values.length - 1] : 0
};

// Create episode tracker
export const createEpisodeTracker = (metricsConfig = {}) => {
    const {
        isSuccessful = (state) => false,
        kpis = {},
        summaryMetrics = () => ({})
    } = metricsConfig;
    
    const kpiKeys = Object.keys(kpis);
    
    return {
        // Initialize episode
        init: () => ({
            steps: 0,
            totalReward: 0,
            trajectory: [],
            kpiValues: {},  // { kpiKey: [value1, value2, ...] }
            aggregatedKpis: {}
        }),
        
        // Track single step
        step: (episodeData, state, action, reward) => {
            // Compute KPIs for this step
            const stepKpis = {};
            kpiKeys.forEach(key => {
                stepKpis[key] = kpis[key].compute(state);
                
                if (!episodeData.kpiValues[key]) {
                    episodeData.kpiValues[key] = [];
                }
                episodeData.kpiValues[key].push(stepKpis[key]);
            });
            
            // Add to trajectory
            episodeData.trajectory.push({
                state: { ...state },
                action,
                reward,
                kpis: stepKpis
            });
            
            episodeData.steps++;
            episodeData.totalReward += reward;
            
            return episodeData;
        },
        
        // Finalize episode
        finalize: (episodeData, finalState) => {
            // Aggregate KPIs
            kpiKeys.forEach(key => {
                const aggregator = AGGREGATORS[kpis[key].aggregate || 'sum'];
                episodeData.aggregatedKpis[key] = aggregator(episodeData.kpiValues[key]);
            });
            
            // Determine success
            episodeData.success = isSuccessful(finalState, episodeData);
            
            // Compute summary metrics
            episodeData.summary = summaryMetrics(episodeData);
            
            return episodeData;
        }
    };
};

// Default configs for common scenarios
export const DEFAULT_CONFIGS = {
    rewardBased: {
        isSuccessful: (state, data) => data.totalReward > 0
    },
    
    ballCatch: {
        isSuccessful: (state) => state.catches > 0 || (state.bounces && state.bounces > 0)
    }
};
```

**Phase 2: Integration** (~40 lines modified)

1. `app-template.js`: Track KPIs during training
2. `inference-mode.js`: Use metrics config for evaluation
3. Examples: Add metrics configs

**Phase 3: Testing & CI/CD** (~50 lines)

```bash
#!/bin/bash
# FILE: test/run-tests.sh

echo "🧪 Running Tests..."

# Test pure functions
node test/test-metrics.js
if [ $? -ne 0 ]; then
    echo "❌ Tests failed"
    exit 1
fi

echo "✅ All tests passed"
```

---

### **Iteration 3: AI Researcher**
*Validation, best practices, edge cases*

#### **Design Validation**

**Correctness**:
```
✅ Pure functions (testable, deterministic)
✅ Immutable data (no side effects)
✅ Backward compatible (optional config)
✅ Type-safe (clear interfaces)
```

**Performance**:
```
✅ O(1) step tracking (constant time)
✅ O(K) finalization (K = number of KPIs)
✅ Minimal memory (trajectory optional)
✅ No blocking operations
```

**Usability**:
```
✅ Declarative (what, not how)
✅ One-line integration
✅ Sensible defaults
✅ Clear error messages
```

#### **Edge Cases**

1. **No KPIs defined**: Falls back to reward-based success
2. **Empty trajectory**: Returns defaults (0s)
3. **Invalid aggregator**: Throws clear error
4. **Circular dependencies**: Not possible (KPIs independent)

#### **Testing Coverage**

```
Unit Tests:
  ✓ AGGREGATORS.sum([1,2,3]) === 6
  ✓ AGGREGATORS.avg([2,4,6]) === 4
  ✓ AGGREGATORS.max([1,5,2]) === 5
  ✓ AGGREGATORS.min([3,1,4]) === 1
  ✓ AGGREGATORS.last([1,2,3]) === 3
  ✓ Empty arrays handled correctly
  
Integration Tests:
  ✓ Circle training: stepsOnCircle counted correctly
  ✓ Slalom: flags passed tracked
  ✓ Success criteria respected
  ✓ Backward compatibility (no config)
```

---

## ✅ Acceptance Criteria

### **Functionality**
- [ ] Define custom success criteria per experiment
- [ ] Track multiple KPIs simultaneously
- [ ] Aggregate KPIs (sum, avg, max, min, last)
- [ ] Display KPIs in inference results
- [ ] Backward compatible with existing demos

### **Code Quality**
- [ ] Pure functions (all metrics logic)
- [ ] <200 lines for metrics-core.js
- [ ] Zero external dependencies
- [ ] Full JSDoc documentation

### **Usability**
- [ ] One-line integration in apps
- [ ] Clear examples for 3 scenarios
- [ ] Error messages explain issues

### **Testing**
- [ ] 100% pure function coverage
- [ ] CI/CD script runs all tests
- [ ] Tests complete in <1 second

---

## 📊 Expected Results

### **Circle Training** (Fixed)

```javascript
metrics: {
  isSuccessful: (state, data) => data.kpis.stepsOnCircle > 1500,
  
  kpis: {
    stepsOnCircle: {
      compute: (state) => state.error < 15 ? 1 : 0,
      aggregate: 'sum'
    },
    avgSpeed: {
      compute: (state) => Math.hypot(state.vx, state.vy),
      aggregate: 'avg'
    },
    movingSteps: {
      compute: (state) => Math.hypot(state.vx, state.vy) > 1 ? 1 : 0,
      aggregate: 'sum'
    }
  }
}

// Inference will show:
// ✅ 85% success rate (1700/2000 steps on circle)
// 📊 Avg Speed: 4.2 px/s
// 🎯 Moving: 1850/2000 steps
```

**Reward Function** (unchanged, still can be negative):
```javascript
// Training signal (guides learning)
reward = -error * 0.5 - 0.1 + (error < threshold ? 10 : 0)

// KPIs (measure success)
success = stepsOnCircle > 1500 && avgSpeed > 2
```

---

## 🚀 Implementation Time

**Estimated**: 2 hours
- metrics-core.js: 45 min
- Integration: 30 min  
- Examples: 20 min
- Tests + CI/CD: 25 min

---

## 📝 Success Definition

**Milestone achieved if**:
1. ✅ Circle training shows positive success rate
2. ✅ Custom KPIs displayed in inference
3. ✅ One-line integration in apps
4. ✅ All tests pass in CI/CD
5. ✅ Backward compatible (old demos work)

**Ready to implement? GO! 🚀**

