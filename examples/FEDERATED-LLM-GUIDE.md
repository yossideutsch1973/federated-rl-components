# 🧠 Federated LLM Meta-Learning Guide

## Overview

This example demonstrates **meta-learning** - using Reinforcement Learning to learn *how to use* LLMs effectively, then sharing that knowledge through Federated Learning.

**Key Innovation:** Instead of training the LLM itself, we train an RL agent to discover optimal prompting strategies, which is:
- Much faster (no LLM fine-tuning)
- More practical (works with any LLM)
- Federable (share learned strategies, not model weights)
- Privacy-preserving (don't share data or LLM parameters)

---

## 🎯 The Problem

Different prompting strategies work better for different types of questions:
- Math questions might need step-by-step reasoning
- Geography questions might need direct, concise answers
- Science questions might benefit from expert framing

**Challenge:** How do we discover which strategies work best?

---

## 💡 The Solution: Federated Meta-Learning

### Architecture

```
┌─────────────────────────────────────────┐
│  Client 1                               │
│  ┌───────────┐  asks   ┌──────────┐    │
│  │ RL Agent  │────────>│ LLM      │    │
│  │ (Q-table) │<────────│ (Ollama) │    │
│  └───────────┘  reward └──────────┘    │
│       │                                 │
│       │ Learns: geography → Concise    │
│       │         math → Think           │
└───────┼─────────────────────────────────┘
        │
        │ Federation
        ▼
┌───────────────────────────────────────────┐
│  Global Model (Aggregated Strategies)     │
│  geography → Concise (0.85)               │
│  math      → Think   (0.92)               │
│  science   → Expert  (0.78)               │
└───────────────────────────────────────────┘
```

### Components

1. **LLM (Ollama)**: Generates answers to questions
2. **RL Agent**: Learns which prompt strategies work best
3. **Federation**: Shares learned strategies across clients
4. **Trivia Dataset**: Questions for evaluation

---

## 🔧 Setup

### 1. Install Ollama

**Mac:**
```bash
brew install ollama
```

**Linux:**
```bash
curl https://ollama.ai/install.sh | sh
```

**Windows:**
Download from https://ollama.ai

### 2. Pull a Tiny Model

Choose one:

```bash
# TinyLlama - 1.1GB, fast (recommended)
ollama pull tinyllama

# Phi - 1.3GB, higher quality
ollama pull phi

# Gemma 2B - 1.4GB, good balance
ollama pull gemma:2b

# Qwen 0.5B - 350MB, fastest
ollama pull qwen:0.5b
```

### 3. Start Ollama

Usually auto-starts, or:
```bash
ollama serve
```

### 4. Run the Demo

```bash
# Server should be running
python3 -m http.server 8000

# Open demo
http://localhost:8000/examples/federated-llm-learning.html
```

---

## 🎮 How It Works

### State Space

**State = Question Category**
- geography
- math
- science
- literature
- history
- art

Each category might need different prompting strategies.

### Action Space

**Action = Prompt Strategy**

1. **Direct**: `{question}\nAnswer:`
2. **Think**: `{question}\nLet's think step by step and then provide the answer:`
3. **Concise**: `{question}\nGive only the answer, nothing else:`
4. **Expert**: `You are an expert. {question}\nAnswer:`
5. **Format**: `Question: {question}\nProvide a brief, accurate answer:\nAnswer:`

### Reward Function

```javascript
// Evaluate LLM response vs correct answer
score = evaluateAnswer(llmResponse, correctAnswer);

// score = 1.0 (exact match)
//       = 0.8 (contains answer)
//       = 0.5 (partial match)
//       = 0.0 (wrong)

reward = score * 10 - 1; // Scale: -1 to +9
```

### Learning Process

1. **Client receives question** (e.g., "What is the capital of France?")
2. **RL agent selects prompt strategy** based on category (geography)
3. **Build prompt** using selected strategy
4. **LLM generates answer** via Ollama API
5. **Evaluate answer** (compare to correct answer "Paris")
6. **Calculate reward** based on correctness
7. **RL agent learns** (update Q-table: geography + Concise → good!)
8. **Repeat** with new questions

### Federation

After N episodes:
1. **Collect Q-tables** from all clients
2. **Federated averaging** (same as other demos)
3. **Distribute global model** back to clients
4. **Clients continue learning** with shared knowledge

---

## 📊 What to Observe

### Before Federation

Clients explore randomly:
- Client 0: Tries "Think" for geography → gets it right
- Client 1: Tries "Direct" for math → gets it wrong
- Client 2: Tries "Expert" for science → gets it right
- Client 3: Tries "Concise" for literature → gets it wrong

**Each learns locally from their own questions.**

### After Federation

Shared knowledge:
- All clients know: geography → "Concise" works best
- All clients know: math → "Think" works best
- All clients know: science → "Expert" works best

**Faster convergence** because they don't repeat mistakes!

---

## 💡 Why This Matters

### Traditional LLM Fine-Tuning

**Problems:**
- ❌ Requires lots of data
- ❌ Computationally expensive
- ❌ Hard to share (large model weights)
- ❌ Privacy concerns (data in gradients)
- ❌ Destroys general capabilities

### This Approach: Meta-Learning

**Benefits:**
- ✅ Fast (no model training)
- ✅ Lightweight (Q-table is tiny)
- ✅ Easy to share (just strategies)
- ✅ Privacy-preserving (no data shared)
- ✅ LLM stays general-purpose

---

## 🎯 Real-World Applications

### 1. Customer Support

**Scenario:** Multiple companies use same LLM for support

**Problem:** Different industries need different prompt styles
- Tech support → step-by-step debugging
- Retail → concise product info
- Healthcare → empathetic, detailed

**Solution:** Each company's RL agent learns locally, then they federate strategies (without sharing customer data!)

### 2. Educational Tutoring

**Scenario:** Many schools use LLM tutors

**Problem:** Different subjects need different teaching approaches
- Math → show work
- History → storytelling
- Science → experiment-based

**Solution:** Schools share learned teaching strategies, not student data.

### 3. Content Generation

**Scenario:** Writers use LLM for different content types

**Problem:** Blog posts vs tweets vs emails need different tones

**Solution:** Learn optimal prompting for each content type, share across users.

### 4. Code Generation

**Scenario:** Developers use LLMs for coding help

**Problem:** Different languages/frameworks need different prompts

**Solution:** Learn which prompts work for Python vs JavaScript vs Rust.

---

## 🔬 Technical Deep Dive

### Why RL Instead of Supervised Learning?

**Supervised Learning Requires:**
- Labeled examples of good/bad prompts
- Manual prompt engineering
- Hard to transfer across domains

**RL Discovers Through Exploration:**
- No labels needed
- Automatic discovery
- Adapts to new domains

### Why Federation?

**Alternative 1: Central Server**
- ❌ Privacy issues (send all questions)
- ❌ Single point of failure
- ❌ Doesn't scale

**Alternative 2: Isolated Learning**
- ❌ Each client learns from scratch
- ❌ Slow convergence
- ❌ Redundant exploration

**Federation Wins:**
- ✅ Privacy-preserving (only share Q-table)
- ✅ Distributed (no single point of failure)
- ✅ Efficient (shared exploration)
- ✅ Scalable (N clients = N× data diversity)

### State Representation Choices

**Current: Question Category**
- Simple
- Few states (6 categories)
- Fast learning

**Alternative Ideas:**
1. **Question length** bins (short, medium, long)
2. **Keyword presence** (contains numbers? names?)
3. **Semantic embedding** (cluster similar questions)
4. **Hybrid**: category + length + has_number

Trade-off: More features = more states = slower learning but potentially better performance

### Action Space Extensions

**Current: 5 Prompt Strategies**

**Could Add:**
- Temperature control (creative vs factual)
- Max tokens (brief vs detailed)
- System prompts (role-playing)
- Few-shot examples (include examples in prompt)
- Chain-of-thought variations

---

## 📈 Performance Metrics

### What to Track

1. **Accuracy**: % of correct answers
2. **Strategy Distribution**: Which strategies get used most
3. **Convergence Speed**: Episodes to reach 80% accuracy
4. **Federation Impact**: Accuracy jump after federation
5. **Exploration vs Exploitation**: Epsilon decay over time

### Expected Results

**Baseline (Random Strategies):** ~60% accuracy

**After Local Learning (No Federation):**
- Client 0: 75% accuracy
- Client 1: 70% accuracy
- Client 2: 78% accuracy
- Client 3: 72% accuracy

**After Federation:**
- All clients: ~85% accuracy
- Faster convergence on new questions
- Consistent strategy selection

---

## 🛠️ Customization

### Change the Dataset

```javascript
const MY_QUESTIONS = [
    { q: "Your question?", a: "correct answer", category: "your_category" },
    // Add more...
];
```

### Add New Strategies

```javascript
const MY_STRATEGIES = [
    ...PROMPT_STRATEGIES,
    { 
        name: "Chain-of-Thought", 
        template: (q) => `${q}\nLet's break this down:\n1.` 
    },
    { 
        name: "Few-Shot", 
        template: (q) => `Example: Q: 2+2? A: 4\nNow: ${q}\nAnswer:` 
    }
];
```

### Use Different LLM

```javascript
const OLLAMA_CONFIG = {
    baseURL: 'http://localhost:11434',
    model: 'phi', // or 'gemma:2b', 'mistral', etc.
    options: {
        temperature: 0.3,
        num_predict: 100
    }
};
```

### Change Reward Function

```javascript
function evaluateAnswer(llmResponse, correctAnswer) {
    // Custom evaluation logic
    // Could use semantic similarity, fuzzy matching, etc.
    
    // Example: Use answer length as a factor
    const lengthBonus = llmResponse.length < 50 ? 0.1 : 0;
    
    // Example: Penalize verbose wrong answers
    if (!response.includes(answer) && response.length > 100) {
        return -0.5;
    }
    
    // Your custom logic here...
}
```

---

## 🚧 Limitations & Future Work

### Current Limitations

1. **Simple State Space**: Only uses category, could be richer
2. **Limited Strategies**: Only 5 prompts, could have hundreds
3. **Basic Evaluation**: String matching, could use semantic similarity
4. **No Context**: Each question independent, no conversation history
5. **Synchronous**: Waits for each LLM response (could parallelize)

### Future Enhancements

1. **Hierarchical States**: Category → Subcategory → Keywords
2. **Dynamic Prompts**: RL generates prompts, not just selects
3. **Multi-Turn Conversations**: Track conversation state
4. **Advanced Evaluation**: Use another LLM to judge quality
5. **Personalization**: Per-user strategy learning
6. **Transfer Learning**: Apply learned strategies to new LLMs

---

## 🎓 Key Takeaways

1. **Meta-Learning Works**: RL can learn to use LLMs effectively
2. **Federation Scales**: Shared strategies converge faster
3. **Privacy-Preserving**: No data or model weights shared
4. **Practical**: Much faster than fine-tuning
5. **Generalizable**: Apply to any task with evaluable outputs

---

## 📚 References

- **Federated Learning**: McMahan et al., 2017
- **Prompt Engineering**: Reynolds & McDonell, 2021
- **Meta-Learning**: Finn et al., 2017 (MAML)
- **LLM Prompting**: Wei et al., 2022 (Chain-of-Thought)
- **Ollama**: https://ollama.ai

---

## 🔗 Related Examples

- `grid-world-minimal.html` - Basic RL
- `ball-balancing-physics.html` - Physics simulation
- `cart-pole-physics.html` - Complex dynamics
- **`federated-llm-learning.html`** - You are here! 🧠

---

**Version:** 1.0  
**Date:** October 2025  
**Status:** Experimental 🧪

