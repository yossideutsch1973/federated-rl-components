/**
 * APP-TEMPLATE.JS - Federated RL App Builder
 * 
 * Super easy way to create federated RL demos.
 * Define environment, render, and go!
 * 
 * @module app-template
 * @version 1.0.0
 */

import { createTabularAgent } from './rl-core.js';
import { createFederatedManager, serializeModel, deserializeModel } from './federated-core.js';
import { createDashboardLayout, createClientGrid, createControlBar, createInput, createMetricsPanel, updateMetric, injectDefaultStyles } from './ui-builder.js';

// ============================================================================
// FEDERATED RL APP TEMPLATE
// ============================================================================

/**
 * Create a complete federated RL application
 * 
 * Usage:
 * ```js
 * const app = createFederatedApp({
 *   name: 'Mountain Car',
 *   numClients: 8,
 *   environment: {
 *     actions: ['LEFT', 'STAY', 'RIGHT'],
 *     getState: (clientState) => `${clientState.x},${clientState.y}`,
 *     step: (state, action) => ({ state, reward, done }),
 *     reset: () => ({ state }),
 *   },
 *   render: (ctx, state) => { ... }
 * });
 * ```
 * 
 * @param {Object} config - App configuration
 * @returns {Object} App interface
 */
export const createFederatedApp = (config) => {
    const {
        // App metadata
        name = 'Federated RL Demo',
        subtitle = 'Multi-client reinforcement learning',
        containerId = 'app',
        
        // Client configuration
        numClients = 4,
        canvasWidth = 300,
        canvasHeight = 220,
        
        // RL parameters
        alpha = 0.1,
        gamma = 0.95,
        epsilon = 0.2,
        epsilonDecay = 0.995,
        minEpsilon = 0.01,
        
        // Federation parameters
        autoFederate = false,
        federationInterval = 100,
        federationStrategy = 'episodes',
        
        // Environment (required)
        environment,
        
        // Rendering (optional)
        render = null,
        
        // Lifecycle hooks (optional)
        onClientInit = null,
        onEpisodeEnd = null,
        onFederation = null
    } = config;

    // Validate required fields
    if (!environment) {
        throw new Error('environment configuration required');
    }
    if (!environment.actions || !environment.getState || !environment.step || !environment.reset) {
        throw new Error('environment must define: actions, getState, step, reset');
    }

    // Inject default styles
    injectDefaultStyles();

    // Create UI layout
    const layout = createDashboardLayout({ title: name, subtitle, containerId });
    if (!layout) {
        throw new Error(`Container #${containerId} not found`);
    }

    // Create control bar
    const buttons = createControlBar({
        container: layout.controls,
        buttons: [
            { id: 'btn-start', label: '▶ Start', className: 'btn' },
            { id: 'btn-pause', label: '⏸ Pause', className: 'btn' },
            { id: 'btn-federate', label: '🔄 Federate', className: 'btn' },
            { id: 'btn-reset', label: '↻ Reset', className: 'btn' },
            { id: 'btn-export', label: '💾 Export', className: 'btn' },
            { id: 'btn-load', label: '📂 Load', className: 'btn' },
            { id: 'btn-inference', label: '🔮 Inference', className: 'btn' }
        ]
    });

    // Create client count input
    const clientCountInput = createInput({
        type: 'number',
        label: 'Clients:',
        id: 'client-count-input',
        defaultValue: numClients,
        attrs: { min: 1, max: 100 },
        container: layout.controls
    });

    // Create auto-federate checkbox
    const autoFedCheckbox = createInput({
        type: 'checkbox',
        label: 'Auto-Federate',
        id: 'auto-fed-checkbox',
        defaultValue: autoFederate,
        container: layout.controls
    });

    // Create metrics panel
    const metrics = createMetricsPanel({
        container: layout.metrics,
        metrics: [
            { id: 'metric-round', label: 'Federation Round' },
            { id: 'metric-states', label: 'Avg States Learned' },
            { id: 'metric-episodes', label: 'Avg Episodes' },
            { id: 'metric-epsilon', label: 'Avg Epsilon' }
        ]
    });

    // Create hidden file input for model loading
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    // Initialize state
    let clients = [];
    let isRunning = false;
    let isInferenceMode = false;
    let animationId = null;

    // Create federated manager
    const fedManager = createFederatedManager({
        federationInterval,
        autoFederate: autoFedCheckbox.checked,
        strategy: federationStrategy
    });

    // Initialize clients
    const initClients = (count) => {
        // Stop existing clients
        if (isRunning) {
            isRunning = false;
            cancelAnimationFrame(animationId);
        }

        // Clear client grid
        layout.clients.innerHTML = '';

        // Create client grid
        const clientElements = createClientGrid({
            numClients: count,
            canvasWidth,
            canvasHeight,
            container: layout.clients
        });

        // Initialize clients
        clients = clientElements.map((el, i) => {
            const agent = createTabularAgent({
                alpha,
                gamma,
                epsilon,
                epsilonDecay,
                minEpsilon,
                numActions: environment.actions.length
            });

            const state = environment.reset(i);
            
            const client = {
                id: i,
                agent,
                element: el,
                canvas: el.canvas,
                ctx: el.canvas.getContext('2d'),
                state,
                metrics: {
                    episodeCount: 0,
                    totalReward: 0,
                    stepCount: 0
                },
                getAgent: () => agent,
                getMetrics: () => client.metrics
            };

            // Call init hook if provided
            if (onClientInit) {
                onClientInit(client);
            }

            return client;
        });

        updateGlobalMetrics();
    };

    // Update global metrics display
    const updateGlobalMetrics = () => {
        const avgStates = clients.reduce((sum, c) => 
            sum + Object.keys(c.agent.getModel()).length, 0) / clients.length;
        const avgEpisodes = clients.reduce((sum, c) => 
            sum + c.metrics.episodeCount, 0) / clients.length;
        const avgEpsilon = clients.reduce((sum, c) => 
            sum + c.agent.getEpsilon(), 0) / clients.length;

        updateMetric(metrics['metric-round'], fedManager.getRound());
        updateMetric(metrics['metric-states'], Math.floor(avgStates));
        updateMetric(metrics['metric-episodes'], Math.floor(avgEpisodes));
        updateMetric(metrics['metric-epsilon'], avgEpsilon, 'decimal');
    };

    // Update client display
    const updateClientDisplay = (client) => {
        const model = client.agent.getModel();
        const statesLearned = Object.keys(model).length;
        
        client.element.metrics.innerHTML = `
            <div>States: ${statesLearned} | Episodes: ${client.metrics.episodeCount}</div>
            <div>ε: ${client.agent.getEpsilon().toFixed(3)} | Reward: ${client.metrics.totalReward.toFixed(1)}</div>
        `;
    };

    // Simulation step for one client (supports async step functions)
    const stepClient = async (client) => {
        const stateKey = environment.getState(client.state);
        const action = client.agent.chooseAction(stateKey);
        
        // Support both sync and async step functions
        const stepResult = environment.step(client.state, action);
        const { state: nextState, reward, done } = stepResult instanceof Promise ? await stepResult : stepResult;
        
        const nextStateKey = environment.getState(nextState);
        client.agent.learn(stateKey, action, reward, nextStateKey);
        
        client.state = nextState;
        client.metrics.totalReward += reward;
        client.metrics.stepCount++;
        
        if (done) {
            client.metrics.episodeCount++;
            client.agent.decayEpsilon();
            client.state = environment.reset(client.id);
            
            if (onEpisodeEnd) {
                onEpisodeEnd(client);
            }
        }
        
        // Render if provided
        if (render) {
            render(client.ctx, client.state, client);
        }
        
        updateClientDisplay(client);
    };

    // Animation loop (supports async step functions)
    const animate = async () => {
        if (!isRunning) return;

        // Step all clients (sequentially if async, to avoid race conditions)
        for (const client of clients) {
            await stepClient(client);
        }

        // Check auto-federation
        if (fedManager.shouldFederate(clients)) {
            performFederation();
        }

        // Update global metrics
        if (clients[0].metrics.stepCount % 10 === 0) {
            updateGlobalMetrics();
        }

        animationId = requestAnimationFrame(animate);
    };

    // Perform federation
    const performFederation = () => {
        const globalModel = fedManager.federate(clients);
        
        if (onFederation) {
            onFederation(globalModel, fedManager.getRound());
        }
        
        updateGlobalMetrics();
        console.log(`✅ Federation round ${fedManager.getRound()} complete`);
    };

    // Button handlers
    buttons['btn-start'].onclick = () => {
        if (!isRunning) {
            isRunning = true;
            animate();
            buttons['btn-start'].textContent = '⏸ Pause';
        } else {
            isRunning = false;
            buttons['btn-start'].textContent = '▶ Start';
        }
    };

    buttons['btn-federate'].onclick = () => {
        performFederation();
    };

    buttons['btn-reset'].onclick = () => {
        isRunning = false;
        fedManager.reset();
        initClients(parseInt(clientCountInput.value) || numClients);
        buttons['btn-start'].textContent = '▶ Start';
    };

    buttons['btn-export'].onclick = () => {
        const models = clients.map(c => c.agent.getModel());
        const globalModel = fedManager.federate(clients);
        const json = serializeModel(globalModel, {
            appName: name,
            numClients: clients.length,
            federationRound: fedManager.getRound()
        });
        
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${name.replace(/\s+/g, '-')}-model-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    buttons['btn-load'].onclick = () => {
        fileInput.click();
    };

    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const data = deserializeModel(event.target.result);
            if (data) {
                clients.forEach(c => c.agent.setModel(data.model));
                alert('✅ Model loaded successfully');
            } else {
                alert('❌ Invalid model file');
            }
        };
        reader.readAsText(file);
    };

    buttons['btn-inference'].onclick = () => {
        isInferenceMode = !isInferenceMode;
        clients.forEach(c => c.agent.setInferenceMode(isInferenceMode));
        buttons['btn-inference'].textContent = isInferenceMode ? '🎯 Training' : '🔮 Inference';
        buttons['btn-inference'].style.background = isInferenceMode ? '#4f8cff' : '#444';
    };

    autoFedCheckbox.onchange = () => {
        fedManager.setAutoFederate(autoFedCheckbox.checked);
    };

    clientCountInput.onchange = () => {
        const count = parseInt(clientCountInput.value);
        if (count >= 1 && count <= 100) {
            initClients(count);
        }
    };

    // Initialize
    initClients(numClients);

    // Return app interface
    return {
        start: () => {
            if (!isRunning) {
                buttons['btn-start'].click();
            }
        },
        pause: () => {
            if (isRunning) {
                buttons['btn-start'].click();
            }
        },
        federate: () => {
            performFederation();
        },
        reset: () => {
            buttons['btn-reset'].click();
        },
        getClients: () => clients,
        getFedManager: () => fedManager,
        isRunning: () => isRunning
    };
};

// Export
export default {
    createFederatedApp
};
