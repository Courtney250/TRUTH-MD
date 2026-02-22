const isAdmin = require('../lib/isAdmin');

async function linkCommand(sock, chatId, message, senderId) {
    try {
        const isGroup = chatId.endsWith('@g.us');
        if (!isGroup) {
            await sock.sendMessage(chatId, { text: '❌ This command can only be used in groups.' }, { quoted: message });
            return;
        }

        const adminStatus = await isAdmin(sock, chatId, senderId);
        if (!adminStatus.isBotAdmin) {
            await sock.sendMessage(chatId, { text: '❌ I need to be an admin to get the group link.' }, { quoted: message });
            return;
        }

        const code = await sock.groupInviteCode(chatId);
        const inviteLink = `https://chat.whatsapp.com/${code}`;
        
        await sock.sendMessage(chatId, { 
            text: `🔗 *Group Invite Link:*\n\n${inviteLink}`,
            contextInfo: {
                externalAdReply: {
                    title: 'Group Link',
                    body: 'Click to join',
                    mediaType: 1,
                    sourceUrl: inviteLink
                }
            }
        }, { quoted: message });

    } catch (err) {
        console.error('linkCommand error:', err.message);
        await sock.sendMessage(chatId, { text: '❌ Failed to retrieve group link. Make sure I am an admin.' }, { quoted: message });
    }
}

module.exports = linkCommand;
