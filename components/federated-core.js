/**
 * FEDERATED-CORE.JS - Federated Learning Algorithms
 * 
 * Reusable federated learning components for multi-client systems.
 * Implements FedAvg and related algorithms.
 * 
 * @module federated-core
 * @version 1.0.0
 */

// ============================================================================
// FEDERATED AVERAGING (FedAvg)
// ============================================================================

/**
 * Federated Averaging Algorithm
 * Formula: θ_global = Σ(n_k / n) · θ_k
 * 
 * Aggregates models from multiple clients. Includes ALL states from ALL clients.
 * 
 * @param {Object[]} models - Array of Q-tables from clients
 * @param {number[]} weights - Optional weights for each client (default: uniform)
 * @returns {Object} Aggregated global model
 * @pure
 */
export const federatedAverage = (models, weights = null) => {
    try {
        if (!models || models.length === 0) {
            throw new Error('No models to aggregate');
        }
        
        const n = models.length;
        const uniformWeights = weights || models.map(() => 1 / n);
        
        // Collect ALL unique states from ALL clients
        const allStates = new Set();
        models.forEach(model => {
            Object.keys(model).forEach(state => allStates.add(state));
        });
        
        // Initialize global model
        const avgModel = {};
        const numActions = models[0][Object.keys(models[0])[0]]?.length || 2;
        
        // Average each state across all models
        allStates.forEach(state => {
            avgModel[state] = Array(numActions).fill(0).map((_, actionIdx) => {
                const weightedSum = models.reduce((sum, model, clientIdx) => {
                    const qValue = model[state]?.[actionIdx] || 0;
                    return sum + qValue * uniformWeights[clientIdx];
                }, 0);
                return weightedSum;
            });
        });
        
        return avgModel;
    } catch (e) {
        console.error('Federated averaging failed:', e);
        return models[0]; // Fallback to first model
    }
};

/**
 * Compute Q-table difference metrics
 * Formula: Δ_abs = Σ|Q_new - Q_old| / |S|
 *          Δ_rel = Δ_abs / (max(|Q|) + ε)
 * 
 * Measures how much a model changed after federation.
 * Useful for detecting convergence.
 * 
 * @param {Object} oldModel - Q-table before federation
 * @param {Object} newModel - Q-table after federation
 * @returns {Object} Difference statistics
 * @pure
 */
export const computeModelDelta = (oldModel, newModel) => {
    try {
        // Collect all states from both models
        const allStates = new Set([
            ...Object.keys(oldModel),
            ...Object.keys(newModel)
        ]);
        
        if (allStates.size === 0) {
            return {
                totalDelta: 0,
                avgDelta: 0,
                maxDelta: 0,
                statesChanged: 0,
                totalStates: 0,
                relativeDelta: 0
            };
        }
        
        let totalDelta = 0;
        let maxDelta = 0;
        let statesChanged = 0;
        let maxAbsQ = 0;
        
        allStates.forEach(state => {
            const oldQ = oldModel[state] || [];
            const newQ = newModel[state] || [];
            const numActions = Math.max(oldQ.length, newQ.length);
            
            let stateDelta = 0;
            for (let i = 0; i < numActions; i++) {
                const oldVal = oldQ[i] || 0;
                const newVal = newQ[i] || 0;
                const delta = Math.abs(newVal - oldVal);
                
                stateDelta += delta;
                maxDelta = Math.max(maxDelta, delta);
                maxAbsQ = Math.max(maxAbsQ, Math.abs(oldVal), Math.abs(newVal));
            }
            
            totalDelta += stateDelta;
            if (stateDelta > 0.001) statesChanged++;
        });
        
        const avgDelta = totalDelta / allStates.size;
        const relativeDelta = maxAbsQ > 0 ? avgDelta / maxAbsQ : 0;
        
        return {
            totalDelta,
            avgDelta,
            maxDelta,
            statesChanged,
            totalStates: allStates.size,
            relativeDelta,
            converged: avgDelta < 0.01 // Heuristic: converged if avg change < 0.01
        };
    } catch (e) {
        console.error('Delta computation failed:', e);
        return { totalDelta: 0, avgDelta: 0, maxDelta: 0, statesChanged: 0, totalStates: 0, relativeDelta: 0, converged: false };
    }
};

/**
 * Weighted Federated Averaging
 * Weights based on number of samples per client
 * 
 * @param {Object[]} models - Models from clients
 * @param {number[]} sampleCounts - Number of samples per client
 * @returns {Object} Aggregated model
 * @pure
 */
export const federatedAverageWeighted = (models, sampleCounts) => {
    const totalSamples = sampleCounts.reduce((a, b) => a + b, 0);
    const weights = sampleCounts.map(count => count / totalSamples);
    return federatedAverage(models, weights);
};

// ============================================================================
// MODEL SERIALIZATION
// ============================================================================

/**
 * Serialize model to JSON string
 * 
 * @param {Object} model - Q-table model
 * @param {Object} metadata - Additional metadata
 * @returns {string} JSON string
 * @pure
 */
export const serializeModel = (model, metadata = {}) => {
    try {
        const modelData = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            model: model,
            metadata: {
                totalStates: Object.keys(model).length,
                actionSpace: model[Object.keys(model)[0]]?.length || 0,
                ...metadata
            }
        };
        return JSON.stringify(modelData, null, 2);
    } catch (e) {
        console.error('Model serialization failed:', e);
        return null;
    }
};

/**
 * Deserialize model from JSON string
 * 
 * @param {string} jsonString - Serialized model
 * @returns {Object|null} Model data or null if invalid
 * @pure
 */
export const deserializeModel = (jsonString) => {
    try {
        const data = JSON.parse(jsonString);
        if (!data.model || !data.version) {
            throw new Error('Invalid model format');
        }
        return data;
    } catch (e) {
        console.error('Model deserialization failed:', e);
        return null;
    }
};

// ============================================================================
// AUTO-FEDERATION STRATEGIES
// ============================================================================

/**
 * Episode-based federation trigger
 * Triggers federation when average episodes reach threshold
 * 
 * @param {number[]} episodeCounts - Episode count per client
 * @param {number} threshold - Trigger threshold (e.g., 100)
 * @param {number} lastTrigger - Last trigger episode count
 * @returns {boolean} Whether to trigger federation
 * @pure
 */
export const shouldFederateByEpisodes = (episodeCounts, threshold, lastTrigger) => {
    const avgEpisodes = episodeCounts.reduce((a, b) => a + b, 0) / episodeCounts.length;
    return Math.floor(avgEpisodes / threshold) > Math.floor(lastTrigger / threshold);
};

/**
 * Performance-based federation trigger
 * Triggers when performance improvement plateaus
 * 
 * @param {number[]} recentRewards - Recent reward history
 * @param {number} windowSize - Window to check (e.g., 10)
 * @param {number} threshold - Improvement threshold
 * @returns {boolean} Whether to trigger federation
 * @pure
 */
export const shouldFederateByPerformance = (recentRewards, windowSize = 10, threshold = 0.01) => {
    if (recentRewards.length < windowSize * 2) return false;
    
    const recent = recentRewards.slice(-windowSize);
    const previous = recentRewards.slice(-windowSize * 2, -windowSize);
    
    const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;
    const avgPrevious = previous.reduce((a, b) => a + b, 0) / previous.length;
    
    const improvement = (avgRecent - avgPrevious) / Math.abs(avgPrevious);
    return improvement < threshold;
};

// ============================================================================
// FEDERATED SYSTEM MANAGER
// ============================================================================

/**
 * Create a federated system manager
 * 
 * @param {Object} config - Configuration
 * @param {number} config.federationInterval - Episodes between federations
 * @param {boolean} config.autoFederate - Enable auto-federation
 * @param {string} config.strategy - Federation strategy ('episodes'|'performance')
 * @returns {Object} Federated system manager
 */
export const createFederatedManager = (config = {}) => {
    const {
        federationInterval = 100,
        autoFederate = false,
        strategy = 'episodes'
    } = config;

    let federationRound = 0;
    let lastFederationEpisode = 0;
    let autoEnabled = autoFederate;
    let rewardHistory = [];

    return {
        /**
         * Check if should federate based on strategy
         * @param {Object[]} clients - Array of clients
         * @returns {boolean} Whether to federate
         */
        shouldFederate: (clients) => {
            if (!autoEnabled) return false;

            const episodeCounts = clients.map(c => c.getMetrics().episodeCount);

            if (strategy === 'episodes') {
                return shouldFederateByEpisodes(
                    episodeCounts,
                    federationInterval,
                    lastFederationEpisode
                );
            } else if (strategy === 'performance') {
                return shouldFederateByPerformance(rewardHistory);
            }

            return false;
        },

        /**
         * Perform federation
         * @param {Object[]} clients - Array of clients with getAgent() method
         * @returns {Object} Global model
         */
        federate: (clients) => {
            const models = clients.map(c => c.getAgent().getModel());
            const globalModel = federatedAverage(models);
            
            clients.forEach(c => c.getAgent().setModel(globalModel));
            
            federationRound++;
            lastFederationEpisode = clients.reduce((sum, c) => 
                sum + c.getMetrics().episodeCount, 0) / clients.length;

            return globalModel;
        },

        /**
         * Enable/disable auto-federation
         * @param {boolean} enabled - Enable state
         */
        setAutoFederate: (enabled) => {
            autoEnabled = enabled;
        },

        /**
         * Get federation round count
         * @returns {number} Round count
         */
        getRound: () => federationRound,

        /**
         * Reset federation state
         */
        reset: () => {
            federationRound = 0;
            lastFederationEpisode = 0;
            rewardHistory = [];
        },

        /**
         * Add reward to history (for performance-based federation)
         * @param {number} reward - Reward value
         */
        addReward: (reward) => {
            rewardHistory.push(reward);
            if (rewardHistory.length > 1000) {
                rewardHistory.shift();
            }
        }
    };
};

// Export default object
export default {
    federatedAverage,
    federatedAverageWeighted,
    computeModelDelta,
    serializeModel,
    deserializeModel,
    shouldFederateByEpisodes,
    shouldFederateByPerformance,
    createFederatedManager
};
