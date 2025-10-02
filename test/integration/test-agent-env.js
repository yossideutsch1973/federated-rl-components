/**
 * Integration tests: Agent + Environment
 * Tests that agent can learn to solve simple environment
 */

import { createTabularAgent } from '../../components/rl-core.js';
import { createSimpleGridWorld } from '../helpers/simple-env.js';
import { runTests, assert, assertEqual } from '../helpers/assert.js';

const tests = {
    'agent learns to reach goal': () => {
        const agent = createTabularAgent({
            alpha: 0.1,
            gamma: 0.95,
            epsilon: 0.2,
            numActions: 4
        });
        
        const env = createSimpleGridWorld();
        
        // Train for 100 episodes
        let successCount = 0;
        for (let ep = 0; ep < 100; ep++) {
            let state = env.reset();
            let totalReward = 0;
            
            while (!state.done) {
                const stateStr = env.getStateString(state);
                const action = agent.chooseAction(stateStr);
                const nextState = env.step(state, action);
                
                agent.learn(stateStr, action, nextState.reward, env.getStateString(nextState));
                
                totalReward += nextState.reward;
                state = nextState;
            }
            
            if (totalReward > 0) successCount++;
            
            agent.decayEpsilon();
        }
        
        // Agent should learn something
        const model = agent.getModel();
        assert(Object.keys(model).length > 10, 'Agent should explore multiple states');
        assert(successCount > 0, 'Agent should succeed at least once');
    },
    
    'agent Q-values improve over time': () => {
        const agent = createTabularAgent({
            alpha: 0.2,
            gamma: 0.9,
            epsilon: 0.3,
            numActions: 4
        });
        
        const env = createSimpleGridWorld();
        
        // Train for 50 episodes
        const rewards = [];
        for (let ep = 0; ep < 50; ep++) {
            let state = env.reset();
            let totalReward = 0;
            
            while (!state.done) {
                const stateStr = env.getStateString(state);
                const action = agent.chooseAction(stateStr);
                const nextState = env.step(state, action);
                
                agent.learn(stateStr, action, nextState.reward, env.getStateString(nextState));
                
                totalReward += nextState.reward;
                state = nextState;
            }
            
            rewards.push(totalReward);
            agent.decayEpsilon();
        }
        
        // Average reward in last 10 episodes should be better than first 10
        const firstTen = rewards.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
        const lastTen = rewards.slice(-10).reduce((a, b) => a + b, 0) / 10;
        
        assert(lastTen > firstTen, 'Agent should improve over time');
    },
    
    'inference mode uses learned policy': () => {
        const agent = createTabularAgent({
            alpha: 0.1,
            gamma: 0.9,
            epsilon: 0.2,
            numActions: 4
        });
        
        const env = createSimpleGridWorld();
        
        // Train
        for (let ep = 0; ep < 50; ep++) {
            let state = env.reset();
            
            while (!state.done) {
                const stateStr = env.getStateString(state);
                const action = agent.chooseAction(stateStr);
                const nextState = env.step(state, action);
                
                agent.learn(stateStr, action, nextState.reward, env.getStateString(nextState));
                state = nextState;
            }
            
            agent.decayEpsilon();
        }
        
        // Switch to inference mode
        agent.setInferenceMode(true);
        assertEqual(agent.getInferenceMode(), true);
        
        // Test inference
        let state = env.reset();
        let steps = 0;
        while (!state.done && steps < 50) {
            const stateStr = env.getStateString(state);
            const action = agent.chooseAction(stateStr);
            state = env.step(state, action);
            steps++;
        }
        
        // Agent should complete task in reasonable time
        assert(steps < 50, 'Agent should use learned policy efficiently');
    }
};

runTests('AGENT + ENVIRONMENT INTEGRATION', tests);

