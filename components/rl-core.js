/**
 * RL-CORE.JS - Pure Reinforcement Learning Algorithms
 * 
 * Reusable RL functions with no dependencies.
 * All functions are pure (no side effects) and testable.
 * 
 * @module rl-core
 * @version 1.0.0
 */

// ============================================================================
// Q-LEARNING ALGORITHMS
// ============================================================================

/**
 * Q-Learning Update Rule
 * Formula: Q(s,a) ← Q(s,a) + α[r + γ·max_a'(Q(s',a')) - Q(s,a)]
 * 
 * @param {number} currentQ - Current Q-value for state-action pair
 * @param {number} reward - Received reward
 * @param {number} maxNextQ - Maximum Q-value of next state
 * @param {number} alpha - Learning rate (0-1)
 * @param {number} gamma - Discount factor (0-1)
 * @returns {number} Updated Q-value
 * @pure
 */
export const updateQValue = (currentQ, reward, maxNextQ, alpha, gamma) => {
    try {
        const tdError = reward + gamma * maxNextQ - currentQ;
        return currentQ + alpha * tdError;
    } catch (e) {
        console.error('Q-value update failed:', e);
        return currentQ;
    }
};

/**
 * Epsilon-Greedy Action Selection
 * Formula: π(s) = argmax_a Q(s,a) with probability 1-ε, random otherwise
 * 
 * @param {number[]} qValues - Q-values for all actions in current state
 * @param {number} epsilon - Exploration rate (0-1)
 * @param {Function} random - Random function (default: Math.random)
 * @returns {number} Selected action index
 * @pure
 */
export const selectAction = (qValues, epsilon, random = Math.random) => {
    try {
        if (random() < epsilon) {
            // Explore: random action
            return Math.floor(random() * qValues.length);
        }
        // Exploit: best action
        return qValues.reduce((maxIdx, val, idx, arr) => 
            val > arr[maxIdx] ? idx : maxIdx, 0);
    } catch (e) {
        console.error('Action selection failed:', e);
        return 0;
    }
};

/**
 * Calculate TD Error
 * Formula: δ = r + γ·max_a'(Q(s',a')) - Q(s,a)
 * 
 * @param {number} reward - Received reward
 * @param {number} currentQ - Current Q-value
 * @param {number} maxNextQ - Maximum next Q-value
 * @param {number} gamma - Discount factor
 * @returns {number} TD error
 * @pure
 */
export const tdError = (reward, currentQ, maxNextQ, gamma) => {
    return reward + gamma * maxNextQ - currentQ;
};

/**
 * Softmax Action Selection
 * Formula: P(a) = exp(Q(s,a)/τ) / Σ_b exp(Q(s,b)/τ)
 * 
 * @param {number[]} qValues - Q-values for all actions
 * @param {number} temperature - Temperature parameter (τ)
 * @param {Function} random - Random function
 * @returns {number} Selected action index
 * @pure
 */
export const softmaxSelect = (qValues, temperature = 1.0, random = Math.random) => {
    try {
        const exp = qValues.map(q => Math.exp(q / temperature));
        const sumExp = exp.reduce((a, b) => a + b, 0);
        const probs = exp.map(e => e / sumExp);
        
        const r = random();
        let cumSum = 0;
        for (let i = 0; i < probs.length; i++) {
            cumSum += probs[i];
            if (r <= cumSum) return i;
        }
        return probs.length - 1;
    } catch (e) {
        console.error('Softmax selection failed:', e);
        return 0;
    }
};

// ============================================================================
// TABULAR Q-LEARNING AGENT
// ============================================================================

/**
 * Create a tabular Q-learning agent
 * 
 * @param {Object} config - Agent configuration
 * @param {number} config.alpha - Learning rate
 * @param {number} config.gamma - Discount factor
 * @param {number} config.epsilon - Initial exploration rate
 * @param {number} config.epsilonDecay - Decay rate for epsilon
 * @param {number} config.minEpsilon - Minimum epsilon value
 * @param {number} config.numActions - Number of actions
 * @returns {Object} Agent interface
 */
export const createTabularAgent = (config) => {
    const {
        alpha = 0.1,
        gamma = 0.95,
        epsilon: initEpsilon = 0.2,
        epsilonDecay = 0.995,
        minEpsilon = 0.001,
        numActions = 2
    } = config;

    let qTable = {};
    let epsilon = initEpsilon;
    let isInferenceMode = false;

    const initState = (state) => {
        if (!qTable[state]) {
            qTable[state] = Array(numActions).fill(0);
        }
    };

    return {
        /**
         * Choose action for given state
         * @param {string} state - State identifier
         * @returns {number} Action index
         */
        chooseAction: (state) => {
            initState(state);
            const effectiveEpsilon = isInferenceMode ? 0 : epsilon;
            return selectAction(qTable[state], effectiveEpsilon);
        },

        /**
         * Update Q-value based on experience
         * @param {string} state - Current state
         * @param {number} action - Taken action
         * @param {number} reward - Received reward
         * @param {string} nextState - Next state
         */
        learn: (state, action, reward, nextState) => {
            if (isInferenceMode) return;
            
            initState(state);
            initState(nextState);
            
            const currentQ = qTable[state][action];
            const maxNextQ = Math.max(...qTable[nextState]);
            
            qTable[state][action] = updateQValue(currentQ, reward, maxNextQ, alpha, gamma);
        },

        /**
         * Decay epsilon (reduce exploration)
         */
        decayEpsilon: () => {
            if (!isInferenceMode) {
                epsilon = Math.max(minEpsilon, epsilon * epsilonDecay);
            }
        },

        /**
         * Get Q-values for a state
         * @param {string} state - State identifier
         * @returns {number[]} Q-values
         */
        getQValues: (state) => {
            initState(state);
            return [...qTable[state]];
        },

        /**
         * Get full Q-table
         * @returns {Object} Q-table
         */
        getModel: () => JSON.parse(JSON.stringify(qTable)),

        /**
         * Set Q-table from model
         * @param {Object} model - Q-table to load
         */
        setModel: (model) => {
            qTable = JSON.parse(JSON.stringify(model));
        },

        /**
         * Get current epsilon
         * @returns {number} Epsilon value
         */
        getEpsilon: () => epsilon,

        /**
         * Set inference mode
         * @param {boolean} mode - True for inference, false for training
         */
        setInferenceMode: (mode) => {
            isInferenceMode = mode;
        },

        /**
         * Get inference mode status
         * @returns {boolean} Inference mode
         */
        getInferenceMode: () => isInferenceMode,

        /**
         * Reset agent (clear Q-table)
         */
        reset: () => {
            qTable = {};
            epsilon = initEpsilon;
        }
    };
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Discretize continuous value into bins
 * 
 * @param {number} value - Value to discretize
 * @param {number} bins - Number of bins
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Bin index
 * @pure
 */
export const discretize = (value, bins, min, max) => {
    const normalized = (value - min) / (max - min);
    const bin = Math.floor(normalized * bins);
    return Math.max(0, Math.min(bins - 1, bin));
};

/**
 * Create state string from discretized values
 * 
 * @param {number[]} values - Values to discretize
 * @param {number[]} bins - Bins for each value
 * @param {number[]} mins - Minimums for each value
 * @param {number[]} maxs - Maximums for each value
 * @returns {string} State string
 * @pure
 */
export const discretizeState = (values, bins, mins, maxs) => {
    return values
        .map((v, i) => discretize(v, bins[i], mins[i], maxs[i]))
        .join(',');
};

// Export default object with all functions
export default {
    updateQValue,
    selectAction,
    tdError,
    softmaxSelect,
    createTabularAgent,
    discretize,
    discretizeState
};
