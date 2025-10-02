/**
 * Live Parameter Control Panel
 * 
 * Reusable UI component for real-time hyperparameter tuning
 * during RL training sessions.
 * 
 * Usage:
 *   import { createLiveControls } from './live-controls.js';
 *   createLiveControls(app, config);
 */

/**
 * Create live parameter control panel
 * @param {Object} app - The federated app instance
 * @param {Object} config - Configuration object with parameters to control
 * @returns {Object} Control panel API
 */
export function createLiveControls(app, config) {
    // Inject styles
    injectStyles();
    
    // Create panel
    const panel = createPanel(config);
    document.body.appendChild(panel);
    
    // Create FAB toggle button
    const fab = document.createElement('div');
    fab.id = 'lc-toggle-fab';
    fab.innerHTML = '⚙️';
    fab.title = 'Toggle Controls (Ctrl+K)';
    document.body.appendChild(fab);
    
    // Wire up controls
    const api = wireControls(app, config, fab);
    
    console.log('🎛️ Live controls created (top-right corner)');
    console.log('   Press Ctrl+K or click ⚙️ button to toggle');
    
    return api;
}

/**
 * Inject CSS styles for control panel
 */
function injectStyles() {
    if (document.getElementById('live-controls-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'live-controls-styles';
    style.textContent = `
        #live-controls {
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(15, 23, 42, 0.98);
            border: 3px solid #22c55e;
            border-radius: 8px;
            padding: 15px;
            min-width: 300px;
            max-height: 90vh;
            overflow-y: auto;
            z-index: 9999;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
            color: #fff;
            font-family: monospace;
        }
        
        #live-controls h3 {
            margin: 0 0 15px 0;
            color: #22c55e;
            font-size: 14px;
            text-align: center;
        }
        
        .lc-group {
            margin-bottom: 12px;
            padding-bottom: 12px;
            border-bottom: 1px solid #334155;
        }
        
        .lc-group:last-of-type {
            border-bottom: none;
        }
        
        .lc-group label {
            display: block;
            font-size: 11px;
            color: #94a3b8;
            margin-bottom: 4px;
        }
        
        .lc-group input[type="range"] {
            width: 100%;
            margin: 4px 0;
        }
        
        .lc-group input[type="number"] {
            width: 80px;
            background: #1e293b;
            border: 1px solid #475569;
            color: #fff;
            padding: 4px 8px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 11px;
        }
        
        .lc-value {
            float: right;
            color: #22c55e;
            font-weight: bold;
            font-size: 12px;
        }
        
        .lc-button {
            width: 100%;
            padding: 8px;
            margin-top: 10px;
            background: #3b82f6;
            border: none;
            border-radius: 4px;
            color: white;
            cursor: pointer;
            font-family: monospace;
            font-size: 11px;
            font-weight: bold;
        }
        
        .lc-button:hover {
            background: #2563eb;
        }
        
        .lc-button.danger {
            background: #ef4444;
        }
        
        .lc-button.danger:hover {
            background: #dc2626;
        }
        
        .lc-section {
            margin-top: 15px;
            padding-top: 15px;
            border-top: 2px solid #334155;
        }
        
        .lc-section-title {
            color: #fbbf24;
            font-size: 12px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        
        #lc-toggle-fab {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: #22c55e;
            border: 3px solid #15803d;
            color: white;
            font-size: 24px;
            cursor: pointer;
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 9998;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
            transition: all 0.2s;
        }
        
        #lc-toggle-fab:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.5);
        }
        
        #lc-toggle-fab.visible {
            display: flex;
        }
    `;
    
    document.head.appendChild(style);
}

/**
 * Create panel HTML structure
 */
function createPanel(config) {
    const panel = document.createElement('div');
    panel.id = 'live-controls';
    
    let html = '<h3>⚙️ Live Training Controls</h3>';
    
    // Group parameters by category
    const categories = {
        'Training': ['maxSteps', 'alpha', 'gamma', 'epsilon', 'epsilonDecay', 'minEpsilon'],
        'Physics': ['strengthMed', 'strengthHigh', 'friction', 'maxVelocity'],
        'Rewards': ['flagReward', 'timeReward', 'energyReward', 'proximityReward'],
        'Performance': ['renderInterval']
    };
    
    for (const [category, params] of Object.entries(categories)) {
        const availableParams = params.filter(p => p in config);
        if (availableParams.length === 0) continue;
        
        html += `<div class="lc-section"><div class="lc-section-title">${category}</div>`;
        
        for (const param of availableParams) {
            const meta = getParamMetadata(param);
            if (!meta) continue;
            
            html += `
                <div class="lc-group">
                    <label>${meta.label}: <span class="lc-value" id="lc-val-${param}">${config[param]}</span></label>
                    <input type="range" 
                           id="lc-${param}" 
                           min="${meta.min}" 
                           max="${meta.max}" 
                           step="${meta.step}" 
                           value="${config[param]}">
                </div>
            `;
        }
        
        html += '</div>';
    }
    
    // Action buttons
    html += `
        <button class="lc-button" id="lc-apply">Apply to All Agents</button>
        <button class="lc-button danger" id="lc-reset">Reset to Defaults</button>
        <button class="lc-button" id="lc-toggle" style="margin-top: 5px; background: #6b7280;">Hide Panel</button>
    `;
    
    panel.innerHTML = html;
    return panel;
}

/**
 * Get parameter metadata (label, range, step)
 */
function getParamMetadata(param) {
    const metadata = {
        // Training
        maxSteps: { label: 'Episode Length', min: 200, max: 5000, step: 100 },
        alpha: { label: 'Learning Rate (α)', min: 0.01, max: 0.5, step: 0.01 },
        gamma: { label: 'Discount (γ)', min: 0.8, max: 0.99, step: 0.01 },
        epsilon: { label: 'Epsilon Start', min: 0.01, max: 1.0, step: 0.01 },
        epsilonDecay: { label: 'Epsilon Decay', min: 0.90, max: 0.999, step: 0.001 },
        minEpsilon: { label: 'Min Epsilon', min: 0.001, max: 0.1, step: 0.001 },
        
        // Physics
        strengthMed: { label: 'Magnet Strength (MED)', min: 10000, max: 150000, step: 5000 },
        strengthHigh: { label: 'Magnet Strength (HIGH)', min: 20000, max: 300000, step: 10000 },
        friction: { label: 'Friction', min: 0.5, max: 0.99, step: 0.01 },
        maxVelocity: { label: 'Max Velocity', min: 5, max: 30, step: 1 },
        
        // Rewards
        flagReward: { label: 'Flag Reward', min: 10, max: 500, step: 10 },
        timeReward: { label: 'Time Penalty', min: -1, max: 0, step: 0.01 },
        energyReward: { label: 'Energy Penalty', min: -0.1, max: 0, step: 0.001 },
        proximityReward: { label: 'Proximity Bonus', min: 0, max: 20, step: 1 },
        
        // Circle training specific
        targetRadius: { label: 'Target Radius', min: 50, max: 150, step: 5 },
        errorThreshold: { label: 'Error Threshold', min: 5, max: 30, step: 1 },
        
        // Performance
        renderInterval: { label: 'Render Interval', min: 1, max: 100, step: 1 }
    };
    
    return metadata[param];
}

/**
 * Wire up controls with event listeners
 */
function wireControls(app, config, fab) {
    // Store original values for reset
    const originalConfig = { ...config };
    
    let visible = true;
    
    // Get all parameter names from the panel
    const paramNames = Object.keys(config).filter(key => 
        document.getElementById(`lc-${key}`)
    );
    
    // Wire range inputs
    paramNames.forEach(param => {
        const input = document.getElementById(`lc-${param}`);
        const display = document.getElementById(`lc-val-${param}`);
        
        if (!input || !display) return;
        
        input.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            config[param] = value;
            display.textContent = value;
            
            // Special handling for renderInterval - update immediately
            if (param === 'renderInterval' && app.setRenderInterval) {
                app.setRenderInterval(value);
            }
        });
    });
    
    // Apply button
    document.getElementById('lc-apply').addEventListener('click', () => {
        if (app.clients) {
            app.clients.forEach(client => {
                if (client.agent) {
                    // Update agent hyperparameters
                    if ('alpha' in config) client.agent.alpha = config.alpha;
                    if ('gamma' in config) client.agent.gamma = config.gamma;
                    
                    // Note: epsilon changes require resetting epsilon value
                    // We don't do this automatically to avoid disrupting training
                }
            });
            
            console.log('✅ Parameters applied to all agents');
            console.log('  Current config:', config);
        }
    });
    
    // Reset button
    document.getElementById('lc-reset').addEventListener('click', () => {
        // Restore original values
        Object.assign(config, originalConfig);
        
        // Update UI
        paramNames.forEach(param => {
            const input = document.getElementById(`lc-${param}`);
            const display = document.getElementById(`lc-val-${param}`);
            if (input && display) {
                input.value = config[param];
                display.textContent = config[param];
            }
        });
        
        console.log('🔄 Parameters reset to defaults');
    });
    
    // Toggle visibility function
    const toggleVisibility = () => {
        const panel = document.getElementById('live-controls');
        const toggleBtn = document.getElementById('lc-toggle');
        visible = !visible;
        
        if (visible) {
            panel.style.display = 'block';
            fab.classList.remove('visible');
            toggleBtn.textContent = 'Hide Panel';
        } else {
            panel.style.display = 'none';
            fab.classList.add('visible');
            toggleBtn.textContent = 'Show Panel';
        }
    };
    
    // Toggle button in panel
    document.getElementById('lc-toggle').addEventListener('click', toggleVisibility);
    
    // FAB button click
    fab.addEventListener('click', toggleVisibility);
    
    // Keyboard shortcut: Ctrl+K
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'k') {
            e.preventDefault();
            toggleVisibility();
        }
    });
    
    return {
        hide: () => {
            if (visible) toggleVisibility();
        },
        show: () => {
            if (!visible) toggleVisibility();
        },
        toggle: toggleVisibility,
        destroy: () => {
            const panel = document.getElementById('live-controls');
            if (panel) panel.remove();
            if (fab) fab.remove();
        },
        getConfig: () => ({ ...config }),
        isVisible: () => visible
    };
}

