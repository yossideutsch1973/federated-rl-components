# GitHub Actions Workflows

## 🔄 Continuous Integration

### `ci.yml` - Main CI Pipeline
**Triggers**: Push to `main`/`develop`, Pull Requests

**What it does**:
- Runs on Node.js 18.x and 20.x (matrix)
- Fast tests (unit only) - ~1s
- Full test suite - ~11s
- Tests 100+ scenarios

**Stages**:
1. 📦 Unit Tests (83 tests)
2. 🔗 Integration Tests (6 tests)
3. 🌐 E2E Browser Tests (12 validations)

### `weekly-tests.yml` - Scheduled Tests
**Triggers**: Every Monday at 9 AM UTC, Manual dispatch

**Purpose**: 
- Catch regressions over time
- Verify examples still work
- Generate weekly health reports

## 📊 Test Coverage

| Component | Tests | Type |
|-----------|-------|------|
| rl-core.js | 31 | Unit |
| federated-core.js | 21 | Unit |
| metrics-core.js | 31 | Unit |
| Agent + Env | 3 | Integration |
| Federation | 3 | Integration |
| Examples | 12 | E2E |

## 🚀 Manual Trigger

You can manually run tests from GitHub Actions tab:
1. Go to Actions → Weekly Full Test Suite
2. Click "Run workflow"
3. Select branch and run

## 📈 Status Badges

Add to your README.md:

```markdown
![CI Tests](https://github.com/USERNAME/REPO/workflows/CI/CD%20Tests/badge.svg)
```

## ⚙️ Local Testing

Before pushing, tests run automatically via git hooks:
```bash
git commit  # → runs fast tests
git push    # → runs full suite
```

Or run manually:
```bash
./test/run-tests.sh --fast  # Quick check
./test/run-tests.sh --full  # Complete suite
```

