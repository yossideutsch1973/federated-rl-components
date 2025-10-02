/**
 * METRICS-CORE.JS - KPI Tracking & Evaluation
 * 
 * Pure functional metrics system for RL experiments.
 * Separates reward (training signal) from KPIs (evaluation metrics).
 * 
 * Key principle: Reward shapes learning, KPIs measure success.
 * 
 * @module metrics-core
 * @version 1.0.0
 */

// ============================================================================
// AGGREGATION FUNCTIONS (Pure)
// ============================================================================

/**
 * Built-in aggregation functions for KPI values
 * All functions are pure: f(values) → number
 */
export const AGGREGATORS = {
    /** Sum all values: Σx_i */
    sum: (values) => values.reduce((a, b) => a + b, 0),
    
    /** Average: (Σx_i) / n */
    avg: (values) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0,
    
    /** Maximum: max(x_i) */
    max: (values) => values.length ? Math.max(...values) : 0,
    
    /** Minimum: min(x_i) */
    min: (values) => values.length ? Math.min(...values) : Infinity,
    
    /** Last value: x_n */
    last: (values) => values.length ? values[values.length - 1] : 0,
    
    /** First value: x_0 */
    first: (values) => values.length ? values[0] : 0,
    
    /** Count non-zero: |{x_i : x_i ≠ 0}| */
    count: (values) => values.filter(v => v !== 0).length,
    
    /** Percentage: (Σx_i) / n × 100 */
    percentage: (values) => values.length ? (values.reduce((a, b) => a + b, 0) / values.length) * 100 : 0
};

// ============================================================================
// EPISODE TRACKER
// ============================================================================

/**
 * Create episode tracker for KPI collection
 * 
 * @param {Object} metricsConfig - Metrics configuration
 * @param {Function} metricsConfig.isSuccessful - (state, episodeData) => boolean
 * @param {Object} metricsConfig.kpis - KPI definitions
 * @param {Function} metricsConfig.summaryMetrics - (episodeData) => Object
 * @returns {Object} Tracker with init, step, finalize methods
 * 
 * @example
 * const tracker = createEpisodeTracker({
 *   isSuccessful: (state, data) => data.kpis.score > 100,
 *   kpis: {
 *     score: {
 *       compute: (state) => state.points,
 *       aggregate: 'sum',
 *       display: 'Total Score'
 *     }
 *   }
 * });
 */
export const createEpisodeTracker = (metricsConfig = {}) => {
    const {
        isSuccessful = null,
        kpis = {},
        summaryMetrics = null
    } = metricsConfig;
    
    const kpiKeys = Object.keys(kpis);
    
    // Validate KPI configurations
    kpiKeys.forEach(key => {
        const kpi = kpis[key];
        if (typeof kpi.compute !== 'function') {
            throw new Error(`KPI '${key}': compute must be a function`);
        }
        if (kpi.aggregate && !AGGREGATORS[kpi.aggregate]) {
            throw new Error(`KPI '${key}': unknown aggregator '${kpi.aggregate}'`);
        }
    });
    
    return {
        /**
         * Initialize new episode data structure
         * @returns {Object} Empty episode data
         */
        init: () => ({
            steps: 0,
            totalReward: 0,
            trajectory: [],
            kpiValues: {},  // { kpiKey: [value1, value2, ...] }
            kpis: {},       // { kpiKey: aggregatedValue }
            success: false,
            summary: {}
        }),
        
        /**
         * Track single step (pure function)
         * @param {Object} episodeData - Current episode data
         * @param {Object} state - Environment state
         * @param {number} action - Action taken
         * @param {number} reward - Reward received
         * @returns {Object} Updated episode data
         */
        step: (episodeData, state, action, reward) => {
            // Compute KPIs for this step
            const stepKpis = {};
            kpiKeys.forEach(key => {
                try {
                    stepKpis[key] = kpis[key].compute(state);
                } catch (error) {
                    console.error(`Error computing KPI '${key}':`, error);
                    stepKpis[key] = 0;
                }
                
                if (!episodeData.kpiValues[key]) {
                    episodeData.kpiValues[key] = [];
                }
                episodeData.kpiValues[key].push(stepKpis[key]);
            });
            
            // Add to trajectory
            episodeData.trajectory.push({
                state: { ...state },
                action,
                reward,
                kpis: stepKpis
            });
            
            episodeData.steps++;
            episodeData.totalReward += reward;
            
            return episodeData;
        },
        
        /**
         * Finalize episode with aggregations
         * @param {Object} episodeData - Episode data
         * @param {Object} finalState - Final environment state
         * @returns {Object} Finalized episode data with KPIs and success
         */
        finalize: (episodeData, finalState) => {
            // Aggregate KPIs
            kpiKeys.forEach(key => {
                const kpiConfig = kpis[key];
                const aggregatorName = kpiConfig.aggregate || 'sum';
                const aggregator = AGGREGATORS[aggregatorName];
                
                episodeData.kpis[key] = aggregator(episodeData.kpiValues[key]);
            });
            
            // Determine success
            if (isSuccessful) {
                try {
                    episodeData.success = isSuccessful(finalState, episodeData);
                } catch (error) {
                    console.error('Error in isSuccessful:', error);
                    episodeData.success = false;
                }
            } else {
                // Default: positive reward = success
                episodeData.success = episodeData.totalReward > 0;
            }
            
            // Compute summary metrics
            if (summaryMetrics) {
                try {
                    episodeData.summary = summaryMetrics(episodeData);
                } catch (error) {
                    console.error('Error in summaryMetrics:', error);
                    episodeData.summary = {};
                }
            }
            
            return episodeData;
        },
        
        /**
         * Get KPI definitions (for UI display)
         * @returns {Object} KPI configs
         */
        getKpiDefinitions: () => kpis
    };
};

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

/**
 * Pre-built metric configurations for common scenarios
 */
export const DEFAULT_CONFIGS = {
    /**
     * Reward-based success (backward compatible)
     */
    rewardBased: {
        isSuccessful: (state, data) => data.totalReward > 0
    },
    
    /**
     * Ball catch scenario
     */
    ballCatch: {
        isSuccessful: (state) => state.catches > 0 || (state.bounces && state.bounces > 0)
    },
    
    /**
     * Circle following
     */
    circleFollowing: {
        isSuccessful: (state, data) => {
            const stepsOnCircle = data.kpis.stepsOnCircle || 0;
            const avgSpeed = data.kpis.avgSpeed || 0;
            return stepsOnCircle > (data.steps * 0.7) && avgSpeed > 1;
        },
        kpis: {
            stepsOnCircle: {
                compute: (state) => (state.error !== undefined && state.error < 15) ? 1 : 0,
                aggregate: 'sum',
                display: 'Steps on Circle',
                format: (v) => `${v} steps`
            },
            avgSpeed: {
                compute: (state) => Math.hypot(state.vx || 0, state.vy || 0),
                aggregate: 'avg',
                display: 'Avg Speed',
                format: (v) => `${v.toFixed(1)} px/s`
            },
            movingSteps: {
                compute: (state) => Math.hypot(state.vx || 0, state.vy || 0) > 1 ? 1 : 0,
                aggregate: 'sum',
                display: 'Moving Steps',
                format: (v) => `${v} steps`
            }
        }
    },
    
    /**
     * Slalom navigation
     */
    slalom: {
        isSuccessful: (state, data) => {
            const flagsPassed = data.kpis.flagsPassed || 0;
            const totalFlags = state.flags ? state.flags.length : 8;
            return flagsPassed >= totalFlags;
        },
        kpis: {
            flagsPassed: {
                compute: (state) => state.currentFlag || 0,
                aggregate: 'last',
                display: 'Flags Passed',
                format: (v, state) => `${v}/${state.flags ? state.flags.length : 8}`
            },
            avgSpeed: {
                compute: (state) => Math.hypot(state.vx || 0, state.vy || 0),
                aggregate: 'avg',
                display: 'Avg Speed',
                format: (v) => `${v.toFixed(1)} px/s`
            }
        }
    }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format KPI value for display
 * @param {number} value - KPI value
 * @param {Object} kpiConfig - KPI configuration
 * @param {Object} state - State (for context)
 * @returns {string} Formatted string
 */
export const formatKpi = (value, kpiConfig, state = {}) => {
    if (kpiConfig.format) {
        return kpiConfig.format(value, state);
    }
    return typeof value === 'number' ? value.toFixed(2) : String(value);
};

/**
 * Merge multiple episode data arrays into aggregate statistics
 * @param {Array<Object>} episodes - Array of episode data
 * @returns {Object} Aggregate stats
 */
export const aggregateEpisodes = (episodes) => {
    if (!episodes.length) return {};
    
    const result = {
        episodes: episodes.length,
        successCount: episodes.filter(e => e.success).length,
        successRate: 0,
        avgReward: 0,
        avgSteps: 0,
        kpis: {}
    };
    
    result.successRate = result.successCount / episodes.length;
    result.avgReward = episodes.reduce((a, e) => a + e.totalReward, 0) / episodes.length;
    result.avgSteps = episodes.reduce((a, e) => a + e.steps, 0) / episodes.length;
    
    // Aggregate KPIs across episodes
    const firstEpisode = episodes[0];
    if (firstEpisode.kpis) {
        Object.keys(firstEpisode.kpis).forEach(key => {
            const values = episodes.map(e => e.kpis[key] || 0);
            result.kpis[key] = {
                avg: values.reduce((a, v) => a + v, 0) / values.length,
                min: Math.min(...values),
                max: Math.max(...values)
            };
        });
    }
    
    return result;
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
    AGGREGATORS,
    createEpisodeTracker,
    DEFAULT_CONFIGS,
    formatKpi,
    aggregateEpisodes
};

