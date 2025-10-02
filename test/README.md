# Testing & CI/CD

**Simple, fast, effective test suite for federated RL components**

## 🎯 Quick Start

```bash
# Run fast tests (unit only, ~1s)
./test/run-tests.sh --fast

# Run full suite (unit + integration + e2e, ~5s)
./test/run-tests.sh --full

# Install git hooks (auto-run on commit/push)
./test/install-hooks.sh
```

## 📊 Test Coverage

### Unit Tests (3 files, 40+ tests)
- **`test-rl-core.js`**: Q-learning, action selection, discretization
- **`test-federated-core.js`**: FedAvg, model delta, serialization
- **`test-metrics-core.js`**: Aggregators, episode tracking, KPIs

### Integration Tests (2 files)
- **`test-agent-env.js`**: Agent learns to solve grid world
- **`test-federation.js`**: Multi-client knowledge sharing

### E2E Tests (1 file, Playwright)
- **`validate-examples.js`**: 
  - Static HTML validation (all examples)
  - Component file checks
  - Browser smoke test (optional, informational)

## ⚡ Performance

| Mode | Time | Tests | Use Case |
|------|------|-------|----------|
| `--fast` | ~1s | Unit only | Pre-commit |
| `--full` | ~5s | All tests | Pre-push |

**Target met**: <10 seconds ✅

## 🔧 Architecture

```
test/
├── run-tests.sh              # Main test runner
├── install-hooks.sh          # Git hooks installer
├── helpers/
│   ├── assert.js             # Assertion library (no deps)
│   └── simple-env.js         # Test environment (grid world)
├── unit/                     # Pure function tests
├── integration/              # Multi-component tests
└── e2e/                      # Example validation
```

## 🎣 Git Hooks

After running `./test/install-hooks.sh`:

- **pre-commit**: Runs `--fast` mode (blocks commits if tests fail)
- **pre-push**: Runs `--full` mode (blocks pushes if tests fail)

To bypass: `git commit --no-verify` (not recommended)

## ✍️ Writing Tests

### Unit Test Template

```javascript
import { myFunction } from '../../components/my-module.js';
import { runTests, assertEqual, assert } from '../helpers/assert.js';

const tests = {
    'test name': () => {
        const result = myFunction(input);
        assertEqual(result, expected);
    }
};

runTests('MY MODULE', tests);
```

### Assertion Functions

- `assert(condition, message)` - Basic assertion
- `assertEqual(actual, expected, message)` - Exact equality
- `assertAlmostEqual(actual, expected, epsilon, message)` - Numeric comparison
- `assertThrows(fn, errorType, message)` - Error testing

## 📈 Test Philosophy

**Pure functions first**: All RL algorithms are pure → easy to test

**Fast feedback**: Unit tests run in <1s for rapid iteration

**Minimal dependencies**: Node.js + Playwright (for E2E only)

**Single developer friendly**: Simple bash + JS, no complex tooling

## 🚀 CI/CD Workflow

```
Code → git add → git commit
              ↓
         [pre-commit: --fast]
              ↓ (if pass)
         Commit created
              ↓
         git push
              ↓
         [pre-push: --full]
              ↓ (if pass)
         Push to remote ✅
```

## 📝 Test Results

Run tests to see output like:

```
🧪 Running tests (mode: fast)...

📦 Phase 1: Unit Tests
  Testing test-rl-core... ✓
  Testing test-federated-core... ✓
  Testing test-metrics-core... ✓

────────────────────────────────
✅ All tests passed! (3/3 in 0s)
```

## 🔍 Debugging Failed Tests

Tests show detailed error messages:

```
Testing test-rl-core... ✗
  Error output:
    ✗ updateQValue: basic update
      Expected 1.522 ± 0.01, got 1.500
```

## 🎓 Best Practices

1. **Write tests for all pure functions** (mark with `@pure` in docs)
2. **Keep unit tests fast** (<100ms each)
3. **Test edge cases** (empty, zero, boundary values)
4. **Use descriptive test names** (what you're testing, not just function name)
5. **One assertion per test** (easier to debug failures)

## 📦 Adding New Tests

1. Create test file in appropriate directory
2. Import from `../helpers/assert.js`
3. Export tests using `runTests('NAME', tests)`
4. Run `./test/run-tests.sh` to verify

Test runner auto-discovers all `.js` files in test directories.

---

**Built with**: bash + Node.js + zero dependencies ✨

