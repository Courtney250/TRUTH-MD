const isAdmin = require('../lib/isAdmin');

const pendingKillAll = new Map();

async function killAllCommand(sock, chatId, message, senderId) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const args = text.trim().split(/\s+/).slice(1);
        const subCommand = (args[0] || '').toLowerCase();

        if (subCommand === 'cancel') {
            if (pendingKillAll.has(chatId)) {
                clearTimeout(pendingKillAll.get(chatId).timer);
                pendingKillAll.delete(chatId);
                await sock.sendMessage(chatId, { text: '✅ *Kill All Cancelled*\n\nThe operation has been stopped. No members were removed.' }, { quoted: message });
            } else {
                await sock.sendMessage(chatId, { text: '⚠️ No pending killall operation to cancel.' }, { quoted: message });
            }
            return;
        }

        const isGroup = chatId.endsWith('@g.us');
        if (!isGroup) {
            await sock.sendMessage(chatId, { text: '❌ This command can only be used in groups.' }, { quoted: message });
            return;
        }

        const adminStatus = await isAdmin(sock, chatId, senderId);
        if (!adminStatus.isBotAdmin) {
            await sock.sendMessage(chatId, { text: '❌ I need to be an admin to remove members.' }, { quoted: message });
            return;
        }

        if (!adminStatus.isSenderAdmin && !message.key.fromMe) {
            await sock.sendMessage(chatId, { text: '❌ Only group admins can use this command.' }, { quoted: message });
            return;
        }

        if (pendingKillAll.has(chatId)) {
            await sock.sendMessage(chatId, { text: '⚠️ A killall is already pending for this group.\nType `.killall cancel` to stop it, or wait for it to proceed.' }, { quoted: message });
            return;
        }

        const groupMetadata = await sock.groupMetadata(chatId);
        const participants = groupMetadata.participants || [];
        const botNumber = (sock.user?.id?.replace(/:\d+/, '') || '').replace(/@.*/, '');
        const creatorId = groupMetadata.participants.find(p => p.admin === 'superadmin')?.id || '';
        const creatorNumber = creatorId.replace(/@.*/, '');
        const toRemove = participants.filter(p => {
            const num = p.id.replace(/@.*/, '');
            return num !== botNumber && num !== creatorNumber;
        });

        if (toRemove.length === 0) {
            await sock.sendMessage(chatId, { text: '⚠️ No members to remove.' }, { quoted: message });
            return;
        }

        if (subCommand === 'confirm') {
            await executeKillAll(sock, chatId, message, toRemove);
            return;
        }

        await sock.sendMessage(chatId, {
            text: `⚠️ *KILL ALL WARNING*\n\nThis will remove *${toRemove.length}* member(s) (including admins) from this group.\nOnly the group creator will remain.\n\n⏳ Auto-executing in *15 seconds*...\n\n✅ Type \`.killall confirm\` to start immediately\n❌ Type \`.killall cancel\` to stop`
        }, { quoted: message });

        const timer = setTimeout(async () => {
            if (pendingKillAll.has(chatId)) {
                pendingKillAll.delete(chatId);
                await executeKillAll(sock, chatId, message, toRemove);
            }
        }, 15000);

        pendingKillAll.set(chatId, { timer, senderId });

    } catch (err) {
        console.error('killAllCommand error:', err);
        pendingKillAll.delete(chatId);
        await sock.sendMessage(chatId, { text: `❌ Failed to remove members: ${err.message}` }, { quoted: message });
    }
}

async function executeKillAll(sock, chatId, message, toRemove) {
    try {
        pendingKillAll.delete(chatId);

        await sock.sendMessage(chatId, {
            text: `⏳ Removing ${toRemove.length} member(s)... This may take a moment.`
        });

        const batchSize = 5;
        let removed = 0;
        for (let i = 0; i < toRemove.length; i += batchSize) {
            const batch = toRemove.slice(i, i + batchSize).map(p => p.id);
            try {
                await sock.groupParticipantsUpdate(chatId, batch, 'remove');
                removed += batch.length;
            } catch (e) {
                console.error('killall batch error:', e.message);
            }
            if (i + batchSize < toRemove.length) {
                await new Promise(r => setTimeout(r, 1000));
            }
        }

        await sock.sendMessage(chatId, {
            text: `✅ *Kill All Complete*\n\nRemoved ${removed}/${toRemove.length} member(s). Only the group creator remains.`
        });

    } catch (err) {
        console.error('executeKillAll error:', err);
        await sock.sendMessage(chatId, { text: `❌ Error during removal: ${err.message}` });
    }
}

module.exports = killAllCommand;
