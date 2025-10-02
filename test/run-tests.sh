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
if [ "$MODE" != "fast" ] && [ "$MODE" != "--fast" ]; then
    echo "🔗 Phase 2: Integration Tests"
    if [ -d "test/integration" ]; then
        for test in test/integration/*.js; do
            [ -f "$test" ] && run_test "$test"
        done
    else
        echo "  (no integration tests yet)"
    fi
    echo ""
fi

# Phase 3: E2E validation (skip in --fast mode)
if [ "$MODE" != "fast" ] && [ "$MODE" != "--fast" ]; then
    echo "🌐 Phase 3: Example Validation"
    if [ -d "test/e2e" ]; then
        for test in test/e2e/*.js; do
            [ -f "$test" ] && run_test "$test"
        done
    else
        echo "  (no e2e tests yet)"
    fi
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

