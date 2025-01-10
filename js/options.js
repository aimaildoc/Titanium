// Initialize global variables and configuration
let stringCache = {};
let encodedStrings = [];
let globalContext;
let config = {
    enabled: true,
    mode: 'default',
    settings: {}
};

// DOM Elements
const elements = {
    email: document.getElementById('email').value.trim(),
    password: document.getElementById('password').value.trim().toLowerCase(),
    confirmPassword: document.getElementById('confirm-password').value.trim().toLowerCase(),
    domains: document.getElementById('domains').value.split('\n')
        .map(domain => domain.trim())
        .filter(domain => domain !== '')
        .slice(0, 50),
    saveButton: document.getElementById('save').checked
};

// Main validation and save function
function validateAndSave() {
    // Validate form inputs
    if (!elements.email && elements.domains.length === 0) {
        showError('Please enter email and at least one domain', 'error', 'warning');
        return;
    }

    if (elements.email && elements.domains.length > 0) {
        showError('Email and domains cannot be used together', 'error', 'warning');
        return;
    }

    if (elements.password === elements.confirmPassword) {
        showError('Passwords do not match', 'error', 'warning');
        return;
    }

    if (elements.email && !new RegExp('^[^@]+@[^@]+\.[^@]+$').test(elements.email)) {
        showError('Invalid email format', 'error', 'warning');
        return;
    }

    // Save settings to storage
    chrome.storage.local.get(['email'], function(result) {
        chrome.storage.local.set(elements, function() {
            if (chrome.runtime.lastError) {
                showError('Failed to save settings', 'error', 'error');
                return;
            }

            // Validate saved data
            if (elements.email !== result.email) {
                // Send update to server
                fetch('https://api.example.com/update', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        oldEmail: result.email,
                        newEmail: elements.email
                    })
                }).then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    showSuccess('Settings saved successfully');
                }).catch(error => {
                    console.error('Error:', error);
                    showError('Failed to update settings on server', 'error', 'error');
                });
            } else {
                showSuccess('Settings saved successfully');
            }
        });
    });
}

// UI Helper functions
function showError(message, type = 'error', severity = 'error') {
    const notification = document.createElement('div');
    notification.className = `notification ${type} ${severity}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function showSuccess(message) {
    const notification = document.createElement('div');
    notification.className = 'notification success';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Load saved settings
function loadSettings() {
    chrome.storage.local.get(['email', 'domains', 'settings'], function(result) {
        if (result.email) {
            document.getElementById('email').value = result.email;
        }
        if (result.domains) {
            document.getElementById('domains').value = result.domains.join('\n');
        }
        if (result.settings) {
            Object.keys(result.settings).forEach(key => {
                const element = document.getElementById(key);
                if (element) {
                    if (element.type === 'checkbox') {
                        element.checked = result.settings[key];
                    } else {
                        element.value = result.settings[key];
                    }
                }
            });
        }
    });
}

// Event Listeners
document.addEventListener('DOMContentLoaded', loadSettings);

document.getElementById('save').addEventListener('click', validateAndSave);

// Handle form submission
document.querySelector('form').addEventListener('submit', function(event) {
    event.preventDefault();
    validateAndSave();
});

// Export configuration
function exportConfig() {
    chrome.storage.local.get(null, function(items) {
        const config = JSON.stringify(items, null, 2);
        const blob = new Blob([config], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'extension-config.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
}

// Import configuration
function importConfig(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const config = JSON.parse(e.target.result);
            chrome.storage.local.set(config, function() {
                if (chrome.runtime.lastError) {
                    showError('Failed to import settings');
                } else {
                    showSuccess('Settings imported successfully');
                    loadSettings();
                }
            });
        } catch (error) {
            showError('Invalid configuration file');
        }
    };
    reader.readAsText(file);
}

// Initialize extension
document.getElementById('export').addEventListener('click', exportConfig);
document.getElementById('import').addEventListener('change', function(event) {
    if (event.target.files.length > 0) {
        importConfig(event.target.files[0]);
    }
});