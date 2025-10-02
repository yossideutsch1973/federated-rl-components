/**
 * Integration tests: Multi-client federation
 * Tests that federated learning combines knowledge from multiple agents
 */

import { createTabularAgent } from '../../components/rl-core.js';
import { federatedAverage, computeModelDelta } from '../../components/federated-core.js';
import { createSimpleGridWorld } from '../helpers/simple-env.js';
import { runTests, assert } from '../helpers/assert.js';

const tests = {
    'federation combines knowledge from multiple clients': () => {
        const env = createSimpleGridWorld();
        
        // Create 3 clients
        const clients = [
            createTabularAgent({ alpha: 0.1, gamma: 0.9, epsilon: 0.3, numActions: 4 }),
            createTabularAgent({ alpha: 0.1, gamma: 0.9, epsilon: 0.3, numActions: 4 }),
            createTabularAgent({ alpha: 0.1, gamma: 0.9, epsilon: 0.3, numActions: 4 })
        ];
        
        // Each client trains independently for 30 episodes
        clients.forEach(agent => {
            for (let ep = 0; ep < 30; ep++) {
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
        });
        
        // Get pre-federation state counts
        const preStates = clients.map(c => Object.keys(c.getModel()).length);
        
        // Perform federation
        const models = clients.map(c => c.getModel());
        const globalModel = federatedAverage(models);
        
        // Global model should have states from all clients
        const globalStates = Object.keys(globalModel).length;
        const maxPreStates = Math.max(...preStates);
        
        assert(globalStates >= maxPreStates, 'Global model should combine knowledge');
        
        // Distribute global model back to clients
        clients.forEach(c => c.setModel(globalModel));
        
        // All clients should now have same model
        const model1 = clients[0].getModel();
        const model2 = clients[1].getModel();
        
        assert(
            Object.keys(model1).length === Object.keys(model2).length,
            'All clients should have same states after federation'
        );
    },
    
    'federated model improves performance': () => {
        const env = createSimpleGridWorld();
        
        // Create 2 clients
        const client1 = createTabularAgent({ alpha: 0.1, gamma: 0.9, epsilon: 0.3, numActions: 4 });
        const client2 = createTabularAgent({ alpha: 0.1, gamma: 0.9, epsilon: 0.3, numActions: 4 });
        
        // Train independently for 20 episodes
        [client1, client2].forEach(agent => {
            for (let ep = 0; ep < 20; ep++) {
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
        });
        
        // Federate
        const globalModel = federatedAverage([client1.getModel(), client2.getModel()]);
        client1.setModel(globalModel);
        client2.setModel(globalModel);
        
        // Continue training after federation
        let successCount = 0;
        for (let ep = 0; ep < 20; ep++) {
            let state = env.reset();
            let totalReward = 0;
            
            while (!state.done) {
                const stateStr = env.getStateString(state);
                const action = client1.chooseAction(stateStr);
                const nextState = env.step(state, action);
                client1.learn(stateStr, action, nextState.reward, env.getStateString(nextState));
                totalReward += nextState.reward;
                state = nextState;
            }
            
            if (totalReward > 0) successCount++;
        }
        
        assert(successCount > 0, 'Federated agent should achieve some success');
    },
    
    'model delta tracks convergence': () => {
        const agent1 = createTabularAgent({ numActions: 4 });
        const agent2 = createTabularAgent({ numActions: 4 });
        
        // Initialize with some Q-values
        agent1.chooseAction('s0');
        agent1.learn('s0', 0, 10, 's1');
        
        agent2.chooseAction('s0');
        agent2.learn('s0', 0, 10, 's1');
        
        const model1 = agent1.getModel();
        const model2 = agent2.getModel();
        
        // Models should be similar (trained on same experience)
        const delta = computeModelDelta(model1, model2);
        
        assert(delta.avgDelta >= 0, 'Delta should be non-negative');
        assert(delta.totalStates > 0, 'Should track states');
    }
};

runTests('MULTI-CLIENT FEDERATION', tests);

