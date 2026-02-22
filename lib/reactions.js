const fs = require('fs');
const path = require('path');
const { getConfig, setConfig } = require('./configdb');

const REACTIONS_FILE = path.join(__dirname, '..', 'data', 'reactions.json');

const defaultEmojis = ['👍', '❤️', '😂', '🔥', '👏', '✅', '⚡', '🎉', '💯', '🙌', '😍', '🤩', '💪', '🎯', '✨'];

function loadReactions() {
    try {
        if (fs.existsSync(REACTIONS_FILE)) {
            return JSON.parse(fs.readFileSync(REACTIONS_FILE, 'utf-8'));
        }
    } catch (e) {}
    return { enabled: false, emojis: defaultEmojis };
}

function saveReactions(data) {
    try {
        fs.writeFileSync(REACTIONS_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Error saving reactions:', e.message);
    }
}

async function addCommandReaction(sock, message) {
    try {
        const reactSetting = getConfig('AUTOREACT', 'false');
        if (reactSetting !== 'true') return;

        const data = loadReactions();
        const emojis = data.emojis || defaultEmojis;
        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

        await sock.sendMessage(message.key.remoteJid, {
            react: { text: randomEmoji, key: message.key }
        });
    } catch (e) {
        console.error('addCommandReaction error:', e.message);
    }
}

async function handleAreactCommand(sock, chatId, message, args) {
    try {
        const { isSudo } = require('./index');
        const senderId = message.key.participant || message.key.remoteJid;
        const senderIsSudo = await isSudo(senderId);
        const isOwner = message.key.fromMe || senderIsSudo;

        if (!isOwner) {
            await sock.sendMessage(chatId, { text: '❌ Owner only command!' }, { quoted: message });
            return;
        }

        const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const cmd = text.split(/\s+/).slice(1)[0]?.toLowerCase();

        if (!cmd || !['on', 'off'].includes(cmd)) {
            const current = getConfig('AUTOREACT', 'false');
            await sock.sendMessage(chatId, {
                text: `*AUTO REACT*\n\nStatus: ${current === 'true' ? '🟢 ON' : '🔴 OFF'}\n\nUsage:\n• .areact on\n• .areact off`
            }, { quoted: message });
            return;
        }

        if (cmd === 'on') {
            setConfig('AUTOREACT', 'true');
            await sock.sendMessage(chatId, { text: '✅ Auto react has been *enabled*.' }, { quoted: message });
        } else {
            setConfig('AUTOREACT', 'false');
            await sock.sendMessage(chatId, { text: '✅ Auto react has been *disabled*.' }, { quoted: message });
        }
    } catch (e) {
        console.error('handleAreactCommand error:', e.message);
        await sock.sendMessage(chatId, { text: '❌ Error processing reaction command.' }, { quoted: message });
    }
}

module.exports = { addCommandReaction, handleAreactCommand };
