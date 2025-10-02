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

