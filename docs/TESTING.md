# Testing Guide

This project has a complete CI/CD pipeline with automated testing.

## Quick Reference

```bash
# Run tests
./test/run-tests.sh --fast    # Unit tests (~1s)
./test/run-tests.sh --full    # All tests (~5s)

# Setup git hooks
./test/install-hooks.sh

# See detailed docs
cat test/README.md
```

## Test Coverage

- ✅ **40+ unit tests** for pure functions
- ✅ **Integration tests** for agent learning
- ✅ **E2E validation** for all examples
- ✅ **Git hooks** for pre-commit/pre-push
- ✅ **<10 second** execution time

## Architecture

All RL core modules (`rl-core.js`, `federated-core.js`, `metrics-core.js`) are designed with pure functions, making them easily testable without mocks or complex setup.

See `test/README.md` for full documentation.

