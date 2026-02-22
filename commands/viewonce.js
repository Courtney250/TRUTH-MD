const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { addImageWatermark, addVideoWatermark } = require('../lib/watermark');
const fs = require('fs');
const path = require('path');

const TEMP_DIR = path.join(__dirname, '..', 'tmp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

function findViewOnceMedia(message) {
    const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    if (!quoted) {
        console.log('[VV] No quoted message found');
        console.log('[VV] Message keys:', JSON.stringify(Object.keys(message.message || {})));
        return null;
    }

    console.log('[VV] Quoted message keys:', JSON.stringify(Object.keys(quoted)));

    const viewOnceMsg = quoted.viewOnceMessageV2?.message
        || quoted.viewOnceMessage?.message
        || quoted.viewOnceMessageV2Extension?.message
        || null;

    if (viewOnceMsg) {
        console.log('[VV] Found viewOnce container, keys:', JSON.stringify(Object.keys(viewOnceMsg)));
        if (viewOnceMsg.imageMessage) return { type: 'image', media: viewOnceMsg.imageMessage };
        if (viewOnceMsg.videoMessage) return { type: 'video', media: viewOnceMsg.videoMessage };
    }

    if (quoted.imageMessage?.viewOnce) {
        return { type: 'image', media: quoted.imageMessage };
    }
    if (quoted.videoMessage?.viewOnce) {
        return { type: 'video', media: quoted.videoMessage };
    }

    if (quoted.imageMessage) {
        console.log('[VV] Found quoted image (not viewOnce flagged), using it anyway');
        return { type: 'image', media: quoted.imageMessage };
    }
    if (quoted.videoMessage) {
        console.log('[VV] Found quoted video (not viewOnce flagged), using it anyway');
        return { type: 'video', media: quoted.videoMessage };
    }

    console.log('[VV] No viewOnce media detected in quoted message');
    return null;
}

async function viewonceCommand(sock, chatId, message) {
    try {
        console.log('[VV] Command triggered');

        const result = findViewOnceMedia(message);

        if (!result) {
            await sock.sendMessage(chatId, { text: '❌ Please reply to a view-once image or video.' }, { quoted: message });
            return;
        }

        console.log(`[VV] Processing ${result.type}`);

        if (result.type === 'image') {
            const stream = await downloadContentFromMessage(result.media, 'image');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
            console.log(`[VV] Downloaded image: ${buffer.length} bytes`);

            if (buffer.length < 1000) {
                await sock.sendMessage(chatId, { text: '❌ This view-once has already been opened or expired. Media is no longer available.' }, { quoted: message });
                return;
            }

            buffer = await addImageWatermark(buffer);
            console.log(`[VV] Watermarked image size: ${buffer.length} bytes`);

            await sock.sendMessage(chatId, {
                image: buffer,
                caption: (result.media.caption || '') + '\n\n*TRUTH MD is on fire 🔥*'
            }, { quoted: message });
            console.log('[VV] Image sent successfully');
        } else if (result.type === 'video') {
            const stream = await downloadContentFromMessage(result.media, 'video');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
            console.log(`[VV] Downloaded video: ${buffer.length} bytes`);

            if (buffer.length < 1000) {
                await sock.sendMessage(chatId, { text: '❌ This view-once has already been opened or expired. Media is no longer available.' }, { quoted: message });
                return;
            }

            const tmpPath = path.join(TEMP_DIR, `vv_${Date.now()}.mp4`);
            fs.writeFileSync(tmpPath, buffer);
            await addVideoWatermark(tmpPath);

            await sock.sendMessage(chatId, {
                video: { url: tmpPath },
                caption: result.media.caption || ''
            }, { quoted: message });
            console.log('[VV] Video sent successfully');

            try { fs.unlinkSync(tmpPath); } catch {}
        }
    } catch (err) {
        console.error('[VV] Error:', err.message, err.stack);
        try {
            await sock.sendMessage(chatId, { text: `❌ Failed to retrieve view-once: ${err.message}` }, { quoted: message });
        } catch {}
    }
}

module.exports = viewonceCommand;
