# CI/CD Implementation Prompt (Rigorous 3-Iteration Review)

**Goal**: Implement simple, effective CI/CD for single-developer federated RL project

---

## 🎯 Mission

Build a **minimal yet robust CI/CD pipeline** that:
- ✅ Runs in <10 seconds
- ✅ Single bash script (no complex tooling)
- ✅ Tests all pure functions
- ✅ Validates examples load without errors
- ✅ Runs pre-commit and pre-push
- ✅ Zero dependencies (bash + Node.js only)

**Success Criteria**:
- [ ] All pure functions have unit tests
- [ ] Tests run automatically on commit
- [ ] Examples validated (no JS errors)
- [ ] Coverage report generated
- [ ] Takes <10 seconds total
- [ ] Single developer friendly (no Docker/K8s complexity)

---

## 📋 3-Iteration Rigorous Review

### **Iteration 1: Prompt Engineer**
*Clear specifications, test strategy, automation workflow*

#### **Problem Analysis**

**Current State**:
- ❌ No automated tests
- ❌ No CI/CD pipeline
- ❌ Manual validation only
- ❌ Risk of regressions

**Requirements**:
```
MUST HAVE:
✅ Unit tests for pure functions (rl-core, federated-core, metrics-core)
✅ Integration tests for key workflows
✅ Pre-commit hook (runs tests before commit)
✅ Pre-push hook (runs full validation)
✅ Fast execution (<10 sec)
✅ Single bash script
✅ Works on macOS/Linux

NICE TO HAVE:
- Coverage reporting
- Performance benchmarks
- Visual regression tests (screenshots)

OUT OF SCOPE:
❌ GitHub Actions (too complex for single dev)
❌ Docker containers
❌ External CI services
```

#### **Test Strategy**

**Layer 1: Pure Function Tests** (Fast - ~1 sec)
```javascript
// test/unit/test-rl-core.js
import { updateQValue, discretize, selectAction } from '../../components/rl-core.js';

// Q-learning update
assert(updateQValue(0.5, 10, 0.8, 0.1, 0.9) === 1.12);
assert(updateQValue(0, 0, 0, 0.1, 0.9) === 0);

// Discretization
assert(discretize(75, 10, 0, 100) === 7);
assert(discretize(0, 10, 0, 100) === 0);
assert(discretize(100, 10, 0, 100) === 9);

// Action selection
assert(selectAction([0.1, 0.9, 0.3], 0, () => 0.5) === 1);  // Greedy
assert(selectAction([0.1, 0.9, 0.3], 1, () => 0.5) >= 0);   // Random
```

**Layer 2: Component Integration** (Medium - ~3 sec)
```javascript
// test/integration/test-agent-environment.js
import { createTabularAgent } from '../../components/rl-core.js';

const agent = createTabularAgent({ alpha: 0.1, gamma: 0.9, epsilon: 0.1 });
const env = createSimpleEnvironment();

// Train for 100 episodes
for (let ep = 0; ep < 100; ep++) {
    let state = env.reset();
    while (!done) {
        const action = agent.chooseAction(env.getState(state));
        const result = env.step(state, action);
        agent.learn(env.getState(state), action, result.reward, env.getState(result.state));
        state = result.state;
    }
}

// Verify learning occurred
assert(Object.keys(agent.getModel()).length > 10);
assert(agent.getEpsilon() < 0.1);  // Decayed
```

**Layer 3: Example Validation** (Slow - ~5 sec)
```javascript
// test/e2e/validate-examples.js
// Load each example HTML and check for:
// 1. No console errors
// 2. Canvas renders
// 3. Start button clickable
// 4. Episode counter increments

const examples = [
    'rl-ball-catch-pure.html',
    'grid-world-minimal.html',
    'magnet-circle-training.html',
    'magnet-slalom-control.html'
];

for (const example of examples) {
    const result = await validateExample(example);
    assert(result.errors === 0);
    assert(result.canvasFound === true);
}
```

#### **CI/CD Workflow**

```
┌─────────────────────────────────────┐
│  Developer writes code               │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│  git add .                           │
│  git commit -m "..."                 │
└────────────┬────────────────────────┘
             │
             ↓ (pre-commit hook)
┌─────────────────────────────────────┐
│  ./test/run-tests.sh --fast         │
│  - Unit tests only (~1 sec)          │
│  - Exit code 0 = pass                │
└────────────┬────────────────────────┘
             │
             ↓ (if pass)
┌─────────────────────────────────────┐
│  Commit accepted                     │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│  git push                            │
└────────────┬────────────────────────┘
             │
             ↓ (pre-push hook)
┌─────────────────────────────────────┐
│  ./test/run-tests.sh --full         │
│  - Unit tests                        │
│  - Integration tests                 │
│  - Example validation                │
│  - Coverage report                   │
│  - Total: ~10 sec                    │
└────────────┬────────────────────────┘
             │
             ↓ (if pass)
┌─────────────────────────────────────┐
│  Push to remote                      │
└─────────────────────────────────────┘
```

---

### **Iteration 2: Software Engineer**
*Implementation structure, file organization, tooling*

#### **File Structure**

```
test/
├── run-tests.sh              # Main test runner (bash)
├── unit/
│   ├── test-rl-core.js       # Q-learning tests
│   ├── test-federated-core.js # FedAvg tests
│   ├── test-metrics-core.js  # KPI tests
│   └── test-utils.js         # Test helpers
├── integration/
│   ├── test-agent-env.js     # Agent + environment
│   └── test-federation.js    # Multi-client federation
├── e2e/
│   └── validate-examples.js  # Load examples, check for errors
└── helpers/
    ├── assert.js             # Minimal assertion library
    ├── simple-env.js         # Test environment
    └── mock-dom.js           # Minimal DOM for Node.js tests

.githooks/
├── pre-commit                # Run fast tests
└── pre-push                  # Run full test suite

package.json                  # Test scripts only (no build)
```

#### **Test Runner** (test/run-tests.sh)

```bash
#!/bin/bash
# Simple CI/CD Test Runner
# Usage: ./test/run-tests.sh [--fast|--full|--coverage]

set -e  # Exit on first failure

MODE=${1:-full}
START_TIME=$(date +%s)

echo "🧪 Running tests (mode: $MODE)..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track results
PASSED=0
FAILED=0
TOTAL=0

# Helper: Run test file
run_test() {
    local test_file=$1
    local test_name=$(basename $test_file .js)
    
    TOTAL=$((TOTAL + 1))
    
    echo -n "  Testing $test_name... "
    
    if node $test_file > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗${NC}"
        echo "    Error output:"
        node $test_file 2>&1 | sed 's/^/    /'
        FAILED=$((FAILED + 1))
    fi
}

# Phase 1: Unit tests (always run)
echo "📦 Phase 1: Unit Tests"
for test in test/unit/*.js; do
    [ -f "$test" ] && run_test "$test"
done
echo ""

# Phase 2: Integration tests (skip in --fast mode)
if [ "$MODE" != "fast" ]; then
    echo "🔗 Phase 2: Integration Tests"
    for test in test/integration/*.js; do
        [ -f "$test" ] && run_test "$test"
    done
    echo ""
fi

# Phase 3: E2E validation (skip in --fast mode)
if [ "$MODE" != "fast" ]; then
    echo "🌐 Phase 3: Example Validation"
    for test in test/e2e/*.js; do
        [ -f "$test" ] && run_test "$test"
    done
    echo ""
fi

# Summary
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo "────────────────────────────────"
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC} ($PASSED/$TOTAL in ${DURATION}s)"
    exit 0
else
    echo -e "${RED}❌ Some tests failed!${NC} ($PASSED passed, $FAILED failed, $TOTAL total)"
    exit 1
fi
```

#### **Minimal Assertion Library** (test/helpers/assert.js)

```javascript
/**
 * Minimal assertion library (no dependencies)
 */

export class AssertionError extends Error {
    constructor(message) {
        super(message);
        this.name = 'AssertionError';
    }
}

export function assert(condition, message = 'Assertion failed') {
    if (!condition) {
        throw new AssertionError(message);
    }
}

export function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new AssertionError(
            message || `Expected ${expected}, got ${actual}`
        );
    }
}

export function assertAlmostEqual(actual, expected, epsilon = 0.01, message) {
    if (Math.abs(actual - expected) > epsilon) {
        throw new AssertionError(
            message || `Expected ${expected} ± ${epsilon}, got ${actual}`
        );
    }
}

export function assertThrows(fn, errorType, message) {
    let threw = false;
    try {
        fn();
    } catch (error) {
        threw = true;
        if (errorType && !(error instanceof errorType)) {
            throw new AssertionError(
                message || `Expected ${errorType.name}, got ${error.name}`
            );
        }
    }
    if (!threw) {
        throw new AssertionError(message || 'Expected function to throw');
    }
}

// Run tests and exit with proper code
export function runTests(testSuiteName, tests) {
    console.log(`\n🧪 ${testSuiteName}`);
    let passed = 0;
    let failed = 0;
    
    for (const [name, fn] of Object.entries(tests)) {
        try {
            fn();
            console.log(`  ✓ ${name}`);
            passed++;
        } catch (error) {
            console.log(`  ✗ ${name}`);
            console.log(`    ${error.message}`);
            failed++;
        }
    }
    
    console.log(`\n${passed} passed, ${failed} failed`);
    
    if (failed > 0) {
        process.exit(1);
    }
}
```

#### **Git Hooks Setup**

```bash
# .githooks/pre-commit
#!/bin/bash
# Fast tests before commit
echo "🔍 Running pre-commit checks..."
./test/run-tests.sh --fast

# .githooks/pre-push
#!/bin/bash
# Full test suite before push
echo "🚀 Running pre-push validation..."
./test/run-tests.sh --full

# Install hooks
./test/install-hooks.sh
```

---

### **Iteration 3: AI Researcher**
*Test coverage, edge cases, validation*

#### **Test Coverage Matrix**

| Module | Function | Test Status | Edge Cases |
|--------|----------|-------------|------------|
| **rl-core.js** | | | |
| | `updateQValue` | ✅ 5 tests | ✓ Zero Q, ✓ Negative reward |
| | `selectAction` | ✅ 4 tests | ✓ ε=0, ✓ ε=1, ✓ Empty Q |
| | `discretize` | ✅ 6 tests | ✓ Min/max bounds, ✓ Out of range |
| | `createTabularAgent` | ✅ 8 tests | ✓ Learning, ✓ Epsilon decay |
| **federated-core.js** | | | |
| | `federateAverage` | ✅ 4 tests | ✓ Single client, ✓ Equal weights |
| | `serializeModel` | ✅ 3 tests | ✓ Empty model, ✓ Large model |
| | `computeModelDelta` | ✅ 3 tests | ✓ Identical, ✓ Disjoint |
| **metrics-core.js** | | | |
| | `AGGREGATORS.sum` | ✅ 3 tests | ✓ Empty array, ✓ Negative |
| | `AGGREGATORS.avg` | ✅ 3 tests | ✓ Empty, ✓ Single value |
| | `createEpisodeTracker` | ✅ 5 tests | ✓ No KPIs, ✓ Custom success |

**Total Coverage**: ~40 unit tests, ~5 integration tests, ~4 E2E validations

#### **Edge Cases Covered**

1. **Empty inputs**: [], {}, null, undefined
2. **Boundary values**: 0, 1, Infinity, -Infinity
3. **Invalid types**: string instead of number
4. **Edge behaviors**: Epsilon=0 (greedy), Epsilon=1 (random)
5. **State coverage**: New states, seen states, terminal states

#### **Performance Benchmarks**

```bash
# test/benchmark.sh
echo "⏱️  Performance Benchmarks"
echo ""
echo "Q-update (1M iterations):"
time node -e "import {updateQValue} from './components/rl-core.js'; for(let i=0;i<1e6;i++) updateQValue(0.5,10,0.8,0.1,0.9)"

echo "FedAvg (100 clients, 400 states):"
time node test/benchmark-fedavg.js

echo "Episode run (Grid World, 1000 episodes):"
time node test/benchmark-episode.js
```

---

## ✅ Acceptance Criteria

### **Functionality**
- [ ] Unit tests for all pure functions pass
- [ ] Integration tests verify key workflows
- [ ] Examples load without console errors
- [ ] Pre-commit hook blocks bad commits
- [ ] Pre-push hook validates before push

### **Performance**
- [ ] Fast mode (<2 sec) for pre-commit
- [ ] Full mode (<10 sec) for pre-push
- [ ] Tests run in parallel where possible

### **Developer Experience**
- [ ] Single command: `./test/run-tests.sh`
- [ ] Clear pass/fail output with colors
- [ ] Error messages point to exact issue
- [ ] Easy to add new tests

### **Coverage**
- [ ] >80% of pure functions tested
- [ ] All critical paths covered
- [ ] Edge cases documented

---

## 📊 Implementation Checklist

### **Phase 1: Core Test Infrastructure** (30 min)
- [ ] Create `test/helpers/assert.js`
- [ ] Create `test/run-tests.sh`
- [ ] Make executable: `chmod +x test/run-tests.sh`
- [ ] Test runner works: `./test/run-tests.sh --fast`

### **Phase 2: Unit Tests** (60 min)
- [ ] `test/unit/test-rl-core.js` (15 tests)
- [ ] `test/unit/test-federated-core.js` (10 tests)
- [ ] `test/unit/test-metrics-core.js` (15 tests)
- [ ] All tests pass

### **Phase 3: Integration Tests** (30 min)
- [ ] `test/integration/test-agent-env.js`
- [ ] `test/integration/test-federation.js`
- [ ] Tests verify multi-component interaction

### **Phase 4: E2E Validation** (30 min)
- [ ] `test/e2e/validate-examples.js`
- [ ] Load each example, check for errors
- [ ] Validate canvas rendering

### **Phase 5: Git Hooks** (15 min)
- [ ] Create `.githooks/pre-commit`
- [ ] Create `.githooks/pre-push`
- [ ] Create `test/install-hooks.sh`
- [ ] Run: `./test/install-hooks.sh`

### **Phase 6: Documentation** (15 min)
- [ ] Update `docs/DEVELOPMENT.md` with testing guide
- [ ] Add testing section to main README
- [ ] Document how to add new tests

**Total Time**: ~3 hours

---

## 🚀 Success Definition

**Milestone achieved if**:
1. ✅ All tests pass locally
2. ✅ Git hooks prevent bad commits
3. ✅ Takes <10 seconds total
4. ✅ No external dependencies
5. ✅ Easy for single developer to use

**This proves**: Project has reliable, fast CI/CD suitable for solo development!

---

**Ready to implement? GO! 🚀**

