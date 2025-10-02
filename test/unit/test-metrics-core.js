/**
 * Unit tests for metrics-core.js
 * Tests: AGGREGATORS, createEpisodeTracker, formatKpi, aggregateEpisodes
 */

import {
    AGGREGATORS,
    createEpisodeTracker,
    formatKpi,
    aggregateEpisodes,
    DEFAULT_CONFIGS
} from '../../components/metrics-core.js';
import { runTests, assertAlmostEqual, assertEqual, assert } from '../helpers/assert.js';

const tests = {
    // ========== Aggregator Tests ==========
    
    'AGGREGATORS.sum: basic': () => {
        const result = AGGREGATORS.sum([1, 2, 3, 4]);
        assertEqual(result, 10);
    },
    
    'AGGREGATORS.sum: empty': () => {
        const result = AGGREGATORS.sum([]);
        assertEqual(result, 0);
    },
    
    'AGGREGATORS.sum: negative': () => {
        const result = AGGREGATORS.sum([-5, 5, -3]);
        assertEqual(result, -3);
    },
    
    'AGGREGATORS.avg: basic': () => {
        const result = AGGREGATORS.avg([1, 2, 3, 4]);
        assertEqual(result, 2.5);
    },
    
    'AGGREGATORS.avg: empty': () => {
        const result = AGGREGATORS.avg([]);
        assertEqual(result, 0);
    },
    
    'AGGREGATORS.avg: single value': () => {
        const result = AGGREGATORS.avg([42]);
        assertEqual(result, 42);
    },
    
    'AGGREGATORS.max: basic': () => {
        const result = AGGREGATORS.max([1, 5, 3, 2]);
        assertEqual(result, 5);
    },
    
    'AGGREGATORS.max: empty': () => {
        const result = AGGREGATORS.max([]);
        assertEqual(result, 0);
    },
    
    'AGGREGATORS.min: basic': () => {
        const result = AGGREGATORS.min([5, 1, 3, 2]);
        assertEqual(result, 1);
    },
    
    'AGGREGATORS.min: empty': () => {
        const result = AGGREGATORS.min([]);
        assertEqual(result, Infinity);
    },
    
    'AGGREGATORS.last: basic': () => {
        const result = AGGREGATORS.last([1, 2, 3, 4]);
        assertEqual(result, 4);
    },
    
    'AGGREGATORS.first: basic': () => {
        const result = AGGREGATORS.first([1, 2, 3, 4]);
        assertEqual(result, 1);
    },
    
    'AGGREGATORS.count: non-zero': () => {
        const result = AGGREGATORS.count([0, 1, 0, 2, 0, 3]);
        assertEqual(result, 3);
    },
    
    'AGGREGATORS.percentage: basic': () => {
        const result = AGGREGATORS.percentage([1, 0, 1, 0]);
        assertEqual(result, 50);
    },
    
    // ========== Episode Tracker Tests ==========
    
    'createEpisodeTracker: init': () => {
        const tracker = createEpisodeTracker();
        const episodeData = tracker.init();
        
        assertEqual(episodeData.steps, 0);
        assertEqual(episodeData.totalReward, 0);
        assertEqual(episodeData.success, false);
        assert(Array.isArray(episodeData.trajectory));
    },
    
    'createEpisodeTracker: step tracking': () => {
        const tracker = createEpisodeTracker({
            kpis: {
                score: {
                    compute: (state) => state.points,
                    aggregate: 'sum'
                }
            }
        });
        
        let episodeData = tracker.init();
        episodeData = tracker.step(episodeData, { points: 10 }, 0, 5);
        
        assertEqual(episodeData.steps, 1);
        assertEqual(episodeData.totalReward, 5);
        assertEqual(episodeData.kpiValues.score[0], 10);
    },
    
    'createEpisodeTracker: finalize with KPI aggregation': () => {
        const tracker = createEpisodeTracker({
            kpis: {
                score: {
                    compute: (state) => state.points || 0,
                    aggregate: 'sum'
                }
            }
        });
        
        let episodeData = tracker.init();
        episodeData = tracker.step(episodeData, { points: 10 }, 0, 5);
        episodeData = tracker.step(episodeData, { points: 20 }, 1, 5);
        episodeData = tracker.finalize(episodeData, { points: 20 });
        
        assertEqual(episodeData.kpis.score, 30);
        assertEqual(episodeData.steps, 2);
    },
    
    'createEpisodeTracker: custom success function': () => {
        const tracker = createEpisodeTracker({
            isSuccessful: (state, data) => data.totalReward > 10
        });
        
        let episodeData = tracker.init();
        episodeData = tracker.step(episodeData, {}, 0, 15);
        episodeData = tracker.finalize(episodeData, {});
        
        assert(episodeData.success, 'Should be successful with reward > 10');
    },
    
    'createEpisodeTracker: default success (positive reward)': () => {
        const tracker = createEpisodeTracker();
        
        let episodeData = tracker.init();
        episodeData = tracker.step(episodeData, {}, 0, 5);
        episodeData = tracker.finalize(episodeData, {});
        
        assert(episodeData.success, 'Should be successful with positive reward');
    },
    
    'createEpisodeTracker: multiple KPIs': () => {
        const tracker = createEpisodeTracker({
            kpis: {
                score: {
                    compute: (state) => state.points || 0,
                    aggregate: 'sum'
                },
                maxHeight: {
                    compute: (state) => state.height || 0,
                    aggregate: 'max'
                }
            }
        });
        
        let episodeData = tracker.init();
        episodeData = tracker.step(episodeData, { points: 10, height: 50 }, 0, 0);
        episodeData = tracker.step(episodeData, { points: 5, height: 100 }, 1, 0);
        episodeData = tracker.finalize(episodeData, { points: 5, height: 100 });
        
        assertEqual(episodeData.kpis.score, 15);
        assertEqual(episodeData.kpis.maxHeight, 100);
    },
    
    'createEpisodeTracker: getKpiDefinitions': () => {
        const kpis = {
            score: { compute: () => 0, aggregate: 'sum' }
        };
        const tracker = createEpisodeTracker({ kpis });
        
        const defs = tracker.getKpiDefinitions();
        assert(defs.score !== undefined);
    },
    
    // ========== Helper Functions ==========
    
    'formatKpi: with formatter': () => {
        const kpiConfig = {
            format: (v) => `${v} pts`
        };
        const result = formatKpi(100, kpiConfig);
        assertEqual(result, '100 pts');
    },
    
    'formatKpi: default (number)': () => {
        const result = formatKpi(42.567, {});
        assertEqual(result, '42.57');
    },
    
    'formatKpi: default (string)': () => {
        const result = formatKpi('test', {});
        assertEqual(result, 'test');
    },
    
    'aggregateEpisodes: basic stats': () => {
        const episodes = [
            { success: true, totalReward: 10, steps: 100, kpis: { score: 50 } },
            { success: false, totalReward: -5, steps: 200, kpis: { score: 20 } },
            { success: true, totalReward: 15, steps: 150, kpis: { score: 60 } }
        ];
        
        const result = aggregateEpisodes(episodes);
        
        assertEqual(result.episodes, 3);
        assertEqual(result.successCount, 2);
        assertAlmostEqual(result.successRate, 2/3, 0.01);
        assertAlmostEqual(result.avgReward, (10 - 5 + 15) / 3, 0.01);
        assertAlmostEqual(result.avgSteps, (100 + 200 + 150) / 3, 0.01);
    },
    
    'aggregateEpisodes: KPI aggregation': () => {
        const episodes = [
            { success: true, totalReward: 10, steps: 100, kpis: { score: 50 } },
            { success: true, totalReward: 10, steps: 100, kpis: { score: 100 } },
            { success: true, totalReward: 10, steps: 100, kpis: { score: 25 } }
        ];
        
        const result = aggregateEpisodes(episodes);
        
        assertAlmostEqual(result.kpis.score.avg, (50 + 100 + 25) / 3, 0.01);
        assertEqual(result.kpis.score.min, 25);
        assertEqual(result.kpis.score.max, 100);
    },
    
    'aggregateEpisodes: empty array': () => {
        const result = aggregateEpisodes([]);
        assertEqual(Object.keys(result).length, 0);
    },
    
    // ========== Default Configs ==========
    
    'DEFAULT_CONFIGS.rewardBased: positive reward': () => {
        const config = DEFAULT_CONFIGS.rewardBased;
        const result = config.isSuccessful({}, { totalReward: 10 });
        assert(result);
    },
    
    'DEFAULT_CONFIGS.rewardBased: negative reward': () => {
        const config = DEFAULT_CONFIGS.rewardBased;
        const result = config.isSuccessful({}, { totalReward: -5 });
        assert(!result);
    },
    
    'DEFAULT_CONFIGS.ballCatch: has catches': () => {
        const config = DEFAULT_CONFIGS.ballCatch;
        const result = config.isSuccessful({ catches: 1 }, {});
        assert(result);
    },
    
    'DEFAULT_CONFIGS.ballCatch: no catches': () => {
        const config = DEFAULT_CONFIGS.ballCatch;
        const result = config.isSuccessful({ catches: 0 }, {});
        assert(!result);
    }
};

runTests('METRICS-CORE.JS', tests);

