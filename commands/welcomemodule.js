const fs = require('fs');
const path = require('path');

// Paths for data storage
const dataDir = path.join(__dirname, '../data');
const welcomePath = path.join(dataDir, 'welcome.json');
const goodbyePath = path.join(dataDir, 'goodbye.json');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Default messages
const defaultMessages = {
    welcome: '✨ Welcome {user} to {group}! You are member #{count} 🎉',
    goodbye: '😢 Goodbye {user}! We\'re now {count} members in {group}.'
};

// Load settings from file
function loadSettings(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }
    } catch (error) {
        console.error(`Error loading settings from ${filePath}:`, error);
    }
    return {};
}

// Save settings to file
function saveSettings(filePath, settings) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(settings, null, 2));
        return true;
    } catch (error) {
        console.error(`Error saving settings to ${filePath}:`, error);
        return false;
    }
}

// Get group settings
function getGroupSettings(type, groupId) {
    const filePath = type === 'welcome' ? welcomePath : goodbyePath;
    const settings = loadSettings(filePath);
    return settings[groupId] || { 
        enabled: false, 
        message: null,
        type: type
    };
}

// Update group settings
function updateGroupSettings(type, groupId, newSettings) {
    const filePath = type === 'welcome' ? welcomePath : goodbyePath;
    const settings = loadSettings(filePath);
    settings[groupId] = newSettings;
    return saveSettings(filePath, settings);
}

// Format message with placeholders
function formatMessage(message, user, groupName, memberCount, type = 'welcome') {
    if (!message) {
        message = type === 'welcome' ? defaultMessages.welcome : defaultMessages.goodbye;
    }
    
    return message
        .replace(/{user}/g, `@${user.split('@')[0]}`)
        .replace(/{group}/g, groupName)
        .replace(/{count}/g, memberCount)
        .replace(/{mention}/g, `@${user.split('@')[0]}`)
        .replace(/{username}/g, user.split('@')[0])
        .replace(/{total}/g, memberCount);
}

// =================== WELCOME COMMANDS ===================

async function welcomeCommand(sock, chatId, message) {
    try {
        const isGroup = chatId.endsWith('@g.us');
        if (!isGroup) {
            await sock.sendMessage(chatId, { 
                text: '❌ This command can only be used in groups!', 
                ...channelInfo 
            }, { quoted: message });
            return;
        }

        const sender = message.key.participant || message.key.remoteJid;
        const { isSenderAdmin } = await isAdmin(sock, chatId, sender);
        
        if (!isSenderAdmin && !message.key.fromMe) {
            await sock.sendMessage(chatId, { 
                text: '❌ Only group admins can use this command!', 
                ...channelInfo 
            }, { quoted: message });
            return;
        }

        const groupSettings = getGroupSettings('welcome', chatId);
        groupSettings.enabled = !groupSettings.enabled;
        
        updateGroupSettings('welcome', chatId, groupSettings);
        
        await sock.sendMessage(chatId, { 
            text: `✅ Welcome messages have been ${groupSettings.enabled ? 'ENABLED ✅' : 'DISABLED ❌'} for this group.`, 
            ...channelInfo 
        }, { quoted: message });
        
    } catch (error) {
        console.error('Error in welcome command:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ Failed to toggle welcome messages.', 
            ...channelInfo 
        }, { quoted: message });
    }
}

async function setwelcomeCommand(sock, chatId, senderId, message, userMessage) {
    try {
        const isGroup = chatId.endsWith('@g.us');
        if (!isGroup) {
            await sock.sendMessage(chatId, { 
                text: '❌ This command can only be used in groups!', 
                ...channelInfo 
            }, { quoted: message });
            return;
        }

        const { isSenderAdmin } = await isAdmin(sock, chatId, senderId);
        
        if (!isSenderAdmin && !message.key.fromMe) {
            await sock.sendMessage(chatId, { 
                text: '❌ Only group admins can set welcome messages!', 
                ...channelInfo 
            }, { quoted: message });
            return;
        }

        const welcomeText = userMessage.replace(/^\.setwelcome\s+/i, '').trim();
        
        if (!welcomeText) {
            await sock.sendMessage(chatId, { 
                text: `❌ Please provide a welcome message!\n\n📝 Example: .setwelcome Welcome {user} to {group}! 🎉\n\n📌 Placeholders:\n• {user} - mentions the new member\n• {group} - group name\n• {count} - member count\n• {mention} - same as {user}\n• {username} - user's number\n• {total} - total members`, 
                ...channelInfo 
            }, { quoted: message });
            return;
        }

        if (welcomeText.length > 500) {
            await sock.sendMessage(chatId, { 
                text: '❌ Welcome message is too long! Maximum 500 characters.', 
                ...channelInfo 
            }, { quoted: message });
            return;
        }

        const groupSettings = getGroupSettings('welcome', chatId);
        groupSettings.message = welcomeText;
        groupSettings.enabled = true;
        
        updateGroupSettings('welcome', chatId, groupSettings);
        
        // Get group info for preview
        const groupMetadata = await sock.groupMetadata(chatId);
        const memberCount = groupMetadata.participants.length;
        const groupName = groupMetadata.subject || 'Group';
        
        const preview = formatMessage(welcomeText, senderId, groupName, memberCount, 'welcome');
        
        await sock.sendMessage(chatId, { 
            text: `✅ Custom welcome message set successfully!\n\n📝 Preview:\n${preview}\n\n📌 Placeholders:\n• {user} - mentions new member\n• {group} - group name\n• {count} - member count\n• {mention} - same as {user}\n• {username} - user's number\n• {total} - total members`, 
            ...channelInfo 
        }, { quoted: message });
        
    } catch (error) {
        console.error('Error in setwelcome command:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ Failed to set welcome message.', 
            ...channelInfo 
        }, { quoted: message });
    }
}

// =================== GOODBYE COMMANDS ===================

async function goodbyeCommand(sock, chatId, message) {
    try {
        const isGroup = chatId.endsWith('@g.us');
        if (!isGroup) {
            await sock.sendMessage(chatId, { 
                text: '❌ This command can only be used in groups!', 
                ...channelInfo 
            }, { quoted: message });
            return;
        }

        const sender = message.key.participant || message.key.remoteJid;
        const { isSenderAdmin } = await isAdmin(sock, chatId, sender);
        
        if (!isSenderAdmin && !message.key.fromMe) {
            await sock.sendMessage(chatId, { 
                text: '❌ Only group admins can use this command!', 
                ...channelInfo 
            }, { quoted: message });
            return;
        }

        const groupSettings = getGroupSettings('goodbye', chatId);
        groupSettings.enabled = !groupSettings.enabled;
        
        updateGroupSettings('goodbye', chatId, groupSettings);
        
        await sock.sendMessage(chatId, { 
            text: `✅ Goodbye messages have been ${groupSettings.enabled ? 'ENABLED ✅' : 'DISABLED ❌'} for this group.`, 
            ...channelInfo 
        }, { quoted: message });
        
    } catch (error) {
        console.error('Error in goodbye command:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ Failed to toggle goodbye messages.', 
            ...channelInfo 
        }, { quoted: message });
    }
}

async function setgoodbyeCommand(sock, chatId, senderId, message, userMessage) {
    try {
        const isGroup = chatId.endsWith('@g.us');
        if (!isGroup) {
            await sock.sendMessage(chatId, { 
                text: '❌ This command can only be used in groups!', 
                ...channelInfo 
            }, { quoted: message });
            return;
        }

        const { isSenderAdmin } = await isAdmin(sock, chatId, senderId);
        
        if (!isSenderAdmin && !message.key.fromMe) {
            await sock.sendMessage(chatId, { 
                text: '❌ Only group admins can set goodbye messages!', 
                ...channelInfo 
            }, { quoted: message });
            return;
        }

        const goodbyeText = userMessage.replace(/^\.setgoodbye\s+/i, '').trim();
        
        if (!goodbyeText) {
            await sock.sendMessage(chatId, { 
                text: `❌ Please provide a goodbye message!\n\n📝 Example: .setgoodbye Goodbye {user}! We'll miss you in {group} 😢\n\n📌 Placeholders:\n• {user} - mentions the leaving member\n• {group} - group name\n• {count} - member count\n• {mention} - same as {user}\n• {username} - user's number\n• {total} - total members`, 
                ...channelInfo 
            }, { quoted: message });
            return;
        }

        if (goodbyeText.length > 500) {
            await sock.sendMessage(chatId, { 
                text: '❌ Goodbye message is too long! Maximum 500 characters.', 
                ...channelInfo 
            }, { quoted: message });
            return;
        }

        const groupSettings = getGroupSettings('goodbye', chatId);
        groupSettings.message = goodbyeText;
        groupSettings.enabled = true;
        
        updateGroupSettings('goodbye', chatId, groupSettings);
        
        // Get group info for preview
        const groupMetadata = await sock.groupMetadata(chatId);
        const memberCount = groupMetadata.participants.length;
        const groupName = groupMetadata.subject || 'Group';
        
        const preview = formatMessage(goodbyeText, senderId, groupName, memberCount, 'goodbye');
        
        await sock.sendMessage(chatId, { 
            text: `✅ Custom goodbye message set successfully!\n\n📝 Preview:\n${preview}\n\n📌 Placeholders:\n• {user} - mentions leaving member\n• {group} - group name\n• {count} - member count\n• {mention} - same as {user}\n• {username} - user's number\n• {total} - total members`, 
            ...channelInfo 
        }, { quoted: message });
        
    } catch (error) {
        console.error('Error in setgoodbye command:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ Failed to set goodbye message.', 
            ...channelInfo 
        }, { quoted: message });
    }
}

// =================== INFO/UTILITY COMMANDS ===================

async function showsettingsCommand(sock, chatId, message, userMessage) {
    try {
        const isGroup = chatId.endsWith('@g.us');
        if (!isGroup) {
            await sock.sendMessage(chatId, { 
                text: '❌ This command can only be used in groups!', 
                ...channelInfo 
            }, { quoted: message });
            return;
        }

        const type = userMessage.includes('welcome') ? 'welcome' : 'goodbye';
        const groupSettings = getGroupSettings(type, chatId);
        const groupMetadata = await sock.groupMetadata(chatId);
        const groupName = groupMetadata.subject || 'Group';
        const memberCount = groupMetadata.participants.length;
        
        let response = `📋 ${type.toUpperCase()} SETTINGS for "${groupName}"\n`;
        response += `━━━━━━━━━━━━━━━━━━━━\n\n`;
        response += `🔘 Status: ${groupSettings.enabled ? '✅ ENABLED' : '❌ DISABLED'}\n\n`;
        
        if (groupSettings.message) {
            const preview = formatMessage(groupSettings.message, message.key.remoteJid, groupName, memberCount, type);
            response += `📝 Custom Message:\n"${groupSettings.message}"\n\n`;
            response += `👁️ Preview:\n${preview}\n\n`;
        } else {
            const defaultMsg = type === 'welcome' ? defaultMessages.welcome : defaultMessages.goodbye;
            const preview = formatMessage(null, message.key.remoteJid, groupName, memberCount, type);
            response += `📝 Message: Using default\n"${defaultMsg}"\n\n`;
            response += `👁️ Preview:\n${preview}\n\n`;
        }
        
        response += `📌 Available Placeholders:\n`;
        response += `• {user} - Mentions the member\n`;
        response += `• {group} - Group name (${groupName})\n`;
        response += `• {count} - Member count (${memberCount})\n`;
        response += `• {mention} - Same as {user}\n`;
        response += `• {username} - User's number\n`;
        response += `• {total} - Same as {count}\n\n`;
        
        response += `🎮 Commands:\n`;
        if (type === 'welcome') {
            response += `• .welcome - Toggle welcome messages\n`;
            response += `• .setwelcome <message> - Set custom message\n`;
            response += `• .resetwelcome - Reset to default\n`;
        } else {
            response += `• .goodbye - Toggle goodbye messages\n`;
            response += `• .setgoodbye <message> - Set custom message\n`;
            response += `• .resetgoodbye - Reset to default\n`;
        }
        
        await sock.sendMessage(chatId, { 
            text: response, 
            ...channelInfo 
        }, { quoted: message });
        
    } catch (error) {
        console.error('Error in showsettings command:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ Failed to get settings.', 
            ...channelInfo 
        }, { quoted: message });
    }
}

async function resetCommand(sock, chatId, senderId, message, userMessage) {
    try {
        const isGroup = chatId.endsWith('@g.us');
        if (!isGroup) {
            await sock.sendMessage(chatId, { 
                text: '❌ This command can only be used in groups!', 
                ...channelInfo 
            }, { quoted: message });
            return;
        }

        const { isSenderAdmin } = await isAdmin(sock, chatId, senderId);
        
        if (!isSenderAdmin && !message.key.fromMe) {
            await sock.sendMessage(chatId, { 
                text: '❌ Only group admins can reset messages!', 
                ...channelInfo 
            }, { quoted: message });
            return;
        }

        const type = userMessage.includes('welcome') ? 'welcome' : 'goodbye';
        const groupSettings = getGroupSettings(type, chatId);
        
        if (!groupSettings.message) {
            await sock.sendMessage(chatId, { 
                text: `⚠️ No custom ${type} message to reset. Already using default.`, 
                ...channelInfo 
            }, { quoted: message });
            return;
        }
        
        groupSettings.message = null;
        updateGroupSettings(type, chatId, groupSettings);
        
        await sock.sendMessage(chatId, { 
            text: `✅ ${type.charAt(0).toUpperCase() + type.slice(1)} message has been reset to default.`, 
            ...channelInfo 
        }, { quoted: message });
        
    } catch (error) {
        console.error('Error in reset command:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ Failed to reset message.', 
            ...channelInfo 
        }, { quoted: message });
    }
}

// =================== EVENT HANDLERS ===================

async function handleJoinEvent(sock, groupId, participants) {
    try {
        const groupSettings = getGroupSettings('welcome', groupId);
        
        if (!groupSettings.enabled) return;
        
        const groupMetadata = await sock.groupMetadata(groupId);
        const memberCount = groupMetadata.participants.length;
        const groupName = groupMetadata.subject || 'the group';
        
        for (const participant of participants) {
            const welcomeMessage = formatMessage(
                groupSettings.message, 
                participant, 
                groupName, 
                memberCount, 
                'welcome'
            );
            
            await sock.sendMessage(groupId, {
                text: welcomeMessage,
                mentions: [participant]
            });
            
            // Small delay between messages
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    } catch (error) {
        console.error('Error in handleJoinEvent:', error);
    }
}

async function handleLeaveEvent(sock, groupId, participants) {
    try {
        const groupSettings = getGroupSettings('goodbye', groupId);
        
        if (!groupSettings.enabled) return;
        
        const groupMetadata = await sock.groupMetadata(groupId);
        const memberCount = groupMetadata.participants.length;
        const groupName = groupMetadata.subject || 'the group';
        
        for (const participant of participants) {
            const goodbyeMessage = formatMessage(
                groupSettings.message, 
                participant, 
                groupName, 
                memberCount, 
                'goodbye'
            );
            
            await sock.sendMessage(groupId, {
                text: goodbyeMessage,
                mentions: [participant]
            });
            
            // Small delay between messages
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    } catch (error) {
        console.error('Error in handleLeaveEvent:', error);
    }
}

// =================== EXPORTS ===================

module.exports = {
    // Command functions
    welcomeCommand,
    goodbyeCommand,
    setwelcomeCommand,
    setgoodbyeCommand,
    showsettingsCommand,
    resetCommand,
    
    // Event handlers
    handleJoinEvent,
    handleLeaveEvent,
    
    // Helper functions (optional exports)
    getGroupSettings,
    updateGroupSettings,
    formatMessage
};
