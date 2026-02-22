const isAdmin = require('../lib/isAdmin');
const store = require('../lib/lightweight_store');

async function deleteCommand(sock, chatId, message, senderId) {
    try {
        const isGroup = chatId.endsWith('@g.us');
        let isSenderAdmin = true;
        let isBotAdmin = true;

        if (isGroup) {
            const adminStatus = await isAdmin(sock, chatId, senderId);
            isSenderAdmin = adminStatus.isSenderAdmin;
            isBotAdmin = adminStatus.isBotAdmin;

            if (!isBotAdmin) {
                await sock.sendMessage(chatId, { text: '🚫 I need to be an admin to delete messages in groups.' }, { quoted: message });
                return;
            }

            if (!isSenderAdmin && !message.key.fromMe) {
                await sock.sendMessage(chatId, { text: '🚫 Only group admins can use the .delete command.' }, { quoted: message });
                return;
            }
        } else {
            // Private chat: only allow if sender is the chat owner
            if (senderId !== chatId) {
                await sock.sendMessage(chatId, { text: '🚫 Only the chat owner can use the .delete command in private chats.' }, { quoted: message });
                return;
            }
        }

        const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const parts = text.trim().split(/\s+/);
        let countArg = 1;
        if (parts.length > 1) {
            const maybeNum = parseInt(parts[1], 10);
            if (!isNaN(maybeNum) && maybeNum > 0) countArg = Math.min(maybeNum, 50);
        }

        const ctxInfo = message.message?.extendedTextMessage?.contextInfo || {};
        const mentioned = Array.isArray(ctxInfo.mentionedJid) && ctxInfo.mentionedJid.length > 0 ? ctxInfo.mentionedJid[0] : null;
        const repliedParticipant = ctxInfo.participant || null;

        let targetUser = null;
        let repliedMsgId = null;
        if (repliedParticipant && ctxInfo.stanzaId) {
            targetUser = repliedParticipant;
            repliedMsgId = ctxInfo.stanzaId;
        } else if (mentioned) {
            targetUser = mentioned;
        } else {
            targetUser = isGroup ? null : chatId;
        }

        if (!targetUser) {
            await sock.sendMessage(chatId, { text: '⚠️ Please reply to a user\'s message or mention a user to delete their recent messages.' }, { quoted: message });
            return;
        }

        const chatMessages = Array.isArray(store.messages[chatId]) ? store.messages[chatId] : [];
        const toDelete = [];
        const seenIds = new Set();

        if (message.key?.id) {
            toDelete.push({
                key: {
                    id: message.key.id,
                    participant: senderId
                }
            });
            seenIds.add(message.key.id);
        }

        if (repliedMsgId) {
            const repliedInStore = chatMessages.find(m => m.key.id === repliedMsgId && (m.key.participant || m.key.remoteJid) === targetUser);
            if (repliedInStore && !seenIds.has(repliedInStore.key.id)) {
                toDelete.push(repliedInStore);
                seenIds.add(repliedInStore.key.id);
            } else {
                try {
                    await sock.sendMessage(chatId, {
                        delete: {
                            remoteJid: chatId,
                            fromMe: false,
                            id: repliedMsgId,
                            participant: repliedParticipant
                        }
                    });
                    countArg = Math.max(0, countArg - 1);
                } catch {}
            }
        }

        for (let i = chatMessages.length - 1; i >= 0 && toDelete.length < countArg + 1; i--) {
            const m = chatMessages[i];
            const participant = m.key.participant || m.key.remoteJid;
            if (participant === targetUser && !seenIds.has(m.key.id)) {
                if (!m.message?.protocolMessage) {
                    toDelete.push(m);
                    seenIds.add(m.key.id);
                }
            }
        }

        if (toDelete.length === 0) {
            await sock.sendMessage(chatId, { text: '⚠️ No recent messages found for the target user.' }, { quoted: message });
            return;
        }

        let deletedCount = 0;
        for (const m of toDelete) {
            try {
                const msgParticipant = m.key.participant || targetUser;
                await sock.sendMessage(chatId, {
                    delete: {
                        remoteJid: chatId,
                        fromMe: false,
                        id: m.key.id,
                        participant: msgParticipant
                    }
                });
                deletedCount++;
                await new Promise(r => setTimeout(r, 300));
            } catch (e) {
                // continue
            }
        }


    } catch (err) {
        console.error('deleteCommand error:', err);
        await sock.sendMessage(chatId, { text: `❌ Failed to delete messages: ${err.message}` }, { quoted: message });
    }
}

module.exports = deleteCommand;
