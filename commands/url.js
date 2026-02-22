const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const FormData = require('form-data');
const { applyMediaWatermark } = require('./setwatermark');

async function getMediaBufferAndExt(message) {
    const m = message.message || {};
    if (m.imageMessage) {
        const stream = await downloadContentFromMessage(m.imageMessage, 'image');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        return { buffer: Buffer.concat(chunks), ext: '.jpg' };
    }
    if (m.videoMessage) {
        const stream = await downloadContentFromMessage(m.videoMessage, 'video');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        return { buffer: Buffer.concat(chunks), ext: '.mp4' };
    }
    if (m.audioMessage) {
        const stream = await downloadContentFromMessage(m.audioMessage, 'audio');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        return { buffer: Buffer.concat(chunks), ext: '.mp3' };
    }
    if (m.documentMessage) {
        const stream = await downloadContentFromMessage(m.documentMessage, 'document');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        const fileName = m.documentMessage.fileName || 'file.bin';
        const ext = path.extname(fileName) || '.bin';
        return { buffer: Buffer.concat(chunks), ext };
    }
    if (m.stickerMessage) {
        const stream = await downloadContentFromMessage(m.stickerMessage, 'sticker');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        return { buffer: Buffer.concat(chunks), ext: '.webp' };
    }
    return null;
}

async function getQuotedMediaBufferAndExt(message) {
    const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage || null;
    if (!quoted) return null;
    return getMediaBufferAndExt({ message: quoted });
}

// Upload to Catbox.moe
async function uploadToCatbox(buffer, ext) {
    try {
        const formData = new FormData();
        formData.append('reqtype', 'fileupload');
        formData.append('fileToUpload', buffer, `file${ext}`);

        const response = await fetch('https://catbox.moe/user/api.php', {
            method: 'POST',
            body: formData,
            timeout: 30000
        });

        if (!response.ok) {
            throw new Error(`Upload failed with status ${response.status}`);
        }

        const url = await response.text();
        
        // Validate URL
        if (!url || !url.startsWith('http')) {
            throw new Error('Invalid response from Catbox');
        }

        return url;
    } catch (error) {
        console.error('Catbox upload error:', error);
        throw new Error(`Catbox upload failed: ${error.message}`);
    }
}

async function urlCommand(sock, chatId, message) {
    try {
        // Prefer current message media, else quoted media
        let media = await getMediaBufferAndExt(message);
        if (!media) media = await getQuotedMediaBufferAndExt(message);

        if (!media) {
            await sock.sendMessage(chatId, { 
                text: 'Send or reply to a media (image, video, audio, sticker, document) to get a URL.'
            }, { quoted: message });
            return;
        }

        await sock.sendMessage(chatId, { 
            text: ''
        }, { quoted: message });

        let url = '';
        try {
            // Upload to Catbox.moe
            url = await uploadToCatbox(media.buffer, media.ext);
            
            if (!url) {
                throw new Error('No URL received from Catbox');
            }

        } catch (uploadError) {
            console.error('Upload error:', uploadError);
            await sock.sendMessage(chatId, { 
                text: '❌ Failed to upload media to Catbox.moe. Please try again.'
            }, { quoted: message });
            return;
        }

        // Apply watermark ONLY to the URL result
        const successMessage = applyMediaWatermark(`*URL:* ${url}`);
        
        await sock.sendMessage(chatId, { 
            text: successMessage
        }, { quoted: message });

    } catch (error) {
        console.error('[URL] error:', error?.message || error);
        await sock.sendMessage(chatId, { 
            text: '❌ Failed to convert media to URL. Please try again with a different file.'
        }, { quoted: message });
    }
}

module.exports = urlCommand;
