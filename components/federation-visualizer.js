/**
 * FEDERATION-VISUALIZER.JS - Federation specific dashboards
 *
 * Provides pure delta analytics + rendering hooks for training dashboard.
 */

import { createLineChart, createBarChart, createMetricsPanel } from './visualization-core.js';

/**
 * Compute per-client deltas (pure).
 * Remark (ASCII): Δ_k = ||θ_global - θ_k||_2
 * @param {Object} globalModel
 * @param {Object[]} clientModels
 * @returns {number[]}
 */
export const computeClientDeltas = (globalModel, clientModels) => {
    const states = new Set(Object.keys(globalModel));
    clientModels.forEach((model) => {
        Object.keys(model).forEach((state) => states.add(state));
    });

    const toVector = (model, state) => model[state] || [];

    return clientModels.map((model) => {
        let sumSquares = 0;
        states.forEach((state) => {
            const gv = toVector(globalModel, state);
            const cv = toVector(model, state);
            const len = Math.max(gv.length, cv.length);
            for (let i = 0; i < len; i++) {
                const diff = (gv[i] || 0) - (cv[i] || 0);
                sumSquares += diff * diff;
            }
        });
        return Math.sqrt(sumSquares);
    });
};

/**
 * Create federation panel.
 */
export const createFederationPanel = (container) => {
    const layout = document.createElement('section');
    layout.style.display = 'grid';
    layout.style.gridTemplateColumns = '1fr 1fr';
    layout.style.gap = '12px';
    layout.style.padding = '12px';
    layout.style.background = '#111827';
    layout.style.borderRadius = '12px';

    layout.innerHTML = `
        <div style="grid-column:1/-1;">
            <canvas id="federation-rounds" style="width:100%; height:140px;"></canvas>
        </div>
        <div>
            <canvas id="client-deltas" style="width:100%; height:160px;"></canvas>
        </div>
        <div>
            <div id="federation-metrics"></div>
        </div>
    `;

    container.appendChild(layout);

    const roundChart = createLineChart(layout.querySelector('#federation-rounds'), {
        xLabel: 'Federation event',
        yLabel: 'Δ avg'
    });
    const clientDeltaChart = createBarChart(layout.querySelector('#client-deltas'), {
        barColor: '#60a5fa'
    });
    const metricsPanel = createMetricsPanel(layout.querySelector('#federation-metrics'), {
        statesChanged: { label: 'States Changed', format: (v) => v },
        relativeDelta: { label: 'Δ_rel', format: (v) => v.toFixed(4) },
        converged: { label: 'Converged', format: (v) => v ? '✅' : '—' }
    });

    const deltaHistory = [];

    return {
        update: (event) => {
            const { round, delta, perClientDeltas = [] } = event;
            deltaHistory.push(delta.avgDelta ?? 0);
            roundChart.update(deltaHistory);
            clientDeltaChart.update(perClientDeltas, perClientDeltas.map((_, i) => `C${i}`));
            metricsPanel.update({
                statesChanged: delta.statesChanged,
                relativeDelta: delta.relativeDelta,
                converged: delta.converged
            });
        }
    };
};

export default {
    computeClientDeltas,
    createFederationPanel
};


