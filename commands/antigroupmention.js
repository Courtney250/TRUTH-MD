const fs = require('fs');
const path = require('path');
const isAdmin = require('../lib/isAdmin');

const DATA_FILE = path.join(__dirname, '..', 'data', 'antigroupmention.json');

function loadSettings() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        }
    } catch (e) {}
    return {};
}

function saveSettings(data) {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function getAntiGroupMentionStatus(chatId) {
    const data = loadSettings();
    return data[chatId] || { enabled: false, action: 'delete' };
}

async function handleAntiGroupMentionCommand(sock, chatId, message, senderId) {
    try {
        const isGroup = chatId.endsWith('@g.us');
        if (!isGroup) {
            await sock.sendMessage(chatId, { text: '❌ This command can only be used in groups.' }, { quoted: message });
            return;
        }

        const adminStatus = await isAdmin(sock, chatId, senderId);
        if (!adminStatus.isSenderAdmin && !message.key.fromMe) {
            await sock.sendMessage(chatId, { text: '❌ Only group admins can use this command.' }, { quoted: message });
            return;
        }

        const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const args = text.trim().split(/\s+/).slice(1);
        const action = (args[0] || '').toLowerCase();

        const data = loadSettings();
        const current = data[chatId] || { enabled: false, action: 'delete' };

        if (!action) {
            const status = current.enabled ? 'ON' : 'OFF';
            await sock.sendMessage(chatId, {
                text: `📢 *Anti-Group-Mention Settings*\n\n• Status: *${status}*\n• Action: *${current.action}*\n\n*Usage:*\n.antigroupmention on\n.antigroupmention off\n.antigroupmention set delete | kick | warn`
            }, { quoted: message });
            return;
        }

        switch (action) {
            case 'on':
                data[chatId] = { enabled: true, action: current.action || 'delete' };
                saveSettings(data);
                await sock.sendMessage(chatId, { text: '✅ *Anti-Group-Mention has been turned ON*\n\nGroup mentions (@everyone, @tagall) will be handled.' }, { quoted: message });
                break;

            case 'off':
                data[chatId] = { enabled: false, action: current.action || 'delete' };
                saveSettings(data);
                await sock.sendMessage(chatId, { text: '✅ *Anti-Group-Mention has been turned OFF*' }, { quoted: message });
                break;

            case 'set':
                const setAction = (args[1] || '').toLowerCase();
                if (!['delete', 'kick', 'warn'].includes(setAction)) {
                    await sock.sendMessage(chatId, { text: '❌ Invalid action. Choose: delete, kick, or warn' }, { quoted: message });
                    return;
                }
                data[chatId] = { enabled: current.enabled, action: setAction };
                saveSettings(data);
                await sock.sendMessage(chatId, { text: `✅ *Anti-Group-Mention action set to ${setAction}*` }, { quoted: message });
                break;

            default:
                await sock.sendMessage(chatId, { text: '❌ Unknown option. Use: on, off, or set delete|kick|warn' }, { quoted: message });
        }
    } catch (err) {
        console.error('antiGroupMentionCommand error:', err.message);
        await sock.sendMessage(chatId, { text: `❌ Error: ${err.message}` }, { quoted: message });
    }
}

async function handleGroupMentionDetection(sock, chatId, message, senderId) {
    try {
        if (!chatId.endsWith('@g.us')) return;

        const settings = getAntiGroupMentionStatus(chatId);
        if (!settings.enabled) return;

        const text = message.message?.conversation || 
                     message.message?.extendedTextMessage?.text || 
                     message.message?.imageMessage?.caption || 
                     message.message?.videoMessage?.caption || '';

        // Common group mention patterns
        const groupMentions = ['@everyone', '@tagall', '@all'];
        const hasGroupMention = groupMentions.some(m => text.toLowerCase().includes(m));

        if (!hasGroupMention) return;

        const adminStatus = await isAdmin(sock, chatId, senderId);
        const groupMetadata = await sock.groupMetadata(chatId);
        const creator = groupMetadata.owner || (groupMetadata.participants.find(p => p.admin === 'superadmin')?.id);

        // Exempt bot and creator
        if (senderId === creator || message.key.fromMe) return;
        if (!adminStatus.isBotAdmin) return;

        const action = settings.action || 'delete';

        await sock.sendMessage(chatId, {
            delete: { remoteJid: chatId, fromMe: false, id: message.key.id, participant: message.key.participant || senderId }
        });

        const mention = senderId.split('@')[0];

        if (action === 'warn') {
            await sock.sendMessage(chatId, {
                text: `⚠️ @${mention}, group mentions (@everyone, @tagall) are not allowed!`,
                mentions: [senderId]
            });
        } else if (action === 'kick') {
            await sock.sendMessage(chatId, {
                text: `🚫 @${mention} has been removed for using a group mention.`,
                mentions: [senderId]
            });
            try {
                await sock.groupParticipantsUpdate(chatId, [senderId], 'remove');
            } catch (e) {
                console.error('Failed to kick for antigroupmention:', e.message);
            }
        } else {
            await sock.sendMessage(chatId, {
                text: `🚫 @${mention}, group mentions are not allowed here!`,
                mentions: [senderId]
            });
        }
    } catch (err) {
        console.error('groupMentionDetection error:', err.message);
    }
}

module.exports = { handleAntiGroupMentionCommand, handleGroupMentionDetection, getAntiGroupMentionStatus };
