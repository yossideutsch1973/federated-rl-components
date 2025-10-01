/**
 * MODEL-PERSISTENCE.JS - Model Save/Load/Export Module
 * 
 * Handles all model persistence operations with pure functions.
 * Follows DI pattern for storage backends.
 * 
 * @module model-persistence
 * @version 1.0.0
 */

import { serializeModel, deserializeModel } from './federated-core.js';

// ============================================================================
// LOCALSTORAGE PERSISTENCE (Pure Functions)
// ============================================================================

/**
 * Save model to localStorage
 * 
 * @pure (with localStorage side effect)
 * @param {string} key - Storage key
 * @param {Object} model - Q-table model
 * @param {Object} metadata - Additional metadata
 * @returns {boolean} Success status
 */
export const saveToLocalStorage = (key, model, metadata = {}) => {
    try {
        const serialized = serializeModel(model, metadata);
        if (!serialized) return false;
        
        localStorage.setItem(key, serialized);
        return true;
    } catch (e) {
        console.error('❌ localStorage save failed:', e);
        return false;
    }
};

/**
 * Load model from localStorage
 * 
 * @pure (with localStorage side effect)
 * @param {string} key - Storage key
 * @returns {Object|null} Model data or null if not found
 */
export const loadFromLocalStorage = (key) => {
    try {
        const serialized = localStorage.getItem(key);
        if (!serialized) return null;
        
        return deserializeModel(serialized);
    } catch (e) {
        console.error('❌ localStorage load failed:', e);
        return null;
    }
};

/**
 * Check if model exists in localStorage
 * 
 * @pure (with localStorage side effect)
 * @param {string} key - Storage key
 * @returns {boolean} Whether model exists
 */
export const hasModel = (key) => {
    return localStorage.getItem(key) !== null;
};

// ============================================================================
// FILE EXPORT (Pure Functions)
// ============================================================================

/**
 * Export model to downloadable JSON file
 * Formula: serialize(model) → Blob → URL → download
 * 
 * @param {Object} model - Q-table model
 * @param {string} filename - Target filename
 * @param {Object} metadata - Additional metadata
 * @returns {boolean} Success status
 */
export const exportToFile = (model, filename, metadata = {}) => {
    try {
        const serialized = serializeModel(model, metadata);
        if (!serialized) return false;
        
        const blob = new Blob([serialized], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        
        URL.revokeObjectURL(url);
        return true;
    } catch (e) {
        console.error('❌ File export failed:', e);
        return false;
    }
};

// ============================================================================
// FILE IMPORT (Higher-Order Function)
// ============================================================================

/**
 * Create file input handler for model import
 * Returns a function that triggers file selection
 * 
 * @param {Function} onLoad - Callback(modelData, metadata)
 * @param {Function} onError - Optional error callback
 * @returns {Function} Trigger function
 */
export const createFileImporter = (onLoad, onError = null) => {
    // Create hidden file input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
    
    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const data = deserializeModel(event.target.result);
            if (data) {
                onLoad(data.model, data.metadata);
            } else {
                if (onError) onError('Invalid model file format');
            }
        };
        reader.onerror = () => {
            if (onError) onError('File read error');
        };
        reader.readAsText(file);
    };
    
    // Return trigger function
    return () => fileInput.click();
};

// ============================================================================
// MODEL PERSISTENCE MANAGER (Factory Pattern with DI)
// ============================================================================

/**
 * Create a model persistence manager
 * 
 * Usage:
 * ```js
 * const persistence = createPersistenceManager({
 *   appName: 'MyRL',
 *   onLoad: (model) => { agent.setModel(model); }
 * });
 * 
 * persistence.save(model);
 * persistence.load();
 * persistence.export();
 * persistence.import();
 * ```
 * 
 * @param {Object} config - Configuration
 * @param {string} config.appName - App identifier for localStorage key
 * @param {Function} config.onLoad - Callback when model loaded
 * @param {Function} config.onError - Optional error callback
 * @returns {Object} Persistence manager
 */
export const createPersistenceManager = (config) => {
    const {
        appName = 'federated-rl',
        onLoad = null,
        onError = null
    } = config;
    
    const storageKey = `${appName}-latest`;
    const fileImporter = createFileImporter(
        (model, metadata) => {
            console.log('📂 Model loaded from file:', metadata);
            if (onLoad) onLoad(model, metadata, 'file');
        },
        (error) => {
            console.error('❌ Import failed:', error);
            if (onError) onError(error);
        }
    );
    
    return {
        /**
         * Save model to localStorage
         * @param {Object} model - Q-table
         * @param {Object} metadata - Metadata
         * @returns {boolean} Success
         */
        save: (model, metadata = {}) => {
            const success = saveToLocalStorage(storageKey, model, {
                ...metadata,
                appName,
                savedAt: new Date().toISOString()
            });
            if (success) {
                console.log(`💾 Checkpoint saved: ${storageKey}`);
            }
            return success;
        },
        
        /**
         * Load model from localStorage
         * @returns {Object|null} Model data
         */
        load: () => {
            const data = loadFromLocalStorage(storageKey);
            if (data && onLoad) {
                console.log('📂 Checkpoint loaded:', data.metadata);
                onLoad(data.model, data.metadata, 'localStorage');
            }
            return data;
        },
        
        /**
         * Check if saved model exists
         * @returns {boolean}
         */
        hasCheckpoint: () => {
            return hasModel(storageKey);
        },
        
        /**
         * Export model to file
         * @param {Object} model - Q-table
         * @param {Object} metadata - Metadata
         * @returns {boolean} Success
         */
        export: (model, metadata = {}) => {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `${appName}-${timestamp}.json`;
            return exportToFile(model, filename, {
                ...metadata,
                appName,
                exportedAt: new Date().toISOString()
            });
        },
        
        /**
         * Import model from file
         * Triggers file picker dialog
         */
        import: () => {
            fileImporter();
        },
        
        /**
         * Get storage key
         * @returns {string}
         */
        getKey: () => storageKey
    };
};

// ============================================================================
// CONVENIENCE FUNCTIONS (Backward Compatibility)
// ============================================================================

/**
 * Save latest model (convenience wrapper)
 * @param {string} key - Storage key
 * @param {Object} model - Q-table
 * @param {Object} metadata - Metadata
 * @returns {boolean} Success
 */
export const saveLatestModel = (key, model, metadata = {}) => {
    return saveToLocalStorage(key, model, metadata);
};

/**
 * Load latest model (convenience wrapper)
 * @param {string} key - Storage key
 * @returns {Object|null} Model data
 */
export const loadLatestModel = (key) => {
    return loadFromLocalStorage(key);
};

// Export default
export default {
    saveToLocalStorage,
    loadFromLocalStorage,
    hasModel,
    exportToFile,
    createFileImporter,
    createPersistenceManager,
    saveLatestModel,
    loadLatestModel
};

