/**
 * INFERENCE-MODE.JS - Model Evaluation and Testing
 * 
 * Provides frozen model evaluation with aggregate metrics.
 * Runs N test episodes with ε=0 (greedy policy) and α=0 (no learning).
 * Supports custom KPI tracking via metrics-core.js.
 * 
 * @module inference-mode
 * @version 1.0.0
 */

import { createEpisodeTracker, DEFAULT_CONFIGS } from './metrics-core.js';

import { createTabularAgent } from './rl-core.js';

// ============================================================================
// INFERENCE CONFIGURATION
// ============================================================================

export const INFERENCE_CONFIG = {
    testEpisodes: [10, 25, 50, 100],
    defaultTestEpisodes: 50,
    epsilon: 0.0,  // Greedy policy only
    alpha: 0.0,    // No learning
    maxStepsPerEpisode: 300
};

// ============================================================================
// FROZEN AGENT (NO LEARNING)
// ============================================================================

/**
 * Create inference agent with frozen weights
 * ε = 0 (greedy only), α = 0 (no Q-updates)
 * 
 * @param {Object} model - Pre-trained Q-table
 * @param {number} numActions - Action space size
 * @returns {Object} Frozen agent interface
 */
export const createInferenceAgent = (model, numActions) => {
    const agent = createTabularAgent({
        numActions,
        alpha: 0.0,      // No learning
        gamma: 0.0,      // Irrelevant for inference
        epsilon: 0.0,    // Pure exploitation
        epsilonDecay: 1.0,
        minEpsilon: 0.0
    });

    // Load pre-trained model
    agent.setModel(model);

    // Override update to prevent any learning
    const originalUpdate = agent.update;
    agent.update = () => {
        // No-op: frozen weights
        return 0;
    };

    return {
        ...agent,
        isFrozen: true,
        originalUpdate // Keep for debugging
    };
};

// ============================================================================
// EVALUATION RUNNER
// ============================================================================

/**
 * Run N evaluation episodes with frozen agent
 * 
 * @param {Object} config
 * @param {Object} config.agent - Frozen inference agent
 * @param {Object} config.environment - Environment definition
 * @param {Function} config.getState - State function
 * @param {number} config.numEpisodes - Number of test episodes
 * @param {Object} config.metricsConfig - KPI/metrics configuration
 * @param {Function} config.onEpisodeComplete - Callback after each episode
 * @param {Function} config.onAllComplete - Callback after all episodes
 * @returns {Promise<Object>} Evaluation results
 */
export const runEvaluation = async (config) => {
    const {
        agent,
        environment,
        getState,
        numEpisodes = INFERENCE_CONFIG.defaultTestEpisodes,
        metricsConfig = DEFAULT_CONFIGS.rewardBased,
        onEpisodeComplete = null,
        onAllComplete = null,
        renderFn = null,
        ctx = null
    } = config;

    const results = {
        episodes: [],
        totalReward: 0,
        successCount: 0,
        failureCount: 0,
        avgReward: 0,
        stdReward: 0,
        successRate: 0,
        consistency: 0
    };

    // Run episodes
    for (let ep = 0; ep < numEpisodes; ep++) {
        const episodeResult = await runSingleEpisode({
            agent,
            environment,
            getState,
            episodeNum: ep,
            metricsConfig,
            renderFn,
            ctx
        });

        results.episodes.push(episodeResult);
        results.totalReward += episodeResult.totalReward;
        if (episodeResult.success) results.successCount++;
        else results.failureCount++;

        if (onEpisodeComplete) {
            onEpisodeComplete(episodeResult, ep + 1, numEpisodes);
        }

        // Small delay for rendering
        await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Compute aggregate statistics
    results.avgReward = results.totalReward / numEpisodes;
    
    // Standard deviation
    const squaredDiffs = results.episodes.map(ep => 
        Math.pow(ep.totalReward - results.avgReward, 2)
    );
    results.stdReward = Math.sqrt(
        squaredDiffs.reduce((a, b) => a + b, 0) / numEpisodes
    );

    // Success rate
    results.successRate = results.successCount / numEpisodes;

    // Consistency score (inverse of coefficient of variation)
    // Higher = more consistent performance
    const cv = Math.abs(results.avgReward) > 0.01 
        ? results.stdReward / Math.abs(results.avgReward) 
        : 0;
    results.consistency = Math.max(0, 1 - cv);

    if (onAllComplete) {
        onAllComplete(results);
    }

    return results;
};

/**
 * Run single evaluation episode
 * @private
 */
const runSingleEpisode = async (config) => {
    const {
        agent,
        environment,
        getState,
        episodeNum,
        metricsConfig,
        renderFn,
        ctx
    } = config;

    // Create metrics tracker
    const tracker = createEpisodeTracker(metricsConfig);
    let episodeData = tracker.init();

    let state = environment.reset(0); // clientId = 0 for inference
    let done = false;
    
    // Mock client object for consistent render interface
    const mockClient = {
        id: 0,
        ctx,
        state,
        lastAction: undefined
    };

    while (!done && episodeData.steps < INFERENCE_CONFIG.maxStepsPerEpisode) {
        const stateKey = getState(state);
        const action = agent.chooseAction(stateKey);

        const stepResult = environment.step(state, action);
        const reward = stepResult.reward;
        state = stepResult.state;
        done = stepResult.done;

        // Track step with KPIs
        episodeData = tracker.step(episodeData, state, action, reward);

        // Update mock client with current state and action
        mockClient.state = state;
        mockClient.lastAction = action;

        // Render if function provided (consistent 3-param interface)
        if (renderFn && ctx) {
            renderFn(ctx, state, mockClient);
        }

        // Allow browser to render
        if (episodeData.steps % 10 === 0) {
            await new Promise(resolve => requestAnimationFrame(resolve));
        }
    }

    // Finalize episode (computes KPIs and success)
    episodeData = tracker.finalize(episodeData, state);
    episodeData.episodeNum = episodeNum;
    episodeData.finalState = state;

    return episodeData;
};

// ============================================================================
// INFERENCE UI BUILDER
// ============================================================================

/**
 * Create inference control panel UI
 * 
 * @param {Object} config
 * @param {HTMLElement} config.container
 * @param {Function} config.onRunTest - Callback to start evaluation
 * @param {Function} config.onStop - Callback to stop evaluation
 * @param {Function} config.onLoadModel - Callback to load model from file
 * @returns {Object} UI elements
 */
export const createInferenceUI = (config) => {
    const {
        container,
        onRunTest = null,
        onStop = null,
        onLoadModel = null
    } = config;

    // Main control panel
    const panel = document.createElement('div');
    panel.style.cssText = `
        background: rgba(16, 185, 129, 0.1);
        border: 2px solid #10b981;
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 20px;
    `;

    // Model source selection
    const modelSection = document.createElement('div');
    modelSection.style.marginBottom = '16px';
    modelSection.innerHTML = `
        <label style="display:block; margin-bottom:8px; font-weight:600; color:#10b981;">
            📦 Model Source:
        </label>
    `;

    const modelSelect = document.createElement('select');
    modelSelect.style.cssText = `
        padding: 8px 12px;
        border-radius: 6px;
        border: 1px solid #10b981;
        background: rgba(0, 0, 0, 0.3);
        color: #fff;
        font-family: 'Monaco', monospace;
        margin-right: 10px;
        cursor: pointer;
    `;
    modelSelect.innerHTML = `
        <option value="latest">Latest Training Session</option>
        <option value="file">Load from File...</option>
    `;

    const loadFileBtn = document.createElement('button');
    loadFileBtn.innerHTML = '📂 Load Model File';
    loadFileBtn.className = 'btn';
    loadFileBtn.style.display = 'none';
    loadFileBtn.onclick = () => {
        if (onLoadModel) onLoadModel();
    };

    modelSelect.onchange = () => {
        loadFileBtn.style.display = modelSelect.value === 'file' ? 'inline-block' : 'none';
    };

    modelSection.appendChild(modelSelect);
    modelSection.appendChild(loadFileBtn);

    // Test episodes selection
    const episodesSection = document.createElement('div');
    episodesSection.style.marginBottom = '16px';
    episodesSection.innerHTML = `
        <label style="display:block; margin-bottom:8px; font-weight:600; color:#10b981;">
            🎯 Test Episodes:
        </label>
    `;

    const episodesSelect = document.createElement('select');
    episodesSelect.style.cssText = modelSelect.style.cssText;
    INFERENCE_CONFIG.testEpisodes.forEach(num => {
        const option = document.createElement('option');
        option.value = num;
        option.textContent = `${num} episodes`;
        if (num === INFERENCE_CONFIG.defaultTestEpisodes) {
            option.selected = true;
        }
        episodesSelect.appendChild(option);
    });
    episodesSection.appendChild(episodesSelect);

    // Action buttons
    const buttonSection = document.createElement('div');
    buttonSection.style.cssText = `
        display: flex;
        gap: 10px;
        margin-top: 16px;
    `;

    const runBtn = document.createElement('button');
    runBtn.innerHTML = '▶ Run Evaluation';
    runBtn.className = 'btn';
    runBtn.style.cssText = `
        background: #10b981;
        color: #fff;
        flex: 1;
    `;
    runBtn.onclick = () => {
        if (onRunTest) {
            const numEpisodes = parseInt(episodesSelect.value);
            const modelSource = modelSelect.value;
            onRunTest({ numEpisodes, modelSource });
        }
    };

    const stopBtn = document.createElement('button');
    stopBtn.innerHTML = '⏹ Stop';
    stopBtn.className = 'btn';
    stopBtn.disabled = true;
    stopBtn.onclick = () => {
        if (onStop) onStop();
    };

    buttonSection.appendChild(runBtn);
    buttonSection.appendChild(stopBtn);

    // Assemble panel
    panel.appendChild(modelSection);
    panel.appendChild(episodesSection);
    panel.appendChild(buttonSection);
    container.appendChild(panel);

    return {
        panel,
        modelSelect,
        episodesSelect,
        runBtn,
        stopBtn,
        loadFileBtn
    };
};

/**
 * Create results display panel
 * 
 * @param {HTMLElement} container
 * @returns {Object} Results UI elements
 */
export const createResultsPanel = (container) => {
    const panel = document.createElement('div');
    panel.style.cssText = `
        background: rgba(16, 185, 129, 0.05);
        border: 1px solid rgba(16, 185, 129, 0.3);
        border-radius: 8px;
        padding: 20px;
        margin-top: 20px;
    `;

    const title = document.createElement('h3');
    title.innerHTML = '📊 Evaluation Results';
    title.style.cssText = `
        margin: 0 0 16px 0;
        color: #10b981;
        font-size: 16px;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
        font-family: 'Monaco', monospace;
        font-size: 13px;
        line-height: 1.8;
    `;

    const exportBtn = document.createElement('button');
    exportBtn.innerHTML = '📊 Export Results';
    exportBtn.className = 'btn';
    exportBtn.style.marginTop = '16px';
    exportBtn.style.display = 'none';
    exportBtn.onclick = () => {
        // Will be set externally
    };

    panel.appendChild(title);
    panel.appendChild(content);
    panel.appendChild(exportBtn);
    container.appendChild(panel);

    return { panel, content, exportBtn };
};

/**
 * Update results display with evaluation metrics
 * 
 * @param {HTMLElement} contentElement - Results content container
 * @param {Object} results - Evaluation results
 * @param {number} current - Current episode (for progress)
 * @param {number} total - Total episodes
 */
export const updateResults = (contentElement, results, current = null, total = null) => {
    const isComplete = current === null || current === total;
    
    let html = '';

    if (!isComplete) {
        // Progress indicator
        const progress = Math.round((current / total) * 100);
        html += `
            <div style="margin-bottom:16px;">
                <div style="color:#10b981; font-weight:600;">
                    ⏳ Running evaluation: ${current}/${total} episodes (${progress}%)
                </div>
                <div style="background:rgba(0,0,0,0.3); height:6px; border-radius:3px; margin-top:8px; overflow:hidden;">
                    <div style="background:#10b981; height:100%; width:${progress}%; transition: width 0.3s;"></div>
                </div>
            </div>
        `;
    } else {
        html += `
            <div style="color:#10b981; font-weight:600; margin-bottom:16px;">
                ✅ Evaluation Complete (${results.episodes.length} episodes)
            </div>
        `;
    }

    // Current metrics
    if (results.episodes.length > 0) {
        const completed = results.episodes.length;
        const avgReward = results.totalReward / completed;
        const successRate = Math.round((results.successCount / completed) * 100);

        html += `
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
                <div>
                    <div style="color:#64748b; font-size:11px;">SUCCESS RATE</div>
                    <div style="color:#10b981; font-size:20px; font-weight:700;">${successRate}%</div>
                    <div style="color:#64748b; font-size:11px;">${results.successCount}/${completed} successful</div>
                </div>
                <div>
                    <div style="color:#64748b; font-size:11px;">MEAN REWARD</div>
                    <div style="color:#10b981; font-size:20px; font-weight:700;">${avgReward.toFixed(2)}</div>
                    ${isComplete ? `<div style="color:#64748b; font-size:11px;">σ = ${results.stdReward.toFixed(2)}</div>` : ''}
                </div>
            </div>
        `;

        if (isComplete && results.consistency !== undefined) {
            const consistencyPct = Math.round(results.consistency * 100);
            const barWidth = consistencyPct;
            html += `
                <div style="margin-top:16px;">
                    <div style="color:#64748b; font-size:11px; margin-bottom:4px;">CONSISTENCY SCORE</div>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div style="flex:1; background:rgba(0,0,0,0.3); height:8px; border-radius:4px; overflow:hidden;">
                            <div style="background:#10b981; height:100%; width:${barWidth}%; transition: width 0.5s;"></div>
                        </div>
                        <div style="color:#10b981; font-weight:700;">${consistencyPct}%</div>
                    </div>
                </div>
            `;
        }
        
        // Display KPIs if available
        if (results.episodes.length > 0 && results.episodes[0].kpis) {
            const firstEp = results.episodes[0];
            const kpiKeys = Object.keys(firstEp.kpis);
            
            if (kpiKeys.length > 0) {
                html += `
                    <div style="margin-top:20px; border-top:2px solid #334155; padding-top:16px;">
                        <div style="color:#fbbf24; font-weight:600; margin-bottom:12px;">📊 KPIs</div>
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
                `;
                
                kpiKeys.forEach(key => {
                    // Calculate average across all episodes
                    const avg = results.episodes.reduce((sum, ep) => sum + (ep.kpis[key] || 0), 0) / results.episodes.length;
                    const displayName = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                    
                    html += `
                        <div>
                            <div style="color:#64748b; font-size:11px;">${displayName.toUpperCase()}</div>
                            <div style="color:#fbbf24; font-size:16px; font-weight:700;">${avg.toFixed(1)}</div>
                        </div>
                    `;
                });
                
                html += `
                        </div>
                    </div>
                `;
            }
        }
    }

    contentElement.innerHTML = html;
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
    INFERENCE_CONFIG,
    createInferenceAgent,
    runEvaluation,
    createInferenceUI,
    createResultsPanel,
    updateResults
};

