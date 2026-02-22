const { downloadContentFromMessage, generateWAMessageContent, generateWAMessageFromContent } = require('@whiskeysockets/baileys');
const crypto = require('crypto');
const ffmpeg = require('fluent-ffmpeg');
const { PassThrough } = require('stream');

async function setGroupStatusCommand(sock, chatId, msg) {
    try {
        // Owner check
        if (!msg.key.fromMe) {
            await sock.sendMessage(chatId, { text: '❌ Only the owner can use this command!' });
            return;
        }

        const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
        const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const commandRegex = /^[.!#/]?(togstatus|swgc|groupstatus)\s*/i;
        
        // Remove command and extract the rest
        const fullText = messageText.replace(commandRegex, '').trim();
        
        // Parse caption from full text using "|" as separator
        let caption = '';
        let textAfterCommand = fullText;
        
        // Check if there's a "|" in the text after command
        if (fullText.includes('|')) {
            const parts = fullText.split('|');
            // Everything before first "|" is command parameters, everything after is caption
            const beforePipe = parts.shift(); // Remove first part (not used)
            caption = parts.join('|').trim(); // Join remaining parts in case there are multiple "|"
            textAfterCommand = beforePipe ? beforePipe.trim() : '';
        }
        
        // If there's no "|", check if there's text after command without "|"
        // In this case, the text after command would be the caption
        if (!fullText.includes('|') && fullText) {
            caption = fullText;
        }
        
        // Clean up caption - remove any remaining command-like text
        caption = caption.replace(commandRegex, '').trim();

        let payload = {};

        // Handle quoted media
        if (quotedMessage) {
            if (quotedMessage.imageMessage) {
                const stream = await downloadContentFromMessage(quotedMessage.imageMessage, 'image');
                let buffer = Buffer.from([]);
                for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
                // ✅ ensure caption is included
                payload = { image: buffer, caption: caption || '' };
            } else if (quotedMessage.audioMessage) {
                const stream = await downloadContentFromMessage(quotedMessage.audioMessage, 'audio');
                let buffer = Buffer.from([]);
                for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

                const audioVn = await toVN(buffer);
                payload = { audio: audioVn, mimetype: "audio/ogg; codecs=opus", ptt: true, caption: caption || '' };
            } else if (quotedMessage.stickerMessage) {
                const stream = await downloadContentFromMessage(quotedMessage.stickerMessage, 'sticker');
                let buffer = Buffer.from([]);
                for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
                payload = { sticker: buffer };
            } else {
                payload = { text: caption || '' };
            }
        } else {
            payload = { text: caption || '' };
        }

        // Send group status
        await sendGroupStatus(sock, chatId, payload);

        const mediaType = quotedMessage ? 
            (quotedMessage.imageMessage ? 'Image' : 
             quotedMessage.audioMessage ? 'Audio' : 
             quotedMessage.stickerMessage ? 'Sticker' : 'Text') : 'Text';

        await sock.sendMessage(chatId, { text: `✅ ${mediaType} status sent!` + (caption ? `\nCaption: "${caption}"` : '') });

    } catch (error) {
        console.error('Error in togstatus command:', error);
        await sock.sendMessage(chatId, { text: `❌ Failed: ${error.message}` });
    }
}

async function sendGroupStatus(conn, jid, content) {
    // ✅ caption will be preserved here
    const inside = await generateWAMessageContent(content, { upload: conn.waUploadToServer });
    const messageSecret = crypto.randomBytes(32);

    const m = generateWAMessageFromContent(jid, {
        messageContextInfo: { messageSecret },
        groupStatusMessageV2: { message: { ...inside, messageContextInfo: { messageSecret } } }
    }, {});

    await conn.relayMessage(jid, m.message, { messageId: m.key.id });
    return m;
}

// Convert audio to voice note (simple)
async function toVN(inputBuffer) {
    return new Promise((resolve, reject) => {
        const inStream = new PassThrough();
        inStream.end(inputBuffer);
        const outStream = new PassThrough();
        const chunks = [];

        ffmpeg(inStream)
            .noVideo()
            .audioCodec("libopus")
            .format("ogg")
            .audioBitrate("48k")
            .audioChannels(1)
            .audioFrequency(48000)
            .on("error", reject)
            .on("end", () => resolve(Buffer.concat(chunks)))
            .pipe(outStream, { end: true });

        outStream.on("data", chunk => chunks.push(chunk));
    });
}

module.exports = setGroupStatusCommand;
