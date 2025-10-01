/**
 * DEMONSTRATION: Buggy vs Fixed Federated Averaging
 */

// Simulate 4 clients with different learned states
const client0Model = {
    "1,1,1,1,1": [0.5, 0.8, 0.3],
    "2,2,2,2,2": [0.4, 0.9, 0.2],
    "3,3,3,3,3": [0.6, 0.7, 0.4]
};

const client1Model = {
    "1,1,1,1,1": [0.6, 0.7, 0.4],  // Overlaps with client 0
    "4,4,4,4,4": [0.8, 0.5, 0.3],  // UNIQUE to client 1
    "5,5,5,5,5": [0.7, 0.6, 0.5]   // UNIQUE to client 1
};

const client2Model = {
    "2,2,2,2,2": [0.5, 0.8, 0.3],  // Overlaps with client 0
    "6,6,6,6,6": [0.9, 0.4, 0.2],  // UNIQUE to client 2
};

const client3Model = {
    "7,7,7,7,7": [0.3, 0.9, 0.6],  // UNIQUE to client 3
    "8,8,8,8,8": [0.4, 0.8, 0.5]   // UNIQUE to client 3
};

const models = [client0Model, client1Model, client2Model, client3Model];

// ============================================================================
// BUGGY VERSION (old)
// ============================================================================
const federatedAverageBUGGY = (models) => {
    const n = models.length;
    const uniformWeights = models.map(() => 1 / n);
    
    // BUG: Only uses states from models[0]
    const avgModel = JSON.parse(JSON.stringify(models[0]));
    
    Object.keys(avgModel).forEach(state => {
        avgModel[state] = avgModel[state].map((_, actionIdx) => {
            const weightedSum = models.reduce((sum, model, clientIdx) => {
                return sum + (model[state]?.[actionIdx] || 0) * uniformWeights[clientIdx];
            }, 0);
            return weightedSum;
        });
    });
    
    return avgModel;
};

// ============================================================================
// FIXED VERSION (new)
// ============================================================================
const federatedAverageFIXED = (models) => {
    const n = models.length;
    const uniformWeights = models.map(() => 1 / n);
    
    // FIX: Collect ALL states from ALL clients
    const allStates = new Set();
    models.forEach(model => {
        Object.keys(model).forEach(state => allStates.add(state));
    });
    
    const avgModel = {};
    const numActions = 3;
    
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
};

// ============================================================================
// RUN COMPARISON
// ============================================================================
console.log("=" .repeat(70));
console.log("FEDERATED AVERAGING COMPARISON");
console.log("=" .repeat(70));

const buggyResult = federatedAverageBUGGY(models);
const fixedResult = federatedAverageFIXED(models);

console.log("\n📊 CLIENT STATES:");
console.log("Client 0:", Object.keys(client0Model).length, "states:", Object.keys(client0Model));
console.log("Client 1:", Object.keys(client1Model).length, "states:", Object.keys(client1Model));
console.log("Client 2:", Object.keys(client2Model).length, "states:", Object.keys(client2Model));
console.log("Client 3:", Object.keys(client3Model).length, "states:", Object.keys(client3Model));

console.log("\n❌ BUGGY VERSION RESULT:");
console.log("Total states:", Object.keys(buggyResult).length);
console.log("States:", Object.keys(buggyResult));
console.log("➡️ LOST:", 8 - Object.keys(buggyResult).length, "states!");
console.log("➡️ Missing: 4,4,4,4,4 | 5,5,5,5,5 | 6,6,6,6,6 | 7,7,7,7,7 | 8,8,8,8,8");

console.log("\n✅ FIXED VERSION RESULT:");
console.log("Total states:", Object.keys(fixedResult).length);
console.log("States:", Object.keys(fixedResult));
console.log("➡️ ALL KNOWLEDGE PRESERVED!");

console.log("\n" + "=" .repeat(70));
console.log("CONCLUSION:");
console.log("Buggy: Only " + Object.keys(buggyResult).length + "/8 states (37.5% knowledge loss!)");
console.log("Fixed: All " + Object.keys(fixedResult).length + "/8 states (100% knowledge preserved!)");
console.log("=" .repeat(70));
