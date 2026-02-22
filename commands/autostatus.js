const fs = require('fs');
const path = require('path');

const channelInfo = {
    contextInfo: {
        forwardingScore: 1,
        isForwarded: false,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '',
            newsletterName: '',
            serverMessageId: -1
        }
    }
};

// Path to store auto status configuration
const configPath = path.join(__dirname, '../data/autoStatus.json');

// Default emojis for random reactions
const defaultEmojis = ['❤️', '🔥', '⭐', '🎉', '👏', '💫', '🤩', '✨', '💖', '👍'];

// Initialize config file if it doesn't exist
if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify({ 
        enabled: false, 
        reactOn: false,
        customEmojis: defaultEmojis,
        lastReactionTime: {},
        reactionInterval: 1, // 60 minutes default
        randomChance: 100 // 80% chance to react to each status
    }));
}

// Function to get random emoji
function getRandomEmoji() {
    const config = JSON.parse(fs.readFileSync(configPath));
    const emojis = config.customEmojis || defaultEmojis;
    return emojis[Math.floor(Math.random() * emojis.length)];
}

// Function to check if enough time has passed for reaction
function canReactToStatus(userId) {
    try {
        const config = JSON.parse(fs.readFileSync(configPath));
        const lastReactionTime = config.lastReactionTime || {};
        const interval = config.reactionInterval || 1; // in minutes
        
        const lastTime = lastReactionTime[userId];
        if (!lastTime) return true;
        
        const timeDiff = Date.now() - lastTime;
        const minutesDiff = timeDiff / (1000 * 60);
        
        return minutesDiff >= interval;
    } catch (error) {
        console.error('Error checking reaction time:', error);
        return true;
    }
}

// Function to check if we should react randomly
function shouldReactRandomly() {
    try {
        const config = JSON.parse(fs.readFileSync(configPath));
        const chance = config.randomChance || 100; // Default 80% chance
        const random = Math.random() * 100;
        return random <= chance;
    } catch (error) {
        console.error('Error checking random chance:', error);
        return true;
    }
}

// Function to update last reaction time
function updateReactionTime(userId) {
    
    try {
        const config = JSON.parse(fs.readFileSync(configPath));
        config.lastReactionTime = config.lastReactionTime || {};
        config.lastReactionTime[userId] = Date.now();
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    } catch (error) {
        console.error('Error updating reaction time:', error);
    }
}

async function autoStatusCommand(sock, chatId, msg, args) {
    try {
        // Check if sender is owner or sudo
        const { isSudo } = require('../lib/index');
        const senderId = msg.key.participant || msg.key.remoteJid;
        const senderIsSudo = await isSudo(senderId);
        const isOwner = msg.key.fromMe || senderIsSudo;
        
        if (!isOwner) {
            await sock.sendMessage(chatId, { 
                text: '❌ This command can only be used by the owner!',
                ...channelInfo
            },{quoted: msg});
            return;
        }

        // Read current config
        let config = JSON.parse(fs.readFileSync(configPath));

        // If no arguments, show current status
        if (!args || args.length === 0) {
            const status = config.enabled ? 'enabled' : 'disabled';
            const reactStatus = config.reactOn ? 'enabled' : 'disabled';
            const interval = config.reactionInterval || 1;
            const chance = config.randomChance || 100;
            const emojis = config.customEmojis || defaultEmojis;
            
            await sock.sendMessage(chatId, { 
                text: `⚙️ *AUTO STATUS SETTING*\n\n📱 *Auto Status View:* ${status}\n💫 *Status Reactions:* ${reactStatus}\n⏰ *Reaction Interval:* ${interval} minutes\n🎲 *Random Chance:* ${chance}%\n🎭 *Custom Emojis:* ${emojis.join(' ')}\n\n*👨‍🔧COMMAND TOGGLE:*\n 🔸autostatus on - Enable auto status view\n 🔸autostatus off - Disable auto status view\n 🔸autostatus react on - Enable status reactions\n 🔸autostatus react off - Disable status reactions\n 🔸autostatus interval <minutes> - Set reaction interval\n 🔸autostatus chance <percentage> - Set random reaction chance\n 🔸autostatus emoji add <emoji> - Add custom emoji\n 🔸autostatus emoji remove <emoji> - Remove custom emoji\n 🔸autostatus emoji list - Show current emojis\n 🔸autostatus emoji reset - Reset to default emojis`,
                ...channelInfo
            },{ quoted: msg});
            return;
        }

        // Handle commands
        const command = args[0].toLowerCase();
        
        if (command === 'on') {
            config.enabled = true;
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            await sock.sendMessage(chatId, { 
                text: '✅ Auto status view has been enabled!\nBot will now automatically view all contact statuses.',
                ...channelInfo
            },{quoted: msg});
        } else if (command === 'off') {
            config.enabled = false;
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            await sock.sendMessage(chatId, { 
                text: '❌ Auto status view has been disabled!\nBot will no longer automatically view statuses.',
                ...channelInfo
            },{quoted:msg});
        } else if (command === 'react') {
            // Handle react subcommand
            if (!args[1]) {
                await sock.sendMessage(chatId, { 
                    text: '❌ Please specify on/off for reactions!\nUse: .autostatus react on/off',
                    ...channelInfo
                },{quoted:msg});
                return;
            }
            
            const reactCommand = args[1].toLowerCase();
            if (reactCommand === 'on') {
                config.reactOn = true;
                fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
                await sock.sendMessage(chatId, { 
                    text: `💫 Status reactions have been enabled!\nBot will now randomly react to status updates with ${config.randomChance || 100}% chance.`,
                    ...channelInfo
                },{quoted: msg});
            } else if (reactCommand === 'off') {
                config.reactOn = false;
                fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
                await sock.sendMessage(chatId, { 
                    text: '❌ Status reactions have been disabled!\nBot will no longer react to status updates.',
                    ...channelInfo
                },{quoted:msg});
            } else {
                await sock.sendMessage(chatId, { 
                    text: '❌ Invalid reaction command! Use: .autostatus react on/off',
                    ...channelInfo
                },{quoted:msg});
            }
        } else if (command === 'interval') {
            // Set reaction interval
            if (!args[1] || isNaN(args[1])) {
                await sock.sendMessage(chatId, { 
                    text: '❌ Please provide a valid number of minutes!\nUse: .autostatus interval 60 (for 1 hour)',
                    ...channelInfo
                },{quoted:msg});
                return;
            }
            
            const minutes = parseInt(args[1]);
            if (minutes < 1) {
                await sock.sendMessage(chatId, { 
                    text: '❌ Interval must be at least 1 minute!',
                    ...channelInfo
                },{quoted:msg});
                return;
            }
            
            config.reactionInterval = minutes;
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            await sock.sendMessage(chatId, { 
                text: `✅ Reaction interval set to ${minutes} minutes!\nBot will react to each user\'s status every ${minutes} minutes.`,
                ...channelInfo
            },{quoted:msg});
        } else if (command === 'chance') {
            // Set random chance percentage
            if (!args[1] || isNaN(args[1])) {
                await sock.sendMessage(chatId, { 
                    text: '❌ Please provide a valid percentage!\nUse: .autostatus chance 80 (for 80% chance)',
                    ...channelInfo
                },{quoted:msg});
                return;
            }
            
            const chance = parseInt(args[1]);
            if (chance < 1 || chance > 100) {
                await sock.sendMessage(chatId, { 
                    text: '❌ Chance must be between 1% and 100%!',
                    ...channelInfo
                },{quoted:msg});
                return;
            }
            
            config.randomChance = chance;
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            await sock.sendMessage(chatId, { 
                text: `✅ Random reaction chance set to ${chance}%!\nBot will now react to approximately ${chance}% of status updates.`,
                ...channelInfo
            },{quoted:msg});
        } else if (command === 'emoji') {
            // Handle emoji management
            const subCommand = args[1]?.toLowerCase();
            
            if (!subCommand) {
                await sock.sendMessage(chatId, { 
                    text: '❌ Please specify an emoji command!\nUse: .autostatus emoji add/remove/list/reset',
                    ...channelInfo
                },{quoted:msg});
                return;
            }
            
            if (subCommand === 'add') {
                const emoji = args[2];
                if (!emoji) {
                    await sock.sendMessage(chatId, { 
                        text: '❌ Please provide an emoji to add!\nUse: .autostatus emoji add 🎉',
                        ...channelInfo
                    },{quoted:msg});
                    return;
                }
                
                // Validate emoji
                if (emoji.length > 4 || !/\p{Emoji}/u.test(emoji)) {
                    await sock.sendMessage(chatId, { 
                        text: '❌ Please provide a valid emoji!',
                        ...channelInfo
                    },{quoted: msg});
                    return;
                }
                
                config.customEmojis = config.customEmojis || defaultEmojis;
                if (config.customEmojis.includes(emoji)) {
                    await sock.sendMessage(chatId, { 
                        text: `❌ Emoji ${emoji} is already in the list!`,
                        ...channelInfo
                    },{quoted: msg});
                    return;
                }
                
                config.customEmojis.push(emoji);
                fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
                await sock.sendMessage(chatId, { 
                    text: `✅ Emoji ${emoji} added successfully!\nCurrent emojis: ${config.customEmojis.join(' ')}`,
                    ...channelInfo
                },{quoted: msg});
                
            } else if (subCommand === 'remove') {
                const emoji = args[2];
                if (!emoji) {
                    await sock.sendMessage(chatId, { 
                        text: '❌ Please provide an emoji to remove!\nUse: .autostatus emoji remove 🎉',
                        ...channelInfo
                    },{quoted: msg});
                    return;
                }
                
                config.customEmojis = config.customEmojis || defaultEmojis;
                const index = config.customEmojis.indexOf(emoji);
                if (index === -1) {
                    await sock.sendMessage(chatId, { 
                        text: `❌ Emoji ${emoji} not found in the list!`,
                        ...channelInfo
                    },{quoted: msg});
                    return;
                }
                
                config.customEmojis.splice(index, 1);
                fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
                await sock.sendMessage(chatId, { 
                    text: `✅ Emoji ${emoji} removed successfully!\nCurrent emojis: ${config.customEmojis.join(' ')}`,
                    ...channelInfo
                },{quoted: msg});
                
            } else if (subCommand === 'list') {
                const emojis = config.customEmojis || defaultEmojis;
                await sock.sendMessage(chatId, { 
                    text: `📋 Current custom emojis:\n\n${emojis.join(' ')}\n\nTotal: ${emojis.length} emojis`,
                    ...channelInfo
                },{quoted: msg});
                
            } else if (subCommand === 'reset') {
                config.customEmojis = defaultEmojis;
                fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
                await sock.sendMessage(chatId, { 
                    text: `✅ Emojis reset to default!\nDefault emojis: ${defaultEmojis.join(' ')}`,
                    ...channelInfo
                },{quoted: msg});
                
            } else {
                await sock.sendMessage(chatId, { 
                    text: '❌ Invalid emoji command! Use: .autostatus emoji add/remove/list/reset',
                    ...channelInfo
                },{quoted: msg});
            }
        } else {
            await sock.sendMessage(chatId, { 
                text: '❌ Invalid command! Use .autostatus for available commands.',
                ...channelInfo
            },{quoted: msg});
        }

    } catch (error) {
        console.error('Error in autostatus command:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ Error occurred while managing auto status!\n' + error.message,
            ...channelInfo
        },{quoted: msg});
    }
}

// Function to check if auto status is enabled
function isAutoStatusEnabled() {
    try {
        const config = JSON.parse(fs.readFileSync(configPath));
        return config.enabled;
    } catch (error) {
        console.error('Error checking auto status config:', error);
        return false;
    }
}

// Function to check if status reactions are enabled
function isStatusReactionEnabled() {
    try {
        const config = JSON.parse(fs.readFileSync(configPath));
        return config.reactOn;
    } catch (error) {
        console.error('Error checking status reaction config:', error);
        return false;
    }
}

// Function to react to status using proper method
async function reactToStatus(sock, statusKey) {
    try {
        if (!isStatusReactionEnabled()) {
            return;
        }

        const userId = statusKey.participant || statusKey.remoteJid;
        
        // Check if enough time has passed since last reaction
        if (!canReactToStatus(userId)) {
            console.log(`⏰ Skipping reaction for ${userId} - interval not reached`);
            return;
        }

        // Check random chance for this reaction
        if (!shouldReactRandomly()) {
            console.log(`🎲 Skipping reaction for ${userId} - random chance missed`);
            return;
        }

        const randomEmoji = getRandomEmoji();

        // Use the proper relayMessage method for status reactions
        await sock.relayMessage(
            'status@broadcast',
            {
                reactionMessage: {
                    key: {
                        remoteJid: 'status@broadcast',
                        id: statusKey.id,
                        participant: statusKey.participant || statusKey.remoteJid,
                        fromMe: false
                    },
                    text: randomEmoji
                }
            },
            {
                messageId: statusKey.id,
                statusJidList: [statusKey.remoteJid, statusKey.participant || statusKey.remoteJid]
            }
        );
        
        // Update last reaction time for this user
        updateReactionTime(userId);
        
        console.log(`✅ Reacted to status from ${userId} with ${randomEmoji}`);
        
    } catch (error) {
        console.error('❌ Error reacting to status:', error.message);
    }
}

// Function to handle status updates
async function handleStatusUpdate(sock, status) {
    try {
        if (!isAutoStatusEnabled()) {
            return;
        }

        // Add delay to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Handle status from messages.upsert
        if (status.messages && status.messages.length > 0) {
            const msg = status.messages[0];
            if (msg.key && msg.key.remoteJid === 'status@broadcast') {
                try {
                    await sock.readMessages([msg.key]);
                    const sender = msg.key.participant || msg.key.remoteJid;
                    
                    // React to status if enabled (with random chance)
                    await reactToStatus(sock, msg.key);
                    
                } catch (err) {
                    if (err.message?.includes('rate-overlimit')) {
                        console.log('⚠️ Rate limit hit, waiting before retrying...');
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        await sock.readMessages([msg.key]);
                    } else {
                        throw err;
                    }
                }
                return;
            }
        }

        // Handle direct status updates
        if (status.key && status.key.remoteJid === 'status@broadcast') {
            try {
                await sock.readMessages([status.key]);
                const sender = status.key.participant || status.key.remoteJid;
                
                // React to status if enabled (with random chance)
                await reactToStatus(sock, status.key);
                
            } catch (err) {
                if (err.message?.includes('rate-overlimit')) {
                    console.log('⚠️ Rate limit hit, waiting before retrying...');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    await sock.readMessages([status.key]);
                } else {
                    throw err;
                }
            }
            return;
        }

        // Handle status in reactions
        if (status.reaction && status.reaction.key.remoteJid === 'status@broadcast') {
            try {
                await sock.readMessages([status.reaction.key]);
                const sender = status.reaction.key.participant || status.reaction.key.remoteJid;
                
                // React to status if enabled (with random chance)
                await reactToStatus(sock, status.reaction.key);
                
            } catch (err) {
                if (err.message?.includes('rate-overlimit')) {
                    console.log('⚠️ Rate limit hit, waiting before retrying...');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    await sock.readMessages([status.reaction.key]);
                } else {
                    throw err;
                }
            }
            return;
        }

    } catch (error) {
        console.error('❌ Error in auto status view:', error.message);
    }
}

module.exports = {
    autoStatusCommand,
    handleStatusUpdate
};
