const fs = require('fs');
const path = require('path');
const isAdmin = require('../lib/isAdmin');

const DATA_FILE = path.join(__dirname, '..', 'data', 'antisticker.json');

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

function getAntiStickerStatus(chatId) {
    const data = loadSettings();
    return data[chatId] || { enabled: false, action: 'delete' };
}

async function handleAntiStickerCommand(sock, chatId, message, senderId) {
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
                text: `🚫 *Anti-Sticker Settings*\n\n• Status: *${status}*\n• Action: *${current.action}*\n\n*Usage:*\n.antisticker on\n.antisticker off\n.antisticker set delete | kick | warn`
            }, { quoted: message });
            return;
        }

        switch (action) {
            case 'on':
                data[chatId] = { enabled: true, action: current.action || 'delete' };
                saveSettings(data);
                await sock.sendMessage(chatId, { text: '✅ *Anti-Sticker has been turned ON*\n\nStickers from non-admins will be handled.' }, { quoted: message });
                break;

            case 'off':
                data[chatId] = { enabled: false, action: current.action || 'delete' };
                saveSettings(data);
                await sock.sendMessage(chatId, { text: '✅ *Anti-Sticker has been turned OFF*' }, { quoted: message });
                break;

            case 'set':
                const setAction = (args[1] || '').toLowerCase();
                if (!['delete', 'kick', 'warn'].includes(setAction)) {
                    await sock.sendMessage(chatId, { text: '❌ Invalid action. Choose: delete, kick, or warn' }, { quoted: message });
                    return;
                }
                data[chatId] = { enabled: current.enabled, action: setAction };
                saveSettings(data);
                await sock.sendMessage(chatId, { text: `✅ *Anti-Sticker action set to ${setAction}*` }, { quoted: message });
                break;

            default:
                await sock.sendMessage(chatId, { text: '❌ Unknown option. Use: on, off, or set delete|kick|warn' }, { quoted: message });
        }
    } catch (err) {
        console.error('antiStickerCommand error:', err.message);
        await sock.sendMessage(chatId, { text: `❌ Error: ${err.message}` }, { quoted: message });
    }
}

async function handleStickerDetection(sock, chatId, message, senderId) {
    try {
        if (!chatId.endsWith('@g.us')) return;

        const settings = getAntiStickerStatus(chatId);
        if (!settings.enabled) return;

        const msgType = Object.keys(message.message || {})[0];
        if (msgType !== 'stickerMessage') return;

        const adminStatus = await isAdmin(sock, chatId, senderId);
        if (message.key.fromMe) return;
        if (!adminStatus.isBotAdmin) return;
        const groupMeta = await sock.groupMetadata(chatId);
        const isCreator = groupMeta.participants.some(p => p.id === senderId && p.admin === 'superadmin');
        if (isCreator) return;

        const action = settings.action || 'delete';

        await sock.sendMessage(chatId, {
            delete: { remoteJid: chatId, fromMe: false, id: message.key.id, participant: message.key.participant || senderId }
        });

        const mention = senderId.split('@')[0];

        if (action === 'warn') {
            await sock.sendMessage(chatId, {
                text: `⚠️ @${mention}, stickers are not allowed in this group!`,
                mentions: [senderId]
            });
        } else if (action === 'kick') {
            await sock.sendMessage(chatId, {
                text: `🚫 @${mention} has been removed for sending a sticker.`,
                mentions: [senderId]
            });
            try {
                await sock.groupParticipantsUpdate(chatId, [senderId], 'remove');
            } catch (e) {
                console.error('Failed to kick for antisticker:', e.message);
            }
        } else {
            await sock.sendMessage(chatId, {
                text: `🚫 @${mention}, stickers are not allowed here!`,
                mentions: [senderId]
            });
        }
    } catch (err) {
        console.error('stickerDetection error:', err.message);
    }
}

module.exports = { handleAntiStickerCommand, handleStickerDetection, getAntiStickerStatus };
