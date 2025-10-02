/**
 * Simple test environment for integration tests
 * A basic grid world where agent tries to reach goal
 */

export const createSimpleGridWorld = () => {
    const GRID_SIZE = 5;
    const GOAL = { x: 4, y: 4 };
    const ACTIONS = ['up', 'down', 'left', 'right'];
    
    const reset = () => ({
        x: 0,
        y: 0,
        done: false,
        steps: 0
    });
    
    const step = (state, action) => {
        if (state.done) return { ...state, reward: 0 };
        
        const newState = { ...state };
        newState.steps++;
        
        // Move based on action
        if (action === 0 && state.y > 0) newState.y--; // up
        if (action === 1 && state.y < GRID_SIZE - 1) newState.y++; // down
        if (action === 2 && state.x > 0) newState.x--; // left
        if (action === 3 && state.x < GRID_SIZE - 1) newState.x++; // right
        
        // Check if reached goal
        if (newState.x === GOAL.x && newState.y === GOAL.y) {
            newState.done = true;
            return { ...newState, reward: 100 };
        }
        
        // Time penalty
        if (newState.steps >= 100) {
            newState.done = true;
            return { ...newState, reward: -10 };
        }
        
        return { ...newState, reward: -1 };
    };
    
    const getStateString = (state) => `${state.x},${state.y}`;
    
    return {
        reset,
        step,
        getStateString,
        numActions: 4
    };
};

