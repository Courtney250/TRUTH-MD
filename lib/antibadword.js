const fs = require('fs');
const path = require('path');

const BADWORD_FILE = path.join(__dirname, '..', 'data', 'antibadword.json');

function loadBadwords() {
    try {
        if (fs.existsSync(BADWORD_FILE)) {
            return JSON.parse(fs.readFileSync(BADWORD_FILE, 'utf-8'));
        }
    } catch (e) {
        console.error('Error loading badwords:', e.message);
    }
    return {};
}

function saveBadwords(data) {
    try {
        const dir = path.dirname(BADWORD_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(BADWORD_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Error saving badwords:', e.message);
    }
}

async function handleAntiBadwordCommand(sock, chatId, message, match) {
    try {
        const data = loadBadwords();

        if (!match) {
            const groupData = data[chatId] || { enabled: false, words: [], action: 'warn' };
            const wordList = groupData.words?.length > 0 ? groupData.words.join(', ') : 'None';
            const text = `*ANTI BAD WORD SETTINGS*\n\n` +
                `Status: ${groupData.enabled ? '🟢 ON' : '🔴 OFF'}\n` +
                `Action: ${groupData.action || 'warn'}\n` +
                `Words: ${wordList}\n\n` +
                `Commands:\n` +
                `• .antibadword on/off\n` +
                `• .antibadword add <word>\n` +
                `• .antibadword remove <word>\n` +
                `• .antibadword set delete/warn/kick\n` +
                `• .antibadword list\n` +
                `• .antibadword reset`;
            await sock.sendMessage(chatId, { text }, { quoted: message });
            return;
        }

        const args = match.trim().split(/\s+/);
        const action = args[0]?.toLowerCase();

        if (!data[chatId]) {
            data[chatId] = { enabled: false, words: [], action: 'warn' };
        }

        switch (action) {
            case 'on':
                data[chatId].enabled = true;
                saveBadwords(data);
                await sock.sendMessage(chatId, { text: '✅ Anti bad word has been *enabled*.' }, { quoted: message });
                break;

            case 'off':
                data[chatId].enabled = false;
                saveBadwords(data);
                await sock.sendMessage(chatId, { text: '✅ Anti bad word has been *disabled*.' }, { quoted: message });
                break;

            case 'add': {
                const word = args.slice(1).join(' ').toLowerCase().trim();
                if (!word) {
                    await sock.sendMessage(chatId, { text: '❌ Please specify a word to add.' }, { quoted: message });
                    return;
                }
                if (!data[chatId].words) data[chatId].words = [];
                if (!data[chatId].words.includes(word)) {
                    data[chatId].words.push(word);
                    saveBadwords(data);
                    await sock.sendMessage(chatId, { text: `✅ Added "${word}" to bad words list.` }, { quoted: message });
                } else {
                    await sock.sendMessage(chatId, { text: `"${word}" is already in the list.` }, { quoted: message });
                }
                break;
            }

            case 'remove':
            case 'del': {
                const word = args.slice(1).join(' ').toLowerCase().trim();
                if (!word) {
                    await sock.sendMessage(chatId, { text: '❌ Please specify a word to remove.' }, { quoted: message });
                    return;
                }
                if (!data[chatId].words) data[chatId].words = [];
                const idx = data[chatId].words.indexOf(word);
                if (idx !== -1) {
                    data[chatId].words.splice(idx, 1);
                    saveBadwords(data);
                    await sock.sendMessage(chatId, { text: `✅ Removed "${word}" from bad words list.` }, { quoted: message });
                } else {
                    await sock.sendMessage(chatId, { text: `"${word}" is not in the list.` }, { quoted: message });
                }
                break;
            }

            case 'set': {
                const setAction = args[1]?.toLowerCase();
                if (!['delete', 'warn', 'kick'].includes(setAction)) {
                    await sock.sendMessage(chatId, { text: '❌ Invalid action. Use: delete, warn, or kick' }, { quoted: message });
                    return;
                }
                data[chatId].action = setAction;
                saveBadwords(data);
                await sock.sendMessage(chatId, { text: `✅ Action set to *${setAction}*.` }, { quoted: message });
                break;
            }

            case 'list': {
                const words = data[chatId].words || [];
                if (words.length === 0) {
                    await sock.sendMessage(chatId, { text: 'No bad words set for this group.' }, { quoted: message });
                } else {
                    await sock.sendMessage(chatId, { text: `*Bad Words:*\n${words.map((w, i) => `${i + 1}. ${w}`).join('\n')}` }, { quoted: message });
                }
                break;
            }

            case 'reset':
                data[chatId] = { enabled: false, words: [], action: 'warn' };
                saveBadwords(data);
                await sock.sendMessage(chatId, { text: '✅ Anti bad word settings reset.' }, { quoted: message });
                break;

            default:
                await sock.sendMessage(chatId, { text: '❌ Unknown command. Use .antibadword for help.' }, { quoted: message });
        }
    } catch (e) {
        console.error('handleAntiBadwordCommand error:', e.message);
        await sock.sendMessage(chatId, { text: '❌ Error processing anti bad word command.' }, { quoted: message });
    }
}

async function handleBadwordDetection(sock, chatId, message, userMessage, senderId) {
    try {
        const data = loadBadwords();
        const groupData = data[chatId];
        if (!groupData || !groupData.enabled || !groupData.words || groupData.words.length === 0) return;

        const groupMetadata = await sock.groupMetadata(chatId).catch(() => null);
        if (!groupMetadata) return;

        const participant = groupMetadata.participants.find(p =>
            p.id === senderId || p.id?.replace(/:.*@/, '@') === senderId?.replace(/:.*@/, '@')
        );
        if (participant?.admin) return;

        const lowerMsg = userMessage.toLowerCase();
        const detected = groupData.words.find(w => lowerMsg.includes(w));
        if (!detected) return;

        const action = groupData.action || 'warn';

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
            } catch (e) {}

            if (action === 'warn') {
                await sock.sendMessage(chatId, {
                    text: `⚠️ @${senderId.split('@')[0]}, bad words are not allowed!`,
                    mentions: [senderId]
                });
            }
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
                    text: `🚫 @${senderId.split('@')[0]} has been removed for using bad words.`,
                    mentions: [senderId]
                });
            } catch (e) {
                console.error('Failed to kick user for bad word:', e.message);
            }
        }
    } catch (e) {
        console.error('handleBadwordDetection error:', e.message);
    }
}

module.exports = { handleAntiBadwordCommand, handleBadwordDetection };
