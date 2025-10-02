/**
 * E2E validation: HTML structure + one real browser smoke test
 * 
 * Strategy:
 * - Fast: Static validation of all examples (no browser needed)
 * - Thorough: One Playwright test to verify a sample example actually works
 */

import { readFileSync, existsSync } from 'fs';
import { chromium } from 'playwright';
import { spawn } from 'child_process';

const PORT = 8001;
const BASE_URL = `http://localhost:${PORT}`;

const EXAMPLES = [
    'examples/rl-ball-catch-pure.html',
    'examples/grid-world-minimal.html',
    'examples/magnet-circle-training.html',
    'examples/magnet-slalom-control.html',
    'examples/magnet-multitask-learning.html',
    'examples/mountain-car.html',
    'examples/federated-llm-learning.html'
];

let passed = 0;
let failed = 0;

const assert = (condition, message) => {
    if (!condition) throw new Error(message);
};

// ============================================================================
// STATIC VALIDATION (Fast - no browser)
// ============================================================================

const validateHtmlStructure = (filepath) => {
    if (!existsSync(filepath)) {
        throw new Error(`File not found: ${filepath}`);
    }
    
    const content = readFileSync(filepath, 'utf-8');
    
    // Basic HTML validation
    assert(content.includes('<html'), 'Should have HTML tag');
    assert(content.includes('<head'), 'Should have head tag');
    assert(content.includes('<body'), 'Should have body tag');
    
    // Check for app initialization
    const hasAppTemplate = content.includes('createFederatedApp') || content.includes('app-template.js');
    const hasAppDiv = content.includes('id="app"') || content.includes('id=\\"app\\"');
    assert(hasAppTemplate || hasAppDiv, 'Should have app initialization');
    
    // Check for component imports
    const hasRlCore = content.includes('rl-core.js');
    const hasComponents = content.includes('components/');
    const hasModuleScript = content.includes('type="module"');
    assert(hasComponents || hasRlCore, 'Should import RL components');
    assert(hasModuleScript, 'Should use ES6 modules');
    
    // Check for no obvious syntax errors
    assert(!content.includes('undefined undefined'), 'Should not have obvious errors');
    const scriptErrors = content.match(/\berror\b.*\bfunction/gi);
    assert(!scriptErrors, 'Should not have error functions in main code');
    
    return true;
};

// ============================================================================
// BROWSER SMOKE TEST (One example to verify rendering works)
// ============================================================================

const runBrowserSmokeTest = async () => {
    let server = null;
    let browser = null;
    
    try {
        // Start server
        console.log('\n🌐 Starting test server...');
        server = await new Promise((resolve, reject) => {
            const srv = spawn('python3', ['-m', 'http.server', PORT.toString()], {
                stdio: 'ignore',
                cwd: process.cwd()
            });
            setTimeout(() => resolve(srv), 1500);
            srv.on('error', reject);
        });
        
        // Launch browser
        console.log('🚀 Launching browser...');
        browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();
        
        const errors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') errors.push(msg.text());
        });
        page.on('pageerror', err => errors.push(err.message));
        
        // Test multiple examples to ensure they all work
        const testExamples = [
            'examples/rl-ball-catch-pure.html',
            'examples/grid-world-minimal.html',
            'examples/magnet-circle-training.html'
        ];
        
        for (const testExample of testExamples) {
            const page = await browser.newPage();
            errors.length = 0; // Clear errors for this test
            
            page.on('console', msg => {
                if (msg.type() === 'error') errors.push(msg.text());
            });
            page.on('pageerror', err => errors.push(err.message));
            
            console.log(`📄 Testing ${testExample.split('/').pop()}...`);
            
            await page.goto(`${BASE_URL}/${testExample}`, {
                waitUntil: 'domcontentloaded',
                timeout: 10000
            });
            
            // Wait for JavaScript to execute
            await page.waitForTimeout(3000);
            
            // Check what actually rendered
            const pageInfo = await page.evaluate(() => {
            const app = document.getElementById('app');
            const hasVisibleContent = app && (app.children.length > 0 || app.textContent.trim().length > 100);
            
            return {
                hasApp: !!app,
                appHTML: app?.innerHTML?.length || 0,
                appChildren: app?.children.length || 0,
                appText: app?.textContent?.trim().length || 0,
                canvasCount: document.querySelectorAll('canvas').length,
                bodyTextLength: document.body.innerText.length,
                hasVisibleContent,
                title: document.title
            };
        });
            
            console.log(`    App: ${pageInfo.hasApp ? '✓' : '✗'} | Children: ${pageInfo.appChildren} | Canvas: ${pageInfo.canvasCount} | Text: ${pageInfo.appText} chars`);
            
            // Validate - app must have actual content
            assert(pageInfo.hasApp, 'Page should have #app container');
            assert(pageInfo.hasVisibleContent, `App container is empty (children: ${pageInfo.appChildren}, text: ${pageInfo.appText})`);
            
            // Check for critical JavaScript errors
            const critical = errors.filter(e => {
                const isModuleError = e.includes('Failed to load') || e.toLowerCase().includes('cannot find module');
                const isResourceError = e.includes('favicon') || e.includes('404');
                const isWarning = e.includes('Warning') || e.includes('DevTools');
                const isCritical = e.toLowerCase().includes('error') || e.toLowerCase().includes('typeerror');
                
                return isCritical && !isResourceError && !isWarning;
            });
            
            if (critical.length > 0) {
                await page.close();
                throw new Error(`JS errors in ${testExample}: ${critical[0]}`);
            }
            
            await page.close();
        }
        
        console.log(`✓ All ${testExamples.length} examples loaded successfully\n`);
        
        return true;
        
    } finally {
        if (browser) await browser.close();
        if (server) server.kill();
    }
};

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

(async () => {
    console.log('\n🧪 E2E VALIDATION\n');
    
    // Phase 1: Fast static validation of all examples
    console.log('📦 Phase 1: Static HTML Validation');
    for (const filepath of EXAMPLES) {
        const name = filepath.split('/').pop();
        try {
            validateHtmlStructure(filepath);
            console.log(`  ✓ ${name}`);
            passed++;
        } catch (error) {
            console.log(`  ✗ ${name}: ${error.message}`);
            failed++;
        }
    }
    
    // Phase 2: Component file checks
    console.log('\n📦 Phase 2: Component Files');
    const components = [
        ['rl-core.js', 'components/rl-core.js'],
        ['federated-core.js', 'components/federated-core.js'],
        ['metrics-core.js', 'components/metrics-core.js'],
        ['app-template.js', 'components/app-template.js']
    ];
    
    for (const [name, path] of components) {
        try {
            assert(existsSync(path), `Missing ${path}`);
            console.log(`  ✓ ${name}`);
            passed++;
        } catch (error) {
            console.log(`  ✗ ${name}: ${error.message}`);
            failed++;
        }
    }
    
    // Phase 3: Browser smoke test (REQUIRED - catches runtime issues)
    console.log('\n📦 Phase 3: Browser Smoke Test');
    try {
        await runBrowserSmokeTest();
        console.log(`  ✓ Browser test passed`);
        passed++;
    } catch (error) {
        console.log(`  ✗ Browser test failed: ${error.message}`);
        failed++;
    }
    
    // Summary
    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
})();
