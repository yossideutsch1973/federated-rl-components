/**
 * Unit tests for federated-core.js
 * Tests: federatedAverage, computeModelDelta, serializeModel, etc.
 */

import {
    federatedAverage,
    federatedAverageWeighted,
    computeModelDelta,
    serializeModel,
    deserializeModel,
    shouldFederateByEpisodes,
    shouldFederateByPerformance
} from '../../components/federated-core.js';
import { runTests, assertAlmostEqual, assertEqual, assert } from '../helpers/assert.js';

const tests = {
    // ========== Federated Averaging Tests ==========
    
    'federatedAverage: equal models': () => {
        const models = [
            { 's0': [1, 2], 's1': [3, 4] },
            { 's0': [1, 2], 's1': [3, 4] }
        ];
        const result = federatedAverage(models);
        
        assertEqual(result['s0'][0], 1);
        assertEqual(result['s0'][1], 2);
        assertEqual(result['s1'][0], 3);
        assertEqual(result['s1'][1], 4);
    },
    
    'federatedAverage: different models': () => {
        const models = [
            { 's0': [0, 0] },
            { 's0': [2, 2] }
        ];
        const result = federatedAverage(models);
        
        assertEqual(result['s0'][0], 1);
        assertEqual(result['s0'][1], 1);
    },
    
    'federatedAverage: disjoint states': () => {
        const models = [
            { 's0': [1, 2] },
            { 's1': [3, 4] }
        ];
        const result = federatedAverage(models);
        
        assertAlmostEqual(result['s0'][0], 0.5, 0.01);
        assertAlmostEqual(result['s1'][0], 1.5, 0.01);
    },
    
    'federatedAverage: single client': () => {
        const models = [{ 's0': [5, 6] }];
        const result = federatedAverage(models);
        
        assertEqual(result['s0'][0], 5);
        assertEqual(result['s0'][1], 6);
    },
    
    'federatedAverage: weighted': () => {
        const models = [
            { 's0': [0, 0] },
            { 's0': [10, 10] }
        ];
        const weights = [0.8, 0.2];
        const result = federatedAverage(models, weights);
        
        assertEqual(result['s0'][0], 2);
        assertEqual(result['s0'][1], 2);
    },
    
    // ========== Weighted Federated Averaging ==========
    
    'federatedAverageWeighted: sample counts': () => {
        const models = [
            { 's0': [0, 0] },
            { 's0': [10, 10] }
        ];
        const sampleCounts = [80, 20];
        const result = federatedAverageWeighted(models, sampleCounts);
        
        assertEqual(result['s0'][0], 2);
    },
    
    // ========== Model Delta Tests ==========
    
    'computeModelDelta: identical models': () => {
        const model = { 's0': [1, 2], 's1': [3, 4] };
        const delta = computeModelDelta(model, model);
        
        assertEqual(delta.totalDelta, 0);
        assertEqual(delta.avgDelta, 0);
        assertEqual(delta.maxDelta, 0);
    },
    
    'computeModelDelta: different models': () => {
        const oldModel = { 's0': [0, 0] };
        const newModel = { 's0': [1, 1] };
        const delta = computeModelDelta(oldModel, newModel);
        
        assertEqual(delta.totalDelta, 2);
        assertEqual(delta.avgDelta, 2);
        assertEqual(delta.maxDelta, 1);
        assertEqual(delta.statesChanged, 1);
    },
    
    'computeModelDelta: empty models': () => {
        const delta = computeModelDelta({}, {});
        
        assertEqual(delta.totalDelta, 0);
        assertEqual(delta.totalStates, 0);
    },
    
    'computeModelDelta: convergence detection': () => {
        const oldModel = { 's0': [1.0, 2.0] };
        const newModel = { 's0': [1.001, 2.001] };
        const delta = computeModelDelta(oldModel, newModel);
        
        assert(delta.converged, 'Should detect convergence with small changes');
    },
    
    // ========== Serialization Tests ==========
    
    'serializeModel: basic': () => {
        const model = { 's0': [1, 2] };
        const json = serializeModel(model);
        
        assert(json !== null, 'Should return valid JSON');
        assert(json.includes('"s0"'), 'Should contain state key');
        assert(json.includes('"version"'), 'Should include version');
    },
    
    'serializeModel: empty model': () => {
        const model = {};
        const json = serializeModel(model);
        
        assert(json !== null, 'Should handle empty model');
    },
    
    'deserializeModel: valid JSON': () => {
        const model = { 's0': [1, 2] };
        const json = serializeModel(model);
        const deserialized = deserializeModel(json);
        
        assert(deserialized !== null, 'Should deserialize successfully');
        assertEqual(deserialized.model['s0'][0], 1);
    },
    
    'deserializeModel: invalid JSON': () => {
        const result = deserializeModel('invalid json');
        assertEqual(result, null);
    },
    
    'deserializeModel: missing fields': () => {
        const result = deserializeModel('{"foo": "bar"}');
        assertEqual(result, null);
    },
    
    // ========== Federation Triggers ==========
    
    'shouldFederateByEpisodes: trigger when threshold reached': () => {
        const episodeCounts = [100, 100, 100];
        const result = shouldFederateByEpisodes(episodeCounts, 100, 0);
        
        assert(result, 'Should trigger at threshold');
    },
    
    'shouldFederateByEpisodes: no trigger before threshold': () => {
        const episodeCounts = [50, 50, 50];
        const result = shouldFederateByEpisodes(episodeCounts, 100, 0);
        
        assert(!result, 'Should not trigger before threshold');
    },
    
    'shouldFederateByEpisodes: no duplicate trigger': () => {
        const episodeCounts = [110, 110, 110];
        const result = shouldFederateByEpisodes(episodeCounts, 100, 110);
        
        assert(!result, 'Should not trigger twice in same interval');
    },
    
    'shouldFederateByPerformance: plateau detection': () => {
        // No improvement between windows
        const recentRewards = [
            1, 1, 1, 1, 1, 1, 1, 1, 1, 1,  // Previous window
            1, 1, 1, 1, 1, 1, 1, 1, 1, 1   // Recent window
        ];
        const result = shouldFederateByPerformance(recentRewards, 10, 0.01);
        
        assert(result, 'Should detect performance plateau');
    },
    
    'shouldFederateByPerformance: still improving': () => {
        const recentRewards = [
            1, 1, 1, 1, 1, 1, 1, 1, 1, 1,  // Previous: avg = 1
            2, 2, 2, 2, 2, 2, 2, 2, 2, 2   // Recent: avg = 2, 100% improvement
        ];
        const result = shouldFederateByPerformance(recentRewards, 10, 0.01);
        
        assert(!result, 'Should not trigger when still improving');
    },
    
    'shouldFederateByPerformance: insufficient data': () => {
        const recentRewards = [1, 2, 3];
        const result = shouldFederateByPerformance(recentRewards, 10, 0.01);
        
        assert(!result, 'Should not trigger with insufficient data');
    }
};

runTests('FEDERATED-CORE.JS', tests);

