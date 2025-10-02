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
import { createFederatedManager, serializeModel, deserializeModel, computeModelDelta } from './federated-core.js';
import { createDashboardLayout, createClientGrid, createControlBar, createInput, createMetricsPanel, updateMetric, injectDefaultStyles } from './ui-builder.js';
import { MODES, createModeSwitcher, updateVisibility } from './mode-switcher.js';
import { createInferenceAgent, runEvaluation, createInferenceUI, createResultsPanel, updateResults } from './inference-mode.js';
import { createPersistenceManager } from './model-persistence.js';
import { createTrainingDashboard } from './training-monitor.js';

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
        renderInterval = 50,  // Render every N steps (higher = faster, less smooth)
        
        // RL parameters
        alpha = 0.1,
        gamma = 0.95,
        epsilon = 0.2,
        epsilonDecay = 0.995,
        minEpsilon = 0.001,
        
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
        onFederation = null,
        visualizeTraining = false,
        trainingDashboardOptions = {},
        
        // Metrics/KPIs configuration (optional)
        metrics = null
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

    // Mode state
    let currentMode = MODES.TRAINING;
    
    // Make renderInterval mutable for live updates
    let _renderInterval = renderInterval;

    // Toast notification system (non-blocking feedback)
    const showToast = (title, message = '', duration = 3000) => {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(15, 23, 42, 0.95);
            border: 2px solid #3b82f6;
            border-radius: 8px;
            padding: 12px 16px;
            color: #fff;
            font-family: monospace;
            font-size: 13px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease-out;
        `;
        toast.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 4px;">${title}</div>
            ${message ? `<div style="color: #94a3b8; font-size: 11px;">${message}</div>` : ''}
        `;
        
        // Add animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(400px); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(400px); opacity: 0; }
            }
        `;
        if (!document.querySelector('#toast-animations')) {
            style.id = 'toast-animations';
            document.head.appendChild(style);
        }
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    };

    // Training controls container
    const trainingControlsDiv = document.createElement('div');
    trainingControlsDiv.id = 'training-controls';
    layout.controls.appendChild(trainingControlsDiv);

    // Inference controls container
    const inferenceControlsDiv = document.createElement('div');
    inferenceControlsDiv.id = 'inference-controls';
    inferenceControlsDiv.style.display = 'none';
    layout.controls.appendChild(inferenceControlsDiv);

    // Create control bar (TRAINING MODE)
    const buttons = createControlBar({
        container: trainingControlsDiv,
        buttons: [
            { id: 'btn-start', label: '▶ Start', className: 'btn' },
            { id: 'btn-federate', label: '🔄 Federate', className: 'btn' },
            { id: 'btn-reset', label: '↻ Reset', className: 'btn' },
            { id: 'btn-save', label: '💾 Save Checkpoint', className: 'btn' },
            { id: 'btn-load', label: '📂 Load Checkpoint', className: 'btn' },
            { id: 'btn-export', label: '📥 Export', className: 'btn' }
        ]
    });

    // Create client count input
    const clientCountInput = createInput({
        type: 'number',
        label: 'Clients:',
        id: 'client-count-input',
        defaultValue: numClients,
        attrs: { min: 1, max: 1000 },
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
    const metricsPanel = createMetricsPanel({
        container: layout.metrics,
        metrics: [
            { id: 'metric-round', label: 'Federation Round' },
            { id: 'metric-states', label: 'Avg States Learned' },
            { id: 'metric-episodes', label: 'Avg Episodes' },
            { id: 'metric-epsilon', label: 'Avg Epsilon' }
        ]
    });

    const { heatmapLimit = 24, ...dashboardOverrides } = trainingDashboardOptions || {};
    const defaultDashboardOptions = {
        historySize: 300,
        qTableShape: {
            rows: heatmapLimit,
            cols: environment.actions.length
        }
    };

    let dashboardHost = null;
    if (visualizeTraining) {
        dashboardHost = document.createElement('div');
        dashboardHost.id = 'training-dashboard';
        dashboardHost.style.marginTop = '16px';
        layout.metrics.appendChild(dashboardHost);
    }

    // Create inference UI
    let inferenceUI = null;
    let resultsPanel = null;
    let evaluationRunning = false;
    let evaluationCancelled = false;

    // Create persistence manager (DI pattern)
    const persistence = createPersistenceManager({
        appName: name,
        onLoad: (model, metadata, source) => {
            if (currentMode === MODES.TRAINING) {
                // Load to all training clients
                clients.forEach(c => c.agent.setModel(model));
                alert(`✅ Model loaded from ${source}\n${metadata.totalStates || 0} states`);
                console.log('📂 Model loaded:', metadata);
            } else {
                // Load for inference
                if (trainingClients.length === 0) {
                    trainingClients = [{
                        agent: createTabularAgent({
                            alpha: 0,
                            gamma: 0,
                            epsilon: 0,
                            numActions: environment.actions.length
                        })
                    }];
                }
                trainingClients[0].agent.setModel(model);
                alert(`✅ Model loaded for inference\n${metadata.totalStates || 0} states`);
                if (inferenceUI) {
                    inferenceUI.modelSelect.value = 'file';
                }
            }
        },
        onError: (error) => {
            alert(`❌ Load failed: ${error}`);
        }
    });

    // Initialize state
    let clients = [];
    let trainingClients = []; // Backup of training clients
    let isRunning = false;
    let animationId = null;
    let lastCheckpointTime = null;

    const dashboard = visualizeTraining ? createTrainingDashboard({
        container: dashboardHost || layout.metrics,
        ...defaultDashboardOptions,
        ...dashboardOverrides
    }) : null;

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
        if (dashboard) {
            dashboard.reset();
        }
    };

    // Update global metrics display
    const updateGlobalMetrics = () => {
        const avgStates = clients.reduce((sum, c) => 
            sum + Object.keys(c.agent.getModel()).length, 0) / clients.length;
        const avgEpisodes = clients.reduce((sum, c) => 
            sum + c.metrics.episodeCount, 0) / clients.length;
        const avgEpsilon = clients.reduce((sum, c) => 
            sum + c.agent.getEpsilon(), 0) / clients.length;

        updateMetric(metricsPanel['metric-round'], fedManager.getRound());
        updateMetric(metricsPanel['metric-states'], Math.floor(avgStates));
        updateMetric(metricsPanel['metric-episodes'], Math.floor(avgEpisodes));
        updateMetric(metricsPanel['metric-epsilon'], avgEpsilon, 'decimal');
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
        
        // Store action for rendering
        client.lastAction = action;
        
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
            
            // Save episode result before reset
            const completedEpisode = {
                bounces: client.state.bounces || 0,
                catches: client.state.catches || 0,
                misses: client.state.misses || 0,
                steps: client.state.steps || 0
            };
            
            // Pass old state to reset so cumulative stats can be preserved
            const oldState = client.state;
            client.state = environment.reset(client.id, oldState);
            
            if (onEpisodeEnd) {
                onEpisodeEnd(client, completedEpisode);
            }

            if (dashboard) {
                dashboard.update({
                    episode: client.metrics.episodeCount,
                    reward: client.metrics.totalReward,
                    successCount: completedEpisode.success ? 1 : 0,
                    episodeCount: client.metrics.episodeCount,
                    qValueAvg: 0,
                    fps: 0,
                    qMatrixUpdate: null
                });
            }
        }
        
        // Render if provided (throttled by renderInterval)
        if (render && frameCount % _renderInterval === 0) {
            render(client.ctx, client.state, client);
        }

        updateClientDisplay(client);
    };

    // Frame counter for render throttling
    let frameCount = 0;

    // Animation loop (supports async step functions)
    const animate = async () => {
        if (!isRunning) return;

        frameCount++;

        // Step all clients IN PARALLEL for maximum performance
        await Promise.all(clients.map(client => stepClient(client)));

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

    // Perform federation with delta tracking
    const performFederation = () => {
        // Capture old model before federation
        const oldModel = clients[0]?.agent?.getModel() || {};
        
        // Perform federation
        const clientModelsBefore = clients.map(c => c.agent.getModel());
        const globalModel = fedManager.federate(clients);
        
        // Compute model delta (convergence detection)
        const delta = computeModelDelta(oldModel, globalModel);
        
        // Display feedback
        const round = fedManager.getRound();
        let message = `🔄 Federation Round ${round}\n`;
        message += `States: ${delta.totalStates}\n`;
        message += `Changed: ${delta.statesChanged} (${Math.round(delta.statesChanged/delta.totalStates*100)}%)\n`;
        message += `Avg Δ: ${delta.avgDelta.toFixed(4)}\n`;
        message += `Max Δ: ${delta.maxDelta.toFixed(4)}\n`;
        
        if (delta.converged) {
            message += `\n✅ Models converged! (Δ < 0.01)`;
        }
        
        console.log(message);
        
        // Show toast notification (non-blocking)
        showToast(delta.converged ? '✅ Federated (Converged)' : `🔄 Federated R${round}`, 
                  `${delta.statesChanged}/${delta.totalStates} states changed`);
        
        if (dashboard) {
            dashboard.markFederation({
                round,
                avgDelta: delta.avgDelta,
                delta: { ...delta, round },
                perClientModels: clientModelsBefore,
                globalModel
            });
        }

        if (onFederation) {
            onFederation(globalModel, round, delta);
        }
        
        updateGlobalMetrics();
    };

    // =========================================================================
    // INFERENCE MODE FUNCTIONS (Must be defined before mode switching)
    // =========================================================================

    const startInference = async ({ numEpisodes, modelSource }) => {
        evaluationCancelled = false;
        evaluationRunning = true;

        inferenceUI.runBtn.disabled = true;
        inferenceUI.stopBtn.disabled = false;
        resultsPanel.exportBtn.style.display = 'none';

        // Get model
        let modelData;
        if (modelSource === 'latest') {
            // Load from localStorage using persistence manager's key
            const storageKey = persistence.getKey();
            const storedData = localStorage.getItem(storageKey);
            if (!storedData) {
                alert('❌ No training data found. Please train the model first.');
                evaluationRunning = false;
                inferenceUI.runBtn.disabled = false;
                inferenceUI.stopBtn.disabled = true;
                return;
            }
            modelData = deserializeModel(storedData);
            if (!modelData) {
                alert('❌ Invalid checkpoint data.');
                evaluationRunning = false;
                inferenceUI.runBtn.disabled = false;
                inferenceUI.stopBtn.disabled = true;
                return;
            }
        } else {
            // Model from file (already loaded)
            if (!trainingClients[0]?.agent) {
                alert('❌ Please load a model file first.');
                evaluationRunning = false;
                inferenceUI.runBtn.disabled = false;
                inferenceUI.stopBtn.disabled = true;
                return;
            }
            modelData = { model: trainingClients[0].agent.getModel() };
        }

        // Create frozen agent
        const frozenAgent = createInferenceAgent(
            modelData.model,
            environment.actions.length
        );

        console.log(`🎯 Starting inference: ${numEpisodes} episodes with frozen weights (ε=0, α=0)`);

        // Run evaluation
        try {
            // Track cumulative results for progress updates
            let cumulativeTotalReward = 0;
            let cumulativeSuccessCount = 0;
            let cumulativeFailureCount = 0;
            
            const results = await runEvaluation({
                agent: frozenAgent,
                environment,
                getState: environment.getState,
                numEpisodes,
                ...(metrics && { metricsConfig: metrics }),
                renderFn: render,
                ctx: clients[0].ctx,
                onEpisodeComplete: (episodeResult, current, total) => {
                    if (evaluationCancelled) return;
                    
                    // Update cumulative stats
                    cumulativeTotalReward += episodeResult.totalReward;
                    if (episodeResult.success) cumulativeSuccessCount++;
                    else cumulativeFailureCount++;
                    
                    // Create partial results for progress display
                    const partialResults = {
                        episodes: [],  // Not needed for progress display
                        totalReward: cumulativeTotalReward,
                        successCount: cumulativeSuccessCount,
                        failureCount: cumulativeFailureCount
                    };
                    updateResults(resultsPanel.content, partialResults, current, total);
                },
                onAllComplete: (finalResults) => {
                    if (evaluationCancelled) {
                        console.log('⏹ Inference cancelled');
                        return;
                    }

                    updateResults(resultsPanel.content, finalResults);
                    resultsPanel.exportBtn.style.display = 'inline-block';
                    resultsPanel.exportBtn.onclick = () => exportInferenceResults(finalResults);
                    
                    console.log('✅ Inference complete:', finalResults);
                }
            });

            if (!evaluationCancelled) {
                console.log('📊 Final Results:', results);
            }
        } catch (error) {
            console.error('❌ Inference error:', error);
            alert('Inference failed: ' + error.message);
        } finally {
            evaluationRunning = false;
            inferenceUI.runBtn.disabled = false;
            inferenceUI.stopBtn.disabled = true;
        }
    };

    const stopInference = () => {
        evaluationCancelled = true;
        console.log('⏹ Stopping inference...');
    };

    const loadModelFromFile = () => {
        persistence.import();
    };

    const exportInferenceResults = (results) => {
        const data = {
            appName: name,
            timestamp: new Date().toISOString(),
            summary: {
                totalEpisodes: results.episodes.length,
                successRate: results.successRate,
                avgReward: results.avgReward,
                stdReward: results.stdReward,
                consistency: results.consistency
            },
            episodes: results.episodes.map(ep => ({
                episode: ep.episodeNum,
                reward: ep.totalReward,
                steps: ep.steps,
                success: ep.success
            }))
        };

        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${name.replace(/\s+/g, '-')}-inference-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const setupInferenceUI = () => {
        if (!inferenceUI) {
            inferenceUI = createInferenceUI({
                container: inferenceControlsDiv,
                onRunTest: startInference,
                onStop: stopInference,
                onLoadModel: loadModelFromFile
            });
            resultsPanel = createResultsPanel(inferenceControlsDiv);
        }
    };

    // =========================================================================
    // MODE SWITCHING LOGIC
    // =========================================================================

    const onModeSwitch = (mode) => {
        if (mode === MODES.INFERENCE) {
            switchToInferenceMode();
        } else {
            switchToTrainingMode();
        }
    };

    const switchToInferenceMode = () => {
        console.log('🎯 Switching to INFERENCE mode...');
        
        // Stop training
        if (isRunning) {
            isRunning = false;
            cancelAnimationFrame(animationId);
        }

        // Save current training state
        if (clients.length > 0) {
            const globalModel = fedManager.federate(clients);
            persistence.save(globalModel, {
                numClients: clients.length,
                federationRound: fedManager.getRound()
            });
            trainingClients = [...clients];
            console.log('✅ Training state saved');
        }

        // Show/hide UI elements
        console.log('Hiding training controls...');
        trainingControlsDiv.style.display = 'none';
        inferenceControlsDiv.style.display = 'block';
        
        // Hide input containers (with safety check)
        if (autoFedCheckbox && autoFedCheckbox.container) {
            autoFedCheckbox.container.style.display = 'none';
            console.log('✅ Auto-federate hidden');
        } else {
            console.error('❌ autoFedCheckbox.container not found!', autoFedCheckbox);
        }
        
        if (clientCountInput && clientCountInput.container) {
            clientCountInput.container.style.display = 'none';
            console.log('✅ Client count input hidden');
        } else {
            console.error('❌ clientCountInput.container not found!', clientCountInput);
        }
        
        console.log('✅ Controls visibility updated');
        console.log('inferenceControlsDiv visible?', inferenceControlsDiv.style.display);
        console.log('inferenceControlsDiv children:', inferenceControlsDiv.children.length);

        // Setup inference UI
        console.log('Setting up inference UI...');
        setupInferenceUI();
        console.log('✅ Inference UI setup complete');
        console.log('inferenceUI created?', !!inferenceUI);
        console.log('inferenceControlsDiv children after setup:', inferenceControlsDiv.children.length);

        // Clear client grid and show single canvas
        console.log('Clearing client grid and creating single canvas...');
        layout.clients.innerHTML = '';
        console.log('layout.clients cleared, children:', layout.clients.children.length);
        
        const singleCanvas = document.createElement('canvas');
        singleCanvas.width = canvasWidth;
        singleCanvas.height = canvasHeight;
        singleCanvas.style.cssText = `
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(16, 185, 129, 0.3);
            background: #0f172a;
            margin: 20px auto;
            display: block;
        `;
        console.log('Canvas created:', singleCanvas.width, 'x', singleCanvas.height);
        
        layout.clients.appendChild(singleCanvas);
        console.log('Canvas appended, children:', layout.clients.children.length);

        clients = [{
            id: 0,
            canvas: singleCanvas,
            ctx: singleCanvas.getContext('2d'),
            state: environment.reset(0)
        }];
        console.log('Single client configured');

        console.log('🎯 ✅ Switched to INFERENCE mode successfully');
    };

    const switchToTrainingMode = () => {
        // Stop any inference
        evaluationCancelled = true;

        // Show/hide UI elements
        trainingControlsDiv.style.display = 'block';
        inferenceControlsDiv.style.display = 'none';
        autoFedCheckbox.container.style.display = 'block';
        clientCountInput.container.style.display = 'block';

        // Restore training clients
        if (trainingClients.length > 0) {
            layout.clients.innerHTML = '';
            const clientElements = createClientGrid({
                numClients: trainingClients.length,
                canvasWidth,
                canvasHeight,
                container: layout.clients
            });

            clients = trainingClients.map((oldClient, i) => ({
                ...oldClient,
                element: clientElements[i],
                canvas: clientElements[i].canvas,
                ctx: clientElements[i].canvas.getContext('2d')
            }));
        } else {
            initClients(numClients);
        }

        console.log('🧠 Switched to TRAINING mode');
    };

    // =========================================================================
    // CREATE MODE SWITCHER (After functions are defined)
    // =========================================================================

    const modeSwitcher = createModeSwitcher({
        container: layout.controls,
        initialMode: currentMode,
        onModeChange: (mode, theme) => {
            currentMode = mode;
            onModeSwitch(mode);
        }
    });

    // Move mode switcher to top of controls
    layout.controls.insertBefore(modeSwitcher.container, layout.controls.firstChild);

    // =========================================================================
    // BUTTON HANDLERS (TRAINING MODE)
    // =========================================================================

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

    buttons['btn-save'].onclick = () => {
        const globalModel = fedManager.federate(clients);
        const saved = persistence.save(globalModel, {
            numClients: clients.length,
            federationRound: fedManager.getRound(),
            avgEpisodes: clients.reduce((sum, c) => sum + c.getMetrics().episodeCount, 0) / clients.length
        });
        
        if (saved) {
            lastCheckpointTime = new Date().toLocaleTimeString();
            showToast('💾 Checkpoint Saved', `Round ${fedManager.getRound()}, ${lastCheckpointTime}`);
        } else {
            alert('❌ Failed to save checkpoint');
        }
    };

    buttons['btn-load'].onclick = () => {
        if (!persistence.hasCheckpoint()) {
            // No localStorage checkpoint, try file import
            persistence.import();
        } else {
            // Ask user: load from localStorage or file?
            const choice = confirm('Load checkpoint from localStorage?\n\nOK = localStorage\nCancel = Choose file');
            if (choice) {
                persistence.load();
            } else {
                persistence.import();
            }
        }
    };

    buttons['btn-export'].onclick = () => {
        const globalModel = fedManager.federate(clients);
        const success = persistence.export(globalModel, {
            numClients: clients.length,
            federationRound: fedManager.getRound(),
            avgEpisodes: clients.reduce((sum, c) => sum + c.getMetrics().episodeCount, 0) / clients.length
        });
        
        if (success) {
            showToast('📥 Model Exported', `Round ${fedManager.getRound()}`);
        } else {
            alert('❌ Export failed');
        }
    };

    autoFedCheckbox.onchange = () => {
        fedManager.setAutoFederate(autoFedCheckbox.checked);
    };

    clientCountInput.onchange = () => {
        const count = parseInt(clientCountInput.value);
        if (count >= 1 && count <= 1000) {
            // Warn about performance with large client counts
            if (count > 100 && _renderInterval < 10) {
                console.warn(`⚠️ Using ${count} clients with renderInterval=${_renderInterval}.`);
                console.warn('   Consider increasing renderInterval to 50-100 for better performance.');
            }
            if (count > 500) {
                console.warn(`⚠️ ${count} clients may cause UI lag. Recommended: renderInterval ≥ 100`);
            }
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
        setRenderInterval: (value) => {
            _renderInterval = Math.max(1, Math.min(1000, value));
            console.log(`🎨 Render interval updated to ${_renderInterval}`);
        },
        getRenderInterval: () => _renderInterval,
        getClients: () => clients,
        getFedManager: () => fedManager,
        isRunning: () => isRunning,
        clients // Expose clients directly for live-controls
    };
};

// Export
export default {
    createFederatedApp
};
