/**
 * TRUTH MD Bot - A WhatsApp Bot
 * Autotyping Command - Shows fake typing status
 */

const fs = require('fs');
const path = require('path');

// Path to store the configuration
const configPath = path.join(__dirname, '..', 'data', 'autotyping.json');

// Initialize configuration file if it doesn't exist
function initConfig() {
    if (!fs.existsSync(configPath)) {
        fs.writeFileSync(configPath, JSON.stringify({ enabled: false }, null, 2));
    }
    return JSON.parse(fs.readFileSync(configPath));
}

// Toggle autotyping feature
async function autotypingCommand(sock, chatId, message) {
    try {
        // Check if sender is the owner or sudo
        const { isSudo } = require('../lib/index');
        const senderId = message.key.participant || message.key.remoteJid;
        const senderIsSudo = await isSudo(senderId);
        const isOwner = message.key.fromMe || senderIsSudo;
        
        if (!isOwner) {
            await sock.sendMessage(chatId, {
                text: '❌ This command is only available for the owner!'
            }, { quoted: message });
            return;
        }

        // Get command arguments
        const args = message.message?.conversation?.trim().split(' ').slice(1) || 
                    message.message?.extendedTextMessage?.text?.trim().split(' ').slice(1) || 
                    [];
        
        // Initialize or read config
        const config = initConfig();
        
        // Toggle based on argument or toggle current state if no argument
        if (args.length > 0) {
            const action = args[0].toLowerCase();
            if (action === 'on' || action === 'enable') {
                config.enabled = true;
            } else if (action === 'off' || action === 'disable') {
                config.enabled = false;
            } else {
                await sock.sendMessage(chatId, {
                    text: '❌ Invalid option! Use: .autotyping on/off'
                }, { quoted: message });
                return;
            }
        } else {
            // Toggle current state
            config.enabled = !config.enabled;
        }
        
        // Save updated configuration
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        
        // Send confirmation message
        await sock.sendMessage(chatId, {
            text: `✅ Auto-typing has been ${config.enabled ? 'enabled' : 'disabled'}!`
        }, { quoted: message });
        
    } catch (error) {
        await sock.sendMessage(chatId, {
            text: '❌ Error processing command!'
        }, { quoted: message });
    }
}

// Function to check if autotyping is enabled
function isAutotypingEnabled() {
    try {
        const config = initConfig();
        return config.enabled;
    } catch (error) {
        return false;
    }
}

// Function to handle autotyping for regular messages
async function handleAutotypingForMessage(sock, chatId, userMessage) {
    if (isAutotypingEnabled()) {
        try {
            await sock.sendPresenceUpdate('composing', chatId);
            
            const typingDuration = Math.min(5000, Math.max(2000, userMessage.length * 100));
            await new Promise(resolve => setTimeout(resolve, typingDuration));
            
            await sock.sendPresenceUpdate('paused', chatId);
            
            return true;
        } catch (error) {
            return false;
        }
    }
    return false;
}

// Function to show typing status AFTER command execution
async function showTypingAfterCommand(sock, chatId) {
    if (isAutotypingEnabled()) {
        try {
            await sock.sendPresenceUpdate('composing', chatId);
            
            const typingDuration = 1500 + Math.random() * 1000;
            await new Promise(resolve => setTimeout(resolve, typingDuration));
            
            await sock.sendPresenceUpdate('paused', chatId);
            
            return true;
        } catch (error) {
            return false;
        }
    }
    return false;
}

// Function to show typing before command execution (for slow commands)
async function showTypingBeforeCommand(sock, chatId) {
    if (isAutotypingEnabled()) {
        try {
            await sock.sendPresenceUpdate('composing', chatId);
            
            const typingDuration = 2000 + Math.random() * 1000;
            await new Promise(resolve => setTimeout(resolve, typingDuration));
            
            return true;
        } catch (error) {
            return false;
        }
    }
    return false;
}

// Function to stop typing (call this after command completes)
async function stopTyping(sock, chatId) {
    try {
        await sock.sendPresenceUpdate('paused', chatId);
        return true;
    } catch (error) {
        return false;
    }
}

// Enhanced typing function with better simulation
async function simulateTyping(sock, chatId, duration = 3000) {
    if (isAutotypingEnabled()) {
        try {
            await sock.sendPresenceUpdate('composing', chatId);
            await new Promise(resolve => setTimeout(resolve, duration));
            await sock.sendPresenceUpdate('paused', chatId);
            return true;
        } catch (error) {
            return false;
        }
    }
    return false;
}

module.exports = {
    autotypingCommand,
    isAutotypingEnabled,
    handleAutotypingForMessage,
    showTypingAfterCommand,
    showTypingBeforeCommand,
    stopTyping,
    simulateTyping
};
