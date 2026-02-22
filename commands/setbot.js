const { setConfig, getConfig } = require('../lib/configdb.js');

// Default bot name
const DEFAULT_BOT_NAME = 'TRUTH-MD';

/**
 * Get bot name EXACTLY as saved
 */
function getBotName() {
    try {
        const botName = getConfig('botName', DEFAULT_BOT_NAME);
        return botName || DEFAULT_BOT_NAME;
    } catch (error) {
        console.error('Error reading bot name from configdb:', error);
        return DEFAULT_BOT_NAME;
    }
}

/**
 * Store bot name EXACTLY as the user typed
 */
function setBotName(newBotName) {
    try {
        if (!newBotName || newBotName.length > 20) return false;

        setConfig('botName', newBotName);
        return true;

    } catch (error) {
        console.error('Error saving bot name to configdb:', error);
        return false;
    }
}

/**
 * Reset bot name to default
 */
function resetBotName() {
    try {
        setConfig('botName', DEFAULT_BOT_NAME);
        return true;
    } catch (error) {
        console.error('Error resetting bot name in configdb:', error);
        return false;
    }
}

/**
 * Extract the RAW user message without lowercase
 */
function extractRawText(message) {
    try {
        if (message.message?.conversation) return message.message.conversation;
        if (message.message?.extendedTextMessage?.text) return message.message.extendedTextMessage.text;
        if (message.message?.imageMessage?.caption) return message.message.imageMessage.caption;
        if (message.message?.videoMessage?.caption) return message.message.videoMessage.caption;
        return "";
    } catch {
        return "";
    }
}

// Create a fake contact for WhatsApp quoting
function createFakeContact(message) {
    const number = message.key.participant?.split('@')[0]
        || message.key.remoteJid.split('@')[0];

    return {
        key: {
            participants: "0@s.whatsapp.net",
            remoteJid: "status@broadcast",
            fromMe: false,
            id: "whatsapp"
        },
        message: {
            contactMessage: {
                vcard: `BEGIN:VCARD
VERSION:3.0
N:Sy;Bot;;;
FN:whatsapp
item1.TEL;waid=${number}:${number}
item1.X-ABLabel:Ponsel
END:VCARD`
            }
        },
        participant: "0@s.whatsapp.net"
    };
}

/**
 * Handle the setbotname command
 */
async function handleSetBotCommand(sock, chatId, senderId, message, userMessage, prefix) {

    // 🔥 RAW MESSAGE (uppercase preserved even if handler lowercased)
    const RAW = extractRawText(message);

    // real arguments
    const args = RAW.split(" ").slice(1);
    const newBotName = args.join(" ");

    const fake = createFakeContact(message);

    const { isSudo } = require('../lib/index');
    const senderIsSudo = await isSudo(message.key.participant || message.key.remoteJid);
    if (!message.key.fromMe && !senderIsSudo) {
        await sock.sendMessage(chatId, {
            text: "❌ Only bot owner can change the bot name!"
        }, { quoted: fake });
        return;
    }

    // No new name
    if (!newBotName) {
        await sock.sendMessage(chatId, {
            text: `Use: ${prefix}setbotname <name>\nExample: ${prefix}setbotname TRUTH MD`
        }, { quoted: fake });
        return;
    }

    // Reset (case-insensitive)
    if (newBotName.toLowerCase() === "reset") {
        resetBotName();
        await sock.sendMessage(chatId, {
            text: `🔄 Bot name reset to default: *${DEFAULT_BOT_NAME}*`
        }, { quoted: fake });
        return;
    }

    // Name too long
    if (newBotName.length > 20) {
        await sock.sendMessage(chatId, {
            text: "❌ Bot name must be 1–20 characters!"
        }, { quoted: fake });
        return;
    }

    // SAVE EXACT formatting
    const ok = setBotName(newBotName);

    await sock.sendMessage(chatId, {
        text: ok
            ? `✅ Bot name updated to: *${newBotName}*`
            : "❌ Failed to set bot name!"
    }, { quoted: fake });
}

module.exports = {
    getBotName,
    setBotName,
    resetBotName,
    handleSetBotCommand
};
