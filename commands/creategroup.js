const fs = require('fs');
const path = require('path');
const { resolveToPhoneJid } = require('../lib/index');

function getOwnerNumber() {
    try {
        const ownerPath = path.join(__dirname, '..', 'data', 'owner.json');
        if (fs.existsSync(ownerPath)) {
            const data = JSON.parse(fs.readFileSync(ownerPath, 'utf8'));
            if (data.ownerNumber) {
                return data.ownerNumber.replace('@s.whatsapp.net', '');
            }
        }
    } catch (e) {}
    return '254101150748';
}

function getSudoList() {
    try {
        const sudoPath = path.join(__dirname, '..', 'data', 'sudo.json');
        if (fs.existsSync(sudoPath)) {
            const data = JSON.parse(fs.readFileSync(sudoPath, 'utf8'));
            return Array.isArray(data) ? data : [];
        }
    } catch (e) {}
    return [];
}

function toPhoneJid(jid) {
    if (!jid) return jid;
    const resolved = resolveToPhoneJid(jid);
    if (resolved && !resolved.endsWith('@lid')) {
        return resolved;
    }
    const num = jid.split('@')[0].split(':')[0];
    return `${num}@s.whatsapp.net`;
}

async function createGroupCommand(sock, chatId, senderId, message, rawText) {
    try {
        const ownerNum = getOwnerNumber();
        const senderNum = senderId.split('@')[0].split(':')[0];
        const sudoList = getSudoList();
        const isSudo = sudoList.includes(senderNum);
        const isFromMe = message.key.fromMe;
        const senderIsOwner = senderNum === ownerNum || isFromMe;

        if (!senderIsOwner && !isSudo) {
            await sock.sendMessage(chatId, { text: '❌ Only the owner or sudo users can create groups.' }, { quoted: message });
            return;
        }

        const args = (rawText || '').trim();
        if (!args) {
            await sock.sendMessage(chatId, {
                text: `📝 *CREATE GROUP USAGE*\n\n` +
                      `.creategroup <Group Name>\n` +
                      `.creategroup <Group Name> | <number1>,<number2>,...\n\n` +
                      `*Example:*\n` +
                      `.creategroup My New Group\n` +
                      `.creategroup My New Group | 254712345678,254798765432\n\n` +
                      `_You can also mention users instead of typing numbers._`
            }, { quoted: message });
            return;
        }

        const parts = args.split('|').map(p => p.trim());
        const groupName = parts[0];

        if (!groupName) {
            await sock.sendMessage(chatId, { text: '❌ Please provide a group name.' }, { quoted: message });
            return;
        }

        let participants = [];

        if (parts[1]) {
            const numbers = parts[1].split(',').map(n => n.trim().replace(/[^0-9]/g, '')).filter(n => n.length >= 7);
            participants = numbers.map(n => `${n}@s.whatsapp.net`);
        }

        const mentioned = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (mentioned.length > 0) {
            for (const jid of mentioned) {
                const phoneJid = toPhoneJid(jid);
                if (!participants.includes(phoneJid)) {
                    participants.push(phoneJid);
                }
            }
        }

        let botPhoneJid = null;
        if (sock.user && sock.user.id) {
            const botNum = sock.user.id.split('@')[0].split(':')[0];
            botPhoneJid = `${botNum}@s.whatsapp.net`;
        }

        const senderPhoneJid = toPhoneJid(senderId);
        if (senderPhoneJid && !participants.includes(senderPhoneJid)) {
            participants.push(senderPhoneJid);
        }

        const uniqueParticipants = participants
            .filter(p => p && !p.endsWith('@lid') && p !== botPhoneJid)
            .filter((p, i, arr) => arr.indexOf(p) === i);

        await sock.sendMessage(chatId, {
            text: `⏳ Creating group *${groupName}*...`
        }, { quoted: message });

        const group = await sock.groupCreate(groupName, uniqueParticipants);

        let inviteLink = '';
        try {
            const inviteCode = await sock.groupInviteCode(group.id);
            inviteLink = `\n🔗 *Invite Link:* https://chat.whatsapp.com/${inviteCode}`;
        } catch (e) {}

        await sock.sendMessage(chatId, {
            text: `✅ *Group Created Successfully!*\n\n` +
                  `📌 *Name:* ${groupName}\n` +
                  `🆔 *ID:* ${group.id}\n` +
                  `👥 *Members:* ${uniqueParticipants.length + 1}${inviteLink}`
        }, { quoted: message });

        await sock.sendMessage(group.id, {
            text: `👋 Welcome to *${groupName}*!\n\nThis group was created by TRUTH MD Bot.`
        });

    } catch (err) {
        console.error(`[CREATEGROUP] Error: ${err.message}`, err.stack);
        try {
            await sock.sendMessage(chatId, {
                text: `❌ Failed to create group.\n\n*Error:* ${err?.message || 'Unknown error'}`
            }, { quoted: message });
        } catch (sendErr) {
            console.error(`[CREATEGROUP] Failed to send error message: ${sendErr.message}`);
        }
    }
}

module.exports = { createGroupCommand };
