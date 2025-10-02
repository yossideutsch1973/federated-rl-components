/**
 * E2E validation: Check that example HTML files are valid
 * Validates structure without browser (basic checks)
 */

import { readFileSync, existsSync } from 'fs';
import { runTests, assert } from '../helpers/assert.js';

const EXAMPLES = [
    'examples/rl-ball-catch-pure.html',
    'examples/grid-world-minimal.html',
    'examples/magnet-circle-training.html',
    'examples/magnet-slalom-control.html',
    'examples/magnet-multitask-learning.html',
    'examples/mountain-car.html',
    'examples/federated-llm-learning.html'
];

const validateHtmlStructure = (filepath) => {
    if (!existsSync(filepath)) {
        throw new Error(`File not found: ${filepath}`);
    }
    
    const content = readFileSync(filepath, 'utf-8');
    
    // Basic HTML validation
    assert(content.includes('<html'), 'Should have HTML tag');
    assert(content.includes('<head'), 'Should have head tag');
    assert(content.includes('<body'), 'Should have body tag');
    
    // Check for canvas or app creation (canvas created dynamically by createFederatedApp)
    const hasCanvas = content.includes('<canvas') || 
                      content.includes('document.createElement("canvas")') ||
                      content.includes('createFederatedApp') ||
                      content.includes('id="app"');
    assert(hasCanvas, 'Should have canvas or app container');
    
    // Check for component imports
    const hasRlCore = content.includes('rl-core.js');
    const hasAppTemplate = content.includes('app-template.js');
    const hasComponents = content.includes('components/');
    assert(hasRlCore || hasAppTemplate || hasComponents, 'Should import RL components');
    
    // Check for no obvious syntax errors
    assert(!content.includes('undefined undefined'), 'Should not have obvious errors');
    
    return true;
};

const tests = {};

// Generate test for each example
EXAMPLES.forEach(filepath => {
    const name = filepath.split('/').pop();
    tests[`validate ${name}`] = () => {
        validateHtmlStructure(filepath);
    };
});

// Additional structural tests
tests['all examples exist'] = () => {
    const missingFiles = EXAMPLES.filter(f => !existsSync(f));
    assert(missingFiles.length === 0, `Missing files: ${missingFiles.join(', ')}`);
};

tests['component files exist'] = () => {
    const components = [
        'components/rl-core.js',
        'components/federated-core.js',
        'components/metrics-core.js'
    ];
    
    const missingComponents = components.filter(f => !existsSync(f));
    assert(missingComponents.length === 0, `Missing components: ${missingComponents.join(', ')}`);
};

runTests('EXAMPLE VALIDATION', tests);

