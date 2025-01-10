// Initialize global variables
let stringCache = {};
let encodedStrings = [];
let globalContext;
let extensionConfig = {
    mode: "default",
    status: "x", 
    type: "c",
    data: []
};

let currentUrl = "";
let isEnabled = true;
let maxRetries = 30;
let retryInterval = 500;
let retryCount = 0;
let currentMode = "default";

// Main initialization function
function initialize() {
    // Set up message listeners
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        switch(message.type) {
            case "UPDATE_CONFIG":
                updateConfig(message.data);
                break;
            case "GET_STATUS":
                sendResponse({
                    status: extensionConfig.status,
                    mode: extensionConfig.mode
                });
                break;
            case "PROCESS_DATA":
                processData(message.data);
                break;
        }
    });

    // Set up mutation observer
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                handleDOMChanges(mutation.target);
            }
        });
    });

    // Start observing DOM changes
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Initialize storage
    chrome.storage.local.get(['config'], (result) => {
        if (result.config) {
            updateConfig(result.config);
        }
    });
}

// Update extension configuration
function updateConfig(config) {
    extensionConfig = {
        ...extensionConfig,
        ...config
    };
    
    chrome.storage.local.set({
        config: extensionConfig
    });
}

// Process incoming data
function processData(data) {
    if (!isEnabled) return;
    
    try {
        // Validate data
        if (!data || typeof data !== 'object') {
            console.error('Invalid data format');
            return;
        }

        // Process based on current mode
        switch(extensionConfig.mode) {
            case 'analyze':
                analyzeContent(data);
                break;
            case 'filter':
                filterContent(data);
                break;
            case 'transform':
                transformContent(data);
                break;
            default:
                defaultProcessing(data);
        }

    } catch(error) {
        console.error('Error processing data:', error);
    }
}

// Handle DOM changes
function handleDOMChanges(node) {
    if (!isEnabled) return;

    // Check if node matches criteria
    if (shouldProcessNode(node)) {
        const data = extractDataFromNode(node);
        processData(data);
    }
}

// Utility functions
function shouldProcessNode(node) {
    // Check if node matches processing criteria
    return node && 
           node.nodeType === 1 && 
           !node.hasAttribute('data-processed');
}

function extractDataFromNode(node) {
    return {
        content: node.textContent,
        attributes: Array.from(node.attributes).map(attr => ({
            name: attr.name,
            value: attr.value
        })),
        type: node.nodeType,
        tag: node.tagName?.toLowerCase()
    };
}

function analyzeContent(data) {
    // Analyze content based on rules
    const analysis = {
        type: data.type,
        content: data.content,
        metrics: calculateMetrics(data)
    };
    
    extensionConfig.data.push(analysis);
}

function filterContent(data) {
    // Apply content filters
    const filtered = applyFilters(data, extensionConfig.filters);
    if (filtered) {
        extensionConfig.data.push(filtered);
    }
}

function transformContent(data) {
    // Transform content based on rules
    const transformed = applyTransformations(data, extensionConfig.transformRules);
    if (transformed) {
        updateDOM(transformed);
    }
}

function defaultProcessing(data) {
    // Default data processing
    const processed = {
        timestamp: Date.now(),
        data: data
    };
    extensionConfig.data.push(processed);
}

// Helper functions
function calculateMetrics(data) {
    return {
        length: data.content?.length || 0,
        type: typeof data.content,
        timestamp: Date.now()
    };
}

function applyFilters(data, filters) {
    if (!filters || !Array.isArray(filters)) return data;
    
    return filters.reduce((filtered, filter) => {
        if (typeof filter === 'function') {
            return filter(filtered);
        }
        return filtered;
    }, data);
}

function applyTransformations(data, rules) {
    if (!rules || !Array.isArray(rules)) return data;
    
    return rules.reduce((transformed, rule) => {
        if (typeof rule === 'function') {
            return rule(transformed);
        }
        return transformed;
    }, data);
}

function updateDOM(data) {
    // Update DOM with transformed data
    if (data.target && data.content) {
        const element = document.querySelector(data.target);
        if (element) {
            element.innerHTML = data.content;
            element.setAttribute('data-processed', 'true');
        }
    }
}

// Initialize extension
initialize();