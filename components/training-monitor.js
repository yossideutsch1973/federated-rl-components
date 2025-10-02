/**
 * TRAINING-MONITOR.JS - Real-time dashboard integration
 *
 * Orchestrates visualization-core primitives + federated events.
 * Functional core (data transforms) + imperative shell (DOM/canvas).
 *
 * @module training-monitor
 */

import {
    createLineChart,
    createBarChart,
    createHeatmap,
    createMetricsPanel as createVizMetricsPanel,
    createCircularBuffer
} from './visualization-core.js';
import { createFederationPanel, computeClientDeltas } from './federation-visualizer.js';

/**
 * Create training dashboard.
 *
 * @param {Object} config
 * @returns {Object}
 */
export const createTrainingDashboard = (config = {}) => {
    const {
        container = document.body,
        updateInterval = 120,
        historySize = 300,
        qTableShape = { rows: 0, cols: 0 },
        metricDefinitions = {
            rewardAvg: { label: 'Avg Reward', format: (v) => v.toFixed(2) },
            successRate: { label: 'Success %', format: (v) => `${(v * 100).toFixed(1)}%` },
            fps: { label: 'FPS', format: (v) => v.toFixed(1) },
            episodes: { label: 'Episodes', format: (v) => v }
        }
    } = config;

    if (!container) {
        throw new Error('Dashboard container required');
    }

    const layout = document.createElement('div');
    layout.style.display = 'grid';
    layout.style.gridTemplateColumns = '2fr 1fr';
    layout.style.gap = '16px';
    layout.style.padding = '12px';
    layout.style.background = '#0f172a';
    layout.style.borderRadius = '12px';
    layout.style.boxShadow = '0 12px 50px rgba(15, 23, 42, 0.6)';

    layout.innerHTML = `
        <section style="display:flex; flex-direction:column; gap:12px;">
            <canvas id="reward-chart" style="width:100%; height:200px;"></canvas>
            <canvas id="success-chart" style="width:100%; height:160px;"></canvas>
            <canvas id="qvalue-chart" style="width:100%; height:160px;"></canvas>
        </section>
        <aside style="display:flex; flex-direction:column; gap:12px;">
            <div id="metrics-panel"></div>
            <canvas id="delta-chart" style="width:100%; height:140px;"></canvas>
            <canvas id="heatmap" style="width:100%; height:180px;"></canvas>
            <div style="display:flex; gap:8px;">
                <button id="dashboard-export" class="btn" style="flex:1;">Export CSV</button>
                <button id="dashboard-export-json" class="btn" style="flex:1;">Export JSON</button>
            </div>
        </aside>
    `;

    container.appendChild(layout);

    const rewardChart = createLineChart(layout.querySelector('#reward-chart'), {
        xLabel: 'Episode',
        yLabel: 'Reward'
    });
    const successChart = createLineChart(layout.querySelector('#success-chart'), {
        xLabel: 'Episode',
        yLabel: 'Success Rate'
    });
    const qValueChart = createLineChart(layout.querySelector('#qvalue-chart'), {
        xLabel: 'Episode',
        yLabel: 'Q(avg)'
    });
    const deltaChart = createBarChart(layout.querySelector('#delta-chart'), {
        barColor: '#22d3ee'
    });
    const heatmap = createHeatmap(layout.querySelector('#heatmap'));
    const metricsPanel = createVizMetricsPanel(layout.querySelector('#metrics-panel'), metricDefinitions);

    const rewardHistory = createCircularBuffer(historySize);
    const successHistory = createCircularBuffer(historySize);
    const qValueHistory = createCircularBuffer(historySize);
    const deltaHistory = createCircularBuffer(Math.min(50, historySize));

    const episodeData = [];
    let lastUpdate = 0;

    const exportCsv = () => {
        const header = 'episode,reward,successRate,qValueAvg\n';
        const rows = episodeData.map(({ episode, reward, successRate, qValueAvg }) => (
            `${episode},${reward.toFixed(3)},${successRate.toFixed(3)},${qValueAvg.toFixed(3)}`
        ));
        return header + rows.join('\n');
    };

    const exportJson = () => JSON.stringify({ history: episodeData }, null, 2);

    const exportButton = layout.querySelector('#dashboard-export');
    const exportJsonButton = layout.querySelector('#dashboard-export-json');

    exportButton.onclick = () => {
        const blob = new Blob([exportCsv()], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `training-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    exportJsonButton.onclick = () => {
        const blob = new Blob([exportJson()], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `training-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const pushSeries = (buffer, value) => {
        buffer.push(value);
    };

    const computeSuccessRate = (successCount, total) => total === 0 ? 0 : successCount / total;

    let federationPanel = null;
    let lastHeatmap = null;
    const attachFederationPanel = () => {
        if (federationPanel) return federationPanel;
        const panelContainer = document.createElement('div');
        panelContainer.style.marginTop = '16px';
        panelContainer.style.gridColumn = '1 / -1';
        layout.appendChild(panelContainer);
        federationPanel = createFederationPanel(panelContainer);
        return federationPanel;
    };

    const updateHeatmap = (matrixValues) => {
        if (!matrixValues || !matrixValues.matrix || matrixValues.matrix.length === 0) {
            if (lastHeatmap) {
                heatmap.clear();
                lastHeatmap = null;
            }
            return;
        }
        lastHeatmap = {
            matrix: matrixValues.matrix.map((row) => row.slice()),
            rowLabels: matrixValues.rowLabels.slice(),
            colLabels: matrixValues.colLabels.slice()
        };
        heatmap.update(lastHeatmap.matrix, lastHeatmap.rowLabels, lastHeatmap.colLabels);
    };

    const maybeRender = () => {
        rewardChart.update(rewardHistory.toArray());
        successChart.update(successHistory.toArray());
        qValueChart.update(qValueHistory.toArray());
        const deltas = deltaHistory.toArray();
        if (deltas.length) {
            deltaChart.update(deltas, deltas.map((_, i) => `${i}`));
        } else {
            deltaChart.clear();
        }
    };

    const updateMetrics = ({ rewardAvg, successRate, fps, episodes }) => {
        metricsPanel.update({ rewardAvg, successRate, fps, episodes });
    };

    return {
        update: (payload) => {
            const now = performance.now();
            if (now - lastUpdate < updateInterval) return;
            lastUpdate = now;

            const {
                episode,
                reward,
                successCount,
                episodeCount,
                qValueAvg,
                qValueMin,
                qValueMax,
                delta,
                perClientModels,
                globalModel,
                fps,
                qMatrixUpdate
            } = payload;

            const totalSuccess = computeSuccessRate(successCount, episodeCount);

            episodeData.push({
                episode,
                reward,
                successRate: totalSuccess,
                qValueAvg
            });

            pushSeries(rewardHistory, reward);
            pushSeries(successHistory, totalSuccess);
            pushSeries(qValueHistory, qValueAvg);
            if (delta) pushSeries(deltaHistory, delta.avgDelta ?? 0);

            if (delta && perClientModels && globalModel) {
                const clientDeltas = computeClientDeltas(globalModel, perClientModels);
                attachFederationPanel().update({
                    round: delta.round ?? 0,
                    delta,
                    perClientDeltas: clientDeltas
                });
            }

            if (qMatrixUpdate) {
                const { row, col, value, matrix, rowLabels = [], colLabels = [] } = qMatrixUpdate;
                if (Array.isArray(matrix)) {
                    updateHeatmap({ matrix, rowLabels, colLabels });
                } else if (row !== undefined && col !== undefined && lastHeatmap) {
                    const nextMatrix = lastHeatmap.matrix.map((r) => r.slice());
                    if (!nextMatrix[row]) return;
                    nextMatrix[row][col] = value;
                    updateHeatmap({
                        matrix: nextMatrix,
                        rowLabels: rowLabels.length ? rowLabels : lastHeatmap.rowLabels,
                        colLabels: colLabels.length ? colLabels : lastHeatmap.colLabels
                    });
                }
            }

            updateMetrics({
                rewardAvg: reward,
                successRate: totalSuccess,
                fps: fps ?? 0,
                episodes: episodeCount
            });

            maybeRender();
        },
        markFederation: ({ round, avgDelta, delta, perClientModels, globalModel }) => {
            const currentLength = rewardHistory.size;
            if (currentLength > 0) {
                const markIndex = currentLength - 1;
                const label = `R${round}`;
                rewardChart.mark(markIndex, label);
                successChart.mark(markIndex, label);
                qValueChart.mark(markIndex, label);
                deltaHistory.push(avgDelta ?? 0);
                if (delta && perClientModels && globalModel) {
                    const clientDeltas = computeClientDeltas(globalModel, perClientModels);
                    attachFederationPanel().update({
                        round,
                        delta,
                        perClientDeltas: clientDeltas
                    });
                }
                maybeRender();
            }
        },
        export: (format = 'csv') => {
            if (format === 'json') return exportJson();
            return exportCsv();
        },
        reset: () => {
            rewardHistory.clear();
            successHistory.clear();
            qValueHistory.clear();
            deltaHistory.clear();
            episodeData.splice(0, episodeData.length);
            metricsPanel.clear();
            heatmap.clear();
            rewardChart.clear();
            successChart.clear();
            qValueChart.clear();
        }
    };
};

export default {
    createTrainingDashboard
};


