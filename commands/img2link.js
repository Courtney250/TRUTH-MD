const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

async function uploadToCatbox(filePath, fileName = null) {
    const formData = new FormData();
    formData.append('reqtype', 'fileupload');
    formData.append('fileToUpload', fs.createReadStream(filePath));
    
    if (fileName) {
        formData.append('filename', fileName);
    }

    const response = await axios.post('https://catbox.moe/user/api.php', formData, {
        headers: {
            ...formData.getHeaders(),
        },
    });

    if (response.status === 200 && response.data && response.data.startsWith('http')) {
        return response.data;
    } else {
        throw new Error(`Catbox upload failed: ${response.data}`);
    }
}

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
        return { buffer: Buffer.concat(chunks), ext, fileName };
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

async function img2link(sock, chatId, message) {
    try {
        // Prefer current message media, else quoted media
        let media = await getMediaBufferAndExt(message);
        if (!media) media = await getQuotedMediaBufferAndExt(message);

        if (!media) {
            await sock.sendMessage(chatId, { text: 'Send or reply to a media (image, video, audio, sticker, document) to get a URL.' }, { quoted: message });
            return;
        }

        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        
        const fileName = `media${media.ext}`;
        const tempPath = path.join(tempDir, fileName);
        fs.writeFileSync(tempPath, media.buffer);

        let url = '';
        try {
            // Use Catbox for all file types
            url = await uploadToCatbox(tempPath, media.fileName || fileName);
        } finally {
            // Clean up temp file after a short delay
            setTimeout(() => {
                try { 
                    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); 
                } catch (error) {
                    console.error('Error deleting temp file:', error);
                }
            }, 2000);
        }

        if (!url) {
            await sock.sendMessage(chatId, { text: 'Failed to upload media to Catbox.' }, { quoted: message });
            return;
        }

        await sock.sendMessage(chatId, { text: `Your URL: ${url}\n\n> Uploaded via *Catbox*` }, { quoted: message });
    } catch (error) {
        console.error('[IMG2LINK] error:', error?.message || error);
        await sock.sendMessage(chatId, { text: 'Failed to convert media to URL.' }, { quoted: message });
    }
}

module.exports = img2link;
