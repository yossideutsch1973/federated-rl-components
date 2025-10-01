// Extract and check the JavaScript from the HTML file
const fs = require('fs');
const html = fs.readFileSync('/Users/yossideutsch/fun/my-prompts-tests/federated-rl-demo.html', 'utf8');

// Extract script content
const scriptMatch = html.match(/<script>([\s\S]*)<\/script>/);
if (!scriptMatch) {
    console.log('ERROR: No script tag found');
    process.exit(1);
}

const script = scriptMatch[1];

// Check for common issues
console.log('=== JavaScript Health Check ===\n');

// 1. Check for unmatched braces
const openBraces = (script.match(/{/g) || []).length;
const closeBraces = (script.match(/}/g) || []).length;
console.log(`Braces: ${openBraces} open, ${closeBraces} close ${openBraces === closeBraces ? '✓' : '✗'}`);

// 2. Check for unmatched parentheses
const openParens = (script.match(/\(/g) || []).length;
const closeParens = (script.match(/\)/g) || []).length;
console.log(`Parens: ${openParens} open, ${closeParens} close ${openParens === closeParens ? '✓' : '✗'}`);

// 3. Check for key functions
const hasInitializeApp = script.includes('const initializeApp');
const hasCreateFederatedSystem = script.includes('const createFederatedSystem');
const hasAppInit = script.includes('app = initializeApp()');

console.log(`\nKey functions:`);
console.log(`  initializeApp: ${hasInitializeApp ? '✓' : '✗'}`);
console.log(`  createFederatedSystem: ${hasCreateFederatedSystem ? '✓' : '✗'}`);
console.log(`  app initialization: ${hasAppInit ? '✓' : '✗'}`);

// 4. Check return statement
const returnMatch = script.match(/return \{ ([^}]+) \}/);
if (returnMatch) {
    console.log(`\nFederated system returns: ${returnMatch[1]}`);
}

console.log('\n=== End Check ===');
