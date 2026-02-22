// commands/menuSettings.js
const fs = require('fs');
const path = require('path');

// Path to store menu settings
const MENU_SETTINGS_FILE = path.join(__dirname, '..', 'data', 'menuSettings.json');

// Default menu style
const DEFAULT_MENU_STYLE = '5';

// Menu style descriptions
const MENU_STYLES = {
    '1': 'Image with caption',
    '2': 'Simple text reply',
    '3': 'Text with external ad reply',
    '4': 'Document with thumbnail',
    '5': 'Interactive message',
    '6': 'Payment request format'
};

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize menu settings file if it doesn't exist
if (!fs.existsSync(MENU_SETTINGS_FILE)) {
    fs.writeFileSync(MENU_SETTINGS_FILE, JSON.stringify({ 
        menuStyle: DEFAULT_MENU_STYLE,
        showMemory: true,
        showUptime: true,
        showPluginCount: true,
        showProgressBar: true
    }, null, 2));
}

/**
 * Get the current menu style
 * @returns {string} The current menu style
 */
function getMenuStyle() {
    try {
        const data = JSON.parse(fs.readFileSync(MENU_SETTINGS_FILE, 'utf8'));
        return data.menuStyle || DEFAULT_MENU_STYLE;
    } catch (error) {
        console.error('Error reading menu settings file:', error);
        return DEFAULT_MENU_STYLE;
    }
}

/**
 * Set new menu style
 * @param {string} newStyle - The new menu style to set (1-6)
 * @returns {boolean} Success status
 */
function setMenuStyle(newStyle) {
    try {
        // Validate menu style
        if (!['1', '2', '3', '4', '5', '6'].includes(newStyle)) {
            return false;
        }
        
        const currentData = JSON.parse(fs.readFileSync(MENU_SETTINGS_FILE, 'utf8'));
        currentData.menuStyle = newStyle;
        fs.writeFileSync(MENU_SETTINGS_FILE, JSON.stringify(currentData, null, 2));
        return true;
    } catch (error) {
        console.error('Error setting menu style:', error);
        return false;
    }
}

/**
 * Get all menu settings
 * @returns {Object} All menu settings
 */
function getMenuSettings() {
    try {
        return JSON.parse(fs.readFileSync(MENU_SETTINGS_FILE, 'utf8'));
    } catch (error) {
        console.error('Error reading menu settings:', error);
        return { 
            menuStyle: DEFAULT_MENU_STYLE,
            showMemory: true,
            showUptime: true,
            showPluginCount: true,
            showProgressBar: true
        };
    }
}

/**
 * Update menu settings
 * @param {Object} settings - Settings to update
 * @returns {boolean} Success status
 */
function updateMenuSettings(settings) {
    try {
        const currentData = getMenuSettings();
        const newData = { ...currentData, ...settings };
        fs.writeFileSync(MENU_SETTINGS_FILE, JSON.stringify(newData, null, 2));
        return true;
    } catch (error) {
        console.error('Error updating menu settings:', error);
        return false;
    }
}

/**
 * Reset menu settings to default
 * @returns {boolean} Success status
 */
function resetMenuSettings() {
    try {
        const defaultSettings = { 
            menuStyle: DEFAULT_MENU_STYLE,
            showMemory: true,
            showUptime: true,
            showPluginCount: true,
            showProgressBar: true
        };
        fs.writeFileSync(MENU_SETTINGS_FILE, JSON.stringify(defaultSettings, null, 2));
        return true;
    } catch (error) {
        console.error('Error resetting menu settings:', error);
        return false;
    }
}

/**
 * Toggle specific setting
 * @param {string} setting - Setting name to toggle
 * @returns {boolean} New value of the setting
 */
function toggleSetting(setting) {
    try {
        const currentData = getMenuSettings();
        if (currentData.hasOwnProperty(setting)) {
            currentData[setting] = !currentData[setting];
            fs.writeFileSync(MENU_SETTINGS_FILE, JSON.stringify(currentData, null, 2));
            return currentData[setting];
        }
        return false;
    } catch (error) {
        console.error('Error toggling setting:', error);
        return false;
    }
}

module.exports = {
    getMenuStyle,
    setMenuStyle,
    getMenuSettings,
    updateMenuSettings,
    resetMenuSettings,
    toggleSetting,
    MENU_STYLES,
    DEFAULT_MENU_STYLE
};
