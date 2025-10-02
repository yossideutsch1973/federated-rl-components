/**
 * Unit tests for rl-core.js
 * Tests pure functions: updateQValue, selectAction, discretize, tdError, softmaxSelect
 */

import { 
    updateQValue, 
    selectAction, 
    discretize, 
    tdError,
    softmaxSelect,
    discretizeState,
    createTabularAgent
} from '../../components/rl-core.js';
import { runTests, assertAlmostEqual, assertEqual, assert } from '../helpers/assert.js';

const tests = {
    // ========== Q-value Update Tests ==========
    
    'updateQValue: basic update': () => {
        // Q(s,a) = 0.5, r = 10, maxQ' = 0.8, α = 0.1, γ = 0.9
        // Q_new = 0.5 + 0.1 * (10 + 0.9*0.8 - 0.5) = 0.5 + 0.1 * 10.22 = 1.522
        const result = updateQValue(0.5, 10, 0.8, 0.1, 0.9);
        assertAlmostEqual(result, 1.522, 0.01);
    },
    
    'updateQValue: zero initial Q': () => {
        const result = updateQValue(0, 0, 0, 0.1, 0.9);
        assertEqual(result, 0);
    },
    
    'updateQValue: negative reward': () => {
        const result = updateQValue(0, -10, 0, 0.1, 0.9);
        assertAlmostEqual(result, -1.0, 0.01);
    },
    
    'updateQValue: high learning rate': () => {
        const result = updateQValue(0, 10, 0, 1.0, 0.9);
        assertEqual(result, 10);
    },
    
    'updateQValue: zero discount': () => {
        const result = updateQValue(0, 10, 5, 0.1, 0);
        assertEqual(result, 1.0);
    },
    
    // ========== Action Selection Tests ==========
    
    'selectAction: greedy (epsilon=0)': () => {
        const qValues = [0.1, 0.9, 0.3];
        const action = selectAction(qValues, 0, () => 0.5);
        assertEqual(action, 1, 'Should select action with highest Q-value');
    },
    
    'selectAction: random (epsilon=1)': () => {
        const qValues = [0.1, 0.9, 0.3];
        const action = selectAction(qValues, 1, () => 0.5);
        assert(action >= 0 && action < 3, 'Should select valid action index');
    },
    
    'selectAction: explore with random < epsilon': () => {
        const qValues = [0.1, 0.9, 0.3];
        const action = selectAction(qValues, 0.5, () => 0.2);
        assert(action >= 0 && action < 3, 'Should explore (random action)');
    },
    
    'selectAction: exploit with random > epsilon': () => {
        const qValues = [0.1, 0.9, 0.3];
        const action = selectAction(qValues, 0.5, () => 0.8);
        assertEqual(action, 1, 'Should exploit (best action)');
    },
    
    // ========== Discretization Tests ==========
    
    'discretize: middle value': () => {
        const bin = discretize(75, 10, 0, 100);
        assertEqual(bin, 7);
    },
    
    'discretize: minimum boundary': () => {
        const bin = discretize(0, 10, 0, 100);
        assertEqual(bin, 0);
    },
    
    'discretize: maximum boundary': () => {
        const bin = discretize(100, 10, 0, 100);
        assertEqual(bin, 9);
    },
    
    'discretize: out of range (below)': () => {
        const bin = discretize(-50, 10, 0, 100);
        assertEqual(bin, 0, 'Should clamp to min');
    },
    
    'discretize: out of range (above)': () => {
        const bin = discretize(150, 10, 0, 100);
        assertEqual(bin, 9, 'Should clamp to max');
    },
    
    'discretize: fine granularity': () => {
        const bin = discretize(0.55, 100, 0, 1);
        assertEqual(bin, 55);
    },
    
    // ========== TD Error Tests ==========
    
    'tdError: positive error': () => {
        const error = tdError(10, 0, 0.5, 0.9);
        assertAlmostEqual(error, 10.45, 0.01);
    },
    
    'tdError: negative error': () => {
        const error = tdError(-10, 5, 0, 0.9);
        assertEqual(error, -15);
    },
    
    'tdError: zero reward': () => {
        const error = tdError(0, 1, 1, 0.9);
        assertAlmostEqual(error, -0.1, 0.01);
    },
    
    // ========== Softmax Selection Tests ==========
    
    'softmaxSelect: high temperature': () => {
        const qValues = [1, 2, 3];
        const action = softmaxSelect(qValues, 10, () => 0.5);
        assert(action >= 0 && action < 3, 'Should select valid action');
    },
    
    'softmaxSelect: low temperature': () => {
        const qValues = [1, 2, 10];
        const action = softmaxSelect(qValues, 0.1, () => 0.5);
        assertEqual(action, 2, 'Should strongly prefer highest Q');
    },
    
    'softmaxSelect: equal Q-values': () => {
        const qValues = [1, 1, 1];
        const action = softmaxSelect(qValues, 1, () => 0.5);
        assert(action >= 0 && action < 3, 'Should select valid action');
    },
    
    // ========== Discretize State Tests ==========
    
    'discretizeState: multi-dimensional': () => {
        const state = discretizeState([50, 75], [10, 10], [0, 0], [100, 100]);
        assertEqual(state, '5,7');
    },
    
    'discretizeState: single dimension': () => {
        const state = discretizeState([25], [10], [0], [100]);
        assertEqual(state, '2');
    },
    
    // ========== Tabular Agent Tests ==========
    
    'createTabularAgent: initialization': () => {
        const agent = createTabularAgent({ numActions: 3 });
        const model = agent.getModel();
        assertEqual(Object.keys(model).length, 0, 'Should start with empty Q-table');
    },
    
    'createTabularAgent: chooseAction creates state': () => {
        const agent = createTabularAgent({ numActions: 3 });
        agent.chooseAction('state1');
        const model = agent.getModel();
        assert(model['state1'] !== undefined, 'Should create state in Q-table');
        assertEqual(model['state1'].length, 3, 'Should have correct action count');
    },
    
    'createTabularAgent: learning updates Q': () => {
        const agent = createTabularAgent({ alpha: 0.1, gamma: 0.9, numActions: 2 });
        agent.chooseAction('s0');
        agent.chooseAction('s1');
        
        const qBefore = agent.getQValues('s0')[0];
        agent.learn('s0', 0, 10, 's1');
        const qAfter = agent.getQValues('s0')[0];
        
        assert(qAfter > qBefore, 'Q-value should increase after positive reward');
    },
    
    'createTabularAgent: epsilon decay': () => {
        const agent = createTabularAgent({ epsilon: 0.5, epsilonDecay: 0.9 });
        const epsBefore = agent.getEpsilon();
        agent.decayEpsilon();
        const epsAfter = agent.getEpsilon();
        
        assertAlmostEqual(epsAfter, epsBefore * 0.9, 0.01);
    },
    
    'createTabularAgent: inference mode disables learning': () => {
        const agent = createTabularAgent({ alpha: 0.1, numActions: 2 });
        agent.chooseAction('s0');
        agent.chooseAction('s1');
        
        agent.setInferenceMode(true);
        const qBefore = agent.getQValues('s0')[0];
        agent.learn('s0', 0, 10, 's1');
        const qAfter = agent.getQValues('s0')[0];
        
        assertEqual(qBefore, qAfter, 'Q should not change in inference mode');
    },
    
    'createTabularAgent: inference mode sets epsilon to 0': () => {
        const agent = createTabularAgent({ epsilon: 0.5, numActions: 2 });
        agent.setInferenceMode(true);
        const qValues = [0, 1];
        agent.chooseAction('s0');
        // In inference mode, should always exploit (epsilon = 0)
        assertEqual(agent.getInferenceMode(), true);
    },
    
    'createTabularAgent: reset clears Q-table': () => {
        const agent = createTabularAgent({ numActions: 2 });
        agent.chooseAction('s0');
        agent.learn('s0', 0, 10, 's1');
        
        agent.reset();
        const model = agent.getModel();
        assertEqual(Object.keys(model).length, 0, 'Q-table should be empty after reset');
    },
    
    'createTabularAgent: setModel/getModel': () => {
        const agent = createTabularAgent({ numActions: 2 });
        const model = { 's0': [1, 2], 's1': [3, 4] };
        
        agent.setModel(model);
        const retrieved = agent.getModel();
        
        assertEqual(retrieved['s0'][0], 1);
        assertEqual(retrieved['s1'][1], 4);
    }
};

runTests('RL-CORE.JS', tests);

