# Inference Methodology Comparison

## Current Issue

User observed: "Inference tab still shows 100 clients. It should now have number of inference tester clients."

This reveals a **fundamental methodological difference** in how to evaluate RL models.

---

## Two Approaches to RL Evaluation

### Approach A: Single Agent, Multiple Episodes (Current Implementation - Industry Standard)

```
┌─────────────────────────────────────┐
│  ONE AGENT (frozen weights)         │
│  ε = 0 (greedy), α = 0 (no learn)   │
└─────────────────────────────────────┘
              ↓
    Run N sequential episodes
    (e.g., 50 episodes)
              ↓
  ┌───────────────────────────────┐
  │ Episode 1: reward = 12.3      │
  │ Episode 2: reward = 15.7      │
  │ Episode 3: reward = 11.2      │
  │ ...                           │
  │ Episode 50: reward = 14.1     │
  └───────────────────────────────┘
              ↓
     Average: μ = 13.4 ± 2.1
```

**Metrics:**
- Mean: Σ(rewards) / 50
- Std: √(Σ(r - μ)² / 50)

### Approach B: Multiple Agents, Episodes Per Agent (User's Suggestion)

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Agent 1      │  │ Agent 2      │  │ Agent 3      │  │ Agent 4      │
│ (same model) │  │ (same model) │  │ (same model) │  │ (same model) │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
    ↓                 ↓                 ↓                 ↓
10 episodes      10 episodes      10 episodes      10 episodes
    ↓                 ↓                 ↓                 ↓
avg: 13.1        avg: 14.2        avg: 12.9        avg: 13.6
    ↓                 ↓                 ↓                 ↓
              Average of averages?
                 OR
              All 40 episodes pooled?
```

**Two ways to compute:**
1. **Average of averages**: (13.1 + 14.2 + 12.9 + 13.6) / 4 = 13.45
2. **Pool all episodes**: All 40 episodes treated as single distribution

---

## Industry Standard (Approach A)

### Used by:
- **OpenAI Gym/Gymnasium**: Evaluation uses single agent, N episodes
- **Stable Baselines3**: `evaluate_policy(model, env, n_eval_episodes=10)`
- **RLlib**: `compute_single_action()` with `explore=False`
- **Research papers**: Report "mean reward over 100 evaluation episodes"

### Why?

1. **Deterministic Policy**: With ε=0, agent always picks best action
   - Multiple agents with same weights = redundant
   - Same model → same behavior

2. **Stochasticity Source**: Environment, not agent
   - Ball spawn position varies
   - Physics may have noise
   - ONE agent over many episodes captures this

3. **Statistical Validity**: 
   - 50 episodes from 1 agent ≈ 50 episodes from 50 agents
   - Central Limit Theorem applies either way

4. **Computational Efficiency**:
   - Sequential: Less memory, easier debugging
   - Parallel: More complex, but possible as optimization

---

## When Multiple Agents Make Sense

### Scenario 1: Speed Optimization (Same Model)
```python
# Run in parallel for speed
agents = [create_frozen_agent(model) for _ in range(4)]
results = run_parallel(agents, episodes_per=10)  # 40 total
aggregate = combine_all_episodes(results)  # Pool all 40
```

**Benefit**: 4x faster wall-clock time
**Result**: Mathematically equivalent to sequential

### Scenario 2: Different Random Seeds
```python
# Test robustness to initialization
agents = [create_frozen_agent(model, seed=i) for i in range(4)]
```

**Benefit**: Tests if performance depends on RNG seed
**Use case**: Identifying overfitting to specific trajectories

### Scenario 3: Ensemble Evaluation (Different Models)
```python
# Test multiple checkpoints
agents = [
    create_frozen_agent(model_checkpoint_100),
    create_frozen_agent(model_checkpoint_200),
    create_frozen_agent(model_checkpoint_300),
]
```

**Benefit**: Compare different training stages
**Use case**: Finding best checkpoint

---

## Mathematical Equivalence (with stochastic environment)

### Approach A: 1 agent × 50 episodes
```
X ~ N(μ, σ²)
samples = 50
```

### Approach B: 4 agents × 12.5 episodes each
```
X ~ N(μ, σ²)
samples = 50 (pooled)
```

**Result**: Identical distribution if:
- Same model weights
- Same environment stochasticity
- Episodes are i.i.d.

---

## Proposed Hybrid Solution

### Option 1: Parallel Evaluation (Speed)
```javascript
// UI: "Test Episodes: 50"  +  "Parallel Agents: 4"
// Runs 50 episodes across 4 agents (12-13 each)
// Aggregates all 50 into single distribution
```

**Pros**: 
- Faster evaluation
- Still reports standard metrics
- Compatible with research papers

**Cons**:
- More complex implementation
- Requires careful synchronization

### Option 2: Keep Current (Standard)
```javascript
// UI: "Test Episodes: 50"
// Runs 50 sequential episodes with 1 agent
// Simple, standard, debuggable
```

**Pros**:
- Industry standard
- Easy to debug
- Matches paper reporting

**Cons**:
- Slower for large N

### Option 3: User Choice
```javascript
// UI: 
// [x] Parallel Evaluation
// Agents: [4]  Episodes: [50]
// "Will run ~12 episodes per agent, totaling 50"
```

**Pros**:
- Flexibility
- Educational (user sees both approaches)

**Cons**:
- More UI complexity

---

## Recommendation

**For Production**: **Option 1 (Parallel)**
- Industry standard metrics
- Faster evaluation
- Best of both worlds

**For Education**: **Option 3 (User Choice)**
- Shows equivalence
- Teaches methodology

---

## Implementation Impact

### Current UI (Single Agent):
```
Inference Mode:
├── Model Source: Latest Training
├── Test Episodes: 50
└── Single canvas with frozen agent
```

### Proposed UI (Parallel):
```
Inference Mode:
├── Model Source: Latest Training
├── Test Episodes: 50
├── Parallel Agents: [1/2/4/8] (optional)
└── Display: [All Agents] or [Aggregate Only]
```

### Code Changes:
```javascript
// Instead of:
runEvaluation({ agent, numEpisodes: 50 })

// Implement:
runParallelEvaluation({ 
    model, 
    numAgents: 4,
    totalEpisodes: 50  // Split across agents
})
```

---

## Question for User

**Which approach do you prefer?**

A. **Keep current** (1 agent, sequential, standard)
   - Simple, debuggable, matches papers
   
B. **Add parallel option** (N agents, split episodes)
   - Faster, still standard metrics
   - Requires implementation work
   
C. **Different methodology** (Please explain your reasoning)
   - Help me understand your use case
   - What problem does multiple agents solve?

**Also clarify:**
- Is speed the concern? (Parallel solves this)
- Is it about robustness testing? (Different seeds)
- Is it conceptual? (Feels more like training mode?)

---

## References

- [Stable Baselines3 Evaluation](https://stable-baselines3.readthedocs.io/en/master/guide/eval.html)
- [OpenAI Spinning Up - Logging and Plotting](https://spinningup.openai.com/en/latest/spinningup/bench.html)
- [RL Paper Checklist](https://rl-paper-checklist.github.io/) - Standard evaluation protocols


