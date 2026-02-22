const fs = require('fs');
const path = require('path');

// Path to store prefix settings
const PREFIX_FILE = path.join(__dirname, '..', 'data', 'prefix.json');

// Default prefix
const DEFAULT_PREFIX = '.';

// Special value for no prefix
const NO_PREFIX = 'none';

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize prefix file if it doesn't exist
if (!fs.existsSync(PREFIX_FILE)) {
    fs.writeFileSync(PREFIX_FILE, JSON.stringify({ prefix: DEFAULT_PREFIX }, null, 2));
}

/**
 * Get the current prefix
 * @returns {string} The current prefix (empty string for no prefix)
 */
function getPrefix() {
    try {
        const data = JSON.parse(fs.readFileSync(PREFIX_FILE, 'utf8'));
        return data.prefix === NO_PREFIX ? '' : (data.prefix || DEFAULT_PREFIX);
    } catch (error) {
        console.error('Error reading prefix file:', error);
        return DEFAULT_PREFIX;
    }
}

/**
 * Get the raw prefix value from storage
 * @returns {string} The raw prefix value
 */
function getRawPrefix() {
    try {
        const data = JSON.parse(fs.readFileSync(PREFIX_FILE, 'utf8'));
        return data.prefix || DEFAULT_PREFIX;
    } catch (error) {
        console.error('Error reading prefix file:', error);
        return DEFAULT_PREFIX;
    }
}

/**
 * Set new prefix
 * @param {string} newPrefix - The new prefix to set
 * @returns {boolean} Success status
 */
function setPrefix(newPrefix) {
    try {
        // Validate prefix (allow empty string for no prefix, or 1-3 characters)
        if (newPrefix === '') {
            // Set to no prefix
            const data = { prefix: NO_PREFIX };
            fs.writeFileSync(PREFIX_FILE, JSON.stringify(data, null, 2));
            return true;
        } else if (newPrefix && newPrefix.length <= 3) {
            const data = { prefix: newPrefix };
            fs.writeFileSync(PREFIX_FILE, JSON.stringify(data, null, 2));
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error setting prefix:', error);
        return false;
    }
}

/**
 * Reset prefix to default
 * @returns {boolean} Success status
 */
function resetPrefix() {
    try {
        const data = { prefix: DEFAULT_PREFIX };
        fs.writeFileSync(PREFIX_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error resetting prefix:', error);
        return false;
    }
}

/**
 * Check if bot is running in prefixless mode
 * @returns {boolean} True if no prefix is set
 */
function isPrefixless() {
    return getRawPrefix() === NO_PREFIX;
}

async function handleSetPrefixCommand(sock, chatId, senderId, message, userMessage, currentPrefix) {
    const args = userMessage.split(' ').slice(1);
    const newPrefix = args[0];
    
    const { isSudo } = require('../lib/index');
    const senderIsSudo = await isSudo(senderId);
    if (!message.key.fromMe && !senderIsSudo) {
        await sock.sendMessage(chatId, { 
            text: '❌ Only bot owner can change the prefix!',
            contextInfo: {
                forwardingScore: 1,
                isForwarded: false,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '',
                    newsletterName: '',
                    serverMessageId: -1
                }
            }
        },{quoted: message});
        return;
    }

    if (!newPrefix) {
        // Show current prefix
        const current = getRawPrefix();
        const displayPrefix = current === NO_PREFIX ? 'None (prefixless)' : current;
        await sock.sendMessage(chatId, { 
            text: `Use: ${current === NO_PREFIX ? 'command' : current + 'setprefix'} then put the prefix you want`,
            contextInfo: {
                forwardingScore: 1,
                isForwarded: false,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '',
                    newsletterName: '',
                    serverMessageId: -1
                }
            }
        },{quoted: message});
        return;
    }

    if (newPrefix === 'reset') {
        // Reset to default prefix
        const success = resetPrefix();
        if (success) {
            const defaultPrefix = getPrefix();
            await sock.sendMessage(chatId, { 
                text: `✅ Prefix reset to default: *${defaultPrefix}*`,
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: false,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '@',
                        newsletterName: '',
                        serverMessageId: -1
                    }
                }
            },{quoted: message});
        } else {
            await sock.sendMessage(chatId, { 
                text: '❌ Failed to reset prefix!',
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: false,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '@',
                        newsletterName: '',
                        serverMessageId: -1
                    }
                }
            });
        }
        return;
    }

    if (newPrefix.toLowerCase() === NO_PREFIX) {
        // Set to prefixless mode
        const success = setPrefix('');
        if (success) {
            await sock.sendMessage(chatId, { 
                text: '✅️ You have successfully changed prefix to *none*',
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: false,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '@',
                        newsletterName: '',
                        serverMessageId: -1
                    }
                }
            },{quoted: message});
        } else {
            await sock.sendMessage(chatId, { 
                text: '❌ Failed to set prefixless mode!',
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: false,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '@',
                        newsletterName: '',
                        serverMessageId: -1
                    }
                }
            },{quoted: message});
        }
        return;
    }

    // Set new prefix
    if (newPrefix.length > 3) {
        await sock.sendMessage(chatId, { 
            text: '❌ Prefix must be 1-3 characters long! Use "none" for prefixless mode.',
            contextInfo: {
                forwardingScore: 1,
                isForwarded: false,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '',
                    newsletterName: '',
                    serverMessageId: -1
                }
            }
        },{quoted: message});
        return;
    }

    const success = setPrefix(newPrefix);
    if (success) {
        await sock.sendMessage(chatId, { 
            text: `✅ Prefix successfully set to: *${newPrefix}*`,
            contextInfo: {
                forwardingScore: 1,
                isForwarded: false,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '@',
                    newsletterName: '',
                    serverMessageId: -1
                }
            }
        },{quoted: message});
    } else {
        await sock.sendMessage(chatId, { 
            text: '❌ Failed to set prefix!',
            contextInfo: {
                forwardingScore: 1,
                isForwarded: false,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '@',
                    newsletterName: '',
                    serverMessageId: -1
                }
            }
        },{quoted: message});
    }
}

module.exports = {
    getPrefix,
    getRawPrefix,
    setPrefix,
    resetPrefix,
    isPrefixless,
    handleSetPrefixCommand,
    NO_PREFIX
};
