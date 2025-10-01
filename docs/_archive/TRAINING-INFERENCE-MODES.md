# Training/Inference Mode System

## Overview

The federated RL system now features **complete separation** between training and inference modes, following 2025 RL best practices.

## 🎯 Key Features

### Training Mode (🧠)
- **Multi-client learning**: 4 agents learning simultaneously
- **Federation**: FedAvg with configurable intervals
- **Live metrics**: Q-table growth, epsilon decay, episodes
- **Model persistence**: Save checkpoints to localStorage or file

### Inference Mode (🎯)
- **Frozen weights**: ε = 0 (greedy policy), α = 0 (no learning)
- **Evaluation runner**: N episodes (10/25/50/100)
- **Aggregate metrics**: Success rate, mean reward ± std, consistency score
- **Single agent**: Clean visualization of evaluation

## 🚀 Quick Start

### 1. Training Phase

```javascript
// Training happens automatically when you click "Start"
// The system uses 4 clients learning in parallel
```

**Actions:**
- **▶ Start/⏸ Pause**: Control training
- **🔄 Federate**: Manually trigger federation round
- **💾 Save Checkpoint**: Save current model to localStorage
- **📥 Export**: Download model as JSON file
- **↻ Reset**: Restart training from scratch

**Watch for:**
- Q-table growing (states explored)
- Epsilon decaying (exploration → exploitation)
- Success rate improving

### 2. Switch to Inference

Click the **🎯 Inference** tab to enter evaluation mode:

1. Training automatically pauses
2. Latest model is saved to localStorage
3. UI switches to single-agent view
4. Inference controls appear

### 3. Run Evaluation

**Choose model source:**
- **Latest Training Session**: Uses last trained model from localStorage
- **Load from File**: Upload a previously exported .json model

**Select test episodes:**
- 10, 25, 50, or 100 episodes

**Click ▶ Run Evaluation:**
- Agent runs with frozen weights (no learning)
- Progress bar shows completion
- Real-time visualization on canvas
- Metrics update live

### 4. Review Results

After evaluation completes:

```
📊 Evaluation Results
═══════════════════════

SUCCESS RATE: 87%
43/50 successful

MEAN REWARD: 12.4 ± 3.2
σ = 3.18

CONSISTENCY SCORE: ████████░░ 82%
```

**Metrics explained:**
- **Success Rate**: % of episodes where agent succeeded
- **Mean Reward**: Average reward per episode
- **Std Deviation (σ)**: Reward variability
- **Consistency**: 1 - (σ / |mean|), higher = more consistent

**Actions:**
- **📊 Export Results**: Download evaluation metrics as JSON
- **⏹ Stop**: Cancel running evaluation

### 5. Back to Training

Click the **🧠 Training** tab:
- Training clients restored
- Can continue training from where you left off
- Or reset and start fresh

## 📊 Model Persistence

### Three Storage Options

1. **localStorage (automatic)**
   - Saved on mode switch
   - Saved on "Save Checkpoint"
   - Key: `${appName}-latest`
   - ⚠️ Limited to ~5-10MB

2. **JSON Export (manual)**
   - Click "📥 Export" in training mode
   - Downloads: `app-name-model-timestamp.json`
   - Contains: model weights + metadata

3. **Inference Results Export**
   - Click "📊 Export Results" after evaluation
   - Downloads: `app-name-inference-timestamp.json`
   - Contains: summary + per-episode data

## 🏗️ Architecture

### Component Structure

```
components/
├── mode-switcher.js      # UI tabs + visibility control
├── inference-mode.js     # Frozen agent + evaluation runner
├── app-template.js       # Orchestrates both modes
├── rl-core.js           # Q-learning algorithms
└── federated-core.js    # FedAvg + serialization
```

### State Flow

```
┌─────────────┐   Save    ┌─────────────┐
│  Training   │ ────────> │ localStorage│
│  4 clients  │           │   or File   │
└─────────────┘           └─────────────┘
       ↓                          │
    [Switch]                   Load
       ↓                          ↓
┌─────────────┐           ┌─────────────┐
│  Inference  │ <──────── │ Frozen Agent│
│  1 client   │           │ (ε=0, α=0)  │
└─────────────┘           └─────────────┘
       │
       └──> N episodes ──> Results
```

## 🧪 Implementation Example

### Minimal Setup

```javascript
import { createFederatedApp } from '../components/app-template.js';

createFederatedApp({
    name: 'My RL Demo',
    numClients: 4,
    canvasWidth: 400,
    canvasHeight: 400,
    
    // RL config
    alpha: 0.1,
    gamma: 0.95,
    epsilon: 0.3,
    
    // Environment
    environment: {
        actions: ['LEFT', 'STAY', 'RIGHT'],
        getState: (state) => `${state.x},${state.y}`,
        step: (state, action) => ({ state, reward, done }),
        reset: () => initialState
    },
    
    // Render
    render: (ctx, state) => {
        // Draw visualization
    }
});

// Mode switching is automatic! 🎉
```

### Custom Mode Behavior

```javascript
createFederatedApp({
    // ... config ...
    
    onClientInit: (client) => {
        // Called when training client initializes
        console.log('Training client created:', client.id);
    },
    
    onEpisodeEnd: (client) => {
        // Called after each training episode
        const rate = client.state.catches / 
                    (client.state.catches + client.state.misses);
        console.log(`Client ${client.id} success rate: ${rate}`);
    },
    
    onFederation: (globalModel, round) => {
        // Called after federation
        console.log(`Round ${round}: ${Object.keys(globalModel).length} states`);
    }
});
```

## 💡 Best Practices

### Training
1. **Train until epsilon stabilizes** (~200-500 episodes)
2. **Watch Q-table growth** - should plateau
3. **Save checkpoints periodically** 
4. **Use auto-federation** for consistency

### Inference
1. **Run sufficient episodes** (≥50 for statistical significance)
2. **Compare multiple checkpoints** to find best
3. **Export results** for reproducibility
4. **Check consistency score** - should be >70%

### Model Selection
- High mean reward + high consistency = production ready
- High mean reward + low consistency = needs more training
- Low mean reward = architecture/hyperparameter issue

## 🔍 Troubleshooting

### "No training data found"
**Solution**: Train first, then switch to inference. Or load a model file.

### localStorage quota exceeded
**Solution**: Use JSON export instead. Clear old data:
```javascript
localStorage.clear();
```

### Inference results inconsistent
**Solution**: 
- Increase test episodes (50 → 100)
- Check if training converged (epsilon near minEpsilon)
- Verify state space isn't too large

### Mode switch doesn't work
**Solution**: Check browser console for errors. Ensure all imports are correct.

## 📚 Related Documentation

- [Component Library Guide](./COMPONENT-LIBRARY-GUIDE.md)
- [Federated RL Comparison](./federated-rl-comparison.md)
- [README](../README.md)

## 🎯 Example Workflow

```bash
# 1. Start training
Click "🧠 Training" tab (default)
Click "▶ Start"
Wait ~100-200 episodes

# 2. Save checkpoint
Click "💾 Save Checkpoint"
Note: "Checkpoint saved at 14:32:15"

# 3. Switch to inference
Click "🎯 Inference" tab

# 4. Run evaluation
Select "Latest Training Session"
Select "50 episodes"
Click "▶ Run Evaluation"
Wait for completion

# 5. Review & export
Check success rate, mean reward, consistency
Click "📊 Export Results" to save metrics

# 6. Continue training (optional)
Click "🧠 Training" tab
Click "▶ Start" to continue
```

---

**Built with 2025 RL best practices** 🚀

