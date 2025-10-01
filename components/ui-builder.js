/**
 * UI-BUILDER.JS - Reusable UI Components
 * 
 * Build federated RL dashboards with minimal code.
 * Creates canvas grids, control panels, metrics displays.
 * 
 * @module ui-builder
 * @version 1.0.0
 */

// ============================================================================
// LAYOUT BUILDERS
// ============================================================================

/**
 * Create main dashboard layout
 * 
 * @param {Object} config - Layout configuration
 * @param {string} config.title - App title
 * @param {string} config.subtitle - Subtitle
 * @param {string} config.containerId - Container element ID
 * @returns {Object} Layout elements
 */
export const createDashboardLayout = (config = {}) => {
    const {
        title = 'Federated RL Demo',
        subtitle = 'Multi-client reinforcement learning',
        containerId = 'app'
    } = config;

    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container #${containerId} not found`);
        return null;
    }

    container.innerHTML = `
        <div id="dashboard-header">
            <h1>${title}</h1>
            <p>${subtitle}</p>
        </div>
        <div id="dashboard-controls"></div>
        <div id="dashboard-metrics"></div>
        <div id="dashboard-clients"></div>
    `;

    return {
        header: container.querySelector('#dashboard-header'),
        controls: container.querySelector('#dashboard-controls'),
        metrics: container.querySelector('#dashboard-metrics'),
        clients: container.querySelector('#dashboard-clients')
    };
};

/**
 * Create client grid layout
 * 
 * @param {Object} config - Grid configuration
 * @param {number} config.numClients - Number of clients
 * @param {number} config.canvasWidth - Canvas width (px)
 * @param {number} config.canvasHeight - Canvas height (px)
 * @param {HTMLElement} config.container - Container element
 * @returns {Object[]} Array of client elements
 */
export const createClientGrid = (config = {}) => {
    const {
        numClients = 4,
        canvasWidth = 300,
        canvasHeight = 220,
        container
    } = config;

    if (!container) {
        console.error('Container required for client grid');
        return [];
    }

    const cols = Math.ceil(Math.sqrt(numClients));
    container.style.display = 'grid';
    container.style.gridTemplateColumns = `repeat(${cols}, ${canvasWidth}px)`;
    container.style.gap = '10px';

    const clients = [];
    for (let i = 0; i < numClients; i++) {
        const clientEl = document.createElement('div');
        clientEl.className = 'client-panel';
        clientEl.innerHTML = `
            <div class="client-header">Client ${i}</div>
            <canvas width="${canvasWidth}" height="${canvasHeight}"></canvas>
            <div class="client-metrics"></div>
        `;
        container.appendChild(clientEl);

        clients.push({
            id: i,
            element: clientEl,
            canvas: clientEl.querySelector('canvas'),
            metrics: clientEl.querySelector('.client-metrics')
        });
    }

    return clients;
};

// ============================================================================
// CONTROL PANELS
// ============================================================================

/**
 * Create control bar with buttons
 * 
 * @param {Object} config - Control configuration
 * @param {Object[]} config.buttons - Button definitions
 * @param {HTMLElement} config.container - Container element
 * @returns {Object} Button elements by ID
 */
export const createControlBar = (config = {}) => {
    const {
        buttons = [],
        container
    } = config;

    if (!container) {
        console.error('Container required for control bar');
        return {};
    }

    const bar = document.createElement('div');
    bar.className = 'control-bar';
    bar.style.display = 'flex';
    bar.style.gap = '8px';
    bar.style.flexWrap = 'wrap';
    bar.style.marginBottom = '16px';

    const buttonEls = {};
    buttons.forEach(btn => {
        const button = document.createElement('button');
        button.id = btn.id;
        button.textContent = btn.label;
        button.className = btn.className || 'btn';
        if (btn.onClick) button.onclick = btn.onClick;
        bar.appendChild(button);
        buttonEls[btn.id] = button;
    });

    container.appendChild(bar);
    return buttonEls;
};

/**
 * Create input control (number, text, etc.)
 * 
 * @param {Object} config - Input configuration
 * @param {string} config.type - Input type
 * @param {string} config.label - Label text
 * @param {string} config.id - Input ID
 * @param {any} config.defaultValue - Default value
 * @param {Object} config.attrs - Additional attributes
 * @param {HTMLElement} config.container - Container element
 * @returns {HTMLElement} Input element
 */
export const createInput = (config = {}) => {
    const {
        type = 'text',
        label = '',
        id,
        defaultValue = '',
        attrs = {},
        container
    } = config;

    if (!container) {
        console.error('Container required for input');
        return null;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'input-wrapper';
    wrapper.style.display = 'inline-flex';
    wrapper.style.gap = '8px';
    wrapper.style.alignItems = 'center';

    if (label) {
        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        labelEl.htmlFor = id;
        wrapper.appendChild(labelEl);
    }

    const input = document.createElement('input');
    input.type = type;
    input.id = id;
    input.value = defaultValue;
    Object.assign(input, attrs);
    wrapper.appendChild(input);

    container.appendChild(wrapper);
    
    // Return input with container reference for visibility control
    input.container = wrapper;
    return input;
};

// ============================================================================
// METRICS DISPLAYS
// ============================================================================

/**
 * Create metrics panel
 * 
 * @param {Object} config - Metrics configuration
 * @param {Object[]} config.metrics - Metric definitions
 * @param {HTMLElement} config.container - Container element
 * @returns {Object} Metric elements by ID
 */
export const createMetricsPanel = (config = {}) => {
    const {
        metrics = [],
        container
    } = config;

    if (!container) {
        console.error('Container required for metrics panel');
        return {};
    }

    const panel = document.createElement('div');
    panel.className = 'metrics-panel';
    panel.style.display = 'grid';
    panel.style.gridTemplateColumns = `repeat(${metrics.length}, 1fr)`;
    panel.style.gap = '12px';
    panel.style.marginBottom = '16px';

    const metricEls = {};
    metrics.forEach(metric => {
        const metricDiv = document.createElement('div');
        metricDiv.className = 'metric';
        metricDiv.innerHTML = `
            <div class="metric-label">${metric.label}</div>
            <div class="metric-value" id="${metric.id}">0</div>
        `;
        panel.appendChild(metricDiv);
        metricEls[metric.id] = metricDiv.querySelector('.metric-value');
    });

    container.appendChild(panel);
    return metricEls;
};

/**
 * Update metric display
 * 
 * @param {HTMLElement} element - Metric element
 * @param {any} value - New value
 * @param {string} format - Format function or string
 */
export const updateMetric = (element, value, format = null) => {
    if (!element) return;
    
    let displayValue = value;
    if (typeof format === 'function') {
        displayValue = format(value);
    } else if (format === 'percent') {
        displayValue = `${(value * 100).toFixed(1)}%`;
    } else if (format === 'decimal') {
        displayValue = value.toFixed(2);
    }
    
    element.textContent = displayValue;
};

// ============================================================================
// STYLING
// ============================================================================

/**
 * Inject default styles for federated RL dashboard
 */
export const injectDefaultStyles = () => {
    if (document.getElementById('ui-builder-styles')) return;

    const style = document.createElement('style');
    style.id = 'ui-builder-styles';
    style.textContent = `
        .client-panel {
            border: 1px solid #444;
            border-radius: 8px;
            padding: 8px;
            background: #2a2a2a;
        }
        .client-header {
            font-weight: bold;
            margin-bottom: 4px;
            color: #aaa;
        }
        .client-metrics {
            font-size: 11px;
            color: #999;
            margin-top: 4px;
        }
        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            background: #444;
            color: #fff;
            cursor: pointer;
            transition: background 0.2s;
        }
        .btn:hover {
            background: #555;
        }
        .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .control-bar {
            padding: 12px;
            background: #1a1a1a;
            border-radius: 8px;
        }
        .metric {
            padding: 12px;
            background: #1a1a1a;
            border-radius: 8px;
            text-align: center;
        }
        .metric-label {
            font-size: 12px;
            color: #999;
            margin-bottom: 4px;
        }
        .metric-value {
            font-size: 20px;
            font-weight: bold;
            color: #4f8cff;
        }
        .input-wrapper {
            padding: 4px 8px;
            background: #1a1a1a;
            border-radius: 4px;
        }
        .input-wrapper label {
            color: #999;
            font-size: 14px;
        }
        .input-wrapper input {
            padding: 4px 8px;
            background: #2a2a2a;
            border: 1px solid #444;
            border-radius: 4px;
            color: #fff;
            font-size: 14px;
        }
    `;
    document.head.appendChild(style);
};

// Export default object
export default {
    createDashboardLayout,
    createClientGrid,
    createControlBar,
    createInput,
    createMetricsPanel,
    updateMetric,
    injectDefaultStyles
};
