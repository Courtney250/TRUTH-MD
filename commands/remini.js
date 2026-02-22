const axios = require('axios');
const sharp = require('sharp');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

async function getImageBuffer(sock, message) {
    const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (quoted?.imageMessage) {
        const stream = await downloadContentFromMessage(quoted.imageMessage, 'image');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        return Buffer.concat(chunks);
    }

    if (message.message?.imageMessage) {
        const stream = await downloadContentFromMessage(message.message.imageMessage, 'image');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        return Buffer.concat(chunks);
    }

    return null;
}

async function enhanceImage(inputBuffer) {
    const metadata = await sharp(inputBuffer).metadata();
    const newWidth = Math.min((metadata.width || 500) * 2, 4096);
    const newHeight = Math.min((metadata.height || 500) * 2, 4096);

    const enhanced = await sharp(inputBuffer)
        .resize(newWidth, newHeight, {
            kernel: 'lanczos3',
            withoutEnlargement: false
        })
        .sharpen({ sigma: 1.5, m1: 1.2, m2: 0.5 })
        .modulate({ brightness: 1.03, saturation: 1.1 })
        .normalize()
        .jpeg({ quality: 95, chromaSubsampling: '4:4:4' })
        .toBuffer();

    return enhanced;
}

async function reminiCommand(sock, chatId, message, args) {
    try {
        let imageBuffer = null;

        if (args.length > 0) {
            const url = args.join(' ');
            if (isValidUrl(url)) {
                await sock.sendMessage(chatId, { text: '_Enhancing image..._' }, { quoted: message });
                const response = await axios.get(url, {
                    responseType: 'arraybuffer',
                    timeout: 30000,
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
                });
                imageBuffer = Buffer.from(response.data);
            } else {
                return sock.sendMessage(chatId, {
                    text: '*Invalid URL provided.*\n\nUsage: `.remini https://example.com/image.jpg`'
                }, { quoted: message });
            }
        } else {
            imageBuffer = await getImageBuffer(sock, message);

            if (!imageBuffer) {
                return sock.sendMessage(chatId, {
                    text: '*Remini - Image Enhancement*\n\nUsage:\n- `.remini <image_url>`\n- Reply to an image with `.remini`\n- Send image with caption `.remini`'
                }, { quoted: message });
            }
            await sock.sendMessage(chatId, { text: '_Enhancing image..._' }, { quoted: message });
        }

        const enhanced = await enhanceImage(imageBuffer);

        await sock.sendMessage(chatId, {
            image: enhanced,
            caption: '*Image enhanced successfully!*\n\n𝗘𝗡𝗛𝗔𝗡𝗖𝗘𝗗 𝗕𝗬 TRUTH-MD'
        }, { quoted: message });

    } catch (error) {
        console.error('Remini Error:', error.message);

        let errorMessage = 'Failed to enhance image.';

        if (error.code === 'ECONNABORTED') {
            errorMessage = 'Request timeout. Please try again.';
        } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
            errorMessage = 'Could not reach the image URL.';
        } else if (error.message.includes('Input buffer')) {
            errorMessage = 'Invalid image format. Please try a different image.';
        }

        await sock.sendMessage(chatId, {
            text: `_${errorMessage}_`
        }, { quoted: message });
    }
}

function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

module.exports = { reminiCommand };
