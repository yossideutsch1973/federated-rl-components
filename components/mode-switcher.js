/**
 * MODE-SWITCHER.JS - Training/Inference Mode Management
 * 
 * Provides UI and state management for switching between training and inference modes.
 * Implements visual themes, mode persistence, and seamless transitions.
 * 
 * @module mode-switcher
 * @version 1.0.0
 */

// ============================================================================
// MODE CONFIGURATION
// ============================================================================

export const MODES = {
    TRAINING: 'training',
    INFERENCE: 'inference'
};

export const MODE_THEMES = {
    [MODES.TRAINING]: {
        color: '#3b82f6',
        bgColor: 'rgba(59, 130, 246, 0.1)',
        icon: '🧠',
        label: 'Training',
        description: 'Multi-agent learning with federation'
    },
    [MODES.INFERENCE]: {
        color: '#10b981',
        bgColor: 'rgba(16, 185, 129, 0.1)',
        icon: '🎯',
        label: 'Inference',
        description: 'Evaluate trained model performance'
    }
};

// ============================================================================
// MODE SWITCHER UI COMPONENT
// ============================================================================

/**
 * Create mode switcher UI (tabs)
 * 
 * @param {Object} config
 * @param {HTMLElement} config.container - Container element
 * @param {string} config.initialMode - Initial mode (default: training)
 * @param {Function} config.onModeChange - Callback when mode changes
 * @returns {Object} Mode switcher interface
 */
export const createModeSwitcher = (config) => {
    const {
        container,
        initialMode = MODES.TRAINING,
        onModeChange = null
    } = config;

    let currentMode = initialMode;

    // Create tab container
    const tabContainer = document.createElement('div');
    tabContainer.style.cssText = `
        display: flex;
        gap: 8px;
        margin-bottom: 20px;
        border-bottom: 2px solid rgba(255, 255, 255, 0.1);
        padding-bottom: 0;
    `;

    // Create tabs
    const tabs = {};
    Object.values(MODES).forEach(mode => {
        const theme = MODE_THEMES[mode];
        const tab = document.createElement('button');
        tab.className = 'mode-tab';
        tab.innerHTML = `${theme.icon} ${theme.label}`;
        tab.dataset.mode = mode;
        
        tab.style.cssText = `
            padding: 12px 24px;
            border: none;
            background: transparent;
            color: #94a3b8;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            border-bottom: 3px solid transparent;
            transition: all 0.2s;
            font-family: 'Monaco', 'Courier New', monospace;
        `;

        tab.onmouseover = () => {
            if (currentMode !== mode) {
                tab.style.color = '#cbd5e1';
            }
        };

        tab.onmouseout = () => {
            if (currentMode !== mode) {
                tab.style.color = '#94a3b8';
            }
        };

        tab.onclick = () => {
            if (currentMode !== mode) {
                setMode(mode);
            }
        };

        tabs[mode] = tab;
        tabContainer.appendChild(tab);
    });

    // Add description badge
    const descBadge = document.createElement('div');
    descBadge.style.cssText = `
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 11px;
        margin-left: auto;
        align-self: center;
        font-weight: 500;
    `;
    tabContainer.appendChild(descBadge);

    container.appendChild(tabContainer);

    // Update active tab styling
    const updateTabStyles = () => {
        Object.entries(tabs).forEach(([mode, tab]) => {
            const theme = MODE_THEMES[mode];
            if (mode === currentMode) {
                tab.style.color = theme.color;
                tab.style.borderBottomColor = theme.color;
                descBadge.innerHTML = theme.description;
                descBadge.style.background = theme.bgColor;
                descBadge.style.color = theme.color;
            } else {
                tab.style.color = '#94a3b8';
                tab.style.borderBottomColor = 'transparent';
            }
        });
    };

    // Set mode programmatically
    const setMode = (mode) => {
        if (!MODES[mode.toUpperCase()]) {
            console.error('Invalid mode:', mode);
            return;
        }

        currentMode = mode;
        updateTabStyles();

        // Store in localStorage
        localStorage.setItem('rl-mode', mode);

        // Trigger callback
        if (onModeChange) {
            onModeChange(mode, MODE_THEMES[mode]);
        }
    };

    // Initialize
    updateTabStyles();

    return {
        getMode: () => currentMode,
        setMode,
        getTheme: () => MODE_THEMES[currentMode],
        tabs,
        container: tabContainer
    };
};

// ============================================================================
// MODE-SPECIFIC UI VISIBILITY
// ============================================================================

/**
 * Show/hide elements based on current mode
 * 
 * @param {string} mode - Current mode
 * @param {Object} elements - Elements to show/hide
 * @param {HTMLElement[]} elements.trainingOnly - Show only in training
 * @param {HTMLElement[]} elements.inferenceOnly - Show only in inference
 * @param {HTMLElement[]} elements.both - Always show
 */
export const updateVisibility = (mode, elements) => {
    const { trainingOnly = [], inferenceOnly = [], both = [] } = elements;

    trainingOnly.forEach(el => {
        if (el) el.style.display = mode === MODES.TRAINING ? 'block' : 'none';
    });

    inferenceOnly.forEach(el => {
        if (el) el.style.display = mode === MODES.INFERENCE ? 'block' : 'none';
    });

    both.forEach(el => {
        if (el) el.style.display = 'block';
    });
};

// ============================================================================
// LOCAL STORAGE HELPERS
// ============================================================================

/**
 * Get stored mode from localStorage
 * @returns {string} Stored mode or default
 */
export const getStoredMode = () => {
    return localStorage.getItem('rl-mode') || MODES.TRAINING;
};

/**
 * Save current model to localStorage for inference
 * @param {string} key - Storage key
 * @param {Object} model - Model to save
 * @param {Object} metadata - Additional metadata
 */
export const saveLatestModel = (key, model, metadata = {}) => {
    try {
        const data = {
            model,
            metadata: {
                ...metadata,
                timestamp: new Date().toISOString(),
                source: 'training'
            }
        };
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (e) {
        console.error('Failed to save model to localStorage:', e);
        return false;
    }
};

/**
 * Load latest model from localStorage
 * @param {string} key - Storage key
 * @returns {Object|null} Model data or null
 */
export const loadLatestModel = (key) => {
    try {
        const stored = localStorage.getItem(key);
        if (!stored) return null;
        return JSON.parse(stored);
    } catch (e) {
        console.error('Failed to load model from localStorage:', e);
        return null;
    }
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
    MODES,
    MODE_THEMES,
    createModeSwitcher,
    updateVisibility,
    getStoredMode,
    saveLatestModel,
    loadLatestModel
};

