/**
 * VISUALIZATION-CORE.JS - Canvas-based chart primitives (pure-first design)
 *
 * All math helpers are pure functions. Rendering is the only side effect.
 *
 * @module visualization-core
 * @version 1.0.0
 */

// ============================================================================
// MATH HELPERS (PURE)
// ============================================================================

/**
 * Compute min/max for numeric array.
 * @param {number[]} values
 * @returns {{min:number, max:number}}
 * @pure
 */
const computeExtents = (values) => {
    if (!values.length) {
        return { min: 0, max: 0 };
    }
    let min = values[0];
    let max = values[0];
    for (let i = 1; i < values.length; i++) {
        const v = values[i];
        if (v < min) min = v;
        if (v > max) max = v;
    }
    return { min, max };
};

/**
 * Normalize value into [0,1]. Remark (ASCII): f(x) = (x - min) / (max - min + ε)
 * @param {number} value
 * @param {{min:number,max:number}} domain
 * @returns {number}
 * @pure
 */
const normalize = (value, domain) => {
    const range = domain.max - domain.min;
    return range === 0 ? 0.5 : (value - domain.min) / range;
};

/**
 * Produce equidistant x positions for data points.
 * Remark (ASCII): x_i = i / (n - 1)
 * @param {number} length
 * @returns {number[]}
 * @pure
 */
const computeRelativePositions = (length) => {
    if (length <= 1) return [0];
    const step = 1 / (length - 1);
    return Array.from({ length }, (_, i) => i * step);
};

/**
 * Create immutable snapshot of data (defensive copy).
 * @param {number[]} data
 * @returns {number[]}
 * @pure
 */
const cloneSeries = (data) => data.map((value) => Number.isFinite(value) ? value : 0);

/**
 * Convert 2D array to flat list for heatmap scale.
 * @param {number[][]} matrix
 * @returns {number[]}
 * @pure
 */
const flattenMatrix = (matrix) => matrix.reduce((acc, row) => acc.concat(row), []);

// ============================================================================
// HIGH-DPI CANVAS UTILS (STATEFUL WRAPPERS)
// ============================================================================

const prepareCanvas = (canvas) => {
    const ctx = canvas.getContext('2d');
    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    const { width, height } = canvas.getBoundingClientRect();
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return ctx;
};

// ============================================================================
// LINE CHART
// ============================================================================

export const createLineChart = (canvas, config = {}) => {
    const {
        color = '#38bdf8',
        gridColor = 'rgba(148, 163, 184, 0.3)',
        background = 'rgba(15, 23, 42, 0.9)',
        axisColor = '#94a3b8',
        xLabel = '',
        yLabel = '',
        markerColor = '#facc15'
    } = config;

    let data = [];
    let markers = [];
    let lastExportConfig = {};

    const render = () => {
        const ctx = prepareCanvas(canvas);
        const { width, height } = canvas.getBoundingClientRect();

        ctx.fillStyle = background;
        ctx.fillRect(0, 0, width, height);

        const padding = 32;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;

        ctx.save();
        ctx.translate(padding, padding);

        // Grid
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i <= 4; i++) {
            const y = (chartHeight / 4) * i;
            ctx.moveTo(0, y);
            ctx.lineTo(chartWidth, y);
        }
        for (let i = 0; i <= 4; i++) {
            const x = (chartWidth / 4) * i;
            ctx.moveTo(x, 0);
            ctx.lineTo(x, chartHeight);
        }
        ctx.stroke();

        if (data.length) {
            const extents = computeExtents(data);
            const relativeX = computeRelativePositions(data.length);

            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            data.forEach((value, index) => {
                const nx = relativeX[index] * chartWidth;
                const ny = chartHeight - normalize(value, extents) * chartHeight;
                if (index === 0) {
                    ctx.moveTo(nx, ny);
                } else {
                    ctx.lineTo(nx, ny);
                }
            });
            ctx.stroke();

            // Event markers
            if (markers.length) {
                ctx.strokeStyle = markerColor;
                ctx.lineWidth = 1;
                markers.forEach(({ index, label }) => {
                    if (index < 0 || index >= data.length) return;
                    const nx = relativeX[index] * chartWidth;
                    ctx.beginPath();
                    ctx.moveTo(nx, 0);
                    ctx.lineTo(nx, chartHeight);
                    ctx.stroke();
                    if (label) {
                        ctx.fillStyle = markerColor;
                        ctx.font = '11px monospace';
                        ctx.fillText(label, nx + 4, 12);
                    }
                });
            }
        }

        // Axes labels
        ctx.fillStyle = axisColor;
        ctx.font = '12px monospace';
        ctx.fillText(xLabel, chartWidth / 2 - ctx.measureText(xLabel).width / 2, chartHeight + 20);
        ctx.save();
        ctx.translate(-24, chartHeight / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(yLabel, -ctx.measureText(yLabel).width / 2, 0);
        ctx.restore();

        ctx.restore();

        lastExportConfig = {
            type: 'line',
            xLabel,
            yLabel,
            points: cloneSeries(data)
        };
    };

    const api = {
        update: (nextData = []) => {
            data = cloneSeries(nextData);
            render();
        },
        mark: (index, label = '') => {
            markers = [...markers.filter((m) => m.index !== index), { index, label }];
            render();
        },
        clearMarks: () => {
            markers = [];
            render();
        },
        clear: () => {
            data = [];
            markers = [];
            render();
        },
        export: () => ({ data: cloneSeries(data), markers: [...markers], config: lastExportConfig })
    };

    render();
    return api;
};

// ============================================================================
// BAR CHART
// ============================================================================

export const createBarChart = (canvas, config = {}) => {
    const {
        background = 'rgba(15, 23, 42, 0.9)',
        axisColor = '#94a3b8',
        barColor = '#f472b6',
        labelColor = '#e2e8f0'
    } = config;

    let data = [];
    let labels = [];
    let lastExportConfig = {};

    const render = () => {
        const ctx = prepareCanvas(canvas);
        const { width, height } = canvas.getBoundingClientRect();
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, width, height);

        const padding = 28;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;

        const extents = computeExtents(data);
        const range = extents.max - Math.min(0, extents.min);
        const barWidth = data.length ? chartWidth / data.length : chartWidth;

        ctx.save();
        ctx.translate(padding, padding);
        ctx.fillStyle = axisColor;
        ctx.fillRect(0, chartHeight, chartWidth, 1);

        data.forEach((value, index) => {
            const normalized = range === 0 ? 0 : (value - Math.min(0, extents.min)) / range;
            const barHeight = normalized * chartHeight;
            const x = index * barWidth + barWidth * 0.15;
            const y = chartHeight - barHeight;

            ctx.fillStyle = barColor;
            ctx.fillRect(x, y, barWidth * 0.7, barHeight);

            if (labels[index]) {
                ctx.fillStyle = labelColor;
                ctx.font = '11px monospace';
                ctx.fillText(labels[index], x, chartHeight + 14);
            }
        });

        ctx.restore();

        lastExportConfig = {
            type: 'bar',
            labels: [...labels],
            values: cloneSeries(data)
        };
    };

    const api = {
        update: (nextData = [], nextLabels = []) => {
            data = cloneSeries(nextData);
            labels = nextLabels.slice();
            render();
        },
        clear: () => {
            data = [];
            labels = [];
            render();
        },
        export: () => ({ data: cloneSeries(data), labels: [...labels], config: lastExportConfig })
    };

    render();
    return api;
};

// ============================================================================
// HEATMAP (e.g., Q-table visualization)
// ============================================================================

export const createHeatmap = (canvas, config = {}) => {
    const {
        background = 'rgba(15, 23, 42, 0.9)',
        scale = ['#0f172a', '#1d4ed8', '#38bdf8', '#facc15', '#f97316'],
        labelColor = '#e2e8f0'
    } = config;

    let matrix = [];
    let rowLabels = [];
    let colLabels = [];
    let lastExportConfig = {};

    const sampleScale = (t) => {
        const clamped = Math.max(0, Math.min(1, t));
        const lastIndex = scale.length - 1;
        const index = clamped * lastIndex;
        const lower = Math.floor(index);
        const upper = Math.min(lastIndex, lower + 1);
        const ratio = index - lower;

        if (lower === upper) return scale[lower];

        const parse = (hex) => {
            const value = hex.replace('#', '');
            const r = parseInt(value.slice(0, 2), 16);
            const g = parseInt(value.slice(2, 4), 16);
            const b = parseInt(value.slice(4, 6), 16);
            return [r, g, b];
        };

        const [r1, g1, b1] = parse(scale[lower]);
        const [r2, g2, b2] = parse(scale[upper]);

        const mix = (a, b) => Math.round(a + (b - a) * ratio);
        return `rgb(${mix(r1, r2)}, ${mix(g1, g2)}, ${mix(b1, b2)})`;
    };

    const render = () => {
        const ctx = prepareCanvas(canvas);
        const { width, height } = canvas.getBoundingClientRect();

        ctx.fillStyle = background;
        ctx.fillRect(0, 0, width, height);

        const rows = matrix.length;
        const cols = rows ? matrix[0].length : 0;
        if (!rows || !cols) {
            lastExportConfig = { type: 'heatmap', data: [], rows: [], cols: [] };
            return;
        }

        const padding = 40;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;
        const cellWidth = chartWidth / cols;
        const cellHeight = chartHeight / rows;

        const flat = flattenMatrix(matrix);
        const extents = computeExtents(flat);

        ctx.save();
        ctx.translate(padding, padding);

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const value = matrix[row][col];
                const t = normalize(value, extents);
                ctx.fillStyle = sampleScale(t);
                ctx.fillRect(col * cellWidth, row * cellHeight, cellWidth, cellHeight);
            }
        }

        // Separate grid lines
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.4)';
        ctx.lineWidth = 1;
        for (let row = 0; row <= rows; row++) {
            ctx.beginPath();
            ctx.moveTo(0, row * cellHeight);
            ctx.lineTo(chartWidth, row * cellHeight);
            ctx.stroke();
        }
        for (let col = 0; col <= cols; col++) {
            ctx.beginPath();
            ctx.moveTo(col * cellWidth, 0);
            ctx.lineTo(col * cellWidth, chartHeight);
            ctx.stroke();
        }

        // Labels
        ctx.fillStyle = labelColor;
        ctx.font = '11px monospace';
        rowLabels.forEach((label, row) => {
            ctx.fillText(label ?? '', -padding + 4, row * cellHeight + cellHeight / 2 + 4);
        });
        colLabels.forEach((label, col) => {
            const text = label ?? '';
            const textWidth = ctx.measureText(text).width;
            ctx.fillText(text, col * cellWidth + cellWidth / 2 - textWidth / 2, chartHeight + 16);
        });

        ctx.restore();

        lastExportConfig = {
            type: 'heatmap',
            rows: [...rowLabels],
            cols: [...colLabels],
            matrix: matrix.map((row) => cloneSeries(row))
        };
    };

    const api = {
        update: (nextMatrix = [[]], nextRowLabels = [], nextColLabels = []) => {
            matrix = nextMatrix.map((row) => cloneSeries(row));
            rowLabels = nextRowLabels.slice();
            colLabels = nextColLabels.slice();
            render();
        },
        clear: () => {
            matrix = [];
            rowLabels = [];
            colLabels = [];
            render();
        },
        export: () => ({ matrix: matrix.map((row) => cloneSeries(row)), rowLabels: [...rowLabels], colLabels: [...colLabels], config: lastExportConfig })
    };

    render();
    return api;
};

// ============================================================================
// METRICS PANEL (DOM UTIL)
// ============================================================================

export const createMetricsPanel = (container, metrics = {}) => {
    const state = Object.entries(metrics).reduce((acc, [key, { label, format = (v) => v }]) => {
        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.justifyContent = 'space-between';
        wrapper.style.fontFamily = 'monospace';
        wrapper.style.fontSize = '12px';
        wrapper.style.marginBottom = '4px';

        const labelEl = document.createElement('span');
        labelEl.textContent = label || key;
        labelEl.style.color = '#94a3b8';

        const valueEl = document.createElement('span');
        valueEl.textContent = '-';
        valueEl.style.color = '#f8fafc';

        wrapper.appendChild(labelEl);
        wrapper.appendChild(valueEl);
        container.appendChild(wrapper);

        acc[key] = { format, valueEl };
        return acc;
    }, {});

    return {
        update: (values = {}) => {
            Object.entries(values).forEach(([key, value]) => {
                if (!state[key]) return;
                state[key].valueEl.textContent = state[key].format(value);
            });
        },
        clear: () => {
            Object.values(state).forEach(({ valueEl }) => {
                valueEl.textContent = '-';
            });
        }
    };
};

// ============================================================================
// CIRCULAR BUFFER
// ============================================================================

export const createCircularBuffer = (size) => {
    const buffer = new Float32Array(size);
    let index = 0;
    let count = 0;

    return {
        push: (value) => {
            buffer[index] = Number.isFinite(value) ? value : 0;
            index = (index + 1) % size;
            if (count < size) count++;
        },
        toArray: () => {
            if (count < size) {
                return Array.from(buffer.slice(0, count));
            }
            const head = Array.from(buffer.slice(index));
            const tail = Array.from(buffer.slice(0, index));
            return head.concat(tail);
        },
        clear: () => {
            buffer.fill(0);
            index = 0;
            count = 0;
        },
        get size() {
            return count;
        }
    };
};

export default {
    createLineChart,
    createBarChart,
    createHeatmap,
    createMetricsPanel,
    createCircularBuffer
};


