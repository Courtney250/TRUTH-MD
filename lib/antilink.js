const { getAntilink } = require('./index');

const bots = new Map();

async function Antilink(message, sock) {
    try {
        const chatId = message.key.remoteJid;
        if (!chatId?.endsWith('@g.us')) return;

        const senderId = message.key.participant || message.key.remoteJid;
        const text = message.message?.conversation
            || message.message?.extendedTextMessage?.text
            || message.message?.imageMessage?.caption
            || message.message?.videoMessage?.caption
            || '';

        if (!text) return;

        const config = await getAntilink(chatId, 'on');
        if (!config || !config.enabled) return;

        const linkPatterns = [
            /https?:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]+/i,
            /https?:\/\/wa\.me\/[A-Za-z0-9]+/i,
            /https?:\/\/t\.me\/[A-Za-z0-9_]+/i
        ];

        let hasLink = false;
        for (const pattern of linkPatterns) {
            if (pattern.test(text)) {
                hasLink = true;
                break;
            }
        }

        if (!hasLink) return;

        const groupMetadata = await sock.groupMetadata(chatId).catch(() => null);
        if (!groupMetadata) return;

        const participant = groupMetadata.participants.find(p =>
            p.id === senderId || p.id?.replace(/:.*@/, '@') === senderId?.replace(/:.*@/, '@')
        );
        if (participant?.admin) return;

        const action = config.action || 'delete';

        if (action === 'delete' || action === 'warn') {
            try {
                await sock.sendMessage(chatId, {
                    delete: {
                        remoteJid: chatId,
                        fromMe: false,
                        id: message.key.id,
                        participant: senderId
                    }
                });
            } catch (e) {
                console.error('Failed to delete link message:', e.message);
            }

            await sock.sendMessage(chatId, {
                text: `⚠️ @${senderId.split('@')[0]}, links are not allowed in this group!`,
                mentions: [senderId]
            });
        }

        if (action === 'kick') {
            try {
                await sock.sendMessage(chatId, {
                    delete: {
                        remoteJid: chatId,
                        fromMe: false,
                        id: message.key.id,
                        participant: senderId
                    }
                });
            } catch (e) {}

            try {
                await sock.groupParticipantsUpdate(chatId, [senderId], 'remove');
                await sock.sendMessage(chatId, {
                    text: `🚫 @${senderId.split('@')[0]} has been removed for sending links.`,
                    mentions: [senderId]
                });
            } catch (e) {
                console.error('Failed to kick user:', e.message);
            }
        }
    } catch (e) {
        console.error('Antilink error:', e.message);
    }
}

module.exports = { Antilink, bots };
